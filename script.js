const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// ---- Chip (Payment to / Currency) selectors ----
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

// ---- Show / hide Payment 2 block ----
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
  document.getElementById("pay2_payment_to").value = "";
  document.getElementById("pay2_amount").value = "";
  document.getElementById("pay2_currency").value = "";
  pay2Section.querySelectorAll(".chip").forEach((c) => c.classList.remove("selected"));
  validateAndToggleButton();
});

// ---- Order # : faqat raqam kiritilishini ta'minlash ----
document.getElementById("order_num").addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/\D/g, "").slice(0, 5);
});

// ---- Amount maydonlari: 10 xonadan ortiq raqam kiritilmasligi ----
["pay1_amount", "pay2_amount"].forEach((id) => {
  document.getElementById(id).addEventListener("input", (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, "");
    if (digitsOnly.length > 10) {
      e.target.value = digitsOnly.slice(0, 10);
    }
  });
});

// ---- Re-validate on every change to required fields ----
const requiredIds = ["order_num", "pay1_amount", "due_date", "contact_details"];
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

// ---- Validation ----
function validate(showErrors) {
  let ok = true;

  const orderNum = getVal("order_num");
  if (!orderNum) {
    ok = false;
    if (showErrors) showError("order_num", "Order # is required");
  } else if (!/^\d{5}$/.test(orderNum)) {
    ok = false;
    if (showErrors) showError("order_num", "Order # must be exactly 5 digits");
  }
  if (!getVal("pay1_payment_to")) {
    ok = false;
    if (showErrors) showError("pay1_payment_to", "Select where the payment goes to");
  }
  const amount1 = getVal("pay1_amount");
  if (!amount1 || Number(amount1) <= 0) {
    ok = false;
    if (showErrors) showError("pay1_amount", "Enter the amount");
  } else if (amount1.length > 10) {
    ok = false;
    if (showErrors) showError("pay1_amount", "Amount is too long (max 10 digits)");
  }
  if (!getVal("pay1_currency")) {
    ok = false;
    if (showErrors) showError("pay1_currency", "Select a currency");
  }
  if (!getVal("due_date")) {
    ok = false;
    if (showErrors) showError("due_date", "Select the payment date");
  }
  if (!getVal("contact_details")) {
    ok = false;
    if (showErrors) showError("contact_details", "Contact details are required");
  }

  if (isPay2Active()) {
    const amount2 = getVal("pay2_amount");
    const incomplete =
      !getVal("pay2_payment_to") || !amount2 || Number(amount2) <= 0 || !getVal("pay2_currency");
    if (incomplete) {
      ok = false;
      if (showErrors) {
        tg.showAlert("Please fully complete Payment 2, or remove it.");
      }
    } else if (amount2.length > 10) {
      ok = false;
      if (showErrors) {
        tg.showAlert("Payment 2 amount is too long (max 10 digits).");
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

// ---- Telegram MainButton setup ----
tg.MainButton.setText("Submit");
tg.MainButton.show();
tg.MainButton.disable();

tg.MainButton.onClick(() => {
  if (!validate(true)) {
    return;
  }

  const data = {
    order_num: getVal("order_num"),
    pay1_payment_to: getVal("pay1_payment_to"),
    pay1_amount: getVal("pay1_amount"),
    pay1_currency: getVal("pay1_currency"),
    pay2_payment_to: isPay2Active() ? getVal("pay2_payment_to") : "",
    pay2_amount: isPay2Active() ? getVal("pay2_amount") : "",
    pay2_currency: isPay2Active() ? getVal("pay2_currency") : "",
    due_date: formatDate(getVal("due_date")),
    contact_details: getVal("contact_details"),
  };

  try {
    tg.MainButton.showProgress();
    tg.sendData(JSON.stringify(data));
  } catch (err) {
    tg.MainButton.hideProgress();
    tg.showAlert("An error occurred: " + (err && err.message ? err.message : String(err)));
  }
});

// Safety net: if sendData doesn't close the app within 5 seconds
// (e.g. unsupported launch method), stop the spinner and inform the user
// instead of leaving the button stuck in a loading state forever.
let sendWatchdog = null;
tg.onEvent("mainButtonClicked", () => {
  clearTimeout(sendWatchdog);
  sendWatchdog = setTimeout(() => {
    tg.MainButton.hideProgress();
    tg.showAlert(
      "The data was not sent. Please check your internet connection and try again, " +
      "or close this window (X) and reopen it."
    );
  }, 5000);
});

// input type="date" -> "YYYY-MM-DD" becomes "DD.MM.YYYY"
function formatDate(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}.${m}.${y}`;
}

// Initial state check
validateAndToggleButton();
