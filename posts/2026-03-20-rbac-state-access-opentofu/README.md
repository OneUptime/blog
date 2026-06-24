# How to Set Up RBAC for OpenTofu State Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, RBAC, State Access, IAM, S3, Security, Infrastructure as Code

Description: Learn how to implement role-based access control for OpenTofu state files using S3 bucket policies, IAM roles, and path-based permissions to prevent unauthorized state access.

---

OpenTofu state files contain sensitive data - resource IDs, IP addresses, and sometimes secrets. Role-based access control ensures developers can only access the state for their environment and team, while CI/CD pipelines have scoped permissions appropriate for their function.

## RBAC Model for State Access

```mermaid
graph TD
    A[Developer] --> B[Read/Write: dev state]
    C[Senior Engineer] --> B
    C --> D[Read/Write: staging state]
    E[State Audit] --> F[Read-only: all states]
    G[CI/CD - Plan] --> H[Read/Write: specific env state]
    I[CI/CD - Apply] --> H
    J[SRE On-Call] --> F
```

## S3 State Bucket with Path-Based Permissions

```hcl
# iam_roles.tf

# Read-only access to all states (for auditing and emergency inspection)

resource "aws_iam_policy" "state_read_only" {
  name = "tofu-state-read-only"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.state.arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "${aws_s3_bucket.state.arn}/*"
      }
    ]
  })
}

# Environment-scoped write access
resource "aws_iam_policy" "state_write_dev" {
  name = "tofu-state-write-dev"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.state.arn}/environments/dev/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.state.arn
        Condition = {
          StringLike = {
            "s3:prefix" = ["environments/dev/*"]
          }
        }
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:DescribeTable", "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"]
        Resource = aws_dynamodb_table.state_lock.arn
      }
    ]
  })
}

resource "aws_iam_policy" "state_write_staging" {
  name = "tofu-state-write-staging"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.state.arn}/environments/staging/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.state.arn
        Condition = {
          StringLike = {
            "s3:prefix" = ["environments/staging/*"]
          }
        }
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:DescribeTable", "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"]
        Resource = aws_dynamodb_table.state_lock.arn
      }
    ]
  })
}

resource "aws_iam_policy" "state_write_production" {
  name = "tofu-state-write-production"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.state.arn}/environments/production/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.state.arn
        Condition = {
          StringLike = {
            "s3:prefix" = ["environments/production/*"]
          }
        }
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:DescribeTable", "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"]
        Resource = aws_dynamodb_table.state_lock.arn
      }
    ]
  })
}
```

## IAM Roles per Function

```hcl
locals {
  roles = {
    "state-audit" = {
      policies    = [aws_iam_policy.state_read_only.arn]
      description = "State audit role - read-only state access"
    }
    "ci-plan-dev" = {
      policies    = [aws_iam_policy.state_write_dev.arn]
      description = "CI plan for dev - backend write and lock access"
    }
    "ci-apply-dev" = {
      policies    = [aws_iam_policy.state_write_dev.arn]
      description = "CI apply to dev - read/write dev state"
    }
    "ci-plan-production" = {
      policies    = [aws_iam_policy.state_write_production.arn]
      description = "CI plan for production - backend write and lock access"
    }
    "ci-apply-production" = {
      policies    = [aws_iam_policy.state_write_production.arn]
      description = "CI apply to production - read/write production state"
    }
  }
}

resource "aws_iam_role" "tofu" {
  for_each    = local.roles
  name        = "tofu-${each.key}"
  description = each.value.description

  # Example trust policy for EC2-hosted runners; replace the principal
  # with your CI system's actual trusted principal (for example, OIDC).
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "tofu" {
  for_each   = local.roles
  role       = aws_iam_role.tofu[each.key].name
  policy_arn = each.value.policies[0]
}
```

## Team Group Assignments

```hcl
resource "aws_iam_group" "dev_team" {
  name = "infrastructure-dev-team"
}

resource "aws_iam_group_policy_attachment" "dev_team" {
  group      = aws_iam_group.dev_team.name
  policy_arn = aws_iam_policy.state_write_dev.arn
}

resource "aws_iam_group" "senior_engineers" {
  name = "infrastructure-senior"
}

resource "aws_iam_group_policy_attachment" "senior_dev" {
  group      = aws_iam_group.senior_engineers.name
  policy_arn = aws_iam_policy.state_write_dev.arn
}

resource "aws_iam_group_policy_attachment" "senior_staging" {
  group      = aws_iam_group.senior_engineers.name
  policy_arn = aws_iam_policy.state_write_staging.arn
}
```

## Best Practices

- Require MFA for any human break-glass role that can write production state - automated CI/CD roles should use dedicated workload identities instead.
- Use path-based permissions (S3 prefix conditions) rather than separate buckets per environment - it's easier to manage with fewer resources.
- Default `tofu plan` performs refresh and state locking, so CI/CD plan roles need the same backend write and lock permissions as the environment they operate on.
- Audit state access with S3 server access logging and CloudTrail - you need to know who accessed state and when.
- Never grant developers direct access to production state - use CI/CD pipelines as the only path to production applies.
