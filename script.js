function formatarComoMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

let vencimentosData = {};
let tabelaIR = [];
let deducaoPorDependente = 0;

const cargoDisplayNames = {
    "Assessor_Tecnico_de_Controle_Externo_Auditor_de_Controle_Externo": "Assessor Técnico de Controle Externo / Auditor de Controle Externo",
    "Analista_Auxiliar_de_Controle_Externo": "Analista Auxiliar de Controle Externo",
    "Auxiliar_Tecnico_de_Controle_Externo_Administrativo_Informatica": "Auxiliar Técnico de Controle Externo - Administrativo / Informática",
    "Motorista": "Motorista",
    "Agente_Auxiliar_de_Servicos_Administrativos": "Agente Auxiliar de Serviços Administrativos",
    "Agente_Auxiliar_de_Servicos_Gerais": "Agente Auxiliar de Serviços Gerais",
    "Agente_de_Vigilancia_e_Zeladoria": "Agente de Vigilância e Zeladoria"
};

const cargosElegiveisGratNivelSuperior = [
    "Assessor_Tecnico_de_Controle_Externo_Auditor_de_Controle_Externo",
    "Analista_Auxiliar_de_Controle_Externo"
];

let modalShown = false;
let limitModal;

document.addEventListener('DOMContentLoaded', function() {
    limitModal = new bootstrap.Modal(document.getElementById('limitModal'));

    Promise.all([
        fetch('vencimentos.json').then(response => response.json()),
        fetch('tabela_ir.json').then(response => response.json())
    ]).then(([vencimentos, irData]) => {
        vencimentosData = vencimentos;
        tabelaIR = irData.tabela_ir;
        deducaoPorDependente = irData.deducao_por_dependente;
        inicializarComboboxes();
        calcularSalario();
    });

    document.getElementById('adicTempoServico').addEventListener('input', calcularSalario);
    document.getElementById('desconto1').addEventListener('change', calcularSalario);
    document.getElementById('desconto2').addEventListener('change', calcularSalario);
    document.getElementById('desconto3').addEventListener('change', calcularSalario);
    document.getElementById('desconto4').addEventListener('change', calcularSalario);
    document.getElementById('titulos').addEventListener('change', calcularSalario);
    document.getElementById('cursos').addEventListener('change', calcularSalario);
    document.getElementById('apcPercent').addEventListener('input', calcularSalario);
    document.getElementById('funcaoGratificada').addEventListener('change', calcularSalario);
    document.getElementById('ferias').addEventListener('change', calcularSalario);
    document.getElementById('abonoPermanencia').addEventListener('change', calcularSalario);
    document.getElementById('numeroDependentes').addEventListener('input', calcularSalario);

    document.getElementById('addReajusteBtn').addEventListener('click', adicionarReajuste);

    document.getElementById('reajustesContainer').addEventListener('input', function(event) {
        if (event.target.classList.contains('reajuste-input')) {
            calcularSalario();
        }
    });

    const firstRemoveBtn = document.querySelector('#reajustesContainer .remove-reajuste-btn');
    if (firstRemoveBtn) {
        firstRemoveBtn.style.display = 'none';
    }
});

function inicializarComboboxes() {
    let cargoSelect = document.getElementById('cargo');
    let classeSelect = document.getElementById('classe');
    let referenciaSelect = document.getElementById('referencia');

    cargoSelect.length = 1;
    for (let cargo in vencimentosData) {
        let displayName = cargoDisplayNames[cargo] || cargo.replace(/_/g, ' ');
        let option = new Option(displayName, cargo);
        cargoSelect.add(option);
    }

    cargoSelect.addEventListener('change', function() {
        classeSelect.disabled = false;
        classeSelect.length = 1;
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
        referenciaSelect.length = 1;
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

function aplicarReajustes(valorOriginal) {
    let valorReajustado = valorOriginal;
    const reajusteInputs = document.querySelectorAll('.reajuste-input');
    reajusteInputs.forEach(input => {
        let percentual = parseFloat(input.value.replace(',', '.')) / 100;
        if (!isNaN(percentual) && percentual !== 0) {
            valorReajustado += valorReajustado * percentual;
        }
    });
    return valorReajustado;
}

function calcularSalario() {
    const cargoSelect = document.getElementById('cargo');
    const classeSelect = document.getElementById('classe');
    const referenciaSelect = document.getElementById('referencia');
    const adicTempoServicoInput = document.getElementById('adicTempoServico');
    const titulosSelect = document.getElementById('titulos');
    const cursosSelect = document.getElementById('cursos');
    const apcPercentInput = document.getElementById('apcPercent');
    const funcaoGratificadaSelect = document.getElementById('funcaoGratificada');
    const feriasSelect = document.getElementById('ferias');
    const abonoPermanenciaSelect = document.getElementById('abonoPermanencia');
    const numeroDependentesInput = document.getElementById('numeroDependentes');
    const desconto1 = document.getElementById('desconto1').value === 'sim';
    const desconto2 = document.getElementById('desconto2').value === 'sim';
    const desconto3 = document.getElementById('desconto3').value === 'sim';
    const desconto4 = document.getElementById('desconto4').value === 'sim';

    let adicTempoServicoPercentual = parseFloat(adicTempoServicoInput.value) / 100;

    if (adicTempoServicoPercentual > 0.60) {
        adicTempoServicoPercentual = 0.60;
        adicTempoServicoInput.value = 60;
    }

    if (adicTempoServicoPercentual === 0.60 && !modalShown) {
        modalShown = true;
        limitModal.show();
    } else if (adicTempoServicoPercentual < 0.60) {
        modalShown = false;
    }

    let vencimentoOriginal = 0;

    if (cargoSelect.value && classeSelect.value && referenciaSelect.value) {
        vencimentoOriginal = parseFloat(vencimentosData[cargoSelect.value][classeSelect.value][referenciaSelect.value]);
    }

    let vencimentoReajustado = aplicarReajustes(vencimentoOriginal);
    let vencimentoBase = vencimentoReajustado;
    document.getElementById('vencimentoBase').textContent = formatarComoMoeda(vencimentoBase);

    let adicQualificacaoCursos = 0;
    if (cursosSelect.value === 'sim') {
        adicQualificacaoCursos = 0.10 * vencimentoBase;
    }

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

    let gratNivelSuperior = 0;
    if (cargosElegiveisGratNivelSuperior.includes(cargoSelect.value)) {
        gratNivelSuperior = 0.80 * vencimentoBase;
    }
    document.getElementById('gratNivelSuperior').textContent = formatarComoMoeda(gratNivelSuperior);

    let P307 = 0;
    if (funcaoGratificadaSelect.value === 'gerente' || funcaoGratificadaSelect.value === 'coordenador') {
        const referenciaP307Original = vencimentosData["Assessor_Tecnico_de_Controle_Externo_Auditor_de_Controle_Externo"]["A"]["1"];
        const referenciaP307 = aplicarReajustes(referenciaP307Original);
        P307 = funcaoGratificadaSelect.value === 'gerente' ? 0.90 * referenciaP307 : 1.00 * referenciaP307;
    }

    let adicTempoServicoTotal = adicTempoServicoPercentual * (vencimentoBase + gratNivelSuperior + adicQualificacaoTitulos + P307);
    document.getElementById('valorP031').textContent = formatarComoMoeda(adicTempoServicoTotal);

    let adicTempoServicoParaBasePrevidencia = adicTempoServicoPercentual * (vencimentoBase + gratNivelSuperior + adicQualificacaoTitulos);

    let apcPercent = parseFloat(apcPercentInput.value.replace(',', '.'));
    if (isNaN(apcPercent) || apcPercent < 0) {
        apcPercent = 0;
        apcPercentInput.value = 0;
    } else if (apcPercent > 100) {
        apcPercent = 100;
        apcPercentInput.value = 100;
    }

    const abonoBase = 0.70 * vencimentoBase;
    const abonoProdutiva = abonoBase * (apcPercent / 100);
    document.getElementById('valorP331').textContent = formatarComoMoeda(abonoProdutiva);

    const basePrevidencia = vencimentoBase + gratNivelSuperior + adicQualificacaoTitulos + adicTempoServicoParaBasePrevidencia;
    const finanpreve = 0.14 * basePrevidencia;

    let baseIR = vencimentoBase + gratNivelSuperior + adicTempoServicoTotal + adicQualificacaoTitulos + adicQualificacaoCursos + abonoProdutiva + P307 - finanpreve;

    const numeroDependentes = parseInt(numeroDependentesInput.value);
    const deducaoDependentes = deducaoPorDependente * numeroDependentes;
    baseIR -= deducaoDependentes;

    let { impostoDeRenda, aliquota } = calcularImpostoDeRenda(baseIR);

    let p025 = 0;
    let d055 = 0;
    let aliquotaD055Percentual = '0,0';

    if (feriasSelect.value === 'sim') {
        p025 = (vencimentoBase + gratNivelSuperior + adicTempoServicoTotal + adicQualificacaoCursos + adicQualificacaoTitulos + abonoProdutiva + P307) / 3;
        let baseD055 = p025 - (deducaoPorDependente * numeroDependentes);
        let { impostoDeRenda: irD055, aliquota: aliD055 } = calcularImpostoDeRenda(baseD055);
        d055 = irD055;
        aliquotaD055Percentual = (aliD055 * 100).toFixed(1).replace('.', ',');
    }

    let aliquotaPercentual = (aliquota * 100).toFixed(1).replace('.', ',');

    let valores = [
        { rubrica: 'D031', descricao: `IMPOSTO DE RENDA (${aliquotaPercentual}%)`, valor: impostoDeRenda },
        { rubrica: 'R101', descricao: 'BASE I.R.', valor: baseIR },
        { rubrica: 'R102', descricao: 'BASE PREVIDÊNCIA', valor: basePrevidencia },
        { rubrica: 'D026', descricao: 'FINANPREV - LEI COMP Nº112 12/16 (14%)', valor: finanpreve },
        { rubrica: 'R103', descricao: 'REMUNERAÇÃO', valor: vencimentoBase + gratNivelSuperior + adicTempoServicoTotal + adicQualificacaoTitulos + adicQualificacaoCursos + abonoProdutiva + P307 + (feriasSelect.value === 'sim' ? p025 : 0) },
        { rubrica: 'R104', descricao: 'TOTAL DESCONTOS', valor: finanpreve + impostoDeRenda + (desconto1 ? 0.045 * basePrevidencia : 0) + (desconto2 ? 40.00 : 0) + (desconto3 ? 77.13 : 0) + (desconto4 ? 33.06 : 0) + d055 },
        { rubrica: 'R105', descricao: 'LÍQUIDO A RECEBER', valor: (vencimentoBase + gratNivelSuperior + adicTempoServicoTotal + adicQualificacaoTitulos + adicQualificacaoCursos + abonoProdutiva + P307 + (feriasSelect.value === 'sim' ? p025 : 0)) - (finanpreve + impostoDeRenda + (desconto1 ? 0.045 * basePrevidencia : 0) + (desconto2 ? 40.00 : 0) + (desconto3 ? 77.13 : 0) + (desconto4 ? 33.06 : 0) + d055) }
    ];

    if (feriasSelect.value === 'sim') {
        valores.push(
            { rubrica: 'P025', descricao: '1/3 FÉRIAS (30 DIAS)', valor: p025 },
            { rubrica: 'D055', descricao: `IRRF - 1/3 FÉRIAS (30 DIAS) (${aliquotaD055Percentual}%)`, valor: d055 }
        );
    }

    if (cursosSelect.value === 'sim') {
        valores.push(
            { rubrica: 'P316', descricao: 'ADICIONAL QUALIFIC./CURSOS', valor: adicQualificacaoCursos }
        );
    }

    if (titulosSelect.value !== 'nenhum') {
        valores.push(
            { rubrica: 'P317', descricao: 'ADICIONAL QUALIFIC./TÍTULOS', valor: adicQualificacaoTitulos }
        );
    }

    if (funcaoGratificadaSelect.value === 'gerente' || funcaoGratificadaSelect.value === 'coordenador') {
        valores.push(
            { rubrica: 'P307', descricao: 'REPRESENTAÇÃO - FUNC. GRAT.', valor: P307 }
        );
    }

    if (desconto1) {
        valores.push(
            { rubrica: 'D070', descricao: 'TCE-UNIMED BELÉM', valor: 0.045 * basePrevidencia }
        );
    }

    if (desconto2) {
        valores.push(
            { rubrica: 'D303', descricao: 'SINDICONTAS-PA CONTRIBUIÇÃO', valor: 40.00 }
        );
    }

    if (desconto3) {
        valores.push(
            { rubrica: 'D019', descricao: 'ASTCEMP-MENSALIDADE', valor: 77.13 }
        );
    }

    if (desconto4) {
        valores.push(
            { rubrica: 'D042', descricao: 'ASTCEMP-UNIODONTO', valor: 33.06 }
        );
    }

    valores = valores.filter((item, index, self) =>
        index === self.findIndex((t) => (
            t.rubrica === item.rubrica
        ))
    );

    valores.sort((a, b) => {
        if (a.rubrica.startsWith('P') && !b.rubrica.startsWith('P')) return -1;
        if (b.rubrica.startsWith('P') && !a.rubrica.startsWith('P')) return 1;
        if (a.rubrica.startsWith('D') && !b.rubrica.startsWith('D')) return -1;
        if (b.rubrica.startsWith('D') && !a.rubrica.startsWith('D')) return 1;
        return 0;
    });

    atualizarTabela(valores);
}

function atualizarTabela(valores) {
    const salaryTable = document.getElementById('salaryTable').getElementsByTagName('tbody')[0];
    while (salaryTable.rows.length > 4) {
        salaryTable.deleteRow(4);
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

function calcularImpostoDeRenda(baseIR) {
    let aliquota = 0;
    let deducao = 0;

    for (let faixa of tabelaIR) {
        if (faixa.limite && baseIR <= faixa.limite) {
            aliquota = faixa.aliquota;
            deducao = faixa.deducao;
            break;
        } else if (!faixa.limite) {
            aliquota = faixa.aliquota;
            deducao = faixa.deducao;
        }
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
    input.setAttribute('aria-label', `Valor do ${numeroReajustes}º reajuste`);

    const spanPercent = document.createElement('span');
    spanPercent.classList.add('input-group-text');
    spanPercent.textContent = '%';

    const removeBtn = document.createElement('button');
    removeBtn.classList.add('btn', 'btn-outline-secondary', 'remove-reajuste-btn');
    removeBtn.type = 'button';
    removeBtn.innerHTML = '<i class="bi bi-dash"></i>';

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

function recalcularNumeroReajustes() {
    const reajusteGroups = document.querySelectorAll('#reajustesContainer .input-group');
    reajusteGroups.forEach((group, index) => {
        const labelSpan = group.querySelector('.input-group-text');
        labelSpan.textContent = `Qual o valor do ${index + 1}º reajuste?`;

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
