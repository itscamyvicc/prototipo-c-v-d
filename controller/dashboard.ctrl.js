// Busca os dados reais do Firebase e preenche o dashboard.html

import { db } from "/firebase/firebase-config.js";
import {
    collection,
    getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function iniciarDashboard() {

    if (!document.querySelector(".card-stat-valor")) return;

    try {
        const [snapDocs, snapProfs, snapAlertas] = await Promise.all([
            getDocs(collection(db, "documentos")),
            getDocs(collection(db, "profissionais")),
            getDocs(collection(db, "alertas"))
        ]);

        const documentos    = snapDocs.docs.map(d => d.data());
        const profissionais = snapProfs.docs.map(d => d.data());
        const alertas       = snapAlertas.docs.map(d => d.data());

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const totalDocs        = documentos.length;
        const profsAtivos      = profissionais.filter(p => p.status?.toLowerCase() === "ativo").length;
        const docsValidos      = documentos.filter(d => d.status?.toLowerCase() === "ativo").length;
        const alertasPendentes = alertas.filter(a => a.visualizado === false).length;

        const valores = document.querySelectorAll(".card-stat-valor");
        if (valores[0]) valores[0].textContent = totalDocs;
        if (valores[1]) valores[1].textContent = profsAtivos;
        if (valores[2]) valores[2].textContent = docsValidos;
        if (valores[3]) valores[3].textContent = alertasPendentes;

        const vencendo = documentos
            .filter(d => {
                if (!d.dataValidade) return false;
                const validade = new Date(d.dataValidade);
                const diasRestantes = Math.ceil((validade - hoje) / (1000 * 60 * 60 * 24));
                const limite = d.alertarDias ?? 30;
                return diasRestantes >= 0 && diasRestantes <= limite;
            })
            .map(d => {
                const validade = new Date(d.dataValidade);
                const diasRestantes = Math.ceil((validade - hoje) / (1000 * 60 * 60 * 24));
                return { ...d, diasRestantes };
            })
            .sort((a, b) => a.diasRestantes - b.diasRestantes);

        renderizarVencendo(vencendo);

        const urgentes = alertas.filter(a => a.visualizado === false);
        renderizarAlertas(urgentes);

        atualizarGraficos(documentos, profissionais);

    } catch (erro) {
        console.error("Erro ao carregar dashboard:", erro);
    }
}

function renderizarVencendo(lista) {
    const container = document.querySelector(".card-secao:first-child");
    if (!container) return;

    container.querySelectorAll(".item-vencendo").forEach(el => el.remove());

    if (lista.length === 0) {
        container.insertAdjacentHTML("beforeend", `
            <div class="alertas-ok">
                <i class='bx bx-check-circle'></i>
                <p>Nenhum documento vencendo em breve!</p>
            </div>
        `);
        return;
    }

    lista.forEach(doc => {
        const badge = doc.diasRestantes === 0 ? "Hoje" : `${doc.diasRestantes} dias`;
        container.insertAdjacentHTML("beforeend", `
            <div class="item-vencendo">
                <div class="item-vencendo-icon"><i class='bx bx-error'></i></div>
                <div class="item-vencendo-info">
                    <div class="item-vencendo-topo">
                        <strong>${doc.tipoDocumento ?? "Documento"}</strong>
                        <span class="badge-dias">${badge}</span>
                    </div>
                    <span class="item-vencendo-prof">${doc.nomeProfissional ?? ""}</span>
                </div>
            </div>
        `);
    });
}

function renderizarAlertas(lista) {
    const container = document.querySelector(".card-alertas");
    if (!container) return;

    container.querySelector(".alertas-ok")?.remove();
    container.querySelectorAll(".item-alerta").forEach(el => el.remove());

    if (lista.length === 0) {
        container.insertAdjacentHTML("beforeend", `
            <div class="alertas-ok">
                <i class='bx bx-check-circle'></i>
                <p>Tudo em dia!</p>
            </div>
        `);
        return;
    }

    lista.forEach(alerta => {
        container.insertAdjacentHTML("beforeend", `
            <div class="item-vencendo item-alerta">
                <div class="item-vencendo-icon"><i class='bx bxs-bell-ring'></i></div>
                <div class="item-vencendo-info">
                    <div class="item-vencendo-topo">
                        <strong>${alerta.tipo ?? "Alerta"}</strong>
                        <span class="badge-dias">${alerta.diasParaVencer ?? ""} dias</span>
                    </div>
                </div>
            </div>
        `);
    });
}

function atualizarGraficos(documentos, profissionais) {
    const setores = {};
    profissionais.forEach(p => {
        const setor = p.setor ?? "Outros";
        setores[setor] = (setores[setor] || 0);
    });
    documentos.forEach(d => {
        const prof = profissionais.find(p => p.nome === d.nomeProfissional);
        const setor = prof?.setor ?? "Outros";
        setores[setor] = (setores[setor] || 0) + 1;
    });

    const tipos = {};
    documentos.forEach(d => {
        const tipo = d.tipoDocumento ?? "Outros";
        tipos[tipo] = (tipos[tipo] || 0) + 1;
    });
    const labelsTipos  = Object.keys(tipos);
    const valoresTipos = Object.values(tipos);
    const total        = valoresTipos.reduce((a, b) => a + b, 0);
    const percentuais  = valoresTipos.map(v => Math.round((v / total) * 100));

    criarGraficoBarras(Object.keys(setores), Object.values(setores));
    criarGraficoRosca(labelsTipos, percentuais);
    criarGraficoLinhas(documentos); // ← única linha adicionada aqui
}

function criarGraficoBarras(labels, dados) {
    const canvas = document.getElementById("graficoBarras");
    if (!canvas) return;

    Chart.getChart(canvas)?.destroy();

    new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data: dados,
                backgroundColor: '#124b92',
                borderRadius: 6,
                borderSkipped: false,
                barThickness: 60,
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function criarGraficoRosca(labels, dados) {
    const canvas = document.getElementById("graficoRosca");
    if (!canvas) return;

    Chart.getChart(canvas)?.destroy();

    new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: dados,
                backgroundColor: ['#003366','#1565c0','#1976d2','#42a5f5','#90caf9'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'left',
                    labels: {
                        font: { size: 12, family: 'Poppins' },
                        padding: 25,
                        generateLabels: (chart) => {
                            const data = chart.data;
                            return data.labels.map((label, i) => ({
                                text: `${label} ${data.datasets[0].data[i]}%`,
                                fillStyle: data.datasets[0].backgroundColor[i],
                                strokeStyle: '#fff',
                                lineWidth: 2,
                                index: i
                            }));
                        }
                    }
                }
            }
        }
    });
}

function criarGraficoLinhas(documentos) {
    const canvas = document.getElementById("graficoLinhas");
    if (!canvas) return;

    Chart.getChart(canvas)?.destroy();

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const meses = [];
    const validos = [], vencendo = [], vencidos = [];

    for (let i = 11; i >= 0; i--) {
        const ref = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        meses.push(ref.toLocaleString('pt-BR', { month: 'short' }).replace('.', ''));

        const mes = ref.getMonth();
        const ano = ref.getFullYear();

        let v = 0, ve = 0, vd = 0;
        documentos.forEach(doc => {
            if (!doc.dataValidade) return;
            const validade = new Date(doc.dataValidade);
            if (validade.getFullYear() === ano && validade.getMonth() === mes) {
                const diff = Math.ceil((validade - hoje) / (1000 * 60 * 60 * 24));
                if (diff < 0) vd++;
                else if (diff <= 30) ve++;
                else v++;
            }
        });
        validos.push(v);
        vencendo.push(ve);
        vencidos.push(vd);
    }

    new Chart(canvas, {
        type: 'line',
        data: {
            labels: meses,
            datasets: [
                {
                    label: 'Válidos',
                    data: validos,
                    borderColor: '#42a5f5',
                    backgroundColor: 'rgba(66,165,245,0.08)',
                    pointBackgroundColor: '#42a5f5',
                    tension: 0.3,
                    fill: false,
                },
                {
                    label: 'Vencendo',
                    data: vencendo,
                    borderColor: '#1565c0',
                    backgroundColor: 'rgba(21,101,192,0.08)',
                    pointBackgroundColor: '#1565c0',
                    tension: 0.3,
                    fill: false,
                },
                {
                    label: 'Vencidos',
                    data: vencidos,
                    borderColor: '#003366',
                    backgroundColor: 'rgba(0,51,102,0.08)',
                    pointBackgroundColor: '#003366',
                    tension: 0.3,
                    fill: false,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 12, family: 'Poppins' },
                        padding: 20,
                        usePointStyle: true,
                        pointStyleWidth: 17,
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 2 }, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { grid: { color: 'rgba(0,0,0,0.05)' } }
            }
        }
    });
}