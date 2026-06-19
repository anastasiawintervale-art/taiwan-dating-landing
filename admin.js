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
  let content = defaults;
  let session = JSON.parse(localStorage.getItem("cms_session") || "null");

  const get = (object, path) => path.split(".").reduce((value, key) => value?.[key], object);
  const set = (object, path, value) => {
    const keys = path.split(".");
    const last = keys.pop();
    const target = keys.reduce((current, key) => current[key] ||= {}, object);
    target[last] = value;
  };
  const headers = (token = config.supabaseAnonKey) => ({ apikey: config.supabaseAnonKey, Authorization: `Bearer ${token}` });

  function notify(message) {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function bindForm() {
    document.querySelectorAll("[data-field]").forEach((field) => {
      field.value = get(content, field.dataset.field) ?? "";
      field.addEventListener("input", () => {
        set(content, field.dataset.field, field.value);
        saveStatus.textContent = "有尚未儲存的修改";
      });
    });
    document.querySelectorAll("[data-image-key]").forEach((box) => {
      const key = box.dataset.imageKey;
      const image = box.querySelector("img");
      const input = box.querySelector("input");
      image.src = get(content, key) || "";
      box.querySelector("button").addEventListener("click", () => input.click());
      input.addEventListener("change", async () => {
        if (!input.files[0]) return;
        await uploadImage(input.files[0], key, image);
        input.value = "";
      });
    });
  }

  async function signIn(password) {
    const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error_description || data.msg || "登入失败");
    session = data;
    localStorage.setItem("cms_session", JSON.stringify(session));
  }

  async function loadContent() {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/site_content?id=eq.main&select=content`, { headers: headers(session.access_token) });
    if (response.status === 401) throw new Error("SESSION_EXPIRED");
    const rows = await response.json();
    content = rows[0]?.content ? { ...defaults, ...rows[0].content } : defaults;
    content.tracking ||= {};
    content.tracking.lineUrlPrimary ||= content.tracking.lineUrl || defaults.tracking.lineUrlPrimary;
    content.tracking.lineUrlSecondary ||= content.tracking.lineUrl || defaults.tracking.lineUrlSecondary || content.tracking.lineUrlPrimary;
    bindForm();
  }

  async function saveContent() {
    saveButton.disabled = true;
    saveStatus.textContent = "正在儲存…";
    try {
      content.tracking.lineUrl = content.tracking.lineUrlPrimary;
      const response = await fetch(`${config.supabaseUrl}/rest/v1/site_content`, {
        method: "POST",
        headers: { ...headers(session.access_token), "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ id: "main", content, updated_at: new Date().toISOString() })
      });
      if (!response.ok) throw new Error(await response.text());
      saveStatus.textContent = "已发布最新内容";
      notify("储存成功，前台已更新");
    } catch (error) {
      saveStatus.textContent = "储存失败";
      notify("储存失败，请检查后台设置");
      console.error(error);
    } finally { saveButton.disabled = false; }
  }

  async function uploadImage(file, key, preview) {
    if (file.size > 12 * 1024 * 1024) return notify("原始圖片請控制在 12MB 以內");
    notify("圖片壓縮中…");
    file = await optimizeImage(file);
    if (file.size > 3 * 1024 * 1024) return notify("图片请控制在 3MB 以内");
    const extension = file.name.split(".").pop().replace(/[^a-zA-Z0-9]/g, "") || "jpg";
    const path = `${key.replace("images.", "")}-${Date.now()}.${extension}`;
    notify("图片上传中…");
    const response = await fetch(`${config.supabaseUrl}/storage/v1/object/site-assets/${path}`, {
      method: "POST",
      headers: { ...headers(session.access_token), "Content-Type": file.type, "cache-control": "31536000", "x-upsert": "true" },
      body: file
    });
    if (!response.ok) return notify("上传失败，请检查 Storage 设置");
    const url = `${config.supabaseUrl}/storage/v1/object/public/site-assets/${path}`;
    set(content, key, url);
    preview.src = url;
    saveStatus.textContent = "图片已上传，记得储存发布";
    notify("图片上传成功");
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
      console.warn("圖片壓縮失敗，使用原始檔案。", error);
      return file;
    }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!configured) return;
    loginMessage.textContent = "登入中…";
    try {
      await signIn(document.getElementById("password").value);
      await loadContent();
      loginLayer.classList.add("hidden");
    } catch (error) { loginMessage.textContent = error.message; }
  });

  saveButton.addEventListener("click", saveContent);
  document.getElementById("logoutButton").addEventListener("click", () => {
    localStorage.removeItem("cms_session");
    location.reload();
  });

  if (!configured) {
    setupWarning.hidden = false;
    loginMessage.textContent = "请先完成 Supabase 配置";
    loginForm.querySelector("button").disabled = true;
  } else if (session?.access_token) {
    loadContent().then(() => loginLayer.classList.add("hidden")).catch(() => {
      localStorage.removeItem("cms_session");
      session = null;
    });
  }
})();
