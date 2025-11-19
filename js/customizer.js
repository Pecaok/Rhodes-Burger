export function setupCustomizer(cfg){
  const {
    overlay, modTitle,
    rowPatties, rowCheddar,
    patVal, patInc, patDec,
    cheVal, cheInc, cheDec,
    notes, btnCancel, btnAdd,
    allowExtras,
    updateCartCallback
  } = cfg;

  let currentItem = null;

  function updatePreview(){
    const extras = {
      patty: Number(patVal.textContent),
      cheddar: Number(cheVal.textContent)
    };

    const base = currentItem.price;
    const subtotal =
      base +
      extras.patty * 2500 +
      extras.cheddar * 300;

    document.getElementById("precioBaseTxt").textContent =
      "Precio base: " + subtotal.toLocaleString("es-AR", {style:"currency",currency:"ARS"});

    document.getElementById("pricePreview").textContent =
      subtotal.toLocaleString("es-AR",{style:"currency",currency:"ARS"});

    btnAdd.textContent =
      "Agregar al carrito — " +
      subtotal.toLocaleString("es-AR",{style:"currency",currency:"ARS"});
  }

  btnCancel.onclick = () => overlay.classList.remove("open");

  patInc.onclick = () => { patVal.textContent = Math.min(+patVal.textContent+1, 2); updatePreview(); };
  patDec.onclick = () => { patVal.textContent = Math.max(+patVal.textContent-1, 0); updatePreview(); };

  cheInc.onclick = () => { cheVal.textContent = Math.min(+cheVal.textContent+1, 3); updatePreview(); };
  cheDec.onclick = () => { cheVal.textContent = Math.max(+cheVal.textContent-1, 0); updatePreview(); };

  btnAdd.onclick = () => {
    const friesEl = document.querySelector("input[name='fries']:checked");
    if(!friesEl){ alert("Elegí el tipo de papas"); return; }

    updateCartCallback(
      currentItem,
      friesEl.value,
      {
        patty: Number(patVal.textContent),
        cheddar:Number(cheVal.textContent)
      },
      notes.value.trim()
    );

    overlay.classList.remove("open");
  };

  return function openCustomize(item){
    currentItem = item;

    modTitle.textContent = "Personalizar: " + item.name;
    notes.value = "";
    patVal.textContent = "0";
    cheVal.textContent = "0";

    const rule = allowExtras(item);

    rowPatties.style.display = rule.patties ? "flex" : "none";
    rowCheddar.style.display = rule.cheddar ? "flex" : "none";

    updatePreview();
    overlay.classList.add("open");
  };
}
