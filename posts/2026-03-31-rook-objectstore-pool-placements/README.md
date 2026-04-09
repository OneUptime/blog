# How to Set Pool Placements and Storage Classes for Rook Object Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Object Storage, Storage Class, RGW

Description: Learn how to configure pool placements and storage classes for Rook object store to route S3 bucket data to different Ceph pools based on storage tiers.

---

## Pool Placements in Ceph RGW

Ceph RGW supports a concept called "placement targets" that allows different storage classes to map to different RADOS pools. This enables tiered storage within a single object store: hot data on SSD pools, warm data on HDD pools, and cold data on erasure-coded archive pools - all accessible through the same S3 endpoint.

In Rook, you configure this through `CephObjectZone` placement configurations. However, for single-zone setups, placement overrides can also be applied directly.

## Configuring Multiple Storage Classes

Define placement targets in your object store zone configuration. For a single-cluster setup, the default zone is configured automatically, but you can extend it with custom storage classes using `sharedPools` and `poolPlacements`. First create the additional pools as separate CephBlockPool CRDs, then reference them by name:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectZone
metadata:
  name: my-zone
  namespace: rook-ceph
spec:
  zoneGroup: my-zonegroup
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
  customEndpoints: []
  sharedPools:
    poolPlacements:
      - name: default-placement
        dataPoolName: my-store.rgw.buckets.data
        storageClasses:
          - name: STANDARD_IA
            dataPoolName: my-store.rgw.buckets.ia-data
          - name: GLACIER
            dataPoolName: my-store.rgw.buckets.archive-data
```

## Configuring Placement Targets via radosgw-admin

For immediate configuration without modifying CRDs, use the Rook toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

# List current placement targets
radosgw-admin zonegroup placement list

# Add a new placement target pointing to a specific pool
radosgw-admin zonegroup placement add \
  --rgw-zonegroup default \
  --placement-id ssd-tier

radosgw-admin zone placement add \
  --rgw-zone default \
  --placement-id ssd-tier \
  --data-pool my-store.rgw.ssd-data \
  --index-pool my-store.rgw.ssd-index

# Apply the configuration
radosgw-admin period update --commit
```

## Creating S3 Buckets with Specific Storage Classes

When using the AWS CLI or S3 SDK, specify the storage class at bucket or object level:

```bash
# Create a bucket using the default placement
aws s3 mb s3://standard-bucket \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc

# Upload with a specific storage class
aws s3 cp myfile.tar.gz s3://standard-bucket/ \
  --storage-class STANDARD_IA \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc
```

## Using ObjectBucketClaims

Buckets provisioned via OBC use the default placement target of the object store. You can set quota limits through `additionalConfig`:

```yaml
apiVersion: objectbucket.io/v1alpha1
kind: ObjectBucketClaim
metadata:
  name: ssd-bucket
  namespace: my-app
spec:
  generateBucketName: ssd-bucket
  storageClassName: rook-ceph-bucket
  additionalConfig:
    maxSize: "10Gi"
    maxObjects: "10000"
```

To create a bucket in a specific placement target, use the S3 API directly with `LocationConstraint` set to the placement target name:

```bash
aws s3api create-bucket --bucket my-ssd-bucket \
  --create-bucket-configuration LocationConstraint=ssd-tier \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc
```

## Verifying Pool Data Distribution

Check that objects are being written to the correct pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

# Check object count per pool
rados -p my-store.rgw.ssd-data ls | wc -l
rados -p my-store.rgw.buckets.data ls | wc -l
```

## Summary

Pool placements and storage classes for Rook object store allow routing different buckets or objects to different Ceph pools based on performance or cost requirements. Configure placement targets either through `CephObjectZone` CRDs or via `radosgw-admin placement` commands. Clients specify their preferred storage class at bucket creation or object upload time. This enables a tiered storage strategy within a single S3-compatible endpoint.
