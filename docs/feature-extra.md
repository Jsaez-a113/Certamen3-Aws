# Feature Extra P-12 — Renombrar archivo

## ¿Qué hace?

Permite renombrar un archivo existente en el bucket S3 `archivacloud-p12`.
Esta es la funcionalidad adicional asignada específicamente a la pareja P-12
según el Anexo B del enunciado.

---

## ¿Por qué no es trivial?

Amazon S3 **no tiene una operación nativa de renombrado**. A diferencia de
un sistema de archivos tradicional, en S3 cada objeto se identifica por su
`key` (ruta + nombre) y esa key es inmutable una vez creado el objeto.

Para simular un renombrado, la única forma es:

1. **Copiar** el objeto original hacia una nueva key (nuevo nombre)
2. **Eliminar** el objeto original

---

## Endpoint

```
POST /api/files/{file_name}/rename
```

**Body:**
```json
{
  "newName": "informe-final.docx"
}
```

**Respuesta exitosa:**
```json
{
  "message": "Archivo renombrado correctamente",
  "newKey": "uploads/informe-final.docx"
}
```

---

## Implementación en el backend

```python
@app.post("/api/files/{file_name}/rename")
def rename_file(file_name: str, req: RenameRequest):
    old_key = f"uploads/{file_name}"
    new_key = f"uploads/{req.newName}"
    try:
        # Paso 1: copiar el objeto con el nuevo nombre
        s3.copy_object(
            Bucket=BUCKET,
            CopySource={"Bucket": BUCKET, "Key": old_key},
            Key=new_key,
        )
        # Paso 2: eliminar el objeto original
        s3.delete_object(Bucket=BUCKET, Key=old_key)
        return {"message": "Archivo renombrado correctamente", "newKey": new_key}
    except ClientError:
        raise HTTPException(500, detail="Error al renombrar archivo")
```

---

## Validaciones aplicadas (SEC-03)

El nuevo nombre pasa por las mismas validaciones que un archivo recién subido:

- Solo caracteres permitidos: letras, números, guiones, puntos y espacios
- Solo extensiones DOCX, ODT o RTF (parámetros P-12)
- Si la validación falla, se retorna error 422 sin ejecutar ninguna operación en S3

```python
class RenameRequest(BaseModel):
    newName: str

    @field_validator("newName")
    @classmethod
    def validate_new_name(cls, v):
        if not re.match(r'^[\w\-. ]+$', v):
            raise ValueError("Nombre con caracteres no permitidos")
        ext = v.rsplit(".", 1)[-1].lower() if "." in v else ""
        if ext not in {"docx", "odt", "rtf"}:
            raise ValueError("Solo se permiten: DOCX, ODT, RTF")
        return v
```

---

## Consistencia ante fallos

Se eligió el orden **copiar primero, eliminar después** de forma intencional:

- Si la copia (`copy_object`) falla, el archivo original **permanece intacto**
  y el usuario no pierde su documento.
- Solo se elimina el original **después** de confirmar que la copia fue exitosa.
- Esto evita el peor escenario posible: perder el archivo sin haber creado
  la copia con el nuevo nombre.

---

## Implementación en el frontend

Cada fila de la tabla de archivos tiene un botón **"Renombrar"** que:

1. Muestra un campo de texto inline con el nombre actual precargado
2. El usuario edita el nombre base (la extensión se mantiene)
3. Al confirmar, se hace `POST` al endpoint de rename
4. La lista de archivos se refresca automáticamente (`GET /api/files`)
5. Se muestra una notificación de éxito o error

El input de renombrar usa un hook `useDebounce` para evitar llamadas
innecesarias mientras el usuario escribe.

---

## Flujo completo

```
Usuario hace clic en "Renombrar"
         │
         ▼
Frontend muestra input inline con nombre actual
         │
         ▼
Usuario escribe nuevo nombre y confirma
         │
         ▼
POST /api/files/{nombre_actual}/rename
         │
         ▼
Backend valida el nuevo nombre (SEC-03)
         │
         ▼
S3: copy_object(old_key → new_key)
         │
         ▼
S3: delete_object(old_key)
         │
         ▼
Respuesta 200 OK
         │
         ▼
Frontend refresca la lista y muestra notificación
```

---

*ArchivaCloud P-12 · Feature Extra · Renombrar archivo*
