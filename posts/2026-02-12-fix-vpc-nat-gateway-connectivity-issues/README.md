# How to Fix VPC NAT Gateway Connectivity Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, VPC, Networking, NAT Gateway, Troubleshooting

Description: Troubleshoot and resolve NAT Gateway connectivity problems in AWS VPC, including route table misconfigurations, security groups, and bandwidth limitations.

---

NAT Gateways are one of those things that either work perfectly or drive you absolutely crazy. When your private subnet instances can't reach the internet through the NAT Gateway, the problem is almost always in the route tables, subnet placement, or security configuration. Let's work through every common failure scenario.

## How NAT Gateway Routing Works

Before debugging, it helps to understand the architecture. A NAT Gateway must be placed in a **public subnet** (one with a route to an Internet Gateway). Private subnet instances route their outbound traffic to the NAT Gateway, which then forwards it through the Internet Gateway.

```mermaid
graph LR
    A[Private Subnet Instance] -->|0.0.0.0/0| B[NAT Gateway]
    B -->|In Public Subnet| C[Internet Gateway]
    C --> D[Internet]
```

If any link in this chain is broken, your private instances can't reach the internet.

## Cause 1: Route Table Misconfiguration

This is the number one issue. The private subnet's route table needs a default route pointing to the NAT Gateway.

Check the route table associated with your private subnet.

```bash
# Find the route table associated with a specific subnet
aws ec2 describe-route-tables \
  --filters "Name=association.subnet-id,Values=subnet-private123" \
  --query 'RouteTables[].Routes[]'
```

You should see a route like:

```
Destination: 0.0.0.0/0  ->  Target: nat-0abc123def456
```

If that route is missing, add it.

```bash
# Add a default route through the NAT Gateway for the private subnet
aws ec2 create-route \
  --route-table-id rtb-private123 \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id nat-0abc123def456
```

Also verify that the public subnet (where the NAT Gateway lives) has a route to the Internet Gateway.

```bash
# Check the public subnet's route table has an IGW route
aws ec2 describe-route-tables \
  --filters "Name=association.subnet-id,Values=subnet-public123" \
  --query 'RouteTables[].Routes[]'
```

You need:

```
Destination: 0.0.0.0/0  ->  Target: igw-0abc123
```

## Cause 2: NAT Gateway in the Wrong Subnet

The NAT Gateway MUST be in a public subnet. If you accidentally placed it in a private subnet, it can't reach the Internet Gateway.

Check which subnet your NAT Gateway is in and whether that subnet is public.

```bash
# Get the NAT Gateway's subnet ID
aws ec2 describe-nat-gateways \
  --nat-gateway-ids nat-0abc123def456 \
  --query 'NatGateways[].SubnetId'

# Then check if that subnet's route table has an IGW route
aws ec2 describe-route-tables \
  --filters "Name=association.subnet-id,Values=subnet-xyz789" \
  --query 'RouteTables[].Routes[?GatewayId!=`null` && starts_with(GatewayId, `igw-`)]'
```

If there's no IGW route, your NAT Gateway is in a private subnet. You'll need to create a new NAT Gateway in the correct public subnet.

## Cause 3: NAT Gateway State Issues

NAT Gateways can be in several states: pending, available, deleting, deleted, or failed. Only "available" works.

```bash
# Check the NAT Gateway's current state
aws ec2 describe-nat-gateways \
  --nat-gateway-ids nat-0abc123def456 \
  --query 'NatGateways[].{State: State, FailureCode: FailureCode, FailureMessage: FailureMessage}'
```

If the state is `failed`, the failure message will tell you why. Common reasons include:
- The Elastic IP was already associated with another resource
- The subnet doesn't have enough free IP addresses
- The Internet Gateway was detached from the VPC

## Cause 4: Network ACL Blocking Traffic

NACLs are stateless firewalls at the subnet level. They can silently block traffic even when security groups are configured correctly.

Check the NACLs for both the private subnet and the public subnet where the NAT Gateway lives.

```bash
# Check NACLs for the private subnet
aws ec2 describe-network-acls \
  --filters "Name=association.subnet-id,Values=subnet-private123" \
  --query 'NetworkAcls[].Entries'
```

Make sure inbound and outbound rules allow:
- Outbound traffic on port 80 and 443 (or all traffic)
- Inbound ephemeral ports (1024-65535) for return traffic
- The NACL on the public subnet also needs to allow traffic from the NAT Gateway

Here's a minimal NACL configuration that works for NAT Gateway traffic.

```bash
# Allow all outbound traffic from the private subnet
aws ec2 create-network-acl-entry \
  --network-acl-id acl-private123 \
  --rule-number 100 \
  --protocol -1 \
  --rule-action allow \
  --egress \
  --cidr-block 0.0.0.0/0

# Allow inbound return traffic on ephemeral ports
aws ec2 create-network-acl-entry \
  --network-acl-id acl-private123 \
  --rule-number 100 \
  --protocol 6 \
  --port-range From=1024,To=65535 \
  --rule-action allow \
  --cidr-block 0.0.0.0/0
```

## Cause 5: Security Group Misunderstanding

NAT Gateways don't have security groups - they're managed infrastructure. But the instances in your private subnet do have security groups, and those need to allow outbound traffic.

```bash
# Check outbound rules on the instance's security group
aws ec2 describe-security-groups \
  --group-ids sg-instance123 \
  --query 'SecurityGroups[].IpPermissionsEgress'
```

By default, security groups allow all outbound traffic. But if someone restricted outbound rules, you'll need to add the appropriate ones back.

## Cause 6: NAT Gateway Bandwidth and Connection Limits

A single NAT Gateway supports up to 45 Gbps of bandwidth and about 55,000 simultaneous connections to a single destination. If you're hitting these limits, connections will start failing or timing out.

Check CloudWatch metrics for your NAT Gateway.

```bash
# Check NAT Gateway connection and packet drop metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/NATGateway \
  --metric-name ErrorPortAllocation \
  --dimensions Name=NatGatewayId,Value=nat-0abc123def456 \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Sum
```

If `ErrorPortAllocation` is non-zero, you're running out of ports. Solutions include:
- Split traffic across multiple NAT Gateways
- Reduce the number of connections from your instances
- Use separate NAT Gateways in different AZs

## Cause 7: Elastic IP Issues

Each NAT Gateway requires an Elastic IP. If the EIP was released or is in an unexpected state, the NAT Gateway won't function properly.

```bash
# Check the Elastic IP associated with the NAT Gateway
aws ec2 describe-nat-gateways \
  --nat-gateway-ids nat-0abc123def456 \
  --query 'NatGateways[].NatGatewayAddresses'
```

## Testing Connectivity

From a private subnet instance, test outbound connectivity step by step.

```bash
# Test DNS resolution first
nslookup google.com

# Test HTTP connectivity
curl -v --connect-timeout 5 https://httpbin.org/ip

# Test with a specific port
nc -zv 8.8.8.8 443 -w 5
```

If DNS works but HTTP doesn't, the issue is likely in NACLs or route tables. If nothing works, it's probably the route table pointing to a missing or misconfigured NAT Gateway.

## Troubleshooting Checklist

1. Verify the private subnet route table has a 0.0.0.0/0 route to the NAT Gateway
2. Confirm the NAT Gateway is in a public subnet with an IGW route
3. Check the NAT Gateway state is "available"
4. Review NACLs on both private and public subnets
5. Verify security group outbound rules on the instance
6. Check CloudWatch for port allocation errors
7. Confirm the Elastic IP is properly associated
8. Test from the instance using curl or netcat

NAT Gateway issues are almost always routing problems. Work through the route tables methodically, and you'll find the gap. For setting up monitoring on your VPC infrastructure, check out our post on [fixing VPC endpoint issues](https://oneuptime.com/blog/post/2026-02-12-fix-vpc-endpoint-connection-refused-errors/view).
