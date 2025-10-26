// ==================== CONFIGURAÇÕES E UTILIDADES ====================
const LOCAL_STORAGE_KEY = 'delivery_receipt_data';
const EMITTER_DETAILS_KEY = 'delivery_emitter_details';
const CLIENT_DETAILS_KEY = 'delivery_client_details';

// VARIÁVEIS GLOBAIS
let currentItems = []; 
let currentEmitterDetails = { logoBase64: '' }; // Adicionado logoBase64
let currentClientDetails = {};

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

// ==================== LÓGICA DE PERSISTÊNCIA ====================

// Funções para lidar com a persistência da Logomarca
function handleLogoUpload(file) {
    return new Promise((resolve) => {
        if (!file) {
            resolve(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            // Salva o Base64 com o prefixo do tipo MIME
            resolve(e.target.result); 
        };
        reader.readAsDataURL(file);
    });
}

async function saveEmitterDetails() {
    currentEmitterDetails.company = document.getElementById('emitter-company').value;
    currentEmitterDetails.contact = document.getElementById('emitter-contact').value;
    currentEmitterDetails.address = document.getElementById('emitter-address').value;

    // Se houver um novo arquivo, processa e substitui o logoBase64
    const logoFile = document.getElementById('emitter-logo').files[0];
    if (logoFile) {
        currentEmitterDetails.logoBase64 = await handleLogoUpload(logoFile);
    } 
    // Se não houver novo arquivo, o logoBase64 existente é mantido.
    // Se o usuário salvar sem mexer no logo, o campo file fica vazio. 
    // Se ele quiser remover, teria que limpar o campo file explicitamente. (Não implementado, mas o padrão é manter)

    localStorage.setItem(EMITTER_DETAILS_KEY, JSON.stringify(currentEmitterDetails));
    
    // Limpa o campo de arquivo para que ele não seja carregado novamente na próxima submissão
    if (logoFile) {
        document.getElementById('emitter-logo').value = '';
    }
}

function loadEmitterDetails() {
    const storedData = localStorage.getItem(EMITTER_DETAILS_KEY);
    if (!storedData) return;
    const data = JSON.parse(storedData);
    currentEmitterDetails = data;
    
    if (data.company) document.getElementById('emitter-company').value = data.company;
    if (data.contact) document.getElementById('emitter-contact').value = data.contact;
    if (data.address) document.getElementById('emitter-address').value = data.address;

    // Pré-visualização da logo salva
    const preview = document.getElementById('logo-preview');
    if (data.logoBase64) {
        preview.src = data.logoBase64;
        preview.style.display = 'block';
    } else {
        preview.src = '#';
        preview.style.display = 'none';
    }
}

function saveClientDetails() {
    currentClientDetails.company = document.getElementById('client-company').value;
    currentClientDetails.contact = document.getElementById('client-contact').value;
    currentClientDetails.address = document.getElementById('client-address').value;

    localStorage.setItem(CLIENT_DETAILS_KEY, JSON.stringify(currentClientDetails));
}

function loadClientDetails() {
    const storedData = localStorage.getItem(CLIENT_DETAILS_KEY);
    if (!storedData) return;
    const data = JSON.parse(storedData);
    currentClientDetails = data;
    
    if (data.company) document.getElementById('client-company').value = data.company;
    if (data.contact) document.getElementById('client-contact').value = data.contact;
    if (data.address) document.getElementById('client-address').value = data.address;
}

// ==================== INICIALIZAÇÃO E EVENTOS DE DATA/TOTAIS ====================
document.addEventListener('DOMContentLoaded', () => {
    // Carrega os detalhes (incluindo logo)
    loadEmitterDetails(); 
    loadClientDetails();
    
    // Listeners para salvar detalhes (ao sair do campo)
    document.getElementById('emitter-company').addEventListener('blur', saveEmitterDetails);
    document.getElementById('emitter-contact').addEventListener('blur', saveEmitterDetails);
    document.getElementById('emitter-address').addEventListener('blur', saveEmitterDetails);
    
    // Listener especial para salvar a logo assim que o arquivo for selecionado/processado
    document.getElementById('emitter-logo').addEventListener('change', async function() {
        await saveEmitterDetails();
        loadEmitterDetails(); // Recarrega para atualizar a preview com o Base64 persistido
    });


    document.getElementById('client-company').addEventListener('blur', saveClientDetails);
    document.getElementById('client-contact').addEventListener('blur', saveClientDetails);
    document.getElementById('client-address').addEventListener('blur', saveClientDetails);

    updateTotals();
    renderDocumentList();
    updateItemsTable();
});

// Calcula Totais Finais
function updateTotals() {
    const totalGeral = currentItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);

    // Atualiza o display principal (total geral)
    document.getElementById('grand-total-display').textContent = `R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

// ==================== FUNÇÕES DE GERENCIAMENTO DE ITENS (TABELA DINÂMICA) ====================

document.getElementById('add-item-btn').addEventListener('click', addItem);

function addItem() {
    const produtoInput = document.getElementById('item-product');
    const quantidadeInput = document.getElementById('item-quantity');
    const valorInput = document.getElementById('item-price');

    const produto = produtoInput.value.trim();
    const quantidade = parseInt(quantidadeInput.value) || 0;
    const valorUnitario = parseFloat(valorInput.value);

    // Validação de preenchimento
    if (!produto || isNaN(quantidade) || quantidade <= 0 || isNaN(valorUnitario) || valorUnitario < 0) {
        alert("Por favor, preencha o Produto, a Quantidade (deve ser > 0) e o Valor Unitário (deve ser >= 0) antes de adicionar.");
        return;
    }

    // Cálculo do Subtotal
    const subtotal = (quantidade * valorUnitario).toFixed(2);

    const newItem = {
        produto,
        quantidade,
        valorUnitario: valorUnitario.toFixed(2),
        subtotal
    };

    currentItems.push(newItem);
    updateItemsTable();

    // Limpa campos para próxima inserção
    produtoInput.value = '';
    quantidadeInput.value = '1';
    valorInput.value = '0.00';
    produtoInput.focus();
}

function removeItem(index) {
    if (!confirm('Tem certeza que deseja remover este item?')) return;
    currentItems.splice(index, 1);
    updateItemsTable();
}

function updateItemsTable() {
    const tableBody = document.querySelector('#items-table tbody');
    tableBody.innerHTML = '';
    
    if (currentItems.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center" style="color: var(--secondary-color);">Nenhum item adicionado à nota de entrega.</td></tr>';
        updateTotals(); // Garante que o total geral seja zerado
        return;
    }

    currentItems.forEach((item, index) => {
        const row = tableBody.insertRow();
        const subtotalFormatado = parseFloat(item.subtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        const valorFormatado = parseFloat(item.valorUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

        row.innerHTML = `
            <td class="text-center">${index + 1}</td>
            <td>${item.produto}</td>
            <td class="text-right">${item.quantidade}</td>
            <td class="text-right">R$ ${valorFormatado}</td>
            <td class="text-right" style="font-weight: 700; color: var(--primary-color);">R$ ${subtotalFormatado}</td>
            <td class="text-center"><button type="button" class="btn btn-action btn-danger" onclick="removeItem(${index})">Remover</button></td>
        `;
    });
    
    updateTotals(); // Recalcula totais finais
}

// ==================== FUNÇÕES CRUD (CREATE, READ, UPDATE) ====================

document.getElementById('delivery-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!e.target.checkValidity()) {
        alert('Por favor, preencha os campos obrigatórios (Empresa Emissora, Empresa Cliente e Endereço de Entrega).');
        return;
    }
    
    // Salva detalhes, incluindo a LOGO. PRECISA SER ASYNC AQUI!
    await saveEmitterDetails(); 
    saveClientDetails(); 

    if (currentItems.length === 0) {
        alert('Adicione pelo menos um item à nota de entrega antes de salvar.');
        return;
    }

    const form = e.target;
    const documentId = form.dataset.editingId;
    
    const totalGeral = currentItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0).toFixed(2);
    
    // Recarrega os dados do emissor para garantir que a logo base64 esteja no objeto global
    loadEmitterDetails(); 

    const newDocument = {
        id: documentId ? documentId : Date.now().toString(),
        tipo: 'RECIBO_ENTREGA',
        dataCriacao: new Date().toISOString().split('T')[0],
        
        // Emissor (Incluindo a Logomarca em Base64)
        emitter: {
            company: currentEmitterDetails.company, // Usa o valor do objeto global atualizado
            contact: currentEmitterDetails.contact,
            address: currentEmitterDetails.address,
            logoBase64: currentEmitterDetails.logoBase64, // Inclui a logo
        },
        
        // Cliente
        client: {
            company: document.getElementById('client-company').value,
            contact: document.getElementById('client-contact').value,
            address: document.getElementById('client-address').value,
        },

        // Itens e Total
        items: [...currentItems],
        totalGeral: totalGeral,
    };

    let documents = getDocuments();

    if (documentId) {
        documents = documents.map(doc => doc.id === documentId ? newDocument : doc);
        alert('Recibo atualizado com sucesso!');
        form.removeAttribute('data-editing-id');
        document.getElementById('save-btn').textContent = 'Salvar Recibo (C/U)';
    } else {
        documents.push(newDocument);
        alert('Recibo salvo com sucesso!');
    }
    
    saveDocuments(documents);
    renderDocumentList();
    
    // Limpa o estado da tabela e prepara para nova
    clearForm(form);
});

// Limpar Formulário
document.getElementById('clear-form-btn').addEventListener('click', function() {
    clearForm(document.getElementById('delivery-form'));
});

function clearForm(form) {
    form.reset();
    form.removeAttribute('data-editing-id');
    document.getElementById('save-btn').textContent = 'Salvar Recibo (C/U)';
    
    // LIMPA O ESTADO GLOBAL de itens
    currentItems = [];
    updateItemsTable();
    updateTotals(); 

    // Recarrega os detalhes do emissor/cliente para persistência
    loadEmitterDetails(); 
    loadClientDetails();
}


// UPDATE (Carregar dados para Edição)
function editDocument(id) {
    const documents = getDocuments();
    const doc = documents.find(d => d.id === id);

    if (!doc) {
        alert('Documento não encontrado.');
        return;
    }

    // Preenche detalhes do Emissor
    document.getElementById('emitter-company').value = doc.emitter.company || '';
    document.getElementById('emitter-contact').value = doc.emitter.contact || '';
    document.getElementById('emitter-address').value = doc.emitter.address || '';
    
    // Atualiza o objeto global de detalhes do emissor com a logo
    currentEmitterDetails.logoBase64 = doc.emitter.logoBase64 || '';
    
    // Salva os detalhes da lista atual para persistência (se o usuário sair da página)
    saveEmitterDetails(); // Salva os dados de texto E a logo Base64
    loadEmitterDetails(); // Atualiza a preview da logo


    // Preenche detalhes do Cliente
    document.getElementById('client-company').value = doc.client.company || '';
    document.getElementById('client-contact').value = doc.client.contact || '';
    document.getElementById('client-address').value = doc.client.address || '';
    
    saveClientDetails(); 

    // ITENS
    currentItems = doc.items || [];
    updateItemsTable(); 

    // Seta estado de edição
    const form = document.getElementById('delivery-form');
    form.setAttribute('data-editing-id', id);
    document.getElementById('save-btn').textContent = 'Atualizar Recibo (U)';
    
    window.scrollTo(0, 0); 
}

// READ (Renderizar a Lista de Documentos)
function renderDocumentList() {
    const list = document.getElementById('document-list');
    list.innerHTML = '';
    const documents = getDocuments();

    if (documents.length === 0) {
        list.innerHTML = '<li>Nenhum recibo/nota de entrega salvo.</li>';
        return;
    }

    documents.forEach(doc => {
        const li = document.createElement('li');
        const total = parseFloat(doc.totalGeral).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        
        const emitterCompany = doc.emitter.company || '[Emissor]';
        const clientCompany = doc.client.company || '[Cliente]';

        li.innerHTML = `
            <div class="info">
                <span><strong>RECIBO #${doc.id.substring(8)}</strong> - De: ${emitterCompany} | Para: ${clientCompany} | Total: R$ ${total}</span>
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
    if (!confirm('Tem certeza que deseja excluir este recibo de entrega?')) return;

    let documents = getDocuments();
    documents = documents.filter(doc => doc.id !== id);
    saveDocuments(documents);
    renderDocumentList();
    alert('Recibo de entrega excluído.');
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
    
    // 1. Logomarca e Título
    
    const LOGO_HEIGHT = 20; // Altura máxima para a logo
    const LOGO_WIDTH = 50;  // Largura máxima para a logo

    if (doc.emitter.logoBase64) {
        try {
            const imgData = doc.emitter.logoBase64;
            const imgType = imgData.split(':')[1].split(';')[0].split('/')[1].toUpperCase(); // Ex: JPEG, PNG

            // Posiciona a logo à esquerda, no topo
            pdf.addImage(imgData, imgType, margin, y, LOGO_WIDTH, LOGO_HEIGHT);
            
            // Ajusta o 'y' para começar o título após o espaço da logo
            y = margin + LOGO_HEIGHT + 5; 

        } catch (error) {
            console.error("Erro ao adicionar logomarca ao PDF:", error);
            // Se falhar, usa o layout padrão
            y = 15; 
        }
    } else {
        // Se não houver logo, começa no topo
        y = 15; 
    }

    // Título
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text("RECIBO / NOTA DE ENTREGA", margin, y); 
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Nº Documento: #${doc.id.substring(8)}`, margin + width, y, { align: 'right' }); 
    y += lineHeight * 2;
    
    // 2. DADOS DO EMISSOR E CLIENTE (Caixas)
    
    const boxWidth = (width / 2) - 3;
    const boxHeight = lineHeight * 5;

    // Cabeçalho Emissor
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, y - 5, boxWidth, 5, 'F');
    pdf.text("EMISSOR / REMETENTE", margin + 1, y - 1.5);

    // Box Emissor
    pdf.setFont('helvetica', 'normal');
    pdf.rect(margin, y - 5, boxWidth, boxHeight + 5, 'S'); // Borda
    pdf.text(`Empresa: ${doc.emitter.company || '--'}`, margin + 1, y + 5);
    pdf.text(`Contato: ${doc.emitter.contact || '--'}`, margin + 1, y + 5 + lineHeight);
    pdf.text(`Endereço: ${doc.emitter.address || '--'}`, margin + 1, y + 5 + lineHeight * 2);

    // Cabeçalho Cliente
    const clientX = margin + width / 2 + 3;
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(240, 240, 240);
    pdf.rect(clientX, y - 5, boxWidth, 5, 'F');
    pdf.text("CLIENTE / DESTINATÁRIO", clientX + 1, y - 1.5);
    
    // Box Cliente
    pdf.setFont('helvetica', 'normal');
    pdf.rect(clientX, y - 5, boxWidth, boxHeight + 5, 'S'); // Borda
    pdf.text(`Empresa: ${doc.client.company || '--'}`, clientX + 1, y + 5);
    pdf.text(`Contato: ${doc.client.contact || '--'}`, clientX + 1, y + 5 + lineHeight);
    pdf.text(`Endereço: ${doc.client.address || '--'}`, clientX + 1, y + 5 + lineHeight * 2);
    
    y += boxHeight + 10;
    
    // 3. Tabela de Itens 
    
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

    // Largura das colunas (aproximada)
    const colItem = 10;
    const colProduto = 80;
    const colQtd = 20;
    const colValor = 30;
    const colTotal = 40;

    pdf.text("Nº", margin + 2, tableCurrentY - 2);
    pdf.text("PRODUTO / DESCRIÇÃO", margin + colItem, tableCurrentY - 2);
    pdf.text("QTD", margin + colItem + colProduto, tableCurrentY - 2, { align: 'right' });
    pdf.text("VALOR UNIT.", margin + colItem + colProduto + colQtd, tableCurrentY - 2, { align: 'right' });
    pdf.text("SUBTOTAL", margin + width - 1, tableCurrentY - 2, { align: 'right' });
    tableCurrentY += lineHeight;

    // Linhas de Itens
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    if (doc.items && doc.items.length > 0) {
        doc.items.forEach((item, index) => {
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
                pdf.text("PRODUTO / DESCRIÇÃO", margin + colItem, tableCurrentY - 2);
                pdf.text("QTD", margin + colItem + colProduto, tableCurrentY - 2, { align: 'right' });
                pdf.text("VALOR UNIT.", margin + colItem + colProduto + colQtd, tableCurrentY - 2, { align: 'right' });
                pdf.text("SUBTOTAL", margin + width - 1, tableCurrentY - 2, { align: 'right' });
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'normal');
            }

            const valorFormatado = parseFloat(item.valorUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            const subtotalFormatado = parseFloat(item.subtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

            pdf.text((index + 1).toString(), margin + 2, tableCurrentY);
            pdf.text(item.produto, margin + colItem, tableCurrentY);
            pdf.text(item.quantidade.toString(), margin + colItem + colProduto, tableCurrentY, { align: 'right' });
            pdf.text(`R$ ${valorFormatado}`, margin + colItem + colProduto + colQtd, tableCurrentY, { align: 'right' });
            pdf.text(`R$ ${subtotalFormatado}`, margin + width - 1, tableCurrentY, { align: 'right' });
            
            // Linha fina de separação entre itens
            pdf.setLineWidth(0.1); 
            pdf.setDrawColor(150, 150, 150); 
            pdf.line(margin, tableCurrentY + lineHeight * 0.5, margin + width, tableCurrentY + lineHeight * 0.5);
            
            tableCurrentY += lineHeight;
        });
    } else {
        pdf.text("Nenhum item entregue.", margin + 1, tableCurrentY);
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
    
    y = tableCurrentY;
    
    // 4. Rodapé e Total Geral
    y += lineHeight * 0.5;
    pdf.line(margin, y, margin + width, y); 
    y += lineHeight;

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text("TOTAL GERAL DA ENTREGA:", 140, y, { align: 'right' });
    pdf.text(`R$ ${parseFloat(doc.totalGeral).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 175, y, { align: 'right' });
    y += lineHeight;

    // 5. CANHOTO DE RECEBIMENTO
    
    // Posição para o canhoto (cerca de 3cm do final da página)
    const canhotoY = 260;
    const canhotoHeight = 35;
    
    // Verifica se há espaço. Se não, adiciona nova página.
    if (y + canhotoHeight > 280) {
        pdf.addPage();
        y = 15;
    }
    
    // Desenha a Linha Pontilhada de Corte
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineDash([2, 2], 0); // Linha pontilhada
    pdf.line(margin, canhotoY, margin + width, canhotoY);
    pdf.setLineDash([], 0); // Volta para linha sólida

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text("CANHOTO DE RECEBIMENTO", margin, canhotoY + 5);
    
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Empresa Destinatária: ${doc.client.company || '--'}`, margin, canhotoY + 12);
    pdf.text(`Nº Documento: #${doc.id.substring(8)}`, margin, canhotoY + 18);
    pdf.text(`Total de Itens: ${doc.items.length}`, margin, canhotoY + 24);

    // Linha de Assinatura
    const signatureLineY = canhotoY + 30;
    pdf.line(margin + 70, signatureLineY, margin + width - 10, signatureLineY);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text("Assinatura e Carimbo do Recebedor", margin + 115, signatureLineY + 4, { align: 'center' });


    pdf.save(`RECIBO_ENTREGA_${doc.id.substring(8)}.pdf`);
}