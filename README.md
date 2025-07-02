<div align="center">
  <h1>📋 Simulador de Contracheque - TCE/PA</h1>
  <p>Ferramenta de simulação de contracheque para servidores do Tribunal de Contas do Estado do Pará</p>
  
  ![Status](https://img.shields.io/badge/Status-Em%20Produção-brightgreen)
  ![Versão](https://img.shields.io/badge/Versão-1.0.0-blue)
  ![Licença](https://img.shields.io/badge/Licença-MIT-orange)
</div>

## 🌟 Visão Geral

O Simulador de Contracheque é uma aplicação web que permite aos servidores do TCE/PA simular seus contracheques de forma interativa, considerando diversos parâmetros como cargo, classe, referência, benefícios e descontos.

## ✨ Funcionalidades

### 🎯 Cálculos Automáticos
- 💰 Cálculo de vencimento base por cargo, classe e referência
- 📊 Cálculo automático de benefícios e adicionais
- 🧮 Descontos de INSS e IRRF com base nas tabelas vigentes
- 📝 Geração de demonstrativo detalhado

### 🛠️ Opções de Configuração
- 🏛️ Seleção de cargo (Auditor, Analista, Técnico, etc.)
- 📊 Classes (A a E) e níveis de referência (1 a 4)
- 🎓 Títulos acadêmicos (Especialização, Mestrado, Doutorado)
- 👨‍👩‍👧‍👦 Número de dependentes para cálculo do IR
- 🏖️ Opção de férias
- 💼 Funções gratificadas (Gerente, Coordenador)

### 💸 Descontos Disponíveis
- 🏥 TCE-UNIMED BELÉM
- 🤝 SINDICONTAS-PA (Contribuição Sindical)
- 🦷 ASTCEMP-UNIODONTO (Plano Odontológico)
- 🏢 ASTCEMP-MENSALIDADE

## 🚀 Como Usar

1. **Selecione seu Cargo**
   - Escolha seu cargo na lista suspensa
   - Selecione a classe (A a E) e a referência (1 a 4)
   - O vencimento base será calculado automaticamente

2. **Adicione Benefícios**
   - Selecione títulos acadêmicos, se aplicável
   - Adicione cursos adicionais
   - Informe o número de dependentes
   - Selecione função gratificada, se for o caso

3. **Configure Descontos**
   - Ative/desative os descontos disponíveis
   - Para contribuições sindicais, selecione os tipos desejados
   - O sistema calculará automaticamente os valores

4. **Ajustes Finais**
   - Adicione reajustes percentuais, se necessário
   - Verifique o resumo do contracheque
   - Utilize o botão de impressão para salvar ou compartilhar

## 🛠️ Tecnologias Utilizadas

- HTML5, CSS3 e JavaScript puro
- Bootstrap 5 para interface responsiva
- Bootstrap Icons para ícones
- JSON para armazenamento de dados

## 📱 Compatibilidade

- Navegadores modernos (Chrome, Firefox, Edge, Safari)
- Design responsivo para desktop e dispositivos móveis
- Funciona offline após o carregamento inicial

## 📊 Estrutura do Projeto

```
contracheque-main/
├── index.html      # Página principal
├── script.js       # Lógica da aplicação
├── style.css       # Estilos personalizados
├── vencimentos.json # Tabela de vencimentos
└── tabela_ir.json  # Tabela de imposto de renda
```

## 📝 Notas Importantes

- Os cálculos são baseados nas tabelas oficiais do TCE/PA
- Valores sujeitos a alterações conforme legislação
- Consulte sempre o departamento de RH para informações oficiais

## 📅 Histórico de Atualizações

### [1.0.0] - 02/07/2025
#### Adicionado
- Versão inicial do simulador
- Cálculo de vencimentos baseado em cargo/classe/referência
- Cálculo automático de benefícios e descontos
- Interface responsiva

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

---
<div align="center">
  Desenvolvido para o Tribunal de Contas do Estado do Pará
</div>
