// ============================================================
// 🔥 CUSTOMIZER UNIFICADO (INDEX + MOSTRADOR)
// ============================================================

export function setupCustomizer(cfg){

  const {
    overlay,
    modTitle,
    rowPatties, rowCheddar,
    patVal, patInc, patDec,
    cheVal, cheInc, cheDec,
    notes, btnCancel, btnAdd,
    updateCartCallback
  } = cfg;

  const EXTRA_PRICE_PATTY   = 2500;
  const EXTRA_PRICE_CHEDDAR = 300;

  let currentItem   = null;
  let currentMode   = "add";
  let currentEditId = null;
  let currentOriginal = null;   // usado en edición

  // ------------------------------------------------------------
  // HELPERS
  // ------------------------------------------------------------
  const $ = s => document.querySelector(s);
  const money = n => (Number(n)||0).toLocaleString("es-AR",{
    style:"currency",currency:"ARS",maximumFractionDigits:0
  });

  function reset(){
    patVal.textContent = "0";
    cheVal.textContent = "0";
    notes.value = "";
    document.querySelectorAll("input[name='fries']").forEach(x=> x.checked=false);
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

    if($("#unitPreview"))
      $("#unitPreview").textContent = money(subtotal);
  }

  // ------------------------------------------------------------
  // ABRIR MODAL
  // ------------------------------------------------------------
  function open(item, mode="add", editId=null, existing=null){

    currentItem   = item;
    currentMode   = mode;
    currentEditId = editId;
    currentOriginal = existing;

    reset();

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

    // si es edición → cargar valores previos
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
    }

    updatePreview();
    overlay.style.display = "flex";
  }

  // ------------------------------------------------------------
  // BOTONES DE EXTRA
  // ------------------------------------------------------------
  patInc.onclick = ()=>{
    let v = +patVal.textContent;
    if(v<2){ patVal.textContent = v+1; updatePreview(); }
  };
  patDec.onclick = ()=>{
    let v = +patVal.textContent;
    if(v>0){ patVal.textContent = v-1; updatePreview(); }
  };

  cheInc.onclick = ()=>{
    let v = +cheVal.textContent;
    if(v<3){ cheVal.textContent = v+1; updatePreview(); }
  };
  cheDec.onclick = ()=>{
    let v = +cheVal.textContent;
    if(v>0){ cheVal.textContent = v-1; updatePreview(); }
  };

  // ------------------------------------------------------------
  // CANCELAR
  // ------------------------------------------------------------
  btnCancel.onclick = ()=> overlay.style.display="none";

  // ------------------------------------------------------------
  // CONFIRMAR → agrega o edita el carrito
  // ------------------------------------------------------------
  btnAdd.onclick = ()=>{

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
        currentOriginal,    // PARA EL MOSTRADOR, que necesita qty original
        currentEditId       // id del item en el carrito
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
