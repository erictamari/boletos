// ... (código anterior permanece igual até a definição das funções)

// Funções de navegação de período
function prevPeriod() {
  const input = $("referenceDate");
  let date = new Date(input.value + "T12:00:00");
  const period = $("periodFilter").value;
  if (period === "day") {
    date.setDate(date.getDate() - 1);
  } else if (period === "week") {
    date.setDate(date.getDate() - 7);
  } else if (period === "month") {
    date.setMonth(date.getMonth() - 1);
  } else {
    // "all" não faz alteração
    return;
  }
  input.value = date.toISOString().slice(0, 10);
  input.dispatchEvent(new Event("input"));
}

function nextPeriod() {
  const input = $("referenceDate");
  let date = new Date(input.value + "T12:00:00");
  const period = $("periodFilter").value;
  if (period === "day") {
    date.setDate(date.getDate() + 1);
  } else if (period === "week") {
    date.setDate(date.getDate() + 7);
  } else if (period === "month") {
    date.setMonth(date.getMonth() + 1);
  } else {
    return;
  }
  input.value = date.toISOString().slice(0, 10);
  input.dispatchEvent(new Event("input"));
}

// Dentro do DOMContentLoaded, adicionar os listeners para os botões
document.addEventListener('DOMContentLoaded', function() {
  // ... (código existente)

  // Navegação de período
  const prevBtn = $("prevPeriod");
  const nextBtn = $("nextPeriod");
  if (prevBtn) prevBtn.addEventListener("click", prevPeriod);
  if (nextBtn) nextBtn.addEventListener("click", nextPeriod);

  // ... (restante do código)
});
