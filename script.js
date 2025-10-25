// ==================== FUNÇÕES DE UTILIDADE E CONFIGURAÇÃO ====================
const LOCAL_STORAGE_KEY = 'document_generator_data';

// Gera a string de data e hora atual
function formatarDataHoraAtual() {
    const now = new Date();
    const data = now.toLocaleDateString('pt-BR');
    const hora = now.toLocaleTimeString('pt-BR');
    return `${data} às ${hora}`;
}

// Carrega os documentos do LocalStorage
function getDocuments() {
    const docs = localStorage.getItem(LOCAL_STORAGE_KEY);
    return docs ? JSON.parse(docs) : [];
}

// Salva o array de documentos no LocalStorage
function saveDocuments(documents) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(documents));
}

// Inicializa ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('data-hora-atual').value = formatarDataHoraAtual();
    renderDocumentList();
});

// ==================== FUNÇÕES CRUD (CREATE, READ, UPDATE, DELETE) ====================

// CREATE e UPDATE (Salvar Documento)
document.getElementById('document-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const form = e.target;
    const documentId = form.dataset.editingId; // Verifica se estamos editando
    
    // Coleta e calcula os dados
    const quantidade = parseFloat(document.getElementById('quantidade').value);
    const preco = parseFloat(document.getElementById('preco').value);
    
    const newDocument = {
        id: documentId ? documentId : Date.now().toString(),
        tipo: document.getElementById('tipo-documento').value,
        dataHoraAtual: document.getElementById('data-hora-atual').value,
        logo: document.getElementById('logo').value,
        nomePrestador: document.getElementById('nome-prestador').value,
        nomeEmpresa: document.getElementById('nome-empresa').value,
        cnpj: document.getElementById('cnpj').value,
        dataServico: document.getElementById('data-servico').value,
        produto: document.getElementById('produto').value,
        quantidade: quantidade,
        preco: preco,
        formaPagamento: document.getElementById('forma-pagamento').value,
        prazoPagamento: document.getElementById('prazo-pagamento').value,
        total: (quantidade * preco).toFixed(2)
    };

    let documents = getDocuments();

    if (documentId) {
        // UPDATE: Encontra e substitui o documento
        documents = documents.map(doc => doc.id === documentId ? newDocument : doc);
        alert('Documento atualizado com sucesso!');
        form.removeAttribute('data-editing-id');
        document.getElementById('save-btn').textContent = 'Salvar Documento (C/U)';
    } else {
        // CREATE: Adiciona novo documento
        documents.push(newDocument);
        alert('Documento salvo com sucesso!');
    }
    
    saveDocuments(documents);
    renderDocumentList();
    form.reset(); // Limpa o formulário após salvar
    document.getElementById('data-hora-atual').value = formatarDataHoraAtual(); // Regenera a data atual
});

// READ (Renderizar a Lista de Documentos)
function renderDocumentList() {
    const list = document.getElementById('document-list');
    list.innerHTML = '';
    const documents = getDocuments();

    if (documents.length === 0) {
        list.innerHTML = '<li>Nenhum documento salvo.</li>';
        return;
    }

    documents.forEach(doc => {
        const li = document.createElement('li');
        
        // Mapeamento de tipo para título
        const docTitleMap = {
            'NOTA_SERVICO': 'NS',
            'REQUISICAO_COMPRA': 'RC',
            'ORDEM_SERVICO': 'OS',
            'NOTA_ENTREGA': 'NE'
        };
        const title = docTitleMap[doc.tipo] || 'DOC';

        li.innerHTML = `
            <div class="info">
                <strong>${title} #${doc.id.substring(8)}</strong> - ${doc.nomeEmpresa} - R$ ${doc.total}
            </div>
            <div class="actions">
                <button class="action-btn" onclick="editDocument('${doc.id}')">Editar (U)</button>
                <button class="action-btn" onclick="deleteDocument('${doc.id}')">Excluir (D)</button>
                <button class="action-btn" onclick="generateAndDownloadPDF('${doc.id}')">Baixar PDF</button>
                <button class="action-btn" onclick="shareDocument('${doc.id}', 'whatsapp')">WhatsApp</button>
                <button class="action-btn" onclick="downloadReportTXT('${doc.id}')">Baixar TXT</button>
                <button class="action-btn" onclick="shareDocument('${doc.id}', 'email')">Email</button>
            </div>
        `;
        list.appendChild(li);
    });
}

// UPDATE (Carregar dados para Edição)
function editDocument(id) {
    const documents = getDocuments();
    const doc = documents.find(d => d.id === id);

    if (!doc) {
        alert('Documento não encontrado.');
        return;
    }

    // Preenche o formulário com os dados do documento
    document.getElementById('tipo-documento').value = doc.tipo;
    document.getElementById('data-hora-atual').value = doc.dataHoraAtual;
    document.getElementById('logo').value = doc.logo;
    document.getElementById('nome-prestador').value = doc.nomePrestador;
    document.getElementById('nome-empresa').value = doc.nomeEmpresa;
    document.getElementById('cnpj').value = doc.cnpj;
    document.getElementById('data-servico').value = doc.dataServico;
    document.getElementById('produto').value = doc.produto;
    document.getElementById('quantidade').value = doc.quantidade;
    document.getElementById('preco').value = doc.preco;
    document.getElementById('forma-pagamento').value = doc.formaPagamento;
    document.getElementById('prazo-pagamento').value = doc.prazoPagamento;

    // Seta o estado de edição
    const form = document.getElementById('document-form');
    form.setAttribute('data-editing-id', id);
    document.getElementById('save-btn').textContent = 'Atualizar Documento (U)';
    
    window.scrollTo(0, 0); 
}

// DELETE (Excluir Documento)
function deleteDocument(id) {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;

    let documents = getDocuments();
    documents = documents.filter(doc => doc.id !== id);
    saveDocuments(documents);
    renderDocumentList();
    alert('Documento excluído.');
}

// Limpar Formulário
document.getElementById('clear-form-btn').addEventListener('click', function() {
    const form = document.getElementById('document-form');
    form.reset();
    form.removeAttribute('data-editing-id');
    document.getElementById('save-btn').textContent = 'Salvar Documento (C/U)';
    document.getElementById('data-hora-atual').value = formatarDataHoraAtual();
});


// ==================== FUNÇÕES DE EXPORTAÇÃO E COMPARTILHAMENTO ====================

/**
 * @description Gera o conteúdo de texto para o compartilhamento (inspirado em script (1).js).
 * @param {object} doc - O objeto do documento.
 * @returns {string} O texto formatado para compartilhamento.
 */
function generateShareText(doc) {
    const docTitle = doc.tipo.toUpperCase().replace(/_/g, ' ');
    const idCurto = doc.id.substring(8);
    const prazo = doc.prazoPagamento ? `Até ${doc.prazoPagamento}` : 'À vista';

    let shareText = `**== [${docTitle}] #${idCurto} ==**\n`;
    shareText += `**Emitido em:** ${doc.dataHoraAtual}\n\n`;
    
    shareText += `**[ DADOS DO PRESTADOR/CLIENTE ]**\n`;
    shareText += `Nome da Empresa: ${doc.nomeEmpresa}\n`;
    shareText += `CNPJ: ${doc.cnpj}\n`;
    shareText += `Prestador/Solicitante: ${doc.nomePrestador}\n`;
    shareText += `Data do Serviço/Requisição: ${doc.dataServico}\n\n`;
    
    shareText += `**[ ITENS/SERVIÇOS ]**\n`;
    shareText += `Produto/Serviço: ${doc.produto}\n`;
    shareText += `Quantidade: ${doc.quantidade}\n`;
    shareText += `Preço Unitário: R$ ${doc.preco}\n`;
    shareText += `**TOTAL GERAL: R$ ${doc.total}**\n\n`;
    
    shareText += `**[ CONDIÇÕES ]**\n`;
    shareText += `Forma de Pagamento: ${doc.formaPagamento}\n`;
    shareText += `Prazo de Pagamento: ${prazo}\n`;
    
    // Substitui ** por * para WhatsApp (formatação markdown simples)
    return shareText.replace(/\*\*/g, '*');
}


// Compartilhar (WhatsApp/Email)
function shareDocument(id, method) {
    const documents = getDocuments();
    const doc = documents.find(d => d.id === id);
    if (!doc) return;

    const shareText = generateShareText(doc);
    const subject = `Documento ${doc.tipo} #${doc.id.substring(8)}`;

    if (method === 'whatsapp') {
        // Usa a abordagem robusta de link do script (1).js
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, '_blank');
    } else if (method === 'email') {
        const emailUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shareText)}`;
        window.location.href = emailUrl;
    }
}

/**
 * @description Inicia o download do relatório em formato TXT.
 * @param {string} id - O ID do documento.
 */
function downloadReportTXT(id) {
    const documents = getDocuments();
    const doc = documents.find(d => d.id === id);
    if (!doc) return;

    const reportText = generateShareText(doc).replace(/\*/g, ''); // Remove a formatação markdown para TXT
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `${doc.tipo}_${doc.id.substring(8)}_${date}.txt`;
    
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(a.href);
}


// Geração de PDF (Usando jsPDF)
function generateAndDownloadPDF(id) {
    const documents = getDocuments();
    const doc = documents.find(d => d.id === id);
    if (!doc) return;
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    let y = 10;
    const lineHeight = 7;
    const margin = 15;
    
    // Título do Documento
    pdf.setFontSize(20);
    pdf.text(doc.tipo.replace(/_/g, ' '), margin, y);
    y += lineHeight * 2;
    
    // Logomarca (simplificada para URL)
    if (doc.logo) {
        // Nota: A função addImage com URL externo pode falhar devido a políticas CORS.
        // Em um ambiente de produção, a imagem precisaria ser convertida para Base64 ou servida localmente.
        pdf.setFontSize(10);
        pdf.text(`Logo (Verifique URL): ${doc.logo}`, margin, y);
        y += lineHeight;
    }

    // Detalhes do Documento
    pdf.setFontSize(12);

    const docDetails = [
        `ID do Documento: #${doc.id.substring(8)}`,
        `Emitido em: ${doc.dataHoraAtual}`,
        `----------------------------------------`,
        `Empresa: ${doc.nomeEmpresa} (CNPJ: ${doc.cnpj})`,
        `Prestador/Solicitante: ${doc.nomePrestador}`,
        `Data do Serviço/Requisição: ${doc.dataServico}`,
        `----------------------------------------`,
        `Produto/Serviço: ${doc.produto}`,
        `Quantidade: ${doc.quantidade}`,
        `Preço Unitário: R$ ${doc.preco}`,
        `----------------------------------------`,
        `Forma de Pagamento: ${doc.formaPagamento}`,
        `Prazo de Pagamento: ${doc.prazoPagamento || 'À vista'}`
    ];

    docDetails.forEach(detail => {
        pdf.text(detail, margin, y);
        y += detail.startsWith('-') ? lineHeight / 2 : lineHeight; // Espaçamento menor para separadores
    });

    // Total em destaque
    y += lineHeight;
    pdf.setFontSize(16);
    pdf.text(`TOTAL GERAL: R$ ${doc.total}`, margin, y);
    
    pdf.save(`${doc.tipo}_${doc.id.substring(8)}.pdf`);
}
