(function () {
  const config = window.CMS_CONFIG || {};
  const ADMIN_EMAIL = "admin@taiwan-dating.local";
  const defaults = structuredClone(window.DEFAULT_SITE_CONTENT || {});
  const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey);
  const loginLayer = document.getElementById("loginLayer");
  const loginForm = document.getElementById("loginForm");
  const loginMessage = document.getElementById("loginMessage");
  const saveButton = document.getElementById("saveButton");
  const saveStatus = document.getElementById("saveStatus");
  const setupWarning = document.getElementById("setupWarning");
  const toast = document.getElementById("toast");
  const personaSelect = document.getElementById("personaSelect");
  const personaPublicUrl = document.getElementById("personaPublicUrl");
  const sidebarPreview = document.querySelector(".preview-link");
  const dialogLayer = document.getElementById("personaDialogLayer");
  const dialogForm = document.getElementById("personaDialogForm");
  const dialogTitle = document.getElementById("personaDialogTitle");
  const dialogName = document.getElementById("newPersonaName");
  const dialogCode = document.getElementById("newPersonaCode");
  const dialogMessage = document.getElementById("personaDialogMessage");

  let content = structuredClone(defaults);
  let personas = [];
  let currentPersonaId = "main";
  let dialogMode = "new";
  let dirty = false;
  let session = JSON.parse(localStorage.getItem("cms_session") || "null");

  const get = (object, path) => path.split(".").reduce((value, key) => value?.[key], object);
  const set = (object, path, value) => {
    const keys = path.split(".");
    const last = keys.pop();
    const target = keys.reduce((current, key) => current[key] ||= {}, object);
    target[last] = value;
  };
  const merge = (base, extra) => {
    const result = structuredClone(base || {});
    Object.keys(extra || {}).forEach((key) => {
      result[key] = extra[key] && typeof extra[key] === "object" && !Array.isArray(extra[key])
        ? merge(base?.[key] || {}, extra[key])
        : extra[key];
    });
    return result;
  };
  const headers = (token = config.supabaseAnonKey) => ({ apikey: config.supabaseAnonKey, Authorization: `Bearer ${token}` });
  const publicCode = (id) => id === "main" ? "yuanxuan" : id;

  function notify(message) {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function markDirty(message = "有尚未儲存的修改") {
    dirty = true;
    saveStatus.textContent = message;
  }

  function bindUi() {
    document.querySelectorAll("[data-field]").forEach((field) => {
      field.addEventListener("input", () => {
        set(content, field.dataset.field, field.value);
        markDirty();
      });
    });

    document.querySelectorAll("[data-image-key]").forEach((box) => {
      const key = box.dataset.imageKey;
      const image = box.querySelector("img");
      const input = box.querySelector("input");
      box.querySelector("button").addEventListener("click", () => input.click());
      input.addEventListener("change", async () => {
        if (!input.files[0]) return;
        await uploadImage(input.files[0], key, image);
        input.value = "";
      });
    });

    personaSelect.addEventListener("change", () => {
      if (dirty && !window.confirm("目前人設還有未儲存的修改，確定要切換嗎？")) {
        personaSelect.value = currentPersonaId;
        return;
      }
      setActivePersona(personaSelect.value);
    });

    document.getElementById("newPersonaButton").addEventListener("click", () => openPersonaDialog("new"));
    document.getElementById("duplicatePersonaButton").addEventListener("click", () => openPersonaDialog("duplicate"));
    document.getElementById("cancelPersonaButton").addEventListener("click", closePersonaDialog);
    dialogCode.addEventListener("input", () => {
      const clean = dialogCode.value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-");
      if (dialogCode.value !== clean) dialogMessage.textContent = "人物代號不可使用中文，請輸入小寫拼音。";
      else dialogMessage.textContent = "";
      dialogCode.value = clean;
    });
    dialogForm.addEventListener("submit", createPersona);
  }

  function renderForm() {
    document.querySelectorAll("[data-field]").forEach((field) => {
      field.value = get(content, field.dataset.field) ?? "";
    });
    document.querySelectorAll("[data-image-key]").forEach((box) => {
      box.querySelector("img").src = get(content, box.dataset.imageKey) || "";
    });
    updatePersonaControls();
    dirty = false;
    saveStatus.textContent = "已載入目前人設";
  }

  function refreshPersonaOptions() {
    personaSelect.innerHTML = "";
    personas.forEach((persona) => {
      const option = document.createElement("option");
      const name = persona.content?.persona?.name || publicCode(persona.id);
      option.value = persona.id;
      option.textContent = `${name}（${publicCode(persona.id)}）`;
      personaSelect.appendChild(option);
    });
    personaSelect.value = currentPersonaId;
  }

  function updatePersonaControls() {
    refreshPersonaOptions();
    const code = publicCode(currentPersonaId);
    const previewUrl = new URL("./index.html", window.location.href);
    previewUrl.searchParams.set("p", code);
    personaPublicUrl.href = previewUrl.href;
    personaPublicUrl.textContent = `?p=${code} ↗`;
    sidebarPreview.href = previewUrl.href;
    localStorage.setItem("cms_persona_id", currentPersonaId);
  }

  function setActivePersona(id) {
    const persona = personas.find((item) => item.id === id) || personas[0];
    if (!persona) return;
    currentPersonaId = persona.id;
    content = merge(defaults, persona.content || {});
    content.tracking ||= {};
    content.tracking.lineUrl ||= content.tracking.lineUrlPrimary || content.tracking.lineUrlSecondary || "";
    renderForm();
  }

  function openPersonaDialog(mode) {
    dialogMode = mode;
    dialogTitle.textContent = mode === "duplicate" ? "複製目前人設" : "新建人設";
    dialogName.value = mode === "duplicate" ? `${content.persona?.name || "人物"}副本` : "";
    dialogCode.value = "";
    dialogMessage.textContent = "";
    dialogLayer.classList.remove("hidden");
    dialogName.focus();
  }

  function closePersonaDialog() {
    dialogLayer.classList.add("hidden");
    dialogForm.reset();
    dialogMessage.textContent = "";
  }

  async function createPersona(event) {
    event.preventDefault();
    const name = dialogName.value.trim();
    const code = dialogCode.value.trim();
    if (!/^[a-z][a-z0-9-]{1,39}$/.test(code)) {
      dialogMessage.textContent = "請輸入 2–40 位小寫拼音，可包含數字或連字符。";
      return;
    }
    if (code === "main" || code === "yuanxuan") {
      dialogMessage.textContent = "這個代號已保留給元軒，請換一個拼音代號。";
      return;
    }
    if (personas.some((item) => item.id === code)) {
      dialogMessage.textContent = "這個人物代號已存在。";
      return;
    }

    const newContent = dialogMode === "duplicate" ? structuredClone(content) : structuredClone(defaults);
    newContent.persona ||= {};
    newContent.brand ||= {};
    newContent.persona.name = name;
    newContent.brand.name = `${name}的生活筆記`;
    if (dialogMode === "new") newContent.tracking = { lineUrl: "", metaPixelId: "", tiktokPixelId: "" };

    dialogMessage.textContent = "正在建立人設…";
    const response = await fetch(`${config.supabaseUrl}/rest/v1/site_content`, {
      method: "POST",
      headers: { ...headers(session.access_token), "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ id: code, content: newContent, updated_at: new Date().toISOString() })
    });
    if (!response.ok) {
      dialogMessage.textContent = "建立失敗，請稍後再試。";
      return;
    }
    personas.push({ id: code, content: newContent, updated_at: new Date().toISOString() });
    closePersonaDialog();
    setActivePersona(code);
    notify("新人設已建立");
  }

  async function signIn(password) {
    const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error_description || data.msg || "登入失敗");
    session = data;
    localStorage.setItem("cms_session", JSON.stringify(session));
  }

  async function loadPersonas() {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/site_content?select=id,content,updated_at&order=updated_at.desc`, { headers: headers(session.access_token) });
    if (response.status === 401) throw new Error("SESSION_EXPIRED");
    if (!response.ok) throw new Error("LOAD_FAILED");
    personas = await response.json();
    if (!personas.length) personas = [{ id: "main", content: structuredClone(defaults), updated_at: new Date().toISOString() }];
    const rememberedId = localStorage.getItem("cms_persona_id");
    const initialId = personas.some((item) => item.id === rememberedId) ? rememberedId : (personas.some((item) => item.id === "main") ? "main" : personas[0].id);
    setActivePersona(initialId);
  }

  async function saveContent() {
    saveButton.disabled = true;
    saveStatus.textContent = "正在儲存…";
    try {
      content.tracking ||= {};
      delete content.tracking.lineUrlPrimary;
      delete content.tracking.lineUrlSecondary;
      const response = await fetch(`${config.supabaseUrl}/rest/v1/site_content`, {
        method: "POST",
        headers: { ...headers(session.access_token), "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ id: currentPersonaId, content, updated_at: new Date().toISOString() })
      });
      if (!response.ok) throw new Error(await response.text());
      const persona = personas.find((item) => item.id === currentPersonaId);
      if (persona) persona.content = structuredClone(content);
      dirty = false;
      refreshPersonaOptions();
      saveStatus.textContent = "已發布目前人設";
      notify("儲存成功，前台已更新");
    } catch (error) {
      saveStatus.textContent = "儲存失敗";
      notify("儲存失敗，請檢查後台設定");
      console.error(error);
    } finally {
      saveButton.disabled = false;
    }
  }

  async function uploadImage(file, key, preview) {
    if (file.size > 12 * 1024 * 1024) return notify("原始圖片請控制在 12MB 以內");
    notify("圖片處理中…");
    file = await optimizeImage(file);
    if (file.size > 3 * 1024 * 1024) return notify("圖片請控制在 3MB 以內");
    const extension = file.name.split(".").pop().replace(/[^a-zA-Z0-9]/g, "") || "jpg";
    const path = `${publicCode(currentPersonaId)}-${key.replace("images.", "")}-${Date.now()}.${extension}`;
    notify("圖片上傳中…");
    const response = await fetch(`${config.supabaseUrl}/storage/v1/object/site-assets/${path}`, {
      method: "POST",
      headers: { ...headers(session.access_token), "Content-Type": file.type, "cache-control": "31536000", "x-upsert": "true" },
      body: file
    });
    if (!response.ok) return notify("上傳失敗，請檢查 Storage 設定");
    const url = `${config.supabaseUrl}/storage/v1/object/public/site-assets/${path}`;
    set(content, key, url);
    preview.src = url;
    markDirty("圖片已上傳，記得儲存發布");
    notify("圖片上傳成功");
  }

  async function optimizeImage(file) {
    try {
      const bitmap = await createImageBitmap(file);
      const maxDimension = 2400;
      if (Math.max(bitmap.width, bitmap.height) <= maxDimension && file.size <= 3 * 1024 * 1024) {
        bitmap.close();
        return file;
      }
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", .92));
      if (!blob) throw new Error("IMAGE_OPTIMIZE_FAILED");
      return new File([blob], "optimized.webp", { type: "image/webp" });
    } catch (error) {
      console.warn("圖片處理失敗，使用原始檔案。", error);
      return file;
    }
  }

  bindUi();
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!configured) return;
    loginMessage.textContent = "登入中…";
    try {
      await signIn(document.getElementById("password").value);
      await loadPersonas();
      loginLayer.classList.add("hidden");
    } catch (error) {
      loginMessage.textContent = error.message === "SESSION_EXPIRED" ? "登入已過期，請重新登入" : error.message;
    }
  });

  saveButton.addEventListener("click", saveContent);
  document.getElementById("logoutButton").addEventListener("click", () => {
    localStorage.removeItem("cms_session");
    location.reload();
  });

  if (!configured) {
    setupWarning.hidden = false;
    loginMessage.textContent = "請先完成 Supabase 設定";
    loginForm.querySelector("button").disabled = true;
  } else if (session?.access_token) {
    loadPersonas().then(() => loginLayer.classList.add("hidden")).catch(() => {
      localStorage.removeItem("cms_session");
      session = null;
    });
  }
})();
