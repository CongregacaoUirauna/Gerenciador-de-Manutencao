// js/whatsapp.js

export function abrirWhatsApp(tarefa, equipe, linkArquivo) {
    const nomesFormatados = equipe.join(", ");
    
    let mensagem = `Olá, você foi designado(a), com alguns irmãos para apoiar nossa manutenção do Salão do Reino e seu apoio leal é muito apreciado por todos nós e Jeová.\n\n*A tarefa designada é:* ${tarefa}\n*Os designados são:* ${nomesFormatados}\n\nPor favor, entre em contato com os outros designados e combinem o melhor dia para realizar a tarefa.\n\n*IMPORTANTE: Vocês têm 15 dias para finalizar a tarefa.*`;

    // Se tiver um link gerado (agora é o link da tela do voluntário), adiciona na mensagem
    if (linkArquivo) {
        mensagem += `\n\n📱 *Painel da Manutenção:*\nClique no link seguro abaixo para abrir o seu painel exclusivo. Lá você poderá ver as instruções da tarefa, adicionar observações e marcar como concluída quando terminarem:\n${linkArquivo}`;
    }

    const textoCodificado = encodeURIComponent(mensagem);
    const url = `https://wa.me/?text=${textoCodificado}`;
    
    window.open(url, '_blank');
}
