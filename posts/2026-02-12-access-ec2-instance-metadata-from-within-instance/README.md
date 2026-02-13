# How to Access EC2 Instance Metadata from Within the Instance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Instance Metadata, IMDS, Automation

Description: A practical guide to using the EC2 instance metadata service to discover instance details, credentials, and configuration from within a running instance.

---

Every EC2 instance has access to a special HTTP endpoint that provides information about itself - the Instance Metadata Service (IMDS). It's available at `http://169.254.169.254` and doesn't require authentication. This metadata is essential for scripts, applications, and automation that need to know things like "what region am I in?" or "what's my instance ID?" without hardcoding anything.

This guide covers what metadata is available, how to access it, and practical ways to use it in your applications.

## What Is Instance Metadata?

Instance metadata is data about your instance that you can access from within the instance itself. It includes:

- Instance ID, type, and AMI ID
- Public and private IP addresses
- Security groups
- IAM role credentials (temporary, auto-rotated)
- Region and availability zone
- User data script
- Network interface information
- Block device mappings

The metadata is served from a link-local address (169.254.169.254) that's only accessible from the instance. It can't be reached from the internet or from other instances.

## Accessing Metadata with curl

The most basic way to access metadata is with curl:

```bash
# Get the top-level metadata categories
curl http://169.254.169.254/latest/meta-data/
```

This returns a list of available metadata categories:

```
ami-id
ami-launch-index
ami-manifest-path
block-device-mapping/
hostname
iam/
instance-action
instance-id
instance-life-cycle
instance-type
local-hostname
local-ipv4
mac
metrics/
network/
placement/
profile
public-hostname
public-ipv4
public-keys/
reservation-id
security-groups
services/
```

Navigate into any category by appending it to the URL:

```bash
# Get the instance ID
curl http://169.254.169.254/latest/meta-data/instance-id
# Output: i-0123456789abcdef0

# Get the instance type
curl http://169.254.169.254/latest/meta-data/instance-type
# Output: t3.micro

# Get the public IP address
curl http://169.254.169.254/latest/meta-data/public-ipv4
# Output: 54.123.45.67

# Get the private IP address
curl http://169.254.169.254/latest/meta-data/local-ipv4
# Output: 10.0.1.42

# Get the availability zone
curl http://169.254.169.254/latest/meta-data/placement/availability-zone
# Output: us-east-1a

# Get the region (derived from AZ)
curl http://169.254.169.254/latest/meta-data/placement/region
# Output: us-east-1

# Get the AMI ID that was used to launch the instance
curl http://169.254.169.254/latest/meta-data/ami-id
# Output: ami-0123456789abcdef0

# Get all security groups
curl http://169.254.169.254/latest/meta-data/security-groups
# Output: web-server-sg
```

## IMDSv1 vs IMDSv2

There are two versions of the metadata service:

**IMDSv1** - Simple HTTP GET requests. No authentication. This is what we just used above.

**IMDSv2** - Requires a session token. More secure because it prevents certain types of attacks (like SSRF).

AWS strongly recommends using IMDSv2. Here's how it works:

```bash
# Step 1: Get a session token (valid for up to 6 hours)
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" \
    -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

# Step 2: Use the token in subsequent requests
curl -H "X-aws-ec2-metadata-token: $TOKEN" \
    http://169.254.169.254/latest/meta-data/instance-id
```

For detailed information on IMDSv2, see our guide on [using IMDSv2 for secure metadata access](https://oneuptime.com/blog/post/2026-02-12-use-imdsv2-for-secure-instance-metadata-access/view).

## Accessing IAM Role Credentials

One of the most important uses of instance metadata is accessing temporary IAM credentials. When you attach an IAM role to an instance, the metadata service provides automatically rotating credentials:

```bash
# First, find the role name
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/
# Output: MyEC2Role

# Then get the credentials
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/MyEC2Role
```

The response includes:

```json
{
    "Code": "Success",
    "LastUpdated": "2026-02-12T10:00:00Z",
    "Type": "AWS-HMAC",
    "AccessKeyId": "ASIAXXXXXXXXXXX",
    "SecretAccessKey": "wJalrXxxxxxxxxxxxxxxxxxx",
    "Token": "FwoGZXIvYXdzExxxxxxxxxx...",
    "Expiration": "2026-02-12T16:00:00Z"
}
```

These credentials are temporary and auto-rotated. The AWS SDKs automatically use this endpoint to get credentials, so you don't usually need to fetch them manually. But it's good to know this is how it works under the hood.

## Accessing User Data

The user data script you provided at launch time is also available:

```bash
# Get the user data that was used to bootstrap this instance
curl http://169.254.169.254/latest/user-data
```

This is useful for scripts that need to reference their own configuration or for debugging. Learn more about user data in our guide on [EC2 user data scripts](https://oneuptime.com/blog/post/2026-02-12-use-ec2-user-data-scripts-for-instance-bootstrapping/view).

## Dynamic Data

In addition to `meta-data`, there's a `dynamic` endpoint:

```bash
# Get the instance identity document (signed by AWS)
curl http://169.254.169.254/latest/dynamic/instance-identity/document
```

This returns a JSON document with instance details:

```json
{
    "accountId": "123456789012",
    "architecture": "x86_64",
    "availabilityZone": "us-east-1a",
    "imageId": "ami-0123456789abcdef0",
    "instanceId": "i-0123456789abcdef0",
    "instanceType": "t3.micro",
    "pendingTime": "2026-02-12T08:00:00Z",
    "privateIp": "10.0.1.42",
    "region": "us-east-1",
    "version": "2017-09-30"
}
```

The identity document is cryptographically signed by AWS, so you can verify that it's genuine. This is useful for registration with external services that need to verify the instance's identity.

## Practical Use Cases

### Self-Registering with a Service Discovery System

```bash
#!/bin/bash
# Register this instance with a service discovery system on boot

INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
PRIVATE_IP=$(curl -s http://169.254.169.254/latest/meta-data/local-ipv4)
AZ=$(curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone)
INSTANCE_TYPE=$(curl -s http://169.254.169.254/latest/meta-data/instance-type)

# Register with your service discovery endpoint
curl -X POST https://discovery.internal/register \
    -H "Content-Type: application/json" \
    -d "{
        \"instance_id\": \"$INSTANCE_ID\",
        \"ip\": \"$PRIVATE_IP\",
        \"az\": \"$AZ\",
        \"type\": \"$INSTANCE_TYPE\",
        \"service\": \"webapp\"
    }"
```

### Dynamic Configuration Based on Instance Type

```bash
#!/bin/bash
# Configure worker threads based on available vCPUs

INSTANCE_TYPE=$(curl -s http://169.254.169.254/latest/meta-data/instance-type)

# Map instance type to worker count
case $INSTANCE_TYPE in
    t3.micro)   WORKERS=1 ;;
    t3.small)   WORKERS=2 ;;
    t3.medium)  WORKERS=2 ;;
    m5.large)   WORKERS=4 ;;
    m5.xlarge)  WORKERS=8 ;;
    *)          WORKERS=2 ;;
esac

# Update application config
sed -i "s/WORKER_COUNT=.*/WORKER_COUNT=$WORKERS/" /etc/myapp/config
systemctl restart myapp
```

### Tagging Logs with Instance Information

```python
# Python example: include instance metadata in log entries
import requests
import logging

def get_metadata(path):
    """Fetch a value from the instance metadata service."""
    url = f"http://169.254.169.254/latest/meta-data/{path}"
    try:
        response = requests.get(url, timeout=2)
        return response.text
    except requests.exceptions.RequestException:
        return "unknown"

# Get instance details for log context
instance_id = get_metadata("instance-id")
az = get_metadata("placement/availability-zone")

# Configure logging with instance context
logging.basicConfig(
    format=f'%(asctime)s [{instance_id}] [{az}] %(levelname)s: %(message)s'
)

logger = logging.getLogger(__name__)
logger.info("Application starting")
```

### Health Check Endpoint

```python
# Flask health check that includes instance metadata
from flask import Flask, jsonify
import requests

app = Flask(__name__)

@app.route('/health')
def health():
    """Health check endpoint with instance identification."""
    return jsonify({
        'status': 'healthy',
        'instance_id': get_metadata('instance-id'),
        'instance_type': get_metadata('instance-type'),
        'az': get_metadata('placement/availability-zone'),
        'private_ip': get_metadata('local-ipv4')
    })
```

This makes it easy to identify which instance is handling a request when you're debugging load-balanced applications. Pair this with [OneUptime monitoring](https://oneuptime.com) to track health across all your instances.

## Network Interface Metadata

For instances with multiple network interfaces:

```bash
# List all network interface MAC addresses
curl http://169.254.169.254/latest/meta-data/network/interfaces/macs/

# Get details for a specific interface
MAC="0e:49:61:0f:c3:11"
curl http://169.254.169.254/latest/meta-data/network/interfaces/macs/$MAC/subnet-id
curl http://169.254.169.254/latest/meta-data/network/interfaces/macs/$MAC/vpc-id
curl http://169.254.169.254/latest/meta-data/network/interfaces/macs/$MAC/security-group-ids
```

## Tags in Metadata

Instance tags are available in metadata if you enable the feature:

```bash
# Enable tag access in instance metadata (run this from your local machine)
aws ec2 modify-instance-metadata-options \
    --instance-id i-0123456789abcdef0 \
    --instance-metadata-tags enabled
```

Then from within the instance:

```bash
# Access instance tags via metadata
curl http://169.254.169.254/latest/meta-data/tags/instance/Environment
# Output: production

curl http://169.254.169.254/latest/meta-data/tags/instance/Service
# Output: webapp
```

This eliminates the need for instances to call the EC2 API to read their own tags, which required IAM permissions and added latency.

## Timeouts and Error Handling

The metadata service is usually fast (sub-millisecond responses), but your scripts should handle failures gracefully:

```bash
# Use a timeout and fallback for metadata requests
get_metadata() {
    local path=$1
    local default=$2
    local result

    result=$(curl -s --connect-timeout 2 --max-time 5 \
        "http://169.254.169.254/latest/meta-data/$path" 2>/dev/null)

    if [ $? -ne 0 ] || [ -z "$result" ]; then
        echo "$default"
    else
        echo "$result"
    fi
}

INSTANCE_ID=$(get_metadata "instance-id" "unknown")
REGION=$(get_metadata "placement/region" "us-east-1")
```

Instance metadata is one of those AWS features that you don't think about much, but it quietly powers a lot of the automation and self-configuration that makes cloud infrastructure work. Understanding what's available and how to use it makes your instances smarter and your automation more robust.
