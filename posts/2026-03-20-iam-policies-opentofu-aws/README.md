# IAM Policies with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, IAM, OpenTofu, Security, Infrastructure as Code

Description: Learn how to define, attach, and manage AWS IAM policies using OpenTofu to enforce least-privilege access across your cloud infrastructure.

## Why Manage IAM Policies as Code?

IAM policies control what actions users, roles, and services can perform in AWS. Managing them manually via the console is error-prone and hard to audit. OpenTofu (the open-source fork of Terraform) lets you version-control, review, and automate IAM policy management.

## Types of IAM Policies

- **Managed Policies** - Standalone policies attachable to multiple identities
- **Inline Policies** - Embedded directly into a user, group, or role
- **AWS Managed Policies** - Pre-built policies maintained by AWS

## Defining a Custom Managed Policy

```hcl
resource "aws_iam_policy" "s3_read_only" {
  name        = "S3ReadOnlyPolicy"
  description = "Allow read-only access to a specific S3 bucket"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::my-app-bucket",
          "arn:aws:s3:::my-app-bucket/*"
        ]
      }
    ]
  })
}
```

## Attaching a Policy to a Role

```hcl
resource "aws_iam_role_policy_attachment" "attach_s3" {
  role       = aws_iam_role.app_role.name
  policy_arn = aws_iam_policy.s3_read_only.arn
}
```

## Using AWS Managed Policies

```hcl
resource "aws_iam_role_policy_attachment" "readonly" {
  role       = aws_iam_role.readonly_role.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}
```

## Inline Policy Example

```hcl
resource "aws_iam_role_policy" "inline_policy" {
  name = "InlineDynamoDBAccess"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem"]
        Resource = "arn:aws:dynamodb:us-east-1:123456789012:table/MyTable"
      }
    ]
  })
}
```

## Using Data Source for Existing Policies

```hcl
data "aws_iam_policy" "admin_policy" {
  arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

output "admin_policy_id" {
  value = data.aws_iam_policy.admin_policy.policy_id
}
```

## Policy with Conditions

```hcl
resource "aws_iam_policy" "mfa_required" {
  name = "RequireMFA"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Deny"
        Action    = "*"
        Resource  = "*"
        Condition = {
          BoolIfExists = {
            "aws:MultiFactorAuthPresent" = "false"
          }
        }
      }
    ]
  })
}
```

## Best Practices

1. **Least privilege** - Grant only the permissions needed for the task
2. **Avoid wildcards** - Prefer specific actions and resources over `*`
3. **Use conditions** - Restrict by IP, MFA, time, or other context
4. **Separate managed vs inline** - Use managed policies for reuse; inline for one-off restrictions
5. **Audit regularly** - Use AWS Access Analyzer to detect overly permissive policies

## Conclusion

OpenTofu makes IAM policy management predictable and auditable. By codifying policies, you ensure consistency across environments and reduce the risk of privilege escalation or accidental over-permissioning.
