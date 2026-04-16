// ============================================================
// controller/documentos.ctrl.js
// Lista documentos do Firebase e cadastra novos
// ============================================================

import { db } from "/firebase/firebase-config.js";
import {
    collection,
    getDocs,
    addDoc,
    orderBy,
    query,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function init() {
    if (!document.querySelector(".conteudo-lista")) return;

    await carregarDocumentos();
    configurarFormulario();        // ← primeiro
    await preencherSelectProfissionais(); // ← depois (já dentro do form clonado)
    configurarBusca();
    configurarFiltro();
    configurarBtnNovo();
}

// ============================================================
// LISTAGEM
// ============================================================

async function carregarDocumentos(filtroTexto = "", filtroTipo = "") {
    const container = document.querySelector(".conteudo-lista");
    if (!container) return;

    // Limpa tudo exceto o topo-lista
    Array.from(container.children).forEach(el => {
        if (!el.classList.contains("topo-lista")) el.remove();
    });

    const loading = document.createElement("p");
    loading.id = "loading-docs";
    loading.style.cssText = "text-align:center;color:#999;padding:32px;";
    loading.textContent = "Carregando documentos...";
    container.appendChild(loading);

    try {
        const q = query(collection(db, "documentos"), orderBy("nomeProfissional"));
        const snap = await getDocs(q);
        loading.remove();

        let documentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (filtroTexto) {
            const termo = filtroTexto.toLowerCase();
            documentos = documentos.filter(d =>
                d.nomeProfissional?.toLowerCase().includes(termo) ||
                d.numeroDocumento?.toLowerCase().includes(termo)
            );
        }

        if (filtroTipo && filtroTipo !== "Todos os Tipos") {
            documentos = documentos.filter(d =>
                d.tipoDocumento?.toLowerCase() === filtroTipo.toLowerCase()
            );
        }

        if (documentos.length === 0) {
            const vazio = document.createElement("p");
            vazio.style.cssText = "text-align:center;color:#999;padding:32px;";
            vazio.textContent = "Nenhum documento encontrado.";
            container.appendChild(vazio);
            return;
        }

        documentos.forEach(doc => container.appendChild(criarCard(doc)));

    } catch (erro) {
        console.error("Erro ao carregar documentos:", erro);
        loading.remove();
    }
}
function criarCard(doc) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const validade = doc.dataValidade ? new Date(doc.dataValidade) : null;
    const diasRestantes = validade
        ? Math.ceil((validade - hoje) / (1000 * 60 * 60 * 24))
        : null;

    const limite = doc.alertarDias ?? 30;

    let badgeHTML = "";
    if (diasRestantes === null) {
        badgeHTML = `<span class="badge">Sem validade</span>`;
    } else if (diasRestantes < 0) {
        badgeHTML = `<span class="badge vencido"><i class='bx bx-error-circle'></i> Vencido</span>`;
    } else if (diasRestantes <= limite) {
        badgeHTML = `<span class="badge vencendo"><i class='bx bx-time'></i> ${diasRestantes} dias</span>`;
    } else {
        badgeHTML = `<span class="badge ativo">Válido</span>`;
    }

    const validadeFormatada = validade
        ? validade.toLocaleDateString("pt-BR")
        : "—";

    const div = document.createElement("div");
    div.className = "card-profissional";
    div.innerHTML = `
        <div class="avatar avatar-doc">
            <i class='bx bx-file'></i>
        </div>
        <div class="info">
            <div class="top-info">
                <h3>${doc.tipoDocumento ?? "Documento"}</h3>
                <i class='bx bx-edit edit-icon'></i>
            </div>
            <div class="badges">
                ${badgeHTML}
            </div>
            <p><i class='bx bx-user'></i> ${doc.nomeProfissional ?? "—"}</p>
            <p><i class='bx bx-calendar'></i> Validade: ${validadeFormatada}</p>
        </div>
    `;
    return div;
}

// ============================================================
// SELECT DE PROFISSIONAIS NO FORMULÁRIO
// ============================================================

async function preencherSelectProfissionais() {
    const inputProfissional = document.getElementById("profissional");
    if (!inputProfissional) return;

    try {
        const q = query(collection(db, "profissionais"), orderBy("nome"));
        const snap = await getDocs(q);

        const select = document.createElement("select");
        select.id = "profissional";
        select.required = true;

        const opcaoPadrao = document.createElement("option");
        opcaoPadrao.value = "";
        opcaoPadrao.textContent = "Selecione o profissional";
        opcaoPadrao.disabled = true;
        opcaoPadrao.selected = true;
        select.appendChild(opcaoPadrao);

        snap.docs.forEach(d => {
            const prof = d.data();
            const option = document.createElement("option");
            option.value = d.id;
            option.dataset.nome = prof.nome;
            option.textContent = `${prof.nome} — ${prof.cargo ?? ""}`;
            select.appendChild(option);
        });

        inputProfissional.replaceWith(select);

    } catch (erro) {
        console.error("Erro ao carregar profissionais:", erro);
    }
}

// ============================================================
// FORMULÁRIO DE CADASTRO
// ============================================================

function configurarFormulario() {
    const form = document.getElementById("formInfo");
    if (!form) return;

    const novoForm = form.cloneNode(true);
    form.parentNode.replaceChild(novoForm, form);


    novoForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const selectProf = document.getElementById("profissional");
        const opcaoSelecionada = selectProf?.options[selectProf.selectedIndex];

        const dados = {
            profissionalId:   selectProf?.value ?? "",
            nomeProfissional: opcaoSelecionada?.dataset.nome ?? "",
            tipoDocumento:    document.getElementById("tipo-documento")?.value?.toUpperCase() ?? "",
            numeroDocumento:  document.getElementById("numero-documento")?.value.trim() ?? "",
            orgaoEmissor:     document.getElementById("orgao-emissor")?.value.trim() ?? "",
            dataEmissao:      document.getElementById("data-emissao")?.value ?? "",
            dataValidade:     document.getElementById("data-validade")?.value ?? "",
            alertarDias:      Number(document.getElementById("alertar-dias")?.value) || 30,
            status:           "Ativo",
            criadoEm:         serverTimestamp()
        };

        const btnCadastrar = novoForm.querySelector(".btn-cadastrar");
        btnCadastrar.disabled = true;
        btnCadastrar.textContent = "Salvando...";

        try {
            await addDoc(collection(db, "documentos"), dados);
            novoForm.reset();
            fecharFormulario();
            await carregarDocumentos();

        } catch (erro) {
            console.error("Erro ao cadastrar documento:", erro);
            alert("Erro ao cadastrar. Verifique o console.");
        } finally {
            btnCadastrar.disabled = false;
            btnCadastrar.textContent = "Cadastrar";
        }
    });
}

// ============================================================
// BUSCA E FILTRO
// ============================================================

function configurarBusca() {
    const input = document.querySelector(".busca input");
    if (!input) return;

    let timeout;
    input.addEventListener("input", () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            const filtroSelect = document.querySelector(".filtro select");
            carregarDocumentos(input.value, filtroSelect?.value ?? "");
        }, 400);
    });
}

function configurarFiltro() {
    const select = document.querySelector(".filtro select");
    if (!select) return;

    select.addEventListener("change", () => {
        const inputBusca = document.querySelector(".busca input");
        carregarDocumentos(inputBusca?.value ?? "", select.value);
    });
}

// ============================================================
// ABRIR / FECHAR FORMULÁRIO
// ============================================================

function configurarBtnNovo() {
    const btnNovo     = document.querySelector(".btn-novo");
    const closeIcon   = document.querySelector(".close-icon");
    const btnCancelar = document.querySelector(".btn-cancelar");

    btnNovo?.addEventListener("click", () => {
        document.querySelector(".tabela_primaria")?.classList.add("ativo");
    });

    closeIcon?.addEventListener("click", fecharFormulario);
    btnCancelar?.addEventListener("click", fecharFormulario);
}

function fecharFormulario() {
    document.querySelector(".tabela_primaria")?.classList.remove("ativo");
}