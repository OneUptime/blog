# How to Use Ceph RGW for Log Storage and Archival

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Log Storage, Archival, Object Storage, S3

Description: Learn how to use Ceph RADOS Gateway as a cost-effective log storage and archival backend, configure Fluentd and Vector to ship logs, and set up lifecycle policies for log retention.

---

## Why Ceph RGW for Log Storage?

Log storage requirements grow continuously. Ceph RGW provides:

- Infinite scalability within cluster capacity
- S3-compatible API for existing tooling
- Tiered storage with lifecycle policies
- Compression support (zstd) to reduce log storage costs by 5-10x
- On-premises compliance for regulated industries

## Step 1: Set Up a Log Bucket

```bash
aws s3 mb s3://application-logs --endpoint-url https://rgw.example.com

# Enable versioning (optional but useful for audit trails)
aws s3api put-bucket-versioning \
  --bucket application-logs \
  --versioning-configuration Status=Enabled \
  --endpoint-url https://rgw.example.com
```

## Step 2: Enable Compression on the Log Pool

```bash
# Enable zstd compression on the RGW data pool
ceph osd pool set default.rgw.buckets.data compression_mode force
ceph osd pool set default.rgw.buckets.data compression_algorithm zstd
```

## Step 3: Configure Fluentd to Ship Logs to Ceph RGW

```xml
<match app.**>
  @type s3
  aws_key_id your-access-key
  aws_sec_key your-secret-key
  s3_bucket application-logs
  s3_endpoint https://rgw.example.com
  s3_region us-east-1
  force_path_style true
  path logs/%Y/%m/%d/
  s3_object_key_format %{path}%{time_slice}_%{index}.%{file_extension}
  time_slice_format %Y%m%d-%H
  store_as gzip
  <buffer time>
    @type file
    path /var/log/fluent/s3
    timekey 1h
    timekey_wait 10m
    chunk_limit_size 256m
  </buffer>
</match>
```

## Step 4: Configure Vector to Ship Logs

```toml
[sources.app_logs]
type = "file"
include = ["/var/log/app/*.log"]

[transforms.parse_logs]
type = "remap"
inputs = ["app_logs"]
source = '''
  .timestamp = now()
  .host = get_hostname!()
'''

[sinks.ceph_s3]
type = "aws_s3"
inputs = ["parse_logs"]
bucket = "application-logs"
endpoint = "https://rgw.example.com"
region = "us-east-1"
key_prefix = "logs/{{ host }}/%Y/%m/%d/"
encoding.codec = "ndjson"
compression = "gzip"
auth.access_key_id = "your-access-key"
auth.secret_access_key = "your-secret-key"
```

## Step 5: Configure Log Lifecycle Policies

Retain logs for 90 days, then delete:

```json
{
  "Rules": [{
    "ID": "log-retention-90-days",
    "Filter": { "Prefix": "logs/" },
    "Status": "Enabled",
    "Expiration": {
      "Days": 90
    }
  }]
}
```

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket application-logs \
  --lifecycle-configuration file://log-lifecycle.json \
  --endpoint-url https://rgw.example.com
```

## Querying Logs with AWS CLI

List logs for a specific day:

```bash
aws s3 ls s3://application-logs/logs/2026/03/31/ \
  --endpoint-url https://rgw.example.com
```

Download and decompress:

```bash
aws s3 cp s3://application-logs/logs/2026/03/31/myapp.log.gz /tmp/ \
  --endpoint-url https://rgw.example.com
gunzip /tmp/myapp.log.gz
grep "ERROR" /tmp/myapp.log
```

## Summary

Ceph RGW is an excellent log storage backend that combines S3-compatible APIs with compression (achieving 5-10x storage savings for log data) and flexible lifecycle policies. Configure Fluentd or Vector to batch-ship logs using S3 output plugins with path-style access enabled. Set lifecycle policies to automatically expire logs based on your retention requirements, and enable zstd compression on the RGW data pool to minimize storage costs.
