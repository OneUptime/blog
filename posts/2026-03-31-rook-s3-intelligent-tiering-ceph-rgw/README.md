# How to Configure S3 Intelligent Tiering in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, S3, RGW, Intelligent Tiering, Storage Class, Cost

Description: Implement storage tiering in Ceph RGW using lifecycle policies and storage classes to automatically move objects between hot and cold storage tiers.

---

## Overview

AWS S3 Intelligent Tiering automatically moves objects between access tiers based on usage patterns. Ceph RGW does not implement the exact Intelligent Tiering storage class, but provides equivalent tiering through Ceph's storage class system and lifecycle policies. You can define hot (replicated) and cold (erasure-coded) pools and transition objects between them.

## Define Storage Classes in Ceph

Create a cold storage class backed by an erasure-coded pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash << 'EOF'
# Create cold EC pool
ceph osd pool create cold-data 64 64 erasure default

# Define the storage class
radosgw-admin zonegroup placement add \
  --rgw-zonegroup default \
  --placement-id default-placement \
  --storage-class COLD

radosgw-admin zone placement add \
  --rgw-zone default \
  --placement-id default-placement \
  --storage-class COLD \
  --data-pool cold-data \
  --compression lz4
EOF
```

## Set Tiering Lifecycle Policy

Use S3 lifecycle rules to automatically transition objects to COLD after 30 days from object creation:

```json
{
  "Rules": [
    {
      "ID": "move-to-cold",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "data/"
      },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "COLD"
        }
      ]
    },
    {
      "ID": "expire-cold-objects",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "data/"
      },
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-bucket \
  --lifecycle-configuration file://tiering-lifecycle.json \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --profile ceph
```

## Upload an Object to a Specific Tier

Upload directly to the COLD storage class:

```bash
aws s3api put-object \
  --bucket my-bucket \
  --key archive/old-report.pdf \
  --body /tmp/old-report.pdf \
  --storage-class COLD \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --profile ceph
```

Upload to default (hot) tier:

```bash
aws s3 cp /tmp/active-data.json s3://my-bucket/data/active-data.json \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --profile ceph
```

## Verify Object Storage Class

```bash
aws s3api head-object \
  --bucket my-bucket \
  --key archive/old-report.pdf \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --profile ceph | jq .StorageClass
```

## Monitor Pool Utilization

```bash
ceph df detail | grep -E "cold-data|default"
ceph osd pool stats cold-data
```

## Check Lifecycle Progress

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin lc list | jq .
```

## Summary

Ceph RGW supports custom storage classes backed by different pools, enabling a tiering strategy equivalent to S3 Intelligent Tiering. By combining hot replicated pools for active data and cold erasure-coded pools for infrequently accessed data, you achieve significant storage savings with automated lifecycle transitions.
