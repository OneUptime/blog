# How to Upload Files to S3 with Boto3

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Boto3, Python

Description: Learn how to upload files to Amazon S3 using Boto3 in Python, including single file uploads, multipart uploads, progress tracking, and best practices for large files.

---

Uploading files to S3 is one of the most common things you'll do with Boto3. Whether you're backing up logs, serving static assets, or storing user uploads, you need to know the different upload methods and when to use each one. Let's go through everything from basic uploads to multipart transfers with progress tracking.

## Basic File Upload

The simplest way to upload a file is with `upload_file()`. It takes a local file path, bucket name, and the key (path) you want in S3.

```python
import boto3

s3 = boto3.client('s3')

# Upload a single file
s3.upload_file(
    Filename='report.pdf',
    Bucket='my-documents-bucket',
    Key='reports/2026/report.pdf'
)
print("File uploaded successfully")
```

If the file is larger than a certain threshold (8 MB by default), `upload_file()` automatically switches to multipart upload behind the scenes. You don't need to manage this yourself.

## Uploading with the Resource Interface

The resource interface offers a slightly more readable syntax.

```python
import boto3

s3 = boto3.resource('s3')
bucket = s3.Bucket('my-documents-bucket')

# Upload using the bucket object
bucket.upload_file('report.pdf', 'reports/2026/report.pdf')

# Or use the Object interface
obj = s3.Object('my-documents-bucket', 'reports/2026/report.pdf')
obj.upload_file('report.pdf')
```

## Uploading In-Memory Data

Sometimes you don't have a file on disk - you've generated data in memory and want to push it directly to S3. Use `put_object()` for this.

```python
import boto3
import json

s3 = boto3.client('s3')

# Upload a string
s3.put_object(
    Bucket='my-bucket',
    Key='data/config.json',
    Body=json.dumps({'version': '1.0', 'debug': False}),
    ContentType='application/json'
)

# Upload bytes
binary_data = b'\x00\x01\x02\x03'
s3.put_object(
    Bucket='my-bucket',
    Key='data/binary-file.bin',
    Body=binary_data
)
```

You can also use `upload_fileobj()` with a file-like object, which is useful when working with streams or BytesIO objects.

```python
import boto3
from io import BytesIO

s3 = boto3.client('s3')

# Upload from a BytesIO buffer
buffer = BytesIO(b'Hello, this is in-memory data')
s3.upload_fileobj(buffer, 'my-bucket', 'data/from-memory.txt')
```

## Setting Metadata and Content Type

When uploading files, you'll often want to set metadata, content type, or other properties. Use `ExtraArgs` for this.

```python
import boto3

s3 = boto3.client('s3')

# Upload with metadata and content type
s3.upload_file(
    Filename='index.html',
    Bucket='my-website-bucket',
    Key='index.html',
    ExtraArgs={
        'ContentType': 'text/html',
        'CacheControl': 'max-age=3600',
        'Metadata': {
            'uploaded-by': 'deployment-script',
            'version': '2.1.0'
        }
    }
)

# Upload with server-side encryption
s3.upload_file(
    Filename='sensitive-data.csv',
    Bucket='my-secure-bucket',
    Key='data/sensitive-data.csv',
    ExtraArgs={
        'ServerSideEncryption': 'aws:kms',
        'SSEKMSKeyId': 'arn:aws:kms:us-east-1:123456789012:key/my-key-id'
    }
)

# Upload with ACL (make publicly readable)
s3.upload_file(
    Filename='logo.png',
    Bucket='my-public-bucket',
    Key='assets/logo.png',
    ExtraArgs={
        'ACL': 'public-read',
        'ContentType': 'image/png'
    }
)
```

## Progress Tracking

For large files, you'll want to show upload progress. Boto3 supports a callback function that gets called with the number of bytes transferred.

This callback class tracks and displays upload progress as a percentage.

```python
import boto3
import os
import sys
import threading

class ProgressTracker:
    """Track upload progress with percentage display."""

    def __init__(self, filename):
        self._filename = filename
        self._size = os.path.getsize(filename)
        self._seen = 0
        self._lock = threading.Lock()

    def __call__(self, bytes_amount):
        with self._lock:
            self._seen += bytes_amount
            percentage = (self._seen / self._size) * 100
            sys.stdout.write(
                f"\r{self._filename}: {percentage:.1f}% "
                f"({self._seen}/{self._size} bytes)"
            )
            sys.stdout.flush()
            if self._seen >= self._size:
                sys.stdout.write('\n')

s3 = boto3.client('s3')

# Upload with progress tracking
s3.upload_file(
    'large-backup.tar.gz',
    'my-backup-bucket',
    'backups/large-backup.tar.gz',
    Callback=ProgressTracker('large-backup.tar.gz')
)
```

## Configuring Multipart Uploads

For very large files, you might want to tune the multipart upload settings. The `TransferConfig` class lets you control chunk sizes, concurrency, and thresholds.

```python
import boto3
from boto3.s3.transfer import TransferConfig

s3 = boto3.client('s3')

# Custom transfer configuration
config = TransferConfig(
    multipart_threshold=100 * 1024 * 1024,  # 100 MB - switch to multipart above this
    max_concurrency=10,                       # number of parallel upload threads
    multipart_chunksize=50 * 1024 * 1024,    # 50 MB per part
    use_threads=True                          # enable threaded uploads
)

# Upload a large file with custom config
s3.upload_file(
    'database-dump.sql.gz',
    'my-backup-bucket',
    'db/database-dump.sql.gz',
    Config=config
)
```

## Uploading an Entire Directory

Here's a practical function that uploads all files in a directory, preserving the folder structure.

```python
import boto3
import os

def upload_directory(local_dir, bucket_name, s3_prefix=''):
    """Upload all files from a local directory to S3."""
    s3 = boto3.client('s3')
    uploaded = 0

    for root, dirs, files in os.walk(local_dir):
        for filename in files:
            local_path = os.path.join(root, filename)

            # Build the S3 key preserving directory structure
            relative_path = os.path.relpath(local_path, local_dir)
            s3_key = os.path.join(s3_prefix, relative_path).replace('\\', '/')

            print(f"Uploading {local_path} -> s3://{bucket_name}/{s3_key}")
            s3.upload_file(local_path, bucket_name, s3_key)
            uploaded += 1

    print(f"Uploaded {uploaded} files")
    return uploaded

# Upload a build directory to S3
upload_directory('./dist', 'my-website-bucket', 'static/v2')
```

## Handling Upload Errors

Uploads can fail for many reasons. Always handle errors gracefully, especially for large files where a failure midway is frustrating.

```python
import boto3
from botocore.exceptions import ClientError, S3UploadFailedError

s3 = boto3.client('s3')

def safe_upload(local_path, bucket, key, max_retries=3):
    """Upload with retries and error handling."""
    for attempt in range(1, max_retries + 1):
        try:
            s3.upload_file(local_path, bucket, key)
            print(f"Uploaded {local_path} to s3://{bucket}/{key}")
            return True
        except S3UploadFailedError as e:
            print(f"Upload failed (attempt {attempt}): {e}")
            if attempt == max_retries:
                return False
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'AccessDenied':
                print(f"Access denied - check your IAM permissions")
                return False
            elif error_code == 'NoSuchBucket':
                print(f"Bucket '{bucket}' doesn't exist")
                return False
            else:
                print(f"AWS error: {error_code}")
                if attempt == max_retries:
                    return False

# Usage
safe_upload('report.pdf', 'my-bucket', 'reports/report.pdf')
```

## Generating Pre-Signed Upload URLs

Sometimes you want to let someone else upload directly to your bucket without giving them AWS credentials. Pre-signed URLs make this possible.

```python
import boto3
import requests

s3 = boto3.client('s3')

# Generate a pre-signed URL for uploading
url = s3.generate_presigned_url(
    'put_object',
    Params={
        'Bucket': 'my-upload-bucket',
        'Key': 'user-uploads/photo.jpg',
        'ContentType': 'image/jpeg'
    },
    ExpiresIn=3600  # URL valid for 1 hour
)

print(f"Upload URL: {url}")

# Anyone can use this URL to upload (no AWS credentials needed)
# Example with requests:
# with open('photo.jpg', 'rb') as f:
#     requests.put(url, data=f, headers={'Content-Type': 'image/jpeg'})
```

## Best Practices

- **Use `upload_file()` for files on disk.** It handles multipart uploads automatically.
- **Use `put_object()` for small in-memory data.** It's simpler and you get the full response.
- **Set content types explicitly.** S3 defaults to `application/octet-stream`, which can cause issues when serving files.
- **Enable encryption for sensitive data.** Use `ServerSideEncryption` in `ExtraArgs`.
- **Track progress for large files.** Users need feedback during long uploads.
- **Handle errors with retries.** Network issues happen; don't let one failure kill your whole pipeline.

For more on working with S3 via Boto3, check out how to handle [Boto3 errors and exceptions](https://oneuptime.com/blog/post/boto3-errors-and-exceptions/view) for robust error handling in your upload pipelines.
