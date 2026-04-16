// ============================================================
// controller/login.ctrl.js
// Conecta o formulário de login ao Firebase Authentication
// Suporta: e-mail/senha  +  login com Google
// ============================================================

import { auth } from "/firebase/firebase-config.js";
import {
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";


// ── Se já estiver logado, vai direto pro sistema ────────────
let redirecionando = false;

onAuthStateChanged(auth, (usuario) => {
    if (usuario && !redirecionando) {
        redirecionando = true;
        window.location.replace("/view/app.html");
    }
});

// ── Elementos do DOM ────────────────────────────────────────
const formLogin   = document.getElementById("form-login");
const campoEmail  = document.getElementById("email");
const campoSenha  = document.getElementById("senha");
const btnLogin    = document.getElementById("btn-login");
const btnGoogle   = document.getElementById("btn-google");
const erroLogin   = document.getElementById("erro-login");

// ── Login com E-mail e Senha ────────────────────────────────
formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = campoEmail.value.trim();
    const senha = campoSenha.value;

    setCarregando(true);
    erroLogin.textContent = "";

    try {
        await signInWithEmailAndPassword(auth, email, senha);
        // onAuthStateChanged acima redireciona automaticamente
    } catch (erro) {
        erroLogin.textContent = traduzirErro(erro.code);
        setCarregando(false);
    }
});

// ── Login com Google ────────────────────────────────────────
btnGoogle.addEventListener("click", async () => {
    erroLogin.textContent = "";

    const provider = new GoogleAuthProvider();

    try {
        await signInWithPopup(auth, provider);
        // onAuthStateChanged acima redireciona automaticamente
    } catch (erro) {
        // usuário fechou o popup — não mostra erro
        if (erro.code === "auth/popup-closed-by-user") return;
        erroLogin.textContent = traduzirErro(erro.code);
    }
});

// ── Feedback visual durante o carregamento ──────────────────
function setCarregando(ativo) {
    btnLogin.disabled  = ativo;
    btnGoogle.disabled = ativo;
    btnLogin.textContent = ativo ? "Entrando..." : "Entrar";
}

// ── Tradução dos erros do Firebase para português ───────────
function traduzirErro(codigo) {
    const erros = {
        "auth/invalid-credential":     "E-mail ou senha incorretos.",
        "auth/user-not-found":         "Nenhum usuário com este e-mail.",
        "auth/wrong-password":         "Senha incorreta.",
        "auth/invalid-email":          "E-mail inválido.",
        "auth/too-many-requests":      "Muitas tentativas. Aguarde alguns minutos.",
        "auth/network-request-failed": "Sem conexão com a internet.",
        "auth/user-disabled":          "Este usuário foi desativado."
    };
    return erros[codigo] ?? "Erro ao fazer login. Tente novamente.";
}