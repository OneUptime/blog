# How to Enable Bucket Versioning in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Versioning, S3, Data Protection

Description: Learn how to enable and manage S3 bucket versioning in Ceph RGW to protect against accidental deletions, retain object history, and support point-in-time recovery workflows.

---

## What Bucket Versioning Provides

When versioning is enabled on a Ceph RGW bucket, every write to an object creates a new version rather than overwriting. Deletions create a delete marker instead of permanently removing data. This enables:

- Recovery from accidental overwrites or deletes
- Audit trails of object changes
- Multi-version object lifecycle management

## Enable Versioning with AWS CLI

```bash
# Enable versioning on a bucket
aws s3api put-bucket-versioning \
  --bucket my-versioned-bucket \
  --versioning-configuration Status=Enabled \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80

# Verify versioning is enabled
aws s3api get-bucket-versioning \
  --bucket my-versioned-bucket \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80
```

Expected output:

```json
{
    "Status": "Enabled"
}
```

## Upload Multiple Versions

```bash
# Upload version 1
echo "v1 content" > file.txt
aws s3 cp file.txt s3://my-versioned-bucket/file.txt \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80

# Upload version 2 (overwrites key, creates new version)
echo "v2 content" > file.txt
aws s3 cp file.txt s3://my-versioned-bucket/file.txt \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80

# List all versions
aws s3api list-object-versions \
  --bucket my-versioned-bucket \
  --prefix file.txt \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80
```

## Retrieve a Specific Version

```bash
# Get the version ID from list-object-versions
VERSION_ID="<version-id-from-list>"

# Download a specific version
aws s3api get-object \
  --bucket my-versioned-bucket \
  --key file.txt \
  --version-id "$VERSION_ID" \
  recovered-file.txt \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80
```

## Delete a Specific Version

```bash
# Delete only a specific version (not the current version)
aws s3api delete-object \
  --bucket my-versioned-bucket \
  --key file.txt \
  --version-id "$VERSION_ID" \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80

# Delete the current version (creates a delete marker)
aws s3 rm s3://my-versioned-bucket/file.txt \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80
```

## Suspend Versioning

Versioning can be suspended (not disabled) on a bucket. New objects will not be versioned but existing versions are retained:

```bash
aws s3api put-bucket-versioning \
  --bucket my-versioned-bucket \
  --versioning-configuration Status=Suspended \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80
```

## Set Up Lifecycle Rules to Manage Old Versions

Versioning can grow storage usage significantly. Add lifecycle rules to expire old versions:

```bash
cat > lifecycle.json << 'EOF'
{
  "Rules": [
    {
      "ID": "expire-old-versions",
      "Status": "Enabled",
      "Filter": {"Prefix": ""},
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 30
      },
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket my-versioned-bucket \
  --lifecycle-configuration file://lifecycle.json \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80
```

## Monitor Storage Usage

Check how much storage versioning consumes:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  radosgw-admin bucket stats --bucket=my-versioned-bucket | jq '{
    num_objects: .usage.\"rgw.main\".num_objects,
    size_kb: .usage.\"rgw.main\".size_kb
  }'
"
```

## Summary

Enabling bucket versioning in Ceph RGW uses the standard S3 `put-bucket-versioning` API and provides accidental deletion protection and object history retention. Each write creates a new version, and deletions only add delete markers, preserving all previous versions. To prevent unbounded storage growth, configure lifecycle rules to expire noncurrent versions after a defined retention period. Use `list-object-versions` and `get-object --version-id` to retrieve specific historical versions during recovery operations.
