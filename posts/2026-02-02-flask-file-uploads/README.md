# How to Handle File Uploads in Flask

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Flask, File Upload, Web Development, Security

Description: A practical guide to handling file uploads in Flask, covering secure validation, storage strategies, and best practices for production applications.

---

> File uploads are one of those features that seem simple until you actually build them. There's a lot that can go wrong - from malicious files to memory issues with large uploads. This guide walks through building a secure and reliable file upload system in Flask.

Whether you're building a profile picture uploader or a document management system, the fundamentals are the same. Let's start with the basics and work our way up to production-ready patterns.

---

## Basic File Upload

The simplest file upload in Flask uses the `request.files` object. Here's a minimal example that accepts a file and saves it to disk.

```python
# basic_upload.py
# Minimal Flask file upload example
from flask import Flask, request, jsonify
import os

app = Flask(__name__)

# Configure the upload folder - make sure this directory exists
UPLOAD_FOLDER = '/tmp/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/upload', methods=['POST'])
def upload_file():
    """Handle basic file upload"""
    # Check if the request contains a file
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']

    # Check if user actually selected a file
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    # Save the file to the upload folder
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(filepath)

    return jsonify({
        'message': 'File uploaded successfully',
        'filename': file.filename
    }), 201

if __name__ == '__main__':
    # Create upload folder if it doesn't exist
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    app.run(debug=True)
```

This works, but it has several security issues. The filename comes directly from the user, which opens the door to path traversal attacks. Let's fix that.

---

## Secure File Upload with Validation

A production-ready file upload needs to validate the file type, sanitize the filename, and limit the file size. This example adds all three protections.

```python
# secure_upload.py
# Secure Flask file upload with validation
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import os
import uuid

app = Flask(__name__)

# Configuration
UPLOAD_FOLDER = '/var/uploads'
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max file size
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH  # Flask enforces this limit

def allowed_file(filename):
    """Check if file extension is in the allowed list"""
    # Split on the last dot and check the extension
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_unique_filename(original_filename):
    """Generate a unique filename while preserving the extension"""
    # Extract extension from original filename
    ext = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
    # Generate a UUID-based filename to avoid collisions
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    return unique_name

@app.route('/upload', methods=['POST'])
def upload_file():
    """Handle secure file upload with validation"""
    # Validate file presence
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    # Validate file extension
    if not allowed_file(file.filename):
        return jsonify({
            'error': 'File type not allowed',
            'allowed_types': list(ALLOWED_EXTENSIONS)
        }), 400

    # Sanitize the filename using Werkzeug's secure_filename
    # This removes path separators and dangerous characters
    safe_filename = secure_filename(file.filename)

    # Generate a unique filename to avoid overwrites
    unique_filename = generate_unique_filename(safe_filename)

    # Build the full filepath
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)

    # Save the file
    file.save(filepath)

    return jsonify({
        'message': 'File uploaded successfully',
        'filename': unique_filename,
        'original_filename': safe_filename
    }), 201

@app.errorhandler(413)
def file_too_large(error):
    """Handle files exceeding MAX_CONTENT_LENGTH"""
    return jsonify({
        'error': 'File too large',
        'max_size_mb': MAX_CONTENT_LENGTH / (1024 * 1024)
    }), 413

if __name__ == '__main__':
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    app.run(debug=True)
```

---

## File Upload Flow

Here's how the upload process works from client to storage:

```mermaid
flowchart TD
    A[Client Request] --> B{File Present?}
    B -->|No| C[Return 400 Error]
    B -->|Yes| D{Extension Allowed?}
    D -->|No| E[Return 400 Error]
    D -->|Yes| F{Size Within Limit?}
    F -->|No| G[Return 413 Error]
    F -->|Yes| H[Sanitize Filename]
    H --> I[Generate Unique Name]
    I --> J[Validate MIME Type]
    J --> K{MIME Valid?}
    K -->|No| L[Return 400 Error]
    K -->|Yes| M[Save to Storage]
    M --> N[Return 201 Success]
```

---

## Validating File Content (Not Just Extension)

Checking the file extension isn't enough - attackers can rename a PHP script to .jpg. You need to verify the actual file content using MIME type detection.

```python
# mime_validation.py
# Validate file content using magic bytes
import magic
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import os

app = Flask(__name__)

# Map extensions to their expected MIME types
ALLOWED_MIMES = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'application/pdf': ['pdf'],
    'application/msword': ['doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx']
}

def validate_file_content(file_storage):
    """
    Validate that the file content matches its extension.
    Uses python-magic to detect the actual MIME type from file bytes.
    """
    # Read the first 2048 bytes to detect MIME type
    # This is enough for magic number detection
    file_header = file_storage.read(2048)
    file_storage.seek(0)  # Reset file pointer for later use

    # Detect MIME type from file content
    mime = magic.Magic(mime=True)
    detected_mime = mime.from_buffer(file_header)

    # Get the claimed extension
    if '.' not in file_storage.filename:
        return False, 'File must have an extension'

    claimed_ext = file_storage.filename.rsplit('.', 1)[1].lower()

    # Check if detected MIME type is in our allowed list
    if detected_mime not in ALLOWED_MIMES:
        return False, f'File type {detected_mime} not allowed'

    # Check if the extension matches the detected MIME type
    allowed_extensions = ALLOWED_MIMES[detected_mime]
    if claimed_ext not in allowed_extensions:
        return False, f'Extension .{claimed_ext} does not match content type {detected_mime}'

    return True, detected_mime

@app.route('/upload', methods=['POST'])
def upload_with_mime_validation():
    """Upload with MIME type validation"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    # Validate file content against extension
    is_valid, result = validate_file_content(file)

    if not is_valid:
        return jsonify({'error': result}), 400

    # result contains the detected MIME type if valid
    detected_mime = result

    # Proceed with saving
    safe_filename = secure_filename(file.filename)
    filepath = os.path.join('/var/uploads', safe_filename)
    file.save(filepath)

    return jsonify({
        'message': 'File uploaded successfully',
        'filename': safe_filename,
        'mime_type': detected_mime
    }), 201
```

---

## Handling Multiple File Uploads

Sometimes you need to accept multiple files in a single request. Flask handles this with the `getlist()` method.

```python
# multiple_uploads.py
# Handle multiple file uploads in a single request
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import os
import uuid

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50 MB total

UPLOAD_FOLDER = '/var/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/upload-multiple', methods=['POST'])
def upload_multiple_files():
    """Handle multiple file uploads"""
    # Get all files with the key 'files'
    files = request.files.getlist('files')

    if not files or files[0].filename == '':
        return jsonify({'error': 'No files provided'}), 400

    uploaded = []
    errors = []

    for file in files:
        # Validate each file
        if file.filename == '':
            continue

        if not allowed_file(file.filename):
            errors.append({
                'filename': file.filename,
                'error': 'File type not allowed'
            })
            continue

        # Generate unique filename
        safe_filename = secure_filename(file.filename)
        ext = safe_filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}.{ext}"

        # Save the file
        filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(filepath)

        uploaded.append({
            'original_filename': safe_filename,
            'saved_filename': unique_filename
        })

    return jsonify({
        'uploaded': uploaded,
        'errors': errors,
        'total_uploaded': len(uploaded),
        'total_errors': len(errors)
    }), 201 if uploaded else 400
```

---

## Streaming Large File Uploads

For large files, you don't want to load the entire file into memory. Flask can stream file uploads to disk using chunks.

```python
# streaming_upload.py
# Stream large files directly to disk without loading into memory
from flask import Flask, request, jsonify
import os
import uuid

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 1024 * 1024 * 1024  # 1 GB max

UPLOAD_FOLDER = '/var/uploads'
CHUNK_SIZE = 8192  # 8 KB chunks

@app.route('/upload-large', methods=['POST'])
def upload_large_file():
    """
    Stream large file uploads to disk.
    This avoids loading the entire file into memory.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    # Generate unique filename
    ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'bin'
    unique_filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(UPLOAD_FOLDER, unique_filename)

    # Stream the file to disk in chunks
    bytes_written = 0
    with open(filepath, 'wb') as f:
        while True:
            chunk = file.stream.read(CHUNK_SIZE)
            if not chunk:
                break
            f.write(chunk)
            bytes_written += len(chunk)

    return jsonify({
        'message': 'File uploaded successfully',
        'filename': unique_filename,
        'size_bytes': bytes_written,
        'size_mb': round(bytes_written / (1024 * 1024), 2)
    }), 201
```

---

## Storing Files in Cloud Storage (S3)

For production applications, you'll likely want to store files in cloud storage like AWS S3. This example shows how to upload directly to S3 using boto3.

```python
# s3_upload.py
# Upload files to AWS S3
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import boto3
from botocore.exceptions import ClientError
import uuid
import os

app = Flask(__name__)

# AWS configuration - use environment variables in production
S3_BUCKET = os.environ.get('S3_BUCKET', 'my-upload-bucket')
S3_REGION = os.environ.get('S3_REGION', 'us-east-1')

# Initialize S3 client
s3_client = boto3.client(
    's3',
    region_name=S3_REGION
    # Credentials are loaded from environment or IAM role
)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def upload_to_s3(file_storage, filename):
    """
    Upload a file to S3 and return the URL.
    """
    try:
        # Determine content type for proper browser handling
        content_type = file_storage.content_type or 'application/octet-stream'

        # Upload to S3
        s3_client.upload_fileobj(
            file_storage,
            S3_BUCKET,
            filename,
            ExtraArgs={
                'ContentType': content_type,
                'ACL': 'private'  # Keep files private by default
            }
        )

        # Generate the URL (for private files, you'd use presigned URLs)
        url = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{filename}"
        return url, None

    except ClientError as e:
        return None, str(e)

@app.route('/upload', methods=['POST'])
def upload_to_cloud():
    """Upload file to S3"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400

    # Generate unique filename with folder structure
    safe_filename = secure_filename(file.filename)
    ext = safe_filename.rsplit('.', 1)[1].lower()
    unique_filename = f"uploads/{uuid.uuid4().hex}.{ext}"

    # Upload to S3
    url, error = upload_to_s3(file, unique_filename)

    if error:
        return jsonify({'error': f'Upload failed: {error}'}), 500

    return jsonify({
        'message': 'File uploaded successfully',
        'filename': unique_filename,
        'url': url
    }), 201

@app.route('/get-upload-url', methods=['POST'])
def get_presigned_url():
    """
    Generate a presigned URL for direct client upload to S3.
    This bypasses your server completely for the file transfer.
    """
    data = request.get_json()
    filename = data.get('filename')
    content_type = data.get('content_type', 'application/octet-stream')

    if not filename:
        return jsonify({'error': 'Filename required'}), 400

    # Generate unique key
    ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else 'bin'
    unique_key = f"uploads/{uuid.uuid4().hex}.{ext}"

    try:
        # Generate presigned URL valid for 1 hour
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': S3_BUCKET,
                'Key': unique_key,
                'ContentType': content_type
            },
            ExpiresIn=3600  # URL valid for 1 hour
        )

        return jsonify({
            'upload_url': presigned_url,
            'key': unique_key,
            'expires_in': 3600
        })

    except ClientError as e:
        return jsonify({'error': str(e)}), 500
```

---

## Upload Progress Tracking

For a better user experience, you can track upload progress. This requires a bit of client-side JavaScript and server-side support.

```python
# progress_upload.py
# File upload with progress tracking support
from flask import Flask, request, jsonify, render_template_string
from werkzeug.utils import secure_filename
import os
import uuid

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100 MB

UPLOAD_FOLDER = '/var/uploads'

# Simple HTML page with upload progress
UPLOAD_PAGE = '''
<!DOCTYPE html>
<html>
<head>
    <title>File Upload with Progress</title>
</head>
<body>
    <h1>Upload File</h1>
    <input type="file" id="fileInput">
    <button onclick="uploadFile()">Upload</button>
    <div id="progress">
        <div id="progressBar" style="width: 0%; height: 20px; background: #4CAF50;"></div>
    </div>
    <div id="status"></div>

    <script>
    function uploadFile() {
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', function(e) {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                document.getElementById('progressBar').style.width = percentComplete + '%';
                document.getElementById('status').innerText =
                    Math.round(percentComplete) + '% uploaded';
            }
        });

        xhr.onload = function() {
            if (xhr.status === 201) {
                document.getElementById('status').innerText = 'Upload complete!';
            } else {
                document.getElementById('status').innerText = 'Upload failed: ' + xhr.responseText;
            }
        };

        xhr.open('POST', '/upload', true);
        xhr.send(formData);
    }
    </script>
</body>
</html>
'''

@app.route('/')
def index():
    """Render the upload form"""
    return render_template_string(UPLOAD_PAGE)

@app.route('/upload', methods=['POST'])
def upload_with_progress():
    """Handle file upload"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    safe_filename = secure_filename(file.filename)
    ext = safe_filename.rsplit('.', 1)[1].lower() if '.' in safe_filename else 'bin'
    unique_filename = f"{uuid.uuid4().hex}.{ext}"

    filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
    file.save(filepath)

    return jsonify({
        'message': 'File uploaded successfully',
        'filename': unique_filename
    }), 201

if __name__ == '__main__':
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    app.run(debug=True)
```

---

## Complete Production-Ready Upload Service

Here's a complete file upload service that combines all the best practices: secure validation, cloud storage, and proper error handling.

```python
# production_upload.py
# Production-ready file upload service
from flask import Flask, request, jsonify, Blueprint
from werkzeug.utils import secure_filename
from dataclasses import dataclass
from typing import Optional, List, Tuple
from enum import Enum
import magic
import boto3
from botocore.exceptions import ClientError
import os
import uuid
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class UploadError(Enum):
    """Enumeration of possible upload errors"""
    NO_FILE = "No file provided"
    EMPTY_FILENAME = "No file selected"
    INVALID_EXTENSION = "File type not allowed"
    INVALID_MIME = "File content does not match extension"
    FILE_TOO_LARGE = "File exceeds maximum size"
    STORAGE_ERROR = "Failed to save file"

@dataclass
class UploadConfig:
    """Configuration for file uploads"""
    max_size_bytes: int = 16 * 1024 * 1024  # 16 MB default
    allowed_extensions: set = None
    allowed_mimes: dict = None
    storage_backend: str = 'local'  # 'local' or 's3'
    local_upload_path: str = '/var/uploads'
    s3_bucket: str = None
    s3_region: str = 'us-east-1'

    def __post_init__(self):
        if self.allowed_extensions is None:
            self.allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'pdf'}
        if self.allowed_mimes is None:
            self.allowed_mimes = {
                'image/jpeg': ['jpg', 'jpeg'],
                'image/png': ['png'],
                'image/gif': ['gif'],
                'application/pdf': ['pdf']
            }

@dataclass
class UploadResult:
    """Result of an upload operation"""
    success: bool
    filename: Optional[str] = None
    original_filename: Optional[str] = None
    url: Optional[str] = None
    size_bytes: Optional[int] = None
    mime_type: Optional[str] = None
    error: Optional[str] = None

class FileUploadService:
    """
    Production-ready file upload service with validation and multiple storage backends.
    """

    def __init__(self, config: UploadConfig):
        self.config = config
        self._magic = magic.Magic(mime=True)

        # Initialize S3 client if using S3 storage
        if config.storage_backend == 's3':
            self._s3_client = boto3.client('s3', region_name=config.s3_region)
        else:
            # Ensure local upload directory exists
            os.makedirs(config.local_upload_path, exist_ok=True)

    def validate_file(self, file_storage) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Validate file extension and content.
        Returns: (is_valid, error_message, detected_mime)
        """
        filename = file_storage.filename

        # Check extension
        if '.' not in filename:
            return False, UploadError.INVALID_EXTENSION.value, None

        ext = filename.rsplit('.', 1)[1].lower()
        if ext not in self.config.allowed_extensions:
            return False, f"{UploadError.INVALID_EXTENSION.value}: .{ext}", None

        # Check MIME type from content
        header = file_storage.read(2048)
        file_storage.seek(0)
        detected_mime = self._magic.from_buffer(header)

        if detected_mime not in self.config.allowed_mimes:
            return False, f"{UploadError.INVALID_MIME.value}: {detected_mime}", None

        # Verify extension matches MIME type
        allowed_exts = self.config.allowed_mimes[detected_mime]
        if ext not in allowed_exts:
            return False, f"Extension .{ext} does not match content type {detected_mime}", None

        return True, None, detected_mime

    def generate_filename(self, original_filename: str) -> str:
        """Generate a unique filename preserving the extension"""
        ext = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else 'bin'
        return f"{uuid.uuid4().hex}.{ext}"

    def save_local(self, file_storage, filename: str) -> Tuple[bool, Optional[str]]:
        """Save file to local filesystem"""
        try:
            filepath = os.path.join(self.config.local_upload_path, filename)
            file_storage.save(filepath)
            return True, None
        except Exception as e:
            logger.error(f"Local save failed: {e}")
            return False, str(e)

    def save_s3(self, file_storage, filename: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """Save file to S3 and return the URL"""
        try:
            content_type = file_storage.content_type or 'application/octet-stream'

            self._s3_client.upload_fileobj(
                file_storage,
                self.config.s3_bucket,
                filename,
                ExtraArgs={
                    'ContentType': content_type,
                    'ACL': 'private'
                }
            )

            url = f"https://{self.config.s3_bucket}.s3.{self.config.s3_region}.amazonaws.com/{filename}"
            return True, None, url

        except ClientError as e:
            logger.error(f"S3 upload failed: {e}")
            return False, str(e), None

    def upload(self, file_storage) -> UploadResult:
        """
        Process a file upload with full validation.
        """
        # Basic checks
        if file_storage is None:
            return UploadResult(success=False, error=UploadError.NO_FILE.value)

        if file_storage.filename == '':
            return UploadResult(success=False, error=UploadError.EMPTY_FILENAME.value)

        # Validate file content
        is_valid, error, mime_type = self.validate_file(file_storage)
        if not is_valid:
            return UploadResult(success=False, error=error)

        # Sanitize and generate unique filename
        safe_filename = secure_filename(file_storage.filename)
        unique_filename = self.generate_filename(safe_filename)

        # Get file size
        file_storage.seek(0, 2)  # Seek to end
        size_bytes = file_storage.tell()
        file_storage.seek(0)  # Reset to beginning

        # Check size limit
        if size_bytes > self.config.max_size_bytes:
            return UploadResult(
                success=False,
                error=f"{UploadError.FILE_TOO_LARGE.value}: {size_bytes} bytes"
            )

        # Save to appropriate backend
        url = None
        if self.config.storage_backend == 's3':
            success, error, url = self.save_s3(file_storage, unique_filename)
        else:
            success, error = self.save_local(file_storage, unique_filename)

        if not success:
            return UploadResult(success=False, error=f"{UploadError.STORAGE_ERROR.value}: {error}")

        return UploadResult(
            success=True,
            filename=unique_filename,
            original_filename=safe_filename,
            url=url,
            size_bytes=size_bytes,
            mime_type=mime_type
        )

# Create Flask app and upload service
app = Flask(__name__)

# Configure based on environment
config = UploadConfig(
    max_size_bytes=int(os.environ.get('MAX_UPLOAD_SIZE', 16 * 1024 * 1024)),
    storage_backend=os.environ.get('STORAGE_BACKEND', 'local'),
    local_upload_path=os.environ.get('UPLOAD_PATH', '/var/uploads'),
    s3_bucket=os.environ.get('S3_BUCKET'),
    s3_region=os.environ.get('S3_REGION', 'us-east-1')
)

upload_service = FileUploadService(config)

# Set Flask's max content length
app.config['MAX_CONTENT_LENGTH'] = config.max_size_bytes

@app.route('/upload', methods=['POST'])
def upload_endpoint():
    """Single file upload endpoint"""
    file = request.files.get('file')
    result = upload_service.upload(file)

    if result.success:
        return jsonify({
            'success': True,
            'filename': result.filename,
            'original_filename': result.original_filename,
            'url': result.url,
            'size_bytes': result.size_bytes,
            'mime_type': result.mime_type
        }), 201
    else:
        return jsonify({
            'success': False,
            'error': result.error
        }), 400

@app.route('/upload/multiple', methods=['POST'])
def upload_multiple_endpoint():
    """Multiple file upload endpoint"""
    files = request.files.getlist('files')

    results = []
    for file in files:
        result = upload_service.upload(file)
        results.append({
            'original_filename': file.filename,
            'success': result.success,
            'filename': result.filename,
            'error': result.error
        })

    successful = [r for r in results if r['success']]
    failed = [r for r in results if not r['success']]

    return jsonify({
        'total': len(results),
        'successful': len(successful),
        'failed': len(failed),
        'results': results
    }), 201 if successful else 400

@app.errorhandler(413)
def handle_file_too_large(error):
    """Handle Flask's built-in size check"""
    return jsonify({
        'success': False,
        'error': UploadError.FILE_TOO_LARGE.value
    }), 413

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
```

---

## Security Best Practices Summary

| Practice | Why It Matters |
|----------|----------------|
| Use `secure_filename()` | Prevents path traversal attacks (e.g., `../../etc/passwd`) |
| Validate MIME types | Prevents disguised malicious files |
| Set `MAX_CONTENT_LENGTH` | Prevents denial of service via large uploads |
| Generate unique filenames | Prevents overwrites and predictable URLs |
| Store outside web root | Prevents direct access to uploaded files |
| Use presigned URLs for S3 | Keeps S3 credentials server-side |
| Scan for malware | Protects your users from infected files |

---

## Common Pitfalls

**1. Trusting the filename**
```python
# Bad - user controls the path
file.save(os.path.join(UPLOAD_FOLDER, file.filename))

# Good - sanitize first
safe_name = secure_filename(file.filename)
file.save(os.path.join(UPLOAD_FOLDER, safe_name))
```

**2. Only checking extensions**
```python
# Bad - can be bypassed by renaming
if filename.endswith('.jpg'):
    save_file()

# Good - check actual content
mime = magic.Magic(mime=True)
if mime.from_buffer(file.read(2048)) == 'image/jpeg':
    save_file()
```

**3. Not limiting file size**
```python
# Bad - no limit, server can be overwhelmed
app = Flask(__name__)

# Good - set a reasonable limit
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
```

---

## Conclusion

File uploads in Flask can be secure and reliable if you follow the right patterns. The key points to remember:

- Always sanitize filenames with `secure_filename()`
- Validate file content, not just extensions
- Set appropriate size limits
- Use unique filenames to prevent overwrites
- Consider cloud storage for production workloads
- Handle errors gracefully and provide clear feedback

Start with the basic implementation and add layers of security as needed for your use case.

---

*Building a Flask application with file uploads? [OneUptime](https://oneuptime.com) can help you monitor your application's performance, track upload success rates, and alert you when something goes wrong. Set up monitoring in minutes and keep your file upload service running smoothly.*
