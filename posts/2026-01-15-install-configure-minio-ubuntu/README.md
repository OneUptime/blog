# How to Install and Configure MinIO on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, MinIO, Object Storage, S3, Cloud Native, Tutorial

Description: Complete guide to installing MinIO on Ubuntu for S3-compatible object storage in your infrastructure.

---

MinIO is a high-performance, S3-compatible object storage system. It's designed for large-scale data infrastructure, machine learning, and cloud-native applications. This guide covers MinIO installation and configuration on Ubuntu.

## Features

- S3 API compatible
- High performance (read/write speeds)
- Kubernetes native
- Erasure coding
- Bitrot protection
- Encryption at rest

## Prerequisites

- Ubuntu 20.04 or later
- At least 2GB RAM
- Sufficient disk space
- Root or sudo access

## Installation Methods

### Method 1: Download Binary

```bash
# Download MinIO server
wget https://dl.min.io/server/minio/release/linux-amd64/minio

# Make executable
chmod +x minio

# Move to path
sudo mv minio /usr/local/bin/

# Verify
minio --version
```

### Method 2: Using .deb Package

```bash
# Download package
wget https://dl.min.io/server/minio/release/linux-amd64/minio_20240101000000.0.0_amd64.deb

# Install
sudo dpkg -i minio*.deb
```

## Quick Start

```bash
# Start MinIO with single drive
minio server /data

# Start with console port
minio server /data --console-address ":9001"

# Access:
# API: http://localhost:9000
# Console: http://localhost:9001
# Default credentials: minioadmin / minioadmin
```

## Production Configuration

### Create User and Directories

```bash
# Create minio user
sudo useradd -r -s /sbin/nologin minio-user

# Create data directories
sudo mkdir -p /mnt/data1 /mnt/data2 /mnt/data3 /mnt/data4

# Set ownership
sudo chown -R minio-user:minio-user /mnt/data1 /mnt/data2 /mnt/data3 /mnt/data4
```

### Environment Configuration

```bash
sudo nano /etc/default/minio
```

```bash
# MinIO environment configuration

# Root credentials
MINIO_ROOT_USER=minio-admin
MINIO_ROOT_PASSWORD=YourStrongPassword123!

# Volume paths (for erasure coding, minimum 4 drives)
MINIO_VOLUMES="/mnt/data{1...4}"

# Console address
MINIO_OPTS="--console-address :9001"

# Region (optional)
MINIO_REGION=us-east-1

# Browser enable/disable
MINIO_BROWSER=on
```

### Systemd Service

```bash
sudo nano /etc/systemd/system/minio.service
```

```ini
[Unit]
Description=MinIO Object Storage
Documentation=https://docs.min.io
Wants=network-online.target
After=network-online.target
AssertFileIsExecutable=/usr/local/bin/minio

[Service]
User=minio-user
Group=minio-user
EnvironmentFile=/etc/default/minio
ExecStart=/usr/local/bin/minio server $MINIO_VOLUMES $MINIO_OPTS
Restart=always
RestartSec=5
LimitNOFILE=65536
TasksMax=infinity
TimeoutStopSec=infinity
SendSIGKILL=no

[Install]
WantedBy=multi-user.target
```

### Start MinIO

```bash
# Start service
sudo systemctl daemon-reload
sudo systemctl start minio
sudo systemctl enable minio

# Check status
sudo systemctl status minio

# Check logs
sudo journalctl -u minio -f
```

## Install MinIO Client (mc)

```bash
# Download mc
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/

# Configure alias
mc alias set myminio http://localhost:9000 minio-admin YourStrongPassword123!

# Test connection
mc admin info myminio
```

## Bucket Management

### Create Buckets

```bash
# Create bucket
mc mb myminio/mybucket

# Create with versioning
mc mb myminio/versioned-bucket
mc version enable myminio/versioned-bucket

# Create with object locking
mc mb myminio/locked-bucket --with-lock
```

### Upload/Download Objects

```bash
# Upload file
mc cp myfile.txt myminio/mybucket/

# Upload directory
mc cp --recursive mydir/ myminio/mybucket/

# Download file
mc cp myminio/mybucket/myfile.txt ./

# Sync directory
mc mirror mydir/ myminio/mybucket/
```

### List and Delete

```bash
# List buckets
mc ls myminio

# List objects
mc ls myminio/mybucket

# List recursively
mc ls --recursive myminio/mybucket

# Delete object
mc rm myminio/mybucket/myfile.txt

# Delete bucket (must be empty)
mc rb myminio/mybucket

# Force delete bucket and contents
mc rb --force myminio/mybucket
```

## Access Control

### Create User

```bash
# Create user
mc admin user add myminio newuser userpassword

# List users
mc admin user list myminio

# Disable user
mc admin user disable myminio newuser

# Enable user
mc admin user enable myminio newuser
```

### Create Policy

```bash
# Create policy file
cat > bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::mybucket/*",
        "arn:aws:s3:::mybucket"
      ]
    }
  ]
}
EOF

# Add policy
mc admin policy create myminio mybucket-policy bucket-policy.json

# Attach policy to user
mc admin policy attach myminio mybucket-policy --user newuser
```

### Service Accounts

```bash
# Create service account
mc admin user svcacct add myminio newuser --access-key myaccesskey --secret-key mysecretkey

# List service accounts
mc admin user svcacct list myminio newuser
```

## Bucket Policies

### Public Read Access

```bash
# Set bucket policy to download only
mc anonymous set download myminio/public-bucket

# Set upload access
mc anonymous set upload myminio/upload-bucket

# Set full public access
mc anonymous set public myminio/public-bucket

# Remove public access
mc anonymous set none myminio/mybucket
```

### Custom Bucket Policy

```bash
# Apply custom policy
mc anonymous set-json bucket-policy.json myminio/mybucket
```

## TLS/HTTPS Configuration

### Generate Certificates

```bash
# Create certs directory
sudo mkdir -p /home/minio-user/.minio/certs

# Generate self-signed certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /home/minio-user/.minio/certs/private.key \
    -out /home/minio-user/.minio/certs/public.crt \
    -subj "/CN=minio.example.com"

sudo chown -R minio-user:minio-user /home/minio-user/.minio
```

### Let's Encrypt

```bash
# Install certbot
sudo apt install certbot -y

# Get certificate
sudo certbot certonly --standalone -d minio.example.com

# Copy to MinIO certs directory
sudo cp /etc/letsencrypt/live/minio.example.com/fullchain.pem /home/minio-user/.minio/certs/public.crt
sudo cp /etc/letsencrypt/live/minio.example.com/privkey.pem /home/minio-user/.minio/certs/private.key
sudo chown -R minio-user:minio-user /home/minio-user/.minio/certs/
```

## Distributed Mode

### Multi-Node Setup

```bash
# /etc/default/minio on each node
MINIO_ROOT_USER=minio-admin
MINIO_ROOT_PASSWORD=YourStrongPassword123!

# Distributed volumes
MINIO_VOLUMES="http://node{1...4}.example.com:9000/mnt/data{1...4}"

MINIO_OPTS="--console-address :9001"
```

### Erasure Coding

MinIO automatically uses erasure coding with multiple drives:

```bash
# Minimum 4 drives required
MINIO_VOLUMES="/mnt/data{1...4}"

# For more drives (4-16 per node)
MINIO_VOLUMES="/mnt/data{1...16}"
```

## Lifecycle Management

### Configure Lifecycle Rules

```bash
# Create lifecycle configuration
cat > lifecycle.json << EOF
{
  "Rules": [
    {
      "ID": "expire-after-30-days",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "logs/"
      },
      "Expiration": {
        "Days": 30
      }
    },
    {
      "ID": "transition-to-glacier",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "archive/"
      },
      "Transition": {
        "Days": 90,
        "StorageClass": "GLACIER"
      }
    }
  ]
}
EOF

# Apply lifecycle
mc ilm import myminio/mybucket < lifecycle.json
```

## Event Notifications

### Configure Webhook

```bash
# Add webhook target
mc admin config set myminio notify_webhook:mywebhook \
    endpoint="http://app.example.com/minio-events" \
    queue_limit="10000"

# Restart MinIO
sudo systemctl restart minio

# Configure bucket notification
mc event add myminio/mybucket arn:minio:sqs::mywebhook:webhook --event put
```

### Configure Kafka

```bash
mc admin config set myminio notify_kafka:mykafka \
    brokers="kafka1:9092,kafka2:9092" \
    topic="minio-events"
```

## Monitoring

### Prometheus Metrics

```bash
# Enable Prometheus scraping
# Access metrics at: http://localhost:9000/minio/v2/metrics/cluster

# Prometheus scrape config
scrape_configs:
  - job_name: 'minio'
    metrics_path: /minio/v2/metrics/cluster
    static_configs:
      - targets: ['minio.example.com:9000']
```

### Health Check

```bash
# Cluster health
mc admin info myminio

# Disk health
mc admin scanner myminio

# Healing status
mc admin heal myminio
```

## Backup and Recovery

### mc mirror

```bash
# Mirror to another MinIO
mc alias set backup s3://backup-minio.example.com backup-key backup-secret
mc mirror myminio/mybucket backup/mybucket

# Continuous sync
mc mirror --watch myminio/mybucket backup/mybucket
```

### Resync

```bash
# Resync bucket
mc admin replicate resync start myminio mybucket
```

## S3 SDK Integration

### Python (boto3)

```python
import boto3

# Create client
s3 = boto3.client(
    's3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='minio-admin',
    aws_secret_access_key='YourStrongPassword123!',
    region_name='us-east-1'
)

# Upload file
s3.upload_file('myfile.txt', 'mybucket', 'myfile.txt')

# Download file
s3.download_file('mybucket', 'myfile.txt', 'downloaded.txt')

# List objects
response = s3.list_objects_v2(Bucket='mybucket')
for obj in response.get('Contents', []):
    print(obj['Key'])
```

### AWS CLI

```bash
# Configure AWS CLI
aws configure set aws_access_key_id minio-admin
aws configure set aws_secret_access_key YourStrongPassword123!

# Use with endpoint
aws --endpoint-url http://localhost:9000 s3 ls
aws --endpoint-url http://localhost:9000 s3 cp myfile.txt s3://mybucket/
```

## Troubleshooting

### Check Logs

```bash
# Service logs
sudo journalctl -u minio -f

# Admin info
mc admin info myminio

# Check configuration
mc admin config get myminio
```

### Common Issues

```bash
# Permission denied
sudo chown -R minio-user:minio-user /mnt/data*

# Disk errors
mc admin scanner myminio

# Heal corrupted data
mc admin heal -r myminio/mybucket
```

---

MinIO provides enterprise-grade object storage with S3 compatibility. It's ideal for cloud-native applications, machine learning data, and backup storage. For monitoring your MinIO deployment, consider using OneUptime for comprehensive infrastructure monitoring.
