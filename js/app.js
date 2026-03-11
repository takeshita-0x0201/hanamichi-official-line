// ============================================================
// Config - Replace these values with your actual credentials
// ============================================================
const CONFIG = {
  LIFF_ID: "2009341370-F28iXUUO",
  GAS_ENDPOINT: "https://script.google.com/macros/s/AKfycbz-X3V6UeS_txkLhzEa2zbGHbh4Gh4h2fE9UJbDGM8Kh6T_Gq4D0aqsM5M1uT5klxpmxg/exec",
};

// ============================================================
// Options Loader
// ============================================================
async function loadJSON(path) {
  const res = await fetch(path);
  return res.json();
}

function populateSelect(selectEl, items, placeholder) {
  selectEl.innerHTML = "";
  const opt = document.createElement("option");
  opt.value = "";
  opt.textContent = placeholder;
  opt.disabled = true;
  opt.selected = true;
  selectEl.appendChild(opt);

  items.forEach((item) => {
    const o = document.createElement("option");
    o.value = item;
    o.textContent = item;
    selectEl.appendChild(o);
  });
}

function populateGroupedSelect(selectEl, groups, placeholder) {
  selectEl.innerHTML = "";
  const opt = document.createElement("option");
  opt.value = "";
  opt.textContent = placeholder;
  opt.disabled = true;
  opt.selected = true;
  selectEl.appendChild(opt);

  groups.forEach((group) => {
    const optgroup = document.createElement("optgroup");
    optgroup.label = group.category;
    group.items.forEach((item) => {
      const o = document.createElement("option");
      o.value = item;
      o.textContent = item;
      optgroup.appendChild(o);
    });
    selectEl.appendChild(optgroup);
  });
}

function populateDatalist(datalistEl, items) {
  datalistEl.innerHTML = "";
  items.forEach((item) => {
    const o = document.createElement("option");
    o.value = item;
    datalistEl.appendChild(o);
  });
}

function populateBirthdate() {
  const yearSelect = document.getElementById("birth-year");
  const monthSelect = document.getElementById("birth-month");
  const daySelect = document.getElementById("birth-day");

  // Year: current year down to 1940
  const currentYear = new Date().getFullYear();
  populateSelect(yearSelect, [], "年");
  for (let y = currentYear; y >= 1940; y--) {
    const o = document.createElement("option");
    o.value = y;
    o.textContent = y + "年";
    yearSelect.appendChild(o);
  }

  // Month
  populateSelect(monthSelect, [], "月");
  for (let m = 1; m <= 12; m++) {
    const o = document.createElement("option");
    o.value = m;
    o.textContent = m + "月";
    monthSelect.appendChild(o);
  }

  // Day
  populateSelect(daySelect, [], "日");
  for (let d = 1; d <= 31; d++) {
    const o = document.createElement("option");
    o.value = d;
    o.textContent = d + "日";
    daySelect.appendChild(o);
  }
}

async function loadEventSchedules() {
  try {
    const res = await fetch(CONFIG.GAS_ENDPOINT);
    const json = await res.json();
    const schedules = json.schedules || [];
    if (schedules.length === 0) return;

    const section = document.getElementById("event-schedule-section");
    const group = document.getElementById("event-schedule-group");
    schedules.forEach((s, i) => {
      const label = document.createElement("label");
      label.className = "radio-label";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "event-schedule";
      input.value = s.label;
      input.id = "event-schedule-" + i;
      const span = document.createElement("span");
      span.textContent = s.label;
      label.appendChild(input);
      label.appendChild(span);
      group.appendChild(label);
    });
    section.style.display = "";
  } catch (e) {
    console.error("Failed to load event schedules:", e);
  }
}

async function loadAllOptions() {
  const [universities, prefectures, clubs, academicTypes, grades, positions, genders] =
    await Promise.all([
      loadJSON("./options/universities.json"),
      loadJSON("./options/prefectures.json"),
      loadJSON("./options/clubs.json"),
      loadJSON("./options/academic_types.json"),
      loadJSON("./options/grades.json"),
      loadJSON("./options/positions.json"),
      loadJSON("./options/genders.json"),
    ]);

  populateDatalist(document.getElementById("university-list"), universities);
  populateSelect(document.getElementById("prefecture"), prefectures, "選択してください");
  populateGroupedSelect(document.getElementById("club"), clubs, "選択してください");
  populateSelect(document.getElementById("academic-type"), academicTypes, "選択してください");
  populateSelect(document.getElementById("grade"), grades, "選択してください");
  populateSelect(document.getElementById("position"), positions, "選択してください");
  populateSelect(document.getElementById("gender"), genders, "選択してください");
  populateBirthdate();
}

// ============================================================
// LIFF
// ============================================================
let userId = null;

async function initLiff() {
  try {
    await liff.init({ liffId: CONFIG.LIFF_ID });
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }
    const profile = await liff.getProfile();
    userId = profile.userId;
  } catch (e) {
    console.error("LIFF init failed:", e);
  }
}

// ============================================================
// Validation
// ============================================================
function validateEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function validateTel(v) {
  return /^\d{2,4}-\d{2,4}-\d{3,4}$/.test(v);
}

function formatTel(input) {
  const digits = input.value.replace(/\D/g, "");
  let formatted = "";
  if (digits.startsWith("0120") || digits.startsWith("0800")) {
    // フリーダイヤル: 0120-xxx-xxx / 0800-xxx-xxx
    formatted = digits.slice(0, 4);
    if (digits.length > 4) formatted += "-" + digits.slice(4, 7);
    if (digits.length > 7) formatted += "-" + digits.slice(7, 10);
  } else if (digits.startsWith("090") || digits.startsWith("080") || digits.startsWith("070") || digits.startsWith("050")) {
    // 携帯: 090-xxxx-xxxx
    formatted = digits.slice(0, 3);
    if (digits.length > 3) formatted += "-" + digits.slice(3, 7);
    if (digits.length > 7) formatted += "-" + digits.slice(7, 11);
  } else {
    // 固定電話等: xxx-xxxx-xxxx
    formatted = digits.slice(0, 3);
    if (digits.length > 3) formatted += "-" + digits.slice(3, 7);
    if (digits.length > 7) formatted += "-" + digits.slice(7, 11);
  }
  input.value = formatted;
}

function setError(fieldId, msg) {
  const group = document.getElementById(fieldId)?.closest(".field-group");
  if (!group) return;
  group.classList.add("error");
  const errEl = group.querySelector(".error-message");
  if (errEl) errEl.textContent = msg;
}

function clearErrors() {
  document.querySelectorAll(".field-group.error").forEach((el) => {
    el.classList.remove("error");
  });
  document.querySelector(".error-banner")?.classList.remove("show");
}

function validateForm() {
  clearErrors();
  let valid = true;

  const fields = [
    { id: "email", check: (v) => validateEmail(v), msg: "正しいメールアドレスを入力してください" },
    { id: "tel", check: (v) => validateTel(v), msg: "正しい電話番号を入力してください" },
    { id: "last-name", check: (v) => v.length > 0, msg: "入力してください" },
    { id: "first-name", check: (v) => v.length > 0, msg: "入力してください" },
    { id: "last-name-kana", check: (v) => v.length > 0, msg: "入力してください" },
    { id: "first-name-kana", check: (v) => v.length > 0, msg: "入力してください" },
    { id: "birth-year", check: (v) => v !== "", msg: "選択してください" },
    { id: "birth-month", check: (v) => v !== "", msg: "選択してください" },
    { id: "birth-day", check: (v) => v !== "", msg: "選択してください" },
    { id: "gender", check: (v) => v !== "", msg: "選択してください" },
    { id: "university", check: (v) => v.length > 0, msg: "入力してください" },
    { id: "faculty", check: (v) => v.length > 0, msg: "入力してください" },
    { id: "department", check: (v) => v.length > 0, msg: "入力してください" },
    { id: "academic-type", check: (v) => v !== "", msg: "選択してください" },
    { id: "grade", check: (v) => v !== "", msg: "選択してください" },
    { id: "club", check: (v) => v !== "", msg: "選択してください" },
    { id: "position", check: (v) => v !== "", msg: "選択してください" },
    { id: "prefecture", check: (v) => v !== "", msg: "選択してください" },
  ];

  for (const f of fields) {
    const el = document.getElementById(f.id);
    if (!el) continue;
    const val = el.value.trim();
    if (!f.check(val)) {
      setError(f.id, f.msg);
      valid = false;
    }
  }

  // イベント日程のバリデーション（表示中のみ）
  const scheduleSection = document.getElementById("event-schedule-section");
  if (scheduleSection && scheduleSection.style.display !== "none") {
    const selected = document.querySelector('input[name="event-schedule"]:checked');
    if (!selected) {
      const group = document.getElementById("event-schedule-group").closest(".field-group");
      if (group) {
        group.classList.add("error");
        const errEl = group.querySelector(".error-message");
        if (errEl) errEl.textContent = "参加日程を選択してください";
      }
      valid = false;
    }
  }

  const agree = document.getElementById("agree");
  if (agree && !agree.checked) {
    const banner = document.querySelector(".error-banner");
    if (banner) {
      banner.textContent = "個人情報の取り扱いに同意してください";
      banner.classList.add("show");
    }
    valid = false;
  }

  // Scroll to first error
  if (!valid) {
    const firstError = document.querySelector(".field-group.error, .error-banner.show");
    if (firstError) {
      firstError.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  return valid;
}

// ============================================================
// Submit
// ============================================================
async function handleSubmit(e) {
  e.preventDefault();
  if (!validateForm()) return;

  // userId未取得チェック
  if (!userId) {
    const banner = document.querySelector(".error-banner");
    if (banner) {
      banner.textContent = "ネットワークエラーが発生しました。画面を閉じてもう一度お試しください。";
      banner.classList.add("show");
      banner.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return;
  }

  const data = {
    userId: userId,
    email: document.getElementById("email").value.trim(),
    tel: document.getElementById("tel").value.trim(),
    lastName: document.getElementById("last-name").value.trim(),
    firstName: document.getElementById("first-name").value.trim(),
    lastNameKana: document.getElementById("last-name-kana").value.trim(),
    firstNameKana: document.getElementById("first-name-kana").value.trim(),
    birthYear: document.getElementById("birth-year").value,
    birthMonth: document.getElementById("birth-month").value,
    birthDay: document.getElementById("birth-day").value,
    gender: document.getElementById("gender").value,
    university: document.getElementById("university").value.trim(),
    faculty: document.getElementById("faculty").value.trim(),
    department: document.getElementById("department").value.trim(),
    academicType: document.getElementById("academic-type").value,
    grade: document.getElementById("grade").value,
    club: document.getElementById("club").value,
    position: document.getElementById("position").value,
    prefecture: document.getElementById("prefecture").value,
    eventSchedule: (document.querySelector('input[name="event-schedule"]:checked') || {}).value || "",
  };

  // 確認モーダル表示
  showConfirmModal(data);
}

function getConfirmHTML(data) {
  const birthday = data.birthYear + "年" + data.birthMonth + "月" + data.birthDay + "日";
  const rows = [
    ["メールアドレス", data.email],
    ["電話番号", data.tel],
    ["氏名", data.lastName + " " + data.firstName],
    ["ふりがな", data.lastNameKana + " " + data.firstNameKana],
    ["生年月日", birthday],
    ["性別", data.gender],
    ["大学名", data.university],
    ["学部", data.faculty],
    ["学科", data.department],
    ["学業種別", data.academicType],
    ["学年", data.grade],
    ["部活・サークル", data.club],
    ["役職", data.position],
    ["出身地", data.prefecture],
  ];

  if (data.eventSchedule) {
    rows.push(["参加日程", data.eventSchedule]);
  }

  return rows
    .map(([label, value]) => `<div class="confirm-row"><span class="confirm-label">${label}</span><span class="confirm-value">${value}</span></div>`)
    .join("");
}

function showConfirmModal(data) {
  const modal = document.getElementById("confirm-modal");
  document.getElementById("confirm-body").innerHTML = getConfirmHTML(data);
  modal.classList.add("show");

  document.getElementById("confirm-cancel").onclick = () => {
    modal.classList.remove("show");
  };

  document.getElementById("confirm-submit").onclick = () => {
    modal.classList.remove("show");
    submitData(data);
  };
}

async function submitData(data) {
  const btn = document.getElementById("submit-btn");
  btn.disabled = true;
  btn.classList.add("loading");
  btn.innerHTML = '<span class="spinner"></span>送信中...';

  try {
    await fetch(CONFIG.GAS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(data),
      mode: "no-cors",
    });

    // Show complete screen
    document.getElementById("form-screen").style.display = "none";
    document.getElementById("complete-screen").classList.add("show");

    // Close LIFF after a short delay
    if (liff.isInClient()) {
      setTimeout(() => liff.closeWindow(), 2000);
    }
  } catch (err) {
    console.error("Submit error:", err);
    const banner = document.querySelector(".error-banner");
    if (banner) {
      banner.textContent = "送信に失敗しました。もう一度お試しください。";
      banner.classList.add("show");
    }
    btn.disabled = false;
    btn.classList.remove("loading");
    btn.innerHTML = "登録する";
  }
}

// ============================================================
// Init
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([loadAllOptions(), initLiff(), loadEventSchedules()]);
  document.getElementById("register-form").addEventListener("submit", handleSubmit);

  // 電話番号ハイフン自動付与
  document.getElementById("tel").addEventListener("input", (e) => formatTel(e.target));

  // ラジオボタン選択時にエラー解除
  document.querySelectorAll('input[name="event-schedule"]').forEach((el) => {
    el.addEventListener("change", () => {
      el.closest(".field-group")?.classList.remove("error");
    });
  });

  // Real-time validation: clear error on input
  document.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener("input", () => {
      el.closest(".field-group")?.classList.remove("error");
    });
    el.addEventListener("change", () => {
      el.closest(".field-group")?.classList.remove("error");
    });
  });
});
