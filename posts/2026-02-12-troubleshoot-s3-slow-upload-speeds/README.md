# How to Troubleshoot S3 Slow Upload Speeds

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Performance, Troubleshooting

Description: Diagnose and fix slow S3 upload speeds with practical solutions including multipart uploads, transfer acceleration, regional optimization, and network tuning.

---

You're uploading files to S3 and the transfer speed is crawling. Maybe it's a few MB/s when you expected hundreds. The good news is that S3 itself isn't usually the bottleneck - it can handle thousands of requests per second per prefix and sustained throughput of several Gbps. The problem is almost always somewhere between your application and the S3 endpoint.

Let's track down the issue and fix it.

## Step 1: Measure Your Baseline

Before fixing anything, measure what you're actually getting.

```bash
# Create a test file of known size
dd if=/dev/urandom of=test-100mb.bin bs=1M count=100

# Upload and time it
time aws s3 cp test-100mb.bin s3://my-bucket/speed-test/test-100mb.bin

# Expected: 100 MB should take ~1 second on a 1 Gbps connection
# If it takes 30+ seconds, something's wrong
```

For a more detailed measurement.

```python
import boto3
import time
import os

s3 = boto3.client('s3')

def measure_upload_speed(file_path, bucket, key):
    """Measure upload speed in MB/s."""
    file_size = os.path.getsize(file_path)
    size_mb = file_size / (1024 * 1024)

    start = time.time()
    s3.upload_file(file_path, bucket, key)
    elapsed = time.time() - start

    speed = size_mb / elapsed
    print(f"File size: {size_mb:.1f} MB")
    print(f"Time: {elapsed:.2f} seconds")
    print(f"Speed: {speed:.1f} MB/s")
    return speed


measure_upload_speed('test-100mb.bin', 'my-bucket', 'speed-test/100mb.bin')
```

## Step 2: Check Your Network

The most common bottleneck is network bandwidth between your source and the S3 endpoint.

```bash
# Test your internet speed
# From an EC2 instance, test to the S3 endpoint
curl -o /dev/null -w "Speed: %{speed_download} bytes/sec\n" \
  https://s3.us-east-1.amazonaws.com

# Check your network interface speed
# On Linux:
ethtool eth0 | grep Speed

# Check for packet loss
ping -c 100 s3.us-east-1.amazonaws.com
```

If you're uploading from an office over a 100 Mbps internet connection, your theoretical max is about 12 MB/s. No amount of S3 tuning will exceed your physical network capacity.

## Step 3: Use Multipart Uploads

If you're uploading files larger than 100 MB with a single PUT request, switch to multipart uploads. They're faster because multiple parts upload in parallel.

Configure the AWS CLI for multipart.

```bash
# Configure multipart upload thresholds
aws configure set default.s3.multipart_threshold 64MB
aws configure set default.s3.multipart_chunksize 16MB
aws configure set default.s3.max_concurrent_requests 20

# Now uploads automatically use multipart for files over 64 MB
aws s3 cp large-file.zip s3://my-bucket/
```

In Boto3, configure the transfer settings.

```python
import boto3
from boto3.s3.transfer import TransferConfig

s3 = boto3.client('s3')

# Optimized transfer configuration
config = TransferConfig(
    multipart_threshold=64 * 1024 * 1024,  # 64 MB
    max_concurrency=20,                     # 20 parallel threads
    multipart_chunksize=16 * 1024 * 1024,   # 16 MB per part
    use_threads=True,
)

s3.upload_file(
    'large-file.zip',
    'my-bucket',
    'large-file.zip',
    Config=config
)
```

The optimal chunk size depends on your network. On a fast connection, larger chunks (64 MB) reduce overhead. On a slower connection, smaller chunks (8-16 MB) give better parallelism.

## Step 4: Enable S3 Transfer Acceleration

Transfer Acceleration uses CloudFront's edge network to speed up uploads over long distances. Instead of uploading directly to the S3 region, your data goes to the nearest CloudFront edge location and travels over AWS's optimized backbone.

```bash
# Enable transfer acceleration on the bucket
aws s3api put-bucket-accelerate-configuration \
  --bucket my-bucket \
  --accelerate-configuration Status=Enabled
```

Use the acceleration endpoint for uploads.

```bash
# Upload using the acceleration endpoint
aws s3 cp large-file.zip s3://my-bucket/ --endpoint-url https://my-bucket.s3-accelerate.amazonaws.com
```

In code, configure the client to use the acceleration endpoint.

```python
import boto3

# Create a client that uses transfer acceleration
s3_accelerated = boto3.client(
    's3',
    config=boto3.session.Config(
        s3={'use_accelerate_endpoint': True}
    )
)

s3_accelerated.upload_file(
    'large-file.zip',
    'my-bucket',
    'uploads/large-file.zip'
)
```

Test if acceleration actually helps for your location.

```bash
# Compare speed with and without acceleration
# The S3 Transfer Acceleration Speed Comparison tool is available at:
# https://s3-accelerate-speedtest.s3-accelerate.amazonaws.com/en/accelerate-speed-comparsion.html
```

Transfer Acceleration typically helps most when you're far from the S3 region. If you're on an EC2 instance in the same region, it won't help (and might be slower due to the extra hop).

## Step 5: Upload to the Nearest Region

If you're consistently uploading from a specific geographic location, make sure you're using the nearest S3 region.

```bash
# Test latency to different regions
for region in us-east-1 us-west-2 eu-west-1 ap-southeast-1; do
  echo -n "$region: "
  curl -o /dev/null -s -w "%{time_connect}s\n" \
    "https://s3.$region.amazonaws.com"
done
```

A 200ms round-trip difference adds up quickly when you're making thousands of API calls.

## Step 6: Fix Key Naming for High-Throughput

S3 partitions data by key prefix. If all your uploads go to the same prefix, you might hit throughput limits on a single partition.

Bad pattern - all files start with the same prefix.

```
uploads/2026/02/12/file-001.csv
uploads/2026/02/12/file-002.csv
uploads/2026/02/12/file-003.csv
```

Better pattern - add randomness to distribute across partitions.

```
uploads/a3f2/2026/02/12/file-001.csv
uploads/7b1c/2026/02/12/file-002.csv
uploads/e9d4/2026/02/12/file-003.csv
```

In practice, S3 automatically handles this for most workloads now (it was more of an issue historically). But if you're doing extremely high throughput (thousands of requests per second to the same prefix), it can still matter.

## Step 7: Optimize from EC2

If you're uploading from EC2, there are specific optimizations.

Use placement groups and enhanced networking.

```bash
# Check if enhanced networking is enabled
ethtool -i eth0 | grep driver
# Should show "ena" for Elastic Network Adapter

# Check for TCP window scaling
sysctl net.ipv4.tcp_window_scaling
# Should be 1
```

Tune TCP settings for high throughput.

```bash
# Increase TCP buffer sizes (Linux)
sudo sysctl -w net.core.rmem_max=16777216
sudo sysctl -w net.core.wmem_max=16777216
sudo sysctl -w net.ipv4.tcp_rmem="4096 87380 16777216"
sudo sysctl -w net.ipv4.tcp_wmem="4096 65536 16777216"
```

Use a VPC endpoint for S3 to avoid going over the internet.

```bash
# Create a Gateway VPC endpoint for S3
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-abc123 \
  --service-name com.amazonaws.us-east-1.s3 \
  --route-table-ids rtb-abc123
```

VPC endpoints are free and they route S3 traffic through AWS's private network instead of the public internet.

## Step 8: Parallel File Uploads

If you're uploading many files, upload them in parallel rather than sequentially.

```bash
# Upload multiple files in parallel with the CLI
aws s3 sync ./local-data/ s3://my-bucket/data/ \
  --exclude "*.tmp"
  # s3 sync automatically parallelizes
```

With Python.

```python
import boto3
from concurrent.futures import ThreadPoolExecutor
import os

s3 = boto3.client('s3')

def upload_file(args):
    local_path, bucket, key = args
    s3.upload_file(local_path, bucket, key)
    return key

def parallel_upload(directory, bucket, prefix, max_workers=20):
    """Upload all files in a directory in parallel."""
    upload_tasks = []

    for root, dirs, files in os.walk(directory):
        for filename in files:
            local_path = os.path.join(root, filename)
            relative_path = os.path.relpath(local_path, directory)
            key = f"{prefix}/{relative_path}"
            upload_tasks.append((local_path, bucket, key))

    print(f"Uploading {len(upload_tasks)} files with {max_workers} threads...")

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        results = list(executor.map(upload_file, upload_tasks))

    print(f"Done. Uploaded {len(results)} files.")


parallel_upload('./data/', 'my-bucket', 'uploads/batch-001', max_workers=20)
```

## Step 9: Check for Throttling

If S3 is returning 503 Slow Down errors, you're being throttled. Check your CloudWatch metrics.

```bash
# Check for 5xx errors (includes throttling)
aws cloudwatch get-metric-statistics \
  --namespace AWS/S3 \
  --metric-name 5xxErrors \
  --dimensions Name=BucketName,Value=my-bucket Name=FilterId,Value=EntireBucket \
  --start-time 2026-02-12T00:00:00Z \
  --end-time 2026-02-12T23:59:59Z \
  --period 300 \
  --statistics Sum
```

If you're hitting throttling, implement exponential backoff (the AWS SDK does this automatically) and spread your uploads across more prefixes.

## Performance Summary

Here's a quick reference for expected speeds.

| Scenario | Expected Speed |
|---|---|
| Single PUT, same region EC2 | 50-200 MB/s |
| Multipart upload, same region EC2 | 200-500+ MB/s |
| Home internet (100 Mbps) | 8-12 MB/s |
| Transfer Acceleration from far region | 2-5x improvement |
| VPC endpoint vs public internet | 10-30% improvement |

Monitor your upload performance over time with [OneUptime](https://oneuptime.com) to catch regressions before they impact your data pipeline. Set up alerts on upload duration and error rates.

For more on S3 performance monitoring, see our guide on [configuring S3 bucket metrics in CloudWatch](https://oneuptime.com/blog/post/2026-02-12-s3-bucket-metrics-cloudwatch/view).
