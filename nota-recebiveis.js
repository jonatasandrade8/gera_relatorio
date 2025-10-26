// ==================== CONFIGURAÇÕES E UTILIDADES ====================
const LOCAL_STORAGE_KEY = 'receivables_note_data';

// VARIÁVEIS GLOBAIS
// Cada item terá: { id, tipo: 'CREDIT'|'DEBIT', descricao, valor }
let currentItems = []; 

// Função auxiliar para obter documentos salvos
function getDocuments() {
    const docs = localStorage.getItem(LOCAL_STORAGE_KEY);
    return docs ? JSON.parse(docs) : [];
}

// Função auxiliar para salvar documentos
function saveDocuments(documents) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(documents));
}

// Função auxiliar para formatar datas (dd/mm/yyyy)
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

// ==================== INICIALIZAÇÃO E EVENTOS DE DATA/TOTAIS ====================
document.addEventListener('DOMContentLoaded', () => {
    updateTotals();
    renderDocumentList();
    updateItemsTable();
});

// Calcula Totais Finais
function updateTotals() {
    const totalCredit = currentItems
        .filter(item => item.tipo === 'CREDIT')
        .reduce((sum, item) => sum + parseFloat(item.valor), 0);
        
    const totalDebit = currentItems
        .filter(item => item.tipo === 'DEBIT')
        .reduce((sum, item) => sum + parseFloat(item.valor), 0);

    const liquidTotal = totalCredit - totalDebit;

    // Atualiza o display principal (total líquido)
    document.getElementById('liquid-total-display').textContent = `R$ ${liquidTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    
    return { totalCredit, totalDebit, liquidTotal };
}

// ==================== FUNÇÕES DE GERENCIAMENTO DE ITENS (TABELA DINÂMICA) ====================

document.getElementById('add-credit-btn').addEventListener('click', () => addItem('CREDIT'));
document.getElementById('add-debit-btn').addEventListener('click', () => addItem('DEBIT'));

function addItem(type) {
    const descriptionInput = document.getElementById(type === 'CREDIT' ? 'credit-description' : 'debit-description');
    const valueInput = document.getElementById(type === 'CREDIT' ? 'credit-value' : 'debit-value');

    const descricao = descriptionInput.value.trim();
    let valor = parseFloat(valueInput.value);

    // Validação de preenchimento
    if (!descricao || isNaN(valor) || valor <= 0) {
        alert("Por favor, preencha a Descrição e o Valor (deve ser maior que zero) antes de adicionar.");
        return;
    }

    const newItem = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 5), // ID único
        tipo: type,
        descricao,
        valor: valor.toFixed(2),
    };

    currentItems.push(newItem);
    updateItemsTable();

    // Limpa campos para próxima inserção
    descriptionInput.value = '';
    valueInput.value = '';
    descriptionInput.focus();
}

function removeItem(id) {
    if (!confirm('Tem certeza que deseja remover este item?')) return;
    
    currentItems = currentItems.filter(item => item.id !== id);
    updateItemsTable();
}

function updateItemsTable() {
    const tableBody = document.querySelector('#items-table tbody');
    tableBody.innerHTML = '';
    
    if (currentItems.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center" style="color: var(--secondary-color);">Nenhum valor adicionado.</td></tr>';
        updateTotals(); 
        return;
    }

    currentItems.forEach((item, index) => {
        const row = tableBody.insertRow();
        const valorFormatado = parseFloat(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        const tipoLabel = item.tipo === 'CREDIT' ? 'Crédito' : 'Débito';
        const color = item.tipo === 'CREDIT' ? 'var(--success-color)' : 'var(--danger-color)';

        row.innerHTML = `
            <td class="text-center">${index + 1}</td>
            <td><strong style="color: ${color};">${tipoLabel}</strong></td>
            <td>${item.descricao}</td>
            <td class="text-right" style="color: ${color}; font-weight: 700;">R$ ${valorFormatado}</td>
            <td class="text-center"><button type="button" class="btn btn-action btn-danger" onclick="removeItem('${item.id}')">Remover</button></td>
        `;
    });
    
    updateTotals(); // Recalcula totais finais
}

// ==================== FUNÇÕES CRUD (CREATE, READ, UPDATE) ====================

document.getElementById('receivable-form').addEventListener('submit', function(e) {
    e.preventDefault();

    if (!e.target.checkValidity()) {
        return;
    }

    if (currentItems.length === 0) {
        alert('Adicione pelo menos um valor (Crédito ou Débito) à nota antes de salvar.');
        return;
    }
    
    const { totalCredit, totalDebit, liquidTotal } = updateTotals();

    const form = e.target;
    const documentId = form.dataset.editingId;
    
    const newDocument = {
        id: documentId ? documentId : Date.now().toString(),
        tipo: 'NOTA_RECEBIVEIS',
        dataCriacao: new Date().toISOString().split('T')[0],
        
        noteName: document.getElementById('note-name').value,

        // Itens e Totais
        items: [...currentItems],
        totalCredit: totalCredit.toFixed(2),
        totalDebit: totalDebit.toFixed(2),
        liquidTotal: liquidTotal.toFixed(2),
    };

    let documents = getDocuments();

    if (documentId) {
        documents = documents.map(doc => doc.id === documentId ? newDocument : doc);
        alert('Nota atualizada com sucesso!');
        form.removeAttribute('data-editing-id');
        document.getElementById('save-btn').textContent = 'Salvar Nota (C/U)';
    } else {
        documents.push(newDocument);
        alert('Nota salva com sucesso!');
    }
    
    saveDocuments(documents);
    renderDocumentList();
    
    // Limpa o estado da tabela e prepara para nova
    clearForm(form);
});

// Limpar Formulário
document.getElementById('clear-form-btn').addEventListener('click', function() {
    clearForm(document.getElementById('receivable-form'));
});

function clearForm(form) {
    form.reset();
    form.removeAttribute('data-editing-id');
    document.getElementById('save-btn').textContent = 'Salvar Nota (C/U)';
    
    // LIMPA O ESTADO GLOBAL de itens
    currentItems = [];
    updateItemsTable();
    updateTotals(); 
}


// UPDATE (Carregar dados para Edição)
function editDocument(id) {
    const documents = getDocuments();
    const doc = documents.find(d => d.id === id);

    if (!doc) {
        alert('Documento não encontrado.');
        return;
    }

    // Preenche nome
    document.getElementById('note-name').value = doc.noteName || '';
    
    // ITENS
    currentItems = doc.items || [];
    updateItemsTable(); 

    // Seta estado de edição
    const form = document.getElementById('receivable-form');
    form.setAttribute('data-editing-id', id);
    document.getElementById('save-btn').textContent = 'Atualizar Nota (U)';
    
    window.scrollTo(0, 0); 
}

// READ (Renderizar a Lista de Documentos)
function renderDocumentList() {
    const list = document.getElementById('document-list');
    list.innerHTML = '';
    const documents = getDocuments();

    if (documents.length === 0) {
        list.innerHTML = '<li>Nenhuma nota de recebíveis salva.</li>';
        return;
    }

    documents.forEach(doc => {
        const li = document.createElement('li');
        const total = parseFloat(doc.liquidTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        
        const noteName = doc.noteName || 'Nota Sem Nome';

        li.innerHTML = `
            <div class="info">
                <span><strong>NOTA RECEBÍVEIS #${doc.id.substring(8)}</strong> - Ref: ${noteName} | Total Líquido: R$ ${total}</span>
            </div>
            <div class="actions">
                <button class="btn btn-action btn-primary" onclick="editDocument('${doc.id}')">Editar</button>
                <button class="btn btn-action btn-danger" onclick="deleteDocument('${doc.id}')">Remover</button>
                <button class="btn btn-action btn-primary" style="background: var(--success-color);" onclick="generateAndDownloadPDF('${doc.id}')">Baixar PDF</button>
            </div>
        `;
        list.appendChild(li);
    });
}

// DELETE (Excluir Documento)
function deleteDocument(id) {
    if (!confirm('Tem certeza que deseja excluir esta nota de recebíveis?')) return;

    let documents = getDocuments();
    documents = documents.filter(doc => doc.id !== id);
    saveDocuments(documents);
    renderDocumentList();
    alert('Nota de recebíveis excluída.');
}


// ==================== FUNÇÃO DE EXPORTAÇÃO PDF ====================

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
    
    // Título
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text("NOTA DE RECEBÍVEIS", margin, y); 
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Nº Documento: #${doc.id.substring(8)}`, margin + width, y, { align: 'right' }); 
    y += lineHeight;
    pdf.text(`Referência: ${doc.noteName || 'Não Informada'}`, margin, y);
    pdf.text(`Data: ${formatDate(doc.dataCriacao)}`, margin + width, y, { align: 'right' });
    y += lineHeight * 2;
    
    // 1. Tabela de Itens (Unificada)
    
    const tableStartY = y;
    let tableCurrentY = y;
    const headerHeight = 7;
    const borderRadius = 2;
    
    // Configurações do cabeçalho
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    
    // Preenche a área do cabeçalho
    pdf.setFillColor(200, 220, 240); 
    pdf.rect(margin, tableCurrentY - headerHeight, width, headerHeight, 'F'); 

    // Adiciona texto do cabeçalho
    pdf.text("Nº", margin + 2, tableCurrentY - 2);
    pdf.text("TIPO", margin + 15, tableCurrentY - 2);
    pdf.text("DESCRIÇÃO", margin + 45, tableCurrentY - 2);
    pdf.text("VALOR (R$)", margin + width - 1, tableCurrentY - 2, { align: 'right' });
    tableCurrentY += lineHeight;

    // Linhas de Itens
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    if (doc.items && doc.items.length > 0) {
        // Ordena para exibir Créditos primeiro
        const sortedItems = [...doc.items].sort((a, b) => {
            if (a.tipo === 'CREDIT' && b.tipo === 'DEBIT') return -1;
            if (a.tipo === 'DEBIT' && b.tipo === 'CREDIT') return 1;
            return 0;
        });

        sortedItems.forEach((item, index) => {
            if (tableCurrentY > 260) { 
                pdf.addPage();
                tableCurrentY = 15 + headerHeight; 
                tableStartY = 15;
                // Recria o cabeçalho em nova página
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'bold');
                pdf.setFillColor(200, 220, 240); 
                pdf.rect(margin, tableCurrentY - headerHeight, width, headerHeight, 'F'); 
                pdf.text("Nº", margin + 2, tableCurrentY - 2);
                pdf.text("TIPO", margin + 15, tableCurrentY - 2);
                pdf.text("DESCRIÇÃO", margin + 45, tableCurrentY - 2);
                pdf.text("VALOR (R$)", margin + width - 1, tableCurrentY - 2, { align: 'right' });
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'normal');
            }

            const valorFormatado = parseFloat(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            const tipoLabel = item.tipo === 'CREDIT' ? 'Crédito (+)' : 'Débito (-) ';
            const color = item.tipo === 'CREDIT' ? [0, 150, 0] : [200, 0, 0];

            pdf.text((index + 1).toString(), margin + 2, tableCurrentY);
            
            pdf.setTextColor(color[0], color[1], color[2]);
            pdf.text(tipoLabel, margin + 15, tableCurrentY);

            pdf.setTextColor(0, 0, 0); // Volta para preto
            pdf.text(item.descricao, margin + 45, tableCurrentY);
            
            pdf.setTextColor(color[0], color[1], color[2]);
            pdf.text(valorFormatado, margin + width - 1, tableCurrentY, { align: 'right' });
            
            // Linha fina de separação entre itens
            pdf.setLineWidth(0.1); 
            pdf.setDrawColor(150, 150, 150); 
            pdf.line(margin, tableCurrentY + lineHeight * 0.5, margin + width, tableCurrentY + lineHeight * 0.5);
            
            tableCurrentY += lineHeight;
        });
        pdf.setTextColor(0, 0, 0); // Reset cor
    } else {
        pdf.text("Nenhum valor informado.", margin + 1, tableCurrentY);
        tableCurrentY += lineHeight * 2;
    }

    // Desenha o Contorno da Tabela
    const tableTotalHeight = tableCurrentY - (tableStartY - headerHeight); 

    pdf.setDrawColor(0, 0, 0); 
    pdf.setLineWidth(0.2); 
    
    pdf.rect(margin, tableStartY - headerHeight, width, tableTotalHeight, 'S', borderRadius); 

    // Desenha linha mais grossa separando o cabeçalho dos itens
    pdf.setLineWidth(0.4); 
    pdf.line(margin, tableStartY - headerHeight + headerHeight, margin + width, tableStartY - headerHeight + headerHeight); 
    
    y = tableCurrentY + lineHeight;
    
    // 2. Resumo dos Totais
    
    const totalCreditFormatado = parseFloat(doc.totalCredit).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const totalDebitFormatado = parseFloat(doc.totalDebit).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const liquidTotalFormatado = parseFloat(doc.liquidTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');

    pdf.text("TOTAL DE CRÉDITOS:", margin + 100, y, { align: 'right' });
    pdf.setTextColor(0, 150, 0);
    pdf.text(`R$ ${totalCreditFormatado}`, margin + width, y, { align: 'right' });
    y += lineHeight;

    pdf.setTextColor(0, 0, 0);
    pdf.text("TOTAL DE DÉBITOS:", margin + 100, y, { align: 'right' });
    pdf.setTextColor(200, 0, 0);
    pdf.text(`R$ ${totalDebitFormatado}`, margin + width, y, { align: 'right' });
    y += lineHeight + 3; 

    // Linha de separação do total líquido
    pdf.setLineWidth(0.5);
    pdf.setDrawColor(0, 0, 0);
    pdf.line(margin + 100, y - 1, margin + width, y - 1);
    
    // Total Líquido
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 150);
    pdf.text("TOTAL LÍQUIDO A RECEBER:", margin + 100, y + 2, { align: 'right' });
    pdf.text(`R$ ${liquidTotalFormatado}`, margin + width, y + 2, { align: 'right' });
    y += lineHeight * 2;


    pdf.save(`NOTA_RECEBIVEIS_${doc.id.substring(8)}.pdf`);
}