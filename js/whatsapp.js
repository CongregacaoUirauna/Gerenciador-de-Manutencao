// js/whatsapp.js

export function abrirWhatsApp(tarefa, equipe, linkArquivo) {
    const nomesFormatados = equipe.join(", ");
    
    let mensagem = `Olá, você foi designado(a), com alguns irmãos para apoiar nossa manutenção do Salão do Reino e seu apoio leal é muito apreciado por todos nós e Jeová.\n\n*A tarefa designada é:* ${tarefa}\n*Os designados são:* ${nomesFormatados}\n\nPor favor, entre em contato com os outros designados e combinem o melhor dia para realizar a tarefa.\n\n*IMPORTANTE: Vocês têm 15 dias para finalizar a tarefa.*`;

    // Se tiver um PDF cadastrado, adiciona o link no final
    if (linkArquivo) {
        mensagem += `\n\n📄 *Orientações da Tarefa:*\nClique no link seguro abaixo para ler o PDF com as instruções passo a passo:\n${linkArquivo}`;
    }

    const textoCodificado = encodeURIComponent(mensagem);
    const url = `https://wa.me/?text=${textoCodificado}`;
    
    window.open(url, '_blank');
}
