/* ===============================================================
   CUSTOMIZER UNIFICADO PARA INDEX + MOSTRADOR
   =============================================================== */

export function setupCustomizer(config){

  const {
    overlay,
    modTitle,

    rowPatties,
    rowCheddar,

    patVal, patInc, patDec,
    cheVal, cheInc, cheDec,

    notes,
    btnCancel,
    btnAdd,

    updateCartCallback
  } = config;

  const EXTRA_PRICE_PATTY   = 2500;
  const EXTRA_PRICE_CHEDDAR = 300;

  let currentItem = null;

  /* ---------- helpers ---------- */
  function money(n){
    return (Number(n)||0).toLocaleString("es-AR",
      { style:"currency", currency:"ARS", maximumFractionDigits:0 }
    );
  }

  function resetFields(){
    patVal.textContent = "0";
    cheVal.textContent = "0";
    notes.value = "";
    document.querySelectorAll("input[name='fries']").forEach(x=> x.checked = false);
  }

  function updatePreview(){
    if(!currentItem) return;

    const extras = {
      patty: Number(patVal.textContent),
      cheddar: Number(cheVal.textContent)
    };

    const base = currentItem.price;
    const subtotal =
      base +
      extras.patty   * EXTRA_PRICE_PATTY +
      extras.cheddar * EXTRA_PRICE_CHEDDAR;

    // si index tiene pricePreview
    const priceEl = document.getElementById("pricePreview");
    if(priceEl) priceEl.textContent = money(subtotal);

    // si mostrador tiene unitPreview
    const unitEl = document.getElementById("unitPreview");
    if(unitEl) unitEl.textContent = money(subtotal);

    // botón
    if(btnAdd){
      btnAdd.textContent = "Agregar — " + money(subtotal);
    }
  }

  /* ---------- lógica de extras ---------- */
  function applyKind(kind){
    if(kind === "doble"){
      rowPatties.style.display = "flex";
      rowCheddar.style.display = "flex";
    }
    else if(kind === "pollo"){
      rowPatties.style.display = "none";
      rowCheddar.style.display = "flex";
    }
    else {
      // simple
      rowPatties.style.display = "none";
      rowCheddar.style.display = "none";
    }
  }

  /* ---------- abrir ---------- */
  function openCustomizer(item){
    currentItem = item;

    modTitle.textContent = "Personalizar: " + item.name;

    resetFields();
    applyKind(item.kind);
    updatePreview();

    overlay.style.display = "flex";
  }

  /* ---------- eventos ---------- */
  patInc.onclick = ()=>{ let v=+patVal.textContent; if(v<2) patVal.textContent=v+1; updatePreview(); };
  patDec.onclick = ()=>{ let v=+patVal.textContent; if(v>0) patVal.textContent=v-1; updatePreview(); };
  cheInc.onclick = ()=>{ let v=+cheVal.textContent; if(v<3) cheVal.textContent=v+1; updatePreview(); };
  cheDec.onclick = ()=>{ let v=+cheVal.textContent; if(v>0) cheVal.textContent=v-1; updatePreview(); };

  btnCancel.onclick = ()=> overlay.style.display="none";

  btnAdd.onclick = ()=>{
    const fries = document.querySelector("input[name='fries']:checked");
    const friesVal = fries ? fries.value : "";

    const extras = {
      patty: Number(patVal.textContent),
      cheddar: Number(cheVal.textContent),
      EXTRA_PRICE_PATTY,
      EXTRA_PRICE_CHEDDAR
    };

    const notesTxt = notes.value.trim();

    updateCartCallback(currentItem, friesVal, extras, notesTxt);

    overlay.style.display = "none";
  };

  return openCustomizer;
}
