/* ============================================================
      🔥 CUSTOMIZER UNIFICADO (INDEX + MOSTRADOR)
============================================================ */

const EXTRA_PRICE_PATTY  = 2500;
const EXTRA_PRICE_CHEDDAR = 300;

export function setupCustomizer(options){
  const {
    overlay, modTitle, rowPatties, rowCheddar,
    patVal, patInc, patDec,
    cheVal, cheInc, cheDec,
    notes, btnCancel, btnAdd,
    updateCartCallback
  } = options;

  let currentItem = null;

  function calcSubtotal(item, extras){
    return item.price +
      extras.patty   * EXTRA_PRICE_PATTY +
      extras.cheddar * EXTRA_PRICE_CHEDDAR;
  }

  function updatePreview(){
    const extras = {
      patty: Number(patVal.textContent),
      cheddar: Number(cheVal.textContent)
    };

    const subtotal = calcSubtotal(currentItem, extras);

    document.getElementById("precioBaseTxt").textContent =
      "Precio base: " + subtotal.toLocaleString("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0});

    document.getElementById("subtotalTxt").textContent =
      subtotal.toLocaleString("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0});

    btnAdd.textContent = "Agregar al carrito — " +
      subtotal.toLocaleString("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0});

    // Detalles de extras
    const patDiv = document.getElementById("precioPattyTxt");
    const cheDiv = document.getElementById("precioCheddarTxt");

    if(extras.patty > 0){
      patDiv.style.display = "block";
      patDiv.textContent = `Medallón extra (x${extras.patty})`;
    } else patDiv.style.display = "none";

    if(extras.cheddar > 0){
      cheDiv.style.display = "block";
      cheDiv.textContent = `Cheddar extra (x${extras.cheddar})`;
    } else cheDiv.style.display = "none";
  }

  function resetFries(){
    document.querySelectorAll("input[name='fries']").forEach(r=>r.checked=false);
  }

  function open(item){
    currentItem = item;
    modTitle.textContent = "Personalizar: " + item.name;

    resetFries();
    notes.value = "";
    patVal.textContent = "0";
    cheVal.textContent = "0";

    const name = item.name.toLowerCase();
    const esDoble = name.includes("doble") || name.includes("double");
    const esPollo = name.includes("pollo") || name.includes("chicken");

    if(esDoble){
      rowPatties.style.display = "flex";
      rowCheddar.style.display = "flex";
    }
    else if(esPollo){
      rowPatties.style.display = "none";
      rowCheddar.style.display = "flex";
    }
    else {
      rowPatties.style.display = "none";
      rowCheddar.style.display = "none";
    }

    updatePreview();
    overlay.classList.add("open");
  }

  btnCancel.onclick = ()=> overlay.classList.remove("open");
  patInc.onclick = ()=>{ let v=+patVal.textContent; if(v<2) patVal.textContent=v+1; updatePreview(); };
  patDec.onclick = ()=>{ let v=+patVal.textContent; if(v>0) patVal.textContent=v-1; updatePreview(); };
  cheInc.onclick = ()=>{ let v=+cheVal.textContent; if(v<3) cheVal.textContent=v+1; updatePreview(); };
  cheDec.onclick = ()=>{ let v=+cheVal.textContent; if(v>0) cheVal.textContent=v-1; updatePreview(); };

  btnAdd.onclick = ()=>{
    const friesEl = document.querySelector("input[name='fries']:checked");
    if(!friesEl){
      alert("Elegí el tipo de papas");
      return;
    }

    const extras = {
      patty: Number(patVal.textContent),
      cheddar: Number(cheVal.textContent)
    };

    updateCartCallback(currentItem, friesEl.value, extras, notes.value.trim());

    overlay.classList.remove("open");
  };

  return open;
}
