# How to Configure S3 Transfer Acceleration in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, S3, RGW, Transfer Acceleration, Performance, Storage

Description: Learn about S3 Transfer Acceleration support in Ceph RGW and how to optimize large object transfers using multipart uploads, compression, and network tuning.

---

## Overview

AWS S3 Transfer Acceleration uses CloudFront edge locations to accelerate transfers. Ceph RGW does not implement CloudFront's edge network, but it supports the Transfer Acceleration API surface and provides equivalent mechanisms for optimizing transfer performance through multipart uploads, multiple gateway instances, and network tuning.

## Enable Transfer Acceleration API on a Bucket

Ceph RGW accepts the Transfer Acceleration API calls for compatibility:

```bash
aws s3api put-bucket-accelerate-configuration \
  --bucket my-bucket \
  --accelerate-configuration Status=Enabled \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --profile ceph
```

Check the status:

```bash
aws s3api get-bucket-accelerate-configuration \
  --bucket my-bucket \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --profile ceph
```

## Practical Transfer Optimization in Ceph

Since Ceph does not have edge PoPs, real acceleration comes from these techniques:

**Multiple RGW Instances**: Scale out gateways in Rook:

```yaml
spec:
  gateway:
    port: 80
    instances: 4
    resources:
      requests:
        cpu: "2"
        memory: "4Gi"
```

**Load Balance with a Service**: Expose the RGW service via a LoadBalancer:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ceph-rgw-lb
  namespace: rook-ceph
spec:
  type: LoadBalancer
  selector:
    app: rook-ceph-rgw
    rook_object_store: my-store
  ports:
    - port: 80
      targetPort: 8080
```

## Parallel Multipart Upload for Large Files

```python
from boto3.s3.transfer import TransferConfig
import boto3
from botocore.client import Config

s3 = boto3.client(
    "s3",
    endpoint_url="http://ceph-rgw-lb:80",
    aws_access_key_id="myaccesskey",
    aws_secret_access_key="mysecretkey",
    config=Config(s3={"addressing_style": "path"}),
)

transfer_config = TransferConfig(
    multipart_threshold=64 * 1024 * 1024,
    max_concurrency=16,
    multipart_chunksize=64 * 1024 * 1024,
    use_threads=True,
)

s3.upload_file(
    "/data/large-dataset.tar.gz",
    "my-bucket",
    "datasets/large-dataset.tar.gz",
    Config=transfer_config,
)
```

## Tune RGW for Throughput

Set thread count and buffer sizes in the Ceph config:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_thread_pool_size 512

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_max_chunk_size 4194304
```

## Benchmark Transfer Speed

```bash
# Upload benchmark
dd if=/dev/urandom bs=1M count=1024 | aws s3 cp - s3://my-bucket/test-1gb \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --profile ceph

# Download benchmark
time aws s3 cp s3://my-bucket/test-1gb /dev/null \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --profile ceph
```

## Summary

While Ceph RGW does not replicate AWS's global edge network, it supports the Transfer Acceleration API and offers real throughput gains through multiple gateway instances, parallel multipart uploads, and tuned thread pools. These optimizations make Ceph RGW competitive for on-premises high-throughput data transfer scenarios.
