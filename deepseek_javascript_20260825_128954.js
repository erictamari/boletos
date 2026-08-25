document.addEventListener('DOMContentLoaded', function() {
  const KEY = "financeiro_v1";
  let transactions = JSON.parse(localStorage.getItem(KEY) || "[]");
  let chart = null;

  const $ = id => document.getElementById(id);
  const money = v => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
  const today = () => {
    let d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };

  // Inicializa datas
  const refDateInput = $("referenceDate");
  if (refDateInput) refDateInput.value = today();
  const dateInput = $("date");
  if (dateInput) dateInput.value = today();
  const todayLabel = $("todayLabel");
  if (todayLabel) {
    todayLabel.textContent = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(transactions));
    render();
  }

  function range() {
    const ref = new Date($("referenceDate").value + "T12:00:00");
    const p = $("periodFilter").value;
    let s, e;
    if (p === "day") {
      s = e = new Date(ref);
    } else if (p === "week") {
      let day = ref.getDay() || 7;
      s = new Date(ref);
      s.setDate(ref.getDate() - day + 1);
      e = new Date(s);
      e.setDate(s.getDate() + 6);
    } else if (p === "month") {
      s = new Date(ref.getFullYear(), ref.getMonth(), 1);
      e = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    } else {
      s = new Date(2000, 0, 1);
      e = new Date(2100, 0, 1);
    }
    return { s, e };
  }

  function inRange(t, r) {
    const d = new Date(t.date + "T12:00:00");
    return d >= r.s && d <= r.e;
  }

  function render() {
    renderDash();
    renderTable();
  }

  function renderDash() {
    const r = range();
    const arr = transactions.filter(t => inRange(t, r));
    const inc = arr.filter(t => t.type === "income");
    const exp = arr.filter(t => t.type === "expense");
    const ti = inc.reduce((a, t) => a + t.amount, 0);
    const te = exp.reduce((a, t) => a + t.amount, 0);
    const pending = exp.filter(t => t.status === "pending").reduce((a, t) => a + t.amount, 0);

    $("totalIncome").textContent = money(ti);
    $("totalExpense").textContent = money(te);
    $("balance").textContent = money(ti - te);
    $("pending").textContent = money(pending);
    $("incomeCount").textContent = inc.length + " lançamento(s)";
    $("expenseCount").textContent = exp.length + " lançamento(s)";
    const periodText = $("periodText");
    if (periodText) periodText.textContent = $("periodFilter").selectedOptions[0].text;

    let cat = {};
    arr.forEach(t => {
      const key = t.category || "Sem categoria";
      cat[key] = (cat[key] || 0) + (t.type === "income" ? t.amount : -t.amount);
    });
    const summaryList = $("summaryList");
    if (summaryList) {
      summaryList.innerHTML = Object.entries(cat)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 8)
        .map(([k, v]) => `<div class="summary-row"><b>${esc(k)}</b><span class="${v >= 0 ? "green" : "red"}">${money(v)}</span></div>`)
        .join("") || "<p>Sem lançamentos no período.</p>";
    }

    const upcoming = transactions
      .filter(t => t.type === "expense" && t.status === "pending")
      .sort((a, b) => (a.dueDate || a.date).localeCompare(b.dueDate || b.date))
      .slice(0, 8);
    const upcomingList = $("upcomingList");
    if (upcomingList) upcomingList.innerHTML = table(upcoming, true);

    drawChart(arr, r);
  }

  function drawChart(arr, r) {
    const canvas = $("financeChart");
    if (!canvas) return;

    // Se o Chart.js não estiver disponível, exibe mensagem
    if (typeof Chart === 'undefined') {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#8993a5';
      ctx.textAlign = 'center';
      ctx.fillText('Carregando gráfico...', canvas.width / 2, canvas.height / 2);
      return;
    }

    const labels = [], valsI = [], valsE = [];
    const start = new Date(r.s);
    const end = new Date(r.e);
    const days = Math.round((end - start) / 86400000) + 1;
    const step = $("periodFilter").value === "month" && days > 20 ? 1 : 1;

    for (let i = 0; i < days; i += step) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      labels.push(d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }));
      valsI.push(arr.filter(t => t.date === key && t.type === "income").reduce((a, t) => a + t.amount, 0));
      valsE.push(arr.filter(t => t.date === key && t.type === "expense").reduce((a, t) => a + t.amount, 0));
    }

    if (chart) {
      chart.destroy();
      chart = null;
    }

    chart = new Chart(canvas.getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "Receitas", data: valsI, backgroundColor: "#159669" },
          { label: "Despesas", data: valsE, backgroundColor: "#e05252" }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: v => "R$ " + Number(v).toLocaleString("pt-BR") }
          }
        }
      }
    });
  }

  function table(arr, compact = false) {
    if (!arr.length) return '<div style="padding:20px;color:#8993a5">Nenhum lançamento encontrado.</div>';
    return `<table class="data-table"><thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Categoria</th><th>Valor</th><th>Status</th>${compact ? "" : "<th>Ações</th>"}</tr></thead><tbody>${arr.map(t => `<tr><td>${br(t.date)}</td><td><b>${esc(t.description)}</b><br><small>${esc(t.method || "")}</small></td><td><span class="badge ${t.type}">${t.type === "income" ? "Receita" : "Despesa"}</span></td><td>${esc(t.category || "-")}</td><td class="${t.type === "income" ? "green" : "red"}">${money(t.amount)}</td><td><span class="badge ${t.status}">${t.status === "paid" ? "Pago/Recebido" : "Pendente"}</span></td>${compact ? "" : `<td><div class="actions"><button class="icon-btn" onclick="editTx('${t.id}')">✏️</button><button class="icon-btn" onclick="deleteTx('${t.id}')">🗑️</button></div></td>`}</tr>`).join("")}</tbody></table>`;
  }

  function renderTable() {
    const q = $("searchInput").value.toLowerCase();
    const tf = $("typeFilter").value;
    const sf = $("statusFilter").value;
    const arr = transactions
      .filter(t =>
        (tf === "all" || t.type === tf) &&
        (sf === "all" || t.status === sf) &&
        [t.description, t.category, t.method, t.note].join(" ").toLowerCase().includes(q)
      )
      .sort((a, b) => b.date.localeCompare(a.date));
    const tableContainer = $("transactionsTable");
    if (tableContainer) tableContainer.innerHTML = table(arr);
  }

  function br(x) {
    return x ? new Date(x + "T12:00:00").toLocaleDateString("pt-BR") : "-";
  }

  function esc(x) {
    return String(x ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  function openModal(t = null) {
    const modal = $("modal");
    if (!modal) return;
    modal.classList.remove("hidden");
    $("modalTitle").textContent = t ? "Editar lançamento" : "Novo lançamento";
    $("editId").value = t?.id || "";
    $("description").value = t?.description || "";
    $("amount").value = t?.amount ?? "";
    $("date").value = t?.date || today();
    $("dueDate").value = t?.dueDate || "";
    $("category").value = t?.category || "";
    $("method").value = t?.method || "";
    $("status").value = t?.status || "paid";
    $("note").value = t?.note || "";
    const radio = document.querySelector(`input[name="type"][value="${t?.type || "income"}"]`);
    if (radio) radio.checked = true;
  }

  function closeModal() {
    const modal = $("modal");
    if (modal) modal.classList.add("hidden");
  }

  // Navegação entre abas
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", function() {
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      const view = this.dataset.view;
      const dash = $("dashboardView");
      const lanc = $("lancamentosView");
      if (dash) dash.classList.toggle("hidden", view !== "dashboard");
      if (lanc) lanc.classList.toggle("hidden", view !== "lancamentos");
      const title = $("pageTitle");
      if (title) title.textContent = view === "dashboard" ? "Dashboard" : "Lançamentos";
    });
  });

  // Botão "Novo lançamento"
  const addBtn = $("addBtn");
  if (addBtn) addBtn.addEventListener("click", () => openModal());

  // Fechar modal
  const closeModalBtn = $("closeModal");
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
  const cancelBtn = $("cancelBtn");
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

  // Abrir lançamentos a partir do link "Ver lançamentos"
  const openAllBtn = $("openAll");
  if (openAllBtn) {
    openAllBtn.addEventListener("click", function() {
      const btn = document.querySelector('.nav-btn[data-view="lancamentos"]');
      if (btn) btn.click();
    });
  }

  // Submissão do formulário
  const form = $("transactionForm");
  if (form) {
    form.addEventListener("submit", function(e) {
      e.preventDefault();
      const id = $("editId").value || (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 5));
      const t = {
        id,
        type: document.querySelector('input[name="type"]:checked').value,
        description: $("description").value,
        amount: Number($("amount").value),
        date: $("date").value,
        dueDate: $("dueDate").value,
        category: $("category").value,
        method: $("method").value,
        status: $("status").value,
        note: $("note").value
      };
      const i = transactions.findIndex(x => x.id === id);
      if (i >= 0) transactions[i] = t;
      else transactions.push(t);
      save();
      closeModal();
    });
  }

  // Editar e excluir (globais para os botões das tabelas)
  window.editTx = function(id) {
    const t = transactions.find(tx => tx.id === id);
    if (t) openModal(t);
  };

  window.deleteTx = function(id) {
    if (confirm("Excluir este lançamento?")) {
      transactions = transactions.filter(t => t.id !== id);
      save();
    }
  };

  // Filtros e pesquisa
  ["periodFilter", "referenceDate", "searchInput", "typeFilter", "statusFilter"].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener("input", render);
  });

  // Navegação de período
  function prevPeriod() {
    const input = $("referenceDate");
    if (!input) return;
    let date = new Date(input.value + "T12:00:00");
    const period = $("periodFilter").value;
    if (period === "day") date.setDate(date.getDate() - 1);
    else if (period === "week") date.setDate(date.getDate() - 7);
    else if (period === "month") date.setMonth(date.getMonth() - 1);
    else return;
    input.value = date.toISOString().slice(0, 10);
    input.dispatchEvent(new Event("input"));
  }

  function nextPeriod() {
    const input = $("referenceDate");
    if (!input) return;
    let date = new Date(input.value + "T12:00:00");
    const period = $("periodFilter").value;
    if (period === "day") date.setDate(date.getDate() + 1);
    else if (period === "week") date.setDate(date.getDate() + 7);
    else if (period === "month") date.setMonth(date.getMonth() + 1);
    else return;
    input.value = date.toISOString().slice(0, 10);
    input.dispatchEvent(new Event("input"));
  }

  const prevBtn = $("prevPeriod");
  const nextBtn = $("nextPeriod");
  if (prevBtn) prevBtn.addEventListener("click", prevPeriod);
  if (nextBtn) nextBtn.addEventListener("click", nextPeriod);

  // Exportar
  const exportBtn = $("exportBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", function() {
      const blob = new Blob([JSON.stringify(transactions, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "financeiro-backup.json";
      a.click();
    });
  }

  // Importar
  const importFile = $("importFile");
  if (importFile) {
    importFile.addEventListener("change", function(e) {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = function() {
        try {
          const x = JSON.parse(reader.result);
          if (Array.isArray(x)) {
            transactions = x;
            save();
            alert("Dados importados com sucesso!");
          } else {
            alert("Arquivo inválido.");
          }
        } catch {
          alert("Arquivo inválido.");
        }
      };
      reader.readAsText(f);
    });
  }

  // Limpar tudo
  const clearBtn = $("clearBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", function() {
      if (confirm("Apagar TODOS os lançamentos? Esta ação não pode ser desfeita.")) {
        transactions = [];
        save();
      }
    });
  }

  // Carregar Chart.js
  const chartScript = document.createElement("script");
  chartScript.src = "https://cdn.jsdelivr.net/npm/chart.js";
  chartScript.onload = render;
  chartScript.onerror = function() {
    render(); // renderiza sem gráfico (mensagem de fallback)
  };
  document.head.appendChild(chartScript);

  // Renderização inicial (caso o Chart demore ou falhe)
  render();
});
