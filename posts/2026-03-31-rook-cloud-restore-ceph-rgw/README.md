# How to Configure Cloud Restore for Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Cloud, Restore, Object Storage, Tiering, Lifecycle

Description: Configure and trigger cloud restore operations in Ceph RGW to bring transitioned objects back from external S3-compatible storage for local access.

---

After objects are transitioned to a cloud-s3 tier in Ceph RGW, they can be restored back to local storage for fast access. This follows the AWS S3 RestoreObject API, where you initiate a restore and then access the object during the restore window.

## Prerequisites

You must have cloud transition already configured (a cloud-s3 zone tier in your RGW zone group). Objects to restore must have been transitioned via lifecycle rules.

## How Cloud Restore Works

1. Client calls `RestoreObject` via the S3 API
2. RGW schedules a restore job to copy the object back from the remote cloud tier
3. After restore completes, the object is available locally for the specified number of days
4. After the restore window expires, the local copy is removed (the cloud copy remains)

## Initiating a Restore

```bash
aws s3api restore-object \
  --bucket mybucket \
  --key archive/myfile.txt \
  --restore-request '{
    "Days": 7,
    "GlacierJobParameters": {
      "Tier": "Standard"
    }
  }' \
  --endpoint-url http://your-rgw-host:7480
```

Supported restore tiers in Ceph RGW:
- `Expedited`: Highest priority
- `Standard`: Default priority
- `Bulk`: Lowest priority

Note: These tiers are accepted for S3 API compatibility. In Ceph RGW cloud-s3 configurations, actual restore speed depends on the remote S3 endpoint performance rather than the tier parameter, unlike AWS Glacier where each tier has distinct retrieval times.

## Checking Restore Status

After initiating a restore, check when it completes:

```bash
aws s3api head-object \
  --bucket mybucket \
  --key archive/myfile.txt \
  --endpoint-url http://your-rgw-host:7480
```

While restoring, the response includes:
```yaml
x-amz-restore: ongoing-request="true"
```

After completion:
```yaml
x-amz-restore: ongoing-request="false", expiry-date="Wed, 07 Apr 2026 00:00:00 GMT"
```

## Downloading the Restored Object

Once restore is complete, download normally:

```bash
aws s3 cp s3://mybucket/archive/myfile.txt ./myfile.txt \
  --endpoint-url http://your-rgw-host:7480
```

## Monitoring Restore Jobs

The most reliable way to monitor restore progress is via HEAD object requests as shown in the "Checking Restore Status" section above. You can also check lifecycle processing activity:

```bash
radosgw-admin lc list
```

To view the lifecycle configuration for a specific bucket:

```bash
radosgw-admin lc get --bucket=mybucket
```

## Automating Restore with Python

```python
import boto3
import time

s3 = boto3.client(
    's3',
    endpoint_url='http://your-rgw-host:7480',
    aws_access_key_id='your-access-key',
    aws_secret_access_key='your-secret-key'
)

# Initiate restore
s3.restore_object(
    Bucket='mybucket',
    Key='archive/myfile.txt',
    RestoreRequest={'Days': 3, 'GlacierJobParameters': {'Tier': 'Standard'}}
)

# Poll until complete
while True:
    response = s3.head_object(Bucket='mybucket', Key='archive/myfile.txt')
    restore_status = response.get('Restore', '')
    if 'ongoing-request="false"' in restore_status:
        print("Restore complete!")
        break
    print("Still restoring...")
    time.sleep(60)
```

## Summary

Ceph RGW cloud restore brings transitioned objects back from external S3-compatible storage for local access using the standard S3 RestoreObject API. Initiate a restore specifying the number of days to keep the local copy, poll for completion via HEAD requests, and download normally once available. The local copy is automatically removed after the restore window expires.
