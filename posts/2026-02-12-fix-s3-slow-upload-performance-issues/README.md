# How to Fix S3 'Slow Upload' Performance Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Performance, Cloud Storage, Optimization

Description: Speed up slow S3 uploads with multipart uploads, transfer acceleration, parallel transfers, and proper SDK configuration for better throughput.

---

Uploading files to S3 should be fast. AWS has massive bandwidth and S3 is designed for high throughput. But if your uploads are crawling, something's off. Whether you're dealing with large files taking forever or many small files being painfully slow, there are concrete things you can do to speed things up.

## Why Are Your Uploads Slow?

Before jumping to solutions, let's understand what's likely causing the bottleneck:

- **Single-threaded uploads** - You're uploading one file at a time, sequentially
- **No multipart upload** - Large files are being sent as a single PUT request
- **Geographic distance** - Your source is far from the S3 region
- **Small part sizes** - For multipart uploads, the part size is too small
- **Network constraints** - Your local network or ISP is the bottleneck
- **SDK defaults** - The default SDK settings aren't optimized for your use case

## Fix 1: Use Multipart Uploads for Large Files

For files over 100 MB, multipart upload is essential. It splits the file into parts, uploads them in parallel, and reassembles them on S3's side. The AWS CLI and SDKs handle this automatically if configured properly.

The AWS CLI's `s3 cp` command uses multipart by default for files over 8 MB:

```bash
# Upload with multipart (default threshold is 8MB)
aws s3 cp large-file.zip s3://my-bucket/large-file.zip

# Customize the multipart settings for even better performance
aws configure set default.s3.multipart_threshold 64MB
aws configure set default.s3.multipart_chunksize 64MB
aws configure set default.s3.max_concurrent_requests 20
```

For very large files (10+ GB), increase the chunk size so you don't hit the 10,000 parts limit:

```bash
# For a 100GB file, use 64MB chunks (1,600 parts)
aws s3 cp huge-file.tar.gz s3://my-bucket/huge-file.tar.gz \
  --expected-size 107374182400
```

In Python with boto3:

```python
import boto3
from boto3.s3.transfer import TransferConfig

s3 = boto3.client('s3')

# Configure multipart upload settings
config = TransferConfig(
    multipart_threshold=64 * 1024 * 1024,  # 64 MB threshold
    max_concurrency=20,                      # 20 parallel threads
    multipart_chunksize=64 * 1024 * 1024,   # 64 MB chunks
    use_threads=True
)

# Upload with the optimized config
s3.upload_file(
    'large-file.zip',
    'my-bucket',
    'large-file.zip',
    Config=config
)
```

## Fix 2: Enable Transfer Acceleration

S3 Transfer Acceleration uses AWS CloudFront's edge network to speed up uploads. Data goes to the nearest edge location first, then travels over AWS's optimized internal network to the S3 bucket. This can make a huge difference when uploading from locations far from your S3 region.

```bash
# Enable transfer acceleration on the bucket
aws s3api put-bucket-accelerate-configuration \
  --bucket my-bucket \
  --accelerate-configuration Status=Enabled

# Upload using the accelerated endpoint
aws s3 cp large-file.zip s3://my-bucket/large-file.zip --endpoint-url https://s3-accelerate.amazonaws.com
```

In Python:

```python
import boto3

# Create an S3 client configured for transfer acceleration
s3 = boto3.client(
    's3',
    config=boto3.session.Config(
        s3={'use_accelerate_endpoint': True}
    )
)

s3.upload_file('large-file.zip', 'my-bucket', 'large-file.zip')
```

You can test whether acceleration actually helps with the speed comparison tool:

```bash
# Check acceleration speed from your location
curl -s https://s3-accelerate-speedtest.s3-accelerate.amazonaws.com/en/accelerate-speed-comparsion.html
```

Transfer Acceleration costs a bit extra per GB, so make sure it's actually providing a benefit before leaving it on.

## Fix 3: Upload Files in Parallel

If you're uploading many files, don't upload them one at a time. The AWS CLI supports parallel uploads out of the box:

```bash
# Upload an entire directory with parallel transfers
# max_concurrent_requests controls parallelism
aws s3 sync ./my-data s3://my-bucket/data/ \
  --only-show-errors

# Or configure the maximum concurrent requests globally
aws configure set default.s3.max_concurrent_requests 50
aws s3 sync ./my-data s3://my-bucket/data/
```

In Python, you can use ThreadPoolExecutor:

```python
import boto3
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

s3 = boto3.client('s3')

def upload_file(file_path, bucket, key):
    """Upload a single file and return the result."""
    try:
        s3.upload_file(file_path, bucket, key)
        return f"Uploaded: {key}"
    except Exception as e:
        return f"Failed: {key} - {str(e)}"

def upload_directory(local_dir, bucket, s3_prefix, max_workers=20):
    """Upload all files in a directory in parallel."""
    files_to_upload = []
    for root, dirs, files in os.walk(local_dir):
        for filename in files:
            local_path = os.path.join(root, filename)
            relative_path = os.path.relpath(local_path, local_dir)
            s3_key = f"{s3_prefix}/{relative_path}"
            files_to_upload.append((local_path, bucket, s3_key))

    print(f"Uploading {len(files_to_upload)} files with {max_workers} threads")

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(upload_file, f[0], f[1], f[2]): f[2]
            for f in files_to_upload
        }
        for future in as_completed(futures):
            print(future.result())

# Usage
upload_directory('./my-data', 'my-bucket', 'data')
```

## Fix 4: Optimize Part Size

The ideal part size depends on your file size, network bandwidth, and retry tolerance. Larger parts mean fewer requests but more data to re-upload if a part fails.

Here's a guideline:

| File Size | Recommended Part Size | Approximate Parts |
|-----------|----------------------|-------------------|
| 100 MB - 1 GB | 16 MB | 6 - 64 |
| 1 GB - 10 GB | 64 MB | 16 - 160 |
| 10 GB - 100 GB | 128 MB | 80 - 800 |
| 100 GB+ | 256 MB - 512 MB | varies |

## Fix 5: Use the Right Storage Class

If you're uploading data that doesn't need immediate access, using the right storage class can improve upload throughput by reducing the backend processing S3 needs to do:

```bash
# Upload directly to Intelligent-Tiering
aws s3 cp large-file.zip s3://my-bucket/large-file.zip \
  --storage-class INTELLIGENT_TIERING
```

## Fix 6: Check Your Network

Sometimes the bottleneck isn't S3 - it's your network. A few things to check:

```bash
# Test your upload speed to S3 using dd and aws cli
dd if=/dev/urandom of=/tmp/test-100mb bs=1M count=100

# Time the upload
time aws s3 cp /tmp/test-100mb s3://my-bucket/speed-test/test-100mb

# Clean up
aws s3 rm s3://my-bucket/speed-test/test-100mb
rm /tmp/test-100mb
```

If you're on an EC2 instance, check if you're hitting network bandwidth limits for your instance type. Smaller instances have lower network caps.

```bash
# Check your instance's network performance class
aws ec2 describe-instance-types \
  --instance-types m5.xlarge \
  --query 'InstanceTypes[0].NetworkInfo.{Bandwidth:NetworkPerformance,MaxBandwidth:NetworkInfo.MaximumNetworkBandwidth}'
```

## Fix 7: Use VPC Endpoints for EC2-to-S3 Transfers

If you're uploading from EC2, a VPC Gateway Endpoint for S3 keeps traffic on AWS's internal network instead of going through the public internet. This is free and usually faster.

```bash
# Create a VPC endpoint for S3
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-0abc123 \
  --service-name com.amazonaws.us-east-1.s3 \
  --route-table-ids rtb-0abc123
```

## Monitoring Upload Performance

Track your upload times and failure rates so you know when things degrade. Setting up monitoring with [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-alternatives/view) can help you catch slow uploads before they impact your users.

S3 also provides request metrics that you can enable:

```bash
# Enable S3 request metrics for the bucket
aws s3api put-bucket-metrics-configuration \
  --bucket my-bucket \
  --id EntireBucket \
  --metrics-configuration '{"Id":"EntireBucket"}'
```

## Summary

Most S3 upload performance issues come down to not using multipart uploads or not running enough uploads in parallel. Start with those two fixes and you'll see the biggest improvement. Transfer Acceleration helps for geographically distant uploads, and VPC endpoints help for EC2-to-S3 transfers.
