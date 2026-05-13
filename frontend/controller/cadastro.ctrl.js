// ✅ CORREÇÃO 1: Caminho correto do firebase-config
import { auth } from "/firebase/firebase-config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ---------- Utilitários ----------

function clearAlerts() {
    const el = document.getElementById('register-alert');
    if (!el) return;
    el.style.display = 'none';
    el.textContent = '';
}

function clearErrors() {
    document.querySelectorAll('span[id$="-err"]').forEach(el => el.textContent = '');
}

function showErr(id, msg) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
}

function setAlert(id, tipo, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    el.style.color = tipo === 'error' ? 'red' : 'green';
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------- Cadastro ----------

// ✅ CORREÇÃO 2: Listener no form para chamar o cadastro
document.getElementById('formCadastro')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlerts();
    clearErrors();

    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm  = document.getElementById('reg-confirm').value;

    let valid = true;
    if (!isValidEmail(email))  { showErr('reg-email-err',    'Informe um e-mail válido.'); valid = false; }
    if (password.length < 10)  { showErr('reg-password-err', 'Mínimo 10 caracteres.');    valid = false; }
    if (password !== confirm)  { showErr('reg-confirm-err',  'As senhas não coincidem.'); valid = false; }
    if (!valid) return;

    const btnSubmit = document.querySelector('#formCadastro button[type="submit"]');
    if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.textContent = 'Criando conta...'; }

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        setAlert('register-alert', 'success', 'Cadastro realizado com sucesso!');

    } catch (erro) {
        console.error(erro);
        if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.textContent = 'Criar Conta'; }

        const mensagens = {
            'auth/email-already-in-use':  'Este e-mail já está cadastrado.',
            'auth/invalid-email':          'E-mail inválido.',
            'auth/weak-password':          'Senha muito fraca.',
            'auth/network-request-failed': 'Sem conexão com a internet.',
            'auth/too-many-requests':      'Muitas tentativas. Aguarde alguns minutos.',
        };
        setAlert('register-alert', 'error', mensagens[erro.code] ?? 'Erro ao cadastrar. Tente novamente.');
    }
});

// ---------- Botão Voltar ----------

document.getElementById('btn-voltar')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const resposta = await fetch('/frontend/view/login.html');
    const html = await resposta.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    document.getElementById('conteudo-principal').innerHTML = doc.body.innerHTML;
    import(`/frontend/controller/login.ctrl.js?t=${Date.now()}`).catch(console.error);
});