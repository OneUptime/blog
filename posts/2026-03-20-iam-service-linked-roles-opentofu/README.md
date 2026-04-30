# How to Create IAM Service-Linked Roles with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, IAM, Service-Linked Roles, Infrastructure as Code, AWS Services

Description: Learn how to create and manage AWS IAM Service-Linked Roles using OpenTofu to enable AWS services to perform actions on your behalf with predefined, immutable policies.

## Introduction

Service-linked roles are IAM roles pre-configured with the exact permissions needed by an AWS service. The service creates and manages them, but you can create them proactively with OpenTofu to ensure they exist before deploying dependent services. This prevents race conditions and permission errors during first-time deployments.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with IAM permissions

## Step 1: Create Service-Linked Roles

```hcl
# Service-linked role for ECS to manage cluster-related resources

resource "aws_iam_service_linked_role" "ecs" {
  aws_service_name = "ecs.amazonaws.com"
  description      = "Service-linked role for Amazon ECS"
}

# Service-linked role for Elastic Load Balancing
resource "aws_iam_service_linked_role" "elasticloadbalancing" {
  aws_service_name = "elasticloadbalancing.amazonaws.com"
  description      = "Service-linked role for Elastic Load Balancing"
}

# Service-linked role for Auto Scaling
resource "aws_iam_service_linked_role" "autoscaling" {
  aws_service_name = "autoscaling.amazonaws.com"
  description      = "Service-linked role for EC2 Auto Scaling"

  # Auto Scaling supports an optional custom suffix for additional roles
  # custom_suffix = "production"
}
```

## Step 2: Service-Linked Role for RDS

```hcl
resource "aws_iam_service_linked_role" "rds" {
  aws_service_name = "rds.amazonaws.com"
  description      = "Service-linked role for Amazon RDS"
}
```

## Step 3: Service-Linked Role for ElastiCache

```hcl
resource "aws_iam_service_linked_role" "elasticache" {
  aws_service_name = "elasticache.amazonaws.com"
  description      = "Service-linked role for Amazon ElastiCache"
}
```

## Step 4: Handle Already-Existing Roles

```hcl
# Declare the role in configuration as usual
resource "aws_iam_service_linked_role" "ecs" {
  aws_service_name = "ecs.amazonaws.com"
}

# If AWSServiceRoleForECS already exists in the account,
# import it into OpenTofu state before running `tofu apply`
# instead of trying to detect it with a data source lookup.
```

## Step 5: Import Existing Service-Linked Roles

```bash
# Import an existing service-linked role into OpenTofu state
tofu import aws_iam_service_linked_role.ecs \
  "arn:aws:iam::123456789012:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS"
```

```hcl
# Import block
import {
  to = aws_iam_service_linked_role.ecs
  id = "arn:aws:iam::123456789012:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS"
}

resource "aws_iam_service_linked_role" "ecs" {
  aws_service_name = "ecs.amazonaws.com"
}
```

## Step 6: View Service-Linked Role Details

```bash
# List all service-linked roles in the account
aws iam list-roles \
  --path-prefix "/aws-service-role/" \
  --query 'Roles[].{Name:RoleName, Arn:Arn}' \
  --output table

# Get details for a specific service-linked role
aws iam get-role \
  --role-name AWSServiceRoleForECS
```

## Step 7: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

Creating service-linked roles with OpenTofu in advance prevents deployment failures when AWS services try to create them automatically but encounter delays or permission issues. You cannot modify the permissions of service-linked roles-they are managed entirely by AWS-but you can view them for auditing purposes. Use `tofu import` to bring already-created service-linked roles under OpenTofu management to prevent duplication errors.
