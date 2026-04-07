# How to Configure Multi-Object Deletion in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, S3, Object Storage, Configuration

Description: Configure Ceph RGW multi-object delete settings to control batch deletion behavior, maximum keys per request, and deletion performance tuning.

---

The S3 Multi-Object Delete API (`DELETE /?delete`) allows clients to delete up to 1000 objects in a single request. Ceph RGW implements this but exposes tuning parameters to control the behavior.

## Key Multi-Object Delete Parameters

```bash
# Check current AIO concurrency for multi-object deletes
ceph config get client.rgw rgw_multi_obj_del_max_aio
```

## Tuning Multi-Object Delete Concurrency

The 1000-object-per-request limit is hardcoded per the S3 spec and cannot be changed via configuration. However, you can tune the number of concurrent RADOS operations used when processing a multi-object delete request:

```bash
# Set concurrent RADOS operations for multi-object deletes (default: 8)
ceph config set client.rgw rgw_multi_obj_del_max_aio 16

# Reduce concurrency to limit impact on cluster
ceph config set client.rgw rgw_multi_obj_del_max_aio 4
```

## Performing Multi-Object Deletion

Using the AWS CLI:

```bash
# Delete multiple specific objects
aws s3api delete-objects \
  --bucket my-bucket \
  --delete '{"Objects":[{"Key":"file1.txt"},{"Key":"file2.txt"},{"Key":"file3.txt"}]}' \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc
```

Delete all objects matching a prefix:

```bash
# Generate delete request from list
OBJECTS=$(aws s3api list-objects-v2 \
  --bucket my-bucket \
  --prefix "old-data/" \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc \
  --query 'Contents[].{Key: Key}' \
  --output json)

aws s3api delete-objects \
  --bucket my-bucket \
  --delete "{\"Objects\":$OBJECTS}" \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc
```

## Scripting Large-Scale Deletions

For buckets with millions of objects, batch deletions in loops:

```python
import boto3

s3 = boto3.client(
    's3',
    endpoint_url='http://rook-ceph-rgw-my-store.rook-ceph.svc',
    aws_access_key_id='ACCESS_KEY',
    aws_secret_access_key='SECRET_KEY'
)

paginator = s3.get_paginator('list_objects_v2')
for page in paginator.paginate(Bucket='my-bucket', Prefix='old-data/'):
    keys = [{'Key': obj['Key']} for obj in page.get('Contents', [])]
    if keys:
        response = s3.delete_objects(
            Bucket='my-bucket',
            Delete={'Objects': keys}
        )
        print(f"Deleted {len(keys)} objects")
```

## Applying in Rook

Use the Ceph config database from the Rook toolbox pod, as `rook-config-override` may not be applied to RGW pods:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_multi_obj_del_max_aio 16
```

## Monitoring Deletion Performance

```bash
# Watch deletion rate via perf dump
kubectl -n rook-ceph exec -it deploy/rook-ceph-rgw-my-store-a -- \
  ceph daemon /var/run/ceph/ceph-client.rgw.*.asok perf dump | \
  python3 -m json.tool | grep -i "del"
```

## Summary

Multi-object deletion in Ceph RGW is capped at 1000 objects per request by the S3 spec. Tune `rgw_multi_obj_del_max_aio` to control the concurrency of RADOS operations during bulk deletes. For large-scale bucket cleanup, use pagination with Python boto3 to batch deletions and avoid overwhelming the cluster with a single massive delete operation.
