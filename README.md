# ☁️ ArchivaCloud P-12

> Portal de gestión documental con Amazon S3 — MVP para ArchivaCloud SpA

---

## 1. Identificación

| Campo | Valor |
|---|---|
| **Producto** | ArchivaCloud — Portal de carga de archivos a Amazon S3 |
| **Código de pareja** | P-12 |
| **Integrante 1** | Bayron Cerna |
| **Integrante 2** | Jostin Saez |
| **Repositorio** | https://github.com/Jsaez-a113/Certamen3-Aws |

---

## 2. Parámetros únicos (Anexo B)

| Campo | Valor |
|---|---|
| Tipos de archivo permitidos | DOCX, ODT, RTF |
| Tamaño máximo | 14 MB |
| Nombre del bucket | `archivacloud-p12` |
| Región AWS | `us-east-1` |
| Feature extra | Renombrar un archivo del bucket (copia con nuevo nombre y elimina el anterior) |

---

## 3. Arquitectura

### Descripción

La aplicación sigue el patrón de **presigned URLs**. El archivo nunca pasa por el backend — se sube directamente desde el navegador a S3 usando una URL firmada temporalmente.

```
[Usuario/Browser]
      │
      │ 1. Selecciona archivo (.docx/.odt/.rtf ≤ 14 MB)
      ▼
[Frontend React + Vite]  ──(2. POST /api/upload/presigned-url)──▶  [Backend FastAPI]
      │                                                                      │
      │                                                           3. Genera URL firmada
      │                                                                      │
      │                                                              [AWS S3 archivacloud-p12]
      │                                                                      │
      └──────────────(4. PUT directo con el archivo)────────────────────────▶│
                                                                             │
[Frontend React + Vite]  ◀──(5. GET /api/files / DELETE / rename)──  [Backend FastAPI]
                                                                             │
                                                                    6. list/delete/copy
                                                                             │
                                                                      [AWS S3]
```

### Diagrama manuscrito

📷 Ver foto en `docs/arquitectura.jpg`

---

## 4. Stack y versiones

| Componente | Tecnología | Versión |
|---|---|---|
| Backend | Python | 3.13+ |
| Framework API | FastAPI | 0.136.3 |
| Servidor ASGI | Uvicorn | 0.29.0 |
| SDK AWS | boto3 | 1.34.0 |
| Validación | Pydantic | 2.9.0 |
| Variables de entorno | python-dotenv | 1.2.2 |
| Middleware HTTP | Starlette | 1.2.1 |
| Frontend | React | 19 |
| Build tool | Vite | 8.x |
| Cliente HTTP | axios | latest |

---

## 5. Variables de entorno

Copiar `backend/.env.example` a `backend/.env` y completar:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | ID de clave de acceso AWS | `ASIAREHJVQMD...` |
| `AWS_SECRET_ACCESS_KEY` | Clave secreta AWS | `DeWbPSaFv...` |
| `AWS_SESSION_TOKEN` | Token de sesión temporal (Vocareum/STS) | `IQoJb3Jp...` |
| `AWS_REGION` | Región del bucket S3 | `us-east-1` |
| `S3_BUCKET_NAME` | Nombre exacto del bucket | `archivacloud-p12` |
| `FRONTEND_ORIGIN` | Origen permitido para CORS | `http://localhost:5173` |

> ⚠️ El archivo `.env` está en `.gitignore` y nunca se sube al repositorio (SEC-01).
> En AWS Academy las credenciales son temporales y expiran al terminar la sesión del lab.

---

## 6. Política IAM mínima

En producción real se usaría un usuario IAM dedicado con esta política de mínimo privilegio (SEC-05):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ArchivaCloudP12",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::archivacloud-p12",
        "arn:aws:s3:::archivacloud-p12/*"
      ]
    }
  ]
}
```

> En el entorno AWS Academy (Vocareum), `iam:CreateUser` está bloqueado. Se usan las credenciales temporales del rol `LabRole` que expiran automáticamente.

---

## 7. Configuración CORS del bucket

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["http://localhost:5173"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

> En producción reemplazar `http://localhost:5173` por el dominio real del frontend.

---

## 8. Pasos para correr el proyecto

### Requisitos previos
- Python 3.10+
- Node.js 18+
- Credenciales AWS activas (Vocareum → AWS Details)

### Backend

```bash
# 1. Entrar a la carpeta del backend
cd backend

# 2. Crear y activar entorno virtual
python -m venv venv

# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Configurar credenciales
cp .env.example .env
# Editar .env con las credenciales de Vocareum (AWS Details)

# 5. Levantar el servidor
uvicorn main:app --reload --port 8000
```

Verificar que funciona:
```bash
curl http://localhost:8000/healthz
# Respuesta: {"status":"ok","bucket":"archivacloud-p12","region":"us-east-1"}
```

### Frontend

```bash
# En otra terminal, desde la raíz del proyecto
cd frontend

# Instalar dependencias (solo la primera vez)
npm install

# Levantar el servidor de desarrollo
npm run dev
```

Abrir el navegador en: **http://localhost:5173**

---

## 9. Endpoints de la API

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/healthz` | Health check del servidor |
| `POST` | `/api/upload/presigned-url` | Genera URL firmada para subir archivo a S3 |
| `GET` | `/api/files` | Lista todos los archivos del bucket |
| `DELETE` | `/api/files/{name}` | Elimina un archivo del bucket |
| `POST` | `/api/files/{name}/rename` | Renombra un archivo (feature extra P-12) |

---

## 10. Auditoría de dependencias (SEC-09)

### pip-audit (backend)

```bash
cd backend
venv\Scripts\activate   # Windows
pip install pip-audit
pip-audit
```

Resultado obtenido:
```
No known vulnerabilities found
```

### npm audit (frontend)

```bash
cd frontend
npm audit
```

Resultado obtenido:
```
found 0 vulnerabilities
```

---

## 11. Feature extra P-12 — Renombrar archivo

La feature extra asignada a P-12 es **renombrar un archivo del bucket**.

### ¿Cómo funciona?

S3 no tiene una operación nativa de renombrado. La implementación:

1. Copia el objeto original con el nuevo nombre (`s3:CopyObject`)
2. Elimina el objeto original (`s3:DeleteObject`)

### Endpoint

```
POST /api/files/{file_name}/rename
Body: { "newName": "nuevo-nombre.docx" }
```

### En el frontend

Cada archivo tiene un botón **Renombrar** que muestra un campo de texto inline. El usuario escribe el nuevo nombre base y la extensión se preserva automáticamente. Al confirmar, se llama al endpoint y la lista se actualiza.

Ver capturas en: `docs/feature-extra.md`

---

## 12. Controles de seguridad aplicados

| Control | Descripción | Estado |
|---|---|---|
| SEC-01 | Secretos fuera del repositorio (`.env` en `.gitignore`) | ✅ |
| SEC-02 | CORS restrictivo solo a `localhost:5173` | ✅ |
| SEC-03 | Validación y sanitización de nombre de archivo | ✅ |
| SEC-04 | Validación de tamaño máximo (14 MB) en backend | ✅ |
| SEC-05 | Política IAM de mínimo privilegio (documentada) | ✅ |
| SEC-06 | Block Public Access activado en bucket S3 | ✅ |
| SEC-07 | Sin stack traces expuestos al cliente | ✅ |
| SEC-08 | Encriptación en reposo SSE-S3 (AES-256) | ✅ |
| SEC-09 | pip-audit y npm audit sin vulnerabilidades | ✅ |
| SEC-10 | HTTPS en producción (documentado) | ✅ |

Ver detalles en: `docs/reporte-seguridad.md`

---

## 13. Commits clave

Ver historial completo en: https://github.com/Jsaez-a113/Certamen3-Aws/commits/main

| Commit | Descripción |
|---|---|
| `feat: initial project structure for ArchivaCloud P-12` | Estructura base del proyecto |
| `feat: add FastAPI app with CORS and P-12 validations` | Backend inicial con validaciones |
| `chore: update dependencies for Python 3.13 compatibility` | Compatibilidad Python 3.13 |
| `feat: add GET /healthz and POST /api/upload/presigned-url endpoints` | Endpoints Sprint 1 |
| `feat: add GET /api/files, DELETE and POST rename endpoints` | Endpoints Sprint 2 y 3 |
| `feat: add React frontend with upload, list, delete and rename` | Frontend completo |
| `fix: update dependencies to fix vulnerabilities - SEC-09 pip-audit clean` | Corrección vulnerabilidades |
| `docs: add security report, feature-extra and AI declaration` | Documentación de seguridad |

---

## 14. Screencast

📹 Enlace al screencast de pair programming (15 min):
> [Agregar enlace aquí]

---

## 15. Autores y licencia

| Integrante | Rol |
|---|---|
| Bayron Cerna | Backend + AWS |
| Jostin Saez | Frontend + Documentación |

**Licencia:** MIT — Proyecto académico ArchivaCloud SpA, INACAP 2026.

---

*ArchivaCloud P-12 · Bucket: `archivacloud-p12` · Región: `us-east-1` · Sprint 4*
