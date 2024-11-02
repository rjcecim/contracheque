// script.js

// Função para formatar valores monetários
function formatarComoMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Variáveis globais
let vencimentosData = {};
let vencimentoBase = 0;

// Mapear os cargos com os textos de exibição
const cargoDisplayNames = {
    "Assessor_Tecnico_de_Controle_Externo_Auditor_de_Controle_Externo": "Assessor Técnico de Controle Externo / Auditor de Controle Externo",
    "Analista_Auxiliar_de_Controle_Externo": "Analista Auxiliar de Controle Externo",
    "Auxiliar_Tecnico_de_Controle_Externo_Administrativo_Informatica": "Auxiliar Técnico de Controle Externo - Administrativo / Informática",
    "Motorista": "Motorista",
    "Agente_Auxiliar_de_Servicos_Administrativos": "Agente Auxiliar de Serviços Administrativos",
    "Agente_Auxiliar_de_Servicos_Gerais": "Agente Auxiliar de Serviços Gerais",
    "Agente_de_Vigilancia_e_Zeladoria": "Agente de Vigilância e Zeladoria"
};

// Variável para controlar se o modal já foi exibido
let modalShown = false;
// Variável para armazenar a referência ao modal
let limitModal;

// Carregar dados do arquivo vencimentos.json
document.addEventListener('DOMContentLoaded', function() {
    // Inicializa o modal
    limitModal = new bootstrap.Modal(document.getElementById('limitModal'));

    fetch('vencimentos.json')
        .then(response => response.json())
        .then(data => {
            vencimentosData = data;
            inicializarComboboxes();
            calcularSalario();
        });

    // Eventos para recalcular automaticamente
    document.getElementById('adicTempoServico').addEventListener('input', calcularSalario);
    document.getElementById('desconto1').addEventListener('change', calcularSalario);
    document.getElementById('desconto2').addEventListener('change', calcularSalario);
    document.getElementById('desconto3').addEventListener('change', calcularSalario);
    document.getElementById('desconto4').addEventListener('change', calcularSalario);
    document.getElementById('titulos').addEventListener('change', calcularSalario);

    // Evento para adicionar novos campos de reajuste
    document.getElementById('addReajusteBtn').addEventListener('click', adicionarReajuste);

    // Evento para recalcular salário ao alterar os reajustes
    document.getElementById('reajustesContainer').addEventListener('input', function(event) {
        if (event.target.classList.contains('reajuste-input')) {
            calcularSalario();
        }
    });
});

function inicializarComboboxes() {
    let cargoSelect = document.getElementById('cargo');
    let classeSelect = document.getElementById('classe');
    let referenciaSelect = document.getElementById('referencia');

    // Preenche o combobox de cargos
    cargoSelect.length = 1; // Mantém o primeiro item "Selecione um cargo"
    for (let cargo in vencimentosData) {
        let displayName = cargoDisplayNames[cargo] || cargo.replace(/_/g, ' ');
        let option = new Option(displayName, cargo);
        cargoSelect.add(option);
    }

    cargoSelect.addEventListener('change', function() {
        classeSelect.disabled = false;
        classeSelect.length = 1; // Mantém o primeiro item "Selecione a classe"
        referenciaSelect.disabled = true;
        referenciaSelect.length = 1;
        let classes = vencimentosData[this.value];
        for (let classe in classes) {
            classeSelect.add(new Option(classe, classe));
        }
        calcularSalario();
    });

    classeSelect.addEventListener('change', function() {
        referenciaSelect.disabled = false;
        referenciaSelect.length = 1; // Mantém o primeiro item "Selecione a referência"
        let referencias = vencimentosData[cargoSelect.value][this.value];
        for (let referencia in referencias) {
            referenciaSelect.add(new Option(referencia, referencia));
        }
        calcularSalario();
    });

    referenciaSelect.addEventListener('change', function() {
        calcularSalario();
    });
}

function calcularSalario() {
    const cargoSelect = document.getElementById('cargo');
    const classeSelect = document.getElementById('classe');
    const referenciaSelect = document.getElementById('referencia');
    const adicTempoServicoInput = document.getElementById('adicTempoServico');
    const titulosSelect = document.getElementById('titulos');
    let adicTempoServicoPercentual = parseFloat(adicTempoServicoInput.value) / 100;

    // Limitar o valor máximo a 60% e mínimo a 0%
    if (adicTempoServicoPercentual > 0.60) {
        adicTempoServicoPercentual = 0.60;
        adicTempoServicoInput.value = 60;
    }

    // Verifica se o valor atingiu 60% e se o modal já não foi exibido
    if (adicTempoServicoPercentual === 0.60 && !modalShown) {
        modalShown = true;
        limitModal.show();
    } else if (adicTempoServicoPercentual < 0.60) {
        // Reseta a variável se o valor for menor que 60%
        modalShown = false;
    }

    let vencimentoOriginal = 0;

    if (cargoSelect.value && classeSelect.value && referenciaSelect.value) {
        vencimentoOriginal = parseFloat(vencimentosData[cargoSelect.value][classeSelect.value][referenciaSelect.value]);
    }

    // Aplicar os reajustes sequencialmente
    let vencimentoReajustado = vencimentoOriginal;
    const reajusteInputs = document.querySelectorAll('.reajuste-input');
    reajusteInputs.forEach(input => {
        let percentual = parseFloat(input.value.replace(',', '.')) / 100;
        if (!isNaN(percentual) && percentual > 0) {
            vencimentoReajustado += vencimentoReajustado * percentual;
        }
    });

    vencimentoBase = vencimentoReajustado;

    document.getElementById('vencimentoBase').textContent = formatarComoMoeda(vencimentoBase);

    const adicQualificacaoCursos = 0.10 * vencimentoBase;

    // Ajuste no cálculo do adicional de títulos conforme a seleção
    let percentualTitulo = 0;
    switch (titulosSelect.value) {
        case 'especializacao':
            percentualTitulo = 0.15;
            break;
        case 'mestrado':
            percentualTitulo = 0.25;
            break;
        case 'doutorado':
            percentualTitulo = 0.35;
            break;
        default:
            percentualTitulo = 0;
    }
    const adicQualificacaoTitulos = percentualTitulo * vencimentoBase;

    const adicTempoServico = adicTempoServicoPercentual * (vencimentoBase + adicQualificacaoTitulos);
    document.getElementById('valorP031').textContent = formatarComoMoeda(adicTempoServico);
    const abonoProdColetiva = 0.70 * vencimentoBase;
    const basePrevidencia = vencimentoBase + adicTempoServico + adicQualificacaoTitulos;
    const finanpreve = 0.14 * basePrevidencia;

    // Cálculo da Base de Cálculo do IRPF
    let baseIR = vencimentoBase + adicTempoServico + adicQualificacaoCursos + adicQualificacaoTitulos + abonoProdColetiva - finanpreve;

    // Cálculo do Imposto de Renda utilizando a tabela progressiva de 2024
    let { impostoDeRenda, aliquota } = calcularImpostoDeRenda(baseIR);

    // Atualizar cálculo dos descontos com base nos comboboxes
    const tceUnimed = document.getElementById('desconto1').value === 'sim' ? 0.045 * (vencimentoBase + adicTempoServico + adicQualificacaoTitulos) : 0;
    const sindicontas = document.getElementById('desconto2').value === 'sim' ? 40.00 : 0;
    const astcempMensalidade = document.getElementById('desconto3').value === 'sim' ? 77.13 : 0;
    const astcempUniodonto = document.getElementById('desconto4').value === 'sim' ? 33.06 : 0;

    const remuneracao = vencimentoBase + adicTempoServico + adicQualificacaoCursos + adicQualificacaoTitulos + abonoProdColetiva;
    const descontos = finanpreve + impostoDeRenda + tceUnimed + sindicontas + astcempMensalidade + astcempUniodonto;
    const liquidoAReceber = remuneracao - descontos;

    // Formatar a alíquota em percentual para exibir na descrição
    let aliquotaPercentual = (aliquota * 100).toFixed(1).replace('.', ',');

    atualizarTabela([
        { rubrica: 'P316', descricao: 'ADICIONAL QUALIFIC./CURSO', valor: adicQualificacaoCursos },
        { rubrica: 'P317', descricao: 'ADICIONAL QUALIFIC./TÍTULOS', valor: adicQualificacaoTitulos },
        { rubrica: 'P331', descricao: 'ABONO PRODUTIVIDADE COLETIVA (100%)', valor: abonoProdColetiva },
        { rubrica: 'D026', descricao: 'FINANPREV - LEI COMP Nº112 12/16 (14%)', valor: finanpreve },
        { rubrica: 'D031', descricao: `IMPOSTO DE RENDA (${aliquotaPercentual}%)`, valor: impostoDeRenda },
        { rubrica: 'D070', descricao: 'TCE-UNIMED BELÉM', valor: tceUnimed },
        { rubrica: 'D303', descricao: 'SINDICONTAS-PA CONTRIBUIÇÃO', valor: sindicontas },
        { rubrica: 'D019', descricao: 'ASTCEMP-MENSALIDADE', valor: astcempMensalidade },
        { rubrica: 'D042', descricao: 'ASTCEMP-UNIODONTO', valor: astcempUniodonto },
        { rubrica: 'R101', descricao: 'BASE I.R.', valor: baseIR },
        { rubrica: 'R102', descricao: 'BASE PREVIDÊNCIA', valor: basePrevidencia },
        { rubrica: 'R103', descricao: 'REMUNERAÇÃO', valor: remuneracao },
        { rubrica: 'R104', descricao: 'TOTAL DESCONTOS', valor: descontos },
        { rubrica: 'R105', descricao: 'LÍQUIDO A RECEBER', valor: liquidoAReceber },
    ]);
}

function atualizarTabela(valores) {
    const salaryTable = document.getElementById('salaryTable').getElementsByTagName('tbody')[0];
    while (salaryTable.rows.length > 2) {
        salaryTable.deleteRow(2);
    }
    valores.forEach(item => {
        const row = salaryTable.insertRow();
        const cellRubrica = row.insertCell(0);
        const cellDescricao = row.insertCell(1);
        const cellValor = row.insertCell(2);
        cellRubrica.textContent = item.rubrica;
        cellDescricao.textContent = item.descricao;
        cellValor.textContent = formatarComoMoeda(item.valor);
    });
}

// Função para calcular o Imposto de Renda conforme a tabela progressiva de 2024
function calcularImpostoDeRenda(baseIR) {
    let aliquota, deducao;

    if (baseIR <= 2259.20) {
        aliquota = 0;
        deducao = 0;
    } else if (baseIR <= 2826.65) {
        aliquota = 0.075;
        deducao = 169.44;
    } else if (baseIR <= 3751.05) {
        aliquota = 0.15;
        deducao = 381.44;
    } else if (baseIR <= 4664.68) {
        aliquota = 0.225;
        deducao = 662.77;
    } else {
        aliquota = 0.275;
        deducao = 896.00;
    }

    let impostoDeRenda = (baseIR * aliquota) - deducao;
    if (impostoDeRenda < 0) impostoDeRenda = 0;

    return { impostoDeRenda, aliquota };
}

function adicionarReajuste() {
    const reajustesContainer = document.getElementById('reajustesContainer');
    const numeroReajustes = reajustesContainer.querySelectorAll('.input-group').length + 1;

    const div = document.createElement('div');
    div.classList.add('input-group', 'mb-2');

    const span = document.createElement('span');
    span.classList.add('input-group-text');
    span.textContent = `Qual o valor do ${numeroReajustes}º reajuste?`;

    const input = document.createElement('input');
    input.type = 'number';
    input.classList.add('form-control', 'reajuste-input');
    input.placeholder = '0,00';
    input.step = '0.01';
    input.min = '0';

    const spanPercent = document.createElement('span');
    spanPercent.classList.add('input-group-text');
    spanPercent.textContent = '%';

    // Botão para remover o reajuste
    const removeBtn = document.createElement('button');
    removeBtn.classList.add('btn', 'btn-outline-secondary', 'remove-reajuste-btn');
    removeBtn.type = 'button';
    removeBtn.innerHTML = '<img src="subtraction.svg" alt="Remover" width="20" height="20">';

    // Evento para remover o reajuste
    removeBtn.addEventListener('click', function() {
        reajustesContainer.removeChild(div);
        recalcularNumeroReajustes();
        calcularSalario();
    });

    div.appendChild(span);
    div.appendChild(input);
    div.appendChild(spanPercent);
    div.appendChild(removeBtn);

    reajustesContainer.appendChild(div);
}

// Função para recalcular os números ordinais dos reajustes após a remoção
function recalcularNumeroReajustes() {
    const reajusteGroups = document.querySelectorAll('#reajustesContainer .input-group');
    reajusteGroups.forEach((group, index) => {
        const labelSpan = group.querySelector('.input-group-text');
        labelSpan.textContent = `Qual o valor do ${index + 1}º reajuste?`;

        // Mostrar o botão de remover apenas do 2º reajuste em diante
        const removeBtn = group.querySelector('.remove-reajuste-btn');
        if (removeBtn) {
            if (index === 0) {
                removeBtn.style.display = 'none';
            } else {
                removeBtn.style.display = 'inline-block';
            }
        }
    });
}

// Ajuste inicial para esconder o botão de remover do primeiro reajuste
document.addEventListener('DOMContentLoaded', function() {
    const firstRemoveBtn = document.querySelector('#reajustesContainer .remove-reajuste-btn');
    if (firstRemoveBtn) {
        firstRemoveBtn.style.display = 'none';
    }
});
