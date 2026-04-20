// js/whatsapp.js

/**
 * Gera o link do WhatsApp com a mensagem padrão de designação.
 * @param {string} tarefa - Nome da tarefa.
 * @param {Array} equipe - Lista de nomes dos designados.
 */
export function abrirWhatsApp(tarefa, equipe) {
    const nomesFormatados = equipe.join(", ");
    
    // Mensagem baseada na sua planilha
    const mensagem = `Olá, você foi designado(a), com alguns irmãos para apoiar nossa manutenção do Salão do Reino e seu apoio leal é muito apreciado por todos nós e Jeová.\n\n*A tarefa designada é:* ${tarefa}\n*Os designados são:* ${nomesFormatados}\n\nPor favor, entre em contato com os outros designados e combinem o melhor dia para realizar a tarefa.\n\n*IMPORTANTE: Vocês têm 15 dias para finalizar a tarefa. As orientações de como realizar a tarefa seguem em anexo.*`;

    // Codifica a mensagem para o formato de URL
    const textoCodificado = encodeURIComponent(mensagem);
    
    // Cria o link universal do WhatsApp (funciona no celular e no PC)
    const url = `https://wa.me/?text=${textoCodificado}`;
    
    // Abre em uma nova aba
    window.open(url, '_blank');
}
