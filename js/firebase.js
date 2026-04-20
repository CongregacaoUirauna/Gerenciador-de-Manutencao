// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, getDocs, updateDoc, doc, addDoc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

// Suas chaves de configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBAPrbZDTr-tBYpNG86XnKPAVt732p1sys",
  authDomain: "gerenciador-de-manutenca-26a88.firebaseapp.com",
  projectId: "gerenciador-de-manutenca-26a88",
  storageBucket: "gerenciador-de-manutenca-26a88.firebasestorage.app",
  messagingSenderId: "903043141742",
  appId: "1:903043141742:web:51e35832d415f063e9167f"
};

// Inicializando o Firebase e o banco de dados (Firestore)
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); 
export const storage = getStorage(app); // Inicializa o disco virtual de arquivos

// Função para buscar todas as tarefas
export async function obterTarefas() {
    const tarefasCol = collection(db, 'tarefas');
    const tarefaSnapshot = await getDocs(tarefasCol);
    return tarefaSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

// Função para mudar o status de uma tarefa para "Concluída"
export async function concluirTarefaBD(id) {
    const tarefaRef = doc(db, 'tarefas', id);
    
    // 1. Busca os dados da tarefa atual
    const snap = await getDoc(tarefaRef);
    const dados = snap.data();

    // 2. Marca a atual como concluída
    await updateDoc(tarefaRef, { status: 'Concluída' });

    // 3. Lógica de Recorrência: Se tiver meses configurados, cria a próxima!
    if (dados.recorrencia && parseInt(dados.recorrencia) > 0) {
        const meses = parseInt(dados.recorrencia);
        
        // Calcula a nova data (Data do prazo atual + X meses)
        const partesData = dados.prazo.split('/');
        const novaDataObj = new Date(partesData[2], partesData[1] - 1, partesData[0]);
        novaDataObj.setMonth(novaDataObj.getMonth() + meses);
        
        const novoPrazo = novaDataObj.toLocaleDateString('pt-BR');

        // Cria a cópia para o futuro
        await addDoc(collection(db, 'tarefas'), {
            ...dados,
            status: 'Pendente',
            prazo: novoPrazo
        });
    }
}

// Função para adicionar uma nova tarefa
export async function criarTarefaBD(dadosTarefa) {
    const tarefasCol = collection(db, 'tarefas');
    await addDoc(tarefasCol, dadosTarefa);
}

// --- NOVAS FUNÇÕES: CONFIGURAÇÕES GERAIS ---
export async function obterConfiguracoesBD() {
    const docRef = doc(db, 'configuracoes', 'geral');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data();
    } else {
        return null; // Se for o primeiro uso, retorna nulo
    }
}

export async function salvarConfiguracoesBD(configuracoes) {
    const docRef = doc(db, 'configuracoes', 'geral');
    await setDoc(docRef, configuracoes);
}

// --- NOVA FUNÇÃO: ATUALIZAR TAREFA EXISTENTE ---
export async function atualizarTarefaBD(id, novosDados) {
    const docRef = doc(db, 'tarefas', id);
    await updateDoc(docRef, novosDados);
}

export async function reverterTarefaBD(id) {
    const docRef = doc(db, 'tarefas', id);
    await updateDoc(docRef, { status: 'Pendente' });
}

// --- NOVAS FUNÇÕES: GESTÃO DE PDFs ---
export async function uploadArquivoBD(file, nomeTarefa) {
    // Limpa o nome da tarefa para não ter espaços ou acentos no link
    const nomeLimpo = nomeTarefa.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, '_');
    const arquivoRef = ref(storage, `manutencao_pdfs/${nomeLimpo}_${Date.now()}.pdf`);
    
    await uploadBytes(arquivoRef, file);
    return await getDownloadURL(arquivoRef); // Retorna o Link do PDF
}

export async function excluirArquivoBD(url) {
    try {
        const arquivoRef = ref(storage, url);
        await deleteObject(arquivoRef);
    } catch(e) {
        console.error("Arquivo já removido ou não encontrado.", e);
    }
}
