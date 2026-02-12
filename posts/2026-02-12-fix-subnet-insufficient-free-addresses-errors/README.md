# How to Fix 'Subnet Has Insufficient Free Addresses' Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, VPC, Networking, Troubleshooting

Description: Resolve the Subnet Has Insufficient Free Addresses error in AWS by reclaiming IPs, resizing subnets, and optimizing IP address allocation.

---

The "Subnet has insufficient free addresses" error shows up when you try to launch an EC2 instance, create a Lambda function ENI, or spin up any resource that needs an IP address in a subnet that's run out of them. It's a resource exhaustion problem, and it can bring your auto-scaling and deployments to a halt.

## Understanding the Problem

Every VPC subnet has a CIDR block that defines how many IP addresses are available. AWS reserves 5 addresses in each subnet (first four and last one), so a /24 subnet gives you 251 usable addresses, not 256.

Here's the breakdown for common subnet sizes:

| CIDR | Total IPs | Usable IPs |
|------|-----------|------------|
| /24  | 256       | 251        |
| /25  | 128       | 123        |
| /26  | 64        | 59         |
| /27  | 32        | 27         |
| /28  | 16        | 11         |

When all usable IPs are taken, you get the error.

## Step 1: Check Available IP Addresses

First, see how many addresses are actually available in the subnet.

```bash
# Check available IP addresses in a subnet
aws ec2 describe-subnets \
  --subnet-ids subnet-abc123 \
  --query 'Subnets[].{SubnetId: SubnetId, CIDR: CidrBlock, AvailableIPs: AvailableIpAddressCount, AZ: AvailabilityZone}'
```

If `AvailableIpAddressCount` is 0 or very low, you've confirmed the problem.

To check all subnets in your VPC sorted by available addresses.

```bash
# List all subnets sorted by available IP count (ascending)
aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=vpc-abc123" \
  --query 'sort_by(Subnets, &AvailableIpAddressCount)[].{SubnetId: SubnetId, CIDR: CidrBlock, Available: AvailableIpAddressCount, AZ: AvailabilityZone}' \
  --output table
```

## Step 2: Find What's Using the IPs

Look at what's consuming the addresses in the subnet.

```bash
# List all network interfaces in the subnet to see what's using IPs
aws ec2 describe-network-interfaces \
  --filters "Name=subnet-id,Values=subnet-abc123" \
  --query 'NetworkInterfaces[].{IP: PrivateIpAddress, Type: InterfaceType, Description: Description, Status: Status, InstanceId: Attachment.InstanceId}' \
  --output table
```

This shows every resource using an IP, including EC2 instances, Lambda ENIs, ELB nodes, RDS instances, and more.

Look for patterns. Common culprits include:
- Stopped EC2 instances still holding IPs
- Orphaned ENIs from Lambda or ECS
- ELB nodes (each ALB can use multiple IPs per AZ)

## Step 3: Clean Up Unused Resources

Delete orphaned ENIs that are in "available" status.

```bash
# Find and list orphaned ENIs in the subnet
aws ec2 describe-network-interfaces \
  --filters "Name=subnet-id,Values=subnet-abc123" "Name=status,Values=available" \
  --query 'NetworkInterfaces[].{Id: NetworkInterfaceId, Description: Description}'

# Delete an orphaned ENI
aws ec2 delete-network-interface \
  --network-interface-id eni-orphaned123
```

Terminate stopped instances that are no longer needed.

```bash
# Find stopped instances in the subnet
aws ec2 describe-instances \
  --filters "Name=subnet-id,Values=subnet-abc123" "Name=instance-state-name,Values=stopped" \
  --query 'Reservations[].Instances[].{Id: InstanceId, Name: Tags[?Key==`Name`].Value | [0], StoppedSince: StateTransitionReason}'
```

## Step 4: Move Resources to a Less Crowded Subnet

If you can't free up enough IPs, consider moving some resources to another subnet in the same AZ.

```bash
# Find subnets in the same AZ with available addresses
aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=vpc-abc123" "Name=availability-zone,Values=us-east-1a" \
  --query 'Subnets[?AvailableIpAddressCount > `50`].{SubnetId: SubnetId, Available: AvailableIpAddressCount, CIDR: CidrBlock}'
```

## Step 5: Add a New Subnet

If existing subnets are all full, create a new one. You'll need free CIDR space in your VPC.

```bash
# Check existing subnet CIDRs to find available space
aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=vpc-abc123" \
  --query 'Subnets[].CidrBlock' \
  --output text

# Create a new subnet with available CIDR space
aws ec2 create-subnet \
  --vpc-id vpc-abc123 \
  --cidr-block 10.0.10.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=new-private-subnet}]'
```

Don't forget to associate the new subnet with the appropriate route table.

```bash
# Associate the new subnet with a route table
aws ec2 associate-route-table \
  --subnet-id subnet-new123 \
  --route-table-id rtb-private123
```

## Step 6: Add Secondary CIDR to VPC

If your VPC itself is running out of address space, you can add a secondary CIDR block.

```bash
# Add a secondary CIDR block to the VPC
aws ec2 associate-vpc-cidr-block \
  --vpc-id vpc-abc123 \
  --cidr-block 100.64.0.0/16
```

Then create new subnets in the secondary CIDR range. Note that the `100.64.0.0/16` range is commonly used as a secondary CIDR to avoid conflicts with on-premises networks.

## Step 7: Plan Better Subnet Sizing

For future VPC designs, size your subnets based on expected resource counts. Here's a practical guide.

```python
# Helper to calculate how many usable IPs a subnet provides
def usable_ips(prefix_length):
    """Calculate usable IPs in an AWS subnet given the CIDR prefix length."""
    total = 2 ** (32 - prefix_length)
    reserved = 5  # AWS reserves 5 IPs per subnet
    return total - reserved

# Common subnet sizes
for prefix in [28, 27, 26, 25, 24, 23, 22, 21, 20]:
    print(f"/{prefix}: {usable_ips(prefix)} usable IPs")
```

Rules of thumb:
- Use /24 for general workload subnets (251 IPs)
- Use /22 or larger for subnets with EKS or high Lambda concurrency (1019 IPs)
- Use /28 for subnets that only need a few IPs (like NAT Gateway subnets)

## Lambda-Specific Considerations

Lambda functions in VPCs can consume many IPs, especially under high concurrency. With Hyperplane ENIs, Lambda shares ENIs more efficiently, but each unique subnet/security-group combination still needs at least one ENI.

If Lambda is exhausting your subnet IPs, consider:
- Using larger subnets (at least /24)
- Reducing the number of subnets in the Lambda VPC config
- Consolidating security groups across functions

## EKS-Specific Considerations

EKS pods consume one IP each in the default VPC CNI configuration. A cluster running hundreds of pods can quickly exhaust a /24 subnet. Options include:
- Using /20 or /19 subnets for EKS node groups
- Enabling the VPC CNI prefix delegation feature
- Using a secondary CIDR with larger subnets

## Monitoring Subnet IP Usage

Set up monitoring to catch this before it becomes an emergency.

```bash
# Create a CloudWatch alarm for low available IPs (using a custom metric)
aws cloudwatch put-metric-alarm \
  --alarm-name "LowSubnetIPs-subnet-abc123" \
  --metric-name AvailableIpAddressCount \
  --namespace "Custom/VPC" \
  --statistic Minimum \
  --period 300 \
  --threshold 10 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:alerts
```

## Troubleshooting Checklist

1. Check available IP count in the subnet
2. Identify what's consuming the IPs
3. Delete orphaned ENIs and terminate unused instances
4. Move workloads to less crowded subnets
5. Create new subnets if needed
6. Add secondary CIDR to VPC if running out of space
7. Size subnets appropriately for the workload type
8. Set up monitoring for IP usage

Running out of subnet addresses is a capacity planning issue. The fix in the short term is cleanup and redistribution. In the long term, it's about designing your VPC with room to grow. For more VPC troubleshooting, check out our post on [Lambda ENI limits](https://oneuptime.com/blog/post/fix-enilimitreached-errors-lambda-vpc/view).
