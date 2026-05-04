// ============================================================
// controller/profissionais.ctrl.js
// ============================================================

import { db } from "/firebase/firebase-config.js";
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function init() {
    if (!document.querySelector(".lista-profissionais")) return;

    await carregarProfissionais();
    await preencherFiltroCargos();
    configurarFormulario();
    configurarBusca();
    configurarFiltro();
    configurarBtnNovo();
    configurarMascaras();
}

// ============================================================
// POPUP DE SUCESSO
// ============================================================

function mostrarPopup(titulo, mensagem) {
    document.getElementById("popup-titulo").textContent = titulo;
    document.getElementById("popup-mensagem").textContent = mensagem;
    document.getElementById("popup-sucesso").classList.add("ativo");
}

// ============================================================
// HELPERS
// ============================================================

function fecharFormulario() {
    document.querySelector(".tabela_primaria")?.classList.remove("ativo");
    const titulo = document.querySelector(".tabela_primaria header");
    const btnCadastrar = document.querySelector(".btn-cadastrar");
    if (titulo) titulo.textContent = "Novo Profissional";
    if (btnCadastrar) {
        btnCadastrar.textContent = "Cadastrar";
        delete btnCadastrar.dataset.editandoId;
    }
}

function capitalizar(str) {
    if (!str) return "—";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ============================================================
// LISTAGEM
// ============================================================

async function carregarProfissionais(filtroNome = "", filtroCargo = "") {
    const container = document.querySelector(".conteudo-lista");
    if (!container) return;

    container.querySelectorAll(".card-profissional").forEach(c => c.remove());
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

        if (filtroNome) {
            const termo = filtroNome.toLowerCase();
            profissionais = profissionais.filter(p =>
                p.nome?.toLowerCase().includes(termo) ||
                p.cpf?.includes(termo) ||
                p.email?.toLowerCase().includes(termo)
            );
        }

        if (filtroCargo) {
            profissionais = profissionais.filter(p =>
                p.cargo?.trim().toLowerCase() === filtroCargo.trim().toLowerCase()
            );
        }

        const statusOrdem = ["ativo", "ferias", "afastado", "licenca", "inativo", "desligado"];

        profissionais.sort((a, b) => {
            const ordemA = statusOrdem.indexOf(a.status?.toLowerCase() ?? "ativo");
            const ordemB = statusOrdem.indexOf(b.status?.toLowerCase() ?? "ativo");
            if (ordemA !== ordemB) return ordemA - ordemB;
            const dataA = a.criadoEm?.seconds ?? 0;
            const dataB = b.criadoEm?.seconds ?? 0;
            return dataB - dataA;
        });

        if (profissionais.length === 0) {
            const vazio = document.createElement("p");
            vazio.style.cssText = "text-align:center;color:#999;padding:32px;";
            vazio.textContent = (filtroNome || filtroCargo)
                ? "Nenhum resultado para o filtro aplicado."
                : "Nenhum profissional cadastrado.";
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
// FILTRO DE CARGOS — carrega do Firebase
// ============================================================

async function preencherFiltroCargos() {
    const select = document.getElementById("filtro-cargo");
    if (!select) return;

    while (select.options.length > 1) select.remove(1);

    try {
        const snap = await getDocs(collection(db, "profissionais"));
        const cargos = new Set();
        snap.docs.forEach(d => {
            const cargo = d.data().cargo?.trim();
            if (cargo) cargos.add(cargo);
        });

        cargos.forEach(cargo => {
            const option = document.createElement("option");
            option.value = cargo;
            option.textContent = cargo;
            select.appendChild(option);
        });
    } catch (erro) {
        console.error("Erro ao carregar cargos:", erro);
    }
}

// ============================================================
// CARD
// ============================================================

function criarCard(prof) {
    const inicial = (prof.nome ?? "?")[0].toUpperCase();
    const status = prof.status?.toLowerCase() ?? "ativo";

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
                <span class="badge ${status}">${capitalizar(status)}</span>
                ${prof.cargo ? `<span class="badge cargo">${prof.cargo}</span>` : ""}
                ${prof.setor ? `<span class="badge setor">${prof.setor}</span>` : ""}
            </div>
            <p><i class='bx bx-envelope'></i> ${prof.email ?? "—"}</p>
            <p><i class='bx bx-phone'></i> ${prof.telefone ?? "—"}</p>
        </div>
    `;

    div.querySelector(".edit-icon").addEventListener("click", () => abrirEdicao(prof));
    return div;
}

// ============================================================
// ABRIR EDIÇÃO
// ============================================================

function abrirEdicao(prof) {
    const form = document.getElementById("formInfo");
    const campos = form.querySelectorAll("input, select");
    const titulo = document.querySelector(".tabela_primaria header");
    const btnCadastrar = form.querySelector(".btn-cadastrar");

    campos[0].value = prof.nome         ?? "";
    campos[1].value = prof.cpf          ?? "";
    campos[2].value = prof.cargo        ?? "";
    campos[3].value = prof.setor        ?? "";
    campos[4].value = prof.email        ?? "";
    campos[5].value = prof.telefone     ?? "";
    campos[6].value = prof.dataAdmissao ?? "";
    campos[7].value = prof.status       ?? "";

    titulo.textContent = "Editar Profissional";
    btnCadastrar.textContent = "Salvar";
    btnCadastrar.dataset.editandoId = prof.id;

    document.querySelector(".tabela_primaria")?.classList.add("ativo");
}

// ============================================================
// FORMULÁRIO
// ============================================================

function configurarFormulario() {
    const form = document.getElementById("formInfo");
    if (!form) return;

    const novoForm = form.cloneNode(true);
    form.parentNode.replaceChild(novoForm, form);

    configurarMascaras();

    const dataInput = novoForm.querySelector("input[type='date']");
    const anoAtual = new Date().getFullYear();
    dataInput?.setAttribute("max", `${anoAtual}-12-31`);

    novoForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const campos = novoForm.querySelectorAll("input, select");
        const btnCadastrar = novoForm.querySelector(".btn-cadastrar");
        const editandoId = btnCadastrar.dataset.editandoId;

        const dataAdmissao = campos[6].value;
        if (dataAdmissao) {
            const ano = new Date(dataAdmissao).getFullYear();
            if (ano < 2000 || ano > new Date().getFullYear()) {
                alert("Data de admissão inválida. Verifique o ano informado.");
                return;
            }
        }

        const dados = {
            nome:         campos[0].value.trim(),
            cpf:          campos[1].value.trim(),
            cargo:        campos[2].value.trim(),
            setor:        campos[3].value.trim(),
            email:        campos[4].value.trim(),
            telefone:     campos[5].value.trim(),
            dataAdmissao: dataAdmissao,
            status:       campos[7].value,
        };

        btnCadastrar.disabled = true;
        btnCadastrar.textContent = "Salvando...";

        try {
            if (editandoId) {
                await updateDoc(doc(db, "profissionais", editandoId), dados);
                novoForm.reset();
                fecharFormulario();
                await carregarProfissionais();
                await preencherFiltroCargos();
                mostrarPopup("Profissional atualizado!", "As informações foram salvas com sucesso.");
            } else {
                dados.criadoEm = serverTimestamp();
                await addDoc(collection(db, "profissionais"), dados);
                novoForm.reset();
                fecharFormulario();
                await carregarProfissionais();
                await preencherFiltroCargos();
                mostrarPopup("Profissional cadastrado!", "O profissional foi adicionado com sucesso.");
            }

        } catch (erro) {
            console.error("Erro ao salvar:", erro);
            alert("Erro ao salvar. Tente novamente.");
        } finally {
            btnCadastrar.disabled = false;
            btnCadastrar.textContent = editandoId ? "Salvar" : "Cadastrar";
        }
    });
}

// ============================================================
// MÁSCARAS
// ============================================================

function configurarMascaras() {
    const cpfInput = document.getElementById("cpf");
    if (cpfInput) {
        cpfInput.addEventListener("input", () => {
            let v = cpfInput.value.replace(/\D/g, "").slice(0, 11);
            if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
            else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
            else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, "$1.$2");
            cpfInput.value = v;
        });
    }

    const telInput = document.getElementById("telefone");
    if (telInput) {
        telInput.addEventListener("input", () => {
            let v = telInput.value.replace(/\D/g, "").slice(0, 11);
            if (v.length > 6) v = v.replace(/(\d{2})(\d{5})(\d{1,4})/, "($1) $2-$3");
            else if (v.length > 2) v = v.replace(/(\d{2})(\d{1,5})/, "($1) $2");
            telInput.value = v;
        });
    }
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
            const filtroSelect = document.getElementById("filtro-cargo");
            carregarProfissionais(input.value, filtroSelect?.value ?? "");
        }, 400);
    });
}

// ============================================================
// FILTRO
// ============================================================

function configurarFiltro() {
    const select = document.getElementById("filtro-cargo");
    if (!select) return;

    select.addEventListener("change", () => {
        const inputBusca = document.querySelector(".busca input");
        carregarProfissionais(inputBusca?.value ?? "", select.value);
    });
}

// ============================================================
// MODAL — botão novo, fechar, cancelar, popup
// ============================================================

function configurarBtnNovo() {
    const btnNovo     = document.querySelector(".btn-novo");
    const closeIcon   = document.querySelector(".close-icon");
    const btnCancelar = document.querySelector(".btn-cancelar");

    btnNovo?.addEventListener("click", () => {
        document.querySelector(".tabela_primaria")?.classList.add("ativo");
    });

    closeIcon?.addEventListener("click", () => {
        document.getElementById("formInfo")?.reset();
        fecharFormulario();
    });

    // Cancelar apenas limpa os campos, não fecha
    btnCancelar?.addEventListener("click", () => {
        document.getElementById("formInfo")?.reset();
    });

    document.getElementById("popup-fechar")?.addEventListener("click", () => {
        document.getElementById("popup-sucesso").classList.remove("ativo");
    });
}