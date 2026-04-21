# How to Troubleshoot IPv4 Connectivity in AWS VPC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, VPC, IPv4, Networking, Troubleshooting, Cloud

Description: Learn how to systematically diagnose and resolve IPv4 connectivity issues within AWS VPCs, including security groups, route tables, NACLs, and Internet Gateway problems.

## Introduction

IPv4 connectivity issues in AWS VPCs can stem from multiple layers: security groups, network ACLs, route tables, internet gateways, or NAT gateways. This guide walks through each layer systematically.

## Step 1: Verify the Instance Has an IP Address

```bash
aws ec2 describe-instances \
  --instance-ids i-xxxxxxxxxxxxxxxxx \
  --query 'Reservations[0].Instances[0].{PublicIP:PublicIpAddress,PrivateIP:PrivateIpAddress,State:State.Name}'
```

## Step 2: Check Security Groups

Security groups are stateful - verify both inbound and outbound rules:

```bash
# List security groups for instance

aws ec2 describe-instances \
  --instance-ids i-xxxxxxxxxxxxxxxxx \
  --query 'Reservations[0].Instances[0].SecurityGroups'

# Check inbound and outbound rules
aws ec2 describe-security-groups \
  --group-ids sg-xxxxxxxxxxxxxxxxx \
  --query 'SecurityGroups[0].{Inbound:IpPermissions,Outbound:IpPermissionsEgress}'
```

Common issues:
- Missing inbound rule for your IP on port 22/80/443
- Overly restrictive egress rules blocking outbound traffic

## Step 3: Check Route Tables

Ensure the subnet has routes to reach the destination:

```bash
# Get subnet route table for an explicit subnet association
aws ec2 describe-route-tables \
  --filters "Name=association.subnet-id,Values=subnet-xxxxxxxxxxxxxxxxx"

# If this returns no route table, check the VPC's main route table
aws ec2 describe-route-tables \
  --filters "Name=vpc-id,Values=vpc-xxxxxxxxxxxxxxxxx" "Name=association.main,Values=true"
```

Subnets without an explicit route table association use the VPC's main route table.

For internet access, look for:
- `0.0.0.0/0` → Internet Gateway (for public subnets)
- `0.0.0.0/0` → NAT Gateway (for private subnets)

## Step 4: Verify Internet Gateway

```bash
aws ec2 describe-internet-gateways \
  --filters "Name=attachment.vpc-id,Values=vpc-xxxxxxxxxxxxxxxxx"
```

Ensure the IGW is attached to your VPC and state is `available`.

## Step 5: Check Network ACLs

NACLs are stateless - both inbound and outbound rules must allow traffic:

```bash
aws ec2 describe-network-acls \
  --filters "Name=association.subnet-id,Values=subnet-xxxxxxxxxxxxxxxxx"
```

## Step 6: Check NAT Gateway for Private Subnets

```bash
aws ec2 describe-nat-gateways \
  --filter "Name=vpc-id,Values=vpc-xxxxxxxxxxxxxxxxx"
```

Ensure NAT Gateway state is `available`. For internet-bound IPv4 traffic, confirm it is a public NAT gateway in a public subnet with a route to an Internet Gateway.

## Step 7: Use VPC Flow Logs

Enable flow logs to see accepted/rejected traffic:

```bash
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-xxxxxxxxxxxxxxxxx \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name /aws/vpc/flowlogs \
  --deliver-logs-permission-arn arn:aws:iam::123456789012:role/publishFlowLogs
```

Query rejected traffic in CloudWatch Logs Insights:

```text
fields @timestamp, srcAddr, dstAddr, dstPort, action
| filter action = "REJECT"
| sort @timestamp desc
| limit 50
```

## Step 8: Test Connectivity from Another Instance

Use AWS Systems Manager to run a connectivity test without SSH:

```bash
aws ssm start-session --target i-xxxxxxxxxxxxxxxxx
# Then from inside:
curl -v http://target-ip:80
nc -zv target-ip 443
```

## Conclusion

AWS VPC connectivity issues follow a predictable pattern: check instance state, security groups, route tables, network ACLs, and gateways in that order. VPC Flow Logs are invaluable for identifying rejected traffic at the network level.
