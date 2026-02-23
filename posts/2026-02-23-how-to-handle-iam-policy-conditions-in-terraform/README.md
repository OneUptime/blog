# How to Handle IAM Policy Conditions in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, Policy Conditions, Security, Infrastructure as Code

Description: Learn how to use IAM policy conditions in Terraform to add context-based access controls including IP restrictions, MFA requirements, and tag-based access.

---

IAM policy conditions let you add fine-grained, context-based restrictions to your policies. Instead of simply allowing or denying actions, conditions let you specify when a policy statement takes effect based on factors like the requester's IP address, whether MFA is active, the time of day, resource tags, or request parameters. Conditions are one of the most powerful tools for implementing least privilege in AWS.

This guide covers how to write IAM policy conditions in Terraform using both `jsonencode` and `aws_iam_policy_document`, with examples for every common condition type.

## How Conditions Work

Each condition consists of three parts:

- **Condition operator**: The type of comparison (StringEquals, IpAddress, Bool, etc.)
- **Condition key**: The context variable being checked (aws:SourceIp, aws:MultiFactorAuthPresent, etc.)
- **Condition value**: The value(s) to compare against

Multiple conditions within the same statement are ANDed together (all must be true). Multiple values for the same key are ORed (any can match).

## Prerequisites

You need:

- Terraform 1.0 or later
- An AWS account with IAM permissions
- AWS CLI configured with valid credentials

## String Conditions

String conditions compare context values against strings.

### StringEquals

```hcl
# Allow access only when a specific tag matches
resource "aws_iam_policy" "string_equals" {
  name = "string-equals-example"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ec2:StartInstances", "ec2:StopInstances"]
      Resource = "*"
      Condition = {
        StringEquals = {
          "ec2:ResourceTag/Environment" = "development"
        }
      }
    }]
  })
}
```

### StringLike (with wildcards)

```hcl
# Allow access to S3 objects matching a pattern
resource "aws_iam_policy" "string_like" {
  name = "string-like-example"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject"]
      Resource = "arn:aws:s3:::data-bucket/*"
      Condition = {
        StringLike = {
          "s3:prefix" = ["reports/*", "exports/*"]
        }
      }
    }]
  })
}
```

### StringNotEquals

```hcl
# Deny all actions except by specific roles
resource "aws_iam_policy" "string_not_equals" {
  name = "deny-except-admin"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Deny"
      Action   = ["iam:*"]
      Resource = "*"
      Condition = {
        StringNotEquals = {
          "aws:PrincipalArn" = [
            "arn:aws:iam::123456789012:role/admin-role",
            "arn:aws:iam::123456789012:role/security-role",
          ]
        }
      }
    }]
  })
}
```

## Using Conditions with aws_iam_policy_document

The `aws_iam_policy_document` data source uses `condition` blocks.

```hcl
data "aws_iam_policy_document" "conditional" {
  statement {
    effect = "Allow"
    actions = ["s3:GetObject"]
    resources = ["arn:aws:s3:::my-bucket/*"]

    # Each condition block is ANDed with others
    condition {
      test     = "StringEquals"
      variable = "s3:ExistingObjectTag/Classification"
      values   = ["public", "internal"]
    }

    condition {
      test     = "IpAddress"
      variable = "aws:SourceIp"
      values   = ["10.0.0.0/8"]
    }
  }
}
```

## IP Address Conditions

Restrict access to specific IP ranges.

```hcl
resource "aws_iam_policy" "ip_restriction" {
  name = "ip-restricted-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Allow from corporate network
        Sid    = "AllowFromCorporate"
        Effect = "Allow"
        Action = "*"
        Resource = "*"
        Condition = {
          IpAddress = {
            "aws:SourceIp" = [
              "203.0.113.0/24",
              "198.51.100.0/24",
              "10.0.0.0/8",
            ]
          }
        }
      },
      {
        # Deny from everywhere else (explicit)
        Sid    = "DenyFromOutsideCorporate"
        Effect = "Deny"
        Action = "*"
        Resource = "*"
        Condition = {
          NotIpAddress = {
            "aws:SourceIp" = [
              "203.0.113.0/24",
              "198.51.100.0/24",
              "10.0.0.0/8",
            ]
          }
          # Do not deny VPC endpoint traffic (it has no source IP)
          Bool = {
            "aws:ViaAWSService" = "false"
          }
        }
      }
    ]
  })
}
```

## MFA Conditions

Require multi-factor authentication for sensitive operations.

```hcl
resource "aws_iam_policy" "mfa_required" {
  name = "mfa-required-actions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Allow basic read access without MFA
        Sid    = "AllowReadWithoutMFA"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket",
          "dynamodb:GetItem",
          "dynamodb:Query",
        ]
        Resource = "*"
      },
      {
        # Require MFA for write actions
        Sid    = "AllowWriteWithMFA"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:DeleteObject",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
        ]
        Resource = "*"
        Condition = {
          Bool = {
            "aws:MultiFactorAuthPresent" = "true"
          }
        }
      },
      {
        # Require recent MFA for IAM actions (within 5 minutes)
        Sid    = "AllowIAMWithRecentMFA"
        Effect = "Allow"
        Action = ["iam:*"]
        Resource = "*"
        Condition = {
          NumericLessThan = {
            "aws:MultiFactorAuthAge" = "300"
          }
        }
      }
    ]
  })
}
```

## Tag-Based Conditions (ABAC)

Attribute-Based Access Control uses tags for dynamic permission decisions.

```hcl
resource "aws_iam_policy" "abac" {
  name = "tag-based-access-control"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Allow EC2 actions on instances matching the principal's department tag
        Sid    = "MatchDepartmentTag"
        Effect = "Allow"
        Action = [
          "ec2:StartInstances",
          "ec2:StopInstances",
          "ec2:RebootInstances",
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            # The resource tag must match the principal's tag
            "ec2:ResourceTag/Department" = "$${aws:PrincipalTag/Department}"
          }
        }
      },
      {
        # Allow creating resources only with the correct department tag
        Sid    = "RequireDepartmentTag"
        Effect = "Allow"
        Action = ["ec2:RunInstances"]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestTag/Department" = "$${aws:PrincipalTag/Department}"
          }
          # Ensure the Department tag is always present
          "ForAllValues:StringEquals" = {
            "aws:TagKeys" = ["Department", "Environment", "Name"]
          }
        }
      }
    ]
  })
}
```

Note the `$${}` syntax in Terraform. The double dollar sign is needed to escape the `${}` that Terraform would otherwise interpret as a string interpolation.

## Date and Time Conditions

Restrict access based on time.

```hcl
resource "aws_iam_policy" "time_restricted" {
  name = "business-hours-only"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowDuringBusinessHours"
      Effect = "Allow"
      Action = ["ec2:*"]
      Resource = "*"
      Condition = {
        DateGreaterThan = {
          "aws:CurrentTime" = "2026-01-01T00:00:00Z"
        }
        DateLessThan = {
          "aws:CurrentTime" = "2027-01-01T00:00:00Z"
        }
      }
    }]
  })
}
```

## Numeric Conditions

Compare numeric values in policies.

```hcl
resource "aws_iam_policy" "size_limited" {
  name = "s3-size-limited"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:PutObject"]
      Resource = "arn:aws:s3:::uploads-bucket/*"
      Condition = {
        # Limit upload size to 100 MB
        NumericLessThanEquals = {
          "s3:content-length-range" = "104857600"
        }
      }
    }]
  })
}
```

## Boolean Conditions

```hcl
resource "aws_iam_policy" "secure_transport" {
  name = "require-ssl"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DenyInsecureTransport"
      Effect = "Deny"
      Action = "*"
      Resource = "*"
      Condition = {
        Bool = {
          "aws:SecureTransport" = "false"
        }
      }
    }]
  })
}
```

## Null Conditions

Check whether a condition key is present.

```hcl
resource "aws_iam_policy" "require_mfa_not_null" {
  name = "deny-without-mfa"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DenyWhenMFANotUsed"
      Effect = "Deny"
      Action = "*"
      Resource = "*"
      Condition = {
        # Deny if MFA is not present at all
        Null = {
          "aws:MultiFactorAuthPresent" = "true"
        }
      }
    }]
  })
}
```

## ARN Conditions

Compare ARN values in conditions.

```hcl
resource "aws_iam_policy" "arn_condition" {
  name = "arn-based-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["sqs:SendMessage"]
      Resource = "*"
      Condition = {
        ArnLike = {
          "aws:SourceArn" = "arn:aws:s3:::*-uploads"
        }
      }
    }]
  })
}
```

## Combining Multiple Conditions

Real-world policies often combine several conditions.

```hcl
data "aws_iam_policy_document" "complex_conditions" {
  statement {
    sid    = "ComplexAccess"
    effect = "Allow"

    actions   = ["s3:PutObject"]
    resources = ["arn:aws:s3:::sensitive-data/*"]

    # All conditions are ANDed
    condition {
      test     = "Bool"
      variable = "aws:MultiFactorAuthPresent"
      values   = ["true"]
    }

    condition {
      test     = "IpAddress"
      variable = "aws:SourceIp"
      values   = ["10.0.0.0/8"]
    }

    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-server-side-encryption"
      values   = ["aws:kms"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:PrincipalTag/ClearanceLevel"
      values   = ["high"]
    }
  }
}
```

## Dynamic Conditions with Terraform Variables

Build conditions dynamically based on your configuration.

```hcl
variable "allowed_ips" {
  type    = list(string)
  default = ["10.0.0.0/8", "172.16.0.0/12"]
}

variable "require_mfa" {
  type    = bool
  default = true
}

data "aws_iam_policy_document" "dynamic_conditions" {
  statement {
    effect    = "Allow"
    actions   = ["s3:*"]
    resources = ["*"]

    # Always add IP restriction
    condition {
      test     = "IpAddress"
      variable = "aws:SourceIp"
      values   = var.allowed_ips
    }

    # Conditionally add MFA requirement
    dynamic "condition" {
      for_each = var.require_mfa ? [1] : []

      content {
        test     = "Bool"
        variable = "aws:MultiFactorAuthPresent"
        values   = ["true"]
      }
    }
  }
}
```

## Best Practices

1. **Use conditions wherever possible.** They significantly reduce the blast radius of policies.
2. **Test conditions carefully.** A misconfigured condition can either block legitimate access or be too permissive.
3. **Escape Terraform interpolation.** Use `$${}` when referencing IAM policy variables in `jsonencode`.
4. **Combine conditions for defense in depth.** Layer IP restrictions, MFA requirements, and tag-based controls.
5. **Document your conditions.** Use the `Sid` field to explain what each condition-protected statement does.

For related topics, see [How to Implement Least Privilege IAM with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-least-privilege-iam-with-terraform/view) and [How to Create IAM Policies with aws_iam_policy_document in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-iam-policies-with-aws-iam-policy-document-in-terraform/view).

## Conclusion

IAM policy conditions transform simple allow/deny policies into sophisticated, context-aware access controls. Whether you need to restrict access by IP address, require MFA, enforce encryption, or implement tag-based access control, conditions give you the precision to build truly least-privilege policies. Terraform supports all condition types through both `jsonencode` and `aws_iam_policy_document`, letting you build and manage complex conditional policies as code. Start by adding IP and MFA conditions to your most sensitive policies, then expand to tag-based controls as your needs evolve.
