import os, re
import boto3
from botocore.exceptions import ClientError
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="ArchivaCloud P-12")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)

ALLOWED_EXTENSIONS = {"docx", "odt", "rtf"}
MAX_SIZE_BYTES = 14 * 1024 * 1024
BUCKET = os.getenv("S3_BUCKET_NAME", "archivacloud-p12")
REGION = os.getenv("AWS_REGION", "us-east-1")

s3 = boto3.client(
    "s3",
    region_name=REGION,
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    aws_session_token=os.getenv("AWS_SESSION_TOKEN"),
)

class PresignedRequest(BaseModel):
    fileName: str
    fileType: str
    fileSize: int

    @field_validator("fileName")
    @classmethod
    def validate_name(cls, v):
        if not re.match(r'^[\w\-. ]+$', v):
            raise ValueError("Nombre con caracteres no permitidos")
        ext = v.rsplit(".", 1)[-1].lower() if "." in v else ""
        if ext not in ALLOWED_EXTENSIONS:
            raise ValueError("Solo se permiten: DOCX, ODT, RTF")
        return v

    @field_validator("fileSize")
    @classmethod
    def validate_size(cls, v):
        if v > MAX_SIZE_BYTES:
            raise ValueError("Archivo supera el limite de 14 MB")
        return v

@app.get("/healthz")
def health():
    return {"status": "ok", "bucket": BUCKET, "region": REGION}

@app.post("/api/upload/presigned-url")
def presigned_url(req: PresignedRequest):
    key = f"uploads/{req.fileName}"
    try:
        url = s3.generate_presigned_url(
            "put_object",
            Params={"Bucket": BUCKET, "Key": key,
                    "ContentType": req.fileType},
            ExpiresIn=300,
        )
    except ClientError:
        raise HTTPException(500, detail="Error al generar URL de subida")
    return {"presignedUrl": url, "key": key}
