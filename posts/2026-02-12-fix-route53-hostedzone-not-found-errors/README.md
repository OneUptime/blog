# How to Fix Route 53 'HostedZone not found' Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Route 53, DNS, Debugging

Description: Troubleshoot and fix Route 53 HostedZone not found errors caused by wrong zone IDs, deleted zones, private zone configurations, and cross-account access issues.

---

The "HostedZone not found" error from Route 53 means the API can't locate the hosted zone you're referencing. It could be a wrong zone ID, a zone in a different account, a private zone visibility issue, or a zone that was deleted. Let's track it down.

## Verify the Hosted Zone ID

The hosted zone ID is the most commonly mistyped piece of the puzzle. It looks something like `Z1234567890ABC` and is easy to confuse with other identifiers.

```bash
# List all hosted zones in the account
aws route53 list-hosted-zones \
    --query 'HostedZones[].{Id:Id,Name:Name,Private:Config.PrivateZone}' \
    --output table
```

Route 53 zone IDs come with a `/hostedzone/` prefix in some contexts but not others. Make sure you're using the right format:

```bash
# The API returns IDs like /hostedzone/Z1234567890ABC
# But some API calls want just Z1234567890ABC

# This works
aws route53 get-hosted-zone --id Z1234567890ABC

# This also works
aws route53 get-hosted-zone --id /hostedzone/Z1234567890ABC
```

In CloudFormation or Terraform, be consistent:

```yaml
# CloudFormation - use just the ID
Resources:
  DNSRecord:
    Type: AWS::Route53::RecordSet
    Properties:
      HostedZoneId: Z1234567890ABC  # Not /hostedzone/Z1234567890ABC
      Name: app.example.com
      Type: A
      TTL: 300
      ResourceRecords:
        - 1.2.3.4
```

## Wrong AWS Account

Hosted zones are tied to specific AWS accounts. If you're working with multiple accounts, you might be looking in the wrong one.

```bash
# Check which account you're currently using
aws sts get-caller-identity

# List hosted zones in this account
aws route53 list-hosted-zones --query 'HostedZones[].Name'
```

If the zone is in a different account, you need to either:
1. Switch to the correct account credentials
2. Use cross-account IAM roles
3. Set up cross-account DNS delegation

```bash
# Assume a role in the other account
aws sts assume-role \
    --role-arn arn:aws:iam::987654321098:role/Route53Access \
    --role-session-name dns-update

# Use the returned credentials to access Route 53
```

## Private Hosted Zones

Private hosted zones are only visible to VPCs that are associated with them. If you're trying to resolve records in a private zone from outside the associated VPCs, it won't work.

```bash
# Check if a zone is private and which VPCs it's associated with
aws route53 get-hosted-zone --id Z1234567890ABC \
    --query '{Private:HostedZone.Config.PrivateZone,VPCs:VPCs}'
```

If you need a new VPC to resolve records in a private zone, associate it:

```bash
# Associate a VPC with a private hosted zone
aws route53 associate-vpc-with-hosted-zone \
    --hosted-zone-id Z1234567890ABC \
    --vpc VPCRegion=us-east-1,VPCId=vpc-12345678
```

For cross-account private zones, you need to create an authorization first in the zone's account, then associate from the VPC's account:

```bash
# In the zone owner's account: create authorization
aws route53 create-vpc-association-authorization \
    --hosted-zone-id Z1234567890ABC \
    --vpc VPCRegion=us-east-1,VPCId=vpc-from-other-account

# In the VPC owner's account: associate
aws route53 associate-vpc-with-hosted-zone \
    --hosted-zone-id Z1234567890ABC \
    --vpc VPCRegion=us-east-1,VPCId=vpc-from-other-account
```

## Deleted Hosted Zone

If someone deleted the hosted zone, it's gone. Route 53 doesn't have a recycle bin for hosted zones.

Check CloudTrail to see if and when it was deleted:

```bash
# Search CloudTrail for hosted zone deletion events
aws cloudtrail lookup-events \
    --lookup-attributes AttributeKey=EventName,AttributeValue=DeleteHostedZone \
    --max-results 10 \
    --query 'Events[].{Time:EventTime,User:Username}'
```

If the zone was deleted and you need to recreate it, keep in mind that the new zone will get a different set of name servers. If this is a public zone, you'll need to update the NS records at your domain registrar.

```bash
# Create a new hosted zone
aws route53 create-hosted-zone \
    --name example.com \
    --caller-reference "recreated-$(date +%s)"

# Get the new name servers
aws route53 get-hosted-zone --id <new-zone-id> \
    --query 'DelegationSet.NameServers'
```

## Domain Not Delegated to Route 53

For public hosted zones, the domain's registrar must point to Route 53's name servers. If the delegation is missing or wrong, DNS resolution fails.

```bash
# Check what name servers the domain is actually using
dig example.com NS +short

# Compare with what Route 53 assigned
aws route53 get-hosted-zone --id Z1234567890ABC \
    --query 'DelegationSet.NameServers'
```

If they don't match, update the NS records at your registrar.

## Multiple Hosted Zones for the Same Domain

You can have multiple hosted zones for the same domain name (both public and private, or multiple public zones). This can cause confusion:

```bash
# Find all zones for a specific domain
aws route53 list-hosted-zones-by-name \
    --dns-name example.com \
    --query 'HostedZones[?Name==`example.com.`].{Id:Id,Private:Config.PrivateZone}'
```

If you have multiple zones, you might be referencing the wrong one's ID. The active one is whichever has its name servers set at the registrar (for public zones) or is associated with your VPC (for private zones).

## CloudFormation and Terraform References

In infrastructure as code, zone ID references can go stale:

```hcl
# Terraform - use data source to look up zone dynamically
data "aws_route53_zone" "main" {
  name         = "example.com"
  private_zone = false
}

resource "aws_route53_record" "app" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"
  ttl     = 300
  records = ["1.2.3.4"]
}
```

Using a data source lookup instead of hardcoding the zone ID prevents stale references:

```yaml
# CloudFormation - use a parameter or SSM reference
Parameters:
  HostedZoneId:
    Type: AWS::Route53::HostedZone::Id
    Description: The Route 53 hosted zone ID

Resources:
  DNSRecord:
    Type: AWS::Route53::RecordSet
    Properties:
      HostedZoneId: !Ref HostedZoneId
      Name: app.example.com
      Type: A
      TTL: 300
      ResourceRecords:
        - 1.2.3.4
```

## IAM Permissions

Make sure your IAM identity has the right permissions for Route 53:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "route53:GetHostedZone",
                "route53:ListHostedZones",
                "route53:ChangeResourceRecordSets",
                "route53:ListResourceRecordSets"
            ],
            "Resource": "arn:aws:route53:::hostedzone/Z1234567890ABC"
        },
        {
            "Effect": "Allow",
            "Action": [
                "route53:ListHostedZones",
                "route53:GetHostedZoneCount"
            ],
            "Resource": "*"
        }
    ]
}
```

Some Route 53 actions like `ListHostedZones` require `Resource: "*"` because they're account-level operations.

For monitoring DNS configuration changes and catching issues early, set up [infrastructure monitoring](https://oneuptime.com/blog/post/aws-cloudwatch-alerting-best-practices/view) that tracks Route 53 changes and alerts on unexpected modifications.

## Summary

"HostedZone not found" usually means the zone ID is wrong, you're in the wrong account, the zone was deleted, or it's a private zone not visible to your VPC. List your hosted zones to find the correct ID, verify your account, check CloudTrail for deletions, and ensure private zones are associated with the right VPCs. Use data source lookups in IaC instead of hardcoding zone IDs.
