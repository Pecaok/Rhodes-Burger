# Deploy de la facturación ARCA (Firebase Cloud Function)

Pasos para dejar la facturación andando. El orden importa: sin el **certificado**
(pasos 1-2) no se puede configurar ni deployar nada útil.

## 1. Activar el plan Blaze
Consola Firebase → proyecto **rhodes-burguers** → ⚙️ → **Uso y facturación** →
**Modifica el plan** → **Blaze** (pay as you go; asociar una tarjeta).
Las Cloud Functions no se pueden deployar en el plan gratuito (Spark).

## 2. Generar el certificado de ARCA (homologación)
Ya está la clave privada en `C:\Users\pecao\arca-cert\rhodes_homo.key`.
Hace falta el **CUIT del titular** del monotributo para generar el CSR y subirlo
a ARCA. Guía detallada: `C:\Users\pecao\arca-cert\GUIA-ARCA.md`.
Resultado: un archivo de **certificado** (`.crt`/`.pem`).

## 3. Instalar y loguear la Firebase CLI (una sola vez)
```bash
npm install -g firebase-tools
firebase login
```

## 4. Cargar los secretos (datos sensibles)
Desde la carpeta del repo (`Rhodes-Burger`):
```bash
firebase functions:secrets:set AFIP_CUIT     # pegás el CUIT (solo números)
firebase functions:secrets:set AFIP_CERT     # pegás el certificado completo (BEGIN...END)
firebase functions:secrets:set AFIP_KEY      # pegás el contenido de rhodes_homo.key
```

## 5. Config no sensible
Crear `firebase-functions/.env` (copiar de `.env.example`):
```
AFIP_PRODUCTION=false     # false = homologación (pruebas). true = facturas reales
AFIP_PUNTO_VENTA=1        # nº de punto de venta habilitado en ARCA
```

## 6. Deployar
```bash
firebase deploy --only functions
```

## 7. Probar
En el panel del local, tocar **🧾 Facturar** en un pedido de prueba.
- En homologación, el CAE es de PRUEBA (no válido fiscalmente).
- Cuando todo funcione, cambiar `AFIP_PRODUCTION=true`, repetir el deploy y
  facturar de verdad.

> Si algo de esto no está listo, el botón sigue funcionando como antes
> (manda los datos a Facturitas por WhatsApp). No se rompe nada.
