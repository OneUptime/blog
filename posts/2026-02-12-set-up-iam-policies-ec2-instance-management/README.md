# How to Set Up IAM Policies for EC2 Instance Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, IAM, EC2, Security

Description: Learn how to create IAM policies for EC2 instance management, covering tag-based access control, region restrictions, instance type limits, and security guardrails.

---

EC2 is one of the most expensive and potentially dangerous AWS services to leave unrestricted. An overprivileged user can spin up massive instances, delete production servers, modify security groups, or snapshot volumes containing sensitive data. Getting EC2 IAM policies right protects both your security and your wallet.

This guide covers practical IAM policies for EC2 management, from basic read-only access to advanced tag-based controls.

## EC2 Resource Types

EC2 has many resource types, each with its own ARN format:

```
Instance:        arn:aws:ec2:us-east-1:123456789012:instance/i-1234567890abcdef0
Volume:          arn:aws:ec2:us-east-1:123456789012:volume/vol-1234567890abcdef0
Security Group:  arn:aws:ec2:us-east-1:123456789012:security-group/sg-12345678
AMI:             arn:aws:ec2:us-east-1:123456789012:image/ami-12345678
Snapshot:        arn:aws:ec2:us-east-1:123456789012:snapshot/snap-12345678
Key Pair:        arn:aws:ec2:us-east-1:123456789012:key-pair/my-key
Subnet:          arn:aws:ec2:us-east-1:123456789012:subnet/subnet-12345678
VPC:             arn:aws:ec2:us-east-1:123456789012:vpc/vpc-12345678
```

## Read-Only EC2 Access

For users who need to see instances but not modify them:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EC2ReadOnly",
      "Effect": "Allow",
      "Action": [
        "ec2:Describe*",
        "ec2:GetConsoleOutput",
        "ec2:GetConsoleScreenshot",
        "elasticloadbalancing:Describe*",
        "autoscaling:Describe*",
        "cloudwatch:GetMetricData",
        "cloudwatch:ListMetrics",
        "cloudwatch:GetMetricStatistics"
      ],
      "Resource": "*"
    }
  ]
}
```

Most EC2 `Describe*` actions don't support resource-level permissions, so `"Resource": "*"` is necessary. You can't restrict `DescribeInstances` to specific instances.

## Basic Instance Management

Start, stop, and reboot (but not terminate or create):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowDescribe",
      "Effect": "Allow",
      "Action": "ec2:Describe*",
      "Resource": "*"
    },
    {
      "Sid": "AllowStartStopReboot",
      "Effect": "Allow",
      "Action": [
        "ec2:StartInstances",
        "ec2:StopInstances",
        "ec2:RebootInstances"
      ],
      "Resource": "arn:aws:ec2:us-east-1:123456789012:instance/*"
    }
  ]
}
```

## Tag-Based EC2 Access Control

This is the most practical pattern for managing EC2 permissions across teams. Tag instances with `Team` or `Environment`, then write policies that restrict access based on those tags.

### Only Manage Instances Tagged with Your Team

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowDescribeAll",
      "Effect": "Allow",
      "Action": "ec2:Describe*",
      "Resource": "*"
    },
    {
      "Sid": "AllowManageOwnTeamInstances",
      "Effect": "Allow",
      "Action": [
        "ec2:StartInstances",
        "ec2:StopInstances",
        "ec2:RebootInstances",
        "ec2:TerminateInstances"
      ],
      "Resource": "arn:aws:ec2:us-east-1:123456789012:instance/*",
      "Condition": {
        "StringEquals": {
          "ec2:ResourceTag/Team": "${aws:PrincipalTag/Team}"
        }
      }
    }
  ]
}
```

The `ec2:ResourceTag/Team` condition checks the tag on the instance. `${aws:PrincipalTag/Team}` resolves to the team tag on the calling user or role. This is ABAC in action - see our [session tags guide](https://oneuptime.com/blog/post/2026-02-12-configure-session-tags-attribute-based-access-control/view) for more details.

### Protect Production Instances

Allow full management of non-production instances but prevent modifications to production:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowAll",
      "Effect": "Allow",
      "Action": "ec2:*",
      "Resource": "*"
    },
    {
      "Sid": "DenyProductionTerminate",
      "Effect": "Deny",
      "Action": [
        "ec2:TerminateInstances",
        "ec2:StopInstances"
      ],
      "Resource": "arn:aws:ec2:*:123456789012:instance/*",
      "Condition": {
        "StringEquals": {
          "ec2:ResourceTag/Environment": "production"
        }
      }
    }
  ]
}
```

## Restricting Instance Types

Prevent users from launching expensive instance types. This is one of the best ways to control EC2 costs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowDescribe",
      "Effect": "Allow",
      "Action": "ec2:Describe*",
      "Resource": "*"
    },
    {
      "Sid": "AllowRunInstances",
      "Effect": "Allow",
      "Action": "ec2:RunInstances",
      "Resource": [
        "arn:aws:ec2:us-east-1:123456789012:instance/*",
        "arn:aws:ec2:us-east-1:123456789012:volume/*",
        "arn:aws:ec2:us-east-1:123456789012:network-interface/*",
        "arn:aws:ec2:us-east-1:123456789012:security-group/*",
        "arn:aws:ec2:us-east-1:123456789012:subnet/*",
        "arn:aws:ec2:us-east-1::image/*"
      ],
      "Condition": {
        "StringLike": {
          "ec2:InstanceType": [
            "t3.*",
            "t3a.*",
            "m5.large",
            "m5.xlarge"
          ]
        }
      }
    },
    {
      "Sid": "DenyExpensiveInstances",
      "Effect": "Deny",
      "Action": "ec2:RunInstances",
      "Resource": "arn:aws:ec2:*:123456789012:instance/*",
      "Condition": {
        "StringLike": {
          "ec2:InstanceType": [
            "p*",
            "x*",
            "u*",
            "*.metal",
            "*.24xlarge",
            "*.16xlarge",
            "*.12xlarge"
          ]
        }
      }
    }
  ]
}
```

Note that `RunInstances` requires permissions on multiple resource types - the instance, volume, network interface, security group, subnet, and AMI. Missing any of these causes the launch to fail.

## Requiring Tags on Launch

Force users to tag instances when they create them:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowRunIfTagged",
      "Effect": "Allow",
      "Action": "ec2:RunInstances",
      "Resource": "arn:aws:ec2:us-east-1:123456789012:instance/*",
      "Condition": {
        "StringEquals": {
          "aws:RequestTag/Environment": ["dev", "staging", "production"],
          "aws:RequestTag/Team": "${aws:PrincipalTag/Team}"
        },
        "ForAllValues:StringEquals": {
          "aws:TagKeys": ["Environment", "Team", "Name"]
        }
      }
    },
    {
      "Sid": "AllowRunOtherResources",
      "Effect": "Allow",
      "Action": "ec2:RunInstances",
      "Resource": [
        "arn:aws:ec2:us-east-1:123456789012:volume/*",
        "arn:aws:ec2:us-east-1:123456789012:network-interface/*",
        "arn:aws:ec2:us-east-1:123456789012:security-group/*",
        "arn:aws:ec2:us-east-1:123456789012:subnet/*",
        "arn:aws:ec2:us-east-1::image/*"
      ]
    },
    {
      "Sid": "AllowCreateTagsOnLaunch",
      "Effect": "Allow",
      "Action": "ec2:CreateTags",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ec2:CreateAction": "RunInstances"
        }
      }
    }
  ]
}
```

This requires every launched instance to have `Environment`, `Team`, and `Name` tags, and the Team tag must match the user's own team.

## Security Group Management

Restrict who can modify security groups:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowDescribeSecurityGroups",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeSecurityGroupRules"
      ],
      "Resource": "*"
    },
    {
      "Sid": "AllowModifyOwnSecurityGroups",
      "Effect": "Allow",
      "Action": [
        "ec2:AuthorizeSecurityGroupIngress",
        "ec2:AuthorizeSecurityGroupEgress",
        "ec2:RevokeSecurityGroupIngress",
        "ec2:RevokeSecurityGroupEgress"
      ],
      "Resource": "arn:aws:ec2:us-east-1:123456789012:security-group/*",
      "Condition": {
        "StringEquals": {
          "ec2:ResourceTag/Team": "${aws:PrincipalTag/Team}"
        }
      }
    },
    {
      "Sid": "DenyOpenToWorldSSH",
      "Effect": "Deny",
      "Action": "ec2:AuthorizeSecurityGroupIngress",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ec2:IpProtocol": "tcp"
        },
        "NumericEquals": {
          "ec2:FromPort": "22"
        },
        "ForAnyValue:IpAddressEquals": {
          "ec2:Cidr": "0.0.0.0/0"
        }
      }
    }
  ]
}
```

The last statement prevents anyone from opening SSH (port 22) to the entire internet - a common security mistake.

## Restricting AMIs

Only allow launching from approved AMIs:

```json
{
  "Sid": "AllowOnlyApprovedAMIs",
  "Effect": "Allow",
  "Action": "ec2:RunInstances",
  "Resource": "arn:aws:ec2:us-east-1::image/*",
  "Condition": {
    "StringEquals": {
      "ec2:ImageTag/Approved": "true"
    }
  }
}
```

This ensures users can only launch from AMIs that have been tagged as approved by your security team.

## Terraform Example

```hcl
resource "aws_iam_policy" "ec2_developer" {
  name        = "ec2-developer-access"
  description = "EC2 access for developers - dev/staging only"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "AllowDescribe"
        Effect   = "Allow"
        Action   = ["ec2:Describe*"]
        Resource = "*"
      },
      {
        Sid    = "AllowManageNonProd"
        Effect = "Allow"
        Action = [
          "ec2:StartInstances",
          "ec2:StopInstances",
          "ec2:RebootInstances",
          "ec2:TerminateInstances"
        ]
        Resource = "arn:aws:ec2:*:${data.aws_caller_identity.current.account_id}:instance/*"
        Condition = {
          StringEquals = {
            "ec2:ResourceTag/Environment" = ["dev", "staging"]
          }
        }
      }
    ]
  })
}
```

EC2 IAM policies require more thought than most services because of the variety of resource types and the real financial and security impact of misconfiguration. Start with the tag-based patterns, enforce tagging at launch, and restrict instance types. Your budget and your security team will thank you.
