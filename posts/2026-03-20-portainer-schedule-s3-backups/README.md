# How to Schedule Automatic Backups to S3 in Portainer Business Edition (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Business Edition, S3, Backup, Automation, AWS, Data Protection

Description: Learn how to configure Portainer Business Edition's built-in S3 backup scheduling to automatically store encrypted backups in AWS S3 or compatible object storage.

---

Portainer Business Edition includes native S3 backup scheduling. It can encrypt the backup with a password and upload it directly to your S3 bucket on a configurable schedule, eliminating the need for external backup scripts.

## Prerequisites

- Portainer Business Edition with a valid license
- An S3 bucket (AWS S3, MinIO, or any S3-compatible storage)
- Credentials for your S3 provider with permission to write to the bucket, plus read access if you also plan to restore from S3

## Configuring S3 Backups

1. Log in to Portainer as an admin user.
2. Go to **Settings**.
3. Scroll to **Back up Portainer**.
4. Select **Store in S3**.
5. Toggle **Schedule automatic backups** if you want scheduled backups, then fill in the S3 configuration.

## S3 Settings

| Setting | Description | Example |
|---|---|---|
| Schedule automatic backups | Enable scheduled backups to S3 | Toggle on |
| Cron rule | Cron expression | `0 2 * * *` (2 AM daily) |
| Access key ID | AWS/MinIO access key. Leave blank to let the AWS SDK resolve credentials from the environment | `AKIAIOSFODNN7EXAMPLE` |
| Secret access key | AWS/MinIO secret key. Leave blank to let the AWS SDK resolve credentials from the environment | `wJalrXUtnFEMI/K7MDENG/...` |
| Region | AWS region | `us-east-1` |
| Bucket name | Target S3 bucket | `portainer-backups` |
| S3 compatible host | URL for non-AWS S3 providers such as MinIO. Leave blank for AWS S3 | `http://minio:9000` |
| Password protect | Enable backup encryption with a password | Toggle on |
| Password | Encryption password used when **Password protect** is enabled | A strong random string |

## Setting Up S3 Permissions

Create an example IAM policy for Portainer backup and restore access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::portainer-backups"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::portainer-backups/*"
    }
  ]
}
```

## Using MinIO as S3 Backend

For self-hosted backup storage, use a local MinIO instance:

| Setting | Value |
|---|---|
| S3 compatible host | `http://minio:9000` |
| Access Key ID | Your MinIO access key |
| Secret Access Key | Your MinIO secret key |
| Bucket name | `portainer-backups` |

## Cron Schedule Examples

```text
# Every day at 2 AM

0 2 * * *

# Every 6 hours
0 */6 * * *

# Every Sunday at midnight
0 0 * * 0
```

## Restoring from S3 Backup

1. Deploy a fresh Portainer instance with an empty data volume.
2. On the initial setup page, expand **Restore Portainer from backup** and select **Retrieve from S3**.
3. Enter the S3 details, the backup filename, and the password if the backup was encrypted.
4. Click **Restore Portainer**.

Portainer will download the backup and, if it was password-protected, decrypt it before restoring your previous Portainer configuration.
