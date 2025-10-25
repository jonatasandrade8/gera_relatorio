// ==================== FUNÇÕES DE UTILIDADE E CONFIGURAÇÃO ====================
const LOCAL_STORAGE_KEY = 'document_generator_data';

// VARIÁVEIS GLOBAIS
let currentFormItems = []; 
let currentLogoData = ''; 

function formatarDataHoraAtual() {
    const now = new Date();
    const data = now.toLocaleDateString('pt-BR');
    const hora = now.toLocaleTimeString('pt-BR');
    return `${data} às ${hora}`;
}

function getDocuments() {
    const docs = localStorage.getItem(LOCAL_STORAGE_KEY);
    return docs ? JSON.parse(docs) : [];
}

function saveDocuments(documents) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(documents));
}

// ==================== LÓGICA DE PERSONALIZAÇÃO DE FORMULÁRIO ====================

const DESTINATARIO_LEGENDS = {
    'NOTA_SERVICO': 'Dados do Contratante',
    'ORDEM_SERVICO': 'Dados do Contratante',
    'REQUISICAO_COMPRA': 'Dados do Requisitante/Destinatário',
    'NOTA_ENTREGA': 'Dados do Recebedor da Mercadoria'
};

function updateFormFields() {
    const tipo = document.getElementById('tipo-documento').value;
    const destinatarioLegend = document.getElementById('destinatario-legend');
    destinatarioLegend.textContent = DESTINATARIO_LEGENDS[tipo] || 'Dados do Cliente/Parceiro';
}

document.getElementById('tipo-documento').addEventListener('change', updateFormFields);

// ==================== LÓGICA DE LOGO BASE64/URL ====================

function handleLogoFileUpload(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('logo-preview');
    preview.innerHTML = '';
    currentLogoData = '';

    if (file) {
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione um arquivo de imagem válido.');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            currentLogoData = e.target.result;
            
            const img = document.createElement('img');
            img.src = currentLogoData;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100px';
            preview.appendChild(img);
        };
        reader.readAsDataURL(file);
    }
}

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('data-hora-atual').value = formatarDataHoraAtual();
    document.getElementById('logo-file').addEventListener('change', handleLogoFileUpload);
    
    updateFormFields(); 
    renderDocumentList();
    updateItemsTable();
});


// ==================== FUNÇÕES DE GERENCIAMENTO DE ITENS (TABELA DINÂMICA) ====================

document.getElementById('add-item-btn').addEventListener('click', addItem);

function addItem() {
    const produtoInput = document.getElementById('item-produto');
    const quantidadeInput = document.getElementById('item-quantidade');
    const precoInput = document.getElementById('item-preco');

    const produto = produtoInput.value.trim();
    const quantidade = parseFloat(quantidadeInput.value);
    const preco = parseFloat(precoInput.value);

    if (!produto || isNaN(quantidade) || quantidade <= 0 || isNaN(preco) || preco <= 0) {
        alert("Por favor, preencha todos os campos do item corretamente (o preço deve ser maior que zero).");
        return;
    }

    const subtotal = (quantidade * preco).toFixed(2);

    const newItem = {
        produto,
        quantidade,
        preco: preco.toFixed(2),
        subtotal
    };

    currentFormItems.push(newItem);
    updateItemsTable();

    // Limpa campos do item para próxima inserção
    produtoInput.value = '';
    quantidadeInput.value = '1';
    precoInput.value = '0.01';
    produtoInput.focus();
}

function removeItem(index) {
    if (!confirm('Tem certeza que deseja remover este item?')) return;
    currentFormItems.splice(index, 1);
    updateItemsTable();
}

function updateItemsTable() {
    const tableBody = document.querySelector('#items-table tbody');
    const totalDisplay = document.getElementById('grand-total-display');
    tableBody.innerHTML = '';
    let grandTotal = 0;

    if (currentFormItems.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #6c757d;">Nenhum item adicionado.</td></tr>';
        totalDisplay.textContent = 'R$ 0,00';
        return;
    }

    currentFormItems.forEach((item, index) => {
        grandTotal += parseFloat(item.subtotal);

        const row = tableBody.insertRow();
        
        const subtotalFormatado = parseFloat(item.subtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        const precoFormatado = parseFloat(item.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

        row.innerHTML = `
            <td>${item.produto}</td>
            <td class="text-right">${item.quantidade}</td>
            <td class="text-right">R$ ${precoFormatado}</td>
            <td class="text-right">R$ ${subtotalFormatado}</td>
            <td><button type="button" class="btn btn-action btn-danger" onclick="removeItem(${index})">Remover</button></td>
        `;
    });
    
    // Adiciona a linha de total na tabela
    const totalRow = tableBody.insertRow();
    totalRow.classList.add('total-row');
    totalRow.innerHTML = `
        <td colspan="3" class="text-right" style="font-weight: 700; background-color: #f0f8ff;">TOTAL GERAL:</td>
        <td class="text-right total-cell" style="font-weight: 700; background-color: #e9f7eb; color: var(--success-color);">R$ ${grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        <td></td>
    `;

    totalDisplay.textContent = `R$ ${grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}


// ==================== FUNÇÕES CRUD (CREATE, READ, UPDATE, DELETE) ====================

// CREATE e UPDATE (Salvar Documento) - LÓGICA DE VALIDAÇÃO REFORÇADA
document.getElementById('document-form').addEventListener('submit', function(e) {
    e.preventDefault();

    // 1. Validação de Campos HTML5 (para garantir que o navegador faça o check dos 'required')
    if (!e.target.checkValidity()) {
        // Se a validação HTML5 falhar, o navegador exibirá a mensagem padrão. 
        // A função checkValidity() dispara o processo de validação.
        return; 
    }

    // 2. Validação de Itens Adicionados (Lógica customizada)
    if (currentFormItems.length === 0) {
        alert("ERRO: É necessário adicionar pelo menos um produto/serviço na lista.");
        return;
    }
    
    // Processamento dos dados
    const form = e.target;
    const documentId = form.dataset.editingId;
    
    const total = currentFormItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0).toFixed(2);
    const logoUrl = document.getElementById('logo-url').value;
    const finalLogoData = currentLogoData || logoUrl || '';
    
    const newDocument = {
        id: documentId ? documentId : Date.now().toString(),
        tipo: document.getElementById('tipo-documento').value,
        dataHoraAtual: document.getElementById('data-hora-atual').value,
        logo: finalLogoData,
        
        // Dados do Emissor/Prestador
        nomePrestador: document.getElementById('nome-prestador').value,
        nomeEmpresa: document.getElementById('nome-empresa').value,
        cnpj: document.getElementById('cnpj').value,
        dataServico: document.getElementById('data-servico').value,
        
        // Dados do Destinatário/Contratante
        nomeDestinatario: document.getElementById('nome-destinatario').value,
        empresaDestinatario: document.getElementById('empresa-destinatario').value,
        docDestinatario: document.getElementById('doc-destinatario').value,
        
        items: [...currentFormItems],
        total: total,
        formaPagamento: document.getElementById('forma-pagamento').value,
        prazoPagamento: document.getElementById('prazo-pagamento').value,
    };

    let documents = getDocuments();

    if (documentId) {
        documents = documents.map(doc => doc.id === documentId ? newDocument : doc);
        alert('Documento atualizado com sucesso!');
        form.removeAttribute('data-editing-id');
        document.getElementById('save-btn').textContent = 'Salvar Documento (C/U)';
    } else {
        documents.push(newDocument);
        alert('Documento salvo com sucesso!');
    }
    
    saveDocuments(documents);
    renderDocumentList();
    
    form.reset(); 
    document.getElementById('data-hora-atual').value = formatarDataHoraAtual(); 
    
    // LIMPA O ESTADO
    currentFormItems = [];
    currentLogoData = '';
    document.getElementById('logo-preview').innerHTML = '';
    updateItemsTable();
    updateFormFields(); 
});

// UPDATE (Carregar dados para Edição)
function editDocument(id) {
    const documents = getDocuments();
    const doc = documents.find(d => d.id === id);

    if (!doc) {
        alert('Documento não encontrado.');
        return;
    }

    // Preenche dados do documento
    document.getElementById('tipo-documento').value = doc.tipo;
    document.getElementById('data-hora-atual').value = doc.dataHoraAtual;
    document.getElementById('nome-prestador').value = doc.nomePrestador;
    document.getElementById('nome-empresa').value = doc.nomeEmpresa;
    document.getElementById('cnpj').value = doc.cnpj;
    document.getElementById('data-servico').value = doc.dataServico;
    document.getElementById('forma-pagamento').value = doc.formaPagamento;
    document.getElementById('prazo-pagamento').value = doc.prazoPagamento;
    
    // Novos Campos
    document.getElementById('nome-destinatario').value = doc.nomeDestinatario;
    document.getElementById('empresa-destinatario').value = doc.empresaDestinatario;
    document.getElementById('doc-destinatario').value = doc.docDestinatario;
    
    // LOGO
    document.getElementById('logo-file').value = '';
    currentLogoData = '';
    const preview = document.getElementById('logo-preview');
    preview.innerHTML = '';

    if (doc.logo) {
        if (doc.logo.startsWith('data:image')) {
            currentLogoData = doc.logo;
            const img = document.createElement('img');
            img.src = currentLogoData;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100px';
            preview.appendChild(img);
            document.getElementById('logo-url').value = ''; 
        } else {
            document.getElementById('logo-url').value = doc.logo;
        }
    }

    // ITENS
    currentFormItems = doc.items || [];
    updateItemsTable();

    // Seta estado de edição e personaliza
    const form = document.getElementById('document-form');
    form.setAttribute('data-editing-id', id);
    document.getElementById('save-btn').textContent = 'Atualizar Documento (U)';
    updateFormFields(); 
    
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
    
    // LIMPA O ESTADO
    currentFormItems = [];
    currentLogoData = '';
    document.getElementById('logo-preview').innerHTML = '';
    updateItemsTable();
    updateFormFields(); 
});


// READ (Renderizar a Lista de Documentos) - Botão de remover garantido
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
        
        const docTitleMap = {
            'NOTA_SERVICO': 'NS',
            'REQUISICAO_COMPRA': 'RC',
            'ORDEM_SERVICO': 'OS',
            'NOTA_ENTREGA': 'NE'
        };
        const title = docTitleMap[doc.tipo] || 'DOC';
        const total = parseFloat(doc.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

        li.innerHTML = `
            <div class="info">
                <span><strong>${title} #${doc.id.substring(8)}</strong> - ${doc.nomeEmpresa}</span>
                <span class="total-display">R$ ${total}</span>
            </div>
            <div class="actions">
                <button class="btn btn-action btn-primary" onclick="editDocument('${doc.id}')">Editar</button>
                <button class="btn btn-action btn-danger" onclick="deleteDocument('${doc.id}')">Remover</button>
                <button class="btn btn-action btn-primary" style="background: #28a745;" onclick="generateAndDownloadPDF('${doc.id}')">Baixar PDF</button>
                <button class="btn btn-action btn-primary" style="background: #008069;" onclick="shareDocument('${doc.id}', 'whatsapp')">WhatsApp</button>
                <button class="btn btn-action btn-secondary" onclick="downloadReportTXT('${doc.id}')">TXT</button>
                <button class="btn btn-action btn-primary" style="background: #e28e00;" onclick="shareDocument('${doc.id}', 'email')">Email</button>
            </div>
        `;
        list.appendChild(li);
    });
}

// ==================== FUNÇÕES DE EXPORTAÇÃO E COMPARTILHAMENTO ====================
// (Mantidas as funções de exportação do passo anterior)

function generateShareText(doc) {
    const docTitle = doc.tipo.toUpperCase().replace(/_/g, ' ');
    const idCurto = doc.id.substring(8);
    const prazo = doc.prazoPagamento ? `Até ${doc.prazoPagamento}` : 'À vista';
    const totalFormatado = parseFloat(doc.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const destinatarioLegend = DESTINATARIO_LEGENDS[doc.tipo];

    let shareText = `*== [${docTitle}] #${idCurto} ==*\n`;
    shareText += `*Emitido em:* ${doc.dataHoraAtual}\n\n`;
    
    // Dados do Emissor
    shareText += `*[ DADOS DO EMISSOR ]*\n`;
    shareText += `Empresa: ${doc.nomeEmpresa}\n`;
    shareText += `CNPJ/CPF: ${doc.cnpj}\n`;
    shareText += `Emissor: ${doc.nomePrestador}\n`;
    shareText += `Data do Serviço/Requisição: ${doc.dataServico}\n\n`;
    
    // Dados do Destinatário/Contratante
    shareText += `*[ ${destinatarioLegend.toUpperCase()} ]*\n`;
    shareText += `Nome: ${doc.nomeDestinatario}\n`;
    if (doc.empresaDestinatario) {
        shareText += `Empresa: ${doc.empresaDestinatario}\n`;
    }
    shareText += `CNPJ/CPF: ${doc.docDestinatario}\n\n`;

    // Lista de Itens
    shareText += `*[ ITENS/SERVIÇOS ]*\n`;
    doc.items.forEach((item, index) => {
        const preco = parseFloat(item.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        const subtotal = parseFloat(item.subtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        shareText += `  ${index + 1}. ${item.produto}\n`;
        shareText += `     Qtd: ${item.quantidade} | Unit: R$ ${preco} | Subtotal: R$ ${subtotal}\n`;
    });

    shareText += `\n*TOTAL GERAL: R$ ${totalFormatado}*\n\n`;
    
    // Condições
    shareText += `*[ CONDIÇÕES ]*\n`;
    shareText += `Forma de Pagamento: ${doc.formaPagamento}\n`;
    shareText += `Prazo de Pagamento: ${prazo}\n`;
    
    return shareText.replace(/\*\*/g, '*');
}

function shareDocument(id, method) {
    const documents = getDocuments();
    const doc = documents.find(d => d.id === id);
    if (!doc) return;

    const shareText = generateShareText(doc);
    const subject = `Documento ${doc.tipo} #${doc.id.substring(8)}`;

    if (method === 'whatsapp') {
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, '_blank');
    } else if (method === 'email') {
        const emailUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shareText)}`;
        window.location.href = emailUrl;
    }
}

function downloadReportTXT(id) {
    const documents = getDocuments();
    const doc = documents.find(d => d.id === id);
    if (!doc) return;

    const reportText = generateShareText(doc).replace(/\*/g, ''); 
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
    const pdf = new jsPDF('p', 'mm', 'a4'); 
    
    let y = 15;
    const lineHeight = 6;
    const margin = 15;
    const width = 180;
    
    // 1. Logomarca e Título
    if (doc.logo && doc.logo.startsWith('data:image')) {
        const imgType = doc.logo.substring(doc.logo.indexOf(':') + 6, doc.logo.indexOf(';')).toUpperCase();
        try {
            pdf.addImage(doc.logo, imgType, margin, y, 20, 20); 
        } catch (e) {
            console.error("Erro ao adicionar imagem ao PDF:", e);
        }
    }

    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(doc.tipo.replace(/_/g, ' '), margin + 25, y + 5); 
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`ID: #${doc.id.substring(8)}`, margin + 25, y + 10);
    pdf.text(`Emitido em: ${doc.dataHoraAtual}`, margin + 25, y + 15);
    y += 25;
    
    pdf.line(margin, y, margin + width, y);
    y += lineHeight * 0.5;

    // 2. Dados do Emissor e Destinatário
    const halfWidth = width / 2;
    const destinatarioLegend = DESTINATARIO_LEGENDS[doc.tipo];

    // Coluna 1: Emissor
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text("EMISSOR / PRESTADOR", margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Empresa: ${doc.nomeEmpresa}`, margin, y + lineHeight);
    pdf.text(`CNPJ/CPF: ${doc.cnpj}`, margin, y + lineHeight * 2);
    pdf.text(`Emissor: ${doc.nomePrestador}`, margin, y + lineHeight * 3);
    
    // Coluna 2: Destinatário
    pdf.setFont('helvetica', 'bold');
    pdf.text(destinatarioLegend.toUpperCase(), margin + halfWidth, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Nome: ${doc.nomeDestinatario}`, margin + halfWidth, y + lineHeight);
    if (doc.empresaDestinatario) {
        pdf.text(`Empresa: ${doc.empresaDestinatario}`, margin + halfWidth, y + lineHeight * 2);
    }
    pdf.text(`CNPJ/CPF: ${doc.docDestinatario}`, margin + halfWidth, y + lineHeight * (doc.empresaDestinatario ? 3 : 2));
    
    y += lineHeight * 4; 
    
    pdf.line(margin, y, margin + width, y);
    y += lineHeight;

    // 3. Tabela de Itens
    
    // Cabeçalho da Tabela
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(240, 240, 240); 
    pdf.rect(margin, y - 5, width, 5, 'F');
    
    pdf.text("Produto/Serviço", margin + 1, y - 1);
    pdf.text("Qtd", 110, y - 1, { align: 'right' });
    pdf.text("Preço Unit.", 140, y - 1, { align: 'right' });
    pdf.text("Subtotal", 175, y - 1, { align: 'right' });
    y += lineHeight;

    // Linhas de Itens
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    doc.items.forEach(item => {
        const preco = parseFloat(item.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        const subtotal = parseFloat(item.subtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        
        pdf.text(item.produto, margin + 1, y);
        pdf.text(item.quantidade.toString(), 110, y, { align: 'right' });
        pdf.text(`R$ ${preco}`, 140, y, { align: 'right' });
        pdf.text(`R$ ${subtotal}`, 175, y, { align: 'right' });
        y += lineHeight;
        
        if (y > 270) { 
            pdf.addPage();
            y = 15;
        }
    });
    
    // 4. Rodapé e Total
    y += lineHeight * 0.5;
    pdf.line(margin, y, margin + width, y); 
    y += lineHeight;

    // Total
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text("TOTAL GERAL:", 140, y, { align: 'right' });
    pdf.text(`R$ ${parseFloat(doc.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 175, y, { align: 'right' });
    y += lineHeight;

    // Condições
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Condições de Pagamento: ${doc.formaPagamento} (Prazo: ${doc.prazoPagamento || 'À vista'})`, margin, y);
    
    y += lineHeight * 2;
    pdf.text(`Data do Serviço/Requisição: ${doc.dataServico}`, margin, y);

    pdf.save(`${doc.tipo}_${doc.id.substring(8)}.pdf`);
}