# How to Release and Recover Elastic IP Addresses

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, VPC, Networking, EC2

Description: Learn how to properly release unused Elastic IP addresses in AWS, recover previously released EIPs, and manage EIP lifecycle to control costs and stay within limits.

---

Elastic IP addresses are a finite resource. AWS charges you for idle ones, and there's a per-account limit on how many you can have. Knowing how to properly release EIPs you're done with - and how to recover one if you accidentally release it - is a basic operational skill that'll save you money and headaches.

Let me walk through the lifecycle of managing EIPs, from identifying unused ones to handling the "oh no, I just released the wrong IP" situation.

## Finding Unused Elastic IPs

The first step is knowing which EIPs you actually have and whether they're in use. An EIP that's allocated but not associated with any resource is costing you money for nothing.

```bash
# List all EIPs and their association status
aws ec2 describe-addresses \
  --query 'Addresses[*].{IP:PublicIp,AllocationId:AllocationId,AssociationId:AssociationId,InstanceId:InstanceId,NetworkInterfaceId:NetworkInterfaceId}' \
  --output table
```

EIPs with an empty AssociationId are not attached to anything - these are the ones costing you idle fees. Look for them regularly.

For a quick count of how many orphaned EIPs you have across regions, here's a handy script.

```bash
# Check for unassociated EIPs across all regions
for region in $(aws ec2 describe-regions --query 'Regions[].RegionName' --output text); do
  count=$(aws ec2 describe-addresses \
    --region "$region" \
    --filters "Name=association-id,Values=" \
    --query 'length(Addresses)' \
    --output text 2>/dev/null)
  if [ "$count" != "0" ] && [ "$count" != "None" ]; then
    echo "$region: $count unused EIPs"
  fi
done
```

## Releasing an Elastic IP

When you're done with an EIP, release it. If it's currently associated with a resource, you need to disassociate it first.

```bash
# Step 1: Disassociate the EIP from its current resource
aws ec2 disassociate-address \
  --association-id eipassoc-0123456789abcdef0

# Step 2: Release the EIP back to the AWS pool
aws ec2 release-address \
  --allocation-id eipalloc-0123456789abcdef0
```

If you try to release an EIP that's still associated, you'll get an error. The two-step process is intentional - it prevents accidental releases.

You can also force-release by disassociating and releasing in one script.

```bash
# Find and release all unassociated EIPs in the current region
aws ec2 describe-addresses \
  --query 'Addresses[?AssociationId==null].AllocationId' \
  --output text | tr '\t' '\n' | while read alloc_id; do
    echo "Releasing $alloc_id"
    aws ec2 release-address --allocation-id "$alloc_id"
done
```

Be careful with this one - make sure you actually want to release all unassociated EIPs. Some might be intentionally unassociated (reserved for disaster recovery, for example).

## Recovering a Released Elastic IP

Here's where things get interesting. If you accidentally release an EIP that was important - maybe it was whitelisted by a partner, or hardcoded in DNS somewhere - you might be able to get it back.

AWS provides the ability to recover a recently released EIP, but only if it hasn't been allocated to another account yet.

```bash
# Try to recover a specific IP address
aws ec2 allocate-address \
  --domain vpc \
  --address 52.1.2.3
```

If the IP is available, this command succeeds and you get it back with a new allocation ID. If someone else has already claimed it, you'll get an error.

There's no guarantee of recovery. The sooner you try, the better your chances. Once the IP gets allocated to another AWS account, it's gone.

## Tagging EIPs for Better Management

One way to avoid accidentally releasing the wrong EIP is to tag them properly.

```bash
# Tag an EIP with its purpose
aws ec2 create-tags \
  --resources eipalloc-0123456789abcdef0 \
  --tags Key=Name,Value=production-nat-gateway Key=Environment,Value=production Key=Team,Value=platform

# List EIPs with their tags
aws ec2 describe-addresses \
  --query 'Addresses[*].{IP:PublicIp,Name:Tags[?Key==`Name`].Value|[0],AllocationId:AllocationId,Association:AssociationId}' \
  --output table
```

When EIPs have clear names and environment tags, it's much harder to release the wrong one by mistake.

## Automating Cleanup with Lambda

For larger organizations, a Lambda function that periodically scans for unused EIPs can prevent cost creep.

```python
import boto3

def lambda_handler(event, context):
    """Find and optionally release unused Elastic IPs."""
    ec2 = boto3.client('ec2')
    sns = boto3.client('sns')

    # Get all addresses
    response = ec2.describe_addresses()

    unused_eips = []
    for address in response['Addresses']:
        # Check if the EIP is not associated with anything
        if 'AssociationId' not in address:
            eip_info = {
                'PublicIp': address['PublicIp'],
                'AllocationId': address['AllocationId'],
                'Tags': address.get('Tags', [])
            }
            unused_eips.append(eip_info)

    if unused_eips:
        # Send notification instead of auto-releasing
        # Auto-releasing is risky - better to notify and let humans decide
        message = f"Found {len(unused_eips)} unused Elastic IPs:\n"
        for eip in unused_eips:
            name = next(
                (t['Value'] for t in eip['Tags'] if t['Key'] == 'Name'),
                'No name'
            )
            message += f"  - {eip['PublicIp']} ({name})\n"

        sns.publish(
            TopicArn='arn:aws:sns:us-east-1:123456789012:eip-alerts',
            Subject='Unused Elastic IPs Found',
            Message=message
        )

    return {
        'unused_count': len(unused_eips),
        'unused_eips': unused_eips
    }
```

Notice I'm sending notifications rather than auto-releasing. Automatically releasing EIPs is dangerous because some might be intentionally kept unassociated as standby addresses for disaster recovery. Always have a human in the loop for releases.

## Terraform Lifecycle Management

If you manage EIPs with Terraform, there's a lifecycle consideration. By default, Terraform will release an EIP when it's removed from your configuration. You can prevent accidental deletion.

```hcl
resource "aws_eip" "critical" {
  domain = "vpc"

  tags = {
    Name        = "partner-whitelisted-ip"
    Environment = "production"
  }

  # Prevent accidental deletion of this EIP
  lifecycle {
    prevent_destroy = true
  }
}
```

The `prevent_destroy` lifecycle rule means Terraform will refuse to destroy this resource, even if you remove it from the configuration. You'd have to explicitly remove the lifecycle block first, which forces a conscious decision.

## Transferring EIPs Between Accounts

If you're reorganizing your AWS accounts - maybe moving workloads to a new account as part of an AWS Organizations migration - you can transfer EIPs between accounts.

```bash
# From the source account: enable transfer
aws ec2 enable-address-transfer \
  --allocation-id eipalloc-0123456789abcdef0 \
  --transfer-account-id 987654321098

# From the destination account: accept the transfer
aws ec2 accept-address-transfer \
  --address 52.1.2.3
```

The transfer must be accepted within 7 days or it expires. During the transfer window, the EIP remains usable in the source account.

This is really useful when you have EIPs that are whitelisted by external partners. Instead of going through the process of getting new IPs whitelisted, just transfer the existing ones to the new account.

## Monitoring EIP Costs

You can track EIP costs using AWS Cost Explorer or set up billing alerts.

```bash
# Check EIP-related charges in Cost Explorer
aws ce get-cost-and-usage \
  --time-period Start=2026-02-01,End=2026-02-12 \
  --granularity DAILY \
  --filter '{
    "Dimensions": {
      "Key": "USAGE_TYPE",
      "Values": ["ElasticIP:IdleAddress"]
    }
  }' \
  --metrics "BlendedCost"
```

With the 2024 public IPv4 pricing changes, even active EIPs now have a cost. It's worth reviewing your EIP usage quarterly and asking whether each one is still necessary. For general best practices on using EIPs, check out https://oneuptime.com/blog/post/2026-02-12-elastic-ip-addresses-effectively/view.

The bottom line: treat EIPs as a cost center. Tag them, audit them regularly, have a process for release approval, and know the recovery procedure for when mistakes happen. A little lifecycle management goes a long way toward keeping your AWS bill under control.
