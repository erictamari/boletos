# Sistema Financeiro para GitHub Pages

## Arquivos
- `index.html` — estrutura do sistema
- `style.css` — visual responsivo
- `app.js` — cadastro, filtros, dashboard e armazenamento
- `README.md` — instruções

## Como publicar
1. Crie um repositório no GitHub.
2. Envie os 4 arquivos para a raiz do repositório.
3. Vá em **Settings → Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**.
5. Selecione `main` e `/ (root)`.
6. Salve e aguarde o GitHub Pages publicar.

## Recursos
- Cadastro de receitas e despesas.
- Valor, data, vencimento, categoria, forma e status.
- Edição e exclusão de lançamentos.
- Dashboard por dia, semana, mês ou todos.
- **Navegação entre períodos**: botões ◀ ▶ ao lado da data de referência para avançar/retroceder dias, semanas ou meses.
- Gráfico de receitas x despesas (Chart.js).
- Indicador de saldo e contas pendentes.
- Lista de próximas contas a vencer.
- Pesquisa e filtros por tipo/status.
- Exportação/importação de backup em JSON.
- Dados salvos no navegador com `localStorage`.

### Importante
Esta versão funciona sem banco de dados. Os dados ficam salvos no navegador/dispositivo em que foram cadastrados. Para ter os mesmos dados automaticamente no computador e no celular, será necessário adicionar um banco de dados e autenticação em uma próxima versão.