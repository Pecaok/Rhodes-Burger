// ============================================================
// 🔥 CUSTOMIZER UNIFICADO (INDEX + MOSTRADOR) — VERSION CORREGIDA
// ============================================================

export function setupCustomizer(config){

  // Detectar si estamos en INDEX (soporta dominio raíz /)
  const path = window.location.pathname;
  const isIndex =
    path === "/" ||
    path.endsWith("/index") ||
    path.endsWith("/index.html") ||
    path.includes("index.html");

  // ------------------------------------------------------------
  // VALIDACIÓN DE PAPAS (SOLO INDEX)
  // ------------------------------------------------------------
  function validateFriesSelection() {
    if (!isIndex) {
      // En MOSTRADOR NO bloquear
      config.btnAdd.disabled = false;
      config.btnAdd.style.opacity = "1";
      return true;
    }

    // En INDEX → papas obligatorias
    const fries = config.overlay.querySelector("input[name='fries']:checked");
    if (!fries) {
      config.btnAdd.disabled = true;
      config.btnAdd.style.opacity = "0.5";
      return false;
    }

    config.btnAdd.disabled = false;
    config.btnAdd.style.opacity = "1";
    return true;
  }

  // Escuchar cambios en papas (solo index)
  config.overlay.querySelectorAll("input[name='fries']").forEach(r => {
    r.addEventListener("change", validateFriesSelection);
  });

  // ------------------------------------------------------------
  // VARIABLES
  // ------------------------------------------------------------
  const {
    overlay,
    modTitle,
    rowPatties, rowCheddar,
    patVal, patInc, patDec,
    cheVal, cheInc, cheDec,
    notes, btnCancel, btnAdd,
    updateCartCallback
  } = config;

  const EXTRA_PRICE_PATTY   = 2500;
  const EXTRA_PRICE_CHEDDAR = 300;

  let currentItem   = null;
  let currentMode   = "add";
  let currentEditId = null;
  let currentOriginal = null;

  const money = n => (Number(n)||0).toLocaleString("es-AR",{
    style:"currency",currency:"ARS",maximumFractionDigits:0
  });

  function reset(){
    patVal.textContent = "0";
    cheVal.textContent = "0";
    notes.value = "";
    config.overlay.querySelectorAll("input[name='fries']").forEach(x=> x.checked=false);
  }

  function detectKind(item){
    const k = (item.kind||"").toLowerCase();
    if(k==="doble") return "doble";
    if(k==="pollo") return "pollo";
    return "simple";
  }

  function updatePreview(){
    if(!currentItem) return;
    const p = Number(patVal.textContent);
    const c = Number(cheVal.textContent);
    const subtotal =
      currentItem.price +
      p * EXTRA_PRICE_PATTY +
      c * EXTRA_PRICE_CHEDDAR;
    document.getElementById("unitPreview").textContent = money(subtotal);
  }

  // ------------------------------------------------------------
  // ABRIR
  // ------------------------------------------------------------
  function open(item, mode="add", editId=null, existing=null){

    currentItem   = item;
    currentMode   = mode;
    currentEditId = editId;
    currentOriginal = existing;

    reset();

    // 🔥 Bloquear botón al abrir (solo INDEX)
    if (isIndex) {
      config.btnAdd.disabled = true;
      config.btnAdd.style.opacity = "0.5";
    }

    modTitle.textContent =
      (mode==="edit" ? "Editar: " : "Personalizar: ") + item.name;

    const kind = detectKind(item);

    if(kind==="doble"){
      rowPatties.style.display = "flex";
      rowCheddar.style.display = "flex";
    }
    else if(kind==="pollo"){
      rowPatties.style.display = "none";
      rowCheddar.style.display = "flex";
    }
    else{
      rowPatties.style.display = "none";
      rowCheddar.style.display = "none";
    }

    if(mode==="edit" && existing){
      patVal.textContent = existing.extras.patty;
      cheVal.textContent = existing.extras.cheddar;
      notes.value = existing.notes || "";

      if(existing.friesRaw){
        const r = document.querySelector(
          `input[name='fries'][value='${existing.friesRaw}']`
        );
        if(r) r.checked = true;
      }
      validateFriesSelection();
    }

    updatePreview();
    overlay.style.display = "flex";
  }

  // ------------------------------------------------------------
  // EXTRAS
  // ------------------------------------------------------------
  patInc.onclick = ()=>{ let v=+patVal.textContent; if(v<2){patVal.textContent=v+1;updatePreview();} };
  patDec.onclick = ()=>{ let v=+patVal.textContent; if(v>0){patVal.textContent=v-1;updatePreview();} };

  cheInc.onclick = ()=>{ let v=+cheVal.textContent; if(v<3){cheVal.textContent=v+1;updatePreview();} };
  cheDec.onclick = ()=>{ let v=+cheVal.textContent; if(v>0){cheVal.textContent=v-1;updatePreview();} };

  // ------------------------------------------------------------
  // CANCELAR
  // ------------------------------------------------------------
  btnCancel.onclick = ()=> overlay.style.display="none";

  // ------------------------------------------------------------
  // CONFIRMAR
  // ------------------------------------------------------------
  btnAdd.onclick = ()=>{

    // En INDEX → bloquear si no eligió papas
    if(isIndex && !validateFriesSelection()) return;

    const friesRadio = document.querySelector("input[name='fries']:checked");
    const friesRaw = friesRadio ? friesRadio.value : "";

    const extras = {
      patty:   Number(patVal.textContent),
      cheddar: Number(cheVal.textContent)
    };

    const txtNotes = notes.value.trim();

    if(currentMode==="edit"){
      updateCartCallback(
        currentItem,
        friesRaw,
        extras,
        txtNotes,
        currentOriginal,
        currentEditId
      );
    } else {
      updateCartCallback(
        currentItem,
        friesRaw,
        extras,
        txtNotes
      );
    }

    overlay.style.display="none";
  };

  return open;
}
