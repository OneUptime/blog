# How to Use Ceph RGW for Backup Repository Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Backup, Object Storage, S3, Velero, Restic

Description: Learn how to use Ceph RADOS Gateway as a backup repository backend for tools like Velero and Restic, configure deduplication-friendly storage, and secure backup data with encryption.

---

## Why Ceph RGW for Backup Storage?

Backup repositories need reliable, scalable, and cost-effective object storage. Ceph RGW provides:

- S3-compatible API compatible with Velero, Restic, Rclone, Duplicati
- Immutable object support for ransomware protection
- On-premises data for air-gapped backup compliance
- Compression (zstd) can reduce backup storage by 2-4x
- Erasure coding for cost-effective durability

## Step 1: Create a Backup Bucket

```bash
# Create bucket with Object Lock enabled (required if you plan to use immutable backups)
aws s3api create-bucket \
  --bucket k8s-backups \
  --object-lock-enabled-for-bucket \
  --endpoint-url https://rgw.example.com

# Enable versioning (required for Velero and Object Lock)
aws s3api put-bucket-versioning \
  --bucket k8s-backups \
  --versioning-configuration Status=Enabled \
  --endpoint-url https://rgw.example.com
```

## Step 2: Create a Dedicated Backup User

```bash
radosgw-admin user create \
  --uid backup-user \
  --display-name "Backup Service Account" \
  --max-buckets 100

radosgw-admin user info --uid backup-user | jq '.keys[0]'
```

## Step 3: Configure Velero with Ceph RGW

Create a credentials file:

```bash
cat > /tmp/credentials-velero << EOF
[default]
aws_access_key_id=<access-key>
aws_secret_access_key=<secret-key>
EOF
```

Install Velero with the S3 plugin:

```bash
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.8.0 \
  --bucket k8s-backups \
  --secret-file /tmp/credentials-velero \
  --use-volume-snapshots=false \
  --backup-location-config \
    region=us-east-1,\
    s3ForcePathStyle=true,\
    s3Url=https://rgw.example.com
```

Verify the backup location:

```bash
velero backup-location get
```

## Step 4: Configure Restic with Ceph RGW

```bash
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export RESTIC_REPOSITORY=s3:https://rgw.example.com/restic-backups
export RESTIC_PASSWORD=strong-backup-password

# Initialize the Restic repository
restic init

# Back up a directory
restic backup /data/important --host myserver

# List snapshots
restic snapshots
```

## Step 5: Enable Compression on the Backup Pool

Backup data (especially databases and config files) compresses very well:

```bash
ceph osd pool set default.rgw.buckets.data compression_mode force
ceph osd pool set default.rgw.buckets.data compression_algorithm zstd
```

## Step 6: Configure Object Lifecycle for Backup Retention

Keep backups for 90 days:

```json
{
  "Rules": [{
    "ID": "backup-retention",
    "Filter": { "Prefix": "" },
    "Status": "Enabled",
    "NoncurrentVersionExpiration": {
      "NoncurrentDays": 90
    },
    "Expiration": {
      "Days": 90
    }
  }]
}
```

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket k8s-backups \
  --lifecycle-configuration file://backup-lifecycle.json \
  --endpoint-url https://rgw.example.com
```

## Step 7: Enable Object Lock for Immutable Backups

Object Lock prevents backup data from being modified or deleted for a defined period:

```bash
aws s3api put-object-lock-configuration \
  --bucket k8s-backups \
  --object-lock-configuration '{"ObjectLockEnabled":"Enabled","Rule":{"DefaultRetention":{"Mode":"GOVERNANCE","Days":30}}}' \
  --endpoint-url https://rgw.example.com
```

## Running a Test Backup and Restore with Velero

```bash
# Create a test backup
velero backup create test-backup --include-namespaces default

# Check backup status
velero backup get

# Simulate a restore
velero restore create --from-backup test-backup --namespace-mappings default:restored
velero restore get
```

## Summary

Ceph RGW makes an excellent backup repository backend due to its S3 compatibility, scalability, and support for features like versioning, object lock, and lifecycle management. Configure Velero with path-style S3 access to point at Ceph RGW, enable zstd compression on the backup pool for significant storage savings, and use object lock in governance or compliance mode to prevent backup tampering. Always test restores regularly to verify backup integrity.
