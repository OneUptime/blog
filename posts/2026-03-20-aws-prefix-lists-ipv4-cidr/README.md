# How to Configure Prefix Lists for IPv4 CIDR Blocks in AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, VPC, Prefix Lists, IPv4, Security Group, Networking

Description: Create and use AWS managed prefix lists to group IPv4 CIDR blocks for reuse across security groups and route tables, simplifying firewall rule management.

## Introduction

Customer-managed prefix lists are named, versioned collections of CIDR blocks. Instead of repeating the same list of IPs in dozens of security group rules, you reference a single prefix list. When an IP range changes, you update the prefix list once and all referencing rules update automatically.

## Creating a Prefix List

```bash
# Create a prefix list for office locations

aws ec2 create-managed-prefix-list \
  --prefix-list-name "office-ips" \
  --max-entries 10 \
  --address-family IPv4 \
  --entries \
    Cidr=203.0.113.0/24,Description="NYC Office" \
    Cidr=198.51.100.0/25,Description="London Office"
```

Note the returned `PrefixListId` (e.g., `pl-0123456789abcdef0`) - you'll use it in security group rules and routes.

## Viewing and Managing Prefix Lists

```bash
# List all prefix lists
aws ec2 describe-managed-prefix-lists

# Get entries in a specific prefix list
aws ec2 get-managed-prefix-list-entries \
  --prefix-list-id pl-0123456789abcdef0
```

## Adding and Removing Entries

```bash
# Add a new CIDR to the prefix list
aws ec2 modify-managed-prefix-list \
  --prefix-list-id pl-0123456789abcdef0 \
  --current-version 1 \
  --add-entries Cidr=10.50.0.0/16,Description="Partner VPN range"

# Remove an entry
aws ec2 modify-managed-prefix-list \
  --prefix-list-id pl-0123456789abcdef0 \
  --current-version 2 \
  --remove-entries Cidr=198.51.100.0/25
```

## Using a Prefix List in a Security Group

```bash
# Allow HTTPS from the prefix list (no need to list each CIDR)
aws ec2 authorize-security-group-ingress \
  --group-id sg-0123456789abcdef0 \
  --ip-permissions 'IpProtocol=tcp,FromPort=443,ToPort=443,PrefixListIds=[{PrefixListId=pl-0123456789abcdef0}]'
```

## Using a Prefix List in a Route Table

```bash
# Add a route in a subnet route table that uses a prefix list as the destination
aws ec2 create-route \
  --route-table-id rtb-0123456789abcdef0 \
  --destination-prefix-list-id pl-0123456789abcdef0 \
  --transit-gateway-id tgw-0123456789abcdef0
```

## AWS-Managed Prefix Lists

AWS provides predefined prefix lists for its own services (e.g., S3, DynamoDB) that you can use in security groups and route tables:

```bash
# Find AWS-managed prefix lists (e.g., for S3 in us-east-1)
aws ec2 describe-managed-prefix-lists \
  --filters Name=owner-id,Values=AWS Name=prefix-list-name,Values=com.amazonaws.us-east-1.s3
```

## Sharing Customer-Managed Prefix Lists with RAM

Customer-managed prefix lists can be shared across AWS accounts using Resource Access Manager:

```bash
# Share a prefix list with another account
aws ram create-resource-share \
  --name "shared-prefix-lists" \
  --resource-arns arn:aws:ec2:us-east-1:123456789012:prefix-list/pl-0123456789abcdef0 \
  --principals 987654321098
```

## Conclusion

Managed prefix lists eliminate redundant CIDR entries across security groups and route tables. They are especially valuable for organizations with many environments that share the same trusted IP ranges, reducing the risk of inconsistent firewall rules.
