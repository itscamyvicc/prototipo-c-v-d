// controller/dados.ctrl.js

import { db } from "/firebase/firebase-config.js";
import {
    collection, getDocs, writeBatch,
    doc, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function init() {
    if (!document.querySelector(".cards-container")) return;

    const profissionaisRef = collection(db, "profissionais");
    const documentosRef    = collection(db, "documentos");

    const inputArquivo    = document.getElementById("arquivoCsv");
    const nomeArquivoSpan = document.getElementById("nomeArquivo");
    const btnImportar     = document.getElementById("btnImportar");
    const btnExportar     = document.getElementById("btnExportar");

    // ── Popup ────────────────────────────────────────────────
    function mostrarPopup(titulo, mensagem, tipo) {
        document.getElementById("popup-titulo-dados").textContent = titulo;
        document.getElementById("popup-msg-dados").textContent = mensagem;
        const icone = document.getElementById("popup-icone-dados");
        icone.textContent = tipo === "sucesso" ? "✓" : "✕";
        icone.className = tipo === "sucesso" ? "popup-icone sucesso" : "popup-icone erro";
        document.getElementById("popup-dados").classList.add("ativo");
    }

    document.getElementById("popup-fechar-dados")?.addEventListener("click", () => {
        document.getElementById("popup-dados").classList.remove("ativo");
    });

    // ── Botão Escolher Arquivo ───────────────────────────────
    document.querySelectorAll(".upload-botao").forEach(btn => {
        btn.addEventListener("click", () => inputArquivo?.click());
    });

    inputArquivo?.addEventListener("change", () => {
        const nome = inputArquivo.files[0]?.name || "Nenhum arquivo escolhido";
        if (nomeArquivoSpan) nomeArquivoSpan.textContent = nome;
    });

    // ── Importar ─────────────────────────────────────────────
    btnImportar?.addEventListener("click", async () => {
        const file = inputArquivo?.files[0];

        if (!file) {
            mostrarPopup("Arquivo não selecionado", "Selecione um arquivo CSV primeiro.", "erro");
            return;
        }

        btnImportar.disabled = true;
        btnImportar.textContent = "Importando...";

        try {
            const texto  = await file.text();
            const linhas = texto.split(/\r?\n/).filter(l => l.trim().length > 0);

            if (linhas.length <= 1) {
                mostrarPopup("Arquivo vazio", "O arquivo CSV está vazio ou sem dados.", "erro");
                return;
            }

            const cabecalhos = linhas[0].split(";").map(h => h.trim());
            const idx = (nome) => cabecalhos.indexOf(nome);

            // Campos obrigatórios mínimos
            const camposObrig = [
                "nome", "cpf", "cargo", "setor", "email",
                "telefone", "dataAdmissao", "status",
                "tipoDocumento", "numeroDocumento", "dataValidade"
            ];
            const faltando = camposObrig.filter(c => idx(c) === -1);
            if (faltando.length) {
                mostrarPopup("Formato inválido", `Colunas ausentes: ${faltando.join(", ")}`, "erro");
                return;
            }

            // Busca CPFs já existentes
            const snapProfs = await getDocs(profissionaisRef);
            const cpfParaId = {};
            snapProfs.docs.forEach(d => {
                const cpf = d.data().cpf?.trim();
                if (cpf) cpfParaId[cpf] = d.id;
            });

            const batch = writeBatch(db);
            let profsNovos = 0;
            let docsNovos  = 0;
            let duplicatas = 0;

            for (let i = 1; i < linhas.length; i++) {
                const partes = linhas[i].split(";");
                if (partes.length < cabecalhos.length) continue;

                const cpf = partes[idx("cpf")]?.trim().replace(/'/g, "") || "";

                // Se profissional não existe, cria
                let profId = cpfParaId[cpf];
                if (!profId) {
                    const novoRef = doc(profissionaisRef);
                    batch.set(novoRef, {
                        nome:         partes[idx("nome")]?.trim()         || "",
                        cpf,
                        cargo:        partes[idx("cargo")]?.trim()        || "",
                        setor:        partes[idx("setor")]?.trim()        || "",
                        email:        partes[idx("email")]?.trim()        || "",
                        telefone:     partes[idx("telefone")]?.trim().replace(/'/g, "") || "",
                        dataAdmissao: partes[idx("dataAdmissao")]?.trim() || "",
                        status:       partes[idx("status")]?.trim()       || "",
                        criadoEm:     serverTimestamp()
                    });
                    cpfParaId[cpf] = novoRef.id;
                    profId = novoRef.id;
                    profsNovos++;
                } else {
                    duplicatas++;
                }

                // Sempre cria o documento vinculado
                const tipoDoc = partes[idx("tipoDocumento")]?.trim() || "";
                const numDoc  = partes[idx("numeroDocumento")]?.trim() || "";

                if (tipoDoc && numDoc) {
                    const docRef = doc(documentosRef);
                    batch.set(docRef, {
                        profissionalId:   profId,
                        nomeProfissional: partes[idx("nome")]?.trim() || "",
                        tipoDocumento:    tipoDoc,
                        numeroDocumento:  numDoc,
                        orgaoEmissor:     partes[idx("orgaoEmissor")]?.trim()  || "",
                        dataEmissao:      partes[idx("dataEmissao")]?.trim()   || "",
                        dataValidade:     partes[idx("dataValidade")]?.trim()  || "",
                        alertarDias:      Number(partes[idx("alertarDias")]?.trim()) || 30,
                        status:           "Ativo",
                        criadoEm:         serverTimestamp()
                    });
                    docsNovos++;
                }
            }

            await batch.commit();

            mostrarPopup(
                "Importação concluída!",
                `${profsNovos} profissional(is) e ${docsNovos} documento(s) importados. ${duplicatas} profissional(is) já existiam e foram ignorados.`,
                "sucesso"
            );

        } catch (err) {
            console.error("Erro ao importar:", err);
            mostrarPopup("Erro na importação", "Verifique o formato do arquivo e tente novamente.", "erro");
        } finally {
            btnImportar.disabled = false;
            btnImportar.textContent = "Importar Arquivo";
        }
    });

    // ── Exportar ─────────────────────────────────────────────
    btnExportar?.addEventListener("click", async () => {
        btnExportar.disabled = true;
        btnExportar.textContent = "Gerando...";

        try {
            const [snapProfs, snapDocs] = await Promise.all([
                getDocs(query(profissionaisRef, orderBy("nome"))),
                getDocs(collection(db, "documentos"))
            ]);

            // Monta mapa de profissionais por ID
            const profMap = {};
            snapProfs.docs.forEach(d => {
                profMap[d.id] = d.data();
            });

            const cabecalho = [
                "nome", "cpf", "cargo", "setor", "email", "telefone", "dataAdmissao", "status",
                "tipoDocumento", "numeroDocumento", "orgaoEmissor", "dataEmissao", "dataValidade", "alertarDias"
            ];

            const linhas = [cabecalho.join(";")];

            snapDocs.docs.forEach(d => {
                const doc  = d.data();
                const prof = profMap[doc.profissionalId] ?? {};

                const cpf      = prof.cpf      ? `'${prof.cpf}`      : "";
                const telefone = prof.telefone ? `'${prof.telefone}` : "";

                linhas.push([
                    `"${(prof.nome         || "").replace(/"/g, '""')}"`,
                    `"${cpf}"`,
                    `"${(prof.cargo        || "").replace(/"/g, '""')}"`,
                    `"${(prof.setor        || "").replace(/"/g, '""')}"`,
                    `"${(prof.email        || "").replace(/"/g, '""')}"`,
                    `"${telefone}"`,
                    `"${(prof.dataAdmissao || "").replace(/"/g, '""')}"`,
                    `"${(prof.status       || "").replace(/"/g, '""')}"`,
                    `"${(doc.tipoDocumento  || "").replace(/"/g, '""')}"`,
                    `"${(doc.numeroDocumento|| "").replace(/"/g, '""')}"`,
                    `"${(doc.orgaoEmissor   || "").replace(/"/g, '""')}"`,
                    `"${(doc.dataEmissao    || "").replace(/"/g, '""')}"`,
                    `"${(doc.dataValidade   || "").replace(/"/g, '""')}"`,
                    `"${doc.alertarDias     || 30}"`,
                ].join(";"));
            });

            const BOM  = "\uFEFF";
            const blob = new Blob([BOM + linhas.join("\r\n")], { type: "text/csv;charset=utf-8;" });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement("a");
            a.href     = url;
            a.download = "cvd_dados_completos.csv";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            mostrarPopup("Exportação concluída!", "CSV com profissionais e documentos gerado com sucesso!", "sucesso");

        } catch (err) {
            console.error("Erro ao exportar:", err);
            mostrarPopup("Erro na exportação", "Não foi possível gerar o arquivo. Verifique o console.", "erro");
        } finally {
            btnExportar.disabled = false;
            btnExportar.textContent = "Exportar CSV Combinado";
        }
    });
}