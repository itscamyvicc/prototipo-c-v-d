// ============================================================
// controller/documentos.ctrl.js
// ============================================================

import { db } from "/firebase/firebase-config.js";
import {
    collection, getDocs, addDoc, updateDoc,
    orderBy, query, serverTimestamp, getDoc, doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function init() {
    if (!document.querySelector(".conteudo-lista")) return;
      // ← Adiciona aqui:
    const params = new URLSearchParams(window.location.search);
    const profFiltro = params.get("profissional");
    if (profFiltro) {
        const input = document.querySelector(".busca input");
        if (input) input.value = profFiltro;
    }
    await carregarDocumentos();
    await preencherSelectProfissionais();
    configurarFormulario();
    configurarBusca();
    configurarFiltro();
    configurarBtnNovo();
}

// ── Helpers ──────────────────────────────────────────────────

function fecharFormulario() {
    document.querySelector(".tabela_primaria")?.classList.remove("ativo");
    const titulo       = document.querySelector(".tabela_primaria header");
    const btnCadastrar = document.querySelector(".btn-cadastrar");
    if (titulo)        titulo.textContent = "Novo Documento";
    if (btnCadastrar) { btnCadastrar.textContent = "Cadastrar"; delete btnCadastrar.dataset.editandoId; }
}

function mostrarPopup(titulo, mensagem) {
    document.getElementById("popup-titulo").textContent   = titulo;
    document.getElementById("popup-mensagem").textContent = mensagem;
    document.getElementById("popup-sucesso").classList.add("ativo");
}

async function getDiasAlerta() {
    try {
        const snap = await getDoc(doc(db, "configuracoes", "sistema"));
        return snap.exists() ? (snap.data().diasAntecedencia ?? 30) : 30;
    } catch { return 30; }
}

// ── Alerta automático ────────────────────────────────────────

async function criarOuAtualizarAlerta(dados, docId = null) {
    // Só cria alerta se tiver data de validade
    if (!dados.dataValidade) return;

    try {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const validade = new Date(dados.dataValidade);
        validade.setHours(0, 0, 0, 0);
        const diasParaVencer = Math.ceil((validade - hoje) / (1000 * 60 * 60 * 24));

        const profRef = doc(db, "profissionais", dados.profissionalId);

        const dadosAlerta = {
            tipo:            dados.tipoDocumento,
            tipoDocumento:   dados.tipoDocumento,
            numeroRegistro:  dados.numeroDocumento ?? "",
            id_profissional: profRef,
            dataVencimento:  validade,
            diasParaVencer:  diasParaVencer,
            visualizado:     false,
            status:          "pendente",
            dataEnvio:       serverTimestamp(),
            criadoEm:        serverTimestamp(),
            ...(docId ? { documentoId: docId } : {})
        };

        await addDoc(collection(db, "alertas"), dadosAlerta);
    } catch (erro) {
        console.error("Erro ao criar alerta:", erro);
    }
}

// ── Listagem ─────────────────────────────────────────────────

async function carregarDocumentos(filtroTexto = "", filtroTipo = "") {
    const container = document.querySelector(".conteudo-lista");
    if (!container) return;

    Array.from(container.children).forEach(el => {
        if (!el.classList.contains("topo-lista")) el.remove();
    });

    const loading = Object.assign(document.createElement("p"), {
        id: "loading-docs",
        textContent: "Carregando documentos..."
    });
    loading.style.cssText = "text-align:center;color:#999;padding:32px;";
    container.appendChild(loading);

    try {
        const snap = await getDocs(query(collection(db, "documentos"), orderBy("nomeProfissional")));
        loading.remove();

        let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (filtroTexto) {
            const t = filtroTexto.toLowerCase();
            docs = docs.filter(d =>
                d.nomeProfissional?.toLowerCase().includes(t) ||
                d.numeroDocumento?.toLowerCase().includes(t)
            );
        }
        if (filtroTipo && filtroTipo !== "Todos os Tipos" && filtroTipo !== "") {
            docs = docs.filter(d => d.tipoDocumento?.toLowerCase() === filtroTipo.toLowerCase());
        }

        if (docs.length === 0) {
            const vazio = Object.assign(document.createElement("p"), { textContent: "Nenhum documento encontrado." });
            vazio.style.cssText = "text-align:center;color:#999;padding:32px;";
            container.appendChild(vazio);
            return;
        }

        const diasAlerta = await getDiasAlerta();
        docs.forEach(d => container.appendChild(criarCard(d, diasAlerta)));

    } catch (erro) {
        console.error("Erro ao carregar documentos:", erro);
        document.getElementById("loading-docs")?.remove();
    }
}

// ── Card ─────────────────────────────────────────────────────

function criarCard(documento, diasAlerta = 30) {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const validade      = documento.dataValidade ? new Date(documento.dataValidade) : null;
    const diasRestantes = validade ? Math.ceil((validade - hoje) / 86400000) : null;
    const limite        = documento.alertarDias ?? diasAlerta;

    let badgeHTML;
    if      (diasRestantes === null)   badgeHTML = `<span class="badge">Sem validade</span>`;
    else if (diasRestantes < 0)        badgeHTML = `<span class="badge vencido"><i class='bx bx-error-circle'></i> Vencido</span>`;
    else if (diasRestantes <= limite)  badgeHTML = `<span class="badge vencendo"><i class='bx bx-time'></i> ${diasRestantes} dias</span>`;
    else                               badgeHTML = `<span class="badge ativo">Válido</span>`;

    const validadeFormatada = validade ? validade.toLocaleDateString("pt-BR") : "—";

    const div = document.createElement("div");
    div.className = "card-profissional";
    div.innerHTML = `
        <div class="avatar avatar-doc"><i class='bx bx-file'></i></div>
        <div class="info">
            <div class="top-info">
                <h3>${documento.tipoDocumento ?? "Documento"}</h3>
                <i class='bx bx-edit edit-icon'></i>
            </div>
            <div class="badges">${badgeHTML}</div>
            <p><i class='bx bx-user'></i> ${documento.nomeProfissional ?? "—"}</p>
            <p><i class='bx bx-calendar'></i> Validade: ${validadeFormatada}</p>
        </div>`;

    div.querySelector(".edit-icon").addEventListener("click", () => abrirEdicao(documento));
    return div;
}

// ── Edição ───────────────────────────────────────────────────

function abrirEdicao(documento) {
    const form        = document.getElementById("formInfo");
    const titulo      = document.querySelector(".tabela_primaria header");
    const btnCadastrar = form?.querySelector(".btn-cadastrar");
    if (!form) return;

    const selectProf = form.querySelector("#profissional");
    if (selectProf) {
        const opcao = Array.from(selectProf.options).find(o => o.value === documento.profissionalId);
        if (opcao) selectProf.value = documento.profissionalId;
    }

    const setVal = (id, val) => { const el = form.querySelector(`#${id}`); if (el) el.value = val ?? ""; };
    setVal("tipo-documento",   documento.tipoDocumento  ?? "");
    setVal("numero-documento", documento.numeroDocumento ?? "");
    setVal("orgao-emissor",    documento.orgaoEmissor    ?? "");
    setVal("data-emissao",     documento.dataEmissao     ?? "");
    setVal("data-validade",    documento.dataValidade    ?? "");
    setVal("alertar-dias",     documento.alertarDias     ?? 30);

    if (titulo)        titulo.textContent = "Editar Documento";
    if (btnCadastrar) { btnCadastrar.textContent = "Salvar"; btnCadastrar.dataset.editandoId = documento.id; }

    document.querySelector(".tabela_primaria")?.classList.add("ativo");
}

// ── Select profissionais ──────────────────────────────────────

async function preencherSelectProfissionais() {
    const selectAtual = document.getElementById("profissional");
    if (!selectAtual) return;

    try {
        const snap = await getDocs(query(collection(db, "profissionais"), orderBy("nome")));
        selectAtual.innerHTML = `<option value="" disabled selected>Selecione o profissional</option>`;
        snap.docs.forEach(d => {
            const prof   = d.data();
            const option = document.createElement("option");
            option.value = d.id; option.dataset.nome = prof.nome;
            option.textContent = `${prof.nome} — ${prof.cargo ?? ""}`;
            selectAtual.appendChild(option);
        });
    } catch (erro) { console.error("Erro ao carregar profissionais:", erro); }
}

// ── Formulário ───────────────────────────────────────────────

function configurarFormulario() {
    const form = document.getElementById("formInfo");
    if (!form) return;

    const novoForm = form.cloneNode(true);
    form.parentNode.replaceChild(novoForm, form);
    preencherSelectProfissionais();

    const dataEmissaoInput  = novoForm.querySelector("#data-emissao");
    const dataValidadeInput = novoForm.querySelector("#data-validade");
    const anoAtual          = new Date().getFullYear();

    [dataEmissaoInput, dataValidadeInput].forEach(input => {
        input?.addEventListener("input", () => {
            if (!input.value) return;
            const partes = input.value.split("-");
            if (partes[0]?.length > 4) { partes[0] = partes[0].slice(0,4); input.value = partes.join("-"); }
        });
    });

    novoForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const selectProf      = novoForm.querySelector("#profissional");
        const opcaoSelecionada = selectProf?.options[selectProf.selectedIndex];
        const btnCadastrar    = novoForm.querySelector(".btn-cadastrar");
        const editandoId      = btnCadastrar?.dataset.editandoId;
        const dataEmissaoVal  = dataEmissaoInput?.value  ?? "";
        const dataValidadeVal = dataValidadeInput?.value ?? "";

        if (dataEmissaoVal) {
            const ano = new Date(dataEmissaoVal).getFullYear();
            if (ano < 2000 || ano > anoAtual) { alert("Data de emissão inválida."); return; }
        }
        if (dataValidadeVal) {
            const ano = new Date(dataValidadeVal).getFullYear();
            if (ano < 2000 || ano > anoAtual + 20) { alert("Data de validade inválida."); return; }
        }

        const dados = {
            profissionalId:   selectProf?.value ?? "",
            nomeProfissional: opcaoSelecionada?.dataset.nome ?? "",
            tipoDocumento:    novoForm.querySelector("#tipo-documento")?.value ?? "",
            numeroDocumento:  novoForm.querySelector("#numero-documento")?.value.trim() ?? "",
            orgaoEmissor:     novoForm.querySelector("#orgao-emissor")?.value.trim() ?? "",
            dataEmissao:      dataEmissaoVal,
            dataValidade:     dataValidadeVal,
            alertarDias:      Number(novoForm.querySelector("#alertar-dias")?.value) || 30,
            status:           "Ativo",
        };

        btnCadastrar.disabled = true;
        btnCadastrar.textContent = "Salvando...";

        try {
            if (editandoId) {
                await updateDoc(doc(db, "documentos", editandoId), dados);
                await criarOuAtualizarAlerta(dados, editandoId); // ← alerta ao editar
                novoForm.reset(); fecharFormulario();
                await preencherSelectProfissionais(); await carregarDocumentos();
                mostrarPopup("Documento atualizado!", "As alterações foram salvas com sucesso.");
            } else {
                dados.criadoEm = serverTimestamp();
                const docRef = await addDoc(collection(db, "documentos"), dados);
                await criarOuAtualizarAlerta(dados, docRef.id); // ← alerta ao cadastrar
                novoForm.reset(); fecharFormulario();
                await preencherSelectProfissionais(); await carregarDocumentos();
                mostrarPopup("Documento cadastrado!", "O documento foi adicionado com sucesso.");
            }
        } catch (erro) {
            console.error("Erro ao salvar documento:", erro);
            alert("Erro ao salvar. Verifique o console.");
        } finally {
            btnCadastrar.disabled    = false;
            btnCadastrar.textContent = editandoId ? "Salvar" : "Cadastrar";
        }
    });
}

// ── Busca ────────────────────────────────────────────────────

function configurarBusca() {
    const input = document.querySelector(".busca input");
    if (!input) return;
    let timeout;
    input.addEventListener("input", () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            carregarDocumentos(input.value, document.querySelector(".filtro select")?.value ?? "");
        }, 400);
    });
}

// ── Filtro ───────────────────────────────────────────────────

function configurarFiltro() {
    const select = document.querySelector(".filtro select");
    if (!select) return;
    select.addEventListener("change", () => {
        carregarDocumentos(document.querySelector(".busca input")?.value ?? "", select.value);
    });
}

// ── Modal / Popup ────────────────────────────────────────────

function configurarBtnNovo() {
    document.querySelector(".btn-novo")?.addEventListener("click", () => {
        document.querySelector(".tabela_primaria")?.classList.add("ativo");
    });

    document.querySelector(".close-icon")?.addEventListener("click", () => {
        document.getElementById("formInfo")?.reset();
        fecharFormulario();
    });

    document.querySelector(".btn-cancelar")?.addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("formInfo")?.reset();
    // sem fecharFormulario() — só limpa os campos
});

    document.getElementById("popup-fechar")?.addEventListener("click", () => {
        document.getElementById("popup-sucesso")?.classList.remove("ativo");
    });
}