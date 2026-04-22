# How to Set Up Cloud Transition for Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Cloud, Tiering, Lifecycle, Object Storage, S3

Description: Configure cloud transition lifecycle rules in Ceph RGW to automatically move objects to external S3-compatible storage after a specified number of days.

---

Ceph RGW cloud transition allows you to automatically move objects from your local Ceph cluster to external S3-compatible storage (AWS S3, Backblaze B2, MinIO, etc.) using lifecycle rules. This is ideal for cost-optimized cold storage tiering.

## Architecture Overview

Cloud transition works via a cloud-s3 storage class tier:
1. A lifecycle rule triggers after N days
2. RGW copies the object to the remote S3 bucket
3. The local object becomes a stub retaining only metadata (if `retain_head_object=true`)
4. Accessing transitioned object data requires an explicit restore operation via the S3 RestoreObject API

## Step 1 - Configure the Cloud Storage Class

Add a cloud-s3 storage class to the existing zonegroup placement and configure it with remote S3 credentials:

```bash
radosgw-admin zonegroup placement add \
  --rgw-zonegroup default \
  --placement-id default-placement \
  --storage-class GLACIER \
  --tier-type cloud-s3

radosgw-admin zonegroup placement modify \
  --rgw-zonegroup default \
  --placement-id default-placement \
  --storage-class GLACIER \
  --tier-config=endpoint=https://s3.amazonaws.com,\
access_key=AKIAIOSFODNN7EXAMPLE,\
secret=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY,\
target_path=my-cold-storage-bucket,\
retain_head_object=true
```

The `retain_head_object=true` setting keeps the object metadata locally so HEAD requests and listings continue to work. Cloud-s3 storage classes do not require a local data pool since object data is stored remotely.

## Step 2 - Commit the Period

```bash
radosgw-admin period update --commit
```

## Step 3 - Create a Lifecycle Policy with Cloud Transition

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket mybucket \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "transition-to-cloud",
        "Status": "Enabled",
        "Filter": {"Prefix": "archive/"},
        "Transitions": [
          {
            "Days": 30,
            "StorageClass": "GLACIER"
          }
        ]
      }
    ]
  }' \
  --endpoint-url http://your-rgw-host:7480
```

Note: The `StorageClass` in the lifecycle rule must match the storage class name configured in Step 1 (here, `GLACIER`). RGW does not automatically map storage class names - the name is user-defined when creating the cloud-s3 tier.

## Step 4 - Verify Transition Status

Check lifecycle configuration:

```bash
aws s3api get-bucket-lifecycle-configuration \
  --bucket mybucket \
  --endpoint-url http://your-rgw-host:7480
```

After the transition period, check object metadata:

```bash
aws s3api head-object \
  --bucket mybucket \
  --key archive/myfile.txt \
  --endpoint-url http://your-rgw-host:7480
```

Transitioned objects show `StorageClass: GLACIER` in the response.

## Listing Transitioned Objects

```bash
aws s3api list-objects-v2 \
  --bucket mybucket \
  --prefix archive/ \
  --query 'Contents[?StorageClass==`GLACIER`]' \
  --endpoint-url http://your-rgw-host:7480
```

## Accessing Transitioned Objects

Transitioned objects cannot be read directly - a GET request returns a `403 InvalidObjectState` error. To access the data, you must first restore the object using the S3 RestoreObject API:

```bash
aws s3api restore-object \
  --bucket mybucket \
  --key archive/myfile.txt \
  --restore-request '{"Days": 7}' \
  --endpoint-url http://your-rgw-host:7480
```

After the restore completes, the object can be read normally for the specified number of days. Note that `retain_head_object` must be set to `true` in the tier config for restore to work.

## Summary

Ceph RGW cloud transition automates cost-optimized tiering by moving infrequently accessed objects to external S3-compatible storage using lifecycle rules. Configure a cloud-s3 storage class on your zonegroup placement, commit the period, and attach lifecycle rules to buckets. Transitioned objects require an explicit restore operation before their data can be accessed.
