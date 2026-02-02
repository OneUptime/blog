# How to Handle File Uploads with FastAPI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Python, FastAPI, File Upload, Async, Storage

Description: A practical guide to handling file uploads in FastAPI, covering single and multiple files, validation, streaming, and cloud storage integration.

---

> File uploads are a common requirement for web applications. FastAPI makes this straightforward with built-in support for handling files through Python's async capabilities. This guide covers everything from basic uploads to production-ready implementations with S3 integration.

Whether you're building a document management system, an image gallery, or an API that accepts user-generated content, understanding file handling in FastAPI is essential.

---

## File vs UploadFile

FastAPI provides two classes for file handling. Here's when to use each:

| Feature | `File` | `UploadFile` |
|---------|--------|--------------|
| **Type** | `bytes` | SpooledTemporaryFile |
| **Memory** | Entire file in memory | Spooled to disk for large files |
| **Async** | No | Yes (async read/write/seek) |
| **Metadata** | None | filename, content_type, size |
| **Best For** | Small files (<1MB) | Large files, production use |

For most production applications, `UploadFile` is the better choice. It handles large files gracefully and provides useful metadata.

---

## Basic Single File Upload

Let's start with a simple file upload endpoint:

```python
# main.py
from fastapi import FastAPI, UploadFile, HTTPException
from pathlib import Path

app = FastAPI()

# Directory to store uploaded files
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.post("/upload")
async def upload_file(file: UploadFile):
    """
    Accept a single file upload and save it to disk.
    Returns the filename and size.
    """
    # Read the file content
    content = await file.read()

    # Generate a safe file path
    file_path = UPLOAD_DIR / file.filename

    # Write the file to disk
    with open(file_path, "wb") as f:
        f.write(content)

    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(content)
    }
```

---

## Multiple File Uploads

Handling multiple files is just as easy - use a list type hint:

```python
# multiple_files.py
from fastapi import FastAPI, UploadFile
from typing import List
from pathlib import Path

app = FastAPI()
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.post("/upload-multiple")
async def upload_multiple_files(files: List[UploadFile]):
    """
    Accept multiple files in a single request.
    Useful for batch uploads or galleries.
    """
    results = []

    for file in files:
        content = await file.read()
        file_path = UPLOAD_DIR / file.filename

        with open(file_path, "wb") as f:
            f.write(content)

        results.append({
            "filename": file.filename,
            "size": len(content)
        })

    return {"uploaded": results, "count": len(results)}
```

---

## File Validation

Production applications need validation. Here's a reusable validator:

```python
# validation.py
from fastapi import FastAPI, UploadFile, HTTPException
from typing import List, Optional

app = FastAPI()

# Configuration
ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "application/pdf"]
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

async def validate_file(
    file: UploadFile,
    allowed_types: List[str] = ALLOWED_TYPES,
    max_size: int = MAX_FILE_SIZE
) -> bytes:
    """
    Validate file type and size.
    Returns file content if valid, raises HTTPException otherwise.
    """
    # Check content type
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file.content_type} not allowed. "
                   f"Allowed types: {', '.join(allowed_types)}"
        )

    # Read and check size
    content = await file.read()

    if len(content) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {max_size // (1024*1024)} MB"
        )

    # Reset file position for potential re-read
    await file.seek(0)

    return content

@app.post("/upload-validated")
async def upload_validated(file: UploadFile):
    """Upload endpoint with validation"""
    # Validate the file
    content = await validate_file(
        file,
        allowed_types=["image/jpeg", "image/png"],
        max_size=5 * 1024 * 1024  # 5 MB for images
    )

    # Process the validated file
    return {
        "filename": file.filename,
        "size": len(content),
        "valid": True
    }
```

### Magic Number Validation

Content-Type headers can be spoofed. For extra security, check the file's magic numbers:

```python
# magic_validation.py
import magic  # pip install python-magic

# Magic number signatures for common file types
MAGIC_NUMBERS = {
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/gif": [b"GIF87a", b"GIF89a"],
    "application/pdf": [b"%PDF"],
}

async def validate_magic_number(file: UploadFile, expected_type: str) -> bool:
    """
    Verify file content matches expected type using magic numbers.
    More secure than relying on Content-Type header alone.
    """
    # Read first 8 bytes (enough for most signatures)
    header = await file.read(8)
    await file.seek(0)  # Reset position

    signatures = MAGIC_NUMBERS.get(expected_type, [])

    for sig in signatures:
        if header.startswith(sig):
            return True

    return False
```

---

## Streaming Large Files

For large files, reading the entire content into memory is inefficient. Use chunked streaming instead:

```python
# streaming.py
from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from pathlib import Path
import aiofiles

app = FastAPI()
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

CHUNK_SIZE = 1024 * 1024  # 1 MB chunks

@app.post("/upload-stream")
async def upload_large_file(file: UploadFile):
    """
    Stream large files to disk in chunks.
    Prevents memory issues with files of any size.
    """
    file_path = UPLOAD_DIR / file.filename
    total_size = 0

    # Use aiofiles for async file operations
    async with aiofiles.open(file_path, "wb") as out_file:
        while chunk := await file.read(CHUNK_SIZE):
            await out_file.write(chunk)
            total_size += len(chunk)

    return {
        "filename": file.filename,
        "size": total_size,
        "chunks_processed": (total_size // CHUNK_SIZE) + 1
    }

@app.get("/download/{filename}")
async def download_file(filename: str):
    """
    Stream a file back to the client in chunks.
    Works efficiently for files of any size.
    """
    file_path = UPLOAD_DIR / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    async def file_iterator():
        async with aiofiles.open(file_path, "rb") as f:
            while chunk := await f.read(CHUNK_SIZE):
                yield chunk

    return StreamingResponse(
        file_iterator(),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
```

---

## S3 Integration

Most production applications store files in cloud storage. Here's how to integrate with AWS S3:

```python
# s3_upload.py
from fastapi import FastAPI, UploadFile, HTTPException
import boto3
from botocore.exceptions import ClientError
import uuid
from typing import Optional

app = FastAPI()

# Initialize S3 client
s3_client = boto3.client(
    "s3",
    aws_access_key_id="YOUR_ACCESS_KEY",      # Use env variables in production
    aws_secret_access_key="YOUR_SECRET_KEY",
    region_name="us-east-1"
)

BUCKET_NAME = "your-bucket-name"

async def upload_to_s3(
    file: UploadFile,
    bucket: str = BUCKET_NAME,
    prefix: str = "uploads"
) -> dict:
    """
    Upload a file to S3 with a unique key.
    Returns the S3 key and public URL.
    """
    # Generate unique filename to avoid collisions
    extension = file.filename.split(".")[-1] if "." in file.filename else ""
    unique_name = f"{uuid.uuid4()}.{extension}" if extension else str(uuid.uuid4())
    s3_key = f"{prefix}/{unique_name}"

    try:
        # Read file content
        content = await file.read()

        # Upload to S3
        s3_client.put_object(
            Bucket=bucket,
            Key=s3_key,
            Body=content,
            ContentType=file.content_type
        )

        # Generate URL
        url = f"https://{bucket}.s3.amazonaws.com/{s3_key}"

        return {
            "key": s3_key,
            "url": url,
            "size": len(content)
        }

    except ClientError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload to S3: {str(e)}"
        )

@app.post("/upload-s3")
async def upload_to_cloud(file: UploadFile):
    """Upload file directly to S3"""
    result = await upload_to_s3(file, prefix="user-uploads")
    return {
        "message": "File uploaded successfully",
        **result
    }
```

### Presigned URLs for Direct Upload

For large files, let clients upload directly to S3:

```python
# presigned_upload.py
from fastapi import FastAPI, HTTPException
import boto3
from datetime import datetime
import uuid

app = FastAPI()

s3_client = boto3.client("s3")
BUCKET_NAME = "your-bucket-name"

@app.post("/generate-upload-url")
async def generate_presigned_url(
    filename: str,
    content_type: str
):
    """
    Generate a presigned URL for direct client-to-S3 upload.
    Bypasses your server for large files.
    """
    # Generate unique S3 key
    extension = filename.split(".")[-1] if "." in filename else ""
    s3_key = f"uploads/{uuid.uuid4()}.{extension}"

    try:
        # Generate presigned POST data
        presigned = s3_client.generate_presigned_post(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Fields={"Content-Type": content_type},
            Conditions=[
                {"Content-Type": content_type},
                ["content-length-range", 1, 100 * 1024 * 1024]  # 1 byte to 100 MB
            ],
            ExpiresIn=3600  # URL valid for 1 hour
        )

        return {
            "upload_url": presigned["url"],
            "fields": presigned["fields"],
            "s3_key": s3_key
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## Complete Production Example

Here's a production-ready upload service combining all the concepts:

```python
# upload_service.py
from fastapi import FastAPI, UploadFile, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from pathlib import Path
import aiofiles
import uuid
import hashlib

app = FastAPI()

# Configuration
class UploadConfig:
    UPLOAD_DIR = Path("uploads")
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
    ALLOWED_TYPES = {
        "image/jpeg", "image/png", "image/gif",
        "application/pdf", "text/plain"
    }
    CHUNK_SIZE = 1024 * 1024  # 1 MB

config = UploadConfig()
config.UPLOAD_DIR.mkdir(exist_ok=True)

class UploadResult(BaseModel):
    id: str
    filename: str
    size: int
    content_type: str
    checksum: str

async def process_upload(file: UploadFile) -> UploadResult:
    """
    Process and store an uploaded file with full validation.
    """
    # Validate content type
    if file.content_type not in config.ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed: {file.content_type}"
        )

    # Generate unique ID and path
    file_id = str(uuid.uuid4())
    extension = Path(file.filename).suffix
    storage_path = config.UPLOAD_DIR / f"{file_id}{extension}"

    # Stream file and calculate checksum
    hasher = hashlib.sha256()
    total_size = 0

    async with aiofiles.open(storage_path, "wb") as out:
        while chunk := await file.read(config.CHUNK_SIZE):
            # Check size limit
            total_size += len(chunk)
            if total_size > config.MAX_FILE_SIZE:
                # Clean up partial file
                storage_path.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=400,
                    detail=f"File exceeds maximum size of {config.MAX_FILE_SIZE // (1024*1024)} MB"
                )

            # Write chunk and update hash
            await out.write(chunk)
            hasher.update(chunk)

    return UploadResult(
        id=file_id,
        filename=file.filename,
        size=total_size,
        content_type=file.content_type,
        checksum=hasher.hexdigest()
    )

@app.post("/api/upload", response_model=UploadResult)
async def upload_endpoint(file: UploadFile):
    """Production-ready single file upload"""
    return await process_upload(file)

@app.post("/api/upload-batch", response_model=List[UploadResult])
async def batch_upload_endpoint(files: List[UploadFile]):
    """Upload multiple files in a single request"""
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files per request")

    results = []
    for file in files:
        result = await process_upload(file)
        results.append(result)

    return results
```

---

## Best Practices

1. **Always validate** - Check file types, sizes, and ideally magic numbers
2. **Use streaming** for files over a few MB to avoid memory issues
3. **Generate unique filenames** to prevent overwrites and path traversal attacks
4. **Store metadata** separately (database) from file content (filesystem/S3)
5. **Consider presigned URLs** for large files to bypass your server
6. **Set appropriate timeouts** for upload endpoints

---

## Conclusion

FastAPI makes file uploads straightforward with `UploadFile`. For production:

- Use `UploadFile` over `File` for better memory handling
- Stream large files in chunks
- Validate content types and sizes
- Consider cloud storage (S3) for scalability
- Use presigned URLs to offload large uploads

With these patterns, you can handle file uploads of any size efficiently.

---

*Need to monitor your file upload service? [OneUptime](https://oneuptime.com) provides API monitoring with latency tracking and alerting for slow uploads.*

**Related Reading:**
- [How to Implement Rate Limiting in FastAPI](https://oneuptime.com/blog/post/2025-01-06-fastapi-rate-limiting/view)
