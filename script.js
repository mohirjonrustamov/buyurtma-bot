const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// ---- Chip (Валюта) tanlagichlar ----
document.querySelectorAll(".chip-group").forEach((group) => {
  const targetId = group.dataset.target;
  const hiddenInput = document.getElementById(targetId);

  group.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      group.querySelectorAll(".chip").forEach((c) => c.classList.remove("selected"));
      chip.classList.add("selected");
      hiddenInput.value = chip.dataset.value;
      clearError(targetId);
      validateAndToggleButton();
    });
  });
});

// ---- Оплата 2 blokini ko'rsatish / yashirish ----
const pay2Section = document.getElementById("pay2Section");
const togglePay2Btn = document.getElementById("togglePay2");
const removePay2Btn = document.getElementById("removePay2");

togglePay2Btn.addEventListener("click", () => {
  pay2Section.style.display = "block";
  togglePay2Btn.style.display = "none";
  validateAndToggleButton();
});

removePay2Btn.addEventListener("click", () => {
  pay2Section.style.display = "none";
  togglePay2Btn.style.display = "block";
  document.getElementById("pay2_date").value = "";
  document.getElementById("pay2_amount").value = "";
  document.getElementById("pay2_currency").value = "";
  pay2Section.querySelectorAll(".chip").forEach((c) => c.classList.remove("selected"));
  validateAndToggleButton();
});

// ---- Har bir majburiy maydon o'zgarganda tekshirish ----
const requiredIds = ["order_num", "pay1_date", "pay1_amount", "due_date"];
requiredIds.forEach((id) => {
  document.getElementById(id).addEventListener("input", () => {
    clearError(id);
    validateAndToggleButton();
  });
});

function clearError(id) {
  const el = document.getElementById("err_" + id);
  if (el) el.textContent = "";
}

function showError(id, message) {
  const el = document.getElementById("err_" + id);
  if (el) el.textContent = message;
}

function getVal(id) {
  return document.getElementById(id).value.trim();
}

function isPay2Active() {
  return pay2Section.style.display === "block";
}

// ---- Validatsiya: barcha majburiy maydonlar to'ldirilganmi ----
function validate(showErrors) {
  let ok = true;

  if (!getVal("order_num")) {
    ok = false;
    if (showErrors) showError("order_num", "Заказ № kiritilishi shart");
  }
  if (!getVal("pay1_date")) {
    ok = false;
    if (showErrors) showError("pay1_date", "Sana tanlanishi shart");
  }
  if (!getVal("pay1_amount") || Number(getVal("pay1_amount")) <= 0) {
    ok = false;
    if (showErrors) showError("pay1_amount", "Summani kiriting");
  }
  if (!getVal("pay1_currency")) {
    ok = false;
    if (showErrors) showError("pay1_currency", "Valyutani tanlang");
  }
  if (!getVal("due_date")) {
    ok = false;
    if (showErrors) showError("due_date", "Muddatni tanlang");
  }

  if (isPay2Active()) {
    if (!getVal("pay2_date") || !getVal("pay2_amount") || !getVal("pay2_currency")) {
      ok = false;
      if (showErrors) {
        tg.showAlert("Оплата 2 bo'limini to'liq to'ldiring yoki uni olib tashlang.");
      }
    }
  }

  return ok;
}

function validateAndToggleButton() {
  if (validate(false)) {
    tg.MainButton.enable();
    tg.MainButton.color = tg.themeParams.button_color || "#2481cc";
  } else {
    tg.MainButton.disable();
  }
}

// ---- Telegram MainButton sozlash ----
tg.MainButton.setText("Yuborish");
tg.MainButton.show();
tg.MainButton.disable();

tg.MainButton.onClick(() => {
  if (!validate(true)) {
    return;
  }

  const data = {
    order_num: getVal("order_num"),
    pay1_date: formatDate(getVal("pay1_date")),
    pay1_amount: getVal("pay1_amount"),
    pay1_currency: getVal("pay1_currency"),
    pay2_date: isPay2Active() ? formatDate(getVal("pay2_date")) : "",
    pay2_amount: isPay2Active() ? getVal("pay2_amount") : "",
    pay2_currency: isPay2Active() ? getVal("pay2_currency") : "",
    due_date: formatDate(getVal("due_date")),
  };

  tg.MainButton.showProgress();
  tg.sendData(JSON.stringify(data));
});

// input type="date" -> "YYYY-MM-DD" ni "DD.MM.YYYY" ko'rinishiga o'giradi
function formatDate(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}.${m}.${y}`;
}

// Boshlang'ich holatni tekshirish
validateAndToggleButton();
