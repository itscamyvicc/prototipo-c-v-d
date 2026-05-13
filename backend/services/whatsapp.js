// services/whatsapp.js

const axios = require("axios");

// Configurações da UltraMsg
// Acesse: ultramsg.com → sua instância → Token
const ULTRAMSG_INSTANCE = process.env.ULTRAMSG_INSTANCE;
const ULTRAMSG_TOKEN    = process.env.ULTRAMSG_TOKEN;

const ULTRAMSG_URL = `https://api.ultramsg.com/${ULTRAMSG_INSTANCE}/messages/chat?token=${ULTRAMSG_TOKEN}`;

function formatarTelefone(telefone) {
    if (!telefone) return null;
    // Remove tudo que não é número
    const numeros = telefone.replace(/\D/g, "");
    // Se não começar com 55 (DDI Brasil), adiciona
    if (!numeros.startsWith("55")) {
        return `55${numeros}`;
    }
    return numeros;
}

async function enviarWhatsAppAlerta({ nome, telefone, tipoDocumento, diasRestantes, dataVencimento }) {
    if (!telefone) {
        console.warn(`⚠️ Profissional ${nome} sem telefone cadastrado — pulando.`);
        return;
    }

    const numeroFormatado = formatarTelefone(telefone);
    if (!numeroFormatado || numeroFormatado.length < 12) {
        console.warn(`⚠️ Telefone inválido para ${nome}: ${telefone} — pulando.`);
        return;
    }

    const mensagem =
        `⚠️ *Alerta de Vencimento de Documento*\n\n` +
        `Olá, *${nome}*!\n\n` +
        `Seu documento *${tipoDocumento}* está próximo do vencimento.\n\n` +
        `📅 *Vencimento:* ${dataVencimento}\n` +
        `⏳ *Dias restantes:* ${diasRestantes} dia(s)\n\n` +
        `Por favor, providencie a renovação o quanto antes.`;

    try {
        await axios.post(
            ULTRAMSG_URL,
            {
                to:   numeroFormatado,
                body: mensagem,
            },
            {
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
        console.log(`✅ WhatsApp enviado para ${nome} (${numeroFormatado})`);
    } catch (erro) {
        console.error(`❌ Erro ao enviar WhatsApp para ${nome} (${numeroFormatado}):`, erro.message);
    }
}

module.exports = { enviarWhatsAppAlerta };