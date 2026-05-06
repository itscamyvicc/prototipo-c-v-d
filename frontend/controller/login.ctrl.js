import { auth } from "/firebase/firebase-config.js";
import {
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const formLogin   = document.getElementById("form-login");
const campoEmail  = document.getElementById("email");
const campoSenha  = document.getElementById("senha");
const btnLogin    = document.getElementById("btn-login");
const btnGoogle   = document.getElementById("btn-google");
const erroLogin   = document.getElementById("erro-login");

formLogin?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = campoEmail.value.trim();
    const senha = campoSenha.value;
    setCarregando(true);
    erroLogin.textContent = "";
    try {
        await signInWithEmailAndPassword(auth, email, senha);
    } catch (erro) {
        erroLogin.textContent = traduzirErro(erro.code);
        setCarregando(false);
    }
});

btnGoogle?.addEventListener("click", async () => {
    erroLogin.textContent = "";
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (erro) {
        if (erro.code === "auth/popup-closed-by-user") return;
        erroLogin.textContent = traduzirErro(erro.code);
    }
});

function setCarregando(ativo) {
    btnLogin.disabled = ativo;
    btnGoogle.disabled = ativo;
    btnLogin.textContent = ativo ? "Entrando..." : "Entrar";
}

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
document.getElementById('link-cadastro')?.addEventListener('click', async (e) => {
    e.preventDefault();

    if (!document.getElementById('css-login')) {
        const linkCSS = document.createElement('link');
        linkCSS.rel = 'stylesheet';
        linkCSS.href = '/frontend/view/css/login_cadastro.css';
        linkCSS.id = 'css-login';
        document.head.appendChild(linkCSS);
    }

    const resposta = await fetch('/frontend/view/cadastro.html');
    const html = await resposta.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    document.getElementById('conteudo-principal').innerHTML = doc.body.innerHTML;
    import(`/frontend/controller/cadastro.ctrl.js?t=${Date.now()}`).catch(console.error);
});