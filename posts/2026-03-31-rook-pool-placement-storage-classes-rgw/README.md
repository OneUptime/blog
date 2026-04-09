# How to Set Up Pool Placement and Storage Classes for RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Storage Class, Pool Placement, S3

Description: Learn how to configure pool placement targets and storage classes in Ceph RGW to route objects to different storage tiers based on cost, performance, or replication needs.

---

## Overview

Pool placement in Ceph RGW allows you to route objects to different RADOS pools based on storage class selection. This enables tiered storage where frequently accessed data uses a high-performance replicated pool while archival data uses an erasure-coded pool. Clients specify the desired storage class in their S3 requests.

## Understanding Placement Targets

A placement target maps a storage class name to a set of RADOS pools. The zone configuration contains all placement targets.

```bash
# View current placement targets
radosgw-admin zone get --rgw-zone=us-east | jq '.placement_pools'
```

## Creating the Underlying RADOS Pools

Create the pools before configuring placement targets:

```bash
# Create the cold storage pools
ceph osd pool create cold-data-pool erasure
ceph osd pool create cold-index-pool replicated
ceph osd pool create cold-extra-pool replicated
```

## Configuring Zone Group Placement

The zone group must list the placement target and storage class:

```bash
radosgw-admin zonegroup placement add \
  --rgw-zonegroup=us \
  --placement-id=cold-storage

# Add the storage class to the zone group placement
radosgw-admin zonegroup placement add \
  --rgw-zonegroup=us \
  --placement-id=cold-storage \
  --storage-class=COLD

radosgw-admin period update --commit
```

## Creating the Zone Placement Target

Add the placement target to the zone with its base pools, then add the storage class with its data pool:

```bash
# Add the base placement target with index and extra pools
radosgw-admin zone placement add \
  --rgw-zone=us-east \
  --placement-id=cold-storage \
  --data-pool=cold-data-pool \
  --index-pool=cold-index-pool \
  --data-extra-pool=cold-extra-pool

# Add the COLD storage class with its data pool
radosgw-admin zone placement add \
  --rgw-zone=us-east \
  --placement-id=cold-storage \
  --storage-class=COLD \
  --data-pool=cold-data-pool

# Commit the changes
radosgw-admin period update --commit
```

## Using Storage Classes via S3 API

Clients specify the storage class when uploading:

```bash
# Upload to default storage class
aws s3 cp file.txt s3://mybucket/file.txt \
  --endpoint-url http://rgw:80

# Upload to cold storage class
aws s3 cp archive.tar s3://mybucket/archive.tar \
  --endpoint-url http://rgw:80 \
  --storage-class COLD
```

With boto3:

```python
import boto3

s3 = boto3.client('s3', endpoint_url='http://rgw:80',
    aws_access_key_id='mykey', aws_secret_access_key='mysecret')

s3.upload_file(
    'archive.tar', 'mybucket', 'archive.tar',
    ExtraArgs={'StorageClass': 'COLD'}
)
```

## Rook: Configuring Placement in CephObjectZone

In Rook, use `sharedPools` with `poolPlacements` to configure storage classes that route to different pools. First create the erasure-coded pool as a separate CephBlockPool, then reference it by name:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectZone
metadata:
  name: us-east
  namespace: rook-ceph
spec:
  zoneGroup: us
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
  sharedPools:
    poolPlacements:
      - name: cold-storage
        dataPoolName: cold-data-pool
        storageClasses:
          - name: COLD
            dataPoolName: cold-ec-pool
```

## Verifying Placement Configuration

```bash
# Check where an object was stored
aws s3api head-object --bucket mybucket --key archive.tar \
  --endpoint-url http://rgw:80

# Output includes StorageClass field
```

## Summary

Pool placement targets in Ceph RGW enable tiered storage by mapping S3 storage class names to different RADOS pool configurations. Set up placement targets in the zone configuration, create matching pools, and clients can use standard S3 storage class API to route objects to the appropriate tier. This enables cost-effective storage for both hot and cold data within a single RGW endpoint.
