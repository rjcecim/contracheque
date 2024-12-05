/**
 * Função para formatar números como moeda brasileira (R$)
 * @param {number} valor - Valor numérico a ser formatado
 * @returns {string} - Valor formatado em moeda
 */
function formatarComoMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Variáveis globais para armazenar dados e estado
let vencimentosData = {};           // Dados de vencimentos por cargo, classe e referência
let tabelaIR = [];                  // Tabela de imposto de renda
let deducaoPorDependente = 0;       // Dedução por dependente
let contribSindicalTipos = [];       // Tipos de contribuição sindical selecionados

// Mapeamento de nomes de cargos para exibição amigável
const cargoDisplayNames = {
    "Assessor_Tecnico_de_Controle_Externo_Auditor_de_Controle_Externo": "Assessor Técnico de Controle Externo / Auditor de Controle Externo",
    "Analista_Auxiliar_de_Controle_Externo": "Analista Auxiliar de Controle Externo",
    "Auxiliar_Tecnico_de_Controle_Externo_Administrativo_Informatica": "Auxiliar Técnico de Controle Externo - Administrativo / Informática",
    "Motorista": "Motorista",
    "Agente_Auxiliar_de_Servicos_Administrativos": "Agente Auxiliar de Serviços Administrativos",
    "Agente_Auxiliar_de_Servicos_Gerais": "Agente Auxiliar de Serviços Gerais",
    "Agente_de_Vigilancia_e_Zeladoria": "Agente de Vigilância e Zeladoria"
};

// Cargos elegíveis para gratificação de nível superior
const cargosElegiveisGratNivelSuperior = [
    "Assessor_Tecnico_de_Controle_Externo_Auditor_de_Controle_Externo",
    "Analista_Auxiliar_de_Controle_Externo"
];

// Estado para controle de exibição de modais
let modalShown = false;
let limitModal;             // Modal para limite de adicional de tempo de serviço
let contribSindicalModal;   // Modal para contribuição sindical

/**
 * Evento que ocorre quando o conteúdo do DOM é totalmente carregado
 */
document.addEventListener('DOMContentLoaded', function() {
    // Inicialização dos modais usando Bootstrap
    limitModal = new bootstrap.Modal(document.getElementById('limitModal'));
    contribSindicalModal = new bootstrap.Modal(document.getElementById('contribSindicalModal'));

    // Carregamento dos arquivos JSON necessários
    Promise.all([
        fetch('vencimentos.json').then(response => response.json()),
        fetch('tabela_ir.json').then(response => response.json())
    ]).then(([vencimentos, irData]) => {
        vencimentosData = vencimentos;
        tabelaIR = irData.tabela_ir;
        deducaoPorDependente = irData.deducao_por_dependente;
        inicializarComboboxes(); // Preenche os comboboxes de cargo, classe e referência
        calcularSalario();       // Calcula o salário inicial
    });

    // Adiciona ouvintes de eventos para inputs e selects
    document.getElementById('adicTempoServico').addEventListener('input', calcularSalario);
    document.getElementById('desconto1').addEventListener('change', calcularSalario);
    
    // Evento específico para contribuição sindical
    document.getElementById('desconto2').addEventListener('change', function() {
        if (this.value === 'sim') {
            contribSindicalModal.show(); // Exibe o modal para selecionar contribuições
        } else {
            removerRubrica('D303');
            removerRubrica('D351');
            contribSindicalTipos = [];
            calcularSalario();
        }
    });

    // Outros ouvintes de eventos
    document.getElementById('desconto3').addEventListener('change', calcularSalario);
    document.getElementById('desconto4').addEventListener('change', toggleBeneficiarios);
    document.getElementById('titulos').addEventListener('change', calcularSalario);
    document.getElementById('cursos').addEventListener('change', calcularSalario);
    document.getElementById('apcPercent').addEventListener('input', calcularSalario);
    document.getElementById('funcaoGratificada').addEventListener('change', calcularSalario);
    document.getElementById('ferias').addEventListener('change', calcularSalario);
    document.getElementById('abonoPermanencia').addEventListener('change', calcularSalario);
    document.getElementById('numeroDependentes').addEventListener('input', calcularSalario);

    // Evento para adicionar reajustes
    document.getElementById('addReajusteBtn').addEventListener('click', adicionarReajuste);

    // Evento para recalcular quando há alteração nos reajustes
    document.getElementById('reajustesContainer').addEventListener('input', function(event) {
        if (event.target.classList.contains('reajuste-input')) {
            calcularSalario();
        }
    });

    // Evento para imprimir a folha de pagamento
    document.getElementById('printButton').addEventListener('click', function() {
        imprimirFolhaPagamento();
    });

    // Evento para resetar as opções no modal de contribuição sindical ao abrir
    document.getElementById('contribSindicalModal').addEventListener('shown.bs.modal', function () {
        const contribs = document.querySelectorAll('input[name="contribSindical"]');
        contribs.forEach(contrib => contrib.checked = false);
    });

    // Evento para confirmar as contribuições sindicais selecionadas
    document.getElementById('confirmContribSindical').addEventListener('click', function() {
        contribSindicalTipos = [];
        const contribs = document.querySelectorAll('input[name="contribSindical"]:checked');
        contribs.forEach(contrib => {
            contribSindicalTipos.push(contrib.value);
        });

        // Se nenhuma contribuição for selecionada, desmarca o desconto
        if (contribSindicalTipos.length === 0) {
            document.getElementById('desconto2').value = 'nao';
            removerRubrica('D303');
            removerRubrica('D351');
            calcularSalario();
            return;
        }

        // Adiciona as rubricas correspondentes às contribuições selecionadas
        if (contribSindicalTipos.includes('SINDICONTAS-PA')) {
            adicionarRubrica({
                rubrica: 'D303',
                descricao: 'SINDICONTAS-PA CONTRIBUIÇÃO',
                valor: 40.00
            });
        }

        if (contribSindicalTipos.includes('AUD-TCE/PA')) {
            const vencimentoBase = parseFloat(document.getElementById('vencimentoBase').textContent.replace(',', '.').replace('R$', '')) || 0;
            const gratNivelSuperior = parseFloat(document.getElementById('gratNivelSuperior').textContent.replace(',', '.').replace('R$', '')) || 0;
            const valorD351 = 0.008 * (vencimentoBase + gratNivelSuperior);
            adicionarRubrica({
                rubrica: 'D351',
                descricao: 'AUD-TCE/PA',
                valor: valorD351
            });
        }

        calcularSalario();
    });

    // Eventos para substituir inputs por textos durante a impressão
    window.addEventListener('beforeprint', substituirInputsPorTextos);
    window.addEventListener('afterprint', restaurarInputs);
});

/**
 * Inicializa os comboboxes de cargo, classe e referência com os dados carregados
 */
function inicializarComboboxes() {
    let cargoSelect = document.getElementById('cargo');
    let classeSelect = document.getElementById('classe');
    let referenciaSelect = document.getElementById('referencia');

    // Limpa as opções existentes, mantendo apenas a opção padrão
    cargoSelect.length = 1;
    for (let cargo in vencimentosData) {
        let displayName = cargoDisplayNames[cargo] || cargo.replace(/_/g, ' ');
        let option = new Option(displayName, cargo);
        cargoSelect.add(option);
    }

    // Evento para preencher as classes quando um cargo é selecionado
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

    // Evento para preencher as referências quando uma classe é selecionada
    classeSelect.addEventListener('change', function() {
        referenciaSelect.disabled = false;
        referenciaSelect.length = 1;
        let referencias = vencimentosData[cargoSelect.value][this.value];
        for (let referencia in referencias) {
            referenciaSelect.add(new Option(referencia, referencia));
        }
        calcularSalario();
    });

    // Evento para recalcular o salário quando uma referência é selecionada
    referenciaSelect.addEventListener('change', function() {
        calcularSalario();
    });
}

/**
 * Aplica reajustes sucessivos ao valor original
 * @param {number} valorOriginal - Valor base a ser reajustado
 * @returns {number} - Valor reajustado
 */
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

/**
 * Exibe ou oculta a linha de beneficiários com base na seleção
 */
function toggleBeneficiarios() {
    const desconto4Select = document.getElementById('desconto4');
    const rowD042 = document.getElementById('rowD042');

    if (desconto4Select.value === 'sim') {
        rowD042.style.display = '';
        const inputBeneficiarios = document.getElementById('numeroBeneficiarios');
        inputBeneficiarios.addEventListener('input', calcularSalario);
    } else {
        rowD042.style.display = 'none';
    }
    calcularSalario();
}

// Array para armazenar os valores das rubricas
let valores = [
    { rubrica: 'P001', descricao: 'VENCIMENTO', valor: 0 },
    { rubrica: 'P002', descricao: 'GRAT. NÍVEL SUPERIOR', valor: 0 },
    { rubrica: 'P031', descricao: 'ADIC. TEMPO SERVIÇO (0%)', valor: 0 },
    { rubrica: 'P331', descricao: 'ABONO PRODUTIVIDADE COLETIVA (100%)', valor: 0 },
    { rubrica: 'D042', descricao: 'ASTCEMP-UNIODONTO | BENEFICIÁRIOS (0)', valor: 0 }
];

/**
 * Função principal para calcular o salário com base nas seleções e inputs do usuário
 */
function calcularSalario() {
    // Obtenção de todos os elementos do formulário
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
    const desconto4Select = document.getElementById('desconto4');
    const desconto4 = desconto4Select.value === 'sim';

    // Cálculo do adicional de tempo de serviço
    let adicTempoServicoPercentual = parseFloat(adicTempoServicoInput.value) / 100;

    // Limita o adicional a 60%
    if (adicTempoServicoPercentual > 0.60) {
        adicTempoServicoPercentual = 0.60;
        adicTempoServicoInput.value = 60;
    }

    // Exibe o modal se o limite for atingido
    if (adicTempoServicoPercentual === 0.60 && !modalShown) {
        modalShown = true;
        limitModal.show();
    } else if (adicTempoServicoPercentual < 0.60) {
        modalShown = false;
    }

    let vencimentoOriginal = 0;

    // Obtém o vencimento base com base nas seleções
    if (cargoSelect.value && classeSelect.value && referenciaSelect.value) {
        vencimentoOriginal = parseFloat(vencimentosData[cargoSelect.value][classeSelect.value][referenciaSelect.value]);
    }

    // Aplica reajustes ao vencimento original
    let vencimentoReajustado = aplicarReajustes(vencimentoOriginal);
    let vencimentoBase = vencimentoReajustado;
    document.getElementById('vencimentoBase').textContent = formatarComoMoeda(vencimentoBase);

    // Cálculo de adicionais por cursos
    let adicQualificacaoCursos = 0;
    if (cursosSelect.value === 'sim') {
        adicQualificacaoCursos = 0.10 * vencimentoBase;
    }

    // Cálculo de adicionais por títulos acadêmicos
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

    // Cálculo da gratificação de nível superior, se aplicável
    let gratNivelSuperior = 0;
    if (cargosElegiveisGratNivelSuperior.includes(cargoSelect.value)) {
        gratNivelSuperior = 0.80 * vencimentoBase;
    }
    document.getElementById('gratNivelSuperior').textContent = formatarComoMoeda(gratNivelSuperior);

    // Cálculo da função gratificada (gerente ou coordenador)
    let P307 = 0;
    if (funcaoGratificadaSelect.value === 'gerente' || funcaoGratificadaSelect.value === 'coordenador') {
        const referenciaP307Original = vencimentosData["Assessor_Tecnico_de_Controle_Externo_Auditor_de_Controle_Externo"]["A"]["1"];
        const referenciaP307 = aplicarReajustes(referenciaP307Original);
        P307 = funcaoGratificadaSelect.value === 'gerente' ? 0.90 * referenciaP307 : 1.00 * referenciaP307;
    }

    // Cálculo do adicional de tempo de serviço total
    let adicTempoServicoTotal = adicTempoServicoPercentual * (vencimentoBase + gratNivelSuperior + adicQualificacaoTitulos + P307);
    document.getElementById('valorP031').textContent = formatarComoMoeda(adicTempoServicoTotal);

    // Cálculo para base de previdência
    let adicTempoServicoParaBasePrevidencia = adicTempoServicoPercentual * (vencimentoBase + gratNivelSuperior + adicQualificacaoTitulos);

    // Cálculo do abono produtividade
    let apcPercent = parseFloat(apcPercentInput.value.replace(',', '.'));
    if (isNaN(apcPercent) || apcPercent < 0) {
        apcPercent = 0;
        apcPercentInput.value = 0;
    } else if (apcPercent > 100) {
        apcPercent = 100;
        apcPercentInput.value = 100;
    }

    const abonoBase = 0.90 * vencimentoBase;
    const abonoProdutiva = abonoBase * (apcPercent / 100);
    document.getElementById('valorP331').textContent = formatarComoMoeda(abonoProdutiva);

    // Cálculo da base para previdência
    const basePrevidencia = vencimentoBase + gratNivelSuperior + adicQualificacaoTitulos + adicTempoServicoParaBasePrevidencia;
    const finanpreve = 0.14 * basePrevidencia;

    // Cálculo da base de IR
    let baseIR = vencimentoBase + gratNivelSuperior + adicTempoServicoTotal + adicQualificacaoTitulos + adicQualificacaoCursos + abonoProdutiva + P307 - finanpreve;

    // Dedução por dependentes
    const numeroDependentes = parseInt(numeroDependentesInput.value);
    const deducaoDependentes = deducaoPorDependente * numeroDependentes;
    baseIR -= deducaoDependentes;

    // Cálculo do imposto de renda
    let { impostoDeRenda, aliquota } = calcularImpostoDeRenda(baseIR);

    let p025 = 0;
    let d055 = 0;
    let aliquotaD055Percentual = '0,0';

    // Cálculo adicional para férias, se aplicável
    if (feriasSelect.value === 'sim') {
        p025 = (vencimentoBase + gratNivelSuperior + adicTempoServicoTotal + adicQualificacaoCursos + adicQualificacaoTitulos + abonoProdutiva + P307) / 3;
        let baseD055 = p025 - (deducaoPorDependente * numeroDependentes);
        let { impostoDeRenda: irD055, aliquota: aliD055 } = calcularImpostoDeRenda(baseD055);
        d055 = irD055;
        aliquotaD055Percentual = (aliD055 * 100).toFixed(1).replace('.', ',');
    }

    let aliquotaPercentual = (aliquota * 100).toFixed(1).replace('.', ',');

    // Atualiza o array de valores com os cálculos realizados
    valores = [
        { rubrica: 'D031', descricao: `IMPOSTO DE RENDA (${aliquotaPercentual}%)`, valor: impostoDeRenda },
        { rubrica: 'R101', descricao: 'BASE I.R.', valor: baseIR },
        { rubrica: 'R102', descricao: 'BASE PREVIDÊNCIA', valor: basePrevidencia },
        { rubrica: 'D026', descricao: 'FINANPREV - LEI COMP Nº112 12/16 (14%)', valor: finanpreve },
        { rubrica: 'R103', descricao: 'REMUNERAÇÃO', valor: vencimentoBase + gratNivelSuperior + adicTempoServicoTotal + adicQualificacaoTitulos + adicQualificacaoCursos + abonoProdutiva + P307 + p025 }
    ];

    // Adiciona linhas adicionais se o usuário estiver em férias
    if (feriasSelect.value === 'sim') {
        valores.push(
            { rubrica: 'P025', descricao: '1/3 FÉRIAS (30 DIAS)', valor: p025 },
            { rubrica: 'D055', descricao: `IRRF - 1/3 FÉRIAS (30 DIAS) (${aliquotaD055Percentual}%)`, valor: d055 }
        );
    }

    // Adiciona adicional por cursos, se selecionado
    if (cursosSelect.value === 'sim') {
        valores.push(
            { rubrica: 'P316', descricao: 'ADICIONAL QUALIFIC./CURSOS', valor: adicQualificacaoCursos }
        );
    }

    // Adiciona adicional por títulos, se selecionado
    if (titulosSelect.value !== 'nenhum') {
        valores.push(
            { rubrica: 'P317', descricao: 'ADICIONAL QUALIFIC./TÍTULOS', valor: adicQualificacaoTitulos }
        );
    }

    // Adiciona representação por função gratificada, se aplicável
    if (funcaoGratificadaSelect.value === 'gerente' || funcaoGratificadaSelect.value === 'coordenador') {
        valores.push(
            { rubrica: 'P307', descricao: 'REPRESENTAÇÃO - FUNC. GRAT.', valor: P307 }
        );
    }

    // Adiciona descontos específicos
    if (desconto1) {
        valores.push(
            { rubrica: 'D070', descricao: 'TCE-UNIMED BELÉM', valor: 0.045 * basePrevidencia }
        );
    }

    // Adiciona contribuições sindicais selecionadas
    if (desconto2 && contribSindicalTipos.length > 0) {
        contribSindicalTipos.forEach(tipo => {
            if (tipo === 'SINDICONTAS-PA') {
                valores.push({
                    rubrica: 'D303',
                    descricao: 'SINDICONTAS-PA CONTRIBUIÇÃO',
                    valor: 40.00
                });
            } else if (tipo === 'AUD-TCE/PA') {
                const valorD351 = 0.008 * (vencimentoBase + gratNivelSuperior);
                valores.push({
                    rubrica: 'D351',
                    descricao: 'AUD-TCE/PA',
                    valor: valorD351
                });
            }
        });
    }

    // Adiciona mensalidade ASTCEMP, se selecionado
    if (desconto3) {
        valores.push(
            { rubrica: 'D019', descricao: 'ASTCEMP-MENSALIDADE', valor: 77.13 }
        );
    }

    // Adiciona desconto por beneficiários, se aplicável
    if (desconto4) {
        const beneficiariosInput = document.getElementById('numeroBeneficiarios');
        const numeroBeneficiarios = parseInt(beneficiariosInput.value) || 0;
        const valorD042 = 33.06 * numeroBeneficiarios;
        document.getElementById('valorD042').textContent = formatarComoMoeda(valorD042);
        valores.push({
            rubrica: 'D042',
            descricao: `ASTCEMP-UNIODONTO | BENEFICIÁRIOS (${numeroBeneficiarios})`,
            valor: valorD042
        });
    } else {
        document.getElementById('valorD042').textContent = '0,00';
    }

    // Atualiza a tabela com os valores calculados
    atualizarTabela(valores);
}

/**
 * Atualiza a tabela de contracheque com os valores fornecidos
 * @param {Array} valores - Array de objetos contendo rubrica, descrição e valor
 */
function atualizarTabela(valores) {
    const salaryTable = document.getElementById('salaryTable').getElementsByTagName('tbody')[0];
    
    // Remove linhas adicionais existentes, mantendo apenas as iniciais
    while (salaryTable.rows.length > 5) {
        salaryTable.deleteRow(5);
    }

    // Define a ordem das rubricas para exibição
    const ordemRubricas = [
        'P001', 'P002', 'P307', 'P031', 'P025', 'P316', 'P317', 'P331',
        'D026', 'D019', 'D031', 'D042', 'D055', 'D070', 'D303', 'D351',
        'R101', 'R102', 'R103', 'R104', 'R105'
    ];

    // Ordena os valores de acordo com a ordem definida
    valores.sort((a, b) => ordemRubricas.indexOf(a.rubrica) - ordemRubricas.indexOf(b.rubrica));

    // Insere cada valor na tabela
    valores.forEach(item => {
        if (item.rubrica !== 'D042') { // Evita duplicação da rubrica D042
            const row = salaryTable.insertRow();
            const cellRubrica = row.insertCell(0);
            const cellDescricao = row.insertCell(1);
            const cellValor = row.insertCell(2);
            cellRubrica.textContent = item.rubrica;
            cellDescricao.innerHTML = `${getRubricaIcon(item.rubrica)} ${item.descricao}`;
            cellValor.textContent = formatarComoMoeda(item.valor);
        }
    });

    // Cálculo do total de descontos
    const totalDescontos = valores.filter(item => item.rubrica.startsWith('D')).reduce((acc, item) => acc + item.valor, 0);
    const remuneracao = valores.find(item => item.rubrica === 'R103').valor;
    const liquidoReceber = remuneracao - totalDescontos;

    // Adiciona a linha de total de descontos
    const rowTotalDescontos = salaryTable.insertRow();
    rowTotalDescontos.classList.add('total-row');
    const cellRubricaDescontos = rowTotalDescontos.insertCell(0);
    const cellDescricaoDescontos = rowTotalDescontos.insertCell(1);
    const cellValorDescontos = rowTotalDescontos.insertCell(2);
    cellRubricaDescontos.textContent = 'R104';
    cellDescricaoDescontos.innerHTML = `<i class="bi bi-wallet2"></i> TOTAL DESCONTOS`;
    cellValorDescontos.textContent = formatarComoMoeda(totalDescontos);

    // Adiciona a linha de líquido a receber
    const rowLiquidoReceber = salaryTable.insertRow();
    rowLiquidoReceber.classList.add('total-row');
    const cellRubricaLiquido = rowLiquidoReceber.insertCell(0);
    const cellDescricaoLiquido = rowLiquidoReceber.insertCell(1);
    const cellValorLiquido = rowLiquidoReceber.insertCell(2);
    cellRubricaLiquido.textContent = 'R105';
    cellDescricaoLiquido.innerHTML = `<i class="bi bi-cash-stack"></i> LÍQUIDO A RECEBER`;
    cellValorLiquido.textContent = formatarComoMoeda(liquidoReceber);
}

/**
 * Calcula o imposto de renda com base na tabela fornecida
 * @param {number} baseIR - Base de cálculo do imposto de renda
 * @returns {Object} - Objeto contendo o valor do imposto e a alíquota aplicada
 */
function calcularImpostoDeRenda(baseIR) {
    let aliquota = 0;
    let deducao = 0;

    // Itera sobre as faixas da tabela de IR para encontrar a correta
    for (let faixa of tabelaIR) {
        if (faixa.limite && baseIR <= faixa.limite) {
            aliquota = faixa.aliquota;
            deducao = faixa.deducao;
            break;
        } else if (!faixa.limite) { // Última faixa sem limite
            aliquota = faixa.aliquota;
            deducao = faixa.deducao;
        }
    }

    let impostoDeRenda = (baseIR * aliquota) - deducao;
    if (impostoDeRenda < 0) impostoDeRenda = 0;

    return { impostoDeRenda, aliquota };
}

/**
 * Adiciona um novo reajuste ao contêiner de reajustes
 */
function adicionarReajuste() {
    const reajustesContainer = document.getElementById('reajustesContainer');
    const numeroReajustes = reajustesContainer.querySelectorAll('.input-group').length + 1;

    // Cria os elementos do novo grupo de reajuste
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

    // Evento para remover o reajuste
    removeBtn.addEventListener('click', function() {
        reajustesContainer.removeChild(div);
        recalcularNumeroReajustes();
        calcularSalario();
    });

    // Monta a estrutura do grupo de reajuste
    div.appendChild(span);
    div.appendChild(input);
    div.appendChild(spanPercent);
    div.appendChild(removeBtn);

    // Adiciona o novo grupo ao contêiner
    reajustesContainer.appendChild(div);
    calcularSalario();
}

/**
 * Recalcula os números dos reajustes após remoção
 */
function recalcularNumeroReajustes() {
    const reajusteGroups = document.querySelectorAll('#reajustesContainer .input-group');
    reajusteGroups.forEach((group, index) => {
        const labelSpan = group.querySelector('.input-group-text');
        labelSpan.textContent = `Qual o valor do ${index + 1}º reajuste?`;

        const removeBtn = group.querySelector('.remove-reajuste-btn');
        if (removeBtn) {
            if (index === 0) {
                removeBtn.style.display = 'none'; // Oculta o botão de remoção do primeiro reajuste
            } else {
                removeBtn.style.display = 'inline-block';
            }
        }
    });
}

/**
 * Substitui inputs por textos durante a impressão para melhor formatação
 */
function substituirInputsPorTextos() {
    const p031Input = document.getElementById('adicTempoServico');
    const p331Input = document.getElementById('apcPercent');
    const beneficiariosInput = document.getElementById('numeroBeneficiarios');

    if (p031Input && p331Input) {
        const p031Cell = p031Input.parentElement;
        const p331Cell = p331Input.parentElement;

        // Armazena o conteúdo original para restaurar após a impressão
        p031Cell.dataset.originalContent = p031Cell.innerHTML;
        p331Cell.dataset.originalContent = p331Cell.innerHTML;

        const p031Value = p031Input.value;
        const p331Value = p331Input.value;

        // Substitui os inputs por textos estáticos
        p031Cell.innerHTML = `<i class="bi bi-cash-stack"></i> ADIC. TEMPO SERVIÇO (${p031Value}%)`;
        p331Cell.innerHTML = `<i class="bi bi-cash-stack"></i> ABONO PRODUTIVIDADE COLETIVA (${p331Value}%)`;
    }

    if (beneficiariosInput) {
        const beneficiariosCell = beneficiariosInput.parentElement;
        beneficiariosCell.dataset.originalContent = beneficiariosCell.innerHTML;
        const beneficiariosValue = beneficiariosInput.value;
        beneficiariosCell.innerHTML = `<i class="bi bi-wallet2"></i> ASTCEMP-UNIODONTO | BENEFICIÁRIOS (${beneficiariosValue})`;
    }
}

/**
 * Restaura os inputs após a impressão
 */
function restaurarInputs() {
    const p031Cell = document.getElementById('valorP031').parentElement.previousElementSibling;
    const p331Cell = document.getElementById('valorP331').parentElement.previousElementSibling;
    const beneficiariosCell = document.getElementById('valorD042').parentElement.previousElementSibling;

    // Restaura o conteúdo original armazenado
    if (p031Cell.dataset.originalContent) {
        p031Cell.innerHTML = p031Cell.dataset.originalContent;
        delete p031Cell.dataset.originalContent;
    }

    if (p331Cell.dataset.originalContent) {
        p331Cell.innerHTML = p331Cell.dataset.originalContent;
        delete p331Cell.dataset.originalContent;
    }

    if (beneficiariosCell && beneficiariosCell.dataset.originalContent) {
        beneficiariosCell.innerHTML = beneficiariosCell.dataset.originalContent;
        delete beneficiariosCell.dataset.originalContent;
    }
}

/**
 * Função para imprimir a folha de pagamento
 */
function imprimirFolhaPagamento() {
    window.print();
}

/**
 * Adiciona uma nova rubrica ao array de valores
 * @param {Object} novaRubrica - Objeto contendo rubrica, descrição e valor
 */
function adicionarRubrica(novaRubrica) {
    removerRubrica(novaRubrica.rubrica); // Remove rubrica duplicada, se existir
    valores.push(novaRubrica);
}

/**
 * Remove uma rubrica específica do array de valores
 * @param {string} rubrica - Código da rubrica a ser removida
 */
function removerRubrica(rubrica) {
    valores = valores.filter(item => item.rubrica !== rubrica);
}

/**
 * Retorna o ícone correspondente à rubrica
 * @param {string} rubrica - Código da rubrica
 * @returns {string} - HTML do ícone correspondente
 */
function getRubricaIcon(rubrica) {
    const proventos = ['P001', 'P002', 'P307', 'P031', 'P025', 'P316', 'P317', 'P331', 'R101', 'R102', 'R103'];
    const descontos = ['D026', 'D031', 'D042', 'D055', 'D070', 'D303', 'D351', 'D019'];
    
    if (proventos.includes(rubrica)) {
        return '<i class="bi bi-cash-stack"></i>';
    } else if (descontos.includes(rubrica)) {
        return '<i class="bi bi-wallet2"></i>';
    } else {
        return '';
    }
}
