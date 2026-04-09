# How to Optimize Ceph RGW for Multipart Upload Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Object Storage, Performance

Description: Optimize multipart upload performance in Ceph RGW by configuring part sizes, concurrency limits, and cleanup policies to handle large object ingestion efficiently.

---

## What is Multipart Upload

S3 multipart upload splits a large object into parts that are uploaded independently and assembled at the end. For objects above 100 MB, multipart upload improves performance by enabling parallel uploads and allows resuming failed transfers. RGW has specific configuration knobs that affect multipart throughput.

## Minimum Part Size

Configure the minimum acceptable part size to encourage clients to use larger chunks:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_multipart_min_part_size 10485760
```

The S3 protocol minimum is 5 MB, but using 10-100 MB parts reduces RADOS overhead significantly.

## Chunk Size for Parts

Set the chunk size for writing individual parts:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_max_chunk_size 33554432
```

## Client Configuration for Parallel Parts

Upload a large file with 16 parallel parts using the AWS CLI:

```bash
aws configure set default.s3.multipart_threshold 100MB
aws configure set default.s3.multipart_chunksize 50MB
aws configure set default.s3.max_concurrent_requests 16

aws s3 cp large-file.bin s3://my-bucket/large-file.bin \
  --endpoint-url http://<rgw-endpoint>
```

With boto3:

```python
from boto3.s3.transfer import TransferConfig
import boto3

config = TransferConfig(
    multipart_threshold=100 * 1024 * 1024,
    multipart_chunksize=50 * 1024 * 1024,
    max_concurrency=16,
    use_threads=True
)

s3 = boto3.client("s3", endpoint_url="http://rgw-endpoint")
s3.upload_file("large-file.bin", "my-bucket", "large-file.bin",
               Config=config)
```

## Incomplete Upload Cleanup

Incomplete multipart uploads consume storage. Configure lifecycle rules to clean them up:

```bash
cat > /tmp/lifecycle.json << 'EOF'
{
  "Rules": [
    {
      "ID": "cleanup-multipart",
      "Status": "Enabled",
      "Filter": {},
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket my-bucket \
  --lifecycle-configuration file:///tmp/lifecycle.json \
  --endpoint-url http://<rgw-endpoint>
```

List incomplete uploads:

```bash
aws s3api list-multipart-uploads \
  --bucket my-bucket \
  --endpoint-url http://<rgw-endpoint>
```

## Summary

Multipart upload performance in RGW improves when part sizes are large enough to reduce RADOS roundtrips, client parallelism matches the number of available RGW threads, and incomplete uploads are cleaned up regularly. Configuring both server-side chunk sizes and client-side transfer settings in tandem delivers the best throughput for large object ingestion.
