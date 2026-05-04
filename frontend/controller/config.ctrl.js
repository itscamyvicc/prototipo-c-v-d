import { db } from "/firebase/firebase-config.js";
import { doc, getDoc, setDoc }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const CONFIG_DOC = doc(db, "configuracoes", "sistema");

export async function init() {
    await carregarConfiguracoes();
    configurarTogglesDependentes();
    configurarBtnSalvar();
}

async function carregarConfiguracoes() {
    try {
        const snap = await getDoc(CONFIG_DOC);
        if (!snap.exists()) return;

        const c = snap.data();

        setValue("dias-antecedencia", c.diasAntecedencia);
        setCheck("email-alertas",     c.emailAtivo);
        setValue("frequencia-email",  c.emailFrequencia);
        setCheck("whatsapp-alertas",  c.whatsappAtivo);

        toggleCampos("email-alertas", ["frequencia-email"]);

    } catch (erro) {
        console.error("Erro ao carregar configurações:", erro);
    }
}

function configurarTogglesDependentes() {
    const pares = [
        { check: "email-alertas", deps: ["frequencia-email"] },
    ];

    pares.forEach(({ check, deps }) => {
        const el = document.getElementById(check);
        if (!el) return;
        el.addEventListener("change", () => toggleCampos(check, deps));
        toggleCampos(check, deps);
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

        const whatsAtivo = document.getElementById("whatsapp-alertas")?.checked;

        btn.disabled = true;
        btn.textContent = "Salvando...";

        try {
            await setDoc(CONFIG_DOC, {
                diasAntecedencia: dias,
                emailAtivo:       document.getElementById("email-alertas")?.checked ?? false,
                emailFrequencia:  document.getElementById("frequencia-email")?.value,
                whatsappAtivo:    whatsAtivo ?? false,
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

function setValue(id, val) {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.value = val;
}

function setCheck(id, val) {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.checked = val;
}