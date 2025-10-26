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
    contactInfo: '',
    logoBase64: '' // NOVO: Armazena o Base64 da logo
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

// ==================== LÓGICA DE PERSISTÊNCIA E LOGOMARCA ====================

// Funções para lidar com a persistência da Logomarca (Copiado do Recibo de Entrega)
function handleLogoUpload(file) {
    return new Promise((resolve) => {
        if (!file) {
            resolve(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result); 
        };
        reader.readAsDataURL(file);
    });
}

async function saveRequesterDetails() {
    currentRequesterDetails.companyName = document.getElementById('company-name').value;
    currentRequesterDetails.requesterName = document.getElementById('requester-name').value;
    currentRequesterDetails.contactInfo = document.getElementById('contact-info').value;

    // NOVO: Lógica da Logo
    const logoFile = document.getElementById('requester-logo').files[0];
    if (logoFile) {
        currentRequesterDetails.logoBase64 = await handleLogoUpload(logoFile);
    } 
    // Se não houver novo arquivo, o logoBase64 existente é mantido

    localStorage.setItem(REQUESTER_DETAILS_KEY, JSON.stringify(currentRequesterDetails));
    
    // Limpa o campo de arquivo para que ele não seja carregado novamente na próxima submissão
    if (logoFile) {
        document.getElementById('requester-logo').value = '';
    }
}

function loadRequesterDetails() {
    const storedData = localStorage.getItem(REQUESTER_DETAILS_KEY);
    if (!storedData) return;

    const data = JSON.parse(storedData);
    
    currentRequesterDetails = data;
    
    if (data.companyName) document.getElementById('company-name').value = data.companyName;
    if (data.requesterName) document.getElementById('requester-name').value = data.requesterName;
    if (data.contactInfo) document.getElementById('contact-info').value = data.contactInfo;

    // NOVO: Pré-visualização da logo
    const preview = document.getElementById('logo-preview');
    if (data.logoBase64) {
        preview.src = data.logoBase64;
        preview.style.display = 'block';
    } else {
        preview.src = '#';
        preview.style.display = 'none';
    }
}

// ==================== INICIALIZAÇÃO E EVENTOS ====================
document.addEventListener('DOMContentLoaded', () => {
    // Carrega os dados do requisitante e a logo
    loadRequesterDetails(); 
    
    // Listeners para salvar detalhes (ex: ao sair do campo)
    document.getElementById('company-name').addEventListener('blur', saveRequesterDetails);
    document.getElementById('requester-name').addEventListener('blur', saveRequesterDetails);
    document.getElementById('contact-info').addEventListener('blur', saveRequesterDetails);
    
    // Listener especial para salvar a logo assim que o arquivo for selecionado/processado
    document.getElementById('requester-logo').addEventListener('change', async function() {
        await saveRequesterDetails();
        loadRequesterDetails(); // Recarrega para atualizar a preview com o Base64 persistido
    });

    renderDocumentList();
    updateItemsTable();
});

// ... (Funções addItem, removeItem, updateItemsTable - permanecem inalteradas, exceto se você não tiver a última versão completa) ...

// ==================== FUNÇÕES CRUD (CREATE, READ, UPDATE) ====================

document.getElementById('requisition-form').addEventListener('submit', async function(e) { // Tornar async
    e.preventDefault();
    
    // Salva detalhes, incluindo a LOGO. PRECISA SER ASYNC AQUI!
    await saveRequesterDetails(); 
    loadRequesterDetails(); // Recarrega o Base64 atualizado para o objeto global

    // A única validação obrigatória é a existência de itens
    if (currentRequisitionItems.length === 0) {
        alert('Adicione pelo menos um item à requisição antes de salvar.');
        return;
    }
    
    // Recarrega os dados (incluindo logo) do objeto global atualizado
    // Note: usamos currentRequesterDetails, que foi atualizado por saveRequesterDetails e loadRequesterDetails

    const form = e.target;
    const documentId = form.dataset.editingId;
    
    const newDocument = {
        id: documentId ? documentId : Date.now().toString(),
        tipo: 'REQUISICAO_COMPRA',
        dataCriacao: new Date().toISOString().split('T')[0],
        
        // Detalhes do Requisitante/Empresa (incluindo o logoBase64)
        companyName: currentRequesterDetails.companyName,
        requesterName: currentRequesterDetails.requesterName,
        contactInfo: currentRequesterDetails.contactInfo,
        reason: document.getElementById('reason').value,
        logoBase64: currentRequesterDetails.logoBase64, // Inclui a logo Base64

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

// ... (Funções clearForm, editDocument, renderDocumentList, deleteDocument - editDocument agora também carrega o logoBase64 e chama loadRequesterDetails para o preview) ...

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
    
    // NOVO: Atualiza o objeto global de detalhes do requisitante com a logo
    currentRequesterDetails.logoBase64 = doc.logoBase64 || '';
    
    // Salva e recarrega para atualizar a preview da logo
    saveRequesterDetails(); 
    loadRequesterDetails(); 

    // ITENS
    currentRequisitionItems = doc.items || [];
    updateItemsTable(); 

    // Seta estado de edição
    const form = document.getElementById('requisition-form');
    form.setAttribute('data-editing-id', id);
    document.getElementById('save-btn').textContent = 'Atualizar Requisição (U)';
    
    window.scrollTo(0, 0); 
}

// Função para gerenciamento de itens (incluído para garantir a consistência no envio final)
document.getElementById('add-item-btn').addEventListener('click', addItem);

function addItem() {
    const setorInput = document.getElementById('item-sector');
    const produtoInput = document.getElementById('item-product');
    const unidadeInput = document.getElementById('item-unit'); 
    const quantidadeInput = document.getElementById('item-quantity');

    const setor = setorInput.value;
    const produto = produtoInput.value.trim();
    const unidade = unidadeInput.value; 
    const quantidade = parseInt(quantidadeInput.value);

    // Validação de preenchimento (incluindo o setor e unidade)
    if (!setor || !produto || !unidade || isNaN(quantidade) || quantidade <= 0) {
        alert("Por favor, preencha todos os campos (Setor, Produto, Unidade e Quantidade) antes de adicionar.");
        return;
    }

    const newItem = {
        setor, 
        produto,
        unidade, 
        quantidade
    };

    currentRequisitionItems.push(newItem);
    updateItemsTable();

    // Limpa campos para próxima inserção (mantém o setor)
    produtoInput.value = '';
    // unidadeInput.value = 'UN'; 
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
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center" style="color: var(--secondary-color);">Nenhum item adicionado à requisição.</td></tr>';
        return;
    }

    currentRequisitionItems.forEach((item, index) => {
        const row = tableBody.insertRow();
        
        row.innerHTML = `
            <td class="text-center">${index + 1}</td>
            <td>${item.setor}</td>
            <td>${item.produto}</td>
            <td>${item.unidade}</td>
            <td class="text-right">${item.quantidade}</td>
            <td class="text-center"><button type="button" class="btn btn-action btn-danger" onclick="removeItem(${index})">Remover</button></td>
        `;
    });
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

function deleteDocument(id) {
    if (!confirm('Tem certeza que deseja excluir esta requisição de compra?')) return;

    let documents = getDocuments();
    documents = documents.filter(doc => doc.id !== id);
    saveDocuments(documents);
    renderDocumentList();
    alert('Requisição de compra excluída.');
}


// ==================== FUNÇÃO DE EXPORTAÇÃO PDF (MODIFICADA) ====================

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
    
    // 1. Logomarca e Título
    
    const LOGO_HEIGHT = 20; // Altura máxima para a logo
    const LOGO_WIDTH = 50;  // Largura máxima para a logo
    const TITLE_START_Y = 15; // Posição inicial do topo

    if (doc.logoBase64) {
        try {
            const imgData = doc.logoBase64;
            const imgType = imgData.split(':')[1].split(';')[0].split('/')[1].toUpperCase(); // Ex: JPEG, PNG

            // Posiciona a logo à esquerda, no topo
            pdf.addImage(imgData, imgType, margin, TITLE_START_Y, LOGO_WIDTH, LOGO_HEIGHT);
            
            // Ajusta o 'y' para começar os dados da requisição após o espaço da logo
            y = TITLE_START_Y + LOGO_HEIGHT + 5; 

        } catch (error) {
            console.error("Erro ao adicionar logomarca ao PDF:", error);
            y = TITLE_START_Y; 
        }
    } else {
        y = TITLE_START_Y; 
    }
    
    // Título
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    // Se houver logo, centraliza o título verticalmente ao lado dela. Se não, usa o topo.
    const titleY = Math.max(y - 5, TITLE_START_Y + LOGO_HEIGHT / 2);
    pdf.text("REQUISIÇÃO DE COMPRA", margin + width / 2, titleY, { align: 'center' }); 
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`ID: #${doc.id.substring(8)}`, margin + width, titleY - 5, { align: 'right' }); 
    pdf.text(`Data: ${formatDate(doc.dataCriacao)}`, margin + width, titleY + 2, { align: 'right' });

    // Pula para a próxima seção
    y = y + lineHeight; 

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
    y += lineHeight;

    if (doc.reason) {
        pdf.text(`Motivo/Obs: ${doc.reason}`, margin, y);
        y += lineHeight;
    }
    y += lineHeight;


    // 3. Agrupamento dos Itens por Setor
    
    const groupedItems = doc.items.reduce((acc, item) => {
        const sector = item.setor || "Outros"; 
        if (!acc[sector]) {
            acc[sector] = [];
        }
        acc[sector].push(item);
        return acc;
    }, {});
    
    const sectorsToPrint = SECTOR_ORDER.filter(sector => groupedItems[sector]);


    // 4. Criação das Tabelas por Setor
    const headerHeight = 7;
    const borderRadius = 2;
    const tableHeaderColor = [220, 230, 240]; 
    const tableLineColor = [150, 150, 150]; 
    
    // Definição de Largura das Colunas
    const colItem = 10;
    const colProduto = 80; // Maior para caber a descrição
    const colUnit = 25; // NOVO: Largura da unidade
    const colQtd = 45 - colUnit; // Ajustado
    
    sectorsToPrint.forEach((sectorName) => {
        const items = groupedItems[sectorName];
        
        // Se a próxima tabela for estourar o limite, cria uma nova página
        // Estima 30mm para Título + Cabeçalho + pelo menos 2 itens
        if (y + 30 > 280) { 
            pdf.addPage();
            y = 15;
        }

        // Título do Setor (Fonte Reduzida)
        pdf.setFontSize(11); 
        pdf.setFont('helvetica', 'bold');
        pdf.text(sectorName.toUpperCase(), margin, y);
        y += lineHeight * 1.5; // Espaçamento aumentado para afastar da tabela

        // Início da Tabela
        const tableStartY = y;
        let tableCurrentY = y;
        
        // Cabeçalho da Tabela
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        
        pdf.setFillColor(tableHeaderColor[0], tableHeaderColor[1], tableHeaderColor[2]); 
        pdf.rect(margin, tableCurrentY - headerHeight, width, headerHeight, 'F'); 

        pdf.text("Nº", margin + 2, tableCurrentY - 2);
        pdf.text("PRODUTO / SERVIÇO", margin + colItem, tableCurrentY - 2);
        pdf.text("UN. MEDIDA", margin + colItem + colProduto, tableCurrentY - 2); // NOVO: Posição da Unidade
        pdf.text("QUANTIDADE", margin + width - 1, tableCurrentY - 2, { align: 'right' });
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
                pdf.setFontSize(11);
                pdf.setFont('helvetica', 'bold');
                pdf.text(sectorName.toUpperCase(), margin, tableCurrentY - lineHeight * 1.5);
                
                // Recria o cabeçalho da tabela
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'bold');
                pdf.setFillColor(tableHeaderColor[0], tableHeaderColor[1], tableHeaderColor[2]); 
                pdf.rect(margin, tableCurrentY - headerHeight, width, headerHeight, 'F'); 
                pdf.text("Nº", margin + 2, tableCurrentY - 2);
                pdf.text("PRODUTO / SERVIÇO", margin + colItem, tableCurrentY - 2);
                pdf.text("UN. MEDIDA", margin + colItem + colProduto, tableCurrentY - 2);
                pdf.text("QUANTIDADE", margin + width - 1, tableCurrentY - 2, { align: 'right' });
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'normal');
            }

            pdf.text((index + 1).toString(), margin + 2, tableCurrentY);
            pdf.text(item.produto, margin + colItem, tableCurrentY);
            pdf.text(item.unidade, margin + colItem + colProduto, tableCurrentY); // NOVO: Coluna da Unidade
            pdf.text(item.quantidade.toString(), margin + width - 1, tableCurrentY, { align: 'right' });
            
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
        
        y = tableCurrentY + lineHeight * 2; // Espaçamento maior entre tabelas de setor
    });
    
    // 5. Campo para Assinatura (Fica fixo na parte inferior da última página ou em uma nova)
    
    // Garante que a assinatura apareça pelo menos 30mm acima do rodapé (280)
    if (y + 30 > 280) {
        pdf.addPage();
        y = 15; // Nova margem superior
    }
    
    const signatureY = Math.max(y + 10, 250); // Garante que não suba demais ou desça do limite

    // Linha de assinatura
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.line(margin + 50, signatureY, margin + width - 50, signatureY);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text("Assinatura do Solicitante", margin + width / 2, signatureY + 4, { align: 'center' });


    pdf.save(`REQUISICAO_COMPRA_${doc.id.substring(8)}.pdf`);
}