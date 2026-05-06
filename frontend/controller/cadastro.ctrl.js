import { auth } from "/firebase/firebase-config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

async function doRegister() {
    clearAlerts(); clearErrors();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;

    // Validações
    let valid = true;
    if (!isValidEmail(email)) { showErr('reg-email-err', 'Informe um e-mail válido.'); valid = false; }
    if (password.length < 10) { showErr('reg-password-err', 'Mínimo 10 caracteres.'); valid = false; }
    if (password !== confirm) { showErr('reg-confirm-err', 'As senhas não coincidem.'); valid = false; }
    if (!valid) return;

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        setAlert('register-alert', 'success', 'Cadastro realizado com sucesso!');
        // opcional: redirecionar após cadastro
        // window.location.replace('/view/login.html');

    } catch (erro) {
        if (erro.code === 'auth/email-already-in-use') {
            setAlert('register-alert', 'error', 'Este e-mail já está cadastrado.');
        } else {
            setAlert('register-alert', 'error', 'Erro ao cadastrar. Tente novamente.');
            console.error(erro);
        }
    }
}
document.getElementById('btn-voltar')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const resposta = await fetch('/frontend/view/login.html');
    const html = await resposta.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    document.getElementById('conteudo-principal').innerHTML = doc.body.innerHTML;
    import(`/frontend/controller/login.ctrl.js?t=${Date.now()}`).catch(console.error);
});