# How to Fix Error Deleting VPC DependencyViolation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, VPC, Networking, Troubleshooting

Description: Resolve the DependencyViolation error when deleting VPCs with Terraform by identifying and removing all dependent resources like subnets, ENIs, and gateways.

---

The `DependencyViolation` error when deleting a VPC is one of the most frustrating Terraform errors because it tells you the VPC has dependent resources but does not always say which ones. AWS requires all resources within a VPC to be deleted before the VPC itself can be removed. This guide shows you how to find and remove those dependencies.

## What the Error Looks Like

```text
Error: error deleting VPC (vpc-0abc123def456789):
DependencyViolation: The vpc 'vpc-0abc123def456789' has
dependencies and cannot be deleted.
    status code: 400, request id: abc123-def456
```

## Why This Happens

A VPC can have dozens of different resource types attached to it. When you run `terraform destroy` or remove a VPC from your configuration, Terraform tries to delete resources in the correct order based on its dependency graph. But sometimes:

1. Resources were created outside of Terraform (manually or by AWS services)
2. Terraform's dependency graph does not capture all implicit dependencies
3. AWS-managed resources (like default security groups or network interfaces created by other services) block deletion
4. The destroy order does not account for all nested dependencies

## Finding the Dependent Resources

The first step is to identify what is still attached to the VPC. Here is a systematic approach:

### Check for Subnets

```bash
aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=vpc-0abc123def456789" \
  --query "Subnets[*].{ID:SubnetId,CIDR:CidrBlock}" \
  --output table
```

### Check for Internet Gateways

```bash
aws ec2 describe-internet-gateways \
  --filters "Name=attachment.vpc-id,Values=vpc-0abc123def456789" \
  --query "InternetGateways[*].InternetGatewayId" \
  --output table
```

### Check for NAT Gateways

```bash
aws ec2 describe-nat-gateways \
  --filter "Name=vpc-id,Values=vpc-0abc123def456789" \
  --query "NatGateways[*].{ID:NatGatewayId,State:State}" \
  --output table
```

### Check for Network Interfaces

This is often the culprit. ENIs (Elastic Network Interfaces) created by services like Lambda, ELB, or RDS can linger:

```bash
aws ec2 describe-network-interfaces \
  --filters "Name=vpc-id,Values=vpc-0abc123def456789" \
  --query "NetworkInterfaces[*].{ID:NetworkInterfaceId,Type:InterfaceType,Description:Description,Status:Status}" \
  --output table
```

### Check for Security Groups

Every VPC has a default security group that cannot be deleted, but custom security groups must be removed:

```bash
aws ec2 describe-security-groups \
  --filters "Name=vpc-id,Values=vpc-0abc123def456789" \
  --query "SecurityGroups[*].{ID:GroupId,Name:GroupName}" \
  --output table
```

### Check for Route Tables

```bash
aws ec2 describe-route-tables \
  --filters "Name=vpc-id,Values=vpc-0abc123def456789" \
  --query "RouteTables[*].{ID:RouteTableId,Associations:Associations[*].SubnetId}" \
  --output table
```

### Check for VPC Endpoints

```bash
aws ec2 describe-vpc-endpoints \
  --filters "Name=vpc-id,Values=vpc-0abc123def456789" \
  --query "VpcEndpoints[*].{ID:VpcEndpointId,Service:ServiceName}" \
  --output table
```

### Check for Load Balancers

```bash
aws elbv2 describe-load-balancers \
  --query "LoadBalancers[?VpcId=='vpc-0abc123def456789'].{Name:LoadBalancerName,ARN:LoadBalancerArn}" \
  --output table
```

### Check for RDS Instances

```bash
aws rds describe-db-instances \
  --query "DBInstances[?DBSubnetGroup.VpcId=='vpc-0abc123def456789'].{ID:DBInstanceIdentifier}" \
  --output table
```

## Fixing the Issue in Terraform

### Fix 1: Let Terraform Handle the Destroy Order

If all resources are managed by Terraform, the issue is usually a missing dependency. Add explicit `depends_on` where needed:

```hcl
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
}

# NAT Gateway depends on IGW and subnet
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public.id

  depends_on = [aws_internet_gateway.main]
}
```

### Fix 2: Delete Resources Manually Before Destroying VPC

If resources were created outside Terraform, delete them manually:

```bash
# Delete network interfaces
aws ec2 delete-network-interface --network-interface-id eni-0abc123

# Detach and delete internet gateway
aws ec2 detach-internet-gateway \
  --internet-gateway-id igw-0abc123 \
  --vpc-id vpc-0abc123def456789
aws ec2 delete-internet-gateway --internet-gateway-id igw-0abc123

# Delete subnets
aws ec2 delete-subnet --subnet-id subnet-0abc123

# Delete security groups (except default)
aws ec2 delete-security-group --group-id sg-0abc123

# Delete route table associations and route tables
aws ec2 disassociate-route-table --association-id rtbassoc-0abc123
aws ec2 delete-route-table --route-table-id rtb-0abc123
```

### Fix 3: Use a Cleanup Script

For complex VPCs with many resources, a cleanup script can automate the process:

```bash
#!/bin/bash
VPC_ID="vpc-0abc123def456789"

# Delete NAT Gateways (they take time to delete)
for nat in $(aws ec2 describe-nat-gateways \
  --filter "Name=vpc-id,Values=$VPC_ID" \
  --query "NatGateways[*].NatGatewayId" --output text); do
  echo "Deleting NAT Gateway $nat"
  aws ec2 delete-nat-gateway --nat-gateway-id $nat
done

echo "Waiting for NAT Gateways to delete..."
sleep 60

# Delete ELBs
for lb in $(aws elbv2 describe-load-balancers \
  --query "LoadBalancers[?VpcId=='$VPC_ID'].LoadBalancerArn" --output text); do
  echo "Deleting Load Balancer $lb"
  aws elbv2 delete-load-balancer --load-balancer-arn $lb
done

# Delete ENIs
for eni in $(aws ec2 describe-network-interfaces \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query "NetworkInterfaces[*].NetworkInterfaceId" --output text); do
  echo "Deleting ENI $eni"
  aws ec2 delete-network-interface --network-interface-id $eni 2>/dev/null
done

# Continue with other resources...
echo "Done cleaning up VPC dependencies"
```

### Fix 4: Handle Lambda VPC ENIs

Lambda functions in a VPC create ENIs that persist even after the function is deleted. These are managed by the `aws-lambda` service and can take up to 20 minutes to be cleaned up after the Lambda function is removed.

```bash
# Find Lambda-managed ENIs
aws ec2 describe-network-interfaces \
  --filters "Name=vpc-id,Values=vpc-0abc123def456789" \
             "Name=requester-id,Values=*lambda*" \
  --query "NetworkInterfaces[*].NetworkInterfaceId"
```

If they are stuck, you can try deleting them manually, but you may need to wait for the Lambda service to release them.

## Preventing DependencyViolation Errors

### Structure Your Terraform Code Properly

Organize resources so that VPC dependencies are clear:

```hcl
# Module structure
module "vpc" {
  source = "./modules/vpc"
}

module "security" {
  source = "./modules/security"
  vpc_id = module.vpc.vpc_id
}

module "database" {
  source     = "./modules/database"
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
  depends_on = [module.security]
}
```

### Use Terraform's Destroy Targeting

If you need to destroy resources in a specific order:

```bash
# Destroy dependent resources first
terraform destroy -target=module.database
terraform destroy -target=module.security

# Then destroy the VPC
terraform destroy -target=module.vpc
```

### Tag Everything

Tags help you identify which resources belong to which VPC and who created them:

```hcl
resource "aws_subnet" "private" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"

  tags = {
    Name      = "private-subnet"
    VPC       = "main"
    ManagedBy = "terraform"
  }
}
```

## Monitoring VPC Resources

Use [OneUptime](https://oneuptime.com) to monitor your VPC resources and get alerts when unexpected resources appear. This helps you catch manually created resources before they cause problems during Terraform destroy operations.

## Conclusion

The `DependencyViolation` error when deleting a VPC means there are still resources attached to it. The fix involves identifying all dependent resources using the AWS CLI, removing them, and then deleting the VPC. To prevent this in the future, manage all VPC resources through Terraform, use explicit dependencies, and tag everything for easy identification. When dealing with AWS-managed ENIs (from Lambda, ELB, etc.), be prepared to wait for AWS to clean them up before the VPC can be deleted.
