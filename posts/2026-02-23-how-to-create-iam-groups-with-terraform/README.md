# How to Create IAM Groups with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, Infrastructure as Code, Security, DevOps

Description: Learn how to create and manage AWS IAM groups using Terraform, including group policies, membership management, and best practices for organizing users.

---

Managing AWS Identity and Access Management (IAM) users at scale becomes challenging without proper organizational structures. IAM groups provide a way to assign permissions to collections of users rather than managing each user individually. When you combine IAM groups with Terraform, you get a reproducible, auditable, and version-controlled approach to access management.

In this guide, you will learn how to create IAM groups with Terraform, assign policies to those groups, manage group memberships, and follow best practices for organizing your AWS users.

## What Are IAM Groups?

IAM groups are collections of IAM users. When you attach a policy to a group, every user in that group receives those permissions. This simplifies permission management significantly. Instead of attaching the same policy to 50 individual users, you attach it once to a group and add the users to that group.

Groups cannot be nested. A group can only contain users, not other groups. Each user can belong to up to 10 groups, and an AWS account can have up to 300 groups by default.

## Prerequisites

Before you start, make sure you have the following in place:

- Terraform 1.0 or later installed on your machine
- An AWS account with administrative privileges
- AWS CLI configured with valid credentials
- Basic familiarity with Terraform syntax and HCL

## Setting Up the Terraform Provider

Start by configuring the AWS provider in your Terraform configuration.

```hcl
# main.tf - Configure the AWS provider
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.0"
}

provider "aws" {
  region = "us-east-1"
}
```

## Creating a Basic IAM Group

The simplest way to create an IAM group is with the `aws_iam_group` resource.

```hcl
# Create a basic IAM group for developers
resource "aws_iam_group" "developers" {
  name = "developers"
  path = "/teams/"  # Optional organizational path
}
```

The `path` parameter is optional but useful for organizing groups in larger organizations. You can use paths like `/teams/`, `/departments/`, or `/projects/` to create a logical hierarchy.

## Attaching Policies to Groups

There are several ways to attach policies to IAM groups. You can use managed policies, inline policies, or a combination of both.

### Attaching AWS Managed Policies

```hcl
# Attach an AWS managed policy to the developers group
resource "aws_iam_group_policy_attachment" "developers_ec2_readonly" {
  group      = aws_iam_group.developers.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess"
}

# Attach another managed policy
resource "aws_iam_group_policy_attachment" "developers_s3_readonly" {
  group      = aws_iam_group.developers.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}
```

### Creating and Attaching Custom Policies

```hcl
# Create a custom policy for the developers group
resource "aws_iam_policy" "developer_custom" {
  name        = "developer-custom-policy"
  description = "Custom policy for developer group members"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:GetMetricData",
          "cloudwatch:ListMetrics",
          "cloudwatch:GetDashboard",
          "logs:GetLogEvents",
          "logs:FilterLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}

# Attach the custom policy to the group
resource "aws_iam_group_policy_attachment" "developers_custom" {
  group      = aws_iam_group.developers.name
  policy_arn = aws_iam_policy.developer_custom.arn
}
```

### Using Inline Policies

Inline policies are embedded directly in the group. They are deleted when the group is deleted.

```hcl
# Attach an inline policy to the group
resource "aws_iam_group_policy" "developers_inline" {
  name  = "developer-inline-policy"
  group = aws_iam_group.developers.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "codecommit:GitPull",
          "codecommit:GitPush",
          "codecommit:ListRepositories"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Managing Group Membership

You can add users to groups using the `aws_iam_group_membership` resource.

```hcl
# Create IAM users
resource "aws_iam_user" "alice" {
  name = "alice"
}

resource "aws_iam_user" "bob" {
  name = "bob"
}

resource "aws_iam_user" "charlie" {
  name = "charlie"
}

# Add users to the developers group
resource "aws_iam_group_membership" "developers_members" {
  name  = "developers-group-membership"
  group = aws_iam_group.developers.name

  users = [
    aws_iam_user.alice.name,
    aws_iam_user.bob.name,
    aws_iam_user.charlie.name,
  ]
}
```

Be aware that `aws_iam_group_membership` is an exclusive resource. It manages all members of the group. If you add a user to the group outside of Terraform, Terraform will remove that user on the next apply. For non-exclusive membership management, use `aws_iam_user_group_membership` instead.

```hcl
# Non-exclusive approach: manage group membership per user
resource "aws_iam_user_group_membership" "alice_groups" {
  user = aws_iam_user.alice.name

  groups = [
    aws_iam_group.developers.name,
    aws_iam_group.readonly.name,  # Alice is in multiple groups
  ]
}
```

## Creating Multiple Groups with a Map

For organizations with many groups, you can use a map variable to create groups dynamically.

```hcl
# Define groups and their managed policies in a variable
variable "iam_groups" {
  description = "Map of IAM groups and their associated managed policy ARNs"
  type = map(object({
    path       = string
    policy_arns = list(string)
  }))
  default = {
    developers = {
      path       = "/teams/"
      policy_arns = [
        "arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess",
        "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
      ]
    }
    admins = {
      path       = "/teams/"
      policy_arns = [
        "arn:aws:iam::aws:policy/AdministratorAccess"
      ]
    }
    readonly = {
      path       = "/teams/"
      policy_arns = [
        "arn:aws:iam::aws:policy/ReadOnlyAccess"
      ]
    }
  }
}

# Create all groups dynamically
resource "aws_iam_group" "groups" {
  for_each = var.iam_groups

  name = each.key
  path = each.value.path
}

# Flatten the group-policy associations for attachment
locals {
  group_policy_attachments = flatten([
    for group_name, group_config in var.iam_groups : [
      for policy_arn in group_config.policy_arns : {
        group      = group_name
        policy_arn = policy_arn
      }
    ]
  ])
}

# Attach policies to groups
resource "aws_iam_group_policy_attachment" "attachments" {
  for_each = {
    for item in local.group_policy_attachments :
    "${item.group}-${item.policy_arn}" => item
  }

  group      = aws_iam_group.groups[each.value.group].name
  policy_arn = each.value.policy_arn
}
```

## Enforcing MFA with Group Policies

A common pattern is to create a group policy that requires multi-factor authentication (MFA) for sensitive actions.

```hcl
# Create a group that enforces MFA
resource "aws_iam_group" "mfa_required" {
  name = "mfa-required"
}

resource "aws_iam_group_policy" "require_mfa" {
  name  = "require-mfa-policy"
  group = aws_iam_group.mfa_required.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowAllWhenMFAPresent"
        Effect = "Allow"
        Action = "*"
        Resource = "*"
        Condition = {
          Bool = {
            "aws:MultiFactorAuthPresent" = "true"
          }
        }
      },
      {
        Sid    = "AllowMFAManagement"
        Effect = "Allow"
        Action = [
          "iam:CreateVirtualMFADevice",
          "iam:EnableMFADevice",
          "iam:ListMFADevices",
          "iam:ResyncMFADevice"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Best Practices

When working with IAM groups in Terraform, keep these best practices in mind:

1. **Use groups instead of direct user policies.** Always assign permissions through groups rather than attaching policies directly to users. This makes permission management much easier.

2. **Follow the principle of least privilege.** Only grant the permissions that group members actually need. Start with minimal permissions and add more as requirements become clear.

3. **Use meaningful names and paths.** Name your groups clearly so their purpose is obvious. Use paths to organize groups logically.

4. **Keep group count manageable.** While you can have up to 300 groups, aim for a reasonable number. Too many groups can become difficult to manage.

5. **Use Terraform modules for reusability.** If you manage multiple AWS accounts, create a module for your group structure so you can reuse it consistently.

6. **Store Terraform state remotely.** Use a remote backend like S3 with DynamoDB locking to ensure safe collaboration on IAM configurations.

For more on Terraform IAM management, check out our post on [How to Create IAM Policies with jsonencode in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-iam-policies-with-jsonencode-in-terraform/view) and [How to Implement Least Privilege IAM with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-least-privilege-iam-with-terraform/view).

## Conclusion

IAM groups are a fundamental building block for managing AWS access at scale. By using Terraform to define and manage your groups, you gain version control, reproducibility, and the ability to review changes before they are applied. Start with a clear group structure, attach the right policies, and manage membership carefully. This approach will save you significant time and reduce the risk of misconfigured permissions as your organization grows.
