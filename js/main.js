// js/main.js
import { abrirWhatsApp } from './whatsapp.js';
import { obterTarefas, concluirTarefaBD, criarTarefaBD, obterConfiguracoesBD, salvarConfiguracoesBD, atualizarTarefaBD, reverterTarefaBD, uploadArquivoBD, excluirArquivoBD } from './firebase.js'; 

// --- CONFIGURAÇÕES DO SISTEMA (Agora são "let" pois virão do Firebase) ---
let configuracaoTarefas = [];
let configuracaoVoluntarios = [];

// Dados Padrão (Caso o Firebase esteja vazio no primeiro acesso)
const tarefasPadrao = [
    { nome: "Inspeção interna", sugerido: 2 },
    { nome: "Bebedouro", sugerido: 2 },
    { nome: "Louças e sanitários", sugerido: 2 }
];
const voluntariosPadrao = ["Ana Paula", "Zildilene", "Edinho", "Glebston"];
// ---------------------------------

let tarefasReal = [];
let idTarefaEditando = null; // Guarda o ID se estivermos editando

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
    idTarefaEditando = null;
    btnSalvar.innerText = "Salvar Tarefa";
    modal.querySelector('h2').innerHTML = '<i class="fas fa-plus-circle text-blue-600 mr-2"></i>Nova Manutenção';
    document.getElementById('dicaParticipantes').classList.add('hidden');
}

btnNova.addEventListener('click', () => {
    idTarefaEditando = null;
    popularFormularioModal();
    modal.classList.remove('hidden');
});

btnFechar.addEventListener('click', fecharModal);
btnCancelar.addEventListener('click', fecharModal);

form.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    const checkboxesMarcados = document.querySelectorAll('.checkbox-voluntario:checked');
    const equipe = Array.from(checkboxesMarcados).map(cb => cb.value);

    if(equipe.length === 0) {
        alert('Selecione pelo menos um voluntário!');
        return;
    }

    btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    btnSalvar.disabled = true;

    const tarefa = document.getElementById('selectTarefa').value;
    const observacao = document.getElementById('inputObs').value;

    // Se estiver editando, mantemos o prazo original. Se for nova, calculamos 15 dias.
    let prazo;
    if (idTarefaEditando) {
        const tarefaOriginal = tarefasReal.find(t => t.id === idTarefaEditando);
        prazo = tarefaOriginal.prazo;
    } else {
        const dataAtual = new Date();
        dataAtual.setDate(dataAtual.getDate() + 15);
        prazo = dataAtual.toLocaleDateString('pt-BR');
    }

    const dadosTarefa = {
        tarefa: tarefa,
        equipe: equipe,
        observacao: observacao,
        prazo: prazo
    };

    try {
        if (idTarefaEditando) {
            await atualizarTarefaBD(idTarefaEditando, dadosTarefa);
        } else {
            await criarTarefaBD({ ...dadosTarefa, status: 'Pendente' });
        }
        fecharModal();
        await carregarDadosDoBanco(); 
    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert('Erro ao salvar.');
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.innerText = "Salvar Tarefa";
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
                <div class="flex items-start gap-2">
                    <h2 class="font-bold text-lg leading-tight">${tarefa.tarefa}</h2>
                    <button class="btn-editar text-blue-400 hover:text-blue-600 transition p-1" data-id="${tarefa.id}">
                        <i class="fas fa-edit text-sm"></i>
                    </button>
                </div>
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
                </button>` : `
                <button class="btn-reverter flex-1 bg-orange-100 text-orange-700 py-2 rounded text-sm font-bold hover:bg-orange-200 transition" data-id="${tarefa.id}">
                    <i class="fas fa-undo mr-1"></i> Reverter
                </button>
                `}
                <button class="btn-avisar flex-1 border border-gray-300 text-gray-700 py-2 rounded text-sm font-bold hover:bg-gray-100 transition" data-id="${tarefa.id}">
                    <i class="fab fa-whatsapp text-green-500 mr-1"></i> Avisar
                </button>
                <button class="btn-agenda flex-1 border border-gray-300 text-gray-700 py-2 rounded text-sm font-bold hover:bg-gray-100 transition" data-id="${tarefa.id}">
                    <i class="far fa-calendar-plus text-blue-500 mr-1"></i> Agenda
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
            
            // Cria um link que funciona tanto no seu PC quanto no GitHub Pages
            let urlBase = window.location.href.split('#')[0].split('?')[0];
            if (urlBase.endsWith('index.html')) {
                urlBase = urlBase.replace('index.html', '');
            } else if (!urlBase.endsWith('/')) {
                urlBase += '/';
            }
            const linkTelaTarefa = `${urlBase}tarefa.html?id=${id}`;
            
            abrirWhatsApp(tarefa.tarefa, equipeArray, linkTelaTarefa);
        });
    });
    
    // Ação: EDITAR TAREFA
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const t = tarefasReal.find(item => item.id === id);
            
            idTarefaEditando = id;
            popularFormularioModal(); // Prepara os campos
            
            // Preenche o formulário com o que já existe
            document.getElementById('selectTarefa').value = t.tarefa;
            document.getElementById('inputObs').value = t.observacao;
            
            // Marca os voluntários que já estavam na equipe
            document.querySelectorAll('.checkbox-voluntario').forEach(cb => {
                cb.checked = t.equipe.includes(cb.value);
            });

            // Muda o visual do modal para "Editar"
            modal.querySelector('h2').innerHTML = '<i class="fas fa-edit text-blue-600 mr-2"></i>Editar Manutenção';
            btnSalvar.innerText = "Atualizar Tarefa";
            modal.classList.remove('hidden');
        });
    });

    // Ação: REVERTER PARA PENDENTE
    document.querySelectorAll('.btn-reverter').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if(!confirm("Deseja voltar esta tarefa para o status Pendente?")) return;
            const id = e.currentTarget.getAttribute('data-id');
            await reverterTarefaBD(id);
            await carregarDadosDoBanco();
        });
    });

    

    document.querySelectorAll('.btn-agenda').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const t = tarefasReal.find(item => item.id === id);
            
            // Formata data DD/MM/YYYY para YYYYMMDD para o Google
            const p = t.prazo.split('/');
            const dataFormatada = `${p[2]}${p[1]}${p[0]}`;
            
            const titulo = encodeURIComponent(`Manutenção: ${t.tarefa}`);
            const detalhes = encodeURIComponent(`Equipe: ${t.equipe}\nObs: ${t.observacao || 'Nenhuma'}`);
            
            const urlAgenda = `https://www.google.com/calendar/render?action=TEMPLATE&text=${titulo}&dates=${dataFormatada}/${dataFormatada}&details=${detalhes}&sf=true&output=xml`;
            
            window.open(urlAgenda, '_blank');
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
        
        // Remove espaços extras e converte o Plural do botão para o Singular do Banco de Dados
        let statusDesejado = btnClicado.innerText.trim();
        if (statusDesejado === "Pendentes") statusDesejado = "Pendente";
        if (statusDesejado === "Concluídas") statusDesejado = "Concluída";
        
        renderizarTarefas(statusDesejado);
    });
});
// --- LÓGICA DO MODAL DE CONFIGURAÇÕES ---
const modalConfig = document.getElementById('modalConfig');
const btnAbrirConfig = document.getElementById('btnAbrirConfig');
const btnFecharConfig = document.getElementById('btnFecharConfig');

function renderizarListasConfig() {
    const listaVol = document.getElementById('listaConfigVoluntarios');
    listaVol.innerHTML = '';
    configuracaoVoluntarios.forEach((vol, index) => {
        listaVol.innerHTML += `
            <div class="flex justify-between items-center bg-white p-2 rounded border border-gray-200">
                <span class="text-sm font-semibold text-gray-700">${vol}</span>
                <button onclick="removerVoluntario(${index})" class="text-red-500 hover:text-red-700"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
    });

    const listaTar = document.getElementById('listaConfigTarefas');
    listaTar.innerHTML = '';
    configuracaoTarefas.forEach((tar, index) => {
        
        // Verifica se a tarefa já tem um link salvo
        const painelPdf = tar.urlArquivo 
            ? `<a href="${tar.urlArquivo}" target="_blank" class="text-blue-500 hover:text-blue-700 text-xs font-bold hover:underline mr-4"><i class="fas fa-link"></i> Abrir Orientação</a>
               <button onclick="removerPdfTarefa(${index})" class="text-orange-500 hover:text-orange-700 text-xs font-bold"><i class="fas fa-times"></i> Remover Link</button>`
            : `<button onclick="anexarPdfTarefa(${index})" class="text-green-600 hover:text-green-800 text-xs font-bold"><i class="fas fa-link"></i> Colar Link do Google Drive</button>`;

        listaTar.innerHTML += `
            <div class="flex flex-col bg-white p-2 rounded border border-gray-200">
                <div class="flex justify-between items-center">
                    <span class="text-sm font-semibold text-gray-700">${tar.nome} <span class="text-xs font-normal text-gray-500">(${tar.sugerido} pessoas)</span></span>
                    <button onclick="removerTarefa(${index})" class="text-red-500 hover:text-red-700"><i class="fas fa-trash-alt"></i></button>
                </div>
                <div class="mt-2 pt-2 border-t border-gray-100 flex items-center justify-start bg-gray-50 p-1 rounded">
                    ${painelPdf}
                </div>
            </div>
        `;
    });
}

// Funções globais para lidar com o Link do Drive
window.anexarPdfTarefa = (index) => {
    const url = prompt("Por favor, cole aqui o link de compartilhamento do Google Drive onde está o PDF:");
    
    // Se o usuário colou algo e clicou em OK
    if (url && url.trim() !== '') {
        configuracaoTarefas[index].urlArquivo = url.trim();
        renderizarListasConfig(); // Atualiza a tela imediatamente
    }
};

window.removerPdfTarefa = (index) => {
    if(!confirm("Tem certeza que deseja remover o link de orientação desta tarefa?")) return;
    delete configuracaoTarefas[index].urlArquivo;
    renderizarListasConfig();
};

// Funções globais (precisam estar no window para funcionar no onclick do HTML gerado)
window.removerVoluntario = (index) => {
    configuracaoVoluntarios.splice(index, 1);
    renderizarListasConfig();
};
window.removerTarefa = (index) => {
    configuracaoTarefas.splice(index, 1);
    renderizarListasConfig();
};

document.getElementById('btnAddVoluntario').addEventListener('click', () => {
    const input = document.getElementById('novoVoluntario');
    if(input.value.trim() !== '') {
        configuracaoVoluntarios.push(input.value.trim());
        input.value = '';
        renderizarListasConfig();
    }
});

document.getElementById('btnAddTarefa').addEventListener('click', () => {
    const inputNome = document.getElementById('novaTarefaNome');
    const inputQtd = document.getElementById('novaTarefaQtd');
    const inputMeses = document.getElementById('novaTarefaMeses');
    if(inputNome.value.trim() !== '') {
        configuracaoTarefas.push({ 
            nome: inputNome.value.trim(), 
            sugerido: inputQtd.value,
            recorrencia: inputMeses.value 
        });
        inputNome.value = '';
        inputQtd.value = '2';
        renderizarListasConfig();
    }
});

btnAbrirConfig.addEventListener('click', () => {
    renderizarListasConfig();
    modalConfig.classList.remove('hidden');
});

btnFecharConfig.addEventListener('click', () => modalConfig.classList.add('hidden'));

document.getElementById('btnSalvarConfiguracoes').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Salvando...';
    try {
        await salvarConfiguracoesBD({ tarefas: configuracaoTarefas, voluntarios: configuracaoVoluntarios });
        modalConfig.classList.add('hidden');
        alert("Configurações atualizadas com sucesso!");
    } catch (error) {
        alert("Erro ao salvar configurações.");
        console.error(error);
    } finally {
        btn.innerHTML = '<i class="fas fa-save mr-2"></i> Salvar Alterações';
    }
});

// --- INICIALIZAÇÃO DO SISTEMA ---
async function iniciarApp() {
    containerLista.innerHTML = '<p class="text-center text-gray-500 mt-6"><i class="fas fa-spinner fa-spin text-2xl mb-2"></i><br>Conectando ao sistema...</p>';
    
    // 1. Puxa as configurações primeiro
    const configsDB = await obterConfiguracoesBD();
    if (configsDB) {
        configuracaoTarefas = configsDB.tarefas || tarefasPadrao;
        configuracaoVoluntarios = configsDB.voluntarios || voluntariosPadrao;
    } else {
        configuracaoTarefas = tarefasPadrao;
        configuracaoVoluntarios = voluntariosPadrao;
    }

    // 2. Depois puxa as tarefas
    await carregarDadosDoBanco();
}

iniciarApp();

// --- LÓGICA DO DASHBOARD E NAVEGAÇÃO ---

const btnTabTarefas = document.getElementById('tabTarefas');
const btnTabDashboard = document.getElementById('tabDashboard');
const viewLista = document.getElementById('viewLista');
const viewDashboard = document.getElementById('viewDashboard');

// Alternar entre Abas
btnTabTarefas.addEventListener('click', () => {
    btnTabTarefas.className = "pb-2 px-4 border-b-2 border-blue-600 font-bold text-blue-600";
    btnTabDashboard.className = "pb-2 px-4 border-b-2 border-transparent text-gray-500 hover:text-blue-600";
    viewLista.classList.remove('hidden');
    viewDashboard.classList.add('hidden');
});

btnTabDashboard.addEventListener('click', () => {
    btnTabDashboard.className = "pb-2 px-4 border-b-2 border-blue-600 font-bold text-blue-600";
    btnTabTarefas.className = "pb-2 px-4 border-b-2 border-transparent text-gray-500 hover:text-blue-600";
    viewLista.classList.add('hidden');
    viewDashboard.classList.remove('hidden');
    renderizarDashboard();
});

function renderizarDashboard() {
    const corpoTabela = document.getElementById('corpoTabelaDashboard');
    const containerPendencias = document.getElementById('listaPendenciasDashboard');
    
    // Trava de segurança: Se os elementos não existirem no HTML, pára aqui para não dar erro
    if (!corpoTabela || !containerPendencias) return;

    corpoTabela.innerHTML = '';
    containerPendencias.innerHTML = '';

    // Ordenar tarefas: Pendentes/Andamento primeiro, depois Concluídas
    const tarefasOrdenadas = [...tarefasReal].sort((a, b) => {
        if (a.status === 'Concluída' && b.status !== 'Concluída') return 1;
        if (a.status !== 'Concluída' && b.status === 'Concluída') return -1;
        return 0;
    });

    tarefasOrdenadas.forEach(t => {
        // --- 1. POPULAR TABELA GERAL ---
        const row = document.createElement('tr');
        row.className = "hover:bg-gray-50 border-b last:border-0";
        
        const dataDesig = t.dataDesignacao || '---';
        const dataConcl = t.status === 'Concluída' ? (t.dataConclusao || '---') : '<span class="text-blue-500 italic">Em curso</span>';
        
        const badgesStatus = {
            'Pendente': 'bg-yellow-100 text-yellow-800',
            'Andamento': 'bg-blue-100 text-blue-800',
            'Pausada': 'bg-gray-100 text-gray-600',
            'Concluída': 'bg-green-100 text-green-800'
        };

        row.innerHTML = `
            <td class="px-4 py-3">
                <div class="font-bold text-gray-900 leading-tight">${t.tarefa}</div>
                <div class="text-[10px] text-gray-500 mt-1"><i class="fas fa-users mr-1"></i>${Array.isArray(t.equipe) ? t.equipe.join(", ") : t.equipe}</div>
            </td>
            <td class="px-4 py-3 text-[10px]">
                <div class="text-gray-400">Designada: ${dataDesig}</div>
                <div class="font-medium text-gray-700">Concluída: ${dataConcl}</div>
            </td>
            <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase shadow-sm ${badgesStatus[t.status] || 'bg-gray-100'}">${t.status}</span>
            </td>
            <td class="px-4 py-3 text-[11px] text-gray-600 italic">
                ${t.observacao ? t.observacao : '<span class="text-gray-300">Nenhuma</span>'}
            </td>
        `;
        corpoTabela.appendChild(row);

        // --- 2. POPULAR PENDÊNCIAS DAS OBSERVAÇÕES ---
        // Só aparece aqui se houver observação E a tarefa NÃO estiver concluída
        if (t.observacao && t.status !== 'Concluída') {
            const pendencia = document.createElement('div');
            pendencia.className = "flex flex-col bg-white p-3 rounded-lg border border-red-200 shadow-sm";
            pendencia.innerHTML = `
                <div class="flex justify-between items-center mb-1">
                    <span class="text-[10px] font-bold text-red-600 uppercase"><i class="fas fa-tools mr-1"></i> Pendência em: ${t.tarefa}</span>
                    <span class="text-[9px] text-gray-400 italic">${t.prazo}</span>
                </div>
                <p class="text-sm text-gray-800 italic leading-snug">"${t.observacao}"</p>
                <div class="mt-2 text-[10px] text-gray-500 font-semibold border-t pt-1">Responsáveis: ${Array.isArray(t.equipe) ? t.equipe.join(", ") : t.equipe}</div>
            `;
            containerPendencias.appendChild(pendencia);
        }
    });

    if (containerPendencias.innerHTML === '') {
        containerPendencias.innerHTML = `
            <div class="text-center py-4 bg-white rounded-lg border border-dashed border-gray-300">
                <i class="fas fa-check-circle text-green-400 text-xl mb-1"></i>
                <p class="text-gray-400 text-xs italic">Não há observações pendentes de atenção.</p>
            </div>`;
    }
}
