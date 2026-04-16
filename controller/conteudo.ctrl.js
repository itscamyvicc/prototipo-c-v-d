// ============================================================
// controller/conteudo.ctrl.js
// ============================================================

import { auth } from "/firebase/firebase-config.js";
import { onAuthStateChanged, signOut }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Substitui o onAuthStateChanged atual por este:
let verificado = false;

onAuthStateChanged(auth, (usuario) => {
    if (verificado) return; // ignora disparos duplicados
    verificado = true;

    if (!usuario) {
       window.location.replace("/view/login.html");
    } else {
    carregarTela('dashboard'); // ← usa isso
}
});
document.getElementById('btn-sair')?.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth).then(() => {
        window.location.replace('/view/login.html');
    });
});

const conteudo = document.getElementById('conteudo-principal');

const telas = {
    dashboard:         '/view/dashboard.html',
    profissionais:     '/view/profissionais.html',
    documentos:        '/view/documentos.html',
    alertas:           '/view/alertas.html',
    importar_exportar: '/view/dados.html',
    config:            '/view/config.html',
};

const cssTelas = {
    dashboard:         '/view/css/dashboard.css',
    profissionais:     '/view/css/profissionais.css',
    documentos:        '/view/css/documentos.css',
    alertas:           '/view/css/alertas.css',
    importar_exportar: '/view/css/dados.css',
    config:            '/view/css/config.css',
};

let cssAtivo  = null;
let telaAtiva = null;

function carregarCSS(tela) {
    const href = cssTelas[tela];
    if (!href) return;
    if (cssAtivo) cssAtivo.remove();
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
    cssAtivo = link;
}

async function carregarTela(tela) {
    // Se clicar na mesma tela, ignora sem loop
    if (tela === telaAtiva) return;

    const caminho = telas[tela];

    if (!caminho) {
        conteudo.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:300px;gap:12px;color:#999;">
                <i class='bx bx-wrench' style="font-size:48px;"></i>
                <p style="font-size:15px;">Esta seção ainda está em desenvolvimento.</p>
            </div>`;
        atualizarMenuAtivo(tela);
        telaAtiva = tela;
        return;
    }

    conteudo.innerHTML = `<div class="loading-tela">Carregando...</div>`;
    telaAtiva = tela;

    try {
        const resposta = await fetch(caminho);
        if (!resposta.ok) throw new Error(`Erro ao carregar ${caminho}`);

        const html = await resposta.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        conteudo.innerHTML = doc.body.innerHTML;

        carregarCSS(tela);
        atualizarMenuAtivo(tela);
        conteudo.scrollTop = 0;

    if (tela === 'dashboard') {
    if (!window.Chart) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => {
            import('/controller/dashboard.ctrl.js')
                .then(mod => mod.iniciarDashboard?.())
                .catch(console.error);
        };
        document.head.appendChild(script);
    } else {
        import('/controller/dashboard.ctrl.js')
            .then(mod => mod.iniciarDashboard?.())
            .catch(console.error);
    }
}

if (tela === 'profissionais') {
    import('/controller/profissionais.ctrl.js')
        .then(mod => mod.init?.())
        .catch(console.error);
}

if (tela === 'documentos') {
    import('/controller/documentos.ctrl.js')
        .then(mod => mod.init?.())
        .catch(console.error);
}

if (tela === 'alertas') {
    import('/controller/alertas.ctrl.js')
        .then(mod => mod.init?.())
        .catch(console.error);
}

if (tela === 'importar_exportar') {
    setTimeout(() => {
        import('/controller/dados.ctrl.js')
            .then(mod => mod.init?.())
            .catch(console.error);
    }, 100);
}

    } catch (erro) {
        console.error(erro);
        telaAtiva = null;
        conteudo.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:300px;gap:12px;color:#c0392b;">
                <i class='bx bx-error-circle' style="font-size:48px;"></i>
                <p style="font-size:15px;">Não foi possível carregar a tela. Verifique o console.</p>
            </div>`;
    }
}

function atualizarMenuAtivo(tela) {
    document.querySelectorAll('.nav-link a[data-tela]').forEach(link => {
        link.classList.remove('ativo');
        if (link.dataset.tela === tela) link.classList.add('ativo');
    });
}

document.querySelectorAll('.nav-link a[data-tela]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        carregarTela(link.dataset.tela);
    });
});

