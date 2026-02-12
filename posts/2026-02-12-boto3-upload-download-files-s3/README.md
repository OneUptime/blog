# How to Use Boto3 to Upload and Download Files from S3

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Python, Boto3

Description: Practical guide to uploading and downloading files from S3 using Python's Boto3 library, covering basic operations, multipart uploads, progress tracking, and error handling.

---

Boto3 is the Python SDK for AWS, and it's the most common way to interact with S3 from Python applications. Whether you're uploading user files in a web app, processing data in a pipeline, or backing up logs, Boto3's S3 client and resource interfaces have you covered.

Let's go through everything from basic uploads to advanced patterns like multipart transfers and progress callbacks.

## Setup

Install Boto3 and configure your credentials.

```bash
# Install boto3
pip install boto3

# Configure credentials (if not using IAM roles)
aws configure
```

Boto3 looks for credentials in this order: environment variables, shared credentials file (`~/.aws/credentials`), IAM role (on EC2/Lambda). For production, always use IAM roles.

## Client vs Resource

Boto3 offers two interfaces: the low-level client and the high-level resource. The resource is easier to use for common operations, while the client gives you full API control.

```python
import boto3

# Low-level client - maps directly to S3 API calls
client = boto3.client('s3')

# High-level resource - object-oriented interface
s3 = boto3.resource('s3')
```

For most file operations, the resource interface is simpler. I'll show both approaches.

## Uploading Files

The simplest upload - put a local file into S3.

```python
import boto3

s3 = boto3.client('s3')

# Upload a file
s3.upload_file(
    Filename='local-data.csv',       # Local file path
    Bucket='my-data-bucket',          # S3 bucket name
    Key='uploads/data.csv'            # S3 object key (path)
)
```

Using the resource interface.

```python
import boto3

s3 = boto3.resource('s3')

# Upload using the resource interface
s3.Bucket('my-data-bucket').upload_file(
    Filename='local-data.csv',
    Key='uploads/data.csv'
)
```

## Uploading with Metadata and Content Type

Set metadata and content type when uploading. This is important for files that'll be served to browsers.

```python
import boto3

s3 = boto3.client('s3')

# Upload with content type and custom metadata
s3.upload_file(
    'report.html',
    'my-website-bucket',
    'reports/monthly.html',
    ExtraArgs={
        'ContentType': 'text/html',
        'Metadata': {
            'author': 'data-team',
            'report-type': 'monthly'
        },
        'ServerSideEncryption': 'aws:kms',
        'StorageClass': 'STANDARD_IA'
    }
)
```

## Uploading from Memory (File-like Objects)

You don't always have a file on disk. Maybe you're generating data in memory.

```python
import boto3
import io
import json

s3 = boto3.client('s3')

# Upload JSON data from memory
data = {'users': [{'name': 'Alice'}, {'name': 'Bob'}]}
json_bytes = json.dumps(data).encode('utf-8')

s3.put_object(
    Bucket='my-data-bucket',
    Key='data/users.json',
    Body=json_bytes,
    ContentType='application/json'
)

# Upload from a BytesIO object
buffer = io.BytesIO()
buffer.write(b'Hello, S3!')
buffer.seek(0)  # Don't forget to seek to the beginning

s3.upload_fileobj(
    buffer,
    'my-data-bucket',
    'messages/hello.txt'
)
```

## Downloading Files

Download an S3 object to a local file.

```python
import boto3

s3 = boto3.client('s3')

# Download to a local file
s3.download_file(
    Bucket='my-data-bucket',
    Key='uploads/data.csv',
    Filename='downloaded-data.csv'
)
```

Download to memory (useful when you don't want to write to disk).

```python
import boto3
import json

s3 = boto3.client('s3')

# Download to memory
response = s3.get_object(
    Bucket='my-data-bucket',
    Key='data/users.json'
)

# Read the content
content = response['Body'].read().decode('utf-8')
data = json.loads(content)
print(data)
```

Download to a file-like object.

```python
import boto3
import io

s3 = boto3.client('s3')

# Download to BytesIO
buffer = io.BytesIO()
s3.download_fileobj('my-data-bucket', 'uploads/data.csv', buffer)
buffer.seek(0)

# Now you can read from buffer
content = buffer.read()
```

## Progress Tracking

For large files, you'll want to show upload/download progress.

```python
import boto3
import os
import sys
import threading


class ProgressTracker:
    """Tracks upload/download progress and prints a progress bar."""

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


s3 = boto3.client('s3')

# Upload with progress tracking
tracker = ProgressTracker('large-file.zip')
s3.upload_file(
    'large-file.zip',
    'my-data-bucket',
    'backups/large-file.zip',
    Callback=tracker
)
print()  # New line after progress bar
```

## Multipart Upload Configuration

Boto3 automatically handles multipart uploads for large files. You can customize the thresholds.

```python
import boto3
from boto3.s3.transfer import TransferConfig

s3 = boto3.client('s3')

# Custom transfer configuration
config = TransferConfig(
    multipart_threshold=1024 * 1024 * 100,   # 100 MB - use multipart above this
    max_concurrency=10,                       # Number of parallel threads
    multipart_chunksize=1024 * 1024 * 50,     # 50 MB per part
    use_threads=True                          # Enable parallel uploads
)

# Upload with custom config
s3.upload_file(
    'huge-dataset.parquet',
    'my-data-bucket',
    'datasets/huge-dataset.parquet',
    Config=config
)
```

For downloads, the same `TransferConfig` applies.

```python
# Download with custom config
s3.download_file(
    'my-data-bucket',
    'datasets/huge-dataset.parquet',
    'local-dataset.parquet',
    Config=config
)
```

## Error Handling

Always handle errors properly, especially for production code.

```python
import boto3
from botocore.exceptions import ClientError, NoCredentialsError

s3 = boto3.client('s3')


def safe_upload(local_path, bucket, key):
    """Upload a file with proper error handling."""
    try:
        s3.upload_file(local_path, bucket, key)
        print(f"Successfully uploaded {key}")
        return True

    except FileNotFoundError:
        print(f"Local file not found: {local_path}")
        return False

    except NoCredentialsError:
        print("AWS credentials not found")
        return False

    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'NoSuchBucket':
            print(f"Bucket does not exist: {bucket}")
        elif error_code == 'AccessDenied':
            print(f"Access denied to bucket: {bucket}")
        else:
            print(f"AWS error: {e}")
        return False


def safe_download(bucket, key, local_path):
    """Download a file with proper error handling."""
    try:
        s3.download_file(bucket, key, local_path)
        print(f"Successfully downloaded {key}")
        return True

    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == '404':
            print(f"Object not found: {key}")
        elif error_code == 'AccessDenied':
            print(f"Access denied: {key}")
        else:
            print(f"AWS error: {e}")
        return False
```

## Listing Objects Before Download

Often you need to list objects first, then download them.

```python
import boto3

s3 = boto3.client('s3')

def list_and_download(bucket, prefix, local_dir):
    """List objects with a prefix and download them all."""
    paginator = s3.get_paginator('list_objects_v2')

    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get('Contents', []):
            key = obj['Key']
            # Skip "directory" markers
            if key.endswith('/'):
                continue

            local_path = f"{local_dir}/{key}"

            # Create local directories as needed
            import os
            os.makedirs(os.path.dirname(local_path), exist_ok=True)

            print(f"Downloading: {key}")
            s3.download_file(bucket, key, local_path)


# Download all files under a prefix
list_and_download('my-data-bucket', 'reports/2026/', './downloaded-reports')
```

## Generating Presigned URLs

For temporary access without sharing credentials, generate presigned URLs. This is great for giving users temporary download links.

```python
import boto3

s3 = boto3.client('s3')

# Generate a presigned URL valid for 1 hour
url = s3.generate_presigned_url(
    'get_object',
    Params={
        'Bucket': 'my-data-bucket',
        'Key': 'reports/confidential.pdf'
    },
    ExpiresIn=3600  # 1 hour in seconds
)

print(f"Download URL: {url}")
```

For more on presigned URLs in frontend applications, check out our guide on [S3 presigned URLs in React](https://oneuptime.com/blog/post/s3-presigned-urls-react-application/view).

## Best Practices

1. **Use IAM roles** instead of access keys in production
2. **Set content types** explicitly - S3 defaults to `application/octet-stream`
3. **Enable transfer acceleration** for large files over long distances
4. **Use multipart uploads** for files over 100 MB
5. **Implement retry logic** for transient failures
6. **Monitor upload/download metrics** with [OneUptime](https://oneuptime.com) to catch performance regressions

For Node.js developers, we've got a similar guide on [using the AWS SDK for JavaScript v3 with S3](https://oneuptime.com/blog/post/aws-sdk-javascript-v3-s3/view).
