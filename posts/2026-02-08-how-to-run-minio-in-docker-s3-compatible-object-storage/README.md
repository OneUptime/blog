# How to Run MinIO in Docker (S3-Compatible Object Storage)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, MinIO, S3, Object Storage, Cloud Storage, Docker Compose, Self-Hosted

Description: Deploy MinIO in Docker as a self-hosted S3-compatible object storage server for development and production

---

MinIO is a high-performance, S3-compatible object storage server. It implements the full Amazon S3 API, which means any application built for S3 works with MinIO without code changes. This makes it useful in two scenarios: as a local S3 replacement for development (so you do not need an AWS account during development), and as a production object storage solution for organizations that want to keep data on-premises. Docker is the simplest way to deploy MinIO, whether for a single-node setup or a distributed cluster.

This guide covers deploying MinIO in Docker, using it with the AWS SDK, setting up bucket policies, and configuring it for production workloads.

## Quick Start

Get MinIO running in seconds:

```bash
# Start MinIO with default credentials
docker run -d \
  --name minio \
  -p 9000:9000 \
  -p 9001:9001 \
  -v minio-data:/data \
  minio/minio:latest server /data --console-address ":9001"
```

MinIO is now available at:
- **API endpoint**: http://localhost:9000
- **Web console**: http://localhost:9001

The default credentials are `minioadmin` / `minioadmin`.

## Production Setup with Docker Compose

For a proper deployment with custom credentials and configuration:

```yaml
# docker-compose.yml - MinIO production single-node deployment
version: "3.8"

services:
  minio:
    image: minio/minio:latest
    container_name: minio
    ports:
      - "9000:9000"   # S3 API
      - "9001:9001"   # Web Console
    environment:
      MINIO_ROOT_USER: admin
      MINIO_ROOT_PASSWORD: supersecretpassword
      MINIO_BROWSER_REDIRECT_URL: http://minio.example.com:9001
    volumes:
      - minio-data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

volumes:
  minio-data:
```

Start it:

```bash
# Launch MinIO
docker compose up -d
```

## Using the MinIO Client (mc)

MinIO provides a CLI tool called `mc` for managing your storage:

```bash
# Run mc from a temporary container to configure and use it
docker run --rm -it --entrypoint /bin/sh \
  --network host \
  minio/mc

# Inside the container, configure the alias
mc alias set local http://localhost:9000 admin supersecretpassword

# Create a bucket
mc mb local/my-app-data

# Upload a file
mc cp /path/to/file.csv local/my-app-data/

# List bucket contents
mc ls local/my-app-data/

# Set a bucket policy to allow public read
mc anonymous set download local/my-app-data
```

Alternatively, use `mc` directly from Docker:

```bash
# Create a bucket using mc from Docker
docker run --rm --network host minio/mc \
  alias set local http://localhost:9000 admin supersecretpassword && \
  mc mb local/uploads
```

## Using MinIO with the AWS SDK

Since MinIO speaks the S3 protocol, you use the standard AWS SDKs. Here is a Python example:

```python
# s3_example.py - use MinIO with the boto3 AWS SDK
import boto3
from botocore.client import Config

# Create an S3 client pointed at MinIO
s3 = boto3.client(
    "s3",
    endpoint_url="http://localhost:9000",
    aws_access_key_id="admin",
    aws_secret_access_key="supersecretpassword",
    config=Config(signature_version="s3v4"),
    region_name="us-east-1"
)

# Create a bucket
s3.create_bucket(Bucket="my-bucket")

# Upload a file
s3.upload_file("local_file.txt", "my-bucket", "remote_file.txt")

# List objects in the bucket
response = s3.list_objects_v2(Bucket="my-bucket")
for obj in response.get("Contents", []):
    print(f"  {obj['Key']} - {obj['Size']} bytes")

# Download a file
s3.download_file("my-bucket", "remote_file.txt", "downloaded_file.txt")

# Generate a presigned URL (valid for 1 hour)
url = s3.generate_presigned_url(
    "get_object",
    Params={"Bucket": "my-bucket", "Key": "remote_file.txt"},
    ExpiresIn=3600
)
print(f"Presigned URL: {url}")
```

## Node.js Integration

```javascript
// s3_example.js - use MinIO with the AWS SDK for JavaScript
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  endpoint: "http://localhost:9000",
  region: "us-east-1",
  credentials: {
    accessKeyId: "admin",
    secretAccessKey: "supersecretpassword",
  },
  forcePathStyle: true, // Required for MinIO
});

async function uploadFile() {
  const command = new PutObjectCommand({
    Bucket: "my-bucket",
    Key: "hello.txt",
    Body: "Hello from MinIO!",
    ContentType: "text/plain",
  });
  await s3Client.send(command);
  console.log("File uploaded successfully");
}

uploadFile();
```

## Distributed Mode for High Availability

MinIO supports distributed mode with erasure coding for data redundancy. This setup uses 4 nodes with 4 drives each:

```yaml
# docker-compose-distributed.yml - MinIO distributed cluster
version: "3.8"

x-minio-common: &minio-common
  image: minio/minio:latest
  environment:
    MINIO_ROOT_USER: admin
    MINIO_ROOT_PASSWORD: supersecretpassword
  command: server --console-address ":9001" http://minio{1...4}/data{1...2}
  healthcheck:
    test: ["CMD", "mc", "ready", "local"]
    interval: 30s
    timeout: 10s
    retries: 3

services:
  minio1:
    <<: *minio-common
    container_name: minio1
    hostname: minio1
    volumes:
      - minio1-data1:/data1
      - minio1-data2:/data2

  minio2:
    <<: *minio-common
    container_name: minio2
    hostname: minio2
    volumes:
      - minio2-data1:/data1
      - minio2-data2:/data2

  minio3:
    <<: *minio-common
    container_name: minio3
    hostname: minio3
    volumes:
      - minio3-data1:/data1
      - minio3-data2:/data2

  minio4:
    <<: *minio-common
    container_name: minio4
    hostname: minio4
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio4-data1:/data1
      - minio4-data2:/data2

volumes:
  minio1-data1:
  minio1-data2:
  minio2-data1:
  minio2-data2:
  minio3-data1:
  minio3-data2:
  minio4-data1:
  minio4-data2:
```

This configuration provides erasure coding that can tolerate the loss of up to 2 drives while maintaining data integrity.

## Bucket Lifecycle Rules

Configure automatic cleanup of old objects:

```bash
# Set lifecycle rule to delete objects after 30 days
docker run --rm --network host minio/mc sh -c "
  mc alias set local http://localhost:9000 admin supersecretpassword
  mc ilm rule add --expire-days 30 local/temp-uploads
"
```

## Monitoring MinIO

MinIO exposes Prometheus metrics:

```bash
# Scrape MinIO metrics
curl http://localhost:9000/minio/v2/metrics/cluster \
  -H "Authorization: Bearer $(docker exec minio mc admin prometheus generate local | grep bearer_token | awk '{print $2}')"
```

## Event Notifications

MinIO can send notifications when objects are created or deleted. Configure it to send events to a webhook:

```bash
# Configure webhook notification target
docker run --rm --network host minio/mc sh -c "
  mc alias set local http://localhost:9000 admin supersecretpassword
  mc event add local/my-bucket arn:minio:sqs::1:webhook --event put,delete
"
```

## Conclusion

MinIO in Docker provides S3-compatible object storage that works everywhere. For development, it eliminates the need for cloud accounts and network access. For production, distributed mode offers high availability and data protection. The S3 API compatibility means you can develop against MinIO locally and deploy to AWS S3, or vice versa, without changing your application code. Start with a single-node setup, use the standard AWS SDKs in your applications, and move to distributed mode when you need redundancy.
