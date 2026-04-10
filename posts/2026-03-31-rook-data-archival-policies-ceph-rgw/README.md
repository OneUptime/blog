# How to Set Up Data Archival Policies with Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Archival, S3, Lifecycle, Object Lock, Compliance

Description: Configure Ceph RGW archival policies using S3 lifecycle rules, Object Lock, and tiered placement targets to automate long-term data retention and compliance archival.

---

## Data Archival with Ceph RGW

Archival storage serves two purposes: cost reduction (moving cold data to cheaper media) and compliance (retaining records for regulatory requirements). Ceph RGW supports both through S3-compatible lifecycle rules and S3 Object Lock.

## Designing an Archival Storage Tier

Create a dedicated pool for archival data using erasure coding on HDDs for cost efficiency:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: archive-pool
  namespace: rook-ceph
spec:
  erasureCoded:
    dataChunks: 6
    codingChunks: 2  # 8 OSDs total, survives 2 failures
  deviceClass: hdd
  parameters:
    compression_mode: aggressive
```

## Configuring an Archive Placement Target

```bash
# Add GLACIER storage class to the default placement target
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin zone placement add \
  --rgw-zone default \
  --placement-id default-placement \
  --storage-class GLACIER \
  --data-pool archive-pool

# Commit the period change (required for changes to take effect)
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin period update --commit

# Verify placement targets
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin zone get | grep -A20 "placement_targets"
```

## Lifecycle Rules for Automated Archival

Apply rules that automatically move objects to the archive tier:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc \
  --bucket business-records \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "compliance-archive-7yr",
        "Status": "Enabled",
        "Filter": {"Prefix": "invoices/"},
        "Transitions": [
          {"Days": 90, "StorageClass": "STANDARD_IA"},
          {"Days": 365, "StorageClass": "GLACIER"}
        ],
        "Expiration": {"Days": 2555}
      },
      {
        "ID": "log-archive-1yr",
        "Status": "Enabled",
        "Filter": {"Prefix": "application-logs/"},
        "Transitions": [
          {"Days": 30, "StorageClass": "GLACIER"}
        ],
        "Expiration": {"Days": 365}
      }
    ]
  }'
```

## Enabling Object Lock for Compliance Archival

For records that must not be deleted (SOX, HIPAA, legal holds):

```bash
# Create a bucket with Object Lock enabled (must be done at creation time)
aws s3api create-bucket \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc \
  --bucket compliance-archive \
  --object-lock-enabled-for-bucket

# Set default retention - COMPLIANCE mode cannot be shortened even by admin
aws s3api put-object-lock-configuration \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc \
  --bucket compliance-archive \
  --object-lock-configuration '{
    "ObjectLockEnabled": "Enabled",
    "Rule": {
      "DefaultRetention": {
        "Mode": "COMPLIANCE",
        "Years": 7
      }
    }
  }'
```

## Restoring Objects from Archive

If using the cloud transition feature to move archived objects to a remote S3-compatible endpoint, they will need a restore step before they can be accessed locally:

```bash
# Request restore for archived objects
aws s3api restore-object \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc \
  --bucket business-records \
  --key invoices/2023/Q1/invoice-001.pdf \
  --restore-request '{"Days": 7, "GlacierJobParameters": {"Tier": "Standard"}}'

# Check restore status
aws s3api head-object \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc \
  --bucket business-records \
  --key invoices/2023/Q1/invoice-001.pdf \
  | jq '.Restore'
```

## Monitoring Archive Health

```bash
# Check archival pool usage and compression savings
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph df detail | grep archive

# Verify lifecycle processing is active
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin lc list
```

## Summary

Ceph RGW provides a complete data archival solution through S3 lifecycle rules for automated tiering, erasure-coded archive pools for cost-efficient long-term storage, and S3 Object Lock in COMPLIANCE mode for regulatory record immutability. By combining lifecycle rules with Object Lock, organizations can automate the full lifecycle from active storage to compliance archive, ensuring records are preserved exactly as long as regulations require without manual intervention.
