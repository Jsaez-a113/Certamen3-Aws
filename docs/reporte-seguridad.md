# Reporte de Seguridad — ArchivaCloud P-12

**Pareja:** P-12  
**Bucket:** archivacloud-p12  
**Región:** us-east-1  
**Fecha:** Junio 2026  

---

## Resumen ejecutivo

Este reporte documenta los 10 controles mínimos de seguridad (SEC-01 a SEC-10)
aplicados en el desarrollo del portal ArchivaCloud P-12. La aplicación permite
subir, listar, eliminar y renombrar archivos en Amazon S3, restringido a los
formatos DOCX, ODT y RTF con un tamaño máximo de 14 MB.

---

## SEC-01 — Secretos fuera del repositorio

**Qué se hizo:**  
Las credenciales AWS (Access Key ID, Secret Access Key y Session Token) se
almacenan exclusivamente en el archivo `backend/.env`, el cual está declarado
en `.gitignore` y nunca se sube al repositorio Git.

El repositorio solo contiene `backend/.env.example` con valores de ejemplo
(placeholders), para que cualquier desarrollador sepa qué variables configurar
sin exponer credenciales reales.

**Evidencia:**
```
# .gitignore
.env
*.env
```

**Resultado:** Ninguna credencial real ha sido comprometida en el historial
de commits del repositorio.

---

## SEC-02 — CORS restrictivo

**Qué se hizo:**  
El middleware CORS de FastAPI está configurado para aceptar solicitudes
únicamente desde el origen del frontend (`http://localhost:5173`).
No se usa el comodín `*` que permitiría cualquier origen.

**Código implementado (`backend/main.py`):**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)
```

**Resultado:** Solicitudes desde dominios no autorizados son bloqueadas
automáticamente por el navegador antes de llegar al backend.

---

## SEC-03 — Validación y sanitización de nombre de archivo

**Qué se hizo:**  
Antes de generar la presigned URL, el backend valida el nombre del archivo
usando dos controles:

1. **Expresión regular:** Solo permite letras, números, guiones, puntos y
   espacios. Rechaza caracteres peligrosos como `../`, `<`, `>`, `;`, etc.
2. **Validación de extensión:** Solo acepta `.docx`, `.odt` y `.rtf`
   (parámetros P-12). Cualquier otro tipo es rechazado con error 422.

**Código implementado (`backend/main.py`):**
```python
@field_validator("fileName")
@classmethod
def validate_name(cls, v):
    if not re.match(r'^[\w\-. ]+$', v):
        raise ValueError("Nombre con caracteres no permitidos")
    ext = v.rsplit(".", 1)[-1].lower() if "." in v else ""
    if ext not in {"docx", "odt", "rtf"}:
        raise ValueError("Solo se permiten: DOCX, ODT, RTF")
    return v
```

El frontend también sanitiza el nombre antes de enviarlo, reemplazando
caracteres no permitidos por guiones bajos.

**Resultado:** Ataques de path traversal y inyección de nombres maliciosos
son bloqueados en backend y frontend.

---

## SEC-04 — Validación de tamaño máximo en el backend

**Qué se hizo:**  
El tamaño máximo permitido es **14 MB** (parámetro P-12). La validación
se realiza en el backend con Pydantic, lo que impide que un cliente malicioso
eluda la restricción del frontend.

**Código implementado (`backend/main.py`):**
```python
MAX_SIZE_BYTES = 14 * 1024 * 1024  # 14 MB

@field_validator("fileSize")
@classmethod
def validate_size(cls, v):
    if v > MAX_SIZE_BYTES:
        raise ValueError("Archivo supera el limite de 14 MB")
    return v
```

El frontend también valida el tamaño antes de hacer la solicitud al backend,
proporcionando retroalimentación inmediata al usuario.

**Resultado:** Archivos de más de 14 MB son rechazados tanto en el frontend
(validación inmediata) como en el backend (validación definitiva).

---

## SEC-05 — Mínimo privilegio IAM

**Qué se hizo:**

**Diseño para producción:**  
En un entorno productivo real se crearía un usuario IAM dedicado con una
política que permite únicamente las 4 acciones estrictamente necesarias,
restringidas al bucket `archivacloud-p12`:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
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
  }]
}
```

Esta política deniega implícitamente todo lo demás: no puede crear buckets,
acceder a otros buckets, gestionar usuarios IAM ni ningún otro servicio AWS.

**Entorno de desarrollo (AWS Academy):**  
El entorno AWS Academy Learner Lab utiliza el rol `LabRole` de Vocareum,
que bloquea `iam:CreateUser` (devuelve `AccessDenied`). Por esta razón
se utilizan las credenciales temporales del `LabRole`, que:
- Expiran automáticamente al finalizar cada sesión del lab
- Están restringidas al contexto del laboratorio
- No son credenciales permanentes ni reutilizables

**Resultado:** El principio de mínimo privilegio está documentado y diseñado.
En producción se implementaría el usuario IAM dedicado con la política
descrita.

---

## SEC-06 — Block Public Access en S3

**Qué se hizo:**  
El bucket `archivacloud-p12` tiene activadas las 4 opciones de bloqueo
de acceso público:

| Opción | Estado |
|---|---|
| BlockPublicAcls | ✅ Activado |
| IgnorePublicAcls | ✅ Activado |
| BlockPublicPolicy | ✅ Activado |
| RestrictPublicBuckets | ✅ Activado |

**Verificación en AWS CLI:**
```bash
aws s3api get-public-access-block --bucket archivacloud-p12
# Resultado:
# {
#   "PublicAccessBlockConfiguration": {
#     "BlockPublicAcls": true,
#     "IgnorePublicAcls": true,
#     "BlockPublicPolicy": true,
#     "RestrictPublicBuckets": true
#   }
# }
```

**Resultado:** Los archivos almacenados en S3 nunca son accesibles
públicamente. Solo se accede mediante presigned URLs temporales (5 minutos).

---

## SEC-07 — Sin stack traces expuestos al cliente

**Qué se hizo:**  
Todos los bloques `try/except` del backend capturan las excepciones de boto3
(`ClientError`) y retornan únicamente un mensaje genérico al cliente,
sin exponer detalles internos del servidor, rutas de archivos, configuración
de AWS ni trazas de error.

**Código implementado (`backend/main.py`):**
```python
except ClientError:
    # SEC-07: sin stack traces al cliente
    raise HTTPException(500, detail="Error al generar URL de subida")
```

El mismo patrón se aplica en los endpoints de listar, eliminar y renombrar.

**Resultado:** Un atacante no puede obtener información sobre la
infraestructura interna del servidor a través de mensajes de error.

---

## SEC-08 — Encriptación en reposo (SSE-S3)

**Qué se hizo:**  
El bucket tiene activada la encriptación SSE-S3 (Server-Side Encryption
con claves gestionadas por Amazon S3) usando el algoritmo AES-256.
Todos los objetos se encriptan automáticamente al almacenarse.

**Verificación en AWS CLI:**
```bash
aws s3api get-bucket-encryption --bucket archivacloud-p12
# Resultado:
# {
#   "ServerSideEncryptionConfiguration": {
#     "Rules": [{
#       "ApplyServerSideEncryptionByDefault": {
#         "SSEAlgorithm": "AES256"
#       },
#       "BucketKeyEnabled": true
#     }]
#   }
# }
```

**Resultado:** Todos los documentos almacenados (contratos, facturas, etc.)
están protegidos en reposo mediante cifrado AES-256 sin costo adicional.

---

## SEC-09 — Auditoría de dependencias

**Qué se hizo:**  
Se ejecutaron herramientas de auditoría en backend y frontend para detectar
y corregir vulnerabilidades conocidas en las dependencias.

**Backend — pip-audit:**
```bash
pip install pip-audit
pip-audit
```

Resultado inicial: 10 vulnerabilidades en `pip`, `python-dotenv` y `starlette`.  
**Acción tomada:** Se actualizaron los paquetes vulnerables a versiones corregidas.

Resultado final:
```
No known vulnerabilities found
```

**Frontend — npm audit:**
```bash
npm audit
```

Resultado:
```
found 0 vulnerabilities
```

**Resultado:** Todas las vulnerabilidades conocidas fueron corregidas antes
de la entrega final. El proyecto queda con 0 vulnerabilidades en ambas capas.

---

## SEC-10 — HTTPS en producción

**Qué se hizo:**  
En desarrollo local se usa HTTP (`http://127.0.0.1:8000`) por simplicidad.
Para un despliegue en producción real se implementaría HTTPS mediante alguna
de estas opciones:

- **Opción A:** Certificado SSL/TLS en el servidor del backend usando
  Let's Encrypt (gratuito y renovación automática).
- **Opción B:** CloudFront como proxy inverso y CDN frente al bucket S3,
  con certificado gestionado por AWS Certificate Manager.

**Nota importante:** Las presigned URLs generadas por boto3 ya utilizan
HTTPS por defecto al comunicarse con S3, por lo que la subida de archivos
está cifrada en tránsito independientemente del protocolo del backend:

```
https://archivacloud-p12.s3.amazonaws.com/uploads/archivo.docx?...
```

**Resultado:** En el entorno de desarrollo local se usa HTTP. En producción
se aplicaría HTTPS completo tanto en el backend como en el frontend,
garantizando que ningún dato viaje en texto plano.

---

## Resumen de controles

| Control | Descripción | Estado |
|---|---|---|
| SEC-01 | Secretos fuera del repositorio | ✅ Implementado |
| SEC-02 | CORS restrictivo | ✅ Implementado |
| SEC-03 | Validación y sanitización de nombres | ✅ Implementado |
| SEC-04 | Validación de tamaño en backend | ✅ Implementado |
| SEC-05 | Mínimo privilegio IAM | ✅ Documentado |
| SEC-06 | Block Public Access en S3 | ✅ Implementado |
| SEC-07 | Sin stack traces al cliente | ✅ Implementado |
| SEC-08 | Encriptación en reposo SSE-S3 | ✅ Implementado |
| SEC-09 | Auditoría de dependencias sin vulnerabilidades | ✅ Implementado |
| SEC-10 | HTTPS en producción | ✅ Documentado |

---

*ArchivaCloud P-12 · Reporte de Seguridad · Junio 2026*
