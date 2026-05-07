# How to Run Minio in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, MinIO, Object Storage, S3 Compatible

Description: Learn how to run Minio in a Podman container for S3-compatible object storage with persistent data, bucket management, and the web console.

---

> Minio in Podman provides S3-compatible object storage in a rootless container, giving you a local cloud storage backend for development and testing.

Minio is a high-performance, S3-compatible object storage system designed for large-scale data infrastructure. Running it in a Podman container gives you a local, API-compatible alternative to Amazon S3 that is perfect for development, testing, and self-hosted storage. This guide covers setup, bucket management, file operations, and persistent storage configuration.

---

## Pulling the Minio Image

Download the official Minio image.

```bash
# Pull the latest Minio image

podman pull quay.io/minio/minio:latest

# Verify the image
podman images | grep minio
```

## Running a Basic Minio Container

Start Minio with default credentials.

```bash
# Run Minio with API on port 9000 and console on port 9001
podman run -d \
  --name my-minio \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin123 \
  quay.io/minio/minio:latest server /data --console-address ":9001"

# Check the container is running
podman ps

# Access the Minio console
echo "Open http://localhost:9001 in your browser"
echo "Username: minioadmin"
echo "Password: minioadmin123"

# Verify the API endpoint
curl -s http://localhost:9000/minio/health/live
```

## Persistent Object Storage

Use a named volume to persist your stored objects.

```bash
# Create a volume for Minio data
podman volume create minio-data

# Run Minio with persistent storage
podman run -d \
  --name minio-persistent \
  -p 9002:9000 \
  -p 9003:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin123 \
  -v minio-data:/data:Z \
  quay.io/minio/minio:latest server /data --console-address ":9001"

# Verify the volume
podman volume inspect minio-data
```

## Using the Minio Client (mc)

Install and configure the Minio client for command-line operations.

```bash
# Pull the Minio client image
podman pull quay.io/minio/mc:latest

# Create a volume for Minio client configuration
podman volume create mc-config

# Configure the client to connect to our Minio instance
podman run --rm \
  -v mc-config:/root/.mc:Z \
  quay.io/minio/mc:latest \
  alias set local http://host.containers.internal:9000 minioadmin minioadmin123

# Create a bucket
podman run --rm \
  -v mc-config:/root/.mc:Z \
  quay.io/minio/mc:latest \
  mb local/my-bucket

# List all buckets
podman run --rm \
  -v mc-config:/root/.mc:Z \
  quay.io/minio/mc:latest \
  ls local/
```

## Working with Objects Using curl

Interact with Minio using the S3-compatible REST API.

```bash
# Create a bucket using the API
curl -s -X PUT http://localhost:9000/test-bucket \
  --aws-sigv4 "aws:amz:us-east-1:s3" \
  -u "minioadmin:minioadmin123"

# Upload a file
echo "Hello from Minio on Podman!" > /tmp/hello.txt
curl -s -X PUT http://localhost:9000/test-bucket/hello.txt \
  --aws-sigv4 "aws:amz:us-east-1:s3" \
  -u "minioadmin:minioadmin123" \
  -T /tmp/hello.txt

# Download the file
curl -s http://localhost:9000/test-bucket/hello.txt \
  --aws-sigv4 "aws:amz:us-east-1:s3" \
  -u "minioadmin:minioadmin123"

# List objects in a bucket
curl -s http://localhost:9000/test-bucket \
  --aws-sigv4 "aws:amz:us-east-1:s3" \
  -u "minioadmin:minioadmin123"
```

## Custom Minio Configuration

Configure Minio with environment variables for advanced settings.

```bash
# Run Minio with custom configuration
podman volume create minio-custom-data

podman run -d \
  --name minio-custom \
  -p 9004:9000 \
  -p 9005:9001 \
  -e MINIO_ROOT_USER=myadmin \
  -e MINIO_ROOT_PASSWORD=my-strong-password-123 \
  -e MINIO_BROWSER=on \
  -e MINIO_REGION_NAME=us-east-1 \
  -e MINIO_PROMETHEUS_AUTH_TYPE=public \
  -v minio-custom-data:/data:Z \
  quay.io/minio/minio:latest server /data --console-address ":9001"

# Verify the custom configuration
curl -s http://localhost:9004/minio/health/live
```

## Setting Up Bucket Policies

Configure access policies for your buckets.

```bash
# Create a policy file for public read access
cat > /tmp/public-read-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::public-bucket/*"]
    }
  ]
}
EOF

# Apply the policy using mc
podman run --rm \
  -v mc-config:/root/.mc:Z \
  quay.io/minio/mc:latest \
  mb local/public-bucket

podman run --rm \
  -v mc-config:/root/.mc:Z \
  -v /tmp/public-read-policy.json:/tmp/policy.json:Z \
  quay.io/minio/mc:latest \
  anonymous set-json /tmp/policy.json local/public-bucket
```

## Monitoring Minio

Check the health and metrics of your Minio instance.

```bash
# Check server health
curl -s http://localhost:9000/minio/health/live
curl -s http://localhost:9000/minio/health/cluster

# Get Prometheus-compatible metrics
curl -s http://localhost:9004/minio/v2/metrics/cluster | head -30

# Check read quorum
curl -s http://localhost:9000/minio/health/cluster/read
```

## Managing the Container

Common management operations.

```bash
# View Minio logs
podman logs my-minio

# Stop and start
podman stop my-minio
podman start my-minio

# Remove containers and volumes
podman rm -f my-minio minio-persistent minio-custom
podman volume rm minio-data minio-custom-data mc-config
```

## Summary

Running Minio in a Podman container gives you S3-compatible object storage locally, making it ideal for developing and testing applications that use cloud storage APIs. The web console provides visual bucket and object management, while the mc client and REST API enable command-line operations. Named volumes ensure your stored objects persist across container restarts. Minio's S3 compatibility means you can switch between Minio and AWS S3 without changing your application code. Podman's rootless execution adds a security layer to your storage infrastructure.
