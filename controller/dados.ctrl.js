// controller/dados.ctrl.js

import { db } from "/firebase/firebase-config.js";
import {
    collection,
    getDocs,
    writeBatch,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function init() {
    if (!document.querySelector(".cards-container")) return;

    const profissionaisRef = collection(db, "profissionais");

    const inputArquivo   = document.getElementById("arquivoCsv");
    const nomeArquivoSpan = document.getElementById("nomeArquivo");
    const btnImportar    = document.getElementById("btnImportar");
    const btnExportar    = document.getElementById("btnExportar");
    const msgImport      = document.getElementById("mensagemImport");
    const msgExport      = document.getElementById("mensagemExport");

    function setMensagem(el, texto, tipo) {
        if (!el) return;
        el.textContent = texto;
        el.classList.remove("sucesso", "erro");
        if (tipo) el.classList.add(tipo);
    }

    // Botão "Escolher Arquivo"
    document.querySelectorAll(".upload-botao").forEach(btn => {
        btn.addEventListener("click", () => inputArquivo?.click());
    });

    // Atualiza nome do arquivo selecionado
    inputArquivo?.addEventListener("change", () => {
        const nome = inputArquivo.files[0]?.name || "Nenhum arquivo escolhido";
        if (nomeArquivoSpan) nomeArquivoSpan.textContent = nome;
    });

    // Importar
    btnImportar?.addEventListener("click", async () => {
        setMensagem(msgImport, "", null);
        const file = inputArquivo?.files[0];

        if (!file) {
            setMensagem(msgImport, "Selecione um arquivo CSV primeiro.", "erro");
            return;
        }

        btnImportar.disabled = true;
        btnImportar.textContent = "Importando...";

        try {
            const texto = await file.text();
            const linhas = texto.split(/\r?\n/).filter(l => l.trim().length > 0);

            if (linhas.length <= 1) {
                setMensagem(msgImport, "Arquivo CSV vazio ou sem dados.", "erro");
                return;
            }

            const cabecalhos = linhas[0].split(";").map(h => h.trim());
            const idx = (nome) => cabecalhos.indexOf(nome);

            const camposObrig = ["nome", "cpf", "cargo", "setor", "email", "telefone", "dataAdmissao", "status"];
            const faltando = camposObrig.filter(c => idx(c) === -1);
            if (faltando.length) {
                setMensagem(msgImport, `Colunas ausentes no CSV: ${faltando.join(", ")}`, "erro");
                return;
            }

            const batch = writeBatch(db);
            let total = 0;

            for (let i = 1; i < linhas.length; i++) {
                const partes = linhas[i].split(";");
                if (partes.length < cabecalhos.length) continue;

                const dados = {
                    nome:         partes[idx("nome")]?.trim()         || "",
                    cpf:          partes[idx("cpf")]?.trim()          || "",
                    cargo:        partes[idx("cargo")]?.trim()        || "",
                    setor:        partes[idx("setor")]?.trim()        || "",
                    email:        partes[idx("email")]?.trim()        || "",
                    telefone:     partes[idx("telefone")]?.trim()     || "",
                    dataAdmissao: partes[idx("dataAdmissao")]?.trim() || "",
                    status:       partes[idx("status")]?.trim()       || "",
                    createdAt:    serverTimestamp()
                };

                const ref = doc(profissionaisRef);
                batch.set(ref, dados);
                total++;
            }

            if (!total) {
                setMensagem(msgImport, "Nenhuma linha válida encontrada.", "erro");
                return;
            }

            await batch.commit();
            setMensagem(msgImport, `${total} registro(s) importado(s) com sucesso!`, "sucesso");

        } catch (err) {
            console.error("Erro ao importar:", err);
            setMensagem(msgImport, "Erro ao importar. Verifique o formato e tente novamente.", "erro");
        } finally {
            btnImportar.disabled = false;
            btnImportar.textContent = "Importar Arquivo";
        }
    });

    // Exportar
    btnExportar?.addEventListener("click", async () => {
        setMensagem(msgExport, "Gerando arquivo...", null);
        btnExportar.disabled = true;
        btnExportar.textContent = "Gerando...";

        try {
            const snap = await getDocs(profissionaisRef);
            const cabecalho = ["nome", "cpf", "cargo", "setor", "email", "telefone", "dataAdmissao", "status"];
            const linhas = [cabecalho.join(";")];

            snap.forEach(docSnap => {
                const d = docSnap.data();
                const linha = cabecalho.map(c => `"${String(d[c] || "").replace(/"/g, '""')}"`);
                linhas.push(linha.join(";"));
            });

            const blob = new Blob([linhas.join("\r\n")], { type: "text/csv;charset=utf-8;" });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement("a");
            a.href     = url;
            a.download = "cvd_profissionais.csv";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            setMensagem(msgExport, "CSV gerado com sucesso!", "sucesso");

        } catch (err) {
            console.error("Erro ao exportar:", err);
            setMensagem(msgExport, "Erro ao exportar. Verifique o console.", "erro");
        } finally {
            btnExportar.disabled = false;
            btnExportar.textContent = "Exportar CSV Combinado";
        }
    });
}