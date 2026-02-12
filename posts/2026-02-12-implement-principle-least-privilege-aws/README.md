# How to Implement the Principle of Least Privilege on AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Security, IAM, Least Privilege, Access Control

Description: A practical guide to implementing the principle of least privilege on AWS using IAM policies, permission boundaries, access analyzer, and organizational controls.

---

The principle of least privilege means giving every identity - users, roles, and services - only the permissions they actually need and nothing more. It sounds simple, but in practice it's one of the hardest security problems to get right on AWS. Most organizations start with overly broad permissions to get things working, and they never tighten them. The result is that a single compromised credential can access far more than it should.

Let's fix that. This guide covers practical strategies for implementing least privilege across IAM users, roles, policies, and organizations.

## Why Least Privilege Matters

An IAM principal with `AdministratorAccess` can do everything in your AWS account. If those credentials are compromised through a phishing attack, a leaked environment variable, or a vulnerable dependency, the attacker has full control. With least privilege, a compromised credential can only access the specific resources and actions it was authorized for.

The blast radius of a security incident is directly proportional to the permissions of the compromised identity.

## Start with Zero Permissions

The safest starting point is zero permissions. Then add exactly what's needed:

```hcl
# Application role - starts with no permissions
resource "aws_iam_role" "app" {
  name = "application-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# Add only the specific permissions needed
resource "aws_iam_role_policy" "app_permissions" {
  name = "app-specific-permissions"
  role = aws_iam_role.app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadFromSpecificBucket"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket",
        ]
        Resource = [
          "arn:aws:s3:::app-config-bucket",
          "arn:aws:s3:::app-config-bucket/*",
        ]
      },
      {
        Sid    = "WriteToSpecificTable"
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:UpdateItem",
        ]
        Resource = [
          "arn:aws:s3:::arn:aws:dynamodb:us-east-1:123456789012:table/app-data",
          "arn:aws:s3:::arn:aws:dynamodb:us-east-1:123456789012:table/app-data/index/*",
        ]
      },
      {
        Sid    = "PublishToSpecificTopic"
        Effect = "Allow"
        Action = [
          "sns:Publish",
        ]
        Resource = [
          "arn:aws:sns:us-east-1:123456789012:app-notifications",
        ]
      }
    ]
  })
}
```

Notice the specificity: not `s3:*` but `s3:GetObject` and `s3:ListBucket`. Not `*` for the resource but specific bucket and table ARNs.

## Use IAM Access Analyzer

IAM Access Analyzer helps you identify overly permissive policies. It has two key capabilities:

**External access analyzer** - identifies resources shared with external entities:

```hcl
resource "aws_accessanalyzer_analyzer" "external" {
  analyzer_name = "external-access-analyzer"
  type          = "ACCOUNT"

  tags = {
    Purpose = "Identify external access to account resources"
  }
}
```

**Unused access analyzer** - identifies permissions that aren't being used:

```hcl
resource "aws_accessanalyzer_analyzer" "unused" {
  analyzer_name = "unused-access-analyzer"
  type          = "ACCOUNT_UNUSED_ACCESS"

  configuration {
    unused_access {
      unused_access_age = 90  # flag permissions unused for 90 days
    }
  }
}
```

After 90 days, the analyzer tells you which permissions haven't been used, so you can safely remove them.

## Policy Generation from CloudTrail

One of the most powerful least privilege techniques is generating policies from actual usage. IAM Access Analyzer can analyze CloudTrail logs to generate a policy that matches what an identity actually did:

```bash
# Start a policy generation request
aws accessanalyzer start-policy-generation \
  --policy-generation-details '{
    "principalArn": "arn:aws:iam::123456789012:role/application-role",
    "cloudTrailDetails": {
      "trails": [
        {
          "cloudTrailArn": "arn:aws:cloudtrail:us-east-1:123456789012:trail/management-trail",
          "regions": ["us-east-1"],
          "allRegions": false
        }
      ],
      "accessRole": "arn:aws:iam::123456789012:role/access-analyzer-role",
      "startTime": "2026-01-01T00:00:00Z",
      "endTime": "2026-02-01T00:00:00Z"
    }
  }'
```

This generates a policy based on what the role actually did over the specified time period. It's the most accurate way to right-size permissions.

## Permission Boundaries

Permission boundaries set the maximum permissions that an IAM entity can have, regardless of the policies attached to it. They're especially useful for delegation - letting teams create their own roles without exceeding certain limits:

```hcl
# Permission boundary - the ceiling for all developer-created roles
resource "aws_iam_policy" "permission_boundary" {
  name = "developer-permission-boundary"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCommonServices"
        Effect = "Allow"
        Action = [
          "s3:*",
          "dynamodb:*",
          "sqs:*",
          "sns:*",
          "lambda:*",
          "logs:*",
          "cloudwatch:*",
          "xray:*",
          "ecr:*",
          "ecs:*",
        ]
        Resource = "*"
      },
      {
        Sid    = "DenyDangerousActions"
        Effect = "Deny"
        Action = [
          "iam:CreateUser",
          "iam:CreateAccessKey",
          "organizations:*",
          "account:*",
          "ec2:CreateVpc",
          "ec2:CreateSubnet",
        ]
        Resource = "*"
      },
      {
        Sid    = "DenyOutsideRegion"
        Effect = "Deny"
        Action = "*"
        Resource = "*"
        Condition = {
          StringNotEquals = {
            "aws:RequestedRegion" = ["us-east-1", "us-west-2"]
          }
          # Exclude global services
          "ForAnyValue:StringNotLike" = {
            "aws:PrincipalArn" = ["arn:aws:iam::*:role/aws-service-role/*"]
          }
        }
      }
    ]
  })
}

# Attach boundary to roles
resource "aws_iam_role" "developer_service" {
  name                 = "developer-service-role"
  permissions_boundary = aws_iam_policy.permission_boundary.arn

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}
```

Even if someone attaches `AdministratorAccess` to this role, the permission boundary limits what it can actually do.

## Condition Keys for Fine-Grained Control

IAM condition keys let you restrict permissions based on context, not just actions and resources:

```hcl
resource "aws_iam_role_policy" "conditional_access" {
  name = "conditional-access"
  role = aws_iam_role.app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowS3OnlyWithEncryption"
        Effect = "Allow"
        Action = ["s3:PutObject"]
        Resource = "arn:aws:s3:::sensitive-data/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-server-side-encryption" = "aws:kms"
          }
        }
      },
      {
        Sid    = "AllowEC2OnlySpecificTypes"
        Effect = "Allow"
        Action = ["ec2:RunInstances"]
        Resource = "arn:aws:ec2:*:*:instance/*"
        Condition = {
          StringEquals = {
            "ec2:InstanceType" = ["t3.micro", "t3.small", "t3.medium"]
          }
        }
      },
      {
        Sid    = "AllowOnlyFromVPC"
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue"]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:SourceVpc" = var.vpc_id
          }
        }
      },
      {
        Sid    = "RequireTagOnCreation"
        Effect = "Allow"
        Action = ["ec2:CreateTags", "ec2:RunInstances"]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestTag/Team" = "$${aws:PrincipalTag/Team}"
          }
        }
      }
    ]
  })
}
```

These conditions enforce:
- S3 uploads must use KMS encryption
- EC2 instances are limited to specific types
- Secrets can only be accessed from within the VPC
- Resources must be tagged with the creator's team

## Service Control Policies for Organizational Guardrails

SCPs set boundaries at the organization level. They're perfect for preventing actions that should never happen in any account:

```hcl
resource "aws_organizations_policy" "prevent_dangerous_actions" {
  name = "PreventDangerousActions"
  type = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyRootUserActions"
        Effect = "Deny"
        Action = "*"
        Resource = "*"
        Condition = {
          StringLike = {
            "aws:PrincipalArn" = "arn:aws:iam::*:root"
          }
        }
      },
      {
        Sid    = "PreventCloudTrailDisable"
        Effect = "Deny"
        Action = [
          "cloudtrail:DeleteTrail",
          "cloudtrail:StopLogging",
        ]
        Resource = "*"
      },
      {
        Sid    = "PreventGuardDutyDisable"
        Effect = "Deny"
        Action = [
          "guardduty:DeleteDetector",
          "guardduty:DisassociateFromMasterAccount",
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Regular Review Process

Least privilege isn't a one-time setup. Permissions drift as applications evolve:

1. **Monthly**: Review IAM Access Analyzer findings for unused permissions
2. **Quarterly**: Run policy generation for high-privilege roles
3. **On change**: Review permissions when application features change
4. **Continuously**: Use Config rules to detect overly permissive policies

```hcl
# Config rule to detect IAM policies with wildcards
resource "aws_config_config_rule" "no_wildcard_policies" {
  name = "iam-no-wildcard-policies"

  source {
    owner             = "AWS"
    source_identifier = "IAM_POLICY_NO_STATEMENTS_WITH_ADMIN_ACCESS"
  }
}

# Config rule to detect unused IAM credentials
resource "aws_config_config_rule" "unused_credentials" {
  name = "iam-unused-credentials"

  source {
    owner             = "AWS"
    source_identifier = "IAM_USER_UNUSED_CREDENTIALS_CHECK"
  }

  input_parameters = jsonencode({
    maxCredentialUsageAge = "90"
  })
}
```

## Practical Steps to Get Started

If you're starting from an environment with broad permissions, here's the path forward:

1. **Enable CloudTrail** everywhere - you need the audit trail
2. **Enable IAM Access Analyzer** - start gathering data on what's used
3. **Set permission boundaries** on new roles immediately
4. **Tighten the highest-risk roles first** - roles with admin access or access to sensitive data
5. **Use policy generation** to create right-sized policies for existing roles
6. **Remove unused permissions quarterly** based on Access Analyzer findings

Don't try to fix everything at once. Start with your most sensitive workloads and work outward.

## Summary

Least privilege on AWS is a continuous practice, not a checkbox. Start with zero permissions, add what's needed, and regularly remove what's not. Use IAM Access Analyzer to find unused permissions, permission boundaries to set ceilings, condition keys for context-based control, and SCPs for organizational guardrails. The goal isn't perfection - it's steadily reducing your blast radius so that when (not if) a credential is compromised, the damage is contained.

For monitoring access patterns and detecting anomalies, see our guide on [AWS infrastructure monitoring](https://oneuptime.com/blog/post/monitor-aws-infrastructure/view).
