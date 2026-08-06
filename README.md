# Kindle Light Toggle

Página con un botón para prender/apagar una luz Tuya/Smart Life desde el navegador del Kindle, usando una función serverless de Vercel como puente seguro con la API de Tuya.

## Subir a GitHub y deployar en Vercel

1. Subí esta carpeta completa a un repo de GitHub.
2. En vercel.com, "Add New Project" → importá ese repo. No hace falta tocar el build (es estático + funciones serverless automáticas).
3. Antes o después del primer deploy, andá a **Project → Settings → Environment Variables** y agregá:

   | Variable            | Valor                                      |
   |---------------------|---------------------------------------------|
   | `TUYA_ACCESS_ID`     | tu Access ID de Tuya IoT                    |
   | `TUYA_ACCESS_SECRET` | tu Access Secret de Tuya IoT                |
   | `TUYA_DEVICE_ID`     | el Device ID de tu luz                      |
   | `TUYA_BASE_URL`      | `https://openapi.tuyaus.com` (Western America) |

4. Redeploy (Vercel lo pide automáticamente al agregar env vars).
5. Tu sitio queda en `https://tu-proyecto.vercel.app`. Abrilo en el navegador del Kindle.

## Notas

- `index.html` ya apunta a `/api/toggle` (ruta relativa), así que funciona directo con el dominio de Vercel sin editar nada.
- Las credenciales de Tuya nunca llegan al Kindle ni al navegador: viven solo como variables de entorno en Vercel y las usa `api/toggle.js` del lado del servidor.
# kindle-switch
