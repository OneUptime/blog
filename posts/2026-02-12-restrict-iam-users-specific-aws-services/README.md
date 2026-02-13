# How to Restrict IAM Users to Specific AWS Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, IAM, Security, Least Privilege

Description: Learn how to create IAM policies that restrict users to only the AWS services they need, implementing least-privilege access control effectively.

---

Giving users `AdministratorAccess` because "it's easier" is a recipe for trouble. It only takes one compromised credential or one accidental `aws ec2 terminate-instances` to ruin your day. Restricting users to only the services they actually need is one of the most fundamental security practices in AWS.

This guide covers practical patterns for service-level restrictions, from simple allow-lists to more nuanced policies that give developers what they need without the keys to the kingdom.

## The Principle of Least Privilege

The idea is simple: give users only the permissions they need to do their job, and nothing more. In practice, this means:

- A frontend developer doesn't need EC2 access
- A data analyst doesn't need IAM management access
- A CI/CD pipeline doesn't need billing access
- A monitoring tool doesn't need write access to production databases

## Basic Service Restriction

The simplest pattern is an allow-list of services:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSpecificServicesOnly",
      "Effect": "Allow",
      "Action": [
        "s3:*",
        "dynamodb:*",
        "lambda:*",
        "logs:*",
        "cloudwatch:*",
        "sqs:*",
        "sns:*"
      ],
      "Resource": "*"
    }
  ]
}
```

This allows full access to S3, DynamoDB, Lambda, CloudWatch Logs, CloudWatch, SQS, and SNS - but nothing else. No EC2, no IAM, no RDS.

## Deny-Based Approach

Alternatively, start with broader access and deny specific dangerous services:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowMostServices",
      "Effect": "Allow",
      "Action": "*",
      "Resource": "*"
    },
    {
      "Sid": "DenyDangerousServices",
      "Effect": "Deny",
      "Action": [
        "iam:*",
        "organizations:*",
        "account:*",
        "sts:*",
        "aws-portal:*",
        "budgets:*",
        "ce:*",
        "cur:*",
        "support:*",
        "config:*",
        "cloudtrail:DeleteTrail",
        "cloudtrail:StopLogging",
        "cloudtrail:UpdateTrail",
        "guardduty:DeleteDetector",
        "guardduty:DisableOrganizationAdminAccount"
      ],
      "Resource": "*"
    }
  ]
}
```

This is looser but prevents users from modifying IAM, disabling security controls, or accessing billing. I generally prefer the allow-list approach because it's explicit, but the deny approach is pragmatic for teams that are still figuring out exactly what they need.

## Role-Based Service Policies

Here are practical policies for common roles:

### Frontend Developer

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "FrontendDeveloperAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket",
        "s3:DeleteObject",
        "cloudfront:GetDistribution",
        "cloudfront:ListDistributions",
        "cloudfront:CreateInvalidation",
        "logs:GetLogEvents",
        "logs:FilterLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams",
        "cloudwatch:GetMetricData",
        "cloudwatch:ListMetrics"
      ],
      "Resource": "*"
    }
  ]
}
```

### Backend Developer

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BackendDeveloperAccess",
      "Effect": "Allow",
      "Action": [
        "lambda:*",
        "dynamodb:*",
        "s3:*",
        "sqs:*",
        "sns:*",
        "logs:*",
        "cloudwatch:*",
        "apigateway:*",
        "events:*",
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "secretsmanager:ListSecrets",
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath",
        "ecr:GetAuthorizationToken",
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchCheckLayerAvailability",
        "ecs:DescribeServices",
        "ecs:DescribeTasks",
        "ecs:ListTasks",
        "ecs:DescribeClusters"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DenyDestructiveActions",
      "Effect": "Deny",
      "Action": [
        "dynamodb:DeleteTable",
        "s3:DeleteBucket",
        "lambda:DeleteFunction",
        "sqs:DeleteQueue",
        "sns:DeleteTopic"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:ResourceTag/Environment": "production"
        }
      }
    }
  ]
}
```

Note the second statement: it allows developers to delete resources in dev/staging but prevents deleting production resources. This uses resource tagging as a safety net.

### Data Analyst

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DataAnalystAccess",
      "Effect": "Allow",
      "Action": [
        "athena:*",
        "glue:GetDatabase*",
        "glue:GetTable*",
        "glue:GetPartition*",
        "glue:BatchGetPartition",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:GetBucketLocation",
        "s3:PutObject",
        "quicksight:*",
        "redshift-data:*",
        "redshift:GetClusterCredentials",
        "redshift:DescribeClusters",
        "logs:GetLogEvents",
        "logs:FilterLogEvents",
        "cloudwatch:GetMetricData"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DenyWriteToProductionBuckets",
      "Effect": "Deny",
      "Action": [
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::production-*/*",
        "arn:aws:s3:::prod-*/*"
      ]
    }
  ]
}
```

### DevOps / Platform Engineer

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PlatformEngineerAccess",
      "Effect": "Allow",
      "Action": [
        "ec2:*",
        "ecs:*",
        "eks:*",
        "ecr:*",
        "elasticloadbalancing:*",
        "autoscaling:*",
        "cloudformation:*",
        "codebuild:*",
        "codepipeline:*",
        "codedeploy:*",
        "s3:*",
        "rds:*",
        "elasticache:*",
        "route53:*",
        "acm:*",
        "cloudwatch:*",
        "logs:*",
        "ssm:*",
        "secretsmanager:*",
        "kms:Describe*",
        "kms:List*",
        "kms:Get*",
        "sns:*",
        "sqs:*",
        "lambda:*",
        "dynamodb:*",
        "events:*",
        "wafv2:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DenyIAMExceptPassRole",
      "Effect": "Deny",
      "Action": [
        "iam:CreateUser",
        "iam:DeleteUser",
        "iam:CreateAccessKey",
        "iam:CreateLoginProfile",
        "iam:AttachUserPolicy",
        "iam:DetachUserPolicy"
      ],
      "Resource": "*"
    }
  ]
}
```

## Implementing with IAM Groups

Organize users into groups and attach the service-specific policies:

```bash
# Create groups for each role
aws iam create-group --group-name FrontendDevelopers
aws iam create-group --group-name BackendDevelopers
aws iam create-group --group-name DataAnalysts
aws iam create-group --group-name PlatformEngineers

# Create policies
aws iam create-policy \
  --policy-name FrontendAccess \
  --policy-document file://frontend-policy.json

aws iam create-policy \
  --policy-name BackendAccess \
  --policy-document file://backend-policy.json

# Attach policies to groups
aws iam attach-group-policy \
  --group-name FrontendDevelopers \
  --policy-arn arn:aws:iam::123456789012:policy/FrontendAccess

aws iam attach-group-policy \
  --group-name BackendDevelopers \
  --policy-arn arn:aws:iam::123456789012:policy/BackendAccess

# Add users to groups
aws iam add-user-to-group --group-name BackendDevelopers --user-name jane
aws iam add-user-to-group --group-name FrontendDevelopers --user-name bob
```

## Using Access Analyzer for Refinement

Don't guess what services users need. Use Access Analyzer to see what they actually use and generate policies from real activity:

```bash
# Start policy generation based on actual usage
aws accessanalyzer start-policy-generation \
  --policy-generation-details '{
    "principalArn": "arn:aws:iam::123456789012:user/jane"
  }'
```

See our detailed guide on [generating IAM policies from access activity](https://oneuptime.com/blog/post/2026-02-12-generate-iam-policies-access-activity-access-analyzer/view) for the full process.

## Combining Service and Region Restrictions

For maximum security, combine service restrictions with [region restrictions](https://oneuptime.com/blog/post/2026-02-12-restrict-iam-users-specific-aws-regions/view):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowServicesInApprovedRegions",
      "Effect": "Allow",
      "Action": [
        "lambda:*",
        "dynamodb:*",
        "s3:*"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": ["us-east-1", "eu-west-1"]
        }
      }
    }
  ]
}
```

## Monitoring Policy Effectiveness

Use CloudTrail to check for AccessDenied events - too many means your policy is too restrictive, zero might mean it's too loose:

```python
import boto3

def check_access_denied_events(username, days=7):
    """Find recent access denied events for a user."""
    cloudtrail = boto3.client("cloudtrail")

    from datetime import datetime, timedelta
    start = datetime.utcnow() - timedelta(days=days)

    events = cloudtrail.lookup_events(
        LookupAttributes=[
            {"AttributeKey": "Username", "AttributeValue": username}
        ],
        StartTime=start,
        MaxResults=50
    )

    denied = []
    for event in events["Events"]:
        import json
        detail = json.loads(event["CloudTrailEvent"])
        if detail.get("errorCode") in ("AccessDenied", "UnauthorizedOperation"):
            denied.append({
                "time": event["EventTime"],
                "action": event["EventName"],
                "error": detail.get("errorMessage", "")
            })

    return denied

denied = check_access_denied_events("jane")
for d in denied:
    print(f"{d['time']}: {d['action']} - {d['error']}")
```

Service restrictions are the bread and butter of IAM security. Start broad if you must, but tighten over time using Access Analyzer data. The goal is a policy that lets people do their job without giving them the ability to accidentally (or intentionally) cause damage outside their scope.
