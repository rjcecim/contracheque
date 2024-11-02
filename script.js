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

// Carregar dados do arquivo vencimentos.json
document.addEventListener('DOMContentLoaded', function() {
    fetch('vencimentos.json')
        .then(response => response.json())
        .then(data => {
            vencimentosData = data;
            inicializarComboboxes();
            calcularSalario();
        });

    // Eventos para recalcular automaticamente
    document.getElementById('adicTempoServico').addEventListener('input', calcularSalario);
    // Atualizar eventos para os selects dos descontos
    document.getElementById('desconto1').addEventListener('change', calcularSalario);
    document.getElementById('desconto2').addEventListener('change', calcularSalario);
    document.getElementById('desconto3').addEventListener('change', calcularSalario);
    document.getElementById('desconto4').addEventListener('change', calcularSalario);
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
    let adicTempoServicoPercentual = parseFloat(adicTempoServicoInput.value) / 100;

    // Limitar o valor máximo a 60% e mínimo a 0%
    if (adicTempoServicoPercentual > 0.60) {
        adicTempoServicoPercentual = 0.60;
        adicTempoServicoInput.value = 60;
    } else if (adicTempoServicoPercentual < 0) {
        adicTempoServicoPercentual = 0;
        adicTempoServicoInput.value = 0;
    }

    if (cargoSelect.value && classeSelect.value && referenciaSelect.value) {
        vencimentoBase = parseFloat(vencimentosData[cargoSelect.value][classeSelect.value][referenciaSelect.value]);
    } else {
        vencimentoBase = 0;
    }

    document.getElementById('vencimentoBase').textContent = formatarComoMoeda(vencimentoBase);

    const adicQualificacaoCursos = 0.10 * vencimentoBase;
    const adicQualificacaoTitulos = 0.15 * vencimentoBase;
    const adicTempoServico = adicTempoServicoPercentual * (vencimentoBase + adicQualificacaoTitulos);
    document.getElementById('valorP031').textContent = formatarComoMoeda(adicTempoServico);
    const abonoProdColetiva = 0.70 * vencimentoBase;
    const basePrevidencia = vencimentoBase + adicTempoServico + adicQualificacaoTitulos;
    const finanpreve = 0.14 * basePrevidencia;
    let baseIR = vencimentoBase + adicTempoServico + adicQualificacaoCursos + adicQualificacaoTitulos + abonoProdColetiva - finanpreve;
    let impostoDeRenda = 0.275 * baseIR - 896.00;
    if (impostoDeRenda < 0) impostoDeRenda = 0;

    // Atualizar cálculo dos descontos com base nos comboboxes
    const tceUnimed = document.getElementById('desconto1').value === 'sim' ? 0.045 * (vencimentoBase + adicTempoServico + adicQualificacaoTitulos) : 0;
    const sindicontas = document.getElementById('desconto2').value === 'sim' ? 40.00 : 0;
    const astcempMensalidade = document.getElementById('desconto3').value === 'sim' ? 77.13 : 0;
    const astcempUniodonto = document.getElementById('desconto4').value === 'sim' ? 33.06 : 0;

    const remuneracao = vencimentoBase + adicTempoServico + adicQualificacaoCursos + adicQualificacaoTitulos + abonoProdColetiva;
    const descontos = finanpreve + impostoDeRenda + tceUnimed + sindicontas + astcempMensalidade + astcempUniodonto;
    const liquidoAReceber = remuneracao - descontos;

    atualizarTabela([
        { rubrica: 'P316', descricao: 'ADICIONAL QUALIFIC./CURSO', valor: adicQualificacaoCursos },
        { rubrica: 'P317', descricao: 'ADICIONAL QUALIFIC./TÍTULOS', valor: adicQualificacaoTitulos },
        { rubrica: 'P331', descricao: 'ABONO PRODUTIVIDADE COLETIVA (100%)', valor: abonoProdColetiva },
        { rubrica: 'D026', descricao: 'FINANPREV - LEI COMP Nº112 12/16 (14%)', valor: finanpreve },
        { rubrica: 'D031', descricao: 'IMPOSTO DE RENDA (27,5%)', valor: impostoDeRenda },
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
