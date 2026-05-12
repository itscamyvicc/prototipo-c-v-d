// config/firebase.js

const admin = require("firebase-admin");
const path  = require("path");

// Carrega o arquivo de credenciais do Firebase Admin SDK
// Baixe em: Firebase Console → Configurações → Contas de serviço → Gerar nova chave privada
const serviceAccount = require(path.resolve(__dirname, "../serviceAccountKey.json"));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

module.exports = { db };