# How to Implement Data Lifecycle Management with Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Lifecycle, Data Management, S3, Expiration, Transition, RGW

Description: Implement automated data lifecycle management in Ceph RGW to automatically transition objects between storage classes and expire old data based on age and prefix rules.

---

## What is Data Lifecycle Management?

Data lifecycle management (DLM) automates the movement and deletion of data as it ages. In Ceph RGW, lifecycle management uses S3-compatible lifecycle rules to:
- Transition objects to lower-cost storage classes after a defined period
- Expire (delete) objects after a retention period
- Manage incomplete multipart uploads

This reduces storage costs and ensures compliance with data retention policies without manual intervention.

## Enabling Lifecycle Processing in RGW

Lifecycle rules require the RGW lifecycle processor to be running. Verify it is enabled:

```bash
# Check lifecycle configuration in the RGW config
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph config get client.rgw rgw_lc_max_objs

# Set the time-of-day window for lifecycle processing (default "00:00-06:00")
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_lifecycle_work_time "00:00-06:00"
```

## Applying a Lifecycle Policy via AWS CLI

```bash
# Apply lifecycle rules to a bucket
aws s3api put-bucket-lifecycle-configuration \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc \
  --bucket my-data-bucket \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "transition-to-cold",
        "Status": "Enabled",
        "Filter": {"Prefix": "logs/"},
        "Transitions": [
          {"Days": 30, "StorageClass": "STANDARD_IA"},
          {"Days": 90, "StorageClass": "GLACIER"}
        ]
      },
      {
        "ID": "expire-temp-files",
        "Status": "Enabled",
        "Filter": {"Prefix": "temp/"},
        "Expiration": {"Days": 7}
      },
      {
        "ID": "abort-incomplete-multipart",
        "Status": "Enabled",
        "Filter": {},
        "AbortIncompleteMultipartUpload": {"DaysAfterInitiation": 3}
      }
    ]
  }'
```

## Configuring Storage Classes in RGW

Lifecycle transitions move objects between storage classes within the same placement target. Add storage classes to the default placement:

```bash
# Add STANDARD_IA storage class to the default placement in the zonegroup
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin zonegroup placement add \
  --rgw-zonegroup default \
  --placement-id default-placement \
  --storage-class STANDARD_IA

# Configure the STANDARD_IA data pool in the zone
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin zone placement add \
  --rgw-zone default \
  --placement-id default-placement \
  --storage-class STANDARD_IA \
  --data-pool rook-ceph.rgw.cold.data

# Add GLACIER storage class to the default placement in the zonegroup
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin zonegroup placement add \
  --rgw-zonegroup default \
  --placement-id default-placement \
  --storage-class GLACIER

# Configure the GLACIER data pool in the zone (slower HDD pool)
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin zone placement add \
  --rgw-zone default \
  --placement-id default-placement \
  --storage-class GLACIER \
  --data-pool rook-ceph.rgw.archive.data
```

## Applying a Policy with Python (boto3)

```python
import boto3

s3 = boto3.client(
    's3',
    endpoint_url='http://rook-ceph-rgw-my-store.rook-ceph.svc'
)

lifecycle_config = {
    'Rules': [
        {
            'ID': 'archive-old-reports',
            'Status': 'Enabled',
            'Filter': {'Prefix': 'reports/'},
            'Expiration': {'Days': 2555}  # 7 years for compliance
        },
        {
            'ID': 'delete-processed-uploads',
            'Status': 'Enabled',
            'Filter': {'Prefix': 'uploads/processed/'},
            'Expiration': {'Days': 30}
        }
    ]
}

s3.put_bucket_lifecycle_configuration(
    Bucket='business-data',
    LifecycleConfiguration=lifecycle_config
)
```

## Verifying Lifecycle Rules

```bash
# Get current lifecycle configuration
aws s3api get-bucket-lifecycle-configuration \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc \
  --bucket my-data-bucket

# Check lifecycle processing status
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin lc list
```

## Monitoring Lifecycle Activity

```bash
# Check RGW logs for lifecycle processing
kubectl logs -n rook-ceph -l app=rook-ceph-rgw \
  | grep -i "lifecycle\|lc:" | tail -20
```

## Summary

Ceph RGW lifecycle management provides S3-compatible automation for data aging, tiering, and expiration. By defining rules based on object prefixes and age, you can automatically move logs and reports through hot, warm, and cold storage tiers, expire temporary files, and abort incomplete multipart uploads. This automation reduces manual storage management overhead and ensures consistent adherence to data retention policies at scale.
