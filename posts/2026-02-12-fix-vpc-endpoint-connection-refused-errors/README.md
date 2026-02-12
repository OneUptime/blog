# How to Fix VPC Endpoint Connection Refused Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, VPC, Networking, Troubleshooting

Description: Resolve VPC Endpoint connection refused errors by fixing security groups, DNS settings, endpoint policies, and subnet configurations.

---

VPC Endpoints let you privately connect to AWS services without going through the internet. They're great for security and latency, but when they don't work, you get cryptic "connection refused" or "connection timed out" errors. Let's figure out what's going wrong.

## Types of VPC Endpoints

There are two types, and the troubleshooting differs:

1. **Gateway Endpoints** - for S3 and DynamoDB only. These modify route tables.
2. **Interface Endpoints** - for everything else. These create ENIs in your subnets.

Most connection refused errors come from Interface Endpoints, so we'll focus there.

## Cause 1: Security Group Blocking Traffic

Interface Endpoints have security groups, and this is the most common cause of "connection refused." The endpoint's security group needs to allow inbound traffic on the service port (usually 443) from your instances.

Check the endpoint's security group.

```bash
# Find the security groups attached to your VPC endpoint
aws ec2 describe-vpc-endpoints \
  --vpc-endpoint-ids vpce-0abc123def456 \
  --query 'VpcEndpoints[].Groups'
```

Then check if that security group allows inbound HTTPS.

```bash
# Check inbound rules on the endpoint's security group
aws ec2 describe-security-groups \
  --group-ids sg-endpoint123 \
  --query 'SecurityGroups[].IpPermissions'
```

The security group needs to allow inbound TCP port 443 from the CIDR range of your VPC or from the security groups of instances that will use the endpoint.

```bash
# Allow inbound HTTPS from the VPC CIDR to the endpoint security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-endpoint123 \
  --protocol tcp \
  --port 443 \
  --cidr 10.0.0.0/16
```

## Cause 2: Private DNS Not Enabled

When you create an Interface Endpoint, you can enable "Private DNS." This makes the default AWS service endpoint (like `sqs.us-east-1.amazonaws.com`) resolve to the endpoint's private IP instead of the public IP.

If Private DNS isn't enabled, your applications will try to connect to the public service endpoint, which won't work if you don't have internet access.

```bash
# Check if Private DNS is enabled on your endpoint
aws ec2 describe-vpc-endpoints \
  --vpc-endpoint-ids vpce-0abc123def456 \
  --query 'VpcEndpoints[].PrivateDnsEnabled'
```

To enable Private DNS, your VPC must have DNS support and DNS hostnames enabled.

```bash
# Check VPC DNS settings
aws ec2 describe-vpc-attribute \
  --vpc-id vpc-abc123 \
  --attribute enableDnsSupport

aws ec2 describe-vpc-attribute \
  --vpc-id vpc-abc123 \
  --attribute enableDnsHostnames
```

Both should return `true`. If not, enable them.

```bash
# Enable DNS support and hostnames on the VPC
aws ec2 modify-vpc-attribute \
  --vpc-id vpc-abc123 \
  --enable-dns-support '{"Value": true}'

aws ec2 modify-vpc-attribute \
  --vpc-id vpc-abc123 \
  --enable-dns-hostnames '{"Value": true}'
```

Then modify the endpoint to enable Private DNS.

```bash
# Enable Private DNS on the VPC endpoint
aws ec2 modify-vpc-endpoint \
  --vpc-endpoint-id vpce-0abc123def456 \
  --private-dns-enabled
```

## Cause 3: Endpoint Not in the Right Subnets

Interface Endpoints create ENIs in the subnets you specify. If your instance is in a subnet where the endpoint doesn't have an ENI, DNS might resolve to an endpoint in a different AZ, and cross-AZ connectivity issues can occur.

Check which subnets the endpoint is configured for.

```bash
# See which subnets the endpoint has ENIs in
aws ec2 describe-vpc-endpoints \
  --vpc-endpoint-ids vpce-0abc123def456 \
  --query 'VpcEndpoints[].SubnetIds'
```

Make sure you've included the subnets where your instances run. Add missing subnets.

```bash
# Add a subnet to the VPC endpoint
aws ec2 modify-vpc-endpoint \
  --vpc-endpoint-id vpce-0abc123def456 \
  --add-subnet-ids subnet-newsubnet123
```

## Cause 4: Endpoint Policy Restricting Access

VPC Endpoints have resource policies that control what actions are allowed through the endpoint. The default policy allows everything, but a custom policy might be too restrictive.

```bash
# Check the endpoint's policy
aws ec2 describe-vpc-endpoints \
  --vpc-endpoint-ids vpce-0abc123def456 \
  --query 'VpcEndpoints[].PolicyDocument' \
  --output text
```

If the policy doesn't allow the actions you need, update it. Here's a policy that allows full access.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "*",
      "Resource": "*"
    }
  ]
}
```

For production, you'd want to be more restrictive. Here's an example for an S3 gateway endpoint that only allows access to specific buckets.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-bucket",
        "arn:aws:s3:::my-bucket/*"
      ]
    }
  ]
}
```

## Cause 5: Gateway Endpoint Route Table Issues

For Gateway Endpoints (S3 and DynamoDB), the endpoint adds routes to the route tables you specify. If you forgot to include a route table, instances using that route table won't use the endpoint.

```bash
# Check which route tables are associated with the gateway endpoint
aws ec2 describe-vpc-endpoints \
  --vpc-endpoint-ids vpce-gateway123 \
  --query 'VpcEndpoints[].RouteTableIds'
```

Add missing route tables.

```bash
# Add a route table to the gateway endpoint
aws ec2 modify-vpc-endpoint \
  --vpc-endpoint-id vpce-gateway123 \
  --add-route-table-ids rtb-missing123
```

## Cause 6: Network ACLs

NACLs on the subnets where your endpoint ENIs live can block traffic. Make sure they allow inbound on port 443 and outbound on ephemeral ports.

```bash
# Check NACLs for the endpoint's subnet
aws ec2 describe-network-acls \
  --filters "Name=association.subnet-id,Values=subnet-endpoint123" \
  --query 'NetworkAcls[].Entries'
```

## Testing Endpoint Connectivity

From an instance in the VPC, test if DNS is resolving to the endpoint's private IP.

```bash
# Check if the service DNS resolves to a private IP
nslookup sqs.us-east-1.amazonaws.com

# Test connectivity to the endpoint
curl -v https://sqs.us-east-1.amazonaws.com --connect-timeout 5

# For the endpoint-specific DNS name
curl -v https://vpce-0abc123def456-abc123.sqs.us-east-1.vpce.amazonaws.com --connect-timeout 5
```

If the standard service DNS resolves to a public IP, Private DNS isn't working. If it resolves to a private IP but the connection times out, it's a security group or NACL issue.

## Cause 7: Endpoint Service State

Sometimes the endpoint itself is in a bad state. Check its status.

```bash
# Verify the endpoint is in the 'available' state
aws ec2 describe-vpc-endpoints \
  --vpc-endpoint-ids vpce-0abc123def456 \
  --query 'VpcEndpoints[].{State: State, DnsEntries: DnsEntries}'
```

The state should be `available`. If it's `pending` or `failed`, there might be a service issue or a configuration problem.

## Troubleshooting Checklist

1. Check the endpoint's security group allows inbound 443
2. Verify Private DNS is enabled (and VPC DNS settings support it)
3. Confirm the endpoint has ENIs in the right subnets
4. Review the endpoint policy for restrictions
5. For Gateway Endpoints, check route table associations
6. Review NACLs on relevant subnets
7. Test DNS resolution from the instance
8. Verify the endpoint state is "available"

VPC Endpoints are worth the setup effort for security and performance. Once you've got the connectivity sorted out, they're largely maintenance-free. For broader VPC networking troubleshooting, see our guide on [fixing NAT Gateway issues](https://oneuptime.com/blog/post/fix-vpc-nat-gateway-connectivity-issues/view).
