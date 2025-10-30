// Registro SW + UI de instalación + aviso de update
(function(){
  // Registrar SW
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").then(reg => {
      // Detectar updates del SW
      if (reg.waiting) notifyUpdate(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const newSW = reg.installing;
        newSW?.addEventListener("statechange", () => {
          if (newSW.state === "installed" && navigator.serviceWorker.controller) {
            notifyUpdate(newSW);
          }
        });
      });
    }).catch(console.error);
  }

  function notifyUpdate(worker){
    const bar = document.createElement("div");
    bar.style.cssText = "position:fixed;bottom:10px;left:50%;transform:translateX(-50%);background:#625A45;color:#fff;padding:10px 14px;border-radius:999px;box-shadow:0 6px 18px rgba(0,0,0,.2);z-index:9999;font-weight:700";
    bar.innerHTML = `Hay una actualización disponible&nbsp;&nbsp;<button id="rbUpd" style="border:0;background:#fff;color:#625A45;font-weight:800;border-radius:999px;padding:6px 10px;cursor:pointer">Actualizar</button>`;
    document.body.appendChild(bar);
    document.getElementById("rbUpd").onclick = () => {
      worker.postMessage("skipWaiting");
    };
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      location.reload();
    });
  }

  // Instalar como app (beforeinstallprompt)
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById("btnInstall");
    if (btn) {
      btn.style.display = "inline-flex";
      btn.onclick = async () => {
        btn.disabled = true;
        try{
          await deferredPrompt.prompt();
          await deferredPrompt.userChoice;
        }catch(_){}
        deferredPrompt = null;
        btn.style.display = "none";
      };
    }
  });
})();
