// ==================== CONFIGURAÇÕES E UTILIDADES ====================
const LOCAL_STORAGE_KEY = 'shopping_list_data'; // Chave principal de documentos
const LIST_DETAILS_KEY = 'shopping_list_details'; // Chave para persistir detalhes da lista (Nome/Supermercado)

// VARIÁVEIS GLOBAIS
let currentListItems = []; 
let currentListDetails = {
    listName: '',
    supermarket: ''
};

// Função auxiliar para obter documentos salvos
function getDocuments() {
    const docs = localStorage.getItem(LOCAL_STORAGE_KEY);
    return docs ? JSON.parse(docs) : [];
}

// Função auxiliar para salvar documentos
function saveDocuments(documents) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(documents));
}

// ==================== LÓGICA DE PERSISTÊNCIA DE DETALHES ====================

function saveListDetails() {
    currentListDetails.listName = document.getElementById('list-name').value;
    currentListDetails.supermarket = document.getElementById('supermarket').value;

    localStorage.setItem(LIST_DETAILS_KEY, JSON.stringify(currentListDetails));
}

function loadListDetails() {
    const storedData = localStorage.getItem(LIST_DETAILS_KEY);
    if (!storedData) return;

    const data = JSON.parse(storedData);
    
    currentListDetails = data;
    
    if (data.listName) document.getElementById('list-name').value = data.listName;
    if (data.supermarket) document.getElementById('supermarket').value = data.supermarket;
}

// ==================== INICIALIZAÇÃO E EVENTOS DE DATA/TOTAIS ====================
document.addEventListener('DOMContentLoaded', () => {
    // Carrega os detalhes da lista (Nome/Supermercado) ao carregar a página
    loadListDetails(); 
    
    // Listeners para salvar detalhes (ex: ao sair do campo)
    document.getElementById('list-name').addEventListener('blur', saveListDetails);
    document.getElementById('supermarket').addEventListener('blur', saveListDetails);

    updateTotals();
    renderDocumentList();
    updateItemsTable();
});

// Calcula Data de Validade e Totais Finais
function updateTotals() {
    const totalGeral = currentListItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);

    // Atualiza o display principal (total geral)
    document.getElementById('grand-total-display').textContent = `R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

// ==================== FUNÇÕES DE GERENCIAMENTO DE ITENS (TABELA DINÂMICA) ====================

document.getElementById('add-item-btn').addEventListener('click', addItem);

function addItem() {
    const produtoInput = document.getElementById('item-product');
    const quantidadeInput = document.getElementById('item-quantity');
    const pesoInput = document.getElementById('item-weight');
    const valorInput = document.getElementById('item-price');

    const produto = produtoInput.value.trim();
    const quantidade = parseFloat(quantidadeInput.value) || 0;
    const peso = parseFloat(pesoInput.value) || 0;
    const preco = parseFloat(valorInput.value);

    // Validação de preenchimento
    if (!produto || isNaN(preco) || preco <= 0 || (quantidade <= 0 && peso <= 0)) {
        alert("Por favor, preencha o Produto, Preço e pelo menos a Quantidade ou o Peso antes de adicionar.");
        return;
    }

    // Cálculo do Subtotal: (Quantidade * Preço) + (Peso * Preço)
    // Assumimos que o "Preço" é a base (unidade ou Kg)
    const subtotal = ((quantidade * preco) + (peso * preco)).toFixed(2);

    const newItem = {
        produto,
        quantidade,
        peso: peso.toFixed(2),
        preco: preco.toFixed(2),
        subtotal
    };

    currentListItems.push(newItem);
    updateItemsTable();

    // Limpa campos para próxima inserção
    produtoInput.value = '';
    quantidadeInput.value = '1';
    pesoInput.value = '0.00';
    valorInput.value = '0.01';
    produtoInput.focus();
}

function removeItem(index) {
    if (!confirm('Tem certeza que deseja remover este item?')) return;
    currentListItems.splice(index, 1);
    updateItemsTable();
}

function updateItemsTable() {
    const tableBody = document.querySelector('#items-table tbody');
    tableBody.innerHTML = '';
    let totalGeral = 0;

    if (currentListItems.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center" style="color: var(--secondary-color);">Nenhum item adicionado à lista.</td></tr>';
        updateTotals(); // Garante que o total geral seja zerado
        return;
    }

    currentListItems.forEach((item, index) => {
        totalGeral += parseFloat(item.subtotal);

        const row = tableBody.insertRow();
        const subtotalFormatado = parseFloat(item.subtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        const precoFormatado = parseFloat(item.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        const pesoDisplay = parseFloat(item.peso) > 0 ? parseFloat(item.peso).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '--';

        row.innerHTML = `
            <td>${item.produto}</td>
            <td class="text-right">${item.quantidade}</td>
            <td class="text-right">${pesoDisplay}</td>
            <td class="text-right">R$ ${precoFormatado}</td>
            <td class="text-right" style="font-weight: 700; color: var(--success-color);">R$ ${subtotalFormatado}</td>
            <td class="text-center"><button type="button" class="btn btn-action btn-danger" onclick="removeItem(${index})">Remover</button></td>
        `;
    });
    
    updateTotals(); // Recalcula totais finais
}

// ==================== FUNÇÕES CRUD (CREATE, READ, UPDATE) ====================

document.getElementById('shopping-list-form').addEventListener('submit', function(e) {
    e.preventDefault();

    if (currentListItems.length === 0) {
        alert('Adicione pelo menos um item à lista antes de salvar.');
        return;
    }
    
    // Salva detalhes da lista
    saveListDetails(); 

    const form = e.target;
    const documentId = form.dataset.editingId;
    
    const totalGeral = currentListItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0).toFixed(2);
    
    const newDocument = {
        id: documentId ? documentId : Date.now().toString(),
        tipo: 'LISTA_COMPRAS',
        dataCriacao: new Date().toISOString().split('T')[0],
        
        // Detalhes da Lista
        listName: document.getElementById('list-name').value,
        supermarket: document.getElementById('supermarket').value,

        // Itens e Total
        items: [...currentListItems],
        totalGeral: totalGeral,
    };

    let documents = getDocuments();

    if (documentId) {
        documents = documents.map(doc => doc.id === documentId ? newDocument : doc);
        alert('Lista atualizada com sucesso!');
        form.removeAttribute('data-editing-id');
        document.getElementById('save-btn').textContent = 'Salvar Lista (C/U)';
    } else {
        documents.push(newDocument);
        alert('Lista salva com sucesso!');
    }
    
    saveDocuments(documents);
    renderDocumentList();
    
    // Limpa o estado da tabela e prepara para nova lista
    clearForm(form);
});

// Limpar Formulário
document.getElementById('clear-form-btn').addEventListener('click', function() {
    clearForm(document.getElementById('shopping-list-form'));
});

function clearForm(form) {
    form.reset();
    form.removeAttribute('data-editing-id');
    document.getElementById('save-btn').textContent = 'Salvar Lista (C/U)';
    
    // LIMPA O ESTADO GLOBAL de itens, mas mantém os detalhes da lista (Nome/Supermercado)
    currentListItems = [];
    updateItemsTable();
    updateTotals(); 

    // Recarrega os detalhes da lista para persistência
    loadListDetails(); 
}


// UPDATE (Carregar dados para Edição)
function editDocument(id) {
    const documents = getDocuments();
    const doc = documents.find(d => d.id === id);

    if (!doc) {
        alert('Documento não encontrado.');
        return;
    }

    // Preenche detalhes da lista
    document.getElementById('list-name').value = doc.listName || '';
    document.getElementById('supermarket').value = doc.supermarket || '';
    
    // Salva os detalhes da lista atual para persistência (se o usuário sair da página)
    saveListDetails(); 

    // ITENS
    currentListItems = doc.items || [];
    updateItemsTable(); 

    // Seta estado de edição
    const form = document.getElementById('shopping-list-form');
    form.setAttribute('data-editing-id', id);
    document.getElementById('save-btn').textContent = 'Atualizar Lista (U)';
    
    window.scrollTo(0, 0); 
}

// READ (Renderizar a Lista de Documentos)
function renderDocumentList() {
    const list = document.getElementById('document-list');
    list.innerHTML = '';
    const documents = getDocuments();

    if (documents.length === 0) {
        list.innerHTML = '<li>Nenhuma lista de compras salva.</li>';
        return;
    }

    documents.forEach(doc => {
        const li = document.createElement('li');
        const total = parseFloat(doc.totalGeral).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        
        const nomeLista = doc.listName || 'Lista sem nome';
        const detalhes = doc.supermarket ? ` (${doc.supermarket})` : '';

        li.innerHTML = `
            <div class="info">
                <span><strong>${nomeLista}</strong>${detalhes} - Total: R$ ${total}</span>
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
    if (!confirm('Tem certeza que deseja excluir esta lista de compras?')) return;

    let documents = getDocuments();
    documents = documents.filter(doc => doc.id !== id);
    saveDocuments(documents);
    renderDocumentList();
    alert('Lista de compras excluída.');
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
    pdf.text("LISTA DE COMPRAS", margin, y); 
    y += lineHeight * 2;
    
    // Detalhes da Lista
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    if (doc.listName) {
        pdf.text(`Nome da Lista: ${doc.listName}`, margin, y);
        y += lineHeight;
    }
    if (doc.supermarket) {
        pdf.text(`Supermercado: ${doc.supermarket}`, margin, y);
        y += lineHeight;
    }
    pdf.text(`Data de Criação: ${doc.dataCriacao.split('-').reverse().join('/')}`, margin, y);
    y += lineHeight * 2;

    // 4. Tabela de Itens 
    
    const tableStartY = y;
    let tableCurrentY = y;
    const headerHeight = 7;
    const borderRadius = 2;
    
    // Configurações do cabeçalho
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    
    // 4a. Preenche a área do cabeçalho
    pdf.setFillColor(200, 220, 240); // Cor azul claro para o cabeçalho
    pdf.rect(margin, tableCurrentY - headerHeight, width, headerHeight, 'F'); 

    // 4b. Adiciona texto do cabeçalho
    // Largura das colunas (aproximada)
    const colProduto = 70;
    const colQtd = 25;
    const colPeso = 25;
    const colPreco = 35;
    const colTotal = 25;

    pdf.text("Produto", margin + 1, tableCurrentY - 2);
    pdf.text("Qtd", margin + colProduto + 5, tableCurrentY - 2, { align: 'right' });
    pdf.text("Peso (Kg/L)", margin + colProduto + colQtd + 5, tableCurrentY - 2, { align: 'right' });
    pdf.text("Preço Unit/Kg", margin + colProduto + colQtd + colPeso + 5, tableCurrentY - 2, { align: 'right' });
    pdf.text("TOTAL", margin + width - 1, tableCurrentY - 2, { align: 'right' });
    tableCurrentY += lineHeight;

    // 4c. Linhas de Itens
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    if (doc.items && doc.items.length > 0) {
        doc.items.forEach((item) => {
            if (tableCurrentY > 270) { 
                pdf.addPage();
                tableCurrentY = 15 + headerHeight; 
                tableStartY = 15;
                // Recria o cabeçalho em nova página
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'bold');
                pdf.setFillColor(200, 220, 240); 
                pdf.rect(margin, tableCurrentY - headerHeight, width, headerHeight, 'F'); 
                pdf.text("Produto", margin + 1, tableCurrentY - 2);
                pdf.text("Qtd", margin + colProduto + 5, tableCurrentY - 2, { align: 'right' });
                pdf.text("Peso (Kg/L)", margin + colProduto + colQtd + 5, tableCurrentY - 2, { align: 'right' });
                pdf.text("Preço Unit/Kg", margin + colProduto + colQtd + colPeso + 5, tableCurrentY - 2, { align: 'right' });
                pdf.text("TOTAL", margin + width - 1, tableCurrentY - 2, { align: 'right' });
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'normal');
            }

            const precoFormatado = parseFloat(item.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            const subtotalFormatado = parseFloat(item.subtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            const pesoDisplay = parseFloat(item.peso) > 0 ? parseFloat(item.peso).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '--';

            pdf.text(item.produto, margin + 1, tableCurrentY);
            pdf.text(item.quantidade.toString(), margin + colProduto + 5, tableCurrentY, { align: 'right' });
            pdf.text(pesoDisplay, margin + colProduto + colQtd + 5, tableCurrentY, { align: 'right' });
            pdf.text(`R$ ${precoFormatado}`, margin + colProduto + colQtd + colPeso + 5, tableCurrentY, { align: 'right' });
            pdf.text(`R$ ${subtotalFormatado}`, margin + width - 1, tableCurrentY, { align: 'right' });
            
            // Linha fina de separação entre itens
            pdf.setLineWidth(0.1); 
            pdf.setDrawColor(150, 150, 150); 
            pdf.line(margin, tableCurrentY + lineHeight * 0.5, margin + width, tableCurrentY + lineHeight * 0.5);
            
            tableCurrentY += lineHeight;
        });
    } else {
        pdf.text("Nenhum item adicionado à lista.", margin + 1, tableCurrentY);
        tableCurrentY += lineHeight * 2;
    }

    // 4d. Desenha o Contorno da Tabela (com bordas arredondadas)
    const tableTotalHeight = tableCurrentY - (tableStartY - headerHeight); 

    pdf.setDrawColor(0, 0, 0); 
    pdf.setLineWidth(0.2); 
    
    pdf.rect(margin, tableStartY - headerHeight, width, tableTotalHeight, 'S', borderRadius); 

    // Desenha linha mais grossa separando o cabeçalho dos itens
    pdf.setLineWidth(0.4); 
    pdf.line(margin, tableStartY - headerHeight + headerHeight, margin + width, tableStartY - headerHeight + headerHeight); 
    
    y = tableCurrentY;
    
    // 5. Rodapé e Total Geral
    y += lineHeight * 0.5;
    pdf.line(margin, y, margin + width, y); 
    y += lineHeight;

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text("TOTAL GERAL PREVISTO:", 140, y, { align: 'right' });
    pdf.text(`R$ ${parseFloat(doc.totalGeral).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 175, y, { align: 'right' });
    y += lineHeight;


    pdf.save(`LISTA_COMPRAS_${doc.id.substring(8)}.pdf`);
}