// ==================== CONFIGURAÇÕES E UTILIDADES ====================
const LOCAL_STORAGE_KEY = 'receivables_note_data'; 
const DEBTOR_DETAILS_KEY = 'receivables_debtor_details'; 

// VARIÁVEIS GLOBAIS
let currentReceivableItems = []; 
let currentDiscountItems = []; 
let currentDebtorDetails = {}; 

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
    // Garante que o valor é um número de ponto flutuante, fixado em 2 casas, e formatado para BRL.
    return `R$ ${parseFloat(value).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

// ==================== LÓGICA DE PERSISTÊNCIA (DADOS DO RECEBEDOR) ====================

function saveDebtorDetails() {
    currentDebtorDetails.debtorName = document.getElementById('debtor-name').value;
    localStorage.setItem(DEBTOR_DETAILS_KEY, JSON.stringify(currentDebtorDetails));
}
window.saveDebtorDetails = saveDebtorDetails; 

function loadDebtorDetails() {
    const storedData = localStorage.getItem(DEBTOR_DETAILS_KEY);
    if (!storedData) return;

    const data = JSON.parse(storedData);
    currentDebtorDetails = data;
    
    if (data.debtorName) document.getElementById('debtor-name').value = data.debtorName;
}

// ==================== INICIALIZAÇÃO E EVENTOS ====================
document.addEventListener('DOMContentLoaded', () => {
    loadDebtorDetails(); 
    
    // Listeners para salvar detalhes de texto (ex: ao sair do campo)
    document.getElementById('debtor-name').addEventListener('blur', saveDebtorDetails);

    renderDocumentList();
    updateItemsTables(); // Inicializa ambas as tabelas
    
    // Configuração dos Eventos de Formulário e Ações
    document.getElementById('add-receivable-btn').addEventListener('click', addReceivableItem);
    document.getElementById('add-discount-btn').addEventListener('click', addDiscountItem);
    document.getElementById('receivable-form').addEventListener('submit', handleSubmit);
    document.getElementById('clear-form-btn').addEventListener('click', () => clearForm(document.getElementById('receivable-form')));
});

// ==================== FUNÇÕES DE GERENCIAMENTO DE ITENS (TABELAS DINÂMICAS) ====================

function calculateTotals() {
    const receivablesTotal = currentReceivableItems.reduce((sum, item) => sum + item.value, 0);
    const discountsTotal = currentDiscountItems.reduce((sum, item) => sum + item.value, 0);
    const grandTotal = receivablesTotal - discountsTotal;

    document.getElementById('receivable-total-display').textContent = formatCurrency(receivablesTotal);
    document.getElementById('discount-total-display').textContent = formatCurrency(discountsTotal);
    document.getElementById('grand-total-display').textContent = formatCurrency(grandTotal);
    
    return { receivablesTotal, discountsTotal, grandTotal };
}

// Adiciona item de Recebível
function addReceivableItem() {
    const descriptionInput = document.getElementById('receivable-description');
    const valueInput = document.getElementById('receivable-value');

    const description = descriptionInput.value.trim();
    const value = parseFloat(valueInput.value);

    // VALIDAÇÃO JS
    if (!description || isNaN(value) || value <= 0) {
        alert("Por favor, preencha a Descrição e o Valor (positivo) do recebível.");
        return;
    }

    const newItem = { description, value };
    currentReceivableItems.push(newItem);
    updateItemsTables();

    descriptionInput.value = '';
    valueInput.value = '0.00';
    descriptionInput.focus();
}

// Adiciona item de Desconto
function addDiscountItem() {
    const descriptionInput = document.getElementById('discount-description');
    const valueInput = document.getElementById('discount-value');

    const description = descriptionInput.value.trim();
    const value = parseFloat(valueInput.value);

    // VALIDAÇÃO JS
    if (!description || isNaN(value) || value <= 0) {
        alert("Por favor, preencha a Descrição e o Valor (positivo) do desconto.");
        return;
    }

    const newItem = { description, value };
    currentDiscountItems.push(newItem);
    updateItemsTables();

    descriptionInput.value = '';
    valueInput.value = '0.00';
    descriptionInput.focus();
}

// EXPOSTA GLOBALMENTE: Remove item
function removeItem(type, index) {
    if (!confirm(`Tem certeza que deseja remover ${type === 'receivable' ? 'este recebível' : 'este desconto'}?`)) return;
    
    if (type === 'receivable') {
        currentReceivableItems.splice(index, 1);
    } else if (type === 'discount') {
        currentDiscountItems.splice(index, 1);
    }
    
    updateItemsTables();
}
window.removeItem = removeItem; 

// Atualiza ambas as tabelas
function updateItemsTables() {
    const receivablesBody = document.querySelector('#receivables-table tbody');
    const discountsBody = document.querySelector('#discounts-table tbody');
    
    receivablesBody.innerHTML = '';
    discountsBody.innerHTML = '';

    // Tabela de Recebíveis
    if (currentReceivableItems.length === 0) {
        receivablesBody.innerHTML = '<tr><td colspan="4" class="text-center" style="color: var(--secondary-color);">Nenhum recebível adicionado.</td></tr>';
    } else {
        currentReceivableItems.forEach((item, index) => {
            const row = receivablesBody.insertRow();
            row.innerHTML = `
                <td class="text-center">${index + 1}</td>
                <td>${item.description}</td>
                <td class="text-right">${formatCurrency(item.value)}</td>
                <td class="text-center"><button type="button" class="btn btn-action btn-danger" onclick="window.removeItem('receivable', ${index})">Remover</button></td>
            `;
        });
    }

    // Tabela de Descontos
    if (currentDiscountItems.length === 0) {
        discountsBody.innerHTML = '<tr><td colspan="4" class="text-center" style="color: var(--secondary-color);">Nenhum desconto adicionado.</td></tr>';
    } else {
        currentDiscountItems.forEach((item, index) => {
            const row = discountsBody.insertRow();
            row.innerHTML = `
                <td class="text-center">${index + 1}</td>
                <td>${item.description}</td>
                <td class="text-right">${formatCurrency(item.value)}</td>
                <td class="text-center"><button type="button" class="btn btn-action btn-danger" onclick="window.removeItem('discount', ${index})">Remover</button></td>
            `;
        });
    }
    
    calculateTotals();
}

// ==================== FUNÇÕES CRUD (CREATE, READ, UPDATE) ====================

async function handleSubmit(e) { 
    e.preventDefault();
    
    const form = e.target;
    if (!form.checkValidity()) {
        form.reportValidity(); 
        return;
    }

    // VALIDAÇÃO ESSENCIAL: Garante que a nota tenha pelo menos um recebível
    if (currentReceivableItems.length === 0) {
        alert('Adicione pelo menos um item Recebível à Nota antes de salvar.');
        return;
    }
    
    saveDebtorDetails(); 

    const documentId = form.dataset.editingId;
    const totals = calculateTotals();
    
    const newDocument = {
        id: documentId ? documentId : Date.now().toString(),
        tipo: 'NOTA_RECEBIVEIS_SIMPLES',
        dataCriacao: new Date().toISOString().split('T')[0],
        
        debtorName: document.getElementById('debtor-name').value,
        
        receivables: [...currentReceivableItems],
        discounts: [...currentDiscountItems],
        
        receivablesTotal: totals.receivablesTotal,
        discountsTotal: totals.discountsTotal,
        grandTotal: totals.grandTotal
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
    currentDiscountItems = [];
    updateItemsTables();

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
    
    saveDebtorDetails(); 
    loadDebtorDetails(); 

    currentReceivableItems = doc.receivables || [];
    currentDiscountItems = doc.discounts || [];
    updateItemsTables(); 

    const form = document.getElementById('receivable-form');
    form.setAttribute('data-editing-id', id);
    document.getElementById('save-btn').textContent = 'Atualizar Nota (U)';
    
    window.scrollTo(0, 0); 
}
window.editDocument = editDocument;

function renderDocumentList() {
    const list = document.getElementById('document-list');
    list.innerHTML = '';
    // Filtra documentos criados por esta versão simplificada
    const documents = getDocuments().filter(doc => doc.tipo === 'NOTA_RECEBIVEIS_SIMPLES');

    if (documents.length === 0) {
        list.innerHTML = '<li>Nenhuma Nota de Recebíveis salva.</li>';
        return;
    }

    documents.forEach(doc => {
        const li = document.createElement('li');
        
        const total = formatCurrency(doc.grandTotal);

        li.innerHTML = `
            <div class="info">
                <span><strong>NOTA #${doc.id.substring(8)}</strong> - Cliente: ${doc.debtorName} | Total Geral: ${total}</span>
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
    pdf.text(`Data: ${formatDate(doc.dataCriacao)}`, margin + width, y, { align: 'right' });
    y += lineHeight;

    // 2. Cliente/Devedor
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text("DADOS DO DEVEDOR/CLIENTE", margin, y);
    pdf.line(margin, y + 1, margin + width, y + 1);
    y += lineHeight;

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Nome do Cliente: ${doc.debtorName || 'N/I'}`, margin, y);
    y += lineHeight * 2;


    // 3. Função para desenhar a Tabela de Itens (Recebíveis ou Descontos)
    const drawItemTable = (title, items, isDiscount, startY) => {
        let currentY = startY;
        
        if (items.length === 0) {
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Nenhum(a) ${title.toLowerCase()} listado(a).`, margin, currentY + lineHeight);
            return currentY + lineHeight * 2;
        }

        const tableHeaderColor = isDiscount ? [255, 200, 200] : [220, 230, 240];
        const headerHeight = 7;
        const colItem = 10;
        const colDescricao = 115; 
        
        // Título da Seção
        pdf.setFontSize(11); 
        pdf.setFont('helvetica', 'bold');
        pdf.text(title.toUpperCase(), margin, currentY);
        currentY += lineHeight * 1.5;

        const tableStartY = currentY;

        // Cabeçalho da Tabela
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setFillColor(tableHeaderColor[0], tableHeaderColor[1], tableHeaderColor[2]); 
        pdf.rect(margin, tableStartY - headerHeight, width, headerHeight, 'F'); 

        pdf.text("Nº", margin + 2, tableStartY - 2);
        pdf.text("DESCRIÇÃO", margin + colItem, tableStartY - 2);
        pdf.text("VALOR (R$)", margin + width - 1, tableStartY - 2, { align: 'right' });
        
        currentY += lineHeight * 0.5;

        // Linhas de Itens
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        
        items.forEach((item, index) => {
            if (currentY > 270) { 
                pdf.addPage();
                currentY = 15 + headerHeight * 2; 
                
                // Recria Título e Cabeçalho
                pdf.setFontSize(11); pdf.setFont('helvetica', 'bold');
                pdf.text(title.toUpperCase(), margin, currentY - lineHeight * 1.5);
                pdf.setFontSize(10);
                pdf.setFillColor(tableHeaderColor[0], tableHeaderColor[1], tableHeaderColor[2]); 
                pdf.rect(margin, currentY - headerHeight, width, headerHeight, 'F'); 
                pdf.text("Nº", margin + 2, currentY - 2);
                pdf.text("DESCRIÇÃO", margin + colItem, currentY - 2);
                pdf.text("VALOR (R$)", margin + width - 1, currentY - 2, { align: 'right' });
                pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
            }

            pdf.text((index + 1).toString(), margin + 2, currentY);
            pdf.text(item.description, margin + colItem, currentY);
            pdf.text(formatCurrency(item.value), margin + width - 1, currentY, { align: 'right' });
            
            pdf.setLineWidth(0.1); 
            pdf.setDrawColor(150, 150, 150); 
            pdf.line(margin, currentY + lineHeight * 0.3, margin + width, currentY + lineHeight * 0.3);
            
            currentY += lineHeight;
        });

        // Desenha o Contorno da Tabela
        const tableTotalHeight = currentY - (tableStartY - headerHeight); 
        pdf.setDrawColor(0, 0, 0); 
        pdf.setLineWidth(0.2); 
        pdf.rect(margin, tableStartY - headerHeight, width, tableTotalHeight, 'S'); 
        
        return currentY + lineHeight * 2;
    };
    
    // 4. Desenha Tabela de Recebíveis
    y = drawItemTable("Recebíveis", doc.receivables, false, y);
    
    // 5. Desenha Tabela de Descontos
    y = drawItemTable("Descontos", doc.discounts, true, y);

    // 6. Resumo dos Totais (Final)
    if (y + 40 > 280) {
        pdf.addPage();
        y = 15; 
    }
    
    const totalsY = y;
    
    // Tabela de Totais
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.2);
    pdf.rect(margin + width - 70, totalsY, 70, 25);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    // Total Recebíveis
    pdf.text("TOTAL RECEBÍVEIS:", margin + width - 5, totalsY + 5, { align: 'right' });
    pdf.text(formatCurrency(doc.receivablesTotal), margin + width - 5, totalsY + 10, { align: 'right' });
    
    // Total Descontos
    pdf.text("- TOTAL DESCONTOS:", margin + width - 5, totalsY + 15, { align: 'right' });
    pdf.text(formatCurrency(doc.discountsTotal), margin + width - 5, totalsY + 20, { align: 'right' });

    // Total Geral (Final)
    pdf.setLineWidth(0.4);
    pdf.line(margin + width - 68, totalsY + 21, margin + width - 2, totalsY + 21);

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text("TOTAL GERAL:", margin + width - 5, totalsY + 26, { align: 'right' });
    pdf.text(formatCurrency(doc.grandTotal), margin + width - 5, totalsY + 31, { align: 'right' });
    
    y = totalsY + 35;


    // 7. Campo para Assinatura
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