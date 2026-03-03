# How to Create Reusable Terraform Modules for IAM Roles

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, AWS, IAM, Security

Description: Build a reusable Terraform module for AWS IAM roles with assume role policies, managed policies, inline policies, and instance profiles all in one clean interface.

---

IAM roles are the backbone of AWS security. Every service, application, and cross-account access pattern needs a role with the right trust policy and permissions. But IAM role definitions in Terraform tend to get messy fast. You have the role itself, the assume role policy, managed policy attachments, inline policies, and sometimes instance profiles - all split across multiple resources.

A reusable module ties all of these together and gives your team a single, auditable way to create roles.

## What the Module Should Cover

At minimum, an IAM role module should handle:

- The role resource with a configurable trust policy
- Attachment of AWS managed policies
- Attachment of customer managed policies
- Optional inline policy documents
- Optional instance profile creation
- Consistent naming and tagging
- Maximum session duration configuration

## Module Structure

```text
modules/iam-role/
  main.tf
  variables.tf
  outputs.tf
  versions.tf
```

## Variables

```hcl
# modules/iam-role/variables.tf

variable "name" {
  description = "Name of the IAM role"
  type        = string
}

variable "description" {
  description = "Description of the IAM role"
  type        = string
  default     = "Managed by Terraform"
}

variable "path" {
  description = "Path for the IAM role"
  type        = string
  default     = "/"
}

variable "max_session_duration" {
  description = "Maximum session duration in seconds (1-12 hours)"
  type        = number
  default     = 3600

  validation {
    condition     = var.max_session_duration >= 3600 && var.max_session_duration <= 43200
    error_message = "max_session_duration must be between 3600 and 43200"
  }
}

# Trust policy - who can assume this role
variable "trusted_services" {
  description = "List of AWS service principals that can assume this role"
  type        = list(string)
  default     = []
}

variable "trusted_accounts" {
  description = "List of AWS account IDs that can assume this role"
  type        = list(string)
  default     = []
}

variable "trusted_roles" {
  description = "List of IAM role ARNs that can assume this role"
  type        = list(string)
  default     = []
}

variable "custom_assume_role_policy" {
  description = "Custom assume role policy JSON. Overrides trusted_services/accounts/roles."
  type        = string
  default     = null
}

# Permissions
variable "managed_policy_arns" {
  description = "List of managed IAM policy ARNs to attach"
  type        = list(string)
  default     = []
}

variable "inline_policies" {
  description = "Map of inline policy names to JSON policy documents"
  type        = map(string)
  default     = {}
}

# Instance profile
variable "create_instance_profile" {
  description = "Whether to create an EC2 instance profile for this role"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Additional tags"
  type        = map(string)
  default     = {}
}
```

## Building the Trust Policy

The trust policy (assume role policy) is the trickiest part. You need to support services, accounts, and specific roles as principals. Here is how to build it dynamically:

```hcl
# modules/iam-role/main.tf

locals {
  # Build the list of principals for the trust policy
  service_principals = [for s in var.trusted_services : s]
  account_principals = [for a in var.trusted_accounts : "arn:aws:iam::${a}:root"]
  role_principals    = var.trusted_roles

  # Combine all principals
  all_principals = concat(
    local.service_principals,
    local.account_principals,
    local.role_principals
  )
}

# Generate assume role policy from inputs
data "aws_iam_policy_document" "assume_role" {
  count = var.custom_assume_role_policy == null ? 1 : 0

  statement {
    actions = ["sts:AssumeRole"]
    effect  = "Allow"

    principals {
      type = length(local.service_principals) > 0 ? "Service" : "AWS"
      identifiers = local.all_principals
    }
  }
}

# The IAM role itself
resource "aws_iam_role" "this" {
  name                 = var.name
  description          = var.description
  path                 = var.path
  max_session_duration = var.max_session_duration

  # Use custom policy if provided, otherwise use the generated one
  assume_role_policy = (
    var.custom_assume_role_policy != null
    ? var.custom_assume_role_policy
    : data.aws_iam_policy_document.assume_role[0].json
  )

  tags = merge(
    var.tags,
    {
      Name = var.name
    }
  )
}

# Attach managed policies
resource "aws_iam_role_policy_attachment" "managed" {
  for_each = toset(var.managed_policy_arns)

  role       = aws_iam_role.this.name
  policy_arn = each.value
}

# Create inline policies
resource "aws_iam_role_policy" "inline" {
  for_each = var.inline_policies

  name   = each.key
  role   = aws_iam_role.this.id
  policy = each.value
}

# Optional instance profile for EC2
resource "aws_iam_instance_profile" "this" {
  count = var.create_instance_profile ? 1 : 0

  name = var.name
  role = aws_iam_role.this.name

  tags = var.tags
}
```

## Outputs

```hcl
# modules/iam-role/outputs.tf

output "role_arn" {
  description = "ARN of the IAM role"
  value       = aws_iam_role.this.arn
}

output "role_name" {
  description = "Name of the IAM role"
  value       = aws_iam_role.this.name
}

output "role_id" {
  description = "Unique ID of the IAM role"
  value       = aws_iam_role.this.unique_id
}

output "instance_profile_name" {
  description = "Name of the instance profile (if created)"
  value       = var.create_instance_profile ? aws_iam_instance_profile.this[0].name : null
}

output "instance_profile_arn" {
  description = "ARN of the instance profile (if created)"
  value       = var.create_instance_profile ? aws_iam_instance_profile.this[0].arn : null
}
```

## Usage Examples

An EC2 role with SSM access:

```hcl
module "ec2_app_role" {
  source = "./modules/iam-role"

  name        = "ec2-app-server"
  description = "Role for application server EC2 instances"

  # EC2 needs to assume this role
  trusted_services = ["ec2.amazonaws.com"]

  # Attach AWS managed policies
  managed_policy_arns = [
    "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
    "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy",
  ]

  # Add custom permissions via inline policy
  inline_policies = {
    s3-access = jsonencode({
      Version = "2012-10-17"
      Statement = [
        {
          Effect = "Allow"
          Action = [
            "s3:GetObject",
            "s3:ListBucket"
          ]
          Resource = [
            "arn:aws:s3:::mycompany-app-config",
            "arn:aws:s3:::mycompany-app-config/*"
          ]
        }
      ]
    })
  }

  # Create instance profile so EC2 can use this role
  create_instance_profile = true

  tags = {
    Environment = "production"
    Team        = "backend"
  }
}
```

A Lambda execution role:

```hcl
module "lambda_role" {
  source = "./modules/iam-role"

  name             = "lambda-data-processor"
  trusted_services = ["lambda.amazonaws.com"]

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
  ]

  inline_policies = {
    dynamodb-access = jsonencode({
      Version = "2012-10-17"
      Statement = [
        {
          Effect   = "Allow"
          Action   = ["dynamodb:PutItem", "dynamodb:GetItem", "dynamodb:Query"]
          Resource = "arn:aws:dynamodb:us-east-1:123456789012:table/events"
        }
      ]
    })
  }
}
```

A cross-account role:

```hcl
module "cross_account_role" {
  source = "./modules/iam-role"

  name               = "cross-account-deployer"
  description        = "Allows deployment from CI/CD account"
  trusted_accounts   = ["111122223333"]  # CI/CD account ID
  max_session_duration = 7200             # 2 hours

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/PowerUserAccess",
  ]
}
```

## Design Considerations

One important decision is how to handle the trust policy. The module above supports simple cases with `trusted_services`, `trusted_accounts`, and `trusted_roles`, plus a `custom_assume_role_policy` escape hatch for complex scenarios like OIDC federation with GitHub Actions or conditions on the trust policy.

Using `for_each` instead of `count` for policy attachments is intentional. If you use `count` and remove a policy from the middle of the list, Terraform will detach and reattach all subsequent policies. With `for_each`, only the removed policy gets detached.

The inline policy approach using a map gives you clear names for each policy, making it easy to identify what each policy grants when auditing.

For more on module design, see our post on [creating Terraform modules with optional features](https://oneuptime.com/blog/post/2026-02-23-terraform-modules-with-optional-features/view).
