// ============================================================
// controller/config.ctrl.js — VERSÃO COMPLETA
// ============================================================

import { db } from "/firebase/firebase-config.js";
import { doc, getDoc, setDoc }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const CONFIG_DOC = doc(db, "configuracoes", "sistema");

export async function init() {
    await carregarConfiguracoes();
    configurarTogglesDependentes();
    configurarBtnSalvar();
}

// ============================================================
// CARREGAR
// ============================================================
async function carregarConfiguracoes() {
    try {
        const snap = await getDoc(CONFIG_DOC);
        if (!snap.exists()) return;

        const c = snap.data();

        setValue("dias-antecedencia",   c.diasAntecedencia);
        setCheck("email-alertas",       c.emailAtivo);
        setValue("frequencia-email",    c.emailFrequencia);
        setCheck("whatsapp-alertas",    c.whatsappAtivo);
        setValue("numero-whatsapp",     c.whatsappNumero);
        setValue("frequencia-whatsapp", c.whatsappFrequencia);

        // Aplica estado inicial dos toggles
        toggleCampos("email-alertas",    ["frequencia-email"]);
        toggleCampos("whatsapp-alertas", ["numero-whatsapp", "frequencia-whatsapp"]);

    } catch (erro) {
        console.error("Erro ao carregar configurações:", erro);
    }
}

// ============================================================
// TOGGLES — desabilita campos quando checkbox está desmarcado
// ============================================================
function configurarTogglesDependentes() {
    const pares = [
        { check: "email-alertas",    deps: ["frequencia-email"] },
        { check: "whatsapp-alertas", deps: ["numero-whatsapp", "frequencia-whatsapp"] },
    ];

    pares.forEach(({ check, deps }) => {
        const el = document.getElementById(check);
        if (!el) return;
        el.addEventListener("change", () => toggleCampos(check, deps));
        toggleCampos(check, deps); // estado inicial
    });
}

function toggleCampos(checkId, depIds) {
    const ativo = document.getElementById(checkId)?.checked;
    depIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.disabled = !ativo;
        el.closest(".campo")?.classList.toggle("campo-desabilitado", !ativo);
    });
}

// ============================================================
// SALVAR
// ============================================================
function configurarBtnSalvar() {
    const btn = document.getElementById("btn-salvar");
    if (!btn) return;

    btn.addEventListener("click", async () => {
        const dias = Number(document.getElementById("dias-antecedencia")?.value);

        if (!dias || dias < 1) {
            document.getElementById("dias-antecedencia").style.borderColor = "red";
            return;
        }
        document.getElementById("dias-antecedencia").style.borderColor = "";

        // Validação: se WhatsApp ativo, número é obrigatório
        const whatsAtivo = document.getElementById("whatsapp-alertas")?.checked;
        const numero = document.getElementById("numero-whatsapp")?.value?.trim();
        if (whatsAtivo && !numero) {
            document.getElementById("numero-whatsapp").style.borderColor = "red";
            return;
        }
        document.getElementById("numero-whatsapp").style.borderColor = "";

        btn.disabled = true;
        btn.textContent = "Salvando...";

        try {
            await setDoc(CONFIG_DOC, {
                diasAntecedencia:   dias,
                emailAtivo:         document.getElementById("email-alertas")?.checked ?? false,
                emailFrequencia:    document.getElementById("frequencia-email")?.value,
                whatsappAtivo:      whatsAtivo ?? false,
                whatsappNumero:     numero,
                whatsappFrequencia: document.getElementById("frequencia-whatsapp")?.value,
            }, { merge: true });

            btn.textContent = "✓ Salvo!";
            setTimeout(() => {
                btn.textContent = "Salvar Configurações";
                btn.disabled = false;
            }, 2000);

        } catch (erro) {
            console.error("Erro ao salvar:", erro);
            btn.textContent = "Erro ao salvar";
            btn.disabled = false;
        }
    });
}

// ============================================================
// HELPERS
// ============================================================
function setValue(id, val) {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.value = val;
}

function setCheck(id, val) {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.checked = val;
}