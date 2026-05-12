 // services/email.js

const nodemailer = require("nodemailer");

// Configura o transporte via Gmail
// Crie uma senha de app em: myaccount.google.com/apppasswords
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER, // seu email Gmail
        pass: process.env.EMAIL_PASS, // senha de app (não a senha normal)
    },
});

async function enviarEmailAlerta({ nome, email, tipoDocumento, diasRestantes, dataVencimento }) {
    if (!email) {
        console.warn(`⚠️ Profissional ${nome} sem email cadastrado — pulando.`);
        return;
    }

    const assunto = `⚠️ Documento próximo do vencimento: ${tipoDocumento}`;

    const corpo = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #003366; padding: 24px; border-radius: 8px 8px 0 0;">
                <h2 style="color: white; margin: 0;">⚠️ Alerta de Vencimento</h2>
            </div>
            <div style="background-color: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
                <p style="font-size: 16px;">Olá, <strong>${nome}</strong>!</p>
                <p>Seu documento <strong>${tipoDocumento}</strong> está próximo do vencimento.</p>
                
                <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 16px; margin: 16px 0;">
                    <p style="margin: 0; font-size: 15px;">
                        📅 <strong>Vencimento:</strong> ${dataVencimento}<br>
                        ⏳ <strong>Dias restantes:</strong> ${diasRestantes < 0 ? `Vencido há ${Math.abs(diasRestantes)} dia(s)` : `${diasRestantes} dia(s)`}
                    </p>
                </div>

                <p>Por favor, providencie a renovação o quanto antes para evitar irregularidades.</p>
                <p style="color: #666; font-size: 12px; margin-top: 24px;">
                    Este é um aviso automático do sistema de gestão de documentos.
                </p>
            </div>
        </div>
    `;

    try {
        await transporter.sendMail({
            from: `"Sistema de Alertas" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: assunto,
            html: corpo,
        });
        console.log(`✅ Email enviado para ${nome} (${email})`);
    } catch (erro) {
        console.error(`❌ Erro ao enviar email para ${nome} (${email}):`, erro.message);
    }
}

module.exports = { enviarEmailAlerta };