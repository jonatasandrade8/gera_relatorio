// ==================== CONFIGURAÇÕES E UTILIDADES ====================
const LOCAL_STORAGE_KEY = 'purchase_requisition_data'; // Chave principal de documentos
const REQUESTER_DETAILS_KEY = 'requisition_requester_details'; // Chave para persistir dados do requisitante

// ORDEM DEFINIDA DOS SETORES PARA O PDF
const SECTOR_ORDER = ["Mercearia", "Hortifruti", "Frios", "Carnes", "Produtos de Limpeza", "Outros"];

// VARIÁVEIS GLOBAIS
let currentRequisitionItems = []; 
let currentRequesterDetails = {
    companyName: '',
    requesterName: '',
    contactInfo: ''
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

// ==================== LÓGICA DE PERSISTÊNCIA DO REQUISITANTE ====================

function saveRequesterDetails() {
    currentRequesterDetails.companyName = document.getElementById('company-name').value;
    currentRequesterDetails.requesterName = document.getElementById('requester-name').value;
    currentRequesterDetails.contactInfo = document.getElementById('contact-info').value;

    localStorage.setItem(REQUESTER_DETAILS_KEY, JSON.stringify(currentRequesterDetails));
}

function loadRequesterDetails() {
    const storedData = localStorage.getItem(REQUESTER_DETAILS_KEY);
    if (!storedData) return;

    const data = JSON.parse(storedData);
    
    currentRequesterDetails = data;
    
    if (data.companyName) document.getElementById('company-name').value = data.companyName;
    if (data.requesterName) document.getElementById('requester-name').value = data.requesterName;
    if (data.contactInfo) document.getElementById('contact-info').value = data.contactInfo;
}

// ==================== INICIALIZAÇÃO E EVENTOS ====================
document.addEventListener('DOMContentLoaded', () => {
    // Carrega os dados do requisitante ao carregar a página
    loadRequesterDetails(); 
    
    // Listeners para salvar detalhes (ex: ao sair do campo)
    document.getElementById('company-name').addEventListener('blur', saveRequesterDetails);
    document.getElementById('requester-name').addEventListener('blur', saveRequesterDetails);
    document.getElementById('contact-info').addEventListener('blur', saveRequesterDetails);

    renderDocumentList();
    updateItemsTable();
});

// ==================== FUNÇÕES DE GERENCIAMENTO DE ITENS (TABELA DINÂMICA) ====================

document.getElementById('add-item-btn').addEventListener('click', addItem);

function addItem() {
    const setorInput = document.getElementById('item-sector');
    const produtoInput = document.getElementById('item-product');
    const quantidadeInput = document.getElementById('item-quantity');

    const setor = setorInput.value;
    const produto = produtoInput.value.trim();
    const quantidade = parseInt(quantidadeInput.value);

    // Validação de preenchimento (incluindo o setor)
    if (!setor || !produto || isNaN(quantidade) || quantidade <= 0) {
        alert("Por favor, preencha o Setor, o Produto e a Quantidade (deve ser maior que zero) antes de adicionar.");
        return;
    }

    const newItem = {
        setor, // NOVO: Armazena o setor
        produto,
        quantidade
    };

    currentRequisitionItems.push(newItem);
    updateItemsTable();

    // Limpa campos para próxima inserção (mantém o setor)
    produtoInput.value = '';
    quantidadeInput.value = '1';
    produtoInput.focus();
}

function removeItem(index) {
    if (!confirm('Tem certeza que deseja remover este item?')) return;
    currentRequisitionItems.splice(index, 1);
    updateItemsTable();
}

function updateItemsTable() {
    const tableBody = document.querySelector('#items-table tbody');
    tableBody.innerHTML = '';

    if (currentRequisitionItems.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center" style="color: var(--secondary-color);">Nenhum item adicionado à requisição.</td></tr>';
        return;
    }

    currentRequisitionItems.forEach((item, index) => {
        const row = tableBody.insertRow();
        
        row.innerHTML = `
            <td class="text-center">${index + 1}</td>
            <td>${item.setor}</td>
            <td>${item.produto}</td>
            <td class="text-right">${item.quantidade}</td>
            <td class="text-center"><button type="button" class="btn btn-action btn-danger" onclick="removeItem(${index})">Remover</button></td>
        `;
    });
}

// ==================== FUNÇÕES CRUD (CREATE, READ, UPDATE) ====================

document.getElementById('requisition-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // A única validação obrigatória é a existência de itens
    if (currentRequisitionItems.length === 0) {
        alert('Adicione pelo menos um item à requisição antes de salvar.');
        return;
    }
    
    // Salva detalhes do requisitante
    saveRequesterDetails(); 

    const form = e.target;
    const documentId = form.dataset.editingId;
    
    const newDocument = {
        id: documentId ? documentId : Date.now().toString(),
        tipo: 'REQUISICAO_COMPRA',
        dataCriacao: new Date().toISOString().split('T')[0],
        
        // Detalhes do Requisitante/Empresa
        companyName: document.getElementById('company-name').value,
        requesterName: document.getElementById('requester-name').value,
        contactInfo: document.getElementById('contact-info').value,
        reason: document.getElementById('reason').value,

        // Itens
        items: [...currentRequisitionItems],
    };

    let documents = getDocuments();

    if (documentId) {
        documents = documents.map(doc => doc.id === documentId ? newDocument : doc);
        alert('Requisição atualizada com sucesso!');
        form.removeAttribute('data-editing-id');
        document.getElementById('save-btn').textContent = 'Salvar Requisição (C/U)';
    } else {
        documents.push(newDocument);
        alert('Requisição salva com sucesso!');
    }
    
    saveDocuments(documents);
    renderDocumentList();
    
    // Limpa o estado da tabela e prepara para nova lista
    clearForm(form);
});

// Limpar Formulário
document.getElementById('clear-form-btn').addEventListener('click', function() {
    clearForm(document.getElementById('requisition-form'));
});

function clearForm(form) {
    form.reset();
    form.removeAttribute('data-editing-id');
    document.getElementById('save-btn').textContent = 'Salvar Requisição (C/U)';
    
    // LIMPA O ESTADO GLOBAL de itens
    currentRequisitionItems = [];
    updateItemsTable();

    // Recarrega os detalhes do requisitante para persistência
    loadRequesterDetails(); 
}


// UPDATE (Carregar dados para Edição)
function editDocument(id) {
    const documents = getDocuments();
    const doc = documents.find(d => d.id === id);

    if (!doc) {
        alert('Documento não encontrado.');
        return;
    }

    // Preenche detalhes do requisitante
    document.getElementById('company-name').value = doc.companyName || '';
    document.getElementById('requester-name').value = doc.requesterName || '';
    document.getElementById('contact-info').value = doc.contactInfo || '';
    document.getElementById('reason').value = doc.reason || '';
    
    // Salva os detalhes do requisitante atual para persistência
    saveRequesterDetails(); 

    // ITENS
    currentRequisitionItems = doc.items || [];
    updateItemsTable(); 

    // Seta estado de edição
    const form = document.getElementById('requisition-form');
    form.setAttribute('data-editing-id', id);
    document.getElementById('save-btn').textContent = 'Atualizar Requisição (U)';
    
    window.scrollTo(0, 0); 
}

// READ (Renderizar a Lista de Documentos)
function renderDocumentList() {
    const list = document.getElementById('document-list');
    list.innerHTML = '';
    const documents = getDocuments();

    if (documents.length === 0) {
        list.innerHTML = '<li>Nenhuma requisição de compra salva.</li>';
        return;
    }

    documents.forEach(doc => {
        const li = document.createElement('li');
        
        const empresaDisplay = doc.companyName || '[Empresa Não Informada]';
        const requisitanteDisplay = doc.requesterName || '[Requisitante Não Informado]';

        li.innerHTML = `
            <div class="info">
                <span><strong>REQ #${doc.id.substring(8)}</strong> - Empresa: ${empresaDisplay} | Solicitante: ${requisitanteDisplay}</span>
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
    if (!confirm('Tem certeza que deseja excluir esta requisição de compra?')) return;

    let documents = getDocuments();
    documents = documents.filter(doc => doc.id !== id);
    saveDocuments(documents);
    renderDocumentList();
    alert('Requisição de compra excluída.');
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
    
    // 1. Cabeçalho
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text("REQUISIÇÃO DE COMPRA", margin, y); 
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`ID: #${doc.id.substring(8)}`, margin + width, y, { align: 'right' }); 
    y += lineHeight * 2;
    
    // 2. Detalhes do Requisitante/Empresa
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text("DADOS DO SOLICITANTE", margin, y);
    pdf.line(margin, y + 1, margin + width, y + 1);
    y += lineHeight;

    pdf.setFont('helvetica', 'normal');
    
    // Usa "Não Informado" ou a informação
    const company = doc.companyName || 'Não Informado';
    const requester = doc.requesterName || 'Não Informado';
    const contact = doc.contactInfo || 'Não Informado';

    pdf.text(`Empresa: ${company}`, margin, y);
    pdf.text(`Requisitante: ${requester}`, margin + width / 2, y);
    y += lineHeight;

    pdf.text(`Contato: ${contact}`, margin, y);
    pdf.text(`Data: ${formatDate(doc.dataCriacao)}`, margin + width / 2, y);
    y += lineHeight;

    if (doc.reason) {
        pdf.text(`Motivo/Obs: ${doc.reason}`, margin, y);
        y += lineHeight;
    }
    y += lineHeight * 2;


    // 3. Agrupamento dos Itens por Setor
    
    // Cria um objeto para agrupar os itens
    const groupedItems = doc.items.reduce((acc, item) => {
        const sector = item.setor || "Outros"; // Usa "Outros" como fallback
        if (!acc[sector]) {
            acc[sector] = [];
        }
        acc[sector].push(item);
        return acc;
    }, {});
    
    // Ordena os setores conforme a lista predefinida
    const sectorsToPrint = SECTOR_ORDER.filter(sector => groupedItems[sector]);


    // 4. Criação das Tabelas por Setor
    const headerHeight = 7;
    const borderRadius = 2;
    const tableHeaderColor = [220, 230, 240]; // Azul claro
    const tableLineColor = [150, 150, 150]; // Cinza
    
    sectorsToPrint.forEach((sectorName) => {
        const items = groupedItems[sectorName];
        
        // Se a próxima tabela for estourar o limite, cria uma nova página
        if (y + 30 > 280) { // Estima 30mm para cabeçalho + pelo menos 2 itens
            pdf.addPage();
            y = 15;
        }

        // Título do Setor
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(sectorName.toUpperCase(), margin, y);
        y += lineHeight;

        // Início da Tabela
        const tableStartY = y;
        let tableCurrentY = y;
        
        // Cabeçalho
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        
        pdf.setFillColor(tableHeaderColor[0], tableHeaderColor[1], tableHeaderColor[2]); 
        pdf.rect(margin, tableCurrentY - headerHeight, width, headerHeight, 'F'); 

        pdf.text("Nº", margin + 2, tableCurrentY - 2);
        pdf.text("PRODUTO / SERVIÇO", margin + 20, tableCurrentY - 2);
        pdf.text("QUANTIDADE", margin + width - 10, tableCurrentY - 2, { align: 'right' });
        tableCurrentY += lineHeight;

        // Linhas de Itens
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        
        items.forEach((item, index) => {
            // Se o item não couber, adiciona nova página e recria cabeçalho
            if (tableCurrentY > 270) { 
                pdf.addPage();
                tableCurrentY = 15 + headerHeight; 
                tableStartY = 15;
                
                // Recria o Título do Setor
                pdf.setFontSize(14);
                pdf.setFont('helvetica', 'bold');
                pdf.text(sectorName.toUpperCase(), margin, tableCurrentY - lineHeight * 2);

                // Recria o cabeçalho da tabela
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'bold');
                pdf.setFillColor(tableHeaderColor[0], tableHeaderColor[1], tableHeaderColor[2]); 
                pdf.rect(margin, tableCurrentY - headerHeight, width, headerHeight, 'F'); 
                pdf.text("Nº", margin + 2, tableCurrentY - 2);
                pdf.text("PRODUTO / SERVIÇO", margin + 20, tableCurrentY - 2);
                pdf.text("QUANTIDADE", margin + width - 10, tableCurrentY - 2, { align: 'right' });
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'normal');
            }

            pdf.text((index + 1).toString(), margin + 2, tableCurrentY);
            pdf.text(item.produto, margin + 20, tableCurrentY);
            pdf.text(item.quantidade.toString(), margin + width - 10, tableCurrentY, { align: 'right' });
            
            // Linha fina de separação entre itens
            pdf.setLineWidth(0.1); 
            pdf.setDrawColor(tableLineColor[0], tableLineColor[1], tableLineColor[2]); 
            pdf.line(margin, tableCurrentY + lineHeight * 0.5, margin + width, tableCurrentY + lineHeight * 0.5);
            
            tableCurrentY += lineHeight;
        });

        // Desenha o Contorno da Tabela
        const tableTotalHeight = tableCurrentY - (tableStartY - headerHeight); 

        pdf.setDrawColor(0, 0, 0); 
        pdf.setLineWidth(0.2); 
        
        pdf.rect(margin, tableStartY - headerHeight, width, tableTotalHeight, 'S', borderRadius); 

        // Desenha linha mais grossa separando o cabeçalho dos itens
        pdf.setLineWidth(0.4); 
        pdf.line(margin, tableStartY - headerHeight + headerHeight, margin + width, tableStartY - headerHeight + headerHeight); 
        
        y = tableCurrentY + lineHeight; // Espaçamento após a tabela
    });
    
    // 5. Campo para Assinatura (Fica fixo na parte inferior da última página ou em uma nova)
    
    // Garante que a assinatura apareça pelo menos 30mm acima do rodapé (280)
    if (y + 30 > 280) {
        pdf.addPage();
    }
    
    const signatureY = 250; 

    // Linha de assinatura
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.line(margin + 50, signatureY, margin + width - 50, signatureY);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text("Assinatura do Solicitante", margin + width / 2, signatureY + 4, { align: 'center' });


    pdf.save(`REQUISICAO_COMPRA_${doc.id.substring(8)}.pdf`);
}