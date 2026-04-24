# How to Schedule Automatic Backups to S3 in Portainer Business Edition

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Backup, S3, AWS, Business Edition, Automation

Description: Configure automated scheduled backups of Portainer Business Edition to Amazon S3 or S3-compatible storage for disaster recovery and compliance.

## Introduction

Portainer Business Edition includes built-in scheduled backup functionality that can automatically push backup archives to Amazon S3 or any S3-compatible storage (MinIO, Backblaze B2, Cloudflare R2). You can optionally encrypt those backups with a password. This ensures your Portainer configuration is automatically protected without manual intervention.

## Prerequisites

- Portainer Business Edition (BE)
- An S3 bucket (AWS S3, MinIO, Backblaze B2, or Cloudflare R2)
- Credentials with access to the target S3 bucket
- Portainer admin access

## Step 1: Create an S3 Bucket

```bash
# Using AWS CLI

aws s3 mb s3://my-portainer-backups --region us-east-1

# Enable versioning (recommended for backups)
aws s3api put-bucket-versioning \
  --bucket my-portainer-backups \
  --versioning-configuration Status=Enabled

# Set lifecycle policy to delete old backups
cat > /tmp/lifecycle.json << 'EOF'
{
  "Rules": [
    {
      "ID": "delete-old-backups",
      "Status": "Enabled",
      "Filter": {"Prefix": "portainer/"},
      "Expiration": {"Days": 30},
      "NoncurrentVersionExpiration": {"NoncurrentDays": 7}
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket my-portainer-backups \
  --lifecycle-configuration file:///tmp/lifecycle.json
```

## Step 2: Create an IAM User for Portainer Backups

```bash
# Create a dedicated IAM user
aws iam create-user --user-name portainer-backup

# Create a policy scoped to the backup bucket
cat > /tmp/portainer-backup-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-portainer-backups",
        "arn:aws:s3:::my-portainer-backups/*"
      ]
    }
  ]
}
EOF

aws iam put-user-policy \
  --user-name portainer-backup \
  --policy-name portainer-backup-policy \
  --policy-document file:///tmp/portainer-backup-policy.json

# Create access keys
aws iam create-access-key --user-name portainer-backup
# Save the AccessKeyId and SecretAccessKey
```

## Step 3: Configure S3 Backup in Portainer UI

1. Log in to Portainer Business Edition
2. Go to **Settings**
3. Scroll down to **Back up Portainer**
4. Select **Store in S3**
5. Configure:
   - **S3 Compatible Host**: (leave empty for AWS, or enter endpoint for MinIO)
   - **Region**: your S3 region (e.g., `us-east-1`)
   - **Bucket name**: `my-portainer-backups/portainer/` if you want to store backups under a prefix (end the prefix with a trailing slash)
   - **Access Key ID / Secret Access Key**: your bucket credentials
   - **Schedule automatic backups**: enable this to run on a schedule
   - **Cron rule**: cron expression for when to run backups
   - **Password protect**: enable this if you want an encrypted backup archive
   - **Password**: encryption password for the backup archive
6. Click **Save settings**
7. Click **Export backup** to test

## Step 4: Configure via API

```bash
PORTAINER_URL=https://localhost:9443

TOKEN=$(curl -sk -X POST "$PORTAINER_URL/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' | jq -r .jwt)

# Configure S3 backup settings
curl -sk -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/backup/s3/settings" \
  -d '{
    "accessKeyID": "AKIAIOSFODNN7EXAMPLE",
    "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "region": "us-east-1",
    "bucketName": "my-portainer-backups/portainer/",
    "s3CompatibleHost": "",
    "cronRule": "0 2 * * *",
    "password": "your-encryption-password"
  }'
```

## Step 5: Configure for S3-Compatible Storage

### MinIO

```bash
# In Portainer UI:
# S3 Compatible Host: http://minio.yourdomain.com:9000
# Region: us-east-1 (or the region configured for your MinIO deployment)
# Bucket name: portainer-backups
# Access Key: your-minio-access-key
# Secret Key: your-minio-secret-key
```

### Backblaze B2

```bash
# In Portainer UI:
# S3 Compatible Host: https://s3.us-west-004.backblazeb2.com
# Region: us-west-004 (your B2 region)
# Bucket name: your-b2-bucket-name
# Access Key: your-b2-key-id
# Secret Key: your-b2-application-key
```

### Cloudflare R2

```bash
# In Portainer UI:
# S3 Compatible Host: https://ACCOUNT_ID.r2.cloudflarestorage.com
# Region: auto
# Bucket name: portainer-backups
# Access Key: your-r2-access-key-id
# Secret Key: your-r2-secret-access-key
```

## Step 6: Set a Backup Schedule

The schedule uses standard cron syntax:

```text
# Examples:
"0 2 * * *"     # Daily at 2 AM
"0 */12 * * *"  # Every 12 hours
"0 2 * * 0"     # Weekly on Sunday at 2 AM
"0 2 1 * *"     # Monthly on the 1st at 2 AM
```

## Step 7: Verify Backups Are Running

```bash
# Check S3 for backup files
aws s3 ls s3://my-portainer-backups/portainer/ --recursive

# Example output (filename varies):
# 2026-03-20 02:00:15    456789 portainer/<backup-filename>
# If password protection is enabled, the object name may end with .encrypted

# Check backup file size
aws s3 ls s3://my-portainer-backups/portainer/ \
  --recursive --human-readable --summarize
```

## Step 8: Test Restore from S3

Verify you can actually restore before you need to:

```bash
# Start a fresh test instance with an empty data volume
docker stop portainer-test 2>/dev/null || true
docker rm portainer-test 2>/dev/null || true
docker volume rm portainer_data_test 2>/dev/null || true

docker run -d \
  --name portainer-test \
  -p 9444:9443 -p 9001:9000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data_test:/data \
  portainer/portainer-ee:lts

# Open https://localhost:9444 on the fresh test instance
# Expand "Restore Portainer from backup" during initial setup
# Choose "Retrieve from S3" and enter the same S3 settings
# Use the exact filename shown by `aws s3 ls`
# Enter the backup password if password protection was enabled
```

## Step 9: Monitor Backup Status

```bash
# Check the status of the last scheduled backup run
curl -sk https://localhost:9443/api/backup/s3/status | jq

# Example output:
# {
#   "Failed": false,
#   "TimestampUTC": "2026-03-20T02:00:15Z"
# }

# Check Portainer logs for backup activity
PORTAINER_CONTAINER=portainer
docker logs "$PORTAINER_CONTAINER" 2>&1 | grep -i "backup\|s3" | tail -10

# Alert if Failed becomes true or TimestampUTC stops advancing
```

## Conclusion

Portainer Business Edition's S3 backup integration provides automated backups, with optional password protection, and minimal operational overhead. Configure it once, verify it works by testing a restore, and then forget about it - your Portainer configuration is protected. Use the lifecycle policy on your S3 bucket to automatically age out old backups and control storage costs.
