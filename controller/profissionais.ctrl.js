// ============================================================
// controller/profissionais.ctrl.js
// ============================================================

import { db } from "/firebase/firebase-config.js";
import {
    collection,
    getDocs,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function init() {
    if (!document.querySelector(".lista-profissionais")) return;

    await carregarProfissionais();
    configurarFormulario();
    configurarBusca();
    configurarFiltro();
    configurarBtnNovo();
}

// ============================================================
// LISTAGEM
// ============================================================

async function carregarProfissionais(filtroNome = "", filtroCargo = "") {
    const container = document.querySelector(".conteudo-lista");
    if (!container) return;

    // remove cards antigos
    container.querySelectorAll(".card-profissional").forEach(c => c.remove());

    // remove mensagem antiga (se existir)
    container.querySelectorAll("p").forEach(p => {
        if (p.id !== "loading-profs") p.remove();
    });

    const loading = document.createElement("p");
    loading.id = "loading-profs";
    loading.style.cssText = "text-align:center;color:#999;padding:32px;";
    loading.textContent = "Carregando profissionais...";
    container.appendChild(loading);

    try {
        const snap = await getDocs(collection(db, "profissionais"));
        loading.remove();

        let profissionais = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // =========================
        // FILTRO POR NOME
        // =========================
        if (filtroNome) {
            const termo = filtroNome.toLowerCase();
            profissionais = profissionais.filter(p =>
                p.nome?.toLowerCase().includes(termo) ||
                p.cpf?.includes(termo) ||
                p.email?.toLowerCase().includes(termo)
            );
        }

        // =========================
        // FILTRO POR CARGO (CORRIGIDO)
        // =========================
        if (filtroCargo) {
            profissionais = profissionais.filter(p =>
                p.cargo?.trim().toLowerCase() === filtroCargo.trim().toLowerCase()
            );
        }

        // =========================
        // SEM RESULTADO
        // =========================
        if (profissionais.length === 0) {
            const vazio = document.createElement("p");
            vazio.style.cssText = "text-align:center;color:#999;padding:32px;";

            if (filtroNome || filtroCargo) {
                vazio.textContent = "Nenhum resultado para o filtro aplicado.";
            } else {
                vazio.textContent = "Nenhum profissional cadastrado.";
            }

            container.appendChild(vazio);
            return;
        }

        profissionais.forEach(p => container.appendChild(criarCard(p)));

    } catch (erro) {
        loading.remove();
        console.error("Erro ao carregar profissionais:", erro);
    }
}

// ============================================================
// CARD
// ============================================================

function criarCard(prof) {
    const inicial = (prof.nome ?? "?")[0].toUpperCase();
    const status  = prof.status ?? "ativo";

    const div = document.createElement("div");
    div.className = "card-profissional";
    div.innerHTML = `
        <div class="avatar">${inicial}</div>
        <div class="info">
            <div class="top-info">
                <h3>${prof.nome ?? "—"}</h3>
                <i class='bx bx-edit edit-icon'></i>
            </div>
            <div class="badges">
                <span class="badge ${status.toLowerCase()}">${capitalizar(status)}</span>
                ${prof.cargo ? `<span class="badge cargo">${prof.cargo}</span>` : ""}
                ${prof.setor ? `<span class="badge setor">${prof.setor}</span>` : ""}
            </div>
            <p><i class='bx bx-envelope'></i> ${prof.email ?? "—"}</p>
            <p><i class='bx bx-phone'></i> ${prof.telefone ?? "—"}</p>
        </div>
    `;
    return div;
}

// ============================================================
// FORMULÁRIO
// ============================================================

function configurarFormulario() {
    const form = document.getElementById("formInfo");
    if (!form) return;

    const novoForm = form.cloneNode(true);
    form.parentNode.replaceChild(novoForm, form);

    novoForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const campos = novoForm.querySelectorAll("input, select");

        const dados = {
            nome:         campos[0].value.trim(),
            cpf:          campos[1].value.trim(),
            cargo:        campos[2].value.trim(),
            setor:        campos[3].value.trim(),
            email:        campos[4].value.trim(),
            telefone:     campos[5].value.trim(),
            dataAdmissao: campos[6].value,
            status:       campos[7].value,
            criadoEm:     serverTimestamp()
        };

        const btnCadastrar = novoForm.querySelector(".btn-cadastrar");
        btnCadastrar.disabled = true;
        btnCadastrar.textContent = "Salvando...";

        try {
            await addDoc(collection(db, "profissionais"), dados);

            novoForm.reset();
            fecharFormulario();
            await carregarProfissionais();

        } catch (erro) {
            console.error("Erro ao cadastrar:", erro);
            alert("Erro ao cadastrar.");
        } finally {
            btnCadastrar.disabled = false;
            btnCadastrar.textContent = "Cadastrar";
        }
    });
}

// ============================================================
// BUSCA
// ============================================================

function configurarBusca() {
    const input = document.querySelector(".busca input");
    if (!input) return;

    let timeout;
    input.addEventListener("input", () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            const filtroSelect = document.querySelector(".filtro select");
            carregarProfissionais(input.value, filtroSelect?.value ?? "");
        }, 400);
    });
}

// ============================================================
// FILTRO
// ============================================================

function configurarFiltro() {
    const select = document.querySelector(".filtro select");
    if (!select) return;

    select.addEventListener("change", () => {
        const inputBusca = document.querySelector(".busca input");
        carregarProfissionais(inputBusca?.value ?? "", select.value);
    });
}

// ============================================================
// MODAL
// ============================================================

function configurarBtnNovo() {
    const btnNovo     = document.querySelector(".btn-novo");
    const closeIcon   = document.querySelector(".close-icon");
    const btnCancelar = document.querySelector(".btn-cancelar");

    btnNovo?.addEventListener("click", () => {
        document.querySelector(".tabela_primaria")?.classList.add("ativo");
    });

    closeIcon?.addEventListener("click", fecharFormulario);

    btnCancelar?.addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("formInfo")?.reset();
        fecharFormulario();
    });
}

function fecharFormulario() {
    document.querySelector(".tabela_primaria")?.classList.remove("ativo");
}

// ============================================================
// HELPERS
// ============================================================

function capitalizar(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}