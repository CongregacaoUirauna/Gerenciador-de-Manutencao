// js/main.js
import { abrirWhatsApp } from './whatsapp.js';

// Dados simulados baseados na sua planilha (Substituiremos pelo Firebase depois)
const tarefasMock = [
    {
        id: 1,
        tarefa: "Inspeção interna",
        equipe: ["Ana Paula", "Zildilene"],
        prazo: "23/08/2025",
        status: "Pendente",
        observacao: "Encontramos rachaduras ao lado das janelas..."
    },
    {
        id: 2,
        tarefa: "Louças metais e sanitários",
        equipe: ["Suelene", "Giudeth"],
        prazo: "23/08/2025",
        status: "Pendente",
        observacao: "Trocar conjunto da caixa de descarga"
    },
    {
        id: 3,
        tarefa: "Bebedouro",
        equipe: ["Elton", "Glebston"],
        prazo: "16/07/2025",
        status: "Concluída",
        observacao: ""
    }
];

// Elementos da Tela
const containerLista = document.getElementById('listaTarefas');
const botoesFiltro = document.querySelectorAll('.flex.gap-2.mb-6 button');

// Função para desenhar as tarefas na tela
function renderizarTarefas(filtro = "Todas") {
    containerLista.innerHTML = ''; // Limpa a lista atual

    const tarefasFiltradas = tarefasMock.filter(t => filtro === "Todas" || t.status === filtro);

    if (tarefasFiltradas.length === 0) {
        containerLista.innerHTML = '<p class="text-center text-gray-500 mt-6">Nenhuma tarefa encontrada.</p>';
        return;
    }

    tarefasFiltradas.forEach(tarefa => {
        // Define as cores com base no status
        const isPendente = tarefa.status === "Pendente";
        const corBorda = isPendente ? "border-yellow-400" : "border-green-400";
        const corStatus = isPendente ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800";
        const iconeStatus = isPendente ? "fa-clock" : "fa-check-circle";

        // Cria o Card da Tarefa
        const card = document.createElement('div');
        card.className = `bg-white p-4 rounded-lg shadow border-l-4 ${corBorda}`;
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <h2 class="font-bold text-lg leading-tight">${tarefa.tarefa}</h2>
                <span class="${corStatus} text-xs px-2 py-1 rounded font-bold whitespace-nowrap ml-2">
                    <i class="fas ${iconeStatus} mr-1"></i>${tarefa.status}
                </span>
            </div>
            <p class="text-sm text-gray-700 mb-1">
                <i class="fas fa-users w-5 text-center text-blue-500"></i> ${tarefa.equipe.join(", ")}
            </p>
            <p class="text-sm text-gray-700 mb-3">
                <i class="far fa-calendar-alt w-5 text-center text-blue-500"></i> Prazo: ${tarefa.prazo}
            </p>
            ${tarefa.observacao ? `<p class="text-xs text-gray-500 italic bg-gray-50 p-2 rounded mb-3">"${tarefa.observacao}"</p>` : ''}
            
            <div class="flex gap-2 mt-4 border-t pt-3">
                ${isPendente ? `
                <button class="btn-concluir flex-1 bg-green-500 text-white py-2 rounded text-sm font-bold hover:bg-green-600 transition" data-id="${tarefa.id}">
                    <i class="fas fa-check mr-1"></i> Concluir
                </button>` : ''}
                <button class="btn-avisar flex-1 border border-gray-300 text-gray-700 py-2 rounded text-sm font-bold hover:bg-gray-100 transition" data-id="${tarefa.id}">
                    <i class="fab fa-whatsapp text-green-500 mr-1 text-lg"></i> Avisar
                </button>
            </div>
        `;
        containerLista.appendChild(card);
    });

    // Adiciona os eventos de clique aos botões recém-criados
    configurarBotoesAcao();
}

// Função para configurar os cliques de "Concluir" e "Avisar"
function configurarBotoesAcao() {
    document.querySelectorAll('.btn-avisar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const tarefa = tarefasMock.find(t => t.id == id);
            abrirWhatsApp(tarefa.tarefa, tarefa.equipe);
        });
    });

    document.querySelectorAll('.btn-concluir').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            // Aqui futuramente chamaremos o Firebase para atualizar
            alert('Futuramente isto vai mudar o status no banco de dados para Concluída!'); 
        });
    });
}

// Lógica dos filtros (Todas, Pendentes, Concluídas) no topo da tela
botoesFiltro.forEach(botao => {
    botao.addEventListener('click', (e) => {
        // Remove a cor ativa de todos os botões
        botoesFiltro.forEach(b => {
            b.classList.remove('bg-blue-100', 'text-blue-800');
            b.classList.add('bg-white', 'text-gray-600');
        });

        // Adiciona a cor ativa ao botão clicado
        const btnClicado = e.currentTarget;
        btnClicado.classList.remove('bg-white', 'text-gray-600');
        btnClicado.classList.add('bg-blue-100', 'text-blue-800');

        // Renderiza as tarefas com base no texto do botão
        renderizarTarefas(btnClicado.innerText);
    });
});

// Inicialização
renderizarTarefas();
