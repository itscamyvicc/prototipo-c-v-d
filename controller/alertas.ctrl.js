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

    // CSS emergencial enquanto o front não estiliza
    if (!document.getElementById("alertas-ctrl-css")) {
        const style = document.createElement("style");
        style.id = "alertas-ctrl-css";
        style.textContent = `
            .card-alerta {
                background: #fff;
                border: 1px solid #e0e0e0;
                border-radius: 10px;
                padding: 16px 20px;
                margin: 12px 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .card-alerta.visualizado { opacity: 0.6; }
            .alerta-topo { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
            .badge-prioridade { padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
            .badge-prioridade.alta  { background: #fdecea; color: #c0392b; }
            .badge-prioridade.media { background: #fff8e1; color: #f39c12; }
            .badge-prioridade.baixa { background: #e8f5e9; color: #27ae60; }
            .badge-novo { background: #1565c0; color: #fff; padding: 3px 8px; border-radius: 20px; font-size: 11px; }
            .alerta-tipo { font-weight: 600; color: #1a1a2e; font-size: 14px; }
            .alerta-dias { color: #555; font-size: 13px; margin: 2px 0; }
            .alerta-status { color: #999; font-size: 12px; }
            .btn-visualizar {
                background: #1565c0; color: #fff;
                border: none; border-radius: 6px;
                padding: 8px 16px; cursor: pointer; font-size: 13px;
                white-space: nowrap;
            }
            .btn-visualizar:hover { background: #003366; }
        `;
        document.head.appendChild(style);
    }

    await carregarAlertas();
    configurarFiltros();
}

// ============================================================
// CARREGAMENTO
// ============================================================

async function carregarAlertas() {
    const snap = await getDocs(collection(db, "alertas"));
    window._alertas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderizarAlertas(window._alertas);
}

function renderizarAlertas(lista) {
    const main = document.querySelector("main");
    if (!main) return;

    // Remove cards anteriores
    main.querySelectorAll(".card-alerta").forEach(el => el.remove());
    main.querySelector(".alerta-vazio")?.remove();

    // Atualiza badge de pendentes
    const pendentes = lista.filter(a => a.visualizado === false).length;
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

    lista.forEach(alerta => {
        const visualizado = alerta.visualizado === true;
        const dias = alerta.diasParaVencer ?? "—";

        const prioridade = dias <= 7  ? "alta"
                         : dias <= 15 ? "media"
                         : "baixa";

        const card = document.createElement("div");
        card.className = `card-alerta ${visualizado ? "visualizado" : ""}`;
        card.dataset.id = alerta.id;
        card.innerHTML = `
            <div class="alerta-info">
                <div class="alerta-topo">
                    <span class="badge-prioridade ${prioridade}">${prioridade.charAt(0).toUpperCase() + prioridade.slice(1)}</span>
                    <span class="alerta-tipo">${alerta.tipo ?? "Alerta"}</span>
                    ${!visualizado ? `<span class="badge-novo">Novo</span>` : ""}
                </div>
                <p class="alerta-dias">${dias} dias para vencer</p>
                <p class="alerta-status">Status: ${alerta.status ?? "—"}</p>
            </div>
            ${!visualizado ? `<button class="btn-visualizar" data-id="${alerta.id}">Marcar como visto</button>` : ""}
        `;

        main.appendChild(card);
    });

    // Listener dos botões
    main.querySelectorAll(".btn-visualizar").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = btn.dataset.id;
            btn.disabled = true;
            btn.textContent = "Salvando...";
            try {
                await updateDoc(doc(db, "alertas", id), {
                    visualizado: true,
                    visualizadoEm: serverTimestamp()
                });
                await carregarAlertas();
                aplicarFiltros();
            } catch (e) {
                console.error("Erro ao marcar alerta:", e);
                btn.disabled = false;
                btn.textContent = "Marcar como visto";
            }
        });
    });
}

// ============================================================
// FILTROS
// ============================================================

function configurarFiltros() {
    document.querySelectorAll(".filtro").forEach(select => {
        const novo = select.cloneNode(true);
        select.parentNode.replaceChild(novo, select);
        novo.addEventListener("change", aplicarFiltros);
    });
}

function aplicarFiltros() {
    if (!window._alertas) return;

    const selects = document.querySelectorAll(".filtro");
    const filtroPrioridade = selects[0]?.value ?? "Todas as prioridades";
    const filtroStatus     = selects[1]?.value ?? "Todos";

    let lista = [...window._alertas];

    if (filtroPrioridade !== "Todas as prioridades") {
        lista = lista.filter(a => {
            const dias = a.diasParaVencer ?? 999;
            const p = dias <= 7 ? "Alta" : dias <= 15 ? "Média" : "Baixa";
            return p === filtroPrioridade;
        });
    }

    if (filtroStatus === "Não visualizados") {
        lista = lista.filter(a => a.visualizado === false);
    } else if (filtroStatus === "Visualizados") {
        lista = lista.filter(a => a.visualizado === true);
    }

    renderizarAlertas(lista);
}