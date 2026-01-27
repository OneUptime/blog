# How to Set Up MinIO for S3-Compatible Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MinIO, S3, Object Storage, Self-Hosted, Storage

Description: Learn how to deploy MinIO for S3-compatible object storage, including single-node and distributed setups, bucket policies, and client configuration.

---

> MinIO lets you run your own S3-compatible object storage - same API, your infrastructure, your rules.

Object storage has become the default for logs, backups, container images, and data lakes. AWS S3 set the standard, but locking your data into a single vendor creates cost and portability problems. MinIO offers a drop-in S3-compatible alternative that runs anywhere - from a single Raspberry Pi to a distributed cluster spanning data centers.

## What is MinIO and Why Use It

MinIO is a high-performance, Kubernetes-native object storage server. It implements the S3 API, meaning any tool or SDK built for AWS S3 works with MinIO without code changes.

Reasons to choose MinIO:

- **S3 API compatibility:** Use existing tools like `aws-cli`, Terraform S3 backends, and language SDKs.
- **Performance:** Written in Go, optimized for NVMe drives, benchmarks show multi-GB/s throughput.
- **Self-hosted control:** Your data stays on your infrastructure - no egress fees, no vendor lock-in.
- **Simple operations:** Single binary, minimal dependencies, runs as a container or systemd service.
- **Distributed mode:** Scale horizontally with erasure coding for fault tolerance.

## Single-Node Installation with Docker

The fastest way to get started is Docker. This gives you a working S3-compatible endpoint in under a minute.

```bash
# Create a data directory for MinIO
mkdir -p ~/minio/data

# Run MinIO in standalone mode
# MINIO_ROOT_USER and MINIO_ROOT_PASSWORD are your admin credentials
docker run -d \
  --name minio \
  -p 9000:9000 \
  -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin123" \
  -v ~/minio/data:/data \
  quay.io/minio/minio server /data --console-address ":9001"
```

After running this:
- **S3 API endpoint:** `http://localhost:9000`
- **Web console:** `http://localhost:9001`

For production, use strong credentials and persist them in a secrets manager.

## Single-Node Installation with Binary

If you prefer running MinIO directly on the host without Docker:

```bash
# Download the MinIO binary (Linux amd64)
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio

# Move to a standard location
sudo mv minio /usr/local/bin/

# Create data directory
sudo mkdir -p /data/minio

# Create a dedicated user
sudo useradd -r minio-user -s /sbin/nologin

# Set ownership
sudo chown minio-user:minio-user /data/minio
```

Create a systemd service file at `/etc/systemd/system/minio.service`:

```ini
[Unit]
Description=MinIO Object Storage
Documentation=https://min.io/docs/minio/linux/index.html
After=network-online.target
Wants=network-online.target

[Service]
User=minio-user
Group=minio-user
EnvironmentFile=/etc/default/minio
ExecStart=/usr/local/bin/minio server /data/minio --console-address ":9001"
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

Create the environment file at `/etc/default/minio`:

```bash
# MinIO credentials - use strong values in production
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123

# Optional: Set custom region
MINIO_REGION=us-east-1
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable minio
sudo systemctl start minio
sudo systemctl status minio
```

## Distributed MinIO Setup

For production workloads requiring high availability and fault tolerance, run MinIO in distributed mode. This uses erasure coding to survive disk and node failures.

Minimum requirements for distributed mode:
- At least 4 drives across 1 or more nodes
- Equal storage capacity on each drive
- Reliable network between nodes

Example: 4-node cluster with 4 drives each (16 drives total):

```bash
# Run on each node, adjusting the hostname
# This command should be identical on all nodes
minio server \
  http://minio{1...4}.example.com/data{1...4} \
  --console-address ":9001"
```

For Docker Compose, create `docker-compose.yml`:

```yaml
version: '3.8'

# Distributed MinIO with 4 nodes
# Each node has 2 drives for a total of 8 drives
# Minimum for erasure coding with half-drive fault tolerance

x-minio-common: &minio-common
  image: quay.io/minio/minio:latest
  command: server --console-address ":9001" http://minio{1...4}/data{1...2}
  environment:
    MINIO_ROOT_USER: minioadmin
    MINIO_ROOT_PASSWORD: minioadmin123
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
    interval: 30s
    timeout: 20s
    retries: 3

services:
  minio1:
    <<: *minio-common
    hostname: minio1
    volumes:
      - minio1-data1:/data1
      - minio1-data2:/data2

  minio2:
    <<: *minio-common
    hostname: minio2
    volumes:
      - minio2-data1:/data1
      - minio2-data2:/data2

  minio3:
    <<: *minio-common
    hostname: minio3
    volumes:
      - minio3-data1:/data1
      - minio3-data2:/data2

  minio4:
    <<: *minio-common
    hostname: minio4
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio4-data1:/data1
      - minio4-data2:/data2

  # Load balancer for production use
  nginx:
    image: nginx:alpine
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - minio1
      - minio2
      - minio3
      - minio4

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

## Creating Buckets and Users

Once MinIO is running, create buckets and service accounts using the web console or the `mc` CLI.

### Using the Web Console

1. Open `http://localhost:9001` in your browser
2. Log in with your root credentials
3. Navigate to Buckets and click "Create Bucket"
4. Navigate to Identity > Users to create service accounts

### Using mc (MinIO Client)

Install the MinIO client:

```bash
# Linux
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/

# macOS
brew install minio/stable/mc
```

Configure an alias for your MinIO server:

```bash
# Add an alias pointing to your MinIO instance
# Format: mc alias set ALIAS ENDPOINT ACCESS_KEY SECRET_KEY
mc alias set myminio http://localhost:9000 minioadmin minioadmin123
```

Common bucket operations:

```bash
# Create a bucket
mc mb myminio/my-bucket

# List all buckets
mc ls myminio

# Upload a file
mc cp ./myfile.txt myminio/my-bucket/

# Upload a directory recursively
mc cp --recursive ./mydir/ myminio/my-bucket/

# Download a file
mc cp myminio/my-bucket/myfile.txt ./

# List bucket contents
mc ls myminio/my-bucket

# Remove a file
mc rm myminio/my-bucket/myfile.txt

# Remove a bucket (must be empty)
mc rb myminio/my-bucket

# Force remove bucket and all contents
mc rb --force myminio/my-bucket
```

## Access Policies and IAM

MinIO supports fine-grained access control through IAM policies compatible with AWS IAM syntax.

### Creating a Service Account

```bash
# Create a user with access key and secret key
mc admin user add myminio myapp-user myapp-secret-key

# List users
mc admin user list myminio
```

### Attaching Policies

MinIO includes built-in policies:

- `readonly` - Read-only access to all buckets
- `writeonly` - Write-only access to all buckets
- `readwrite` - Full access to all buckets
- `diagnostics` - Access to server diagnostics
- `consoleAdmin` - Full console access

```bash
# Attach a built-in policy to a user
mc admin policy attach myminio readwrite --user myapp-user

# List attached policies
mc admin user info myminio myapp-user
```

### Creating Custom Policies

Create a custom policy for bucket-specific access. Save as `my-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-bucket",
        "arn:aws:s3:::my-bucket/*"
      ]
    }
  ]
}
```

Apply the custom policy:

```bash
# Create the policy
mc admin policy create myminio my-policy ./my-policy.json

# Attach to user
mc admin policy attach myminio my-policy --user myapp-user
```

## Using AWS SDK with MinIO

Any S3-compatible SDK works with MinIO. You just need to configure the endpoint URL.

### Python (boto3)

```python
import boto3
from botocore.config import Config

# Create a client pointing to MinIO
# endpoint_url tells boto3 to use MinIO instead of AWS
s3_client = boto3.client(
    's3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin123',
    config=Config(signature_version='s3v4'),
    region_name='us-east-1'
)

# Create a bucket
s3_client.create_bucket(Bucket='test-bucket')

# Upload a file
s3_client.upload_file('local-file.txt', 'test-bucket', 'remote-file.txt')

# Download a file
s3_client.download_file('test-bucket', 'remote-file.txt', 'downloaded.txt')

# List objects
response = s3_client.list_objects_v2(Bucket='test-bucket')
for obj in response.get('Contents', []):
    print(f"  {obj['Key']} - {obj['Size']} bytes")

# Generate presigned URL for temporary access
# URL expires after 3600 seconds (1 hour)
url = s3_client.generate_presigned_url(
    'get_object',
    Params={'Bucket': 'test-bucket', 'Key': 'remote-file.txt'},
    ExpiresIn=3600
)
print(f"Presigned URL: {url}")
```

### Node.js (AWS SDK v3)

```javascript
const {
  S3Client,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');

// Configure the S3 client for MinIO
// forcePathStyle is required for MinIO compatibility
const s3Client = new S3Client({
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin123'
  },
  forcePathStyle: true
});

async function main() {
  // Create a bucket
  await s3Client.send(new CreateBucketCommand({ Bucket: 'test-bucket' }));

  // Upload a file
  const fileContent = fs.readFileSync('local-file.txt');
  await s3Client.send(new PutObjectCommand({
    Bucket: 'test-bucket',
    Key: 'remote-file.txt',
    Body: fileContent
  }));

  // List objects
  const listResponse = await s3Client.send(new ListObjectsV2Command({
    Bucket: 'test-bucket'
  }));

  console.log('Objects in bucket:');
  for (const obj of listResponse.Contents || []) {
    console.log(`  ${obj.Key} - ${obj.Size} bytes`);
  }

  // Generate presigned URL
  const command = new GetObjectCommand({
    Bucket: 'test-bucket',
    Key: 'remote-file.txt'
  });
  const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  console.log(`Presigned URL: ${presignedUrl}`);
}

main().catch(console.error);
```

### Go

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/minio/minio-go/v7"
    "github.com/minio/minio-go/v7/pkg/credentials"
)

func main() {
    ctx := context.Background()

    // Initialize MinIO client
    // useSSL should be true if using HTTPS
    minioClient, err := minio.New("localhost:9000", &minio.Options{
        Creds:  credentials.NewStaticV4("minioadmin", "minioadmin123", ""),
        Secure: false,
    })
    if err != nil {
        log.Fatalln(err)
    }

    // Create a bucket
    bucketName := "test-bucket"
    err = minioClient.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{
        Region: "us-east-1",
    })
    if err != nil {
        // Check if bucket already exists
        exists, errBucketExists := minioClient.BucketExists(ctx, bucketName)
        if errBucketExists == nil && exists {
            fmt.Println("Bucket already exists")
        } else {
            log.Fatalln(err)
        }
    }

    // Upload a file
    objectName := "remote-file.txt"
    filePath := "local-file.txt"
    info, err := minioClient.FPutObject(ctx, bucketName, objectName, filePath, minio.PutObjectOptions{
        ContentType: "text/plain",
    })
    if err != nil {
        log.Fatalln(err)
    }
    fmt.Printf("Uploaded %s of size %d\n", objectName, info.Size)

    // List objects
    objectCh := minioClient.ListObjects(ctx, bucketName, minio.ListObjectsOptions{
        Recursive: true,
    })
    for object := range objectCh {
        if object.Err != nil {
            log.Fatalln(object.Err)
        }
        fmt.Printf("  %s - %d bytes\n", object.Key, object.Size)
    }
}
```

## TLS Configuration

For production deployments, enable TLS to encrypt data in transit.

### Using Let's Encrypt Certificates

Place your certificates in the MinIO certs directory:

```bash
# Create certs directory
mkdir -p ~/.minio/certs

# Copy certificates (rename to public.crt and private.key)
cp fullchain.pem ~/.minio/certs/public.crt
cp privkey.pem ~/.minio/certs/private.key

# Set proper permissions
chmod 600 ~/.minio/certs/private.key
chmod 644 ~/.minio/certs/public.crt
```

MinIO automatically detects certificates in this directory and enables HTTPS.

### Docker with TLS

```bash
docker run -d \
  --name minio \
  -p 9000:9000 \
  -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin123" \
  -v ~/minio/data:/data \
  -v ~/minio/certs:/root/.minio/certs \
  quay.io/minio/minio server /data --console-address ":9001"
```

### Self-Signed Certificates for Development

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ~/.minio/certs/private.key \
  -out ~/.minio/certs/public.crt \
  -subj "/CN=localhost"

# When using mc with self-signed certs, add --insecure flag
mc alias set myminio https://localhost:9000 minioadmin minioadmin123 --insecure
```

## Monitoring and Metrics

MinIO exposes Prometheus metrics for monitoring performance and health.

### Enabling Prometheus Metrics

Metrics are available at `/minio/v2/metrics/cluster` and `/minio/v2/metrics/node`.

Create a Prometheus scrape config:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'minio'
    metrics_path: /minio/v2/metrics/cluster
    scheme: http
    static_configs:
      - targets: ['localhost:9000']
    # If using authentication
    bearer_token: 'your-bearer-token'
```

Generate a bearer token for Prometheus:

```bash
# Generate a token for metrics access
mc admin prometheus generate myminio
```

### Key Metrics to Monitor

```yaml
# Important MinIO metrics for dashboards and alerts

# Bucket metrics
minio_bucket_usage_total_bytes       # Total bytes stored per bucket
minio_bucket_objects_count           # Number of objects per bucket

# Request metrics
minio_s3_requests_total              # Total S3 requests by type
minio_s3_requests_errors_total       # Failed requests
minio_s3_requests_ttfb_seconds       # Time to first byte

# Network metrics
minio_s3_traffic_received_bytes      # Incoming traffic
minio_s3_traffic_sent_bytes          # Outgoing traffic

# Disk metrics
minio_node_disk_free_bytes           # Free disk space
minio_node_disk_total_bytes          # Total disk space
minio_node_disk_used_bytes           # Used disk space

# Cluster health (distributed mode)
minio_cluster_nodes_online           # Number of online nodes
minio_cluster_nodes_offline          # Number of offline nodes
```

### Health Check Endpoints

MinIO provides health check endpoints for load balancers and orchestrators:

```bash
# Liveness check - returns 200 if server is running
curl http://localhost:9000/minio/health/live

# Readiness check - returns 200 if server can handle requests
curl http://localhost:9000/minio/health/ready

# Cluster health (distributed mode)
curl http://localhost:9000/minio/health/cluster
```

## Backup Strategies

Object storage holds critical data. Implement proper backup strategies.

### Mirror to Another MinIO Instance

Use `mc mirror` to replicate buckets to a backup location:

```bash
# Set up aliases for both clusters
mc alias set production http://minio-prod:9000 produser prodpass
mc alias set backup http://minio-backup:9000 backupuser backuppass

# One-time mirror
mc mirror production/my-bucket backup/my-bucket

# Continuous mirror (watches for changes)
mc mirror --watch production/my-bucket backup/my-bucket

# Mirror with delete (sync deletions too)
mc mirror --remove --watch production/my-bucket backup/my-bucket
```

### Backup to Cloud S3

Mirror critical buckets to AWS S3 or another cloud provider:

```bash
# Add AWS S3 alias
mc alias set aws https://s3.amazonaws.com AWS_ACCESS_KEY AWS_SECRET_KEY

# Mirror to S3
mc mirror myminio/my-bucket aws/my-backup-bucket
```

### Site Replication

For enterprise deployments, configure site replication for automatic multi-site synchronization:

```bash
# Add sites to replication
mc admin replicate add myminio1 myminio2 myminio3

# Check replication status
mc admin replicate info myminio1
```

### Versioning for Point-in-Time Recovery

Enable versioning to keep object history:

```bash
# Enable versioning on a bucket
mc version enable myminio/my-bucket

# List object versions
mc ls --versions myminio/my-bucket

# Restore a previous version
mc cp --version-id VERSION_ID myminio/my-bucket/file.txt ./restored-file.txt
```

## Best Practices Summary

1. **Security:** Never use default credentials in production. Rotate access keys regularly. Enable TLS for all traffic.

2. **High Availability:** Run distributed mode with at least 4 drives for erasure coding. Place nodes across failure domains.

3. **Monitoring:** Export Prometheus metrics. Alert on disk usage, request errors, and node health.

4. **Backups:** Mirror critical buckets to a separate location. Enable versioning for important data. Test restores regularly.

5. **Network:** Use a load balancer in front of distributed MinIO. Configure proper health checks.

6. **Performance:** Use SSDs or NVMe for best throughput. Match drive count to your durability requirements.

7. **Access Control:** Create dedicated service accounts per application. Use custom IAM policies to limit bucket access.

8. **Operations:** Automate deployments with Docker Compose or Kubernetes. Use mc for administrative tasks.

MinIO turns commodity hardware into enterprise-grade object storage. Combined with observability tools like [OneUptime](https://oneuptime.com), you can monitor your storage infrastructure alongside your applications for complete visibility into your self-hosted stack.
