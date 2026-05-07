# How to Access AWS S3 over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, IPv6, S3, Object Storage, Dualstack, Cloud Storage

Description: Access AWS S3 buckets over IPv6 using dualstack endpoints, configure bucket policies for IPv6, and verify IPv6 S3 access from applications.

## Introduction

AWS S3 supports IPv6 access through dualstack endpoints (`s3.dualstack.<region>.amazonaws.com`). These endpoints return both A and AAAA records, allowing IPv6 clients to connect. The standard public S3 REST endpoints are IPv4-only. Using dualstack endpoints is essential for public IPv6 access and useful for dual-stack applications.

## S3 Dualstack Endpoints

```bash
# Standard S3 endpoint (IPv4 only)

s3.amazonaws.com
s3.us-east-1.amazonaws.com
<bucket>.s3.amazonaws.com

# Dualstack S3 endpoint (IPv4 + IPv6)
s3.dualstack.us-east-1.amazonaws.com
<bucket>.s3.dualstack.us-east-1.amazonaws.com

# Check AAAA record for dualstack endpoint
dig AAAA s3.dualstack.us-east-1.amazonaws.com

# Test IPv6 access to S3
curl -6 https://my-bucket.s3.dualstack.us-east-1.amazonaws.com/
```

## AWS CLI with IPv6

```bash
# Use dualstack endpoint in AWS CLI
aws s3 ls \
    --region us-east-1 \
    --endpoint-url https://s3.dualstack.us-east-1.amazonaws.com/

# Configure in AWS CLI config
aws configure set default.region us-east-1
aws configure set default.s3.use_dualstack_endpoint true

# Or set in ~/.aws/config:
cat << 'EOF' >> ~/.aws/config
[default]
region = us-east-1
s3 =
    use_dualstack_endpoint = true
EOF

# Now all s3 commands use IPv6-capable endpoint
aws s3 cp myfile.txt s3://my-bucket/
aws s3 ls s3://my-bucket/
```

## Boto3 Python SDK with IPv6

```python
import boto3
from botocore.config import Config

# Configure boto3 to use dualstack endpoints
config = Config(
    use_dualstack_endpoint=True
)

s3 = boto3.client(
    's3',
    region_name='us-east-1',
    config=config
)

# Upload file using the dualstack endpoint
s3.upload_file('local-file.txt', 'my-bucket', 'remote-file.txt')

# Download file
s3.download_file('my-bucket', 'remote-file.txt', 'downloaded.txt')

# Generate presigned URL (uses dualstack endpoint)
url = s3.generate_presigned_url(
    'get_object',
    Params={'Bucket': 'my-bucket', 'Key': 'file.txt'},
    ExpiresIn=3600
)
print(f"Presigned URL: {url}")
```

## S3 Bucket Policy for IPv6

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowIPv4Access",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::my-bucket/*",
            "Condition": {
                "IpAddress": {
                    "aws:SourceIp": ["203.0.113.0/24"]
                }
            }
        },
        {
            "Sid": "AllowIPv6Access",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::my-bucket/*",
            "Condition": {
                "IpAddress": {
                    "aws:SourceIp": ["2001:db8::/32"]
                }
            }
        }
    ]
}
```

## Static Website Hosting over IPv6

```bash
# Enable static website hosting
aws s3 website s3://my-bucket/ \
    --index-document index.html \
    --error-document error.html

# Website endpoint (IPv4 only)
my-bucket.s3-website-us-east-1.amazonaws.com

# For IPv6 static website, use CloudFront with S3 origin
# CloudFront supports IPv6 when IPv6 is enabled on the distribution

# Test IPv6 access via CloudFront
dig AAAA my-distribution.cloudfront.net
curl -6 https://my-distribution.cloudfront.net/
```

## Verify IPv6 S3 Connectivity

```bash
# From an IPv6-only instance, test S3 access
# Must use dualstack endpoint
curl -6 -v \
    "https://my-bucket.s3.dualstack.us-east-1.amazonaws.com/" \
    2>&1 | grep "Connected to\|< HTTP"

# Test with AWS CLI
aws s3 ls s3://my-bucket/ \
    --region us-east-1 \
    --endpoint-url https://s3.dualstack.us-east-1.amazonaws.com

# For public S3 access from an IPv6-only environment, use a dualstack endpoint.
# If you're using an S3 VPC endpoint, configure it for IPv6 or dualstack DNS.
```

## Conclusion

S3 IPv6 access over public endpoints requires using dualstack endpoints (`s3.dualstack.<region>.amazonaws.com`) instead of the standard public IPv4 endpoints. Configure the AWS CLI with `use_dualstack_endpoint = true` and boto3 with `Config(use_dualstack_endpoint=True)`. S3 bucket policies can use `aws:SourceIp` conditions with IPv6 CIDR blocks. If you access S3 through VPC endpoints, configure the endpoint IP address type and DNS record IP type for IPv6 or dualstack.
