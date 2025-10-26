// ==================== CONFIGURAÇÕES E UTILIDADES ====================
const LOCAL_STORAGE_KEY = 'requisition_note_data'; 
const DEFAULTS_KEY = 'requisition_defaults'; 

// VARIÁVEIS GLOBAIS
let currentRequisitionItems = []; 

// Funções Auxiliares
function getDocuments() {
    const docs = localStorage.getItem(LOCAL_STORAGE_KEY);
    return docs ? JSON.parse(docs) : [];
}

function saveDocuments(documents) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(documents));
}

function formatDate(date) {
    if (!date) return '--/--/----';
    const d = new Date(date);
    if (typeof date === 'string' && date.includes('-')) {
        d.setDate(d.getDate() + 1); 
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
}

function formatCurrency(value) {
    return `R$ ${parseFloat(value).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

// ==================== LÓGICA DE PERSISTÊNCIA E TOGGLE DA EMPRESA ====================

function saveDefaults() {
    const defaults = {
        requesterName: document.getElementById('requester-name').value,
        targetArea: document.getElementById('target-area').value,
        companyName: document.getElementById('company-name').value,
        cnpj: document.getElementById('cnpj').value,
        useMode: localStorage.getItem('requisicao_compra_use_mode') || 'pessoal'
    };
    localStorage.setItem(DEFAULTS_KEY, JSON.stringify(defaults));
}
window.saveDefaults = saveDefaults;

function loadDefaults() {
    const storedData = localStorage.getItem(DEFAULTS_KEY);
    if (!storedData) return;

    const data = JSON.parse(storedData);
    
    if (data.requesterName) document.getElementById('requester-name').value = data.requesterName;
    if (data.targetArea) document.getElementById('target-area').value = data.targetArea;
    if (data.companyName) document.getElementById('company-name').value = data.companyName;
    if (data.cnpj) document.getElementById('cnpj').value = data.cnpj;

    // Carrega o modo de uso
    const savedMode = data.useMode || 'pessoal';
    toggleCompanyMode(savedMode === 'empresa', false); // Não salva novamente ao carregar
}

/**
 * Alterna a visibilidade da seção de dados da empresa e atualiza os botões.
 * @param {boolean} isCompanyMode - true para mostrar a seção da empresa, false para esconder.
 * @param {boolean} shouldSave - Se deve salvar a preferência no localStorage.
 */
function toggleCompanyMode(isCompanyMode, shouldSave = true) {
    const personalBtn = document.getElementById('use-personal-btn');
    const companyBtn = document.getElementById('use-company-btn');
    const companyFieldset = document.getElementById('company-data-fieldset');
    
    if (isCompanyMode) {
        companyFieldset.style.display = 'block';
        companyBtn.classList.add('active-mode');
        personalBtn.classList.remove('active-mode');
    } else {
        companyFieldset.style.display = 'none';
        personalBtn.classList.add('active-mode');
        companyBtn.classList.remove('active-mode');
    }

    if (shouldSave) {
        localStorage.setItem('requisicao_compra_use_mode', isCompanyMode ? 'empresa' : 'pessoal');
        saveDefaults();
    }
}
window.toggleCompanyMode = toggleCompanyMode; // Expor para uso nos botões

// ==================== INICIALIZAÇÃO E EVENTOS ====================
document.addEventListener('DOMContentLoaded', () => {
    loadDefaults(); 
    
    // Listeners para salvar detalhes de texto (ao sair do campo)
    document.getElementById('requester-name').addEventListener('blur', saveDefaults);
    document.getElementById('target-area').addEventListener('blur', saveDefaults);
    document.getElementById('company-name').addEventListener('blur', saveDefaults);
    document.getElementById('cnpj').addEventListener('blur', saveDefaults);

    // Configuração dos Eventos dos botões de modo
    document.getElementById('use-personal-btn').addEventListener('click', () => toggleCompanyMode(false));
    document.getElementById('use-company-btn').addEventListener('click', () => toggleCompanyMode(true));

    renderDocumentList();
    updateItemsTable();
    
    // Configuração dos Eventos de Formulário e Ações
    document.getElementById('add-item-btn').addEventListener('click', addItem);
    document.getElementById('requisition-form').addEventListener('submit', handleSubmit);
    document.getElementById('clear-form-btn').addEventListener('click', () => clearForm(document.getElementById('requisition-form')));
});

// ==================== FUNÇÕES DE GERENCIAMENTO DE ITENS (TABELA DINÂMICA) ====================

function calculateGrandTotal() {
    const total = currentRequisitionItems.reduce((sum, item) => sum + (item.value * item.quantity), 0);
    document.getElementById('grand-total-display').textContent = formatCurrency(total);
    return total;
}

function addItem() {
    const descriptionInput = document.getElementById('item-description');
    const valueInput = document.getElementById('item-value');
    const quantityInput = document.getElementById('item-quantity'); 

    const description = descriptionInput.value.trim();
    const value = parseFloat(valueInput.value) || 0;
    const quantity = parseInt(quantityInput.value);

    // VALIDAÇÃO JS: Requer Descrição e Quantidade > 0
    if (!description || isNaN(quantity) || quantity <= 0) {
        alert("Por favor, preencha a Descrição e a Quantidade (maior que zero) antes de adicionar.");
        return;
    }

    // Garante que o valor é válido
    if (isNaN(value) || value < 0) {
        alert("O Valor Estimado Unitário deve ser um número não negativo.");
        return;
    }

    const newItem = { description, value, quantity };

    currentRequisitionItems.push(newItem);
    updateItemsTable();

    descriptionInput.value = '';
    valueInput.value = '0.00';
    quantityInput.value = '1';
    
    // Atualiza o campo total calculado
    document.getElementById('item-total').value = '0.00';
    
    descriptionInput.focus();
}

// EXPOSTA GLOBALMENTE: Remove item da lista
function removeItem(index) {
    if (!confirm('Tem certeza que deseja remover este item?')) return;
    currentRequisitionItems.splice(index, 1);
    updateItemsTable();
}
window.removeItem = removeItem; 

function updateItemsTable() {
    const tableBody = document.querySelector('#items-table tbody');
    tableBody.innerHTML = '';

    if (currentRequisitionItems.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center" style="color: var(--secondary-color);">Nenhum item adicionado à requisição.</td></tr>';
    }

    currentRequisitionItems.forEach((item, index) => {
        const itemTotal = item.value * item.quantity;
        const row = tableBody.insertRow();
        
        row.innerHTML = `
            <td class="text-center">${index + 1}</td>
            <td>${item.description}</td>
            <td class="text-right">${item.quantity}</td>
            <td class="text-right">${formatCurrency(item.value)}</td>
            <td class="text-right">${formatCurrency(itemTotal)}</td>
            <td class="text-center"><button type="button" class="btn btn-action btn-danger" onclick="window.removeItem(${index})">Remover</button></td>
        `;
    });
    
    calculateGrandTotal();
}

// ==================== FUNÇÕES CRUD (CREATE, READ, UPDATE) ====================

async function handleSubmit(e) { 
    e.preventDefault();
    
    const form = e.target;
    if (!form.checkValidity()) {
        form.reportValidity(); 
        return;
    }

    if (currentRequisitionItems.length === 0) {
        alert('Adicione pelo menos um item à Requisição de Compra antes de salvar.');
        return;
    }
    
    saveDefaults(); 

    const documentId = form.dataset.editingId;
    const grandTotal = calculateGrandTotal();
    const useMode = localStorage.getItem('requisicao_compra_use_mode') || 'pessoal';
    
    const newDocument = {
        id: documentId ? documentId : Date.now().toString(),
        tipo: 'REQUISICAO_COMPRA',
        dataCriacao: new Date().toISOString().split('T')[0],
        
        requesterName: document.getElementById('requester-name').value,
        targetArea: document.getElementById('target-area').value,
        requisitionDate: document.getElementById('requisition-date').value,
        purchaseReason: document.getElementById('purchase-reason').value,
        useMode: useMode,

        // Incluir dados da empresa somente se estiver no modo empresa
        companyName: useMode === 'empresa' ? document.getElementById('company-name').value : '',
        cnpj: useMode === 'empresa' ? document.getElementById('cnpj').value : '',
        
        items: [...currentRequisitionItems],
        totalValue: grandTotal
    };

    let documents = getDocuments();

    if (documentId) {
        documents = documents.map(doc => doc.id === documentId ? newDocument : doc);
        alert('Requisição atualizada com sucesso!');
        form.removeAttribute('data-editing-id');
        document.getElementById('save-btn').textContent = 'Salvar Requisição';
    } else {
        documents.push(newDocument);
        alert('Requisição salva com sucesso!');
    }
    
    saveDocuments(documents);
    renderDocumentList();
    
    clearForm(form);
}

function clearForm(form) {
    form.reset();
    form.removeAttribute('data-editing-id');
    document.getElementById('save-btn').textContent = 'Salvar Requisição';
    
    currentRequisitionItems = [];
    updateItemsTable();

    loadDefaults(); // Recarrega os defaults, incluindo o modo de uso
}

// EXPOSTA GLOBALMENTE: Carrega dados para edição
function editDocument(id) {
    const documents = getDocuments();
    const doc = documents.find(d => d.id === id);

    if (!doc) {
        alert('Documento não encontrado.');
        return;
    }

    document.getElementById('requester-name').value = doc.requesterName || '';
    document.getElementById('target-area').value = doc.targetArea || '';
    document.getElementById('requisition-date').value = doc.requisitionDate || '';
    document.getElementById('purchase-reason').value = doc.purchaseReason || '';
    
    // Carregar e aplicar o modo de uso da requisição salva
    const useCompanyMode = doc.useMode === 'empresa';
    toggleCompanyMode(useCompanyMode);

    // Carregar dados da empresa (serão visíveis se useCompanyMode for true)
    document.getElementById('company-name').value = doc.companyName || '';
    document.getElementById('cnpj').value = doc.cnpj || '';

    currentRequisitionItems = doc.items || [];
    updateItemsTable(); 

    const form = document.getElementById('requisition-form');
    form.setAttribute('data-editing-id', id);
    document.getElementById('save-btn').textContent = 'Atualizar Requisição';
    
    window.scrollTo(0, 0); 
}
window.editDocument = editDocument;

function renderDocumentList() {
    const list = document.getElementById('document-list');
    list.innerHTML = '';
    const documents = getDocuments().filter(doc => doc.tipo === 'REQUISICAO_COMPRA');

    if (documents.length === 0) {
        list.innerHTML = '<li>Nenhuma Requisição de Compra salva.</li>';
        return;
    }

    documents.forEach(doc => {
        const li = document.createElement('li');
        
        const modo = doc.useMode === 'empresa' ? doc.companyName : doc.requesterName;
        const total = formatCurrency(doc.totalValue);

        li.innerHTML = `
            <div class="info">
                <span><strong>REQ #${doc.id.substring(8)}</strong> - Solicitante: ${modo} | Setor: ${doc.targetArea} | Total Est.: ${total}</span>
            </div>
            <div class="actions">
                <button class="btn btn-action btn-primary" onclick="window.editDocument('${doc.id}')">Editar</button>
                <button class="btn btn-action btn-danger" onclick="window.deleteDocument('${doc.id}')">Remover</button>
                <button class="btn btn-action btn-primary" style="background: var(--success-color);" onclick="window.generateAndDownloadPDF('${doc.id}')">Baixar PDF</button>
            </div>
        `;
        list.appendChild(li);
    });
}

// EXPOSTA GLOBALMENTE: Exclui documento
function deleteDocument(id) {
    if (!confirm('Tem certeza que deseja excluir esta Requisição de Compra?')) return;

    let documents = getDocuments();
    documents = documents.filter(doc => doc.id !== id);
    saveDocuments(documents);
    renderDocumentList();
    alert('Requisição de Compra excluída.');
}
window.deleteDocument = deleteDocument;


// ==================== FUNÇÃO DE EXPORTAÇÃO PDF ====================

// EXPOSTA GLOBALMENTE: Gera e baixa o PDF
function generateAndDownloadPDF(id) {
    const documents = getDocuments();
    const doc = documents.find(d => d.id === id);
    if (!doc) return;
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4'); 
    
    const margin = 15;
    const width = 180;
    const lineHeight = 6;
    let y = 15;
    
    // 1. Título
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text("REQUISIÇÃO DE COMPRA", margin + width / 2, y, { align: 'center' }); 
    y += lineHeight * 2;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`ID: #${doc.id.substring(8)}`, margin + width, y - lineHeight, { align: 'right' }); 
    pdf.text(`Data de Emissão: ${formatDate(doc.dataCriacao)}`, margin + width, y, { align: 'right' });
    y += lineHeight;

    // 2. Dados do Solicitante
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text("DADOS DO SOLICITANTE", margin, y);
    pdf.line(margin, y + 1, margin + width, y + 1);
    y += lineHeight;

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Nome do Solicitante: ${doc.requesterName || 'N/I'}`, margin, y);
    y += lineHeight;

    if (doc.useMode === 'empresa') {
        pdf.text(`Modo de Uso: EMPRESA`, margin + width / 2, y);
        y += lineHeight;
        pdf.text(`Empresa: ${doc.companyName || 'N/I'}`, margin, y);
        pdf.text(`CNPJ: ${doc.cnpj || 'N/I'}`, margin + width / 2, y);
        y += lineHeight;
    } else {
        pdf.text(`Modo de Uso: PESSOAL`, margin + width / 2, y);
        y += lineHeight;
    }
    y += lineHeight;

    // 3. Detalhes da Requisição
    pdf.setFont('helvetica', 'bold');
    pdf.text("DETALHES DA REQUISIÇÃO", margin, y);
    pdf.line(margin, y + 1, margin + width, y + 1);
    y += lineHeight;

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Área Destino: ${doc.targetArea || 'N/I'}`, margin, y);
    pdf.text(`Data Requisitada: ${formatDate(doc.requisitionDate)}`, margin + width / 2, y);
    y += lineHeight;

    pdf.setFont('helvetica', 'bold');
    pdf.text("Motivo da Compra:", margin, y);
    y += lineHeight * 0.5;
    pdf.setFont('helvetica', 'normal');
    const reasonText = pdf.splitTextToSize(doc.purchaseReason || 'N/I', width);
    pdf.text(reasonText, margin, y);
    y += reasonText.length * 5 + 5; 

    // 4. Tabela de Itens
    if (y > 250) { 
        pdf.addPage();
        y = 15; 
    }

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text("ITENS REQUISITADOS", margin, y);
    pdf.line(margin, y + 1, margin + width, y + 1);
    y += lineHeight * 2;

    const tableStartY = y;
    const headerHeight = 7;
    const tableHeaderColor = [220, 230, 240]; 
    const colItem = 10;
    const colDescricao = 80; 
    const colQtd = 20; 
    
    // Cabeçalho da Tabela
    pdf.setFillColor(tableHeaderColor[0], tableHeaderColor[1], tableHeaderColor[2]); 
    pdf.rect(margin, tableStartY - headerHeight, width, headerHeight, 'F'); 

    pdf.text("Nº", margin + 2, tableStartY - 2);
    pdf.text("DESCRIÇÃO/ESPECIFICAÇÃO", margin + colItem, tableStartY - 2);
    pdf.text("QTD", margin + colItem + colDescricao + 10, tableStartY - 2, { align: 'right' });
    pdf.text("VALOR UNIT.", margin + colItem + colDescricao + colQtd + 20, tableStartY - 2, { align: 'right' });
    pdf.text("TOTAL ESTIMADO", margin + width - 1, tableStartY - 2, { align: 'right' });
    
    let tableCurrentY = tableStartY + lineHeight * 0.5;

    // Linhas de Itens
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    doc.items.forEach((item, index) => {
        const itemTotal = item.value * item.quantity;

        if (tableCurrentY > 270) { 
            pdf.addPage();
            tableCurrentY = 15 + headerHeight; 
            
            // Recria cabeçalho
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.setFillColor(tableHeaderColor[0], tableHeaderColor[1], tableHeaderColor[2]); 
            pdf.rect(margin, tableCurrentY - headerHeight, width, headerHeight, 'F'); 
            pdf.text("Nº", margin + 2, tableCurrentY - 2);
            pdf.text("DESCRIÇÃO/ESPECIFICAÇÃO", margin + colItem, tableCurrentY - 2);
            pdf.text("QTD", margin + colItem + colDescricao + 10, tableCurrentY - 2, { align: 'right' });
            pdf.text("VALOR UNIT.", margin + colItem + colDescricao + colQtd + 20, tableCurrentY - 2, { align: 'right' });
            pdf.text("TOTAL ESTIMADO", margin + width - 1, tableCurrentY - 2, { align: 'right' });
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
        }

        pdf.text((index + 1).toString(), margin + 2, tableCurrentY);
        pdf.text(item.description, margin + colItem, tableCurrentY);
        pdf.text(item.quantity.toString(), margin + colItem + colDescricao + colQtd + 10, tableCurrentY, { align: 'right' });
        pdf.text(formatCurrency(item.value), margin + colItem + colDescricao + colQtd + 50, tableCurrentY, { align: 'right' });
        pdf.text(formatCurrency(itemTotal), margin + width - 1, tableCurrentY, { align: 'right' });
        
        pdf.line(margin, tableCurrentY + lineHeight * 0.3, margin + width, tableCurrentY + lineHeight * 0.3);
        
        tableCurrentY += lineHeight;
    });

    // Desenha o Contorno e Total
    const tableTotalHeight = tableCurrentY - (tableStartY - headerHeight); 
    pdf.setDrawColor(0, 0, 0); 
    pdf.setLineWidth(0.2); 
    pdf.rect(margin, tableStartY - headerHeight, width, tableTotalHeight + 6, 'S'); 

    // Total Geral
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(255, 255, 200); 
    pdf.rect(margin + width - 50, tableCurrentY + 1, 50, 5, 'F'); 
    pdf.text("TOTAL EST. GERAL:", margin + width - 55, tableCurrentY + 4, { align: 'right' });
    pdf.text(formatCurrency(doc.totalValue), margin + width - 1, tableCurrentY + 4, { align: 'right' });
    
    y = tableCurrentY + lineHeight * 2; 

    // 5. Campo para Assinatura
    if (y + 30 > 280) {
        pdf.addPage();
        y = 15; 
    }
    
    const signatureY = Math.max(y + 10, 250); 

    // Linhas de assinatura
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.line(margin + 20, signatureY, margin + 80, signatureY);
    pdf.line(margin + width - 80, signatureY, margin + width - 20, signatureY);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Solicitante: ${doc.requesterName}`, margin + 50, signatureY + 4, { align: 'center' });
    pdf.text(`Aprovação (Setor Compras)`, margin + width - 50, signatureY + 4, { align: 'center' });


    pdf.save(`REQUISICAO_COMPRA_${doc.id.substring(8)}.pdf`);
}
window.generateAndDownloadPDF = generateAndDownloadPDF;