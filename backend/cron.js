// cron.js

require("dotenv").config();

const cron                  = require("node-cron");
const { db }                = require("./config/firebase");
const { enviarEmailAlerta } = require("./services/email");
const { enviarWhatsAppAlerta } = require("./services/whatsapp");

// Roda todo dia às 8h da manhã
// Formato: "minuto hora * * *"
// Para testar, troque por "* * * * *" (todo minuto)
cron.schedule("0 8 * * *", async () => {
    console.log(`\n🕐 [${new Date().toLocaleString("pt-BR")}] Verificando alertas...`);
    await verificarAlertas();
}, {
    timezone: "America/Sao_Paulo"
});

async function verificarAlertas() {
    try {
        // Busca configurações do sistema
        const configSnap = await db.collection("configuracoes").doc("sistema").get();
        const config     = configSnap.exists ? configSnap.data() : {};

        const emailAtivo     = config.emailAtivo     ?? false;
        const whatsappAtivo  = config.whatsappAtivo  ?? false;
        const diasAntecedencia = config.diasAntecedencia ?? 30;

        console.log(`📋 Config: email=${emailAtivo}, whatsapp=${whatsappAtivo}, dias=${diasAntecedencia}`);

        if (!emailAtivo && !whatsappAtivo) {
            console.log("ℹ️ Nenhuma notificação ativa nas configurações. Encerrando.");
            return;
        }

        // ─── Reset automático: reabilita alertas urgentes já visualizados ───
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const visualizadosSnap = await db.collection("alertas")
            .where("visualizado", "==", true)
            .get();

        for (const doc of visualizadosSnap.docs) {
            const alerta = doc.data();
            if (!alerta.dataVencimento) continue;
            const venc = alerta.dataVencimento.toDate
                ? alerta.dataVencimento.toDate()
                : new Date(alerta.dataVencimento);
            venc.setHours(0, 0, 0, 0);
            const dias = Math.round((venc - hoje) / (1000 * 60 * 60 * 24));
            if (dias >= 0 && dias <= 7) {
                await doc.ref.update({ visualizado: false });
                console.log(`🔄 Reset: ${alerta.tipoDocumento ?? "Documento"} vence em ${dias} dia(s) — reaberto.`);
            }
        }
        // ─────────────────────────────────────────────────────────────────────

        // Busca alertas não visualizados
        const alertasSnap = await db.collection("alertas")
            .where("visualizado", "==", false)
            .get();

        if (alertasSnap.empty) {
            console.log("✅ Nenhum alerta pendente.");
            return;
        }

        console.log(`📢 ${alertasSnap.size} alerta(s) pendente(s) encontrado(s).`);

        // Busca todos os profissionais para montar o mapa
        const profsSnap = await db.collection("profissionais").get();
        const profMap   = {};
        profsSnap.docs.forEach(d => { profMap[d.id] = d.data(); });

        for (const alertaDoc of alertasSnap.docs) {
            const alerta = alertaDoc.data();

            try {
                // Resolve profissional
                const profRef = alerta.id_profissional;
                const profId  = profRef?._path?.segments?.slice(-1)[0]  // DocumentReference
                    ?? profRef?.split?.("/")?.pop()                       // string path
                    ?? null;

                const prof = profId ? profMap[profId] : null;

                if (!prof) {
                    console.warn(`⚠️ Profissional não encontrado para alerta ${alertaDoc.id} — pulando.`);
                    continue;
                }

                // Calcula dias restantes
                let diasRestantes = null;
                if (alerta.dataVencimento) {
                    const venc = alerta.dataVencimento.toDate
                        ? alerta.dataVencimento.toDate()
                        : new Date(alerta.dataVencimento);
                    venc.setHours(0, 0, 0, 0);
                    diasRestantes = Math.round((venc - hoje) / (1000 * 60 * 60 * 24));
                } else if (typeof alerta.diasParaVencer === "number") {
                    diasRestantes = alerta.diasParaVencer;
                }

                // Só notifica se estiver dentro do prazo de antecedência
                if (diasRestantes === null || diasRestantes > diasAntecedencia) {
                    console.log(`⏭️ ${prof.nome} — ${diasRestantes} dias restantes, fora do prazo de alerta.`);
                    continue;
                }

                // Já venceu — ainda notifica
                if (diasRestantes < 0) {
                    console.log(`🚨 ${prof.nome} — documento VENCIDO há ${Math.abs(diasRestantes)} dia(s)!`);
                }

                const dataFormatada = alerta.dataVencimento
                    ? (alerta.dataVencimento.toDate
                        ? alerta.dataVencimento.toDate()
                        : new Date(alerta.dataVencimento)
                      ).toLocaleDateString("pt-BR")
                    : "—";

                const payload = {
                    nome:           prof.nome,
                    email:          prof.email,
                    telefone:       prof.telefone,
                    tipoDocumento:  alerta.tipoDocumento ?? alerta.tipo ?? "Documento",
                    diasRestantes:  diasRestantes,
                    dataVencimento: dataFormatada,
                };

                // Dispara email se ativo
                if (emailAtivo) {
                    await enviarEmailAlerta(payload);
                }

                // Dispara WhatsApp se ativo
                if (whatsappAtivo) {
                    await enviarWhatsAppAlerta(payload);
                }

            } catch (erroAlerta) {
                console.error(`❌ Erro ao processar alerta ${alertaDoc.id}:`, erroAlerta.message);
                // Continua para o próximo alerta
            }
        }

        console.log(`✅ Verificação concluída.\n`);

    } catch (erro) {
        console.error("❌ Erro geral no cron:", erro.message);
    }
}

// Exporta para poder chamar manualmente no server.js se necessário
module.exports = { verificarAlertas };