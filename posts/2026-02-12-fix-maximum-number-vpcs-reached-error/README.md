# How to Fix 'The maximum number of VPCs has been reached' Error

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, VPC, Networking, Troubleshooting

Description: Resolve the AWS error about reaching the maximum number of VPCs per region, including how to request quota increases and clean up unused VPCs.

---

You're trying to create a new VPC in AWS and you get this error:

```
The maximum number of VPCs has been reached.
```

By default, AWS gives you a limit of 5 VPCs per region. That might sound like plenty when you're first starting out, but it fills up fast. Between development environments, staging setups, testing accounts, and the VPCs that CloudFormation or Terraform creates, you can hit that limit quicker than expected.

Here's how to figure out what's consuming your VPC quota and how to get more room.

## Check Your Current VPC Usage

First, let's see how many VPCs you actually have:

```bash
# Count VPCs in the current region
aws ec2 describe-vpcs \
  --query 'length(Vpcs)' \
  --output text

# List all VPCs with their details
aws ec2 describe-vpcs \
  --query 'Vpcs[*].{VpcId:VpcId,CIDR:CidrBlock,Name:Tags[?Key==`Name`].Value|[0],IsDefault:IsDefault}' \
  --output table
```

You might discover VPCs you forgot about - leftover from old projects, testing, or failed CloudFormation stacks.

## Check Your Current Quota

```bash
# Check the VPC quota for the current region
aws service-quotas get-service-quota \
  --service-code vpc \
  --quota-code L-F678F1CE \
  --query 'Quota.Value' \
  --output text
```

The default is 5. If you've already requested an increase, it might be higher.

## Option 1: Clean Up Unused VPCs

Before requesting more quota, take a look at what you can remove. Many accounts have VPCs sitting around that nobody's using.

### Find Empty VPCs

A VPC is probably safe to delete if it has no running instances, no active NAT gateways, and no connected resources.

```bash
# For each VPC, check if it has any instances
for vpc in $(aws ec2 describe-vpcs --query 'Vpcs[*].VpcId' --output text); do
  count=$(aws ec2 describe-instances \
    --filters Name=vpc-id,Values=$vpc \
    --query 'length(Reservations[*].Instances[*])' \
    --output text)
  name=$(aws ec2 describe-vpcs --vpc-ids $vpc \
    --query 'Vpcs[0].Tags[?Key==`Name`].Value|[0]' --output text)
  echo "VPC: $vpc ($name) - Instances: $count"
done
```

### Delete an Unused VPC

You can't just delete a VPC - you need to remove its dependent resources first. Here's the general order:

```bash
VPC_ID="vpc-0abc123def456"

# 1. Delete NAT Gateways
for nat in $(aws ec2 describe-nat-gateways \
  --filter Name=vpc-id,Values=$VPC_ID \
  --query 'NatGateways[*].NatGatewayId' --output text); do
  echo "Deleting NAT Gateway: $nat"
  aws ec2 delete-nat-gateway --nat-gateway-id $nat
done

# 2. Detach and delete Internet Gateways
for igw in $(aws ec2 describe-internet-gateways \
  --filters Name=attachment.vpc-id,Values=$VPC_ID \
  --query 'InternetGateways[*].InternetGatewayId' --output text); do
  echo "Detaching and deleting IGW: $igw"
  aws ec2 detach-internet-gateway --internet-gateway-id $igw --vpc-id $VPC_ID
  aws ec2 delete-internet-gateway --internet-gateway-id $igw
done

# 3. Delete subnets
for subnet in $(aws ec2 describe-subnets \
  --filters Name=vpc-id,Values=$VPC_ID \
  --query 'Subnets[*].SubnetId' --output text); do
  echo "Deleting subnet: $subnet"
  aws ec2 delete-subnet --subnet-id $subnet
done

# 4. Delete route tables (except the main one)
for rt in $(aws ec2 describe-route-tables \
  --filters Name=vpc-id,Values=$VPC_ID \
  --query 'RouteTables[?Associations[0].Main!=`true`].RouteTableId' --output text); do
  echo "Deleting route table: $rt"
  aws ec2 delete-route-table --route-table-id $rt
done

# 5. Delete security groups (except default)
for sg in $(aws ec2 describe-security-groups \
  --filters Name=vpc-id,Values=$VPC_ID \
  --query 'SecurityGroups[?GroupName!=`default`].GroupId' --output text); do
  echo "Deleting security group: $sg"
  aws ec2 delete-security-group --group-id $sg
done

# 6. Delete VPC endpoints
for vpce in $(aws ec2 describe-vpc-endpoints \
  --filters Name=vpc-id,Values=$VPC_ID \
  --query 'VpcEndpoints[*].VpcEndpointId' --output text); do
  echo "Deleting VPC endpoint: $vpce"
  aws ec2 delete-vpc-endpoints --vpc-endpoint-ids $vpce
done

# 7. Finally, delete the VPC
aws ec2 delete-vpc --vpc-id $VPC_ID
echo "VPC $VPC_ID deleted"
```

Be careful with this. Double-check that the VPC truly isn't being used before deleting it.

## Option 2: Request a Quota Increase

If you genuinely need more VPCs, requesting an increase is straightforward. AWS is generally pretty generous with VPC quota increases.

```bash
# Request a VPC quota increase to 10
aws service-quotas request-service-quota-increase \
  --service-code vpc \
  --quota-code L-F678F1CE \
  --desired-value 10
```

You can also do this through the AWS Console:

1. Go to Service Quotas
2. Search for "VPC"
3. Find "VPCs per Region"
4. Click "Request quota increase"
5. Enter your desired value

Quota increases for VPCs are usually approved quickly - often within minutes. AWS can grant up to 100 or more VPCs per region if you have a valid use case.

### Check the Status of Your Request

```bash
# List pending quota requests
aws service-quotas list-requested-service-quota-change-history-by-quota \
  --service-code vpc \
  --quota-code L-F678F1CE \
  --query 'RequestedQuotas[*].{Status:Status,Desired:DesiredValue,Created:Created}'
```

## Option 3: Consolidate VPCs

If you're hitting VPC limits because of environment sprawl, consider whether you really need separate VPCs for everything. Some alternatives:

### Use Separate Subnets Instead of Separate VPCs

Instead of one VPC per environment, you can use a single VPC with separate subnets for dev, staging, and production. Use security groups and NACLs to isolate traffic.

```
VPC (10.0.0.0/16)
  ├── Production Subnets (10.0.0.0/20)
  ├── Staging Subnets (10.0.16.0/20)
  └── Development Subnets (10.0.32.0/20)
```

### Use AWS Organizations with Multiple Accounts

Instead of multiple VPCs in one account, use separate AWS accounts for each environment. Each account gets its own VPC quota. This also provides better security isolation.

## Things to Watch Out For

### Don't Delete the Default VPC

Every region comes with a default VPC. Some AWS services require it, and some console wizards assume it exists. If you delete it, you can recreate it:

```bash
# Recreate the default VPC (if you deleted it)
aws ec2 create-default-vpc
```

### VPC Peering Connections

If a VPC has peering connections, you'll need to delete those before removing the VPC. The deletion script above doesn't handle peering.

```bash
# Check for peering connections
aws ec2 describe-vpc-peering-connections \
  --filters Name=requester-vpc-info.vpc-id,Values=$VPC_ID \
  --query 'VpcPeeringConnections[*].VpcPeeringConnectionId'
```

### CloudFormation Stacks

Some VPCs are managed by CloudFormation. If you delete them manually, the stack will be in a broken state. Check first:

```bash
# Check if any CloudFormation stacks reference this VPC
aws cloudformation describe-stack-resources \
  --query "StackResources[?ResourceType=='AWS::EC2::VPC' && PhysicalResourceId=='$VPC_ID']"
```

If it's a CloudFormation-managed VPC, delete the stack instead.

## Monitoring VPC Usage

Set up monitoring so you don't get surprised by this error in the middle of a deployment. You can track your VPC count with a simple script or use a monitoring platform like [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-alternatives/view) to alert you when you're approaching limits.

The VPC limit error is annoying, but it's one of the easier AWS issues to resolve. Either clean up what you're not using or ask for more - both are quick fixes.
