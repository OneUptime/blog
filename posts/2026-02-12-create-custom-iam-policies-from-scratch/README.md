# How to Create Custom IAM Policies from Scratch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, IAM, Security, Policies

Description: A hands-on guide to writing custom IAM policies in AWS from scratch, covering policy structure, conditions, resource-level permissions, and real-world examples.

---

AWS managed policies are fine for getting started, but they're usually too broad for production. `AmazonS3FullAccess` gives access to every bucket in the account, `AmazonEC2FullAccess` lets users terminate any instance. For real security, you need custom policies that grant exactly the permissions your users and applications need - nothing more.

Let's build IAM policies from scratch, starting with the basics and working up to advanced patterns.

## Policy Structure

Every IAM policy is a JSON document with a specific structure:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "DescriptiveStatementId",
            "Effect": "Allow",
            "Action": ["service:ActionName"],
            "Resource": ["arn:aws:service:region:account:resource"],
            "Condition": {
                "ConditionOperator": {
                    "ConditionKey": "ConditionValue"
                }
            }
        }
    ]
}
```

Let's break down each piece:

- **Version** - Always "2012-10-17". This isn't a date you choose; it's the policy language version.
- **Statement** - An array of permission rules. Each statement grants or denies access.
- **Sid** - An optional identifier for the statement. Use it for readability.
- **Effect** - Either "Allow" or "Deny". Deny always wins over Allow.
- **Action** - The API actions being permitted or denied.
- **Resource** - Which AWS resources the actions apply to.
- **Condition** - Optional constraints that must be true for the statement to apply.

## Your First Custom Policy

Let's create a policy that allows a user to manage objects in a specific S3 bucket:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowListBucket",
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket",
                "s3:GetBucketLocation"
            ],
            "Resource": "arn:aws:s3:::my-app-uploads"
        },
        {
            "Sid": "AllowObjectOperations",
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::my-app-uploads/*"
        }
    ]
}
```

Notice the two separate statements. `ListBucket` operates on the bucket itself (`arn:aws:s3:::my-app-uploads`), while object operations work on the objects inside it (`arn:aws:s3:::my-app-uploads/*`). This distinction trips up a lot of people.

## Using Wildcards in Actions

You can use wildcards to match groups of actions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowEC2ReadOnly",
            "Effect": "Allow",
            "Action": [
                "ec2:Describe*",
                "ec2:Get*",
                "ec2:List*"
            ],
            "Resource": "*"
        }
    ]
}
```

This grants read-only access to EC2. The wildcards match any action starting with Describe, Get, or List. Be careful with wildcards though - `s3:*` gives full S3 access, which is rarely what you want.

## Adding Conditions

Conditions let you add constraints beyond just "who" and "what." Here's a policy that only works during business hours from a specific IP range:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowDuringBusinessHours",
            "Effect": "Allow",
            "Action": [
                "ec2:StartInstances",
                "ec2:StopInstances"
            ],
            "Resource": "arn:aws:ec2:us-east-1:123456789012:instance/*",
            "Condition": {
                "IpAddress": {
                    "aws:SourceIp": "203.0.113.0/24"
                },
                "DateGreaterThan": {
                    "aws:CurrentTime": "2026-01-01T09:00:00Z"
                },
                "DateLessThan": {
                    "aws:CurrentTime": "2026-12-31T17:00:00Z"
                }
            }
        }
    ]
}
```

All conditions within a statement are ANDed together - every condition must be true for the statement to apply.

## Tag-Based Policies

Tags are powerful for access control. This policy lets users manage only EC2 instances they own:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowManageOwnInstances",
            "Effect": "Allow",
            "Action": [
                "ec2:StartInstances",
                "ec2:StopInstances",
                "ec2:RebootInstances",
                "ec2:TerminateInstances"
            ],
            "Resource": "arn:aws:ec2:*:*:instance/*",
            "Condition": {
                "StringEquals": {
                    "ec2:ResourceTag/Owner": "${aws:username}"
                }
            }
        },
        {
            "Sid": "AllowDescribeAll",
            "Effect": "Allow",
            "Action": "ec2:Describe*",
            "Resource": "*"
        }
    ]
}
```

The `${aws:username}` is a policy variable that resolves to the current user's name. So if alice runs this, she can only manage instances tagged with `Owner: alice`.

## Deny Statements

Sometimes it's easier to allow broadly and then deny specific things. This policy gives S3 access but prevents deleting anything from the production bucket:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowS3Access",
            "Effect": "Allow",
            "Action": "s3:*",
            "Resource": [
                "arn:aws:s3:::*",
                "arn:aws:s3:::*/*"
            ]
        },
        {
            "Sid": "DenyProductionDeletes",
            "Effect": "Deny",
            "Action": [
                "s3:DeleteObject",
                "s3:DeleteBucket"
            ],
            "Resource": [
                "arn:aws:s3:::production-*",
                "arn:aws:s3:::production-*/*"
            ]
        }
    ]
}
```

Deny always wins. Even if another policy allows the action, the explicit Deny blocks it.

## Multi-Service Policy

Real-world applications usually need access to multiple services. Here's a policy for a web application that uses S3, DynamoDB, and SQS:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "S3Access",
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject"
            ],
            "Resource": "arn:aws:s3:::my-app-assets/*"
        },
        {
            "Sid": "DynamoDBAccess",
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:Query",
                "dynamodb:Scan"
            ],
            "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/my-app-*"
        },
        {
            "Sid": "SQSAccess",
            "Effect": "Allow",
            "Action": [
                "sqs:SendMessage",
                "sqs:ReceiveMessage",
                "sqs:DeleteMessage",
                "sqs:GetQueueAttributes"
            ],
            "Resource": "arn:aws:sqs:us-east-1:123456789012:my-app-*"
        }
    ]
}
```

## Creating the Policy via CLI

Once you've written your policy JSON, create it in AWS:

```bash
# Create the custom policy from a JSON file
aws iam create-policy \
  --policy-name MyAppAccess \
  --policy-document file://my-app-policy.json \
  --description "Access policy for the web application"
```

To update an existing policy, create a new version:

```bash
# Create a new version of the policy and set it as default
aws iam create-policy-version \
  --policy-arn arn:aws:iam::123456789012:policy/MyAppAccess \
  --policy-document file://my-app-policy-v2.json \
  --set-as-default
```

IAM keeps up to 5 versions of each policy, so you can roll back if needed.

## Testing Policies

Before deploying a policy, test it with the IAM Policy Simulator. You can access it through the console or CLI:

```bash
# Simulate whether the policy allows s3:GetObject on a specific resource
aws iam simulate-custom-policy \
  --policy-input-list file://my-app-policy.json \
  --action-names s3:GetObject \
  --resource-arns arn:aws:s3:::my-app-assets/image.png
```

For a deeper dive into testing, check out our guide on [using the IAM Policy Simulator to test permissions](https://oneuptime.com/blog/post/2026-02-12-use-iam-policy-simulator-to-test-permissions/view).

## Common Mistakes

**Forgetting Resource ARN format differences.** Each service has its own ARN format. S3 bucket ARNs don't include a region or account ID (`arn:aws:s3:::bucket-name`), but DynamoDB table ARNs do (`arn:aws:dynamodb:us-east-1:123456789012:table/name`).

**Using `*` for Resource when specific ARNs are possible.** Not all actions support resource-level permissions, but many do. Always try to be specific.

**Not handling the ListBucket vs object actions split in S3.** Bucket-level actions and object-level actions use different resource ARNs. You need both.

**Policy size limits.** Managed policies can be up to 6,144 characters. Inline policies up to 2,048 for users, 5,120 for groups, and 10,240 for roles. If you're hitting limits, consolidate your statements or split across multiple policies.

## Wrapping Up

Custom IAM policies are the backbone of AWS security. Start by identifying exactly what API actions your users or applications need, then write the narrowest policy that allows those actions on only the required resources. Add conditions for extra security. Test with the Policy Simulator before deploying. And remember - when in doubt, deny. It's easier to add permissions later than to clean up after a security incident.
