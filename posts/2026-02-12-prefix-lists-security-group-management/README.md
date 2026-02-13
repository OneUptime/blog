# How to Use Prefix Lists for Security Group Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, VPC, Security Groups, Prefix Lists, Network Security

Description: Learn how to use AWS managed and customer-managed prefix lists to simplify security group management and reduce operational overhead across your VPCs.

---

Security groups get messy fast. You start with a handful of rules, then a partner adds a new IP range, your office gets another ISP, you open access from a new AWS service, and suddenly you've got 50 rules spread across a dozen security groups - all maintained independently. When an IP range changes, you have to update it everywhere. Miss one, and you've got either a security hole or a broken application.

Prefix lists solve this problem. A prefix list is a named collection of CIDR blocks that you can reference in security group rules and route tables. Change the CIDR blocks in the prefix list, and every security group referencing it updates automatically. It's like a variable for IP ranges.

## AWS-Managed Prefix Lists

AWS provides managed prefix lists for its own services. The most commonly used ones are:

- **com.amazonaws.region.s3**: S3 gateway endpoint CIDR ranges
- **com.amazonaws.region.dynamodb**: DynamoDB gateway endpoint ranges
- **com.amazonaws.global.cloudfront.origin-facing**: CloudFront edge server IPs

Using AWS-managed prefix lists in security groups:

```bash
# Find the AWS-managed prefix list for S3
aws ec2 describe-managed-prefix-lists \
  --filters Name=owner-id,Values=AWS \
  --query 'PrefixLists[?PrefixListName==`com.amazonaws.us-east-1.s3`]'

# Use it in a security group rule
aws ec2 authorize-security-group-egress \
  --group-id sg-app123 \
  --ip-permissions '[{
    "IpProtocol": "tcp",
    "FromPort": 443,
    "ToPort": 443,
    "PrefixListIds": [{"PrefixListId": "pl-63a5400a", "Description": "Allow S3 access"}]
  }]'

# Use the CloudFront prefix list for origin security groups
aws ec2 describe-managed-prefix-lists \
  --filters Name=prefix-list-name,Values=com.amazonaws.global.cloudfront.origin-facing

aws ec2 authorize-security-group-ingress \
  --group-id sg-origin123 \
  --ip-permissions '[{
    "IpProtocol": "tcp",
    "FromPort": 443,
    "ToPort": 443,
    "PrefixListIds": [{"PrefixListId": "pl-cloudfront123", "Description": "Allow CloudFront"}]
  }]'
```

The beauty of AWS-managed prefix lists is that AWS updates them automatically. When CloudFront adds new edge locations, the prefix list gets new entries without any action from you.

## Creating Customer-Managed Prefix Lists

For your own IP ranges, create customer-managed prefix lists.

Create a prefix list for office IP addresses:

```bash
# Create a prefix list for office networks
aws ec2 create-managed-prefix-list \
  --prefix-list-name "office-networks" \
  --max-entries 20 \
  --address-family IPv4 \
  --entries '[
    {"Cidr": "203.0.113.0/24", "Description": "Main office"},
    {"Cidr": "198.51.100.0/24", "Description": "Branch office NY"},
    {"Cidr": "192.0.2.0/24", "Description": "Branch office London"}
  ]' \
  --tags Key=Purpose,Value=OfficeAccess Key=ManagedBy,Value=SecurityTeam
```

Create a prefix list for partner networks:

```bash
# Create a prefix list for third-party partner IPs
aws ec2 create-managed-prefix-list \
  --prefix-list-name "partner-networks" \
  --max-entries 50 \
  --address-family IPv4 \
  --entries '[
    {"Cidr": "100.20.30.0/24", "Description": "Partner A - API servers"},
    {"Cidr": "100.20.31.0/24", "Description": "Partner A - Monitoring"},
    {"Cidr": "172.20.0.0/16", "Description": "Partner B - Full range"}
  ]' \
  --tags Key=Purpose,Value=PartnerAccess
```

The `--max-entries` parameter is important. It determines the maximum number of entries the prefix list can hold. Each entry in a prefix list counts as one rule against the security group limit. Set it high enough for future growth but don't go overboard.

## Using Prefix Lists in Security Groups

Reference prefix lists instead of individual CIDRs in your security group rules.

Use prefix lists in security group rules:

```bash
# Allow SSH from office networks
aws ec2 authorize-security-group-ingress \
  --group-id sg-bastion123 \
  --ip-permissions '[{
    "IpProtocol": "tcp",
    "FromPort": 22,
    "ToPort": 22,
    "PrefixListIds": [{"PrefixListId": "pl-office456", "Description": "SSH from offices"}]
  }]'

# Allow API access from partner networks
aws ec2 authorize-security-group-ingress \
  --group-id sg-api123 \
  --ip-permissions '[{
    "IpProtocol": "tcp",
    "FromPort": 443,
    "ToPort": 443,
    "PrefixListIds": [{"PrefixListId": "pl-partner789", "Description": "HTTPS from partners"}]
  }]'

# Allow database access from application tier prefix list
aws ec2 authorize-security-group-ingress \
  --group-id sg-db123 \
  --ip-permissions '[{
    "IpProtocol": "tcp",
    "FromPort": 5432,
    "ToPort": 5432,
    "PrefixListIds": [{"PrefixListId": "pl-appservers", "Description": "PostgreSQL from app tier"}]
  }]'
```

## Updating Prefix Lists

When an IP range changes, update the prefix list once. Every security group using it picks up the change immediately.

Update a prefix list:

```bash
# Get current version
CURRENT_VERSION=$(aws ec2 describe-managed-prefix-lists \
  --prefix-list-ids pl-office456 \
  --query 'PrefixLists[0].Version' \
  --output text)

# Add a new office
aws ec2 modify-managed-prefix-list \
  --prefix-list-id pl-office456 \
  --current-version $CURRENT_VERSION \
  --add-entries '[{"Cidr": "10.50.0.0/16", "Description": "New Seattle office"}]'

# Remove an old office
CURRENT_VERSION=$(aws ec2 describe-managed-prefix-lists \
  --prefix-list-ids pl-office456 \
  --query 'PrefixLists[0].Version' \
  --output text)

aws ec2 modify-managed-prefix-list \
  --prefix-list-id pl-office456 \
  --current-version $CURRENT_VERSION \
  --remove-entries '[{"Cidr": "192.0.2.0/24"}]'
```

The version check ensures you don't accidentally overwrite concurrent changes. If someone else modified the prefix list between your read and write, the operation fails safely.

## Using Prefix Lists in Route Tables

Prefix lists aren't just for security groups. You can use them in route tables too.

Add a route using a prefix list:

```bash
# Route all office traffic through a VPN gateway
aws ec2 create-route \
  --route-table-id rtb-main123 \
  --destination-prefix-list-id pl-office456 \
  --gateway-id vgw-vpn123
```

This is useful when your on-premises networks change CIDR ranges. Update the prefix list, and all route tables using it adjust automatically.

## Cross-Account Sharing with RAM

Share prefix lists across accounts using AWS Resource Access Manager.

Share a prefix list:

```bash
# Share the office networks prefix list with the entire organization
aws ram create-resource-share \
  --name "office-networks-share" \
  --resource-arns arn:aws:ec2:us-east-1:123456789012:prefix-list/pl-office456 \
  --principals arn:aws:organizations::123456789012:organization/o-org123 \
  --permission-arns arn:aws:ram::aws:permission/AWSRAMDefaultPermissionPrefixList

# In receiving accounts, the prefix list appears as read-only
# They can use it in security groups but can't modify it
```

Shared prefix lists are read-only in receiving accounts. Only the owning account can modify entries. This gives your security team centralized control over which IPs are trusted.

## CloudFormation Template

Here's a CloudFormation template for managing prefix lists:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Prefix List Management

Resources:
  OfficeNetworks:
    Type: AWS::EC2::PrefixList
    Properties:
      PrefixListName: office-networks
      AddressFamily: IPv4
      MaxEntries: 20
      Entries:
        - Cidr: 203.0.113.0/24
          Description: Main office
        - Cidr: 198.51.100.0/24
          Description: Branch office NY
        - Cidr: 192.0.2.0/24
          Description: Branch office London
      Tags:
        - Key: Purpose
          Value: OfficeAccess

  PartnerNetworks:
    Type: AWS::EC2::PrefixList
    Properties:
      PrefixListName: partner-networks
      AddressFamily: IPv4
      MaxEntries: 50
      Entries:
        - Cidr: 100.20.30.0/24
          Description: Partner A
        - Cidr: 172.20.0.0/16
          Description: Partner B
      Tags:
        - Key: Purpose
          Value: PartnerAccess

  # Security group using prefix lists
  BastionSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Bastion host access
      VpcId: !ImportValue VpcId
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 22
          ToPort: 22
          SourcePrefixListId: !Ref OfficeNetworks
          Description: SSH from offices

  APISecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: API access
      VpcId: !ImportValue VpcId
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          SourcePrefixListId: !Ref OfficeNetworks
          Description: HTTPS from offices
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          SourcePrefixListId: !Ref PartnerNetworks
          Description: HTTPS from partners

  # Share prefix lists via RAM
  PrefixListShare:
    Type: AWS::RAM::ResourceShare
    Properties:
      Name: prefix-lists-share
      ResourceArns:
        - !Sub "arn:aws:ec2:${AWS::Region}:${AWS::AccountId}:prefix-list/${OfficeNetworks}"
        - !Sub "arn:aws:ec2:${AWS::Region}:${AWS::AccountId}:prefix-list/${PartnerNetworks}"
      Principals:
        - !Sub "arn:aws:organizations::${AWS::AccountId}:organization/o-org123"

Outputs:
  OfficeNetworksPrefixList:
    Value: !Ref OfficeNetworks
    Export:
      Name: OfficeNetworksPrefixListId
  PartnerNetworksPrefixList:
    Value: !Ref PartnerNetworks
    Export:
      Name: PartnerNetworksPrefixListId
```

## Security Group Rule Limits

Each prefix list entry counts against the security group rules-per-rule limit. A prefix list with 10 entries used in one ingress rule counts as 10 rules. Keep this in mind when sizing your prefix lists and planning security group capacity.

The default limit is 60 inbound and 60 outbound rules per security group. If you reference a prefix list with 20 entries, that's 20 rules used just for that one logical rule. You can request a limit increase if needed, but it's better to keep prefix lists focused and appropriately sized.

## Automation with Lambda

Automate prefix list updates for dynamic IP ranges:

```python
import boto3

ec2 = boto3.client('ec2')

def update_prefix_list(prefix_list_id, new_entries):
    """Update a prefix list with a new set of entries."""
    # Get current state
    current = ec2.describe_managed_prefix_lists(
        PrefixListIds=[prefix_list_id]
    )['PrefixLists'][0]

    current_version = current['Version']

    # Get current entries
    existing = ec2.get_managed_prefix_list_entries(
        PrefixListId=prefix_list_id
    )['Entries']

    existing_cidrs = {e['Cidr'] for e in existing}
    new_cidrs = {e['Cidr'] for e in new_entries}

    # Calculate diff
    to_add = [e for e in new_entries if e['Cidr'] not in existing_cidrs]
    to_remove = [{'Cidr': e['Cidr']} for e in existing if e['Cidr'] not in new_cidrs]

    if not to_add and not to_remove:
        print("No changes needed")
        return

    ec2.modify_managed_prefix_list(
        PrefixListId=prefix_list_id,
        CurrentVersion=current_version,
        AddEntries=to_add if to_add else [],
        RemoveEntries=to_remove if to_remove else []
    )
    print(f"Added {len(to_add)}, removed {len(to_remove)} entries")
```

Prefix lists are one of those AWS features that seem simple but make a huge operational difference. Once you start using them, you'll wonder how you ever managed security groups without them. For related IP management techniques, see our post on [managed prefix lists for IP whitelisting](https://oneuptime.com/blog/post/2026-02-12-managed-prefix-lists-ip-whitelisting/view).
