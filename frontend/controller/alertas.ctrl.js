// controller/alertas.ctrl.js

import { db } from "/firebase/firebase-config.js";
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function init() {
    if (!document.querySelector(".filtros-container")) return;
    await carregarAlertas();
    configurarFiltros();
    configurarBtnVerificar(); // ← adicionado
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function calcularDias(alerta) {
    if (alerta.dataVencimento) {
        const venc = alerta.dataVencimento.toDate
            ? alerta.dataVencimento.toDate()
            : new Date(alerta.dataVencimento);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        venc.setHours(0, 0, 0, 0);
        return Math.round((venc - hoje) / (1000 * 60 * 60 * 24));
    }
    if (typeof alerta.diasParaVencer === "number") {
        return alerta.diasParaVencer;
    }
    return null;
}

function calcularPrioridade(dias) {
    if (dias === null) return "baixa";
    if (dias <= 7) return "alta";
    if (dias <= 15) return "media";
    return "baixa";
}

function labelPrioridade(p) {
    return { alta: "Alta", media: "Média", baixa: "Baixa" }[p] ?? p;
}

function formatarDias(dias) {
    if (dias === null) return "—";
    if (dias < 0) return `${Math.abs(dias)} dia${Math.abs(dias) !== 1 ? "s" : ""} em atraso`;
    if (dias === 0) return "Vence hoje";
    return `${dias} dia${dias !== 1 ? "s" : ""}`;
}

function formatarDataVencimento(alerta) {
    if (alerta.dataVencimento) {
        const d = alerta.dataVencimento.toDate
            ? alerta.dataVencimento.toDate()
            : new Date(alerta.dataVencimento);
        return d.toLocaleDateString("pt-BR");
    }
    if (alerta.dataEnvio && typeof alerta.diasParaVencer === "number") {
        const base = alerta.dataEnvio.toDate
            ? alerta.dataEnvio.toDate()
            : new Date(alerta.dataEnvio);
        base.setDate(base.getDate() + alerta.diasParaVencer);
        return base.toLocaleDateString("pt-BR") + " (estimado)";
    }
    return "—";
}

function iconeAlerta(prioridade) {
    return `<i class='bx bxs-bell-ring'></i>`;
}

// ─── Carregamento ────────────────────────────────────────────────────────────

async function carregarAlertas() {
    const [snapAlertas, snapProfs] = await Promise.all([
        getDocs(collection(db, "alertas")),
        getDocs(collection(db, "profissionais"))
    ]);

    const profMap = {};
    snapProfs.docs.forEach(d => {
        const data = d.data();
        profMap[`/profissionais/${d.id}`] = data;
        profMap[d.id] = data;
    });

    const alertas = snapAlertas.docs.map(d => ({ id: d.id, ...d.data() }));

    window._alertas = alertas.map(a => {
        const raw = a.id_profissional;
        const profRef = raw?.path ?? (typeof raw === "string" ? raw : "");
        const profId = profRef ? profRef.split("/").pop() : "";
        const prof = profMap[profRef] ?? profMap[profId] ?? null;

        const dias = calcularDias(a);

        return {
            ...a,
            nomeProfissional: prof?.nome
                ?? (profId ? "Profissional não encontrado" : "Profissional não informado"),
            setor: prof?.setor ?? a.setor ?? null,
            _profId: profId,
            diasCalculados: dias,
            prioridadeCalculada: calcularPrioridade(dias)
        };
    });

    const ordemP = { alta: 0, media: 1, baixa: 2 };
    window._alertas.sort((a, b) => {
        const op = ordemP[a.prioridadeCalculada] - ordemP[b.prioridadeCalculada];
        if (op !== 0) return op;
        return (a.diasCalculados ?? 999) - (b.diasCalculados ?? 999);
    });

    aplicarFiltros();
}

// ─── Renderização ────────────────────────────────────────────────────────────

function renderizarAlertas(lista) {
    const main = document.querySelector("main");
    if (!main) return;

    main.querySelectorAll(".card-alerta, .alerta-vazio, .secao-prioridade").forEach(el => el.remove());

    const pendentes = (window._alertas ?? []).filter(a => a.visualizado === false).length;
    const badge = document.querySelector(".badge-pendentes");
    if (badge) badge.textContent = `${pendentes} Pendente${pendentes !== 1 ? "s" : ""}`;

    if (lista.length === 0) {
        main.insertAdjacentHTML("beforeend", `
            <div class="alerta-vazio">
                <div class="icone-check">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
                        <path d="m10.97 4.97-.02.022-3.473 4.425-2.093-2.094a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05"/>
                    </svg>
                </div>
                <h2>Nenhum Alerta Encontrado</h2>
                <p>Todos os alertas foram visualizados!</p>
            </div>
        `);
        return;
    }

    const grupos = { alta: [], media: [], baixa: [] };
    lista.forEach(a => grupos[a.prioridadeCalculada].push(a));

    const labelsSecao = {
        alta: "Alta prioridade",
        media: "Média prioridade",
        baixa: "Baixa prioridade"
    };

    for (const [prioridade, itens] of Object.entries(grupos)) {
        if (itens.length === 0) continue;

        const secao = document.createElement("div");
        secao.className = "secao-prioridade";
        secao.innerHTML = `<span class="secao-label">${labelsSecao[prioridade]}</span>`;
        main.appendChild(secao);

        itens.forEach(alerta => {
            const visualizado = alerta.visualizado === true;
            const tipoDoc = alerta.tipo ?? alerta.tipoDocumento ?? "Documento não informado";
            const dataTexto = formatarDataVencimento(alerta);
            const diasTexto = formatarDias(alerta.diasCalculados);
            const numero = alerta.numeroRegistro ? ` · nº ${alerta.numeroRegistro}` : "";

            const card = document.createElement("div");
            card.className = `card-alerta ${visualizado ? "visualizado" : ""} prioridade-${prioridade}`;
            card.dataset.id = alerta.id;

            card.innerHTML = `
    <div class="alerta-icone-doc icone-${prioridade}">
       ${iconeAlerta(prioridade)}
    </div>
    <div class="alerta-info">
        <div class="alerta-topo">
            <span class="badge-prioridade ${prioridade}">${labelPrioridade(prioridade)}</span>
            ${!visualizado
                ? `<span class="badge-novo">Novo</span>`
                : `<span class="badge-visto">Visualizado</span>`}
            <span class="alerta-registro">${tipoDoc}${numero}</span>
        </div>
        <p class="alerta-prof">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
                <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/>
            </svg>
            ${alerta.nomeProfissional}
            ${alerta.setor ? `<span class="alerta-setor"> · ${alerta.setor}</span>` : ""}
        </p>
        <p class="alerta-dias">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z"/>
                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0"/>
            </svg>
            Vence em ${dataTexto}
        </p>
    </div>
    <div class="alerta-acoes">
        ${!visualizado ? `
            <button class="btn-visualizar" data-id="${alerta.id}">Marcar como visto</button>
        ` : ""}
    </div>
`;
            main.appendChild(card);
        });
    }

    main.querySelectorAll(".btn-visualizar").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = btn.dataset.id;
            btn.disabled = true;
            btn.textContent = "Salvando...";
            try {
                await updateDoc(doc(db, "alertas", id), {
                    visualizado: true,
                    status: "visualizado",
                    visualizadoEm: serverTimestamp()
                });
                await carregarAlertas();
            } catch (e) {
                console.error("Erro ao marcar alerta:", e);
                btn.disabled = false;
                btn.textContent = "Marcar como visto";
            }
        });
    });
}

// ─── Filtros ─────────────────────────────────────────────────────────────────

function configurarFiltros() {
    document.getElementById("filtro-prioridade")?.addEventListener("change", aplicarFiltros);
    document.getElementById("filtro-status")?.addEventListener("change", aplicarFiltros);
    document.getElementById("filtro-busca")?.addEventListener("input", aplicarFiltros);
}

function aplicarFiltros() {
    if (!window._alertas) return;

    const filtroPrioridade = document.getElementById("filtro-prioridade")?.value ?? "todas";
    const filtroStatus     = document.getElementById("filtro-status")?.value ?? "nao_visualizados";
    const filtroBusca      = (document.getElementById("filtro-busca")?.value ?? "").toLowerCase().trim();

    let lista = [...window._alertas];

    if (filtroStatus === "nao_visualizados") {
        lista = lista.filter(a => a.visualizado === false);
    } else if (filtroStatus === "visualizados") {
        lista = lista.filter(a => a.visualizado === true);
    }

    if (filtroPrioridade !== "todas") {
        lista = lista.filter(a => a.prioridadeCalculada === filtroPrioridade);
    }

    if (filtroBusca) {
        lista = lista.filter(a =>
            (a.nomeProfissional ?? "").toLowerCase().includes(filtroBusca)
        );
    }

    renderizarAlertas(lista);
}

// ─── Botão Verificar Alertas ─────────────────────────────────────────────────

function configurarBtnVerificar() {
    const btn = document.getElementById("btn-verificar-alertas");
    if (!btn) return;

    btn.addEventListener("click", async () => {
        btn.disabled = true;
        btn.textContent = "Verificando...";

        try {
            const res  = await fetch("http://localhost:3000/disparar-alertas");
            const data = await res.json();

            if (data.status === "ok") {
                await carregarAlertas();
                mostrarNotificacao("✅ Verificação concluída! Notificações enviadas.", "sucesso");
            } else {
                mostrarNotificacao("❌ Erro: " + data.mensagem, "erro");
            }
        } catch (erro) {
            console.error(erro);
            mostrarNotificacao("❌ Não foi possível conectar ao servidor.", "erro");
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i class='bx bx-bell'></i> Verificar Alertas`;
        }
    });
}

// ─── Notificação inline ───────────────────────────────────────────────────────

function mostrarNotificacao(mensagem, tipo = "sucesso") {
    let notif = document.getElementById("notif-alertas");
    if (!notif) {
        notif = document.createElement("div");
        notif.id = "notif-alertas";
        document.querySelector("main").prepend(notif);
    }
    notif.textContent = mensagem;
    notif.className = `notif-${tipo}`;
    setTimeout(() => notif?.remove(), 4000);
}