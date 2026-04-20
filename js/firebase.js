// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, getDocs, updateDoc, doc, addDoc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
export const db = getFirestore(app); // Exportamos o db caso seja necessário em outro lugar

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
