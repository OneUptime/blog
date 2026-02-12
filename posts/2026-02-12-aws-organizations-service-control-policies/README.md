# How to Set Up AWS Organizations with Service Control Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Organizations, Security, Governance

Description: A comprehensive guide to setting up AWS Organizations with Service Control Policies to enforce security guardrails across all accounts in your multi-account environment.

---

Once you're past a handful of AWS accounts, managing them individually doesn't scale. AWS Organizations lets you group accounts, centralize billing, and most importantly, enforce policies across all accounts from a single place. Service Control Policies (SCPs) are the backbone of this enforcement - they define the maximum permissions available to accounts, regardless of what IAM policies those accounts have.

Even if an account admin creates an IAM policy that says "Allow *", an SCP can override that and block specific actions. That makes SCPs your ultimate security guardrail.

## Setting Up AWS Organizations

Start by creating an organization from your management account:

```bash
# Create an organization with all features enabled
# "ALL" means you get both consolidated billing AND SCPs
aws organizations create-organization --feature-set ALL
```

If you already have an organization with only consolidated billing:

```bash
# Enable all features including SCPs
aws organizations enable-all-features
```

## Creating the OU Structure

Organizational Units (OUs) let you group accounts and apply policies to groups instead of individual accounts. Here's a common structure:

```bash
# Get the root ID first
ROOT_ID=$(aws organizations list-roots --query 'Roots[0].Id' --output text)

# Create top-level OUs
aws organizations create-organizational-unit \
    --parent-id "$ROOT_ID" \
    --name "Production"

aws organizations create-organizational-unit \
    --parent-id "$ROOT_ID" \
    --name "Development"

aws organizations create-organizational-unit \
    --parent-id "$ROOT_ID" \
    --name "Security"

aws organizations create-organizational-unit \
    --parent-id "$ROOT_ID" \
    --name "Sandbox"

aws organizations create-organizational-unit \
    --parent-id "$ROOT_ID" \
    --name "Suspended"
```

Then create child OUs for more granular control:

```bash
# Get the Production OU ID
PROD_OU_ID=$(aws organizations list-organizational-units-for-parent \
    --parent-id "$ROOT_ID" \
    --query "OrganizationalUnits[?Name=='Production'].Id" \
    --output text)

# Create child OUs under Production
aws organizations create-organizational-unit \
    --parent-id "$PROD_OU_ID" \
    --name "Workloads"

aws organizations create-organizational-unit \
    --parent-id "$PROD_OU_ID" \
    --name "Infrastructure"
```

Move accounts into OUs:

```bash
# Move an account to the Production/Workloads OU
aws organizations move-account \
    --account-id "111122223333" \
    --source-parent-id "$ROOT_ID" \
    --destination-parent-id "$WORKLOADS_OU_ID"
```

## Enabling Service Control Policies

SCPs must be explicitly enabled:

```bash
# Enable SCPs for the organization
aws organizations enable-policy-type \
    --root-id "$ROOT_ID" \
    --policy-type "SERVICE_CONTROL_POLICY"
```

By default, every account has a "FullAWSAccess" SCP attached that allows everything. As you add restrictive SCPs, they work as an intersection - an action must be allowed by both the SCP AND the IAM policy to be permitted.

## Essential SCPs

Here are the SCPs most organizations should implement:

### Prevent Leaving the Organization

```bash
# Prevent accounts from leaving the organization
aws organizations create-policy \
    --name "DenyLeaveOrganization" \
    --description "Prevents accounts from removing themselves from the organization" \
    --type "SERVICE_CONTROL_POLICY" \
    --content '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "DenyLeaveOrg",
                "Effect": "Deny",
                "Action": "organizations:LeaveOrganization",
                "Resource": "*"
            }
        ]
    }'
```

### Restrict Regions

```bash
# Restrict usage to approved AWS regions only
# Allows global services that need all regions
aws organizations create-policy \
    --name "RestrictRegions" \
    --description "Restrict AWS usage to approved regions" \
    --type "SERVICE_CONTROL_POLICY" \
    --content '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "DenyUnapprovedRegions",
                "Effect": "Deny",
                "NotAction": [
                    "iam:*",
                    "organizations:*",
                    "sts:*",
                    "support:*",
                    "budgets:*",
                    "route53:*",
                    "cloudfront:*",
                    "waf:*",
                    "wafv2:*",
                    "globalaccelerator:*",
                    "s3:GetBucketLocation",
                    "s3:ListAllMyBuckets"
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
    }'
```

Notice the `NotAction` list. These are global services that don't operate in a specific region, so blocking them by region would break things.

### Protect Security Infrastructure

```bash
# Prevent tampering with CloudTrail, GuardDuty, and Config
aws organizations create-policy \
    --name "ProtectSecurityTools" \
    --description "Prevent disabling or modifying security monitoring tools" \
    --type "SERVICE_CONTROL_POLICY" \
    --content '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "DenyCloudTrailModification",
                "Effect": "Deny",
                "Action": [
                    "cloudtrail:StopLogging",
                    "cloudtrail:DeleteTrail",
                    "cloudtrail:UpdateTrail"
                ],
                "Resource": "*"
            },
            {
                "Sid": "DenyGuardDutyModification",
                "Effect": "Deny",
                "Action": [
                    "guardduty:DeleteDetector",
                    "guardduty:DisassociateFromMasterAccount",
                    "guardduty:UpdateDetector"
                ],
                "Resource": "*"
            },
            {
                "Sid": "DenyConfigModification",
                "Effect": "Deny",
                "Action": [
                    "config:StopConfigurationRecorder",
                    "config:DeleteConfigurationRecorder",
                    "config:DeleteDeliveryChannel"
                ],
                "Resource": "*"
            }
        ]
    }'
```

### Require Encryption

```bash
# Require S3 server-side encryption for all new objects
aws organizations create-policy \
    --name "RequireS3Encryption" \
    --description "Deny S3 PutObject without encryption" \
    --type "SERVICE_CONTROL_POLICY" \
    --content '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "DenyUnencryptedS3Objects",
                "Effect": "Deny",
                "Action": "s3:PutObject",
                "Resource": "*",
                "Condition": {
                    "StringNotEquals": {
                        "s3:x-amz-server-side-encryption": [
                            "AES256",
                            "aws:kms"
                        ]
                    },
                    "Null": {
                        "s3:x-amz-server-side-encryption": "false"
                    }
                }
            }
        ]
    }'
```

### Deny Public S3 Access

```bash
# Prevent making S3 buckets or objects public
aws organizations create-policy \
    --name "DenyPublicS3" \
    --description "Block all public access to S3 buckets" \
    --type "SERVICE_CONTROL_POLICY" \
    --content '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "DenyPublicBucketAccess",
                "Effect": "Deny",
                "Action": [
                    "s3:PutBucketPublicAccessBlock",
                    "s3:DeletePublicAccessBlock"
                ],
                "Resource": "*",
                "Condition": {
                    "StringNotEquals": {
                        "aws:PrincipalOrgID": "${aws:PrincipalOrgID}"
                    }
                }
            },
            {
                "Sid": "DenyPublicACLs",
                "Effect": "Deny",
                "Action": [
                    "s3:PutBucketAcl",
                    "s3:PutObjectAcl"
                ],
                "Resource": "*",
                "Condition": {
                    "StringEquals": {
                        "s3:x-amz-acl": [
                            "public-read",
                            "public-read-write",
                            "authenticated-read"
                        ]
                    }
                }
            }
        ]
    }'
```

## Attaching Policies to OUs

After creating policies, attach them to the appropriate OUs:

```bash
# Get the policy ID
POLICY_ID=$(aws organizations list-policies \
    --filter "SERVICE_CONTROL_POLICY" \
    --query "Policies[?Name=='RestrictRegions'].Id" \
    --output text)

# Attach to the root (applies to all accounts)
aws organizations attach-policy \
    --policy-id "$POLICY_ID" \
    --target-id "$ROOT_ID"

# Or attach to a specific OU
aws organizations attach-policy \
    --policy-id "$POLICY_ID" \
    --target-id "$PROD_OU_ID"
```

## Testing SCPs Before Applying

Always test SCPs before applying them to production accounts. Use the Sandbox OU:

```bash
# Attach the new policy to the Sandbox OU first
aws organizations attach-policy \
    --policy-id "$NEW_POLICY_ID" \
    --target-id "$SANDBOX_OU_ID"

# Test by assuming a role in a sandbox account and trying the restricted action
aws sts assume-role \
    --role-arn "arn:aws:iam::444455556666:role/TestRole" \
    --role-session-name "scp-test"

# Try the action that should be blocked
aws ec2 run-instances --region ap-southeast-2 --image-id ami-12345 --instance-type t3.micro
# Should get AccessDenied if the region restriction SCP is working
```

## Viewing Effective Policies

Check what SCPs are in effect for a specific account:

```bash
# List all SCPs attached to an account (inherited and directly attached)
aws organizations list-policies-for-target \
    --target-id "111122223333" \
    --filter "SERVICE_CONTROL_POLICY"

# See the effective policy (the combined result of all SCPs)
aws organizations describe-effective-policy \
    --policy-type "SERVICE_CONTROL_POLICY" \
    --target-id "111122223333"
```

## SCP Best Practices

**Never restrict the management account.** SCPs don't apply to the management account, and this is by design. Keep the management account for billing and organization management only.

**Use deny lists, not allow lists.** The default FullAWSAccess SCP allows everything. Add Deny statements for what you want to block. This is easier to manage than an allow-list approach.

**Always include an exception mechanism.** Some SCPs should have a condition that allows a break-glass role to bypass them for emergency situations:

```json
{
    "Condition": {
        "ArnNotLike": {
            "aws:PrincipalARN": "arn:aws:iam::*:role/BreakGlassRole"
        }
    }
}
```

**Test in sandbox first.** A misconfigured SCP can lock everyone out of an account. Test thoroughly before applying to production.

SCPs are the foundation of security governance in a multi-account AWS environment. For complementary governance using tag enforcement, see [implementing tag policies in AWS Organizations](https://oneuptime.com/blog/post/tag-policies-aws-organizations/view).
