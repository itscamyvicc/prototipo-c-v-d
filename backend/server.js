// server.js

require("dotenv").config();

const express              = require("express");
const cors                 = require("cors");  // ← adiciona
const { verificarAlertas } = require("./cron");

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// Rota de health check — só para confirmar que o servidor está vivo
app.get("/", (req, res) => {
    res.json({ status: "ok", mensagem: "Backend de alertas rodando!" });
});

// Rota manual para disparar verificação sem esperar o cron
// Útil para testar: GET http://localhost:3000/disparar-alertas
app.get("/disparar-alertas", async (req, res) => {
    console.log("🔔 Disparo manual solicitado via rota.");
    try {
        await verificarAlertas();
        res.json({ status: "ok", mensagem: "Verificação concluída." });
    } catch (erro) {
        res.status(500).json({ status: "erro", mensagem: erro.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
    console.log(`🕐 Cron agendado — verificação diária às 8h (America/Sao_Paulo)`);
});