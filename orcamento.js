// ==================== CONFIGURAÇÕES E UTILIDADES ====================
const LOCAL_STORAGE_KEY = 'orcamento_generator_data';
const EMITTER_STORAGE_KEY = 'orcamento_emitter_data'; 

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

// ==================== LÓGICA DE CEP E PERSISTÊNCIA DO EMISSOR ====================

/**
 * Função para buscar o endereço usando a API ViaCEP
 * @param {string} cep - O CEP a ser buscado.
 * @param {string} addressInputId - ID do campo de Endereço.
 * @param {string} cityInputId - ID do campo de Cidade.
 * @param {string} stateInputId - ID do campo de Estado.
 */
async function fetchAddressByCep(cep, addressInputId, cityInputId, stateInputId) {
    // Remove qualquer formatação de CEP (ex: 00000-000 -> 00000000)
    const cleanCep = cep.replace(/\D/g, ''); 
    if (cleanCep.length !== 8) return;

    const addressInput = document.getElementById(addressInputId);
    const cityInput = document.getElementById(cityInputId);
    const stateInput = document.getElementById(stateInputId);

    // Limpa campos enquanto busca
    addressInput.value = 'Buscando...';
    cityInput.value = '';
    stateInput.value = '';

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();

        if (data.erro) {
            alert('CEP não encontrado. Preencha manualmente.');
            addressInput.value = '';
            addressInput.focus();
            return;
        }

        // Preenche os campos com os dados retornados
        // Adiciona vírgula para que o usuário adicione o número
        addressInput.value = `${data.logradouro}${data.logradouro ? ', ' : ''}`; 
        cityInput.value = data.localidade;
        stateInput.value = data.uf;
        
        // Coloca o foco no campo de endereço para o usuário digitar o número
        addressInput.focus();

    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        alert('Erro de conexão ao buscar CEP. Preencha manualmente.');
        addressInput.value = '';
    }
}


function saveEmitterData() {
    const emitterData = {
        prestadorNome: document.getElementById('prestador-nome').value,
        prestadorEmail: document.getElementById('prestador-email').value,
        prestadorContato: document.getElementById('prestador-contato').value,
        prestadorDoc: document.getElementById('prestador-doc').value,
        validadeDias: document.getElementById('validade-dias').value,
        // Novos campos
        prestadorCep: document.getElementById('prestador-cep').value,
        prestadorEndereco: document.getElementById('prestador-endereco').value,
        prestadorCidade: document.getElementById('prestador-cidade').value,
        prestadorEstado: document.getElementById('prestador-estado').value,
    };
    localStorage.setItem(EMITTER_STORAGE_KEY, JSON.stringify(emitterData));
}

function loadEmitterData() {
    const storedData = localStorage.getItem(EMITTER_STORAGE_KEY);
    if (!storedData) return;

    const data = JSON.parse(storedData);
    
    // Preenche os campos do Prestador
    if (data.prestadorNome) document.getElementById('prestador-nome').value = data.prestadorNome;
    if (data.prestadorEmail) document.getElementById('prestador-email').value = data.prestadorEmail;
    if (data.prestadorContato) document.getElementById('prestador-contato').value = data.prestadorContato;
    if (data.prestadorDoc) document.getElementById('prestador-doc').value = data.prestadorDoc;
    if (data.validadeDias) document.getElementById('validade-dias').value = data.validadeDias;
    // Novos campos
    if (data.prestadorCep) document.getElementById('prestador-cep').value = data.prestadorCep;
    if (data.prestadorEndereco) document.getElementById('prestador-endereco').value = data.prestadorEndereco;
    if (data.prestadorCidade) document.getElementById('prestador-cidade').value = data.prestadorCidade;
    if (data.prestadorEstado) document.getElementById('prestador-estado').value = data.prestadorEstado;
}


// ==================== LÓGICA DE LOGO BASE64/URL ====================

/**
 * Função utilitária assíncrona para carregar uma imagem (Base64 ou URL)
 * e obter seu objeto e dimensões.
 */
function loadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous'; // Útil para URLs externas
        
        img.onload = () => {
            resolve(img);
        };
        img.onerror = () => {
            console.error("Erro ao carregar imagem para PDF. Verifique a URL ou o arquivo.");
            resolve(null); // Resolve com null em caso de erro
        };
        img.src = src;
    });
}

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
    
    // Carrega os dados do Emissor ao carregar a página
    loadEmitterData(); 

    // Listeners para preenchimento de CEP
    document.getElementById('prestador-cep').addEventListener('blur', (e) => {
        fetchAddressByCep(e.target.value, 'prestador-endereco', 'prestador-cidade', 'prestador-estado');
    });
    document.getElementById('cliente-cep').addEventListener('blur', (e) => {
        fetchAddressByCep(e.target.value, 'cliente-endereco', 'cliente-cidade', 'cliente-estado');
    });

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

    // A validação de preenchimento dos itens só é feita AQUI, ao tentar adicionar.
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
    
    // Salva os dados do Prestador (Emissor) antes de salvar o documento
    saveEmitterData(); 

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
        prestadorCep: document.getElementById('prestador-cep').value, 
        prestadorEndereco: document.getElementById('prestador-endereco').value, 
        prestadorCidade: document.getElementById('prestador-cidade').value,
        prestadorEstado: document.getElementById('prestador-estado').value,

        // Dados do Cliente
        clienteNome: document.getElementById('cliente-nome').value,
        clienteEmail: document.getElementById('cliente-email').value,
        clienteContato: document.getElementById('cliente-contato').value,
        clienteDoc: document.getElementById('cliente-doc').value,
        clienteCep: document.getElementById('cliente-cep').value, 
        clienteEndereco: document.getElementById('cliente-endereco').value, 
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

    // Recarrega os dados do Prestador após o reset do formulário
    loadEmitterData(); 
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
    document.getElementById('prestador-cep').value = doc.prestadorCep || ''; 
    document.getElementById('prestador-endereco').value = doc.prestadorEndereco || ''; 
    document.getElementById('prestador-cidade').value = doc.prestadorCidade;
    document.getElementById('prestador-estado').value = doc.prestadorEstado;

    // Preenche dados do Cliente
    document.getElementById('cliente-nome').value = doc.clienteNome;
    document.getElementById('cliente-email').value = doc.clienteEmail;
    document.getElementById('cliente-contato').value = doc.clienteContato;
    document.getElementById('cliente-doc').value = doc.clienteDoc;
    document.getElementById('cliente-cep').value = doc.clienteCep || ''; 
    document.getElementById('cliente-endereco').value = doc.clienteEndereco || ''; 
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


// ==================== FUNÇÃO DE EXPORTAÇÃO PDF APRIMORADA ====================

/**
 * Gera e baixa o PDF, com lógica aprimorada para redimensionamento da logo e tabela.
 * Tornada assíncrona para aguardar o carregamento da imagem.
 */
async function generateAndDownloadPDF(id) {
    const documents = getDocuments();
    const doc = documents.find(d => d.id === id);
    if (!doc) return;
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4'); 
    
    const margin = 15;
    const width = 180;
    const lineHeight = 6;
    let y = 15;
    let logoHeight = 0; 
    const MAX_LOGO_HEIGHT_MM = 30; 
    const MAX_LOGO_WIDTH_MM = 60;  

    // 1. Carregamento e Posicionamento da Logo
    if (doc.logo) {
        const imageObj = await loadImage(doc.logo);
        
        if (imageObj) {
            const originalWidth = imageObj.width;
            const originalHeight = imageObj.height;
            const aspectRatio = originalWidth / originalHeight;

            let finalWidth = 0;
            let finalHeight = 0;

            if (originalHeight > MAX_LOGO_HEIGHT_MM * (originalWidth / MAX_LOGO_WIDTH_MM)) {
                finalHeight = MAX_LOGO_HEIGHT_MM;
                finalWidth = finalHeight * aspectRatio;
            } else {
                finalWidth = MAX_LOGO_WIDTH_MM;
                finalHeight = finalWidth / aspectRatio;
            }

            if (finalWidth > MAX_LOGO_WIDTH_MM) {
                finalWidth = MAX_LOGO_WIDTH_MM;
                finalHeight = finalWidth / aspectRatio;
            }
            if (finalHeight > MAX_LOGO_HEIGHT_MM) {
                 finalHeight = MAX_LOGO_HEIGHT_MM;
                 finalWidth = finalHeight * aspectRatio;
            }
            
            const xPos = 195 - margin - finalWidth; 
            const yPos = margin;
            
            const imgType = doc.logo.startsWith('data:image') ? 
                            doc.logo.substring(doc.logo.indexOf('/') + 1, doc.logo.indexOf(';')).toUpperCase() : 
                            'JPEG'; 

            pdf.addImage(imageObj, imgType, xPos, yPos, finalWidth, finalHeight);
            logoHeight = finalHeight; 
        }
    }
    
    // 2. Título e ID (Posicionamento ajustado pela Logo)
    const titleY = logoHeight > 0 ? (margin + logoHeight * 0.5) : margin; 
    
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text("ORÇAMENTO", margin, titleY); 
    pdf.setFontSize(10);
    pdf.text(`ID: #${doc.id.substring(8)}`, margin, titleY + 5); 

    y = Math.max(y + 15, margin + logoHeight + 5);
    y = Math.max(y, 45); 

    pdf.line(margin, y, margin + width, y);
    y += lineHeight;

    // 3. Dados do Prestador e Cliente
    const halfWidth = width / 2;
    let currentY = y;

    // Coluna 1: Prestador
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text("PRESTADOR (EMISSOR)", margin, currentY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Nome: ${doc.prestadorNome}`, margin, currentY + lineHeight);
    pdf.text(`Contato: ${doc.prestadorContato}`, margin, currentY + lineHeight * 2);
    if (doc.prestadorEmail) pdf.text(`Email: ${doc.prestadorEmail}`, margin, currentY + lineHeight * 3);
    if (doc.prestadorDoc) pdf.text(`Doc: ${doc.prestadorDoc}`, margin, currentY + lineHeight * 4);
    
    // Endereço do Prestador (Obrigatório, portanto sempre exibido)
    const prestadorEnderecoText = `${doc.prestadorEndereco}${doc.prestadorEndereco && doc.prestadorCidade ? ',' : ''} ${doc.prestadorCidade}/${doc.prestadorEstado}`;
    pdf.text(`Endereço: ${prestadorEnderecoText}`, margin, currentY + lineHeight * 5);
    pdf.text(`CEP: ${doc.prestadorCep}`, margin, currentY + lineHeight * 6);
    
    // Coluna 2: Cliente
    pdf.setFont('helvetica', 'bold');
    pdf.text("CLIENTE", margin + halfWidth, currentY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Nome: ${doc.clienteNome}`, margin + halfWidth, currentY + lineHeight);
    pdf.text(`Contato: ${doc.clienteContato}`, margin + halfWidth, currentY + lineHeight * 2);
    if (doc.clienteEmail) pdf.text(`Email: ${doc.clienteEmail}`, margin + halfWidth, currentY + lineHeight * 3);
    if (doc.clienteDoc) pdf.text(`Doc: ${doc.clienteDoc}`, margin + halfWidth, currentY + lineHeight * 4);
    
    // Endereço do Cliente (Opcional, só exibe se houver Endereço ou CEP)
    let finalClienteY = currentY + lineHeight * 5;
    if (doc.clienteEndereco) {
        const clienteEnderecoText = `${doc.clienteEndereco}${doc.clienteEndereco && doc.clienteCidade ? ',' : ''} ${doc.clienteCidade}/${doc.clienteEstado}`;
        pdf.text(`Endereço: ${clienteEnderecoText}`, margin + halfWidth, finalClienteY);
        finalClienteY += lineHeight;
    }
    if (doc.clienteCep) {
        pdf.text(`CEP: ${doc.clienteCep}`, margin + halfWidth, finalClienteY);
        finalClienteY += lineHeight;
    }

    // Aumenta o Y base para o maior dos blocos
    currentY = Math.max(currentY + lineHeight * 7, finalClienteY); 
    y = currentY;

    pdf.line(margin, y, margin + width, y);
    y += lineHeight;

    // 4. Tabela de Itens (Com bordas arredondadas e linhas finas)
    
    const tableStartY = y;
    let tableCurrentY = y;
    const headerHeight = 5;
    const borderRadius = 2; // Raio para bordas arredondadas
    
    // Configurações do cabeçalho
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    
    // 4a. Preenche a área do cabeçalho
    pdf.setFillColor(240, 240, 240); 
    pdf.rect(margin, tableCurrentY - headerHeight, width, headerHeight, 'F'); 

    // 4b. Adiciona texto do cabeçalho
    pdf.text("Produto/Serviço", margin + 1, tableCurrentY - 1);
    pdf.text("Qtd", 110, tableCurrentY - 1, { align: 'right' });
    pdf.text("Valor Unit.", 140, tableCurrentY - 1, { align: 'right' });
    pdf.text("Subtotal", 175, tableCurrentY - 1, { align: 'right' });
    tableCurrentY += lineHeight;

    // 4c. Linhas de Itens
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    if (doc.items && doc.items.length > 0) {
        doc.items.forEach((item, index) => {
            if (tableCurrentY > 270) { 
                pdf.addPage();
                tableCurrentY = 15 + headerHeight; 
                tableStartY = 15;
                // Recria o cabeçalho em nova página
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'bold');
                pdf.setFillColor(240, 240, 240); 
                pdf.rect(margin, tableCurrentY - headerHeight, width, headerHeight, 'F'); 
                pdf.text("Produto/Serviço", margin + 1, tableCurrentY - 1);
                pdf.text("Qtd", 110, tableCurrentY - 1, { align: 'right' });
                pdf.text("Valor Unit.", 140, tableCurrentY - 1, { align: 'right' });
                pdf.text("Subtotal", 175, tableCurrentY - 1, { align: 'right' });
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'normal');
            }

            const valor = parseFloat(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            const subtotal = parseFloat(item.subtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            
            pdf.text(item.produto, margin + 1, tableCurrentY);
            pdf.text(item.quantidade.toString(), 110, tableCurrentY, { align: 'right' });
            pdf.text(`R$ ${valor}`, 140, tableCurrentY, { align: 'right' });
            pdf.text(`R$ ${subtotal}`, 175, tableCurrentY, { align: 'right' });
            
            // Linha fina de separação entre itens
            pdf.setLineWidth(0.1); 
            pdf.setDrawColor(150, 150, 150); // Cor cinza
            pdf.line(margin, tableCurrentY + lineHeight * 0.5, margin + width, tableCurrentY + lineHeight * 0.5);
            
            tableCurrentY += lineHeight;
        });
    } else {
        pdf.text("Nenhum item adicionado ao orçamento.", margin + 1, tableCurrentY);
        tableCurrentY += lineHeight * 2;
    }

    // 4d. Desenha o Contorno da Tabela (Cabeçalho + Itens) com bordas arredondadas
    const tableTotalHeight = tableCurrentY - (tableStartY - headerHeight); 

    pdf.setDrawColor(0, 0, 0); // Borda escura para o contorno
    pdf.setLineWidth(0.2); // Linha um pouco mais grossa para o contorno
    
    // Desenha o Retângulo que engloba tudo
    pdf.rect(margin, tableStartY - headerHeight, width, tableTotalHeight, 'S', borderRadius); 

    // Desenha linha mais grossa separando o cabeçalho dos itens
    pdf.setLineWidth(0.4); 
    pdf.line(margin, tableStartY - 5 + 5, margin + width, tableStartY - 5 + 5); 
    
    y = tableCurrentY;
    
    // 5. Rodapé e Totais
    y += lineHeight * 0.5;
    pdf.line(margin, y, margin + width, y); 
    y += lineHeight;

    // Totais
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text("TOTAL GERAL (BRUTO):", 140, y, { align: 'right' });
    pdf.text(`R$ ${parseFloat(doc.totalBruto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 175, y, { align: 'right' });
    y += lineHeight;

    pdf.text(`TOTAL C/ DESCONTO À VISTA (${doc.descontoPercentual}%):`, 140, y, { align: 'right' });
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