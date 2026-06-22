# Anexo A — Declaración detallada de uso de IA

**Proyecto:** ArchivaCloud P-12
**Pareja:** P-12
**Repositorio:** https://github.com/Jsaez-a113/Certamen3-Aws

---

## Registro de uso de IA

| # | Fecha | Herramienta | Prompt exacto usado | Artefacto generado | Qué se modificó o validó manualmente |
|---|---|---|---|---|---|
| 1 | Jun 2026 | Claude (claude.ai) | "analiza este documento, necesito hacer este proyecto en aws específicamente todo lo relacionado con el primer sprint tomando en cuenta que en el Anexo B. Parámetros únicos por pareja solo tengo que realizar el siguiente: P-12 DOCX, ODT, RTF 14 archivacloud-p12 us-east-2 Permitir renombrar un archivo del bucket (copia con nuevo nombre y elimina el anterior)." | Análisis del enunciado y checklist del Sprint 1 | Se contrastó manualmente contra el documento original. Se verificó que los parámetros P-12 (extensiones, tamaño, nombre de bucket) coincidieran exactamente con el Anexo B. |
| 2 | Jun 2026 | Claude (claude.ai) | "dame el paso a paso de como debo realizar el primer sprint" | Guía interactiva paso a paso del Sprint 1 (bucket S3, IAM, FastAPI, repo Git) | Cada paso fue ejecutado en la consola AWS real y en CloudShell. Se verificó con `aws s3api get-bucket-location`, `get-public-access-block`, `get-bucket-encryption` y `get-bucket-cors` que el resultado en AWS fuera correcto. |
| 3 | Jun 2026 | Claude (claude.ai) | "quiero hacer la fase 1 con cloudshell" | Comandos AWS CLI para crear bucket, Block Public Access, SSE-S3 y CORS desde CloudShell | El primer comando falló con AccessDenied (error real de Vocareum). Se adaptó la solución: bucket creado desde la consola web. Los comandos de verificación sí funcionaron y confirmaron la configuración correcta. |
| 4 | Jun 2026 | Claude (claude.ai) | "En 'Set permissions': seleccionar Attach policies directly → Create inline policy que opcion debo seleccionar" | Explicación del flujo IAM en la consola AWS | Se intentó en la consola real y falló con `iam:CreateUser` (restricción de Vocareum). Se documentó la limitación y se decidió usar el LabRole con credenciales temporales de AWS Details. |
| 5 | Jun 2026 | Claude (claude.ai) | "desde cloudshell" (para hacer la Fase 2 — repositorio Git) | Comandos bash para crear estructura de carpetas, .gitignore, .env.example, requirements.txt, README.md y primer commit | Se ejecutó cada comando en CloudShell. Se verificó con `git log --oneline` que los commits quedaran registrados. El push a GitHub falló inicialmente (token incorrecto) y se resolvió manualmente. |
| 6 | Jun 2026 | Claude (claude.ai) | "respondio bien ahora continuenmos" (tras instalar dependencias Python) y solicitudes de código del backend y frontend | Código de `backend/main.py` (FastAPI con endpoints, validaciones Pydantic, CORS, boto3) y `frontend/src/App.jsx` (React con upload, listado, eliminar y renombrar) | Se ejecutó `uvicorn main:app --reload --port 8000` y se probaron los 3 tests con `curl`: healthz (200 OK), DOCX válido (presigned URL generada), JPG inválido (error 422). El frontend se probó manualmente en el navegador subiendo, renombrando y eliminando archivos reales. |
| 7 | Jun 2026 | Claude (claude.ai) | "dame un prompt para claude opus 4.6 para mejorar el frontend y optimizar" | Prompt estructurado para usar con Claude Opus 4.6 para rediseñar el frontend | El prompt se usó con Claude Opus 4.6. El código resultante (App.jsx con drag&drop, toasts, skeleton loading, barra de progreso, retry automático con AbortController) fue leído línea por línea por el equipo y probado manualmente antes de integrarlo. Se dividió en 14 commits separados para el historial Git. |
| 8 | Jun 2026 | Claude (claude.ai) | "ahora vuelve a analizar el documento y dime si cumple realmente con los requerimientos y objetivos" | Lista comparativa de lo cumplido vs lo faltante según el enunciado | Se contrastó cada punto de la lista contra el repositorio real en GitHub. Se identificaron artefactos faltantes (feature-extra.md, declaracion-ia.md, tag v1.0.0) y se procedió a crearlos. |
| 9 | Jun 2026 | Claude (claude.ai) | "explícame como es el reporte de seguridad, cual y como debe de ser su contenido" | Documento `docs/reporte-seguridad.md` | Claude explicó qué secciones y controles debe contener un reporte de seguridad (estructura SEC-01 a SEC-10, propósito de cada control, nivel de riesgo y evidencia requerida). Con esa explicación como guía, se redactó manualmente el documento verificando que cada control tuviera respaldo real en el proyecto: regex en main.py (SEC-03), resultado de pip-audit (SEC-09), configuración del bucket (SEC-06 y SEC-08). El documento final se subió al repositorio con commit. |
| 10 | Jun 2026 | Claude (claude.ai) | "te entrego el reporte de seguridad, declaracion de ia y feature extra. ayudame a redactarlo mejor en un archivo .md" | Versiones mejoradas de `docs/reporte-seguridad.md`, `docs/declaracion-ia.md` y `docs/feature-extra.md` | Se revisó que el contenido correspondiera a la implementación real. La declaración de IA se ajustó para incluir prompts textuales según el formato del Anexo A. El reporte de seguridad se verificó contra los controles implementados en el código. |

---

## Nota de transparencia

El enunciado indica como uso **prohibido**: *"Pedir a la IA que redacte la bitácora o el reporte de seguridad."*

El **reporte de seguridad** (`docs/reporte-seguridad.md`) fue redactado
con apoyo de Claude (fila 9 y 10 de esta tabla). El equipo declara este
uso de forma transparente. El contenido fue verificado contra la
implementación real, pero la redacción fue asistida por IA.

Los siguientes artefactos **NO fueron generados con IA**:
- Diagrama de arquitectura: dibujado a mano por el equipo
- Pruebas funcionales: ejecutadas manualmente por el equipo

---

## Declaración firmada

Ambos integrantes de la pareja P-12 confirmamos que la información
anterior es completa y verdadera, y que entendemos el funcionamiento
de cada componente del sistema y podemos explicarlo en la defensa oral.

Firmas:

__________________________  &nbsp;&nbsp;&nbsp;&nbsp;  __________________________

[Jostin Saez] &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [Bayron Cerna]

**Fecha:** 23/ 06/ 2026

---

*ArchivaCloud P-12 · Anexo A · Declaración detallada de uso de IA generativa*
