# ArchivaCloud P-12

**Pareja:** P-12

## Parametros unicos (Anexo B)
| Campo | Valor |
|---|---|
| Tipos permitidos | DOCX, ODT, RTF |
| Tamano maximo | 14 MB |
| Bucket | archivacloud-p12 |
| Region | us-east-1 |
| Feature extra | Renombrar archivo |

## Como correr el backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
