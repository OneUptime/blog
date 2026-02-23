# How to Implement Least Privilege IAM with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, Security, Least Privilege, Best Practices

Description: Learn how to implement the principle of least privilege for AWS IAM using Terraform with practical strategies for scoping permissions, using conditions, and auditing access.

---

The principle of least privilege states that every identity should have only the minimum permissions required to perform its function. In AWS, this means IAM users, roles, and groups should only be able to perform the specific actions they need on the specific resources they need to access. While this sounds simple, implementing it in practice requires careful planning and the right tools.

Terraform is an excellent platform for implementing least privilege because every permission change is codified, reviewed in pull requests, and applied consistently. This guide covers practical strategies for building least-privilege IAM policies with Terraform.

## Why Least Privilege Matters

Overly permissive IAM policies create several risks:

- **Blast radius.** If credentials are compromised, the attacker can do everything the policy allows.
- **Accidental damage.** Users or services might accidentally modify or delete resources they should not have access to.
- **Compliance violations.** Many compliance frameworks (SOC 2, PCI DSS, HIPAA) require least-privilege access controls.
- **Audit complexity.** Broad permissions make it harder to determine who did what during incident investigations.

## Prerequisites

You need:

- Terraform 1.0 or later
- An AWS account
- AWS CLI configured with valid credentials
- Familiarity with IAM policy structure

## Strategy 1: Scope Actions to Specific API Calls

Instead of using wildcard actions like `s3:*`, list the specific API calls your application needs.

```hcl
# Bad: Overly permissive
resource "aws_iam_policy" "too_broad" {
  name = "too-broad-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "s3:*"          # Allows every S3 action
      Resource = "*"             # On every bucket
    }]
  })
}

# Good: Specific actions on specific resources
resource "aws_iam_policy" "least_privilege" {
  name = "least-privilege-s3-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "ReadAppData"
      Effect = "Allow"
      Action = [
        "s3:GetObject",          # Only read objects
        "s3:ListBucket",         # Only list the bucket
      ]
      Resource = [
        "arn:aws:s3:::my-app-data",      # Specific bucket
        "arn:aws:s3:::my-app-data/*",    # Objects in that bucket
      ]
    }]
  })
}
```

## Strategy 2: Use Resource-Level Permissions

Always specify the exact resources when the API supports it.

```hcl
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

resource "aws_iam_policy" "dynamo_specific" {
  name = "dynamodb-specific-table"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Access to a specific table only
        Sid    = "TableAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query",
        ]
        Resource = [
          "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/users",
          "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/users/index/*",
        ]
      },
      {
        # Separate statement for a different table with different permissions
        Sid    = "OrdersReadOnly"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
        ]
        Resource = "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/orders"
      }
    ]
  })
}
```

## Strategy 3: Use IAM Conditions

Conditions add context-based restrictions to your policies.

```hcl
resource "aws_iam_policy" "conditional_access" {
  name = "conditional-access-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Only allow access from specific IP ranges
        Sid    = "IPRestricted"
        Effect = "Allow"
        Action = ["s3:GetObject"]
        Resource = "arn:aws:s3:::sensitive-data/*"
        Condition = {
          IpAddress = {
            "aws:SourceIp" = ["10.0.0.0/8"]
          }
        }
      },
      {
        # Only allow access when MFA is active
        Sid    = "MFARequired"
        Effect = "Allow"
        Action = ["dynamodb:*"]
        Resource = "arn:aws:dynamodb:*:*:table/sensitive-*"
        Condition = {
          Bool = {
            "aws:MultiFactorAuthPresent" = "true"
          }
        }
      },
      {
        # Restrict by tag
        Sid    = "TagRestricted"
        Effect = "Allow"
        Action = [
          "ec2:StartInstances",
          "ec2:StopInstances",
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "ec2:ResourceTag/Environment" = "dev"
          }
        }
      }
    ]
  })
}
```

## Strategy 4: Separate Read and Write Permissions

Create distinct policies for read and write access, then attach only what is needed.

```hcl
# Read-only policy
resource "aws_iam_policy" "s3_read" {
  name = "s3-read-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:ListBucket",
        "s3:GetBucketLocation",
      ]
      Resource = [
        "arn:aws:s3:::app-data",
        "arn:aws:s3:::app-data/*",
      ]
    }]
  })
}

# Write policy (only attach when write access is needed)
resource "aws_iam_policy" "s3_write" {
  name = "s3-write-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:PutObject",
        "s3:DeleteObject",
      ]
      Resource = "arn:aws:s3:::app-data/*"
    }]
  })
}

# Read-only role only gets the read policy
resource "aws_iam_role_policy_attachment" "reader" {
  role       = aws_iam_role.reader_role.name
  policy_arn = aws_iam_policy.s3_read.arn
}

# Writer role gets both policies
resource "aws_iam_role_policy_attachment" "writer_read" {
  role       = aws_iam_role.writer_role.name
  policy_arn = aws_iam_policy.s3_read.arn
}

resource "aws_iam_role_policy_attachment" "writer_write" {
  role       = aws_iam_role.writer_role.name
  policy_arn = aws_iam_policy.s3_write.arn
}
```

## Strategy 5: Use Permission Boundaries

Permission boundaries set an upper limit on what permissions a role can have.

```hcl
resource "aws_iam_policy" "boundary" {
  name = "developer-boundary"
  path = "/boundaries/"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Maximum allowed services
        Effect = "Allow"
        Action = [
          "s3:*",
          "dynamodb:*",
          "lambda:*",
          "logs:*",
          "sqs:*",
          "sns:*",
        ]
        Resource = "*"
      },
      {
        # Explicitly deny sensitive services
        Effect = "Deny"
        Action = [
          "iam:*",
          "organizations:*",
          "sts:*",
        ]
        Resource = "*"
      }
    ]
  })
}

# Apply the boundary to roles
resource "aws_iam_role" "bounded_role" {
  name                 = "bounded-developer-role"
  assume_role_policy   = data.aws_iam_policy_document.trust.json
  permissions_boundary = aws_iam_policy.boundary.arn
}
```

## Strategy 6: Use Tags for Access Control

Tag-based access control (ABAC) lets you write policies that use tags to determine access.

```hcl
resource "aws_iam_policy" "abac_policy" {
  name = "tag-based-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Allow access only to resources tagged with the same project
        Sid    = "ProjectBasedAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "s3:ExistingObjectTag/Project" = "$${aws:PrincipalTag/Project}"
          }
        }
      },
      {
        # Allow EC2 actions only on instances in the same environment
        Sid    = "EnvironmentBasedEC2"
        Effect = "Allow"
        Action = [
          "ec2:StartInstances",
          "ec2:StopInstances",
          "ec2:RebootInstances",
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "ec2:ResourceTag/Environment" = "$${aws:PrincipalTag/Environment}"
          }
        }
      }
    ]
  })
}
```

## Strategy 7: Deny Statements for Guardrails

Use explicit deny statements to prevent specific dangerous actions regardless of other policies.

```hcl
resource "aws_iam_policy" "guardrails" {
  name = "security-guardrails"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyRootAccountActions"
        Effect = "Deny"
        Action = [
          "iam:CreateUser",
          "iam:DeleteUser",
        ]
        Resource = "*"
      },
      {
        Sid    = "DenyLeaveOrganization"
        Effect = "Deny"
        Action = [
          "organizations:LeaveOrganization",
        ]
        Resource = "*"
      },
      {
        Sid    = "DenyDisableCloudTrail"
        Effect = "Deny"
        Action = [
          "cloudtrail:StopLogging",
          "cloudtrail:DeleteTrail",
        ]
        Resource = "*"
      },
      {
        Sid    = "DenyPublicS3"
        Effect = "Deny"
        Action = [
          "s3:PutBucketPublicAccessBlock",
        ]
        Resource = "*"
        Condition = {
          Bool = {
            "s3:PublicAccessBlockConfiguration/BlockPublicAcls"     = "false"
            "s3:PublicAccessBlockConfiguration/BlockPublicPolicy"   = "false"
          }
        }
      }
    ]
  })
}
```

## Auditing with IAM Access Analyzer

AWS IAM Access Analyzer can help you identify unused permissions. While Access Analyzer is not a Terraform resource, you can create an analyzer with Terraform.

```hcl
resource "aws_accessanalyzer_analyzer" "account" {
  analyzer_name = "account-analyzer"
  type          = "ACCOUNT"

  tags = {
    ManagedBy = "terraform"
  }
}
```

## Checklist for Least Privilege

When reviewing IAM policies in pull requests, check for:

- Are actions specific rather than using wildcards?
- Are resources scoped to specific ARNs?
- Are conditions used where appropriate?
- Is there a clear separation between read and write permissions?
- Are permission boundaries applied to delegated roles?
- Are deny statements in place for dangerous actions?

For more on IAM security patterns, see [How to Create IAM Permission Boundaries in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-iam-permission-boundaries-in-terraform/view) and [How to Handle IAM Policy Conditions in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-iam-policy-conditions-in-terraform/view).

## Conclusion

Implementing least privilege is an ongoing process, not a one-time task. Terraform makes it manageable by codifying every permission, enabling peer review through pull requests, and providing a clear audit trail. Start with the strategies that give you the biggest security improvements: scope actions, specify resources, and add conditions. Then layer on permission boundaries and deny statements as your governance needs grow. Regular auditing with tools like IAM Access Analyzer helps you identify and remove unnecessary permissions over time.
