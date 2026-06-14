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

## 13. Historial de commits (25 commits)
 
Ver historial completo en: https://github.com/Jsaez-a113/Certamen3-Aws/commits/main  
Tag de versión final: https://github.com/Jsaez-a113/Certamen3-Aws/releases/tag/v1.0.0
 
| # | Commit | Descripción | Sprint |
|---|---|---|---|
| 1 | [feat: initial project structure for ArchivaCloud P-12](https://github.com/Jsaez-a113/Certamen3-Aws/commit/4faca22ffd26531aec423655e0f7354cf575a9d7) | Estructura base del proyecto | S1 |
| 2 | [feat: add FastAPI app with CORS and P-12 validations](https://github.com/Jsaez-a113/Certamen3-Aws/commit/b79ad859fa50cca1c59afd02054e78faa2330b10) | Backend con validaciones SEC-02/03/04 | S1 |
| 3 | [chore: update dependencies for Python 3.13 compatibility](https://github.com/Jsaez-a113/Certamen3-Aws/commit/5e7f8bc8fdba1ef3f04d2bf3b6b181aeecdca788) | Compatibilidad Python 3.13 | S1 |
| 4 | [feat: add GET /api/files, DELETE and POST rename endpoints](https://github.com/Jsaez-a113/Certamen3-Aws/commit/61122c03d5e3cc68296fa3ccf45e7ee074ea373c) | Endpoints listar, eliminar y renombrar | S2 |
| 5 | [feat: add React frontend with upload, list, delete and rename](https://github.com/Jsaez-a113/Certamen3-Aws/commit/a12f0b788e7d228d7f6ba0f0736b658119f85791) | Frontend base React + Vite | S2 |
| 6 | [feat: add React frontend with upload, list, delete and rename](https://github.com/Jsaez-a113/Certamen3-Aws/commit/fc0ba8aaf0bcf6cb330421a7f358a77dd8c18abe) | Frontend con todas las funcionalidades | S2 |
| 7 | [fix: update dependencies to fix vulnerabilities - SEC-09 pip-audit clean](https://github.com/Jsaez-a113/Certamen3-Aws/commit/727ef2264061e1e307d23627b082620511c9cf04) | Corrección vulnerabilidades SEC-09 | S3 |
| 8 | [Se agrego carpeta docs con diagrama de arquitectura](https://github.com/Jsaez-a113/Certamen3-Aws/commit/4b2e315723c1649b295e4576be7061e3ce4f2188) | Diagrama manuscrito de arquitectura | S3 |
| 9 | [Se agrego reporte de seguridad](https://github.com/Jsaez-a113/Certamen3-Aws/commit/d23c0cda6473a9d7e6afb23ca0ec4a73bb21594c) | Reporte SEC-01 a SEC-10 | S3 |
| 10 | [Actualización de README con más detalle](https://github.com/Jsaez-a113/Certamen3-Aws/commit/49505392d9fceeff1fcd42f4139fae6140b29f62) | README completo según Anexo D | S3 |
| 11 | [style: reemplazar estilos globales con reset CSS y tema oscuro base](https://github.com/Jsaez-a113/Certamen3-Aws/commit/ec9445f7e7b29ea73d4bb56fe4ef7d01344cf276) | Reset CSS y tema oscuro global | S4 |
| 12 | [refactor: extraer constantes de configuración y validación SEC-03/SEC-04](https://github.com/Jsaez-a113/Certamen3-Aws/commit/60a305b5e8b070e14e5febf06441eca7156d717d) | Constantes de validación extraídas | S4 |
| 13 | [style: agregar paleta de colores para tema oscuro profesional](https://github.com/Jsaez-a113/Certamen3-Aws/commit/00005fb9b5333a1358dedec16f2d64a8fa432b53) | Paleta de colores profesional | S4 |
| 14 | [feat: inyectar animaciones CSS keyframes al montar la aplicación](https://github.com/Jsaez-a113/Certamen3-Aws/commit/c9d29a2e7a56f5b374fad9f11fb9a7d2779d69d4) | Animaciones CSS (slideIn, fadeIn, shimmer) | S4 |
| 15 | [feat: agregar hook useDebounce para optimizar input de renombrado](https://github.com/Jsaez-a113/Certamen3-Aws/commit/f4500daeedec64a9e825939f304080a8aee8d515) | Hook useDebounce para optimización | S4 |
| 16 | [feat: agregar hook useToast para sistema de notificaciones](https://github.com/Jsaez-a113/Certamen3-Aws/commit/1bcae777863e8e186c7e9d9ca6f622296a6c0e22) | Sistema de notificaciones toast | S4 |
| 17 | [feat: agregar utilidades — formatSize, sanitizeFileName, getErrorMessage](https://github.com/Jsaez-a113/Certamen3-Aws/commit/7d3552445a49c81d2d66f65e767ea1a8a7fd36d7) | Funciones utilitarias del frontend | S4 |
| 18 | [feat: agregar componente FileIcon con SVG por extensión](https://github.com/Jsaez-a113/Certamen3-Aws/commit/489e283a9fe9bb5a3e0537e0a0d360655099110a) | Íconos SVG por tipo de archivo | S4 |
| 19 | [feat: agregar componente ProgressBar con barra animada](https://github.com/Jsaez-a113/Certamen3-Aws/commit/a656943c7af61b1eb2491382193d67a7c93c33ca) | Barra de progreso real con animación | S4 |
| 20 | [feat: agregar SkeletonRow y ConfirmModal para UX de carga y eliminación](https://github.com/Jsaez-a113/Certamen3-Aws/commit/424316dbe875724c37782fa8e0301bc90f3d6d1a) | Skeleton loading y modal de confirmación | S4 |
| 21 | [feat: agregar ToastContainer y SortHeader para notificaciones y ordenamiento](https://github.com/Jsaez-a113/Certamen3-Aws/commit/e1e429c8c536b76066617a3d85629d2f96a6d619) | Contenedor toast y headers ordenables | S4 |
| 22 | [feat: implementar estados, efectos y subida con progreso, retry y AbortController](https://github.com/Jsaez-a113/Certamen3-Aws/commit/a36d7929093a5c6201ad6a966499369d39a470ed) | Upload con retry automático y cancelación | S4 |
| 23 | [feat: implementar drag-drop, eliminar con modal y renombrar con extensión bloqueada](https://github.com/Jsaez-a113/Certamen3-Aws/commit/228c6347284655bd6f6c81fa21e9357935a3af55) | Drag & drop y UX mejorada | S4 |
| 24 | [feat: rediseñar interfaz completa con header, upload zone, tabla y footer](https://github.com/Jsaez-a113/Certamen3-Aws/commit/24cb39bed2ba170582cf69ef77935ccd6695fd35) | Interfaz final completa y responsiva | S4 |
| 25 | docs: update README with complete commit history and v1.0.0 tag | README final con historial completo | S4 |
 
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
