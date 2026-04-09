# How to Set Up Rook-Ceph for Hybrid Cloud Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Hybrid Cloud, Storage, S3, Kubernetes

Description: Learn how to configure Rook-Ceph for hybrid cloud storage architectures, including cloud tiering, data replication between on-prem and cloud, and unified S3 endpoints.

---

Hybrid cloud storage bridges on-premises Rook-Ceph clusters with public cloud storage services. This enables cost optimization (keeping hot data on-premises, archiving to cloud), disaster recovery, and workload portability between environments.

## Hybrid Storage Patterns

Common hybrid patterns with Rook-Ceph:
- **Cloud tiering** - Automatically move cold data from Ceph to S3/GCS/Azure Blob
- **Backup to cloud** - Daily backup of Ceph data to cloud object storage
- **Active-passive DR** - Replicate critical data to cloud for failover
- **Unified S3 endpoint** - Application uses the same S3 API regardless of data location

## Configuring Cloud Tiering with RGW

Ceph RGW supports tiering cold objects to public cloud storage via the storage class transition feature:

```bash
# Create a cloud tier storage class
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zonegroup placement add \
    --rgw-zonegroup default \
    --placement-id default-placement \
    --storage-class GLACIER

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zone placement add \
    --rgw-zone default \
    --placement-id default-placement \
    --storage-class GLACIER \
    --tier-type=cloud-s3 \
    --tier-config=endpoint=https://s3.amazonaws.com,access_key=AWS_KEY,secret=AWS_SECRET,target_path=mybucket/ceph-tier
```

Transition objects to the cloud tier with lifecycle rules:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket mydata \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "archive-to-aws",
      "Status": "Enabled",
      "Filter": {},
      "Transitions": [{
        "Days": 90,
        "StorageClass": "GLACIER"
      }]
    }]
  }' \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local
```

## Cross-Region Replication to Cloud

Replicate Ceph buckets to AWS S3 for disaster recovery using the cloud-s3 tier. Unlike cloud tiering (which moves data and removes the local copy), DR replication retains the local copy by setting `retain_head_object`:

```bash
# Create a storage class for cloud DR replication
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zonegroup placement add \
    --rgw-zonegroup default \
    --placement-id default-placement \
    --storage-class CLOUD_BACKUP

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zone placement add \
    --rgw-zone default \
    --placement-id default-placement \
    --storage-class CLOUD_BACKUP \
    --tier-type=cloud-s3 \
    --tier-config=endpoint=https://s3.amazonaws.com,access_key=AWS_KEY,secret=AWS_SECRET,target_path=mydata-backup,retain_head_object=true
```

Apply a lifecycle rule to transition objects to the cloud backup tier:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket mydata \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "replicate-to-cloud",
      "Status": "Enabled",
      "Filter": {},
      "Transitions": [{
        "Days": 1,
        "StorageClass": "CLOUD_BACKUP"
      }]
    }]
  }' \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local
```

## Using Rook as a Cache Tier for Cloud Data

Configure Rook-Ceph as a fast cache in front of cloud storage using pool-level cache tiering:

> **Note:** Ceph cache tiering is deprecated since Luminous. For new deployments, consider using RGW cloud tiering with lifecycle policies (shown above) instead.

```bash
# Set up a cache pool in front of the base storage pool
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c '
  ceph osd tier add base-pool cache-pool
  ceph osd tier cache-mode cache-pool writeback
  ceph osd tier set-overlay base-pool cache-pool
  ceph osd pool set cache-pool hit_set_type bloom
  ceph osd pool set cache-pool hit_set_count 1
  ceph osd pool set cache-pool hit_set_period 3600
  ceph osd pool set cache-pool cache_target_full_ratio 0.8
  ceph osd pool set cache-pool cache_target_dirty_ratio 0.4
'
```

## Unified Storage Interface for Applications

Applications use the same S3-compatible API regardless of data location:

```python
import boto3

# The application only knows the Ceph RGW endpoint
# Ceph handles tiering to cloud transparently
s3 = boto3.client(
    "s3",
    endpoint_url="http://rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local",
    aws_access_key_id="app-access-key",
    aws_secret_access_key="app-secret-key",
)

# Write and read operations work the same
# regardless of whether data is on Ceph or cloud
s3.put_object(Bucket="mydata", Key="file.dat", Body=b"data")
response = s3.get_object(Bucket="mydata", Key="file.dat")
```

## Summary

Rook-Ceph supports hybrid cloud storage through RGW's cloud tiering feature, which automatically migrates cold objects to public cloud storage classes based on lifecycle policies. For disaster recovery, bucket replication pushes copies to cloud S3. Applications benefit from a unified S3-compatible endpoint that abstracts the underlying storage location, enabling workload portability between on-premises Ceph and cloud environments.
