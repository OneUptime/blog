# How to Configure S3-Compatible Storage for Portainer Workloads (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, S3, MinIO, Object Storage, Docker, DevOps, Backup

Description: Learn how to deploy and configure S3-compatible object storage (MinIO) via Portainer and use it for container workload data and backups.

---

S3-compatible object storage is ideal for Portainer workloads that need scalable storage for file uploads, backups, logs, and media. Instead of paying for AWS S3, you can run MinIO - a high-performance, S3-compatible object store - as a container managed by Portainer. Applications that use standard AWS S3 object APIs can typically work with MinIO after you configure the endpoint and credentials.

---

## Step 1: Deploy MinIO via Portainer

Deploy MinIO as a Portainer stack for easy management.

```yaml
# minio-stack.yml - S3-compatible object storage

version: "3.8"

services:
  minio:
    image: minio/minio:latest
    container_name: minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"    # S3 API
      - "9001:9001"    # MinIO Console UI
    environment:
      # Admin credentials - change these!
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin-secret-password
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 30s
      timeout: 20s
      retries: 3

volumes:
  minio_data:
```

---

## Step 2: Configure MinIO with the mc CLI

```bash
# Install the MinIO client (mc)
curl -O https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc && sudo mv mc /usr/local/bin/

# Add your MinIO server as an alias
mc alias set local http://localhost:9000 minioadmin minioadmin-secret-password

# Create a bucket for your application
mc mb local/app-uploads
mc mb local/backups

# Keep bucket access private by disabling anonymous access (private by default)
mc anonymous set none local/app-uploads

# Verify
mc ls local/
```

---

## Step 3: Use MinIO in Your Application Containers

Configure your application to use MinIO as its S3 backend by providing S3-compatible environment variables.

```yaml
# webapp-stack.yml - app using MinIO for file storage
version: "3.8"

services:
  webapp:
    image: myapp:latest
    restart: unless-stopped
    environment:
      # Point the app's S3 SDK to MinIO instead of AWS
      AWS_ACCESS_KEY_ID: minioadmin
      AWS_SECRET_ACCESS_KEY: minioadmin-secret-password
      AWS_ENDPOINT_URL: http://minio:9000   # internal container networking
      AWS_DEFAULT_REGION: us-east-1         # required by most SDKs; use the MinIO region
      S3_BUCKET_NAME: app-uploads
    depends_on:
      - minio
    networks:
      - storage-net

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin-secret-password
    volumes:
      - minio_data:/data
    networks:
      - storage-net

volumes:
  minio_data:

networks:
  storage-net:
```

---

## Step 4: Configure Portainer Backups to MinIO

Portainer Business Edition supports S3 backups for the Portainer configuration natively. This does not back up deployed containers, stacks, services, or volumes.

In Portainer BE:
1. Go to **Settings** and scroll to **Back up Portainer**
2. Select **Store in S3**
3. Enter:
   - **S3 Compatible Host**: `http://<minio-host-or-ip>:9000`
   - **Region**: `us-east-1`
   - **Bucket Name**: `backups`
   - **Access Key ID**: `minioadmin`
   - **Secret Access Key**: `minioadmin-secret-password`
4. Set a backup schedule and click **Save**

---

## Step 5: Python Example - Upload Files to MinIO from a Container

```python
# upload_to_minio.py - use boto3 with MinIO
import boto3
from botocore.client import Config

# Configure boto3 to use MinIO endpoint
s3 = boto3.client(
    "s3",
    endpoint_url="http://minio:9000",       # MinIO service URL
    aws_access_key_id="minioadmin",
    aws_secret_access_key="minioadmin-secret-password",
    config=Config(signature_version="s3v4"),
    region_name="us-east-1",
)

# Upload a file
s3.upload_file("local-file.txt", "app-uploads", "remote-path/local-file.txt")
print("Upload successful")

# List objects in the bucket
response = s3.list_objects_v2(Bucket="app-uploads")
for obj in response.get("Contents", []):
    print(obj["Key"])
```

---

## Summary

MinIO deployed via Portainer gives you S3-compatible object storage without AWS S3 storage charges. Applications using the AWS S3 SDK can work without code changes when they expose endpoint configuration - just point the endpoint URL to your MinIO container. For multi-container stacks, put MinIO on a shared Docker network so other containers can access it by service name.
