# CVD – Controle de Validade Documental

> Aplicação web SPA (Single Page Application) para controle e gestão de documentos de profissionais da saúde, com autenticação Firebase, banco de dados em tempo real e notificações por e-mail e WhatsApp.

---

## Visão Geral

O CVD permite gerenciar documentos, profissionais e alertas de vencimento, utilizando arquitetura MVC no frontend com carregamento dinâmico de telas (SPA), integrado ao Firebase como banco de dados e autenticação. O backend em Node.js é responsável pelo envio de notificações por e-mail e WhatsApp, acionadas pelo painel administrativo.

---

## Arquitetura MVC (SPA)

O `index.html` é o shell principal da aplicação. O `conteudo.ctrl.js` gerencia a autenticação e o carregamento dinâmico de cada view dentro do `<main>`, sem recarregar a página.

```
prototipo-c-v-d/
├── index.html                         → Shell da SPA (sidebar + área de conteúdo)
├── frontend/
│   ├── assets/
│   │   └── img/
│   │       └── logo.png               → Logo da aplicação
│   ├── controller/                    → Lógica de negócio e integração Firebase + APIs
│   │   ├── conteudo.ctrl.js           → Roteamento SPA e autenticação
│   │   ├── login.ctrl.js              → Login e-mail/senha + Google
│   │   ├── cadastro.ctrl.js           → Cadastro de usuários
│   │   ├── dashboard.ctrl.js          → Gráficos e estatísticas
│   │   ├── profissionais.ctrl.js      → CRUD de profissionais
│   │   ├── documentos.ctrl.js         → CRUD de documentos
│   │   ├── alertas.ctrl.js            → Gestão de alertas
│   │   ├── dados.ctrl.js              → Importar/Exportar CSV
│   │   └── config.ctrl.js             → Configurações do sistema
│   ├── model/                         → Utilitários de dados
│   │   └── formatarInfoProf.js        → Formatação de dados de profissionais
│   └── view/                          → Fragmentos HTML e estilos por tela
│       ├── css/
│       │   ├── alertas.css
│       │   ├── config.css
│       │   ├── conteudoPrincipal.css
│       │   ├── dados.css
│       │   ├── dashboard.css
│       │   ├── documentos.css
│       │   ├── login_cadastro.css
│       │   └── profissionais.css
│       ├── alertas.html
│       ├── cadastro.html
│       ├── config.html
│       ├── dados.html
│       ├── dashboard.html
│       ├── documentos.html
│       ├── login.html
│       └── profissionais.html
├── backend/
│   ├── config/
│   │   └── firebase.js                → Conexão com o Firebase via Admin SDK
│   ├── routes/
│   │   └── alertas.js                 → Rota para disparo de alertas
│   ├── services/
│   │   ├── email.js                   → Serviço de envio de e-mail (Nodemailer)
│   │   └── whatsapp.js                → Serviço de envio de WhatsApp (UltraMsg)
│   ├── .env                           → ⚠️ Não commitado — credenciais reais
│   ├── .env.example                   → Modelo de variáveis de ambiente
│   ├── cron.js                        → Lógica de verificação e reset de alertas
│   ├── server.js                      → Servidor Express
│   └── serviceAccountKey.json         → ⚠️ Não commitado — chave privada Firebase
├── firebase/
│   ├── firebase-config.js             → ⚠️ Não commitado — configuração real
│   ├── example.js                     → Modelo de configuração (público)
│   └── collections.md                 → Documentação da estrutura do banco
├── docs/
│   └── TCC.pdf                        → Documento do TCC
├── .gitignore
└── README.md
```

---

## Tecnologias

| Camada | Tecnologia |
|--------|------------|
| Interface | HTML5, CSS3, JavaScript (ES6+) |
| Banco de dados | Firebase Firestore |
| Autenticação | Firebase Authentication (e-mail/senha + Google) |
| Backend | Node.js + Express |
| Agendamento | node-cron |
| Notificações e-mail | Nodemailer (Gmail) |
| Notificações WhatsApp | UltraMsg API |

---

## Fluxo da SPA

```
Usuário acessa index.html
        ↓
conteudo.ctrl.js verifica autenticação (Firebase Auth)
        ↓
NÃO logado → carrega login.html no <main> (sidebar oculta)
        ↓
Login bem-sucedido → onAuthStateChanged dispara
        ↓
Logado → carrega dashboard.html no <main> (sidebar visível)
        ↓
Navegação pelo menu → carrega view correspondente dinamicamente
```

---

## Fluxo de Alertas

```
Admin acessa painel → clica em "Verificar Alertas"
        ↓
Backend busca alertas com visualizado = false
        ↓
Filtra documentos dentro do prazo de antecedência configurado
        ↓
Envia e-mail e/ou WhatsApp para o profissional
        ↓
Admin visualiza o alerta → marca como visto → visualizado = true
        ↓
Se o documento entrar em ≤ 7 dias → sistema reseta para visualizado = false
        ↓
Próxima verificação → profissional é notificado novamente
```

---

## Como Rodar Localmente

### Frontend

1. Clone o repositório:
```bash
git clone https://github.com/CristianHarold10/prototipo-c-v-d.git
cd prototipo-c-v-d
```

2. Configure o Firebase:
   - Copie `firebase/example.js` para `firebase/firebase-config.js`
   - Preencha com as credenciais do seu projeto Firebase

3. Abra o projeto com **Live Server** no VS Code apontando para a raiz (`index.html`)

> ⚠️ Não abra os arquivos `.html` diretamente pelo navegador — os módulos ES6 exigem um servidor HTTP.

### Backend

1. Entre na pasta do backend:
```bash
cd backend
npm install
```

2. Crie o arquivo `.env` com base no `.env.example`:
```dotenv
# E-mail (Nodemailer)
EMAIL_USER=seu_email@gmail.com
EMAIL_PASS=sua_senha_de_app

# WhatsApp (UltraMsg)
ULTRAMSG_INSTANCE=sua_instancia
ULTRAMSG_TOKEN=seu_token
```

3. Adicione o arquivo `serviceAccountKey.json` na pasta `backend/`

4. Suba o servidor:
```bash
node server.js
```

---

## Notificações

As notificações são disparadas pelo backend Node.js através do painel administrativo:

- **E-mail:** `services/email.js` → Nodemailer via Gmail
- **WhatsApp:** `services/whatsapp.js` → UltraMsg API

As configurações (ativar/desativar e-mail e WhatsApp, prazo de antecedência) são gerenciadas pelo painel de configurações e salvas no Firestore.

---

## Fluxo de Trabalho Git

```
main         → versão estável (só merge via PR)
ft-backend   → branch principal de desenvolvimento
feature/xxx  → branches individuais por funcionalidade
```

**Exemplo de fluxo:**
```bash
git checkout ft-backend
git checkout -b feature/alertas-filtros
# ... desenvolve ...
git push origin feature/alertas-filtros
# Abre Pull Request para ft-backend
```

---

## Equipe

| Nome | Função | Área |
|------|--------|------|
| Cristian | Backend / Controller | Lógica de negócio |
| Fábio | Frontend / View | Interface e layout |
| Camila | Frontend / View | Interface e layout |
| Leticia 1 | Firebase / Modelagem | Banco de dados |
| Leticia 2 | Firebase / Modelagem | Banco de dados |

---

## Licença

Projeto acadêmico — uso restrito à equipe.
