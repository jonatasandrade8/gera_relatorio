// ==================== CONFIGURAÇÕES E UTILIDADES ====================
const LOCAL_STORAGE_KEY = 'orcamento_generator_data';

// VARIÁVEIS GLOBAIS
let currentFormItems = []; 
let currentLogoData = ''; 

// Função auxiliar para formatar datas (dd/mm/yyyy)
function formatDate(date) {
    if (!date) return '--/--/----';
    const d = new Date(date);
    // Ajuste de fuso horário, se for uma string ISO de data (Ex: 2023-10-25)
    if (typeof date === 'string' && date.includes('-')) {
        d.setDate(d.getDate() + 1); 
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
}

function getDocuments() {
    const docs = localStorage.getItem(LOCAL_STORAGE_KEY);
    return docs ? JSON.parse(docs) : [];
}

function saveDocuments(documents) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(documents));
}

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

// ==================== INICIALIZAÇÃO E EVENTOS DE DATA/TOTAIS ====================
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('logo-file').addEventListener('change', handleLogoFileUpload);
    
    // Atualiza os totais e datas ao carregar e em mudanças
    updateTotals();
    
    // Adiciona listener para campos que influenciam o total
    document.getElementById('desconto-percentual').addEventListener('input', updateTotals);
    document.getElementById('forma-pagamento').addEventListener('input', updateTotals);
    document.getElementById('validade-dias').addEventListener('input', updateTotals);

    renderDocumentList();
    updateItemsTable();
});

// Calcula Data de Validade e Totais Finais
function updateTotals() {
    const totalBruto = currentFormItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
    const descontoPercentual = parseFloat(document.getElementById('desconto-percentual').value) || 0;
    const formaPagamento = document.getElementById('forma-pagamento').value;
    const validadeDias = parseInt(document.getElementById('validade-dias').value) || 0;

    const dataEmissao = new Date();
    
    // Calcula desconto
    const totalDesconto = totalBruto * (1 - descontoPercentual / 100);
    
    // Calcula data de validade
    const dataValidade = new Date(dataEmissao);
    dataValidade.setDate(dataValidade.getDate() + validadeDias);

    // Atualiza displays no final do formulário
    document.getElementById('data-emissao-display').textContent = formatDate(dataEmissao);
    document.getElementById('data-validade-display').textContent = formatDate(dataValidade);
    document.getElementById('total-bruto-display').textContent = `R$ ${totalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    document.getElementById('total-desconto-display').textContent = `R$ ${totalDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    document.getElementById('forma-pagamento-display').textContent = formaPagamento || '--';

    // Atualiza o display principal (total bruto)
    document.getElementById('grand-total-display').textContent = `R$ ${totalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

// ==================== FUNÇÕES DE GERENCIAMENTO DE ITENS (TABELA DINÂMICA) ====================

document.getElementById('add-item-btn').addEventListener('click', addItem);

function addItem() {
    const produtoInput = document.getElementById('item-produto');
    const quantidadeInput = document.getElementById('item-quantidade');
    const valorInput = document.getElementById('item-valor');

    const produto = produtoInput.value.trim();
    const quantidade = parseFloat(quantidadeInput.value);
    const valor = parseFloat(valorInput.value);

    // A validação de preenchimento dos itens só é feita AQUI, ao tentar adicionar,
    // e não ao tentar salvar o formulário.
    if (!produto || isNaN(quantidade) || quantidade <= 0 || isNaN(valor) || valor <= 0) {
        alert("Por favor, preencha todos os campos do item corretamente (quantidade e valor devem ser positivos) ANTES de adicionar.");
        return;
    }

    const subtotal = (quantidade * valor).toFixed(2);

    const newItem = {
        produto,
        quantidade,
        valor: valor.toFixed(2),
        subtotal
    };

    currentFormItems.push(newItem);
    updateItemsTable();

    // Limpa campos para próxima inserção
    produtoInput.value = '';
    quantidadeInput.value = '1';
    valorInput.value = '0.01';
    produtoInput.focus();
}

function removeItem(index) {
    if (!confirm('Tem certeza que deseja remover este item?')) return;
    currentFormItems.splice(index, 1);
    updateItemsTable();
}

function updateItemsTable() {
    const tableBody = document.querySelector('#items-table tbody');
    tableBody.innerHTML = '';
    let totalBruto = 0;

    if (currentFormItems.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--secondary-color);">Nenhum item adicionado.</td></tr>';
        updateTotals(); // Garante que os displays finais sejam zerados
        return;
    }

    currentFormItems.forEach((item, index) => {
        totalBruto += parseFloat(item.subtotal);

        const row = tableBody.insertRow();
        const subtotalFormatado = parseFloat(item.subtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        const valorFormatado = parseFloat(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

        row.innerHTML = `
            <td>${item.produto}</td>
            <td class="text-right">${item.quantidade}</td>
            <td class="text-right">R$ ${valorFormatado}</td>
            <td class="text-right">R$ ${subtotalFormatado}</td>
            <td><button type="button" class="btn btn-action btn-danger" onclick="removeItem(${index})">Remover</button></td>
        `;
    });
    
    // Linha de Total Bruto na Tabela
    const totalRow = tableBody.insertRow();
    totalRow.classList.add('total-row');
    totalRow.innerHTML = `
        <td colspan="3" class="text-right" style="font-weight: 700;">TOTAL BRUTO:</td>
        <td class="text-right total-cell" style="font-weight: 700; color: var(--primary-color);">R$ ${totalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        <td></td>
    `;

    updateTotals(); // Recalcula totais finais e datas
}

// ==================== FUNÇÕES CRUD (CREATE, READ, UPDATE) ====================

document.getElementById('document-form').addEventListener('submit', function(e) {
    e.preventDefault();

    // 1. Validação de Campos OBRIGATÓRIOS (Prestador/Cliente/FormaPgto)
    // Se a validação HTML5 falhar, o navegador exibe a mensagem e para.
    if (!e.target.checkValidity()) {
        return; 
    }
    
    // O BLOCO DE VALIDAÇÃO DE currentFormItems.length FOI REMOVIDO AQUI,
    // permitindo salvar orçamentos com 0 itens.

    // Processamento dos dados
    const form = e.target;
    const documentId = form.dataset.editingId;
    
    const totalBruto = currentFormItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0).toFixed(2);
    const descontoPercentual = parseFloat(document.getElementById('desconto-percentual').value) || 0;
    const totalDesconto = (parseFloat(totalBruto) * (1 - descontoPercentual / 100)).toFixed(2);
    
    const dataEmissao = new Date();
    const validadeDias = parseInt(document.getElementById('validade-dias').value) || 0;
    const dataValidade = new Date(dataEmissao);
    dataValidade.setDate(dataValidade.getDate() + validadeDias);
    
    const logoUrl = document.getElementById('logo-url').value;
    const finalLogoData = currentLogoData || logoUrl || '';
    
    const newDocument = {
        id: documentId ? documentId : Date.now().toString(),
        tipo: 'ORCAMENTO',
        dataEmissao: dataEmissao.toISOString().split('T')[0], // Salva ISO para reconstituição
        dataValidade: dataValidade.toISOString().split('T')[0],
        logo: finalLogoData,
        
        // Dados do Prestador
        prestadorNome: document.getElementById('prestador-nome').value,
        prestadorEmail: document.getElementById('prestador-email').value,
        prestadorContato: document.getElementById('prestador-contato').value,
        prestadorDoc: document.getElementById('prestador-doc').value,
        validadeDias: validadeDias,
        prestadorCidade: document.getElementById('prestador-cidade').value,
        prestadorEstado: document.getElementById('prestador-estado').value,

        // Dados do Cliente
        clienteNome: document.getElementById('cliente-nome').value,
        clienteEmail: document.getElementById('cliente-email').value,
        clienteContato: document.getElementById('cliente-contato').value,
        clienteDoc: document.getElementById('cliente-doc').value,
        clienteCidade: document.getElementById('cliente-cidade').value,
        clienteEstado: document.getElementById('cliente-estado').value,
        
        // Dados Financeiros
        items: [...currentFormItems],
        totalBruto: totalBruto,
        descontoPercentual: descontoPercentual,
        totalDesconto: totalDesconto,
        prazoDias: document.getElementById('prazo-dias').value,
        formaPagamento: document.getElementById('forma-pagamento').value,
    };

    let documents = getDocuments();

    if (documentId) {
        documents = documents.map(doc => doc.id === documentId ? newDocument : doc);
        alert('Orçamento atualizado com sucesso!');
        form.removeAttribute('data-editing-id');
        document.getElementById('save-btn').textContent = 'Salvar Orçamento (C/U)';
    } else {
        documents.push(newDocument);
        alert('Orçamento salvo com sucesso!');
    }
    
    saveDocuments(documents);
    renderDocumentList();
    
    // Limpa o formulário e estado
    clearForm(form);
});

// Limpar Formulário
document.getElementById('clear-form-btn').addEventListener('click', function() {
    clearForm(document.getElementById('document-form'));
});

function clearForm(form) {
    form.reset();
    form.removeAttribute('data-editing-id');
    document.getElementById('save-btn').textContent = 'Salvar Orçamento (C/U)';
    
    // LIMPA O ESTADO GLOBAL
    currentFormItems = [];
    currentLogoData = '';
    document.getElementById('logo-preview').innerHTML = '';
    updateItemsTable();
    updateTotals(); // Reinicia os displays de totais/datas
}


// UPDATE (Carregar dados para Edição)
function editDocument(id) {
    const documents = getDocuments();
    const doc = documents.find(d => d.id === id);

    if (!doc) {
        alert('Documento não encontrado.');
        return;
    }

    // Preenche dados do Prestador
    document.getElementById('prestador-nome').value = doc.prestadorNome;
    document.getElementById('prestador-email').value = doc.prestadorEmail;
    document.getElementById('prestador-contato').value = doc.prestadorContato;
    document.getElementById('prestador-doc').value = doc.prestadorDoc;
    document.getElementById('validade-dias').value = doc.validadeDias;
    document.getElementById('prestador-cidade').value = doc.prestadorCidade;
    document.getElementById('prestador-estado').value = doc.prestadorEstado;

    // Preenche dados do Cliente
    document.getElementById('cliente-nome').value = doc.clienteNome;
    document.getElementById('cliente-email').value = doc.clienteEmail;
    document.getElementById('cliente-contato').value = doc.clienteContato;
    document.getElementById('cliente-doc').value = doc.clienteDoc;
    document.getElementById('cliente-cidade').value = doc.clienteCidade;
    document.getElementById('cliente-estado').value = doc.clienteEstado;
    
    // Preenche Condições
    document.getElementById('desconto-percentual').value = doc.descontoPercentual;
    document.getElementById('prazo-dias').value = doc.prazoDias;
    document.getElementById('forma-pagamento').value = doc.formaPagamento;
    
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
    updateItemsTable(); // Chama updateTotals internamente

    // Seta estado de edição
    const form = document.getElementById('document-form');
    form.setAttribute('data-editing-id', id);
    document.getElementById('save-btn').textContent = 'Atualizar Orçamento (U)';
    
    window.scrollTo(0, 0); 
}

// READ (Renderizar a Lista de Documentos)
function renderDocumentList() {
    const list = document.getElementById('document-list');
    list.innerHTML = '';
    const documents = getDocuments();

    if (documents.length === 0) {
        list.innerHTML = '<li>Nenhum orçamento salvo.</li>';
        return;
    }

    documents.forEach(doc => {
        const li = document.createElement('li');
        const total = parseFloat(doc.totalDesconto).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        const dataEmissao = formatDate(doc.dataEmissao);
        
        li.innerHTML = `
            <div class="info">
                <span><strong>ORÇAMENTO #${doc.id.substring(8)}</strong> - Cliente: ${doc.clienteNome}</span>
                <span class="total-display" style="background: linear-gradient(45deg, #007bb6, #004c8c);">R$ ${total}</span>
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
    if (!confirm('Tem certeza que deseja excluir este orçamento?')) return;

    let documents = getDocuments();
    documents = documents.filter(doc => doc.id !== id);
    saveDocuments(documents);
    renderDocumentList();
    alert('Orçamento excluído.');
}


// ==================== FUNÇÃO DE EXPORTAÇÃO PDF ====================

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
    
    // Título, ID e Logo
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text("ORÇAMENTO", margin, y); 
    pdf.setFontSize(10);
    pdf.text(`ID: #${doc.id.substring(8)}`, margin, y + 5); 

    if (doc.logo && doc.logo.startsWith('data:image')) {
        const imgType = doc.logo.substring(doc.logo.indexOf(':') + 6, doc.logo.indexOf(';')).toUpperCase();
        pdf.addImage(doc.logo, imgType, 175, 10, 20, 20); 
    }
    
    y = 35;
    pdf.line(margin, y, margin + width, y);
    y += lineHeight;

    // 2. Dados do Prestador e Cliente
    const halfWidth = width / 2;

    // Coluna 1: Prestador
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text("PRESTADOR (EMISSOR)", margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Nome: ${doc.prestadorNome}`, margin, y + lineHeight);
    pdf.text(`Contato: ${doc.prestadorContato}`, margin, y + lineHeight * 2);
    if (doc.prestadorEmail) pdf.text(`Email: ${doc.prestadorEmail}`, margin, y + lineHeight * 3);
    if (doc.prestadorDoc) pdf.text(`Doc: ${doc.prestadorDoc}`, margin, y + lineHeight * 4);
    if (doc.prestadorCidade) pdf.text(`Local: ${doc.prestadorCidade}/${doc.prestadorEstado}`, margin, y + lineHeight * 5);
    
    // Coluna 2: Cliente
    pdf.setFont('helvetica', 'bold');
    pdf.text("CLIENTE", margin + halfWidth, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Nome: ${doc.clienteNome}`, margin + halfWidth, y + lineHeight);
    pdf.text(`Contato: ${doc.clienteContato}`, margin + halfWidth, y + lineHeight * 2);
    if (doc.clienteEmail) pdf.text(`Email: ${doc.clienteEmail}`, margin + halfWidth, y + lineHeight * 3);
    if (doc.clienteDoc) pdf.text(`CPF/CNPJ: ${doc.clienteDoc}`, margin + halfWidth, y + lineHeight * 4);
    if (doc.clienteCidade) pdf.text(`Local: ${doc.clienteCidade}/${doc.clienteEstado}`, margin + halfWidth, y + lineHeight * 5);
    
    y += lineHeight * 6; 
    
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
    pdf.text("Valor Unit.", 140, y - 1, { align: 'right' });
    pdf.text("Subtotal", 175, y - 1, { align: 'right' });
    y += lineHeight;

    // Linhas de Itens
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    if (doc.items && doc.items.length > 0) {
        doc.items.forEach(item => {
            const valor = parseFloat(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            const subtotal = parseFloat(item.subtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            
            pdf.text(item.produto, margin + 1, y);
            pdf.text(item.quantidade.toString(), 110, y, { align: 'right' });
            pdf.text(`R$ ${valor}`, 140, y, { align: 'right' });
            pdf.text(`R$ ${subtotal}`, 175, y, { align: 'right' });
            y += lineHeight;
            
            if (y > 270) { 
                pdf.addPage();
                y = 15;
            }
        });
    } else {
        pdf.text("Nenhum item adicionado ao orçamento.", margin + 1, y);
        y += lineHeight * 2;
    }
    
    // 4. Rodapé e Totais
    y += lineHeight * 0.5;
    pdf.line(margin, y, margin + width, y); 
    y += lineHeight;

    // Totais
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text("TOTAL GERAL (BRUTO):", 140, y, { align: 'right' });
    pdf.text(`R$ ${parseFloat(doc.totalBruto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 175, y, { align: 'right' });
    y += lineHeight;

    pdf.text(`DESCONTO À VISTA (${doc.descontoPercentual}%):`, 140, y, { align: 'right' });
    pdf.text(`R$ ${parseFloat(doc.totalDesconto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 175, y, { align: 'right' });
    y += lineHeight * 2;
    
    // Informações Finais
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Data de Emissão: ${formatDate(doc.dataEmissao)}`, margin, y);
    pdf.text(`Data de Validade: ${formatDate(doc.dataValidade)} (${doc.validadeDias} dias)`, margin, y + lineHeight);
    pdf.text(`Prazo de Execução: ${doc.prazoDias} dias`, margin, y + lineHeight * 2);
    pdf.text(`Forma de Pagamento: ${doc.formaPagamento}`, margin, y + lineHeight * 3);


    pdf.save(`ORCAMENTO_${doc.id.substring(8)}.pdf`);
}