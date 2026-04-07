# How to Configure Cloud Restore Settings in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Cloud, Restore, Tiering

Description: Configure cloud restore settings in Ceph RGW to bring objects back from cloud storage tiers (S3-compatible backends) into the local Ceph cluster.

---

Ceph RGW supports cloud tiering, where objects are transitioned to external S3-compatible storage (AWS S3, Azure Blob Storage, etc.). Cloud restore allows bringing those objects back to local storage on demand.

## Understanding Cloud Restore

When an object is transitioned to a cloud tier:
1. The object data is deleted from the local RADOS pool
2. Metadata and a "cloud pointer" remain locally
3. Cloud restore copies the object data back from the remote cloud

This is analogous to AWS S3 Glacier restore operations.

## Cloud Tier Configuration Prerequisites

Configure a cloud storage zone first:

```bash
# Add a cloud storage class to the zonegroup placement
radosgw-admin zonegroup placement add \
  --rgw-zonegroup default \
  --placement-id default-placement \
  --storage-class CLOUD \
  --tier-type cloud-s3

# Configure the cloud target
radosgw-admin zonegroup placement modify \
  --rgw-zonegroup default \
  --placement-id default-placement \
  --storage-class CLOUD \
  --tier-config=endpoint=https://s3.amazonaws.com,access_key=AWS_KEY,secret=AWS_SECRET,target_path=my-archive-bucket,retain_head_object=true
```

## Cloud Restore Parameters

```bash
# Check cloud restore settings
ceph config get client.rgw rgw_restore_processor_period

# Set restore check interval (seconds)
ceph config set client.rgw rgw_restore_processor_period 300
```

## Initiating a Cloud Restore

Restore an object from cloud tier using the S3 restore API:

```bash
# Request restore (equivalent to S3 Glacier Restore)
aws s3api restore-object \
  --bucket my-bucket \
  --key archived-data/file.tar.gz \
  --restore-request '{"Days":7,"GlacierJobParameters":{"Tier":"Standard"}}' \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc
```

Check restore status:

```bash
aws s3api head-object \
  --bucket my-bucket \
  --key archived-data/file.tar.gz \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc \
  --query 'Restore'

# Output during restore:
# "ongoing-request=\"true\""
# Output after restore:
# "ongoing-request=\"false\", expiry-date=\"...\""
```

## Applying Restore Configuration in Rook

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [client.rgw.my-store.a]
    rgw_restore_processor_period = 300
```

## Monitoring Restore Operations

```bash
# Check restore status for a specific object
radosgw-admin object stat --bucket=my-bucket --object=archived-data/file.tar.gz
```

## Summary

Ceph RGW cloud restore brings cloud-tiered objects back to local RADOS storage using the S3 restore API. Configure `rgw_restore_processor_period` to set how often the restore worker checks for completion. Initiate restores via the `aws s3api restore-object` command and monitor status via `head-object`. Objects remain locally accessible for the number of days specified in the restore request.
