// ==================== CONFIGURAÇÕES E UTILIDADES ====================
const LOCAL_STORAGE_KEY = 'receivables_note_data'; 
const DEBTOR_DETAILS_KEY = 'receivables_debtor_details'; 

// VARIÁVEIS GLOBAIS
let currentReceivableItems = []; 
let currentDebtorDetails = {}; // Não precisamos da logo aqui, mas manteremos o padrão de persistência

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

// ==================== LÓGICA DE PERSISTÊNCIA (DADOS DO RECEBEDOR) ====================

function saveDebtorDetails() {
    currentDebtorDetails.debtorName = document.getElementById('debtor-name').value;
    currentDebtorDetails.noteNumber = document.getElementById('note-number').value;
    currentDebtorDetails.issuerName = document.getElementById('issuer-name').value;

    localStorage.setItem(DEBTOR_DETAILS_KEY, JSON.stringify(currentDebtorDetails));
}
window.saveDebtorDetails = saveDebtorDetails; 

function loadDebtorDetails() {
    const storedData = localStorage.getItem(DEBTOR_DETAILS_KEY);
    if (!storedData) return;

    const data = JSON.parse(storedData);
    currentDebtorDetails = data;
    
    if (data.debtorName) document.getElementById('debtor-name').value = data.debtorName;
    if (data.noteNumber) document.getElementById('note-number').value = data.noteNumber;
    if (data.issuerName) document.getElementById('issuer-name').value = data.issuerName;
}

// ==================== INICIALIZAÇÃO E EVENTOS ====================
document.addEventListener('DOMContentLoaded', () => {
    loadDebtorDetails(); 
    
    // Listeners para salvar detalhes de texto (ex: ao sair do campo)
    document.getElementById('debtor-name').addEventListener('blur', saveDebtorDetails);
    document.getElementById('note-number').addEventListener('blur', saveDebtorDetails);
    document.getElementById('issuer-name').addEventListener('blur', saveDebtorDetails);

    renderDocumentList();
    updateItemsTable();
    
    // Configuração dos Eventos de Formulário e Ações
    document.getElementById('add-item-btn').addEventListener('click', addItem);
    document.getElementById('receivable-form').addEventListener('submit', handleSubmit);
    document.getElementById('clear-form-btn').addEventListener('click', () => clearForm(document.getElementById('receivable-form')));
});

// ==================== FUNÇÕES DE GERENCIAMENTO DE ITENS (TABELA DINÂMICA) ====================

function calculateGrandTotal() {
    const total = currentReceivableItems.reduce((sum, item) => sum + (item.value * item.quantity), 0);
    document.getElementById('grand-total-display').textContent = formatCurrency(total);
    return total;
}

function addItem() {
    const descriptionInput = document.getElementById('item-description');
    const valueInput = document.getElementById('item-value');
    const quantityInput = document.getElementById('item-quantity'); 

    const description = descriptionInput.value.trim();
    const value = parseFloat(valueInput.value);
    const quantity = parseInt(quantityInput.value);

    // VALIDAÇÃO JS: ESSENCIAL APÓS REMOVER 'REQUIRED' DO HTML
    if (!description || isNaN(value) || value < 0 || isNaN(quantity) || quantity <= 0) {
        alert("Por favor, preencha a Descrição, o Valor (não-negativo) e a Quantidade (maior que zero) antes de adicionar.");
        return;
    }

    const newItem = { description, value, quantity };

    currentReceivableItems.push(newItem);
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
    currentReceivableItems.splice(index, 1);
    updateItemsTable();
}
window.removeItem = removeItem; 

function updateItemsTable() {
    const tableBody = document.querySelector('#items-table tbody');
    tableBody.innerHTML = '';

    if (currentReceivableItems.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center" style="color: var(--secondary-color);">Nenhum item adicionado à nota.</td></tr>';
    }

    currentReceivableItems.forEach((item, index) => {
        const itemTotal = item.value * item.quantity;
        const row = tableBody.insertRow();
        
        row.innerHTML = `
            <td class="text-center">${index + 1}</td>
            <td>${item.description}</td>
            <td class="text-right">${formatCurrency(item.value)}</td>
            <td class="text-right">${item.quantity}</td>
            <td class="text-right">${formatCurrency(itemTotal)}</td>
            <td class="text-center"><button type="button" class="btn btn-action btn-danger" onclick="window.removeItem(${index})">Remover</button></td>
        `;
    });
    
    calculateGrandTotal();
}

// ==================== FUNÇÕES CRUD (CREATE, READ, UPDATE) ====================

async function handleSubmit(e) { 
    e.preventDefault();
    
    // Validação do formulário principal (campos obrigatórios no HTML)
    const form = e.target;
    if (!form.checkValidity()) {
        form.reportValidity(); // Permite que o navegador mostre o erro nos campos obrigatórios
        return;
    }

    if (currentReceivableItems.length === 0) {
        alert('Adicione pelo menos um item à Nota de Recebíveis antes de salvar.');
        return;
    }
    
    saveDebtorDetails(); 

    const documentId = form.dataset.editingId;
    const grandTotal = calculateGrandTotal();
    
    const newDocument = {
        id: documentId ? documentId : Date.now().toString(),
        tipo: 'NOTA_RECEBIVEIS',
        dataCriacao: new Date().toISOString().split('T')[0],
        
        debtorName: document.getElementById('debtor-name').value,
        noteNumber: document.getElementById('note-number').value,
        issueDate: document.getElementById('issue-date').value,
        dueDate: document.getElementById('due-date').value,
        issuerName: document.getElementById('issuer-name').value,
        observations: document.getElementById('observations').value,
        
        items: [...currentReceivableItems],
        totalValue: grandTotal
    };

    let documents = getDocuments();

    if (documentId) {
        documents = documents.map(doc => doc.id === documentId ? newDocument : doc);
        alert('Nota de Recebíveis atualizada com sucesso!');
        form.removeAttribute('data-editing-id');
        document.getElementById('save-btn').textContent = 'Salvar Nota (C/U)';
    } else {
        documents.push(newDocument);
        alert('Nota de Recebíveis salva com sucesso!');
    }
    
    saveDocuments(documents);
    renderDocumentList();
    
    clearForm(form);
}

function clearForm(form) {
    form.reset();
    form.removeAttribute('data-editing-id');
    document.getElementById('save-btn').textContent = 'Salvar Nota (C/U)';
    
    currentReceivableItems = [];
    updateItemsTable();

    loadDebtorDetails(); 
}

// EXPOSTA GLOBALMENTE: Carrega dados para edição
function editDocument(id) {
    const documents = getDocuments();
    const doc = documents.find(d => d.id === id);

    if (!doc) {
        alert('Documento não encontrado.');
        return;
    }

    document.getElementById('debtor-name').value = doc.debtorName || '';
    document.getElementById('note-number').value = doc.noteNumber || '';
    document.getElementById('issue-date').value = doc.issueDate || '';
    document.getElementById('due-date').value = doc.dueDate || '';
    document.getElementById('issuer-name').value = doc.issuerName || '';
    document.getElementById('observations').value = doc.observations || '';
    
    saveDebtorDetails(); 
    loadDebtorDetails(); 

    currentReceivableItems = doc.items || [];
    updateItemsTable(); 

    const form = document.getElementById('receivable-form');
    form.setAttribute('data-editing-id', id);
    document.getElementById('save-btn').textContent = 'Atualizar Nota (U)';
    
    window.scrollTo(0, 0); 
}
window.editDocument = editDocument;

function renderDocumentList() {
    const list = document.getElementById('document-list');
    list.innerHTML = '';
    const documents = getDocuments().filter(doc => doc.tipo === 'NOTA_RECEBIVEIS');

    if (documents.length === 0) {
        list.innerHTML = '<li>Nenhuma Nota de Recebíveis salva.</li>';
        return;
    }

    documents.forEach(doc => {
        const li = document.createElement('li');
        
        const numeroNota = doc.noteNumber || '[Sem Nº]';
        const total = formatCurrency(doc.totalValue);

        li.innerHTML = `
            <div class="info">
                <span><strong>NOTA #${doc.id.substring(8)}</strong> - Nº: ${numeroNota} | Cliente: ${doc.debtorName} | Total: ${total}</span>
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
    if (!confirm('Tem certeza que deseja excluir esta Nota de Recebíveis?')) return;

    let documents = getDocuments();
    documents = documents.filter(doc => doc.id !== id);
    saveDocuments(documents);
    renderDocumentList();
    alert('Nota de Recebíveis excluída.');
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
    pdf.text("NOTA DE RECEBÍVEIS", margin + width / 2, y, { align: 'center' }); 
    y += lineHeight * 2;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`ID: #${doc.id.substring(8)}`, margin + width, y - lineHeight, { align: 'right' }); 
    y += lineHeight;

    // 2. Detalhes da Nota
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text("DADOS DA NOTA", margin, y);
    pdf.line(margin, y + 1, margin + width, y + 1);
    y += lineHeight;

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Nº da Nota/Fatura: ${doc.noteNumber || 'N/I'}`, margin, y);
    pdf.text(`Data de Emissão: ${formatDate(doc.issueDate)}`, margin + width / 2, y);
    y += lineHeight;

    pdf.text(`Data de Vencimento: ${formatDate(doc.dueDate)}`, margin, y);
    pdf.text(`Empresa Credora (Emitente): ${doc.issuerName || 'N/I'}`, margin + width / 2, y);
    y += lineHeight;
    y += lineHeight;

    // 3. Cliente/Devedor
    pdf.setFont('helvetica', 'bold');
    pdf.text("DADOS DO DEVEDOR/CLIENTE", margin, y);
    pdf.line(margin, y + 1, margin + width, y + 1);
    y += lineHeight;

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Nome do Cliente: ${doc.debtorName || 'N/I'}`, margin, y);
    y += lineHeight;
    y += lineHeight;


    // 4. Tabela de Itens
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text("ITENS RECEBÍVEIS", margin, y);
    pdf.line(margin, y + 1, margin + width, y + 1);
    y += lineHeight * 2;

    const tableStartY = y;
    const headerHeight = 7;
    const tableHeaderColor = [220, 230, 240]; 
    const colItem = 10;
    const colDescricao = 80; 
    const colValor = 30; 
    const colQtd = 20; 
    
    // Cabeçalho da Tabela
    pdf.setFillColor(tableHeaderColor[0], tableHeaderColor[1], tableHeaderColor[2]); 
    pdf.rect(margin, tableStartY - headerHeight, width, headerHeight, 'F'); 

    pdf.text("Nº", margin + 2, tableStartY - 2);
    pdf.text("DESCRIÇÃO", margin + colItem, tableStartY - 2);
    pdf.text("VALOR UNIT.", margin + colItem + colDescricao, tableStartY - 2, { align: 'right' });
    pdf.text("QTD", margin + colItem + colDescricao + colValor + 10, tableStartY - 2, { align: 'right' });
    pdf.text("TOTAL", margin + width - 1, tableStartY - 2, { align: 'right' });
    
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
            pdf.text("DESCRIÇÃO", margin + colItem, tableCurrentY - 2);
            pdf.text("VALOR UNIT.", margin + colItem + colDescricao, tableCurrentY - 2, { align: 'right' });
            pdf.text("QTD", margin + colItem + colDescricao + colValor + 10, tableCurrentY - 2, { align: 'right' });
            pdf.text("TOTAL", margin + width - 1, tableCurrentY - 2, { align: 'right' });
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
        }

        pdf.text((index + 1).toString(), margin + 2, tableCurrentY);
        pdf.text(item.description, margin + colItem, tableCurrentY);
        pdf.text(formatCurrency(item.value), margin + colItem + colDescricao + colValor - 1, tableCurrentY, { align: 'right' });
        pdf.text(item.quantity.toString(), margin + colItem + colDescricao + colValor + colQtd + 1, tableCurrentY, { align: 'right' });
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
    pdf.text("TOTAL GERAL:", margin + width - 55, tableCurrentY + 4, { align: 'right' });
    pdf.text(formatCurrency(doc.totalValue), margin + width - 1, tableCurrentY + 4, { align: 'right' });
    
    y = tableCurrentY + lineHeight * 2; 

    // 5. Observações
    if (doc.observations) {
        if (y + 30 > 280) {
            pdf.addPage();
            y = 15; 
        }

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text("OBSERVAÇÕES:", margin, y);
        pdf.line(margin, y + 1, margin + width, y + 1);
        y += lineHeight;

        pdf.setFont('helvetica', 'normal');
        const splitText = pdf.splitTextToSize(doc.observations, width);
        pdf.text(splitText, margin, y);
        y += splitText.length * 5 + 5; 
    }
    
    // 6. Campo para Assinatura (A ser paga por...)
    if (y + 30 > 280) {
        pdf.addPage();
        y = 15; 
    }
    
    const signatureY = Math.max(y + 10, 250); 

    // Linha de assinatura
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.line(margin + 50, signatureY, margin + width - 50, signatureY);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Assinatura do Devedor/Cliente`, margin + width / 2, signatureY + 4, { align: 'center' });


    pdf.save(`NOTA_RECEBIVEIS_${doc.id.substring(8)}.pdf`);
}
window.generateAndDownloadPDF = generateAndDownloadPDF;