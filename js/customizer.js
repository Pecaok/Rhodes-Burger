/* ============================================================
   CUSTOMIZER UNIFICADO — MOSTRADOR + MENÚ CLIENTE
   ============================================================ */

export function setupCustomizer(opts){

  /* ========= REFERENCIAS ========= */
  const overlay     = opts.overlay;
  const modTitle    = opts.modTitle;

  const rowPatties  = opts.rowPatties;
  const rowCheddar  = opts.rowCheddar;

  const patVal      = opts.patVal;
  const patInc      = opts.patInc;
  const patDec      = opts.patDec;

  const cheVal      = opts.cheVal;
  const cheInc      = opts.cheInc;
  const cheDec      = opts.cheDec;

  const notes       = opts.notes;

  const btnCancel   = opts.btnCancel;
  const btnAdd      = opts.btnAdd;

  const updateCartCallback = opts.updateCartCallback;

  const MAX_PATTIES = 2;
  const MAX_CHEDDAR = 3;

  /* ========= ESTADO INTERNO ========= */
  let currentItem = null;
  let currentMode = "add";
  let currentEditId = null;

  /* ========= RESET ========= */
  function reset(){
    patVal.textContent = "0";
    cheVal.textContent = "0";
    notes.value = "";
    overlay.style.display = "flex";

    const fries = document.querySelectorAll("input[name='fries']");
    fries.forEach(f => f.checked = false);
  }

  /* ========= MOSTRAR ELEMENTOS SEGÚN TIPO ========= */
  function configureExtras(itemName){
    const name = itemName.toLowerCase();

    const isDoble = name.includes("doble");
    const isPollo = name.includes("pollo");

    if(isDoble){
      rowPatties.style.display = "flex";
      rowCheddar.style.display = "flex";
    } 
    else if(isPollo){
      rowPatties.style.display = "none";
      rowCheddar.style.display = "flex";
    }
    else {
      rowPatties.style.display = "none";
      rowCheddar.style.display = "none";
    }
  }

  /* ========= CALCULAR PRECIOS ========= */
  function unitPrice(){
    const base = currentItem.price;
    const patties = Number(patVal.textContent);
    const cheddar = Number(cheVal.textContent);

    const EXTRA_PATTY   = currentItem.EXTRA_PRICE_PATTY   || 2500;
    const EXTRA_CHEDDAR = currentItem.EXTRA_PRICE_CHEDDAR || 300;

    return base + patties * EXTRA_PATTY + cheddar * EXTRA_CHEDDAR;
  }

  /* ========= ABRIR MODAL ========= */
  function open(item, mode="add", id=null){
    currentItem = item;
    currentMode = mode;
    currentEditId = id;

    modTitle.textContent = (mode === "edit" ? "Editar: " : "Personalizar: ") + item.name;

    reset();
    configureExtras(item.name);

    overlay.style.display = "flex";
  }

  /* ========= BOTONES DE CANTIDADES ========= */

  patInc.onclick = () => {
    let v = Number(patVal.textContent);
    if(v < MAX_PATTIES){
      patVal.textContent = v + 1;
    }
  };
  patDec.onclick = () => {
    let v = Number(patVal.textContent);
    if(v > 0){
      patVal.textContent = v - 1;
    }
  };

  cheInc.onclick = () => {
    let v = Number(cheVal.textContent);
    if(v < MAX_CHEDDAR){
      cheVal.textContent = v + 1;
    }
  };
  cheDec.onclick = () => {
    let v = Number(cheVal.textContent);
    if(v > 0){
      cheVal.textContent = v - 1;
    }
  };

  /* ========= CANCELAR ========= */
  btnCancel.onclick = () => {
    overlay.style.display = "none";
  };

  /* ========= AGREGAR ========= */
  btnAdd.onclick = () => {

    const fries = document.querySelector("input[name='fries']:checked");
    const friesCode = fries ? fries.value : "";
    const friesName =
        friesCode === "con_sazon" ? "Sazonadas" :
        friesCode === "con_sal"   ? "Con sal" :
        friesCode === "sin_sal"   ? "Sin sal" :
        "Sin papas";

    const extras = {
      patty: Number(patVal.textContent),
      cheddar: Number(cheVal.textContent)
    };

    const notesValue = notes.value.trim();

    // Se lo pasamos al carrito del archivo que lo llamó
    updateCartCallback(
      currentItem,
      friesName,
      extras,
      notesValue
    );

    overlay.style.display = "none";
  };

  /* ========= EXPOSE ========= */
  return open;
}
