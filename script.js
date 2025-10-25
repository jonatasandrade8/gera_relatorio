// ==================== FUNÇÕES DE UTILIDADE E CONFIGURAÇÃO ====================
const LOCAL_STORAGE_KEY = 'document_generator_data';

// VARIÁVEIS GLOBAIS
let currentFormItems = []; // Itens temporários do formulário atual
let currentLogoData = ''; // Base64 da imagem enviada ou URL

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

// Lógica para ler e exibir o arquivo de imagem
function handleLogoFileUpload(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('logo-preview');
    preview.innerHTML = '';
    currentLogoData = ''; // Limpa o estado anterior

    if (file) {
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione um arquivo de imagem válido.');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            currentLogoData = e.target.result; // Armazena o Base64
            
            // Exibe a prévia
            const img = document.createElement('img');
            img.src = currentLogoData;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100px';
            preview.appendChild(img);
        };
        reader.readAsDataURL(file);
    }
}

// Inicializa ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('data-hora-atual').value = formatarDataHoraAtual();
    document.getElementById('logo-file').addEventListener('change', handleLogoFileUpload);
    renderDocumentList();
    updateItemsTable();
});


// ==================== FUNÇÕES DE GERENCIAMENTO DE ITENS (ADICIONAR/REMOVER) ====================

// 1. Adicionar Item
document.getElementById('add-item-btn').addEventListener('click', addItem);

function addItem() {
    const produtoInput = document.getElementById('item-produto');
    const quantidadeInput = document.getElementById('item-quantidade');
    const precoInput = document.getElementById('item-preco');

    const produto = produtoInput.value.trim();
    const quantidade = parseFloat(quantidadeInput.value);
    const preco = parseFloat(precoInput.value);

    if (!produto || isNaN(quantidade) || quantidade <= 0 || isNaN(preco) || preco <= 0) {
        alert("Por favor, preencha todos os campos do item corretamente (quantidade e preço devem ser positivos).");
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

    // Limpa campos do item
    produtoInput.value = '';
    quantidadeInput.value = '1';
    precoInput.value = '0.01';
    produtoInput.focus();
}

// 2. Remover Item
function removeItem(index) {
    if (!confirm('Tem certeza que deseja remover este item?')) return;
    currentFormItems.splice(index, 1);
    updateItemsTable();
}

// 3. Renderizar Tabela e Calcular Total
function updateItemsTable() {
    const tableBody = document.querySelector('#items-table tbody');
    const totalDisplay = document.getElementById('grand-total-display');
    tableBody.innerHTML = '';
    let grandTotal = 0;

    if (currentFormItems.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhum item adicionado.</td></tr>';
        totalDisplay.textContent = 'R$ 0,00';
        return;
    }

    currentFormItems.forEach((item, index) => {
        grandTotal += parseFloat(item.subtotal);

        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${item.produto}</td>
            <td>${item.quantidade}</td>
            <td>R$ ${parseFloat(item.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td>R$ ${parseFloat(item.subtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td><button type="button" class="action-btn" style="background-color: #d9534f;" onclick="removeItem(${index})">Remover</button></td>
        `;
    });

    totalDisplay.textContent = `R$ ${grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}


// ==================== FUNÇÕES CRUD (CREATE, READ, UPDATE, DELETE) ====================

// CREATE e UPDATE (Salvar Documento) - ATUALIZADA para Logo
document.getElementById('document-form').addEventListener('submit', function(e) {
    e.preventDefault();

    if (currentFormItems.length === 0) {
        alert("Por favor, adicione pelo menos um produto/serviço.");
        return;
    }
    
    const form = e.target;
    const documentId = form.dataset.editingId;
    
    // Calcula o total
    const total = currentFormItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0).toFixed(2);

    // TRATAMENTO DA LOGO: Prioriza Base64, senão usa URL
    const logoUrl = document.getElementById('logo-url').value;
    let finalLogoData = currentLogoData || logoUrl || '';
    
    const newDocument = {
        id: documentId ? documentId : Date.now().toString(),
        tipo: document.getElementById('tipo-documento').value,
        dataHoraAtual: document.getElementById('data-hora-atual').value,
        logo: finalLogoData, // Salva Base64 ou URL
        nomePrestador: document.getElementById('nome-prestador').value,
        nomeEmpresa: document.getElementById('nome-empresa').value,
        cnpj: document.getElementById('cnpj').value,
        dataServico: document.getElementById('data-servico').value,
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
    
    // LIMPA E ATUALIZA O ESTADO
    currentFormItems = [];
    currentLogoData = '';
    document.getElementById('logo-preview').innerHTML = ''; // Limpa preview da logo
    updateItemsTable();
});

// UPDATE (Carregar dados para Edição) - ATUALIZADA para Logo
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
    
    // TRATAMENTO DA LOGO (CARREGAMENTO)
    document.getElementById('logo-file').value = ''; // Limpa input File
    currentLogoData = ''; // Zera o Base64

    const preview = document.getElementById('logo-preview');
    preview.innerHTML = '';

    if (doc.logo) {
        if (doc.logo.startsWith('data:image')) {
            // Se for Base64, exibe prévia e armazena na variável global
            currentLogoData = doc.logo;
            const img = document.createElement('img');
            img.src = currentLogoData;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100px';
            preview.appendChild(img);
            document.getElementById('logo-url').value = ''; // Limpa o campo URL
        } else {
            // Se for URL, preenche o campo URL
            document.getElementById('logo-url').value = doc.logo;
        }
    }

    // CARREGA ITENS
    currentFormItems = doc.items || [];
    updateItemsTable();

    // Seta o estado de edição
    const form = document.getElementById('document-form');
    form.setAttribute('data-editing-id', id);
    document.getElementById('save-btn').textContent = 'Atualizar Documento (U)';
    
    window.scrollTo(0, 0); 
}

// Limpar Formulário - ATUALIZADA
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
});

// READ (Renderizar a Lista de Documentos) - Não precisa de mudanças.
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

        li.innerHTML = `
            <div class="info">
                <strong>${title} #${doc.id.substring(8)}</strong> - ${doc.nomeEmpresa} - R$ ${parseFloat(doc.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

// DELETE (Excluir Documento)
function deleteDocument(id) {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;

    let documents = getDocuments();
    documents = documents.filter(doc => doc.id !== id);
    saveDocuments(documents);
    renderDocumentList();
    alert('Documento excluído.');
}


// ==================== FUNÇÕES DE EXPORTAÇÃO E COMPARTILHAMENTO - ATUALIZADAS ====================

function generateShareText(doc) {
    const docTitle = doc.tipo.toUpperCase().replace(/_/g, ' ');
    const idCurto = doc.id.substring(8);
    const prazo = doc.prazoPagamento ? `Até ${doc.prazoPagamento}` : 'À vista';
    const totalFormatado = parseFloat(doc.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    let shareText = `*== [${docTitle}] #${idCurto} ==*\n`;
    shareText += `*Emitido em:* ${doc.dataHoraAtual}\n\n`;
    
    shareText += `*[ DADOS DO PRESTADOR/CLIENTE ]*\n`;
    shareText += `Nome da Empresa: ${doc.nomeEmpresa}\n`;
    shareText += `CNPJ: ${doc.cnpj}\n`;
    shareText += `Prestador/Solicitante: ${doc.nomePrestador}\n`;
    shareText += `Data do Serviço/Requisição: ${doc.dataServico}\n\n`;
    
    shareText += `*[ ITENS/SERVIÇOS ]*\n`;
    
    // Constrói a lista de itens
    doc.items.forEach((item, index) => {
        const preco = parseFloat(item.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        const subtotal = parseFloat(item.subtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        shareText += `  ${index + 1}. ${item.produto}\n`;
        shareText += `     Qtd: ${item.quantidade} | Unit: R$ ${preco} | Subtotal: R$ ${subtotal}\n`;
    });

    shareText += `\n*TOTAL GERAL: R$ ${totalFormatado}*\n\n`;
    
    shareText += `*[ CONDIÇÕES ]*\n`;
    shareText += `Forma de Pagamento: ${doc.formaPagamento}\n`;
    shareText += `Prazo de Pagamento: ${prazo}\n`;
    
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
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, '_blank');
    } else if (method === 'email') {
        const emailUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shareText)}`;
        window.location.href = emailUrl;
    }
}

/**
 * @description Inicia o download do relatório em formato TXT.
 */
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


// Geração de PDF (Usando jsPDF) - ATUALIZADA para Logo Base64
function generateAndDownloadPDF(id) {
    const documents = getDocuments();
    const doc = documents.find(d => d.id === id);
    if (!doc) return;
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    let y = 10;
    const lineHeight = 7;
    const margin = 15;
    
    // Bloco da Logomarca
    if (doc.logo) {
        if (doc.logo.startsWith('data:image')) {
            // Se for Base64, insere diretamente
            // Nota: Se for PNG, a transparência será perdida se for adicionada como 'JPEG'
            const imgType = doc.logo.substring(doc.logo.indexOf(':') + 1, doc.logo.indexOf(';')).toUpperCase().replace('IMAGE/', '');
            pdf.addImage(doc.logo, imgType, margin, y, 30, 30); 
            y += 35; // Avança o Y
        } else {
            // Se for URL, adiciona a URL como texto (já que a imagem URL externa pode falhar por CORS)
            pdf.setFontSize(10);
            pdf.text(`Logo URL: ${doc.logo}`, margin, y);
            y += lineHeight; 
        }
    }

    // Título e cabeçalho
    pdf.setFontSize(20);
    pdf.text(doc.tipo.replace(/_/g, ' '), margin, y);
    y += lineHeight;
    pdf.setFontSize(10);
    pdf.text(`ID: #${doc.id.substring(8)} | Emitido em: ${doc.dataHoraAtual}`, margin, y);
    y += lineHeight * 2;
    
    // Dados do Prestador
    pdf.setFontSize(12);
    pdf.text(`Empresa: ${doc.nomeEmpresa} (CNPJ: ${doc.cnpj})`, margin, y); y += lineHeight;
    pdf.text(`Prestador/Solicitante: ${doc.nomePrestador}`, margin, y); y += lineHeight;
    pdf.text(`Data do Serviço/Requisição: ${doc.dataServico}`, margin, y); y += lineHeight * 2;

    // Tabela de Itens (Simulando uma tabela com linhas de texto)
    pdf.setFontSize(12);
    pdf.text("ITENS/SERVIÇOS", margin, y); y += lineHeight;
    pdf.setFontSize(10);
    
    // Cabeçalho da "tabela"
    pdf.text("Produto/Serviço", margin, y);
    pdf.text("Qtd", 100, y);
    pdf.text("Preço Unit.", 120, y);
    pdf.text("Subtotal", 160, y);
    y += lineHeight * 0.5;
    pdf.line(margin, y, 195, y); // Linha separadora
    y += lineHeight;

    doc.items.forEach(item => {
        const preco = parseFloat(item.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        const subtotal = parseFloat(item.subtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        
        pdf.text(item.produto, margin, y);
        pdf.text(item.quantidade.toString(), 100, y);
        pdf.text(`R$ ${preco}`, 120, y);
        pdf.text(`R$ ${subtotal}`, 160, y);
        y += lineHeight;
    });

    // Linha de Pagamento e Total
    y += lineHeight;
    pdf.line(margin, y, 195, y); 
    y += lineHeight;

    const totalFormatado = parseFloat(doc.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    pdf.setFontSize(14);
    pdf.text(`TOTAL GERAL: R$ ${totalFormatado}`, 160, y, { align: "right" }); 
    y += lineHeight;
    pdf.setFontSize(10);
    pdf.text(`Pagamento: ${doc.formaPagamento} (Prazo: ${doc.prazoPagamento || 'À vista'})`, margin, y); y += lineHeight;

    
    pdf.save(`${doc.tipo}_${doc.id.substring(8)}.pdf`);
}