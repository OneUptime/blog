# How to Reduce Data Transfer Costs Between VPCs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, VPC, Data Transfer, Cost Optimization, Networking

Description: Learn how to minimize inter-VPC data transfer costs using Transit Gateway, VPC peering, PrivateLink, and architectural optimizations on AWS.

---

Inter-VPC data transfer costs are one of the most overlooked items on AWS bills. When two VPCs talk to each other, whether through VPC peering, Transit Gateway, or PrivateLink, you pay for every gigabyte that crosses the boundary. The rates vary by method and whether the VPCs are in the same or different availability zones, but the charges add up fast when you have microservices spread across multiple VPCs.

Let's look at the pricing differences and the best strategies to minimize these costs.

## Understanding Inter-VPC Transfer Pricing

The cost depends on how the VPCs are connected and where they are:

| Connection Type | Same AZ | Cross AZ (Same Region) | Cross Region |
|---|---|---|---|
| VPC Peering | Free | $0.01/GB each direction | $0.02/GB each direction |
| Transit Gateway | $0.02/GB | $0.02/GB | $0.02/GB + peering attachment |
| PrivateLink | $0.01/GB + $0.01/hr per AZ | $0.01/GB + $0.01/hr per AZ | Not supported |

The critical takeaway: same-AZ VPC peering is free. Everything else has a cost.

## Choose the Right Connectivity Method

For simple point-to-point connections between two VPCs, VPC peering is the cheapest option. There's no per-hour charge, and same-AZ traffic is free.

```bash
# Create a VPC peering connection
aws ec2 create-vpc-peering-connection \
  --vpc-id vpc-0a1b2c3d4e5f67890 \
  --peer-vpc-id vpc-0f9e8d7c6b5a43210 \
  --peer-region us-east-1

# Accept the peering connection
aws ec2 accept-vpc-peering-connection \
  --vpc-peering-connection-id pcx-0a1b2c3d4e5f67890

# Add routes for the peered VPC in your route tables
aws ec2 create-route \
  --route-table-id rtb-0a1b2c3d \
  --destination-cidr-block 10.1.0.0/16 \
  --vpc-peering-connection-id pcx-0a1b2c3d4e5f67890
```

For hub-and-spoke architectures with many VPCs, Transit Gateway simplifies management but costs more per GB ($0.02 vs free for same-AZ peering). You need to weigh operational simplicity against cost.

```bash
# Create a Transit Gateway
aws ec2 create-transit-gateway \
  --description "Central hub for VPC connectivity" \
  --options '{
    "AmazonSideAsn": 64512,
    "AutoAcceptSharedAttachments": "enable",
    "DefaultRouteTableAssociation": "enable",
    "DefaultRouteTablePropagation": "enable",
    "DnsSupport": "enable"
  }'

# Attach a VPC to the Transit Gateway
aws ec2 create-transit-gateway-vpc-attachment \
  --transit-gateway-id tgw-0a1b2c3d4e5f67890 \
  --vpc-id vpc-0a1b2c3d4e5f67890 \
  --subnet-ids subnet-0a1b2c3d subnet-0e5f67890
```

## Keep Traffic in the Same Availability Zone

This is the single most impactful optimization for inter-VPC costs. Same-AZ traffic over VPC peering is free. Cross-AZ traffic costs $0.01/GB in each direction.

The challenge is that availability zone names (us-east-1a, us-east-1b) don't map to the same physical zones across accounts. Use AZ IDs instead:

```bash
# Get AZ ID mappings for your account
aws ec2 describe-availability-zones \
  --query "AvailabilityZones[].{Name: ZoneName, Id: ZoneId}" \
  --output table
```

When deploying services that communicate frequently across VPCs, place them in subnets that map to the same AZ ID (like use1-az1).

For application-level AZ awareness, you can use instance metadata:

```python
import requests

def get_current_az():
    """Get the current instance's availability zone"""
    token = requests.put(
        'http://169.254.169.254/latest/api/token',
        headers={'X-aws-ec2-metadata-token-ttl-seconds': '21600'}
    ).text

    az = requests.get(
        'http://169.254.169.254/latest/meta-data/placement/availability-zone',
        headers={'X-aws-ec2-metadata-token': token}
    ).text

    return az

def choose_target_endpoint(endpoints_by_az):
    """Route to the same-AZ endpoint to avoid cross-AZ charges"""
    current_az = get_current_az()

    # Prefer same-AZ endpoint, fall back to any available
    if current_az in endpoints_by_az:
        return endpoints_by_az[current_az]

    return list(endpoints_by_az.values())[0]
```

## Use PrivateLink for Service-to-Service Communication

When one VPC provides a service consumed by multiple other VPCs, PrivateLink can be more efficient than VPC peering. It exposes only specific services rather than entire VPC CIDR ranges, and the per-GB cost is competitive at $0.01/GB.

Create a Network Load Balancer in the provider VPC and expose it through PrivateLink:

```bash
# Provider side: create a VPC endpoint service
aws ec2 create-vpc-endpoint-service-configuration \
  --network-load-balancer-arns arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/net/my-service-nlb/abc123 \
  --acceptance-required

# Consumer side: create an interface endpoint to the service
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-consumer-0a1b2c3d \
  --service-name com.amazonaws.vpce.us-east-1.vpce-svc-0a1b2c3d4e5f67890 \
  --vpc-endpoint-type Interface \
  --subnet-ids subnet-0a1b2c3d \
  --security-group-ids sg-0a1b2c3d
```

## Consolidate VPCs Where Possible

Sometimes the cheapest inter-VPC traffic is no inter-VPC traffic at all. If two services communicate heavily and don't have a strong reason to be in separate VPCs, consider consolidating them.

Use security groups and NACLs for isolation within a single VPC instead of VPC boundaries:

```bash
# Create security groups for logical isolation within a single VPC
aws ec2 create-security-group \
  --group-name "service-a" \
  --description "Security group for Service A" \
  --vpc-id vpc-0a1b2c3d4e5f67890

aws ec2 create-security-group \
  --group-name "service-b" \
  --description "Security group for Service B" \
  --vpc-id vpc-0a1b2c3d4e5f67890

# Allow Service B to talk to Service A on specific ports only
aws ec2 authorize-security-group-ingress \
  --group-id sg-service-a \
  --protocol tcp \
  --port 8080 \
  --source-group sg-service-b
```

Within a VPC, same-AZ traffic between instances is free. Cross-AZ traffic is still $0.01/GB per direction, but you eliminate the VPC boundary overhead.

## Reduce the Volume of Inter-VPC Traffic

Beyond routing and architecture, reducing the actual bytes transferred makes a difference:

**Compress API payloads:**

```python
import gzip
import json
from flask import Flask, request, Response

app = Flask(__name__)

@app.route('/api/data', methods=['POST'])
def receive_data():
    """Accept compressed payloads from services in other VPCs"""
    if request.headers.get('Content-Encoding') == 'gzip':
        data = json.loads(gzip.decompress(request.data))
    else:
        data = request.json

    result = process(data)

    # Send compressed response
    response_data = gzip.compress(json.dumps(result).encode())
    return Response(
        response_data,
        content_type='application/json',
        headers={'Content-Encoding': 'gzip'}
    )
```

**Cache responses locally.** If Service A frequently requests the same data from Service B across a VPC boundary, cache it:

```python
import redis
import hashlib
import json

local_cache = redis.Redis(host='local-redis.cache.amazonaws.com')

def get_from_remote_service(endpoint, params, ttl=300):
    """Cache responses from remote VPC services"""
    cache_key = f"remote:{hashlib.md5(f'{endpoint}:{json.dumps(params)}'.encode()).hexdigest()}"

    cached = local_cache.get(cache_key)
    if cached:
        return json.loads(cached)

    # Only cross the VPC boundary on cache miss
    response = requests.get(endpoint, params=params)
    data = response.json()

    local_cache.setex(cache_key, ttl, json.dumps(data))
    return data
```

## Monitor Inter-VPC Transfer Costs

Track these costs with Cost Explorer and set up alerts:

```bash
# Query Cost Explorer for data transfer costs
aws ce get-cost-and-usage \
  --time-period Start=2026-01-01,End=2026-02-01 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter '{
    "Dimensions": {
      "Key": "USAGE_TYPE_GROUP",
      "Values": ["EC2: Data Transfer - Inter AZ", "EC2: Data Transfer - Region to Region"]
    }
  }'
```

For a comprehensive monitoring setup, see our guide on [setting up anomaly detection for AWS costs](https://oneuptime.com/blog/post/set-up-anomaly-detection-for-aws-costs/view).

## Summary

The hierarchy of inter-VPC cost optimization is:

1. **Eliminate unnecessary VPC boundaries** - Consolidate where it makes sense
2. **Use VPC peering for point-to-point** - Free for same-AZ traffic
3. **Keep communicating services in the same AZ** - Use AZ IDs for consistency
4. **Compress payloads** - 70-90% reduction for text data
5. **Cache across VPC boundaries** - Reduce repeated transfers
6. **Use Transit Gateway only when you need the management benefits** - It's more expensive per GB but simpler at scale

Start by understanding where your inter-VPC traffic is flowing, then apply these optimizations in order of impact. For related strategies, check out our posts on [reducing NAT Gateway data transfer costs](https://oneuptime.com/blog/post/reduce-nat-gateway-data-transfer-costs/view) and [reducing data transfer costs between AWS regions](https://oneuptime.com/blog/post/reduce-data-transfer-costs-between-aws-regions/view).
