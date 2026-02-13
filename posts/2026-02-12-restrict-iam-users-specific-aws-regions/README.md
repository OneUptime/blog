# How to Restrict IAM Users to Specific AWS Regions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, IAM, Security, Compliance

Description: Learn how to restrict IAM users and roles to specific AWS regions using IAM policies, SCPs, and condition keys for compliance and cost control.

---

Not every user needs access to every AWS region. Compliance requirements like GDPR might mandate that data stays in specific regions. Cost controls might require that resources only run in regions where you have reserved capacity. Or you might simply want to prevent accidental deployments in regions you don't use.

AWS provides several mechanisms to enforce region restrictions. Let's walk through each approach and when to use it.

## Approach 1: IAM Policy with Region Condition

The simplest approach is an IAM policy that denies actions outside your approved regions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyAllOutsideApprovedRegions",
      "Effect": "Deny",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:RequestedRegion": [
            "us-east-1",
            "us-west-2",
            "eu-west-1"
          ]
        },
        "ForAnyValue:StringNotLike": {
          "aws:CalledVia": [
            "cloudformation.amazonaws.com"
          ]
        }
      }
    }
  ]
}
```

The `aws:RequestedRegion` condition key checks which region an API call is targeting. If it's not in the approved list, the request is denied.

Note the `aws:CalledVia` exception: CloudFormation sometimes makes calls in multiple regions (for global resources). Without this exception, CloudFormation stacks might fail.

### Attaching the Policy

```bash
# Create the region restriction policy
aws iam create-policy \
  --policy-name RegionRestriction \
  --policy-document file://region-restriction.json

# Attach to a group so it applies to all members
aws iam attach-group-policy \
  --group-name Developers \
  --policy-arn arn:aws:iam::123456789012:policy/RegionRestriction
```

## Handling Global Services

Some AWS services are global - they don't belong to a specific region. IAM, Route 53, CloudFront, and AWS Organizations all have endpoints in `us-east-1` but serve global purposes. If you restrict to only `eu-west-1`, these services break.

Here's a more practical policy that handles global services:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowGlobalServices",
      "Effect": "Allow",
      "Action": [
        "iam:*",
        "sts:*",
        "organizations:*",
        "route53:*",
        "route53domains:*",
        "cloudfront:*",
        "waf:*",
        "wafv2:*",
        "waf-regional:*",
        "support:*",
        "health:*",
        "trustedadvisor:*",
        "budgets:*",
        "ce:*",
        "cur:*",
        "globalaccelerator:*",
        "importexport:*",
        "shield:*",
        "tag:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "AllowRegionalServicesInApprovedRegions",
      "Effect": "Allow",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": [
            "us-east-1",
            "us-west-2",
            "eu-west-1"
          ]
        }
      }
    },
    {
      "Sid": "DenyRegionalServicesOutsideApprovedRegions",
      "Effect": "Deny",
      "NotAction": [
        "iam:*",
        "sts:*",
        "organizations:*",
        "route53:*",
        "route53domains:*",
        "cloudfront:*",
        "waf:*",
        "wafv2:*",
        "support:*",
        "health:*",
        "trustedadvisor:*",
        "budgets:*",
        "ce:*",
        "cur:*",
        "tag:*"
      ],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:RequestedRegion": [
            "us-east-1",
            "us-west-2",
            "eu-west-1"
          ]
        }
      }
    }
  ]
}
```

The `NotAction` in the Deny statement means "deny everything except these global services when the region doesn't match."

## Approach 2: Service Control Policies (SCPs)

If you're using AWS Organizations, SCPs are the more powerful option. They apply to entire accounts and can't be overridden by any IAM policy in those accounts - not even by the root user.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyRegionsOutsideEU",
      "Effect": "Deny",
      "NotAction": [
        "iam:*",
        "sts:*",
        "organizations:*",
        "route53:*",
        "cloudfront:*",
        "waf:*",
        "wafv2:*",
        "budgets:*",
        "ce:*",
        "support:*",
        "health:*",
        "tag:GetResources"
      ],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:RequestedRegion": [
            "eu-west-1",
            "eu-west-2",
            "eu-central-1"
          ]
        }
      }
    }
  ]
}
```

Apply the SCP to an organizational unit:

```bash
# Attach the SCP to the EU workload OU
aws organizations attach-policy \
  --policy-id p-abcdef1234 \
  --target-id ou-root-euworkloads
```

### SCP vs IAM Policy: When to Use Which

- **SCP**: Use when you want an absolute boundary that no one can bypass. Good for compliance requirements.
- **IAM Policy**: Use when you want to restrict specific users or roles but leave admins unrestricted.

You can use both together. The SCP sets the outer boundary, and IAM policies fine-tune within it.

## Approach 3: Permission Boundaries

Permission boundaries cap the maximum permissions an IAM entity can have. Use them to restrict what roles created by delegated admins can do:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowOnlyApprovedRegions",
      "Effect": "Allow",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": [
            "us-east-1",
            "eu-west-1"
          ]
        }
      }
    },
    {
      "Sid": "AllowGlobalServicesAnywhere",
      "Effect": "Allow",
      "Action": [
        "iam:*",
        "sts:*",
        "support:*"
      ],
      "Resource": "*"
    }
  ]
}
```

```bash
# Set the permission boundary when creating a role
aws iam create-role \
  --role-name DeveloperRole \
  --assume-role-policy-document file://trust-policy.json \
  --permissions-boundary arn:aws:iam::123456789012:policy/RegionBoundary
```

## Testing Region Restrictions

Before rolling out, test that the restrictions work as expected:

```python
import boto3
from botocore.exceptions import ClientError

def test_region_restrictions(role_name, test_regions, allowed_regions):
    """Test which regions are accessible for a given role."""
    sts = boto3.client("sts")

    for region in test_regions:
        try:
            # Try to list EC2 instances in each region
            ec2 = boto3.client("ec2", region_name=region)
            ec2.describe_instances(MaxResults=5)

            expected = "ALLOWED" if region in allowed_regions else "SHOULD BE DENIED"
            print(f"  {region}: Accessible ({expected})")

        except ClientError as e:
            if e.response["Error"]["Code"] == "UnauthorizedOperation":
                expected = "DENIED" if region not in allowed_regions else "SHOULD BE ALLOWED"
                print(f"  {region}: Denied ({expected})")
            else:
                print(f"  {region}: Error - {e.response['Error']['Message']}")

# Test across several regions
test_regions = [
    "us-east-1", "us-west-2", "eu-west-1",
    "ap-southeast-1", "sa-east-1", "af-south-1"
]
allowed = ["us-east-1", "us-west-2", "eu-west-1"]

test_region_restrictions("DeveloperRole", test_regions, allowed)
```

## Monitoring Region Usage

Set up CloudTrail queries to detect API calls in unauthorized regions:

```bash
# Search CloudTrail for API calls in non-approved regions using Athena
# First, make sure CloudTrail logs are configured for Athena queries
```

```sql
-- Athena query to find API calls in unapproved regions
SELECT
    eventTime,
    userIdentity.arn AS user_arn,
    eventName,
    awsRegion,
    errorCode
FROM cloudtrail_logs
WHERE awsRegion NOT IN ('us-east-1', 'us-west-2', 'eu-west-1')
    AND eventTime > date_add('day', -7, now())
    AND errorCode IS NULL
ORDER BY eventTime DESC
LIMIT 100;
```

## Common Pitfalls

**Forgetting global services**: If you deny `us-east-1` entirely, IAM, STS, and Route 53 break. Always use `NotAction` to exclude global services.

**CloudFormation custom resources**: Custom resources backed by Lambda might call APIs in the stack's region. Make sure Lambda is allowed.

**S3 bucket creation**: S3 bucket names are global, but the bucket is created in a specific region. Region restrictions apply to `s3:CreateBucket`.

**Cross-region replicas**: Services like RDS and S3 that support cross-region replication need access to both the source and destination regions.

**AWS Backup**: Cross-region backup copies require access to the destination region.

Region restrictions are a powerful control for compliance and cost management. Use SCPs for hard boundaries, IAM policies for user-level controls, and always test thoroughly before deploying. For related security controls, check out our guide on [restricting IAM users to specific services](https://oneuptime.com/blog/post/2026-02-12-restrict-iam-users-specific-aws-services/view).
