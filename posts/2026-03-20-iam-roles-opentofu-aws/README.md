# IAM Roles with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, IAM, OpenTofu, Security, Cloud Infrastructure

Description: A practical guide to creating and managing AWS IAM roles using OpenTofu, including trust policies, service roles, and cross-account access patterns.

## What Are IAM Roles?

IAM roles are identities in AWS that can be assumed by users, services, or applications. Unlike IAM users, roles do not have long-term credentials - assuming a role provides temporary security credentials. Roles are the recommended way to grant permissions to:

- EC2 instances and Lambda functions
- Cross-account access
- Federated identity providers

## Creating a Basic IAM Role

```hcl
resource "aws_iam_role" "ec2_role" {
  name = "ec2-app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "ec2.amazonaws.com" }
        Action    = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Environment = "production"
  }
}
```

## Attaching Policies to the Role

```hcl
resource "aws_iam_role_policy_attachment" "ec2_s3_access" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}
```

## Instance Profile for EC2

```hcl
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "ec2-instance-profile"
  role = aws_iam_role.ec2_role.name
}

resource "aws_instance" "app" {
  ami                  = var.ami_id
  instance_type        = "t3.micro"
  iam_instance_profile = aws_iam_instance_profile.ec2_profile.name
}
```

## Lambda Execution Role

```hcl
resource "aws_iam_role" "lambda_role" {
  name = "lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "lambda.amazonaws.com" }
        Action    = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
```

## Cross-Account Role

```hcl
resource "aws_iam_role" "cross_account_role" {
  name = "cross-account-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { AWS = "arn:aws:iam::${var.trusted_account_id}:root" }
        Action    = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "sts:ExternalId" = var.external_id
          }
        }
      }
    ]
  })
}
```

## Role with Permission Boundary

```hcl
resource "aws_iam_role" "bounded_role" {
  name                 = "bounded-developer-role"
  assume_role_policy   = data.aws_iam_policy_document.assume.json
  permissions_boundary = aws_iam_policy.boundary.arn
}
```

## Outputs

```hcl
output "role_arn" {
  value = aws_iam_role.ec2_role.arn
}

output "role_name" {
  value = aws_iam_role.ec2_role.name
}
```

## Best Practices

1. **Use roles instead of long-lived credentials** for all AWS services
2. **Apply permission boundaries** to restrict the maximum effective permissions
3. **Add external IDs** for third-party cross-account roles to prevent confused deputy attacks
4. **Set maximum session duration** appropriately for the use case
5. **Tag roles** for organization, access control, and auditing

## Conclusion

IAM roles managed with OpenTofu provide secure, auditable access control for AWS services. By defining trust policies and permission attachments as code, you maintain a consistent and reviewable security posture across all your environments.
