import { auth } from "/firebase/firebase-config.js";
import { onAuthStateChanged, signOut }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const conteudo = document.getElementById('conteudo-principal');

const telas = {
    dashboard:         '/frontend/view/dashboard.html',
    profissionais:     '/frontend/view/profissionais.html',
    documentos:        '/frontend/view/documentos.html',
    alertas:           '/frontend/view/alertas.html',
    importar_exportar: '/frontend/view/dados.html',
    config:            '/frontend/view/config.html',
};

const cssTelas = {
    dashboard:         '/frontend/view/css/dashboard.css',
    profissionais:     '/frontend/view/css/profissionais.css',
    documentos:        '/frontend/view/css/documentos.css',
    alertas:           '/frontend/view/css/alertas.css',
    importar_exportar: '/frontend/view/css/dados.css',
    config:            '/frontend/view/css/config.css',
};

let cssAtivo  = null;
let telaAtiva = null;

function esconderSidebar(esconder) {
    const sidebar = document.querySelector('.sidebar');
    sidebar.style.display = esconder ? 'none' : '';
    conteudo.style.marginLeft = esconder ? '0' : '';
    conteudo.style.width = esconder ? '100%' : '';
    conteudo.style.padding = esconder ? '0' : '';
}

async function carregarLogin() {
    telaAtiva = null;
    esconderSidebar(true);

    if (!document.getElementById('css-login')) {
        const linkCSS = document.createElement('link');
        linkCSS.rel = 'stylesheet';
        linkCSS.href = '/frontend/view/css/login_cadastro.css';
        linkCSS.id = 'css-login';
        document.head.appendChild(linkCSS);
    }

    const resposta = await fetch('/frontend/view/login.html');
    const html = await resposta.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    conteudo.innerHTML = doc.body.innerHTML;
    import(`/frontend/controller/login.ctrl.js?t=${Date.now()}`).catch(console.error);
}

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
    if (tela === telaAtiva) return;

    document.getElementById('css-login')?.remove();
    esconderSidebar(false);

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
                    import('/frontend/controller/dashboard.ctrl.js')
                        .then(mod => mod.iniciarDashboard?.())
                        .catch(console.error);
                };
                document.head.appendChild(script);
            } else {
                import('/frontend/controller/dashboard.ctrl.js')
                    .then(mod => mod.iniciarDashboard?.())
                    .catch(console.error);
            }
        }

        if (tela === 'profissionais') {
            import('/frontend/controller/profissionais.ctrl.js')
                .then(mod => mod.init?.())
                .catch(console.error);
        }

        if (tela === 'documentos') {
            import('/frontend/controller/documentos.ctrl.js')
                .then(mod => mod.init?.())
                .catch(console.error);
        }

        if (tela === 'alertas') {
            import('/frontend/controller/alertas.ctrl.js')
                .then(mod => mod.init?.())
                .catch(console.error);
        }

        if (tela === 'importar_exportar') {
            setTimeout(() => {
                import('/frontend/controller/dados.ctrl.js')
                    .then(mod => mod.init?.())
                    .catch(console.error);
            }, 100);
        }

        if (tela === 'config') {
            import('/frontend/controller/config.ctrl.js')
                .then(mod => mod.init?.())
                .catch(console.error);
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

// Responde sempre que o estado de auth mudar
onAuthStateChanged(auth, (usuario) => {
    if (usuario) {
        carregarTela('dashboard');
    } else {
        carregarLogin();
    }
});

document.getElementById('btn-sair')?.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth);
});

window.carregarTela = carregarTela;
// Event delegation para botões dentro das views
document.getElementById('conteudo-principal').addEventListener('click', (e) => {
    const verTodos = e.target.closest('.ver-todos');
    if (verTodos) {
        e.preventDefault();
        carregarTela('alertas');
    }
});