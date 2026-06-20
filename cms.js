(function () {
  const config = window.CMS_CONFIG || {};
  const defaults = window.DEFAULT_SITE_CONTENT || {};
  const requestedCode = new URLSearchParams(window.location.search).get("p") || "yuanxuan";
  const personaCode = /^[a-z][a-z0-9-]{1,39}$/.test(requestedCode) ? requestedCode : "yuanxuan";
  const contentId = personaCode === "yuanxuan" ? "main" : personaCode;
  window.ACTIVE_PERSONA_CODE = personaCode;

  const get = (object, path) => path.split(".").reduce((value, key) => value?.[key], object);
  const merge = (base, extra) => {
    const result = { ...base };
    Object.keys(extra || {}).forEach((key) => {
      result[key] = extra[key] && typeof extra[key] === "object" && !Array.isArray(extra[key])
        ? merge(base?.[key] || {}, extra[key])
        : extra[key];
    });
    return result;
  };

  async function loadRemoteContent() {
    if (!config.supabaseUrl || !config.supabaseAnonKey) return defaults;
    try {
      const response = await fetch(`${config.supabaseUrl}/rest/v1/site_content?id=eq.${encodeURIComponent(contentId)}&select=content`, {
        headers: { apikey: config.supabaseAnonKey, Authorization: `Bearer ${config.supabaseAnonKey}` }
      });
      if (!response.ok) throw new Error("CMS request failed");
      const rows = await response.json();
      if (rows[0]?.content) return merge(defaults, rows[0].content);
      if (contentId !== "main") {
        const fallbackResponse = await fetch(`${config.supabaseUrl}/rest/v1/site_content?id=eq.main&select=content`, {
          headers: { apikey: config.supabaseAnonKey, Authorization: `Bearer ${config.supabaseAnonKey}` }
        });
        const fallbackRows = fallbackResponse.ok ? await fallbackResponse.json() : [];
        return merge(defaults, fallbackRows[0]?.content || {});
      }
      return defaults;
    } catch (error) {
      console.warn("CMS 暫時無法連線，已使用預設內容。", error);
      return defaults;
    }
  }

  function applyContent(content) {
    document.documentElement.dataset.persona = personaCode;
    const titleName = content.brand?.name || content.persona?.name;
    if (titleName) document.title = content.brand?.tagline ? `${titleName}｜${content.brand.tagline}` : titleName;
    document.querySelectorAll("[data-cms]").forEach((element) => {
      const value = get(content, element.dataset.cms);
      if (value !== undefined && value !== null) element.textContent = value;
    });
    document.querySelectorAll("[data-cms-img]").forEach((image) => {
      const value = get(content, image.dataset.cmsImg);
      if (!value) {
        image.classList.add("is-ready");
        return;
      }

      const preload = new Image();
      preload.decoding = "async";
      let settled = false;
      const reveal = (src) => {
        if (settled) return;
        settled = true;
        if (src) image.src = src;
        image.classList.add("is-ready");
      };
      preload.onload = () => reveal(value);
      preload.onerror = () => reveal();
      preload.src = value;
      window.setTimeout(() => reveal(), 8000);
    });
    const traits = String(content.persona?.traits || "").split(",").map((item) => item.trim()).filter(Boolean);
    const traitsBox = document.querySelector("[data-cms-traits]");
    if (traitsBox && traits.length) traitsBox.innerHTML = traits.map((trait) => `<span>${escapeHtml(trait)}</span>`).join("");
    const lineUrl = content.tracking?.lineUrl || content.tracking?.lineUrlPrimary || content.tracking?.lineUrlSecondary;
    document.querySelectorAll("[data-line-link]").forEach((link) => { if (lineUrl) link.href = lineUrl; });
    loadPixels(content.tracking || {});
    document.dispatchEvent(new CustomEvent("cms:ready", { detail: content }));
  }

  function escapeHtml(value) {
    const node = document.createElement("div");
    node.textContent = value;
    return node.innerHTML;
  }

  function loadPixels(tracking) {
    if (tracking.metaPixelId && !window.fbq) {
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");
      window.fbq("init", tracking.metaPixelId);
      window.fbq("track", "PageView");
    }
    if (tracking.tiktokPixelId && !window.ttq) {
      !function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat([].slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=r;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var i=d.createElement("script");i.type="text/javascript";i.async=!0;i.src=r+"?sdkid="+e+"&lib="+t;var o=d.getElementsByTagName("script")[0];o.parentNode.insertBefore(i,o)};ttq.load(tracking.tiktokPixelId);ttq.page()}(window,document,"ttq");
    }
  }

  loadRemoteContent().then(applyContent);
})();
