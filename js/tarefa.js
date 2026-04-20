// js/tarefa.js
import { obterTarefas, atualizarTarefaBD, concluirTarefaBD, obterConfiguracoesBD } from './firebase.js';

// Elementos da Tela
const tituloTarefa = document.getElementById('tituloTarefa');
const conteudoPrincipal = document.getElementById('conteudoPrincipal');
const barraAcoes = document.getElementById('barraAcoes');
const telaAviso = document.getElementById('telaAviso');

const statusBadge = document.getElementById('statusBadge');
const prazoTarefa = document.getElementById('prazoTarefa');
const equipeTarefa = document.getElementById('equipeTarefa');

const containerPdf = document.getElementById('containerPdf');
const iframePdf = document.getElementById('iframePdf');
const btnExpandirPdf = document.getElementById('btnExpandirPdf');

const inputObservacoes = document.getElementById('inputObservacoes');
const btnSalvarObs = document.getElementById('btnSalvarObs');

const btnPausar = document.getElementById('btnPausar');
const btnConcluir = document.getElementById('btnConcluir');

// Variáveis Globais para esta tela
let idTarefaAtual = null;
let tarefaAtual = null;

// Função para pegar o ID que vem na URL (ex: tarefa.html?id=123)
function obterIdDaUrl() {
    const parametros = new URLSearchParams(window.location.search);
    return parametros.get('id');
}

// Para o Google Drive deixar o PDF visualizável no iframe, precisamos trocar "view?usp=sharing" por "preview" no link
function formatarLinkDriveParaPreview(url) {
    if (!url) return null;
    if (url.includes('drive.google.com/file/d/')) {
        // Pega a URL até o ID do arquivo e adiciona /preview
        const urlBase = url.split('/view')[0];
        return `${urlBase}/preview`;
    }
    return url;
}

function exibirAviso(titulo, texto, icone = 'fa-exclamation-circle', corIcone = 'text-gray-400') {
    conteudoPrincipal.classList.add('hidden');
    barraAcoes.classList.add('hidden');
    document.getElementById('tituloAviso').innerText = titulo;
    document.getElementById('textoAviso').innerText = texto;
    
    const iconeEl = document.getElementById('iconeAviso');
    iconeEl.className = `fas ${icone} text-5xl mb-4 ${corIcone}`;
    
    telaAviso.classList.remove('hidden');
    tituloTarefa.innerText = 'Gestão de Manutenção';
}

async function inicializarTela() {
    idTarefaAtual = obterIdDaUrl();

    if (!idTarefaAtual) {
        exibirAviso('Link Inválido', 'O link que você acessou não contém o código da tarefa.');
        return;
    }

    try {
        // 1. Busca todas as tarefas e acha a específica
        const tarefas = await obterTarefas();
        tarefaAtual = tarefas.find(t => t.id === idTarefaAtual);

        if (!tarefaAtual) {
            exibirAviso('Tarefa não encontrada', 'Esta tarefa foi excluída ou não existe mais no sistema.');
            return;
        }

        // Se já estiver concluída, avisa e não deixa editar mais
        if (tarefaAtual.status === 'Concluída') {
            exibirAviso('Tarefa já Concluída!', `A manutenção "${tarefaAtual.tarefa}" já foi marcada como concluída.`, 'fa-check-circle', 'text-green-500');
            return;
        }

        // 2. Preenche os dados básicos na tela
        tituloTarefa.innerText = tarefaAtual.tarefa;
        prazoTarefa.innerHTML = `<i class="far fa-calendar-alt mr-1"></i> Prazo: ${tarefaAtual.prazo}`;
        equipeTarefa.innerText = Array.isArray(tarefaAtual.equipe) ? tarefaAtual.equipe.join(', ') : tarefaAtual.equipe;
        inputObservacoes.value = tarefaAtual.observacao || '';

        // Status Visual
        if (tarefaAtual.status === 'Pausada') {
            statusBadge.className = "bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wide";
            statusBadge.innerText = "Pausada";
            btnPausar.innerHTML = `<i class="fas fa-play-circle text-lg"></i> Retomar Tarefa`;
        } else {
            statusBadge.className = "bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wide";
            statusBadge.innerText = "Em Andamento";
        }

        // 3. Busca o link do PDF nas configurações do sistema
        const configs = await obterConfiguracoesBD();
        const configDaTarefa = configs.tarefas.find(c => c.nome === tarefaAtual.tarefa);
        
        if (configDaTarefa && configDaTarefa.urlArquivo) {
            const urlPreview = formatarLinkDriveParaPreview(configDaTarefa.urlArquivo);
            iframePdf.src = urlPreview;
            containerPdf.classList.remove('hidden');
            
            // Botão para abrir o PDF em outra aba cheia se o usuário quiser
            btnExpandirPdf.onclick = () => window.open(configDaTarefa.urlArquivo, '_blank');
        }

        // 4. Mostra o conteúdo e a barra de ações
        conteudoPrincipal.classList.remove('hidden');
        barraAcoes.classList.remove('hidden');

    } catch (error) {
        console.error("Erro ao carregar a tela de tarefa:", error);
        exibirAviso('Erro de Conexão', 'Não foi possível carregar os detalhes da tarefa. Tente recarregar a página.', 'fa-wifi', 'text-red-500');
    }
}

// --- EVENTOS DOS BOTÕES ---

btnSalvarObs.addEventListener('click', async () => {
    const obs = inputObservacoes.value.trim();
    btnSalvarObs.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Salvando...';
    btnSalvarObs.disabled = true;

    try {
        await atualizarTarefaBD(idTarefaAtual, { observacao: obs });
        btnSalvarObs.innerHTML = '<i class="fas fa-check text-green-500 mr-1"></i> Salvo com Sucesso!';
        setTimeout(() => {
            btnSalvarObs.innerHTML = '<i class="fas fa-save mr-1"></i> Salvar Observação';
            btnSalvarObs.disabled = false;
        }, 3000);
    } catch (error) {
        alert("Erro ao salvar observação.");
        btnSalvarObs.innerHTML = '<i class="fas fa-save mr-1"></i> Salvar Observação';
        btnSalvarObs.disabled = false;
    }
});

btnPausar.addEventListener('click', async () => {
    // Se está pausada, vamos retomar para Pendente/Andamento. Se não, vamos Pausar.
    const novoStatus = tarefaAtual.status === 'Pausada' ? 'Pendente' : 'Pausada';
    const acaoTexto = novoStatus === 'Pausada' ? 'pausar' : 'retomar';

    if(!confirm(`Deseja realmente ${acaoTexto} esta tarefa?`)) return;

    // Antes de pausar, salva a observação automaticamente caso ele tenha digitado algo
    const obs = inputObservacoes.value.trim();

    try {
        await atualizarTarefaBD(idTarefaAtual, { status: novoStatus, observacao: obs });
        alert(`Tarefa ${novoStatus === 'Pausada' ? 'Pausada' : 'Retomada'} com sucesso!`);
        location.reload(); // Recarrega a tela para atualizar os visuais
    } catch (error) {
        alert("Erro ao mudar o status da tarefa.");
    }
});

btnConcluir.addEventListener('click', async () => {
    if(!confirm("Tem certeza que a manutenção foi totalmente concluída?")) return;

    // Salva a observação final antes de concluir
    const obs = inputObservacoes.value.trim();

    try {
        // Primeiro atualizamos a observação, depois usamos a função padrão de concluir
        await atualizarTarefaBD(idTarefaAtual, { observacao: obs });
        await concluirTarefaBD(idTarefaAtual);
        
        // Esconde a tela e mostra a mensagem de sucesso
        exibirAviso('Excelente Trabalho!', 'A tarefa foi concluída e o Painel de Controle já foi atualizado.', 'fa-check-circle', 'text-green-500');
    } catch (error) {
        alert("Erro ao concluir a tarefa.");
    }
});

// Dá a partida!
inicializarTela();
