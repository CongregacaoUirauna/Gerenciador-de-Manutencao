// js/main.js
import { abrirWhatsApp } from './whatsapp.js';
import { obterTarefas, concluirTarefaBD, criarTarefaBD } from './firebase.js'; 

// --- CONFIGURAÇÕES DO SISTEMA ---
const configuracaoTarefas = [
    { nome: "Inspeção interna", sugerido: 2 },
    { nome: "Inspeção externa", sugerido: 2 },
    { nome: "Bebedouro", sugerido: 2 },
    { nome: "Controle de pragas", sugerido: 2 },
    { nome: "Alarmes", sugerido: 2 },
    { nome: "Fossas e sumidouros", sugerido: 3 },
    { nome: "Louças e sanitários", sugerido: 2 },
    { nome: "Equipamentos", sugerido: 2 }
];

const configuracaoVoluntarios = [
    "Ana Paula", "Zildilene", "Edinho", "Glebston", "Suelene", 
    "Giudeth", "Elton", "Francisco Nunes", "Rony", "Sabrina"
];
// ---------------------------------

let tarefasReal = [];

// Elementos Principais
const containerLista = document.getElementById('listaTarefas');
const botoesFiltro = document.querySelectorAll('.flex.gap-2.mb-6 button');

// Elementos do Modal
const modal = document.getElementById('modalNovaTarefa');
const btnNova = document.getElementById('btnNovaTarefa');
const btnFechar = document.getElementById('btnFecharModal');
const btnCancelar = document.getElementById('btnCancelarModal');
const form = document.getElementById('formNovaTarefa');
const btnSalvar = document.getElementById('btnSalvarModal');

// --- LÓGICA DO MODAL ---

// 1. Função que lê as tarefas ativas e diz como está a carga dos irmãos
function calcularCargaTrabalho() {
    const carga = {};
    configuracaoVoluntarios.forEach(v => carga[v] = 0); // Todo mundo começa zerado
    
    // Varre as tarefas que vieram do Firebase
    tarefasReal.forEach(t => {
        if(t.status === 'Pendente') {
            const equipeArray = Array.isArray(t.equipe) ? t.equipe : t.equipe.split(',');
            equipeArray.forEach(nome => {
                const nomeLimpo = nome.trim();
                if(carga[nomeLimpo] !== undefined) carga[nomeLimpo]++;
            });
        }
    });
    return carga;
}

// 2. Prepara o formulário antes de abrir
function popularFormularioModal() {
    // A. Preencher o select de Tarefas
    const select = document.getElementById('selectTarefa');
    select.innerHTML = '<option value="">Selecione uma tarefa...</option>';
    configuracaoTarefas.forEach(t => {
        select.innerHTML += `<option value="${t.nome}" data-qtd="${t.sugerido}">${t.nome}</option>`;
    });

    // Evento para mostrar a dica de quantos participantes precisa
    select.addEventListener('change', (e) => {
        const option = e.target.options[e.target.selectedIndex];
        const dica = document.getElementById('dicaParticipantes');
        if(option.value) {
            const qtd = option.getAttribute('data-qtd');
            dica.innerHTML = `<i class="fas fa-info-circle"></i> O ideal para esta tarefa são ${qtd} participantes.`;
            dica.classList.remove('hidden');
        } else {
            dica.classList.add('hidden');
        }
    });

    // B. Preencher os voluntários com inteligência
    const carga = calcularCargaTrabalho();
    const container = document.getElementById('containerVoluntarios');
    container.innerHTML = '';
    
    // Inteligência: Ordena a lista colocando quem tem MENOS tarefas no topo
    const voluntariosOrdenados = [...configuracaoVoluntarios].sort((a, b) => carga[a] - carga[b]);

    voluntariosOrdenados.forEach(voluntario => {
        const qtdTarefas = carga[voluntario];
        
        // Regra de Cores para as "Etiquetas"
        let corBadge = "bg-green-100 text-green-800"; // Livre
        let textoBadge = "Livre";
        
        if (qtdTarefas === 1) {
            corBadge = "bg-yellow-100 text-yellow-800";
            textoBadge = "1 tarefa pendente";
        } else if (qtdTarefas > 1) {
            corBadge = "bg-red-100 text-red-800"; // Sobrecarrregado
            textoBadge = `${qtdTarefas} tarefas pendentes`;
        }

        container.innerHTML += `
            <label class="flex items-center justify-between p-2 hover:bg-gray-200 rounded cursor-pointer border-b border-gray-200 last:border-0 transition">
                <div class="flex items-center gap-3">
                    <input type="checkbox" value="${voluntario}" class="checkbox-voluntario w-4 h-4 text-blue-600 rounded cursor-pointer">
                    <span class="text-sm font-medium text-gray-700">${voluntario}</span>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded font-bold whitespace-nowrap ${corBadge}">${textoBadge}</span>
            </label>
        `;
    });
}

function fecharModal() {
    modal.classList.add('hidden');
    form.reset(); 
    document.getElementById('dicaParticipantes').classList.add('hidden'); // Esconde a dica
}

// Abre o modal e já popula com dados fresquinhos
btnNova.addEventListener('click', () => {
    popularFormularioModal();
    modal.classList.remove('hidden');
});

btnFechar.addEventListener('click', fecharModal);
btnCancelar.addEventListener('click', fecharModal);

form.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    // Captura os checkboxes marcados (a nova equipe)
    const checkboxesMarcados = document.querySelectorAll('.checkbox-voluntario:checked');
    const equipe = Array.from(checkboxesMarcados).map(cb => cb.value);

    // Trava de segurança
    if(equipe.length === 0) {
        alert('Selecione pelo menos um voluntário para a equipe!');
        return;
    }

    btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    btnSalvar.disabled = true;

    const tarefa = document.getElementById('selectTarefa').value;
    const observacao = document.getElementById('inputObs').value;

    const dataAtual = new Date();
    dataAtual.setDate(dataAtual.getDate() + 15);
    const prazo = dataAtual.toLocaleDateString('pt-BR'); 

    const novaTarefa = {
        tarefa: tarefa,
        equipe: equipe,
        observacao: observacao,
        status: 'Pendente',
        prazo: prazo
    };

    try {
        await criarTarefaBD(novaTarefa); 
        fecharModal();
        await carregarDadosDoBanco(); 
    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert('Erro ao salvar tarefa. Verifique o console.');
    } finally {
        btnSalvar.innerHTML = 'Salvar Tarefa';
        btnSalvar.disabled = false;
    }
});

// Quando clicar em Salvar no Formulário
form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Evita recarregar a página
    
    btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    btnSalvar.disabled = true;

    // Pega os dados digitados
    const tarefa = document.getElementById('inputTarefa').value;
    const equipeInput = document.getElementById('inputEquipe').value;
    const observacao = document.getElementById('inputObs').value;

    // Limpa os nomes e cria um array (ex: "Ana, Joao" vira ["Ana", "Joao"])
    const equipe = equipeInput.split(',').map(nome => nome.trim());

    // Regra de Negócio: Calcula 15 dias para frente
    const dataAtual = new Date();
    dataAtual.setDate(dataAtual.getDate() + 15);
    const prazo = dataAtual.toLocaleDateString('pt-BR'); // Formata para DD/MM/YYYY

    // Monta o objeto para o Firebase
    const novaTarefa = {
        tarefa: tarefa,
        equipe: equipe,
        observacao: observacao,
        status: 'Pendente',
        prazo: prazo
    };

    try {
        await criarTarefaBD(novaTarefa); // Manda pro banco
        fecharModal();
        await carregarDadosDoBanco(); // Recarrega a tela com a tarefa nova!
    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert('Erro ao salvar tarefa. Verifique o console.');
    } finally {
        btnSalvar.innerHTML = 'Salvar Tarefa';
        btnSalvar.disabled = false;
    }
});

// --- LÓGICA DA TELA PRINCIPAL ---
async function carregarDadosDoBanco() {
    containerLista.innerHTML = '<p class="text-center text-gray-500 mt-6"><i class="fas fa-spinner fa-spin text-2xl mb-2"></i><br>Carregando tarefas...</p>';
    
    try {
        tarefasReal = await obterTarefas();
        renderizarTarefas(); 
    } catch (error) {
        console.error("Erro ao buscar dados:", error);
        containerLista.innerHTML = '<p class="text-center text-red-500 mt-6">Erro ao conectar com o banco de dados.</p>';
    }
}

function renderizarTarefas(filtro = "Todas") {
    containerLista.innerHTML = ''; 

    const tarefasFiltradas = tarefasReal.filter(t => filtro === "Todas" || t.status === filtro);

    if (tarefasFiltradas.length === 0) {
        containerLista.innerHTML = '<p class="text-center text-gray-500 mt-6">Nenhuma tarefa encontrada.</p>';
        return;
    }

    tarefasFiltradas.forEach(tarefa => {
        const isPendente = tarefa.status === "Pendente";
        const corBorda = isPendente ? "border-yellow-400" : "border-green-400";
        const corStatus = isPendente ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800";
        const iconeStatus = isPendente ? "fa-clock" : "fa-check-circle";

        const equipeTexto = Array.isArray(tarefa.equipe) ? tarefa.equipe.join(", ") : tarefa.equipe;

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
                <i class="fas fa-users w-5 text-center text-blue-500"></i> ${equipeTexto}
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

    configurarBotoesAcao();
}

function configurarBotoesAcao() {
    document.querySelectorAll('.btn-avisar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const tarefa = tarefasReal.find(t => t.id === id);
            const equipeArray = Array.isArray(tarefa.equipe) ? tarefa.equipe : tarefa.equipe.split(',');
            abrirWhatsApp(tarefa.tarefa, equipeArray);
        });
    });

    document.querySelectorAll('.btn-concluir').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if(!confirm("Deseja realmente marcar esta tarefa como concluída?")) return;

            const btnClicado = e.currentTarget;
            const id = btnClicado.getAttribute('data-id');
            
            btnClicado.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btnClicado.disabled = true;

            try {
                await concluirTarefaBD(id); 
                await carregarDadosDoBanco(); 
            } catch (error) {
                alert("Erro ao concluir tarefa.");
                console.error(error);
                btnClicado.disabled = false;
            }
        });
    });
}

botoesFiltro.forEach(botao => {
    botao.addEventListener('click', (e) => {
        botoesFiltro.forEach(b => {
            b.classList.remove('bg-blue-100', 'text-blue-800');
            b.classList.add('bg-white', 'text-gray-600');
        });
        const btnClicado = e.currentTarget;
        btnClicado.classList.remove('bg-white', 'text-gray-600');
        btnClicado.classList.add('bg-blue-100', 'text-blue-800');
        renderizarTarefas(btnClicado.innerText);
    });
});

// Inicializa buscando do banco!
carregarDadosDoBanco();
