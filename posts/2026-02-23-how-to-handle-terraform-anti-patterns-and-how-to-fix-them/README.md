# How to Handle Terraform Anti-Patterns and How to Fix Them

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Anti-Patterns, Best Practices, Code Quality, DevOps

Description: Learn to identify and fix common Terraform anti-patterns that lead to fragile infrastructure, slow operations, security vulnerabilities, and maintenance headaches in your organization.

---

Every Terraform codebase accumulates anti-patterns over time. Some emerge from shortcuts taken under pressure. Others come from approaches that worked at small scale but break down as the infrastructure grows. Recognizing these anti-patterns and knowing how to fix them is essential for maintaining a healthy, scalable Terraform codebase.

In this guide, we will walk through the most common Terraform anti-patterns and provide concrete solutions for each.

## Anti-Pattern 1: The Monolithic State File

The single largest Terraform anti-pattern is managing all resources in one state file:

```hcl
# ANTI-PATTERN: Everything in one state
# infrastructure/
#   main.tf        # 3000 lines, all resources
#   terraform.tfstate  # Massive state file

# FIX: Split into focused workspaces
# infrastructure/
#   networking/
#     main.tf
#     backend.tf   # Separate state file
#   compute/
#     main.tf
#     backend.tf   # Separate state file
#   databases/
#     main.tf
#     backend.tf   # Separate state file

# Use data sources to share information between workspaces
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "myorg-terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}
```

## Anti-Pattern 2: Hardcoded Values Everywhere

```hcl
# ANTI-PATTERN: Hardcoded values
resource "aws_instance" "web" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.medium"
  subnet_id     = "subnet-0123456789abcdef0"

  tags = {
    Name        = "web-server-production"
    Environment = "production"
  }
}

# FIX: Use variables, data sources, and locals
variable "environment" {
  type = string
}

data "aws_ami" "app" {
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "name"
    values = ["app-*"]
  }
}

locals {
  instance_types = {
    dev        = "t3.small"
    staging    = "t3.medium"
    production = "t3.large"
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.app.id
  instance_type = local.instance_types[var.environment]
  subnet_id     = data.terraform_remote_state.networking.outputs.private_subnet_ids[0]

  tags = {
    Name        = "web-server-${var.environment}"
    Environment = var.environment
  }
}
```

## Anti-Pattern 3: Copy-Paste Infrastructure

```hcl
# ANTI-PATTERN: Duplicated code for each environment
# environments/dev/main.tf
resource "aws_ecs_service" "app" {
  name            = "app-dev"
  desired_count   = 1
  # ... 50 lines of configuration
}

# environments/staging/main.tf
resource "aws_ecs_service" "app" {
  name            = "app-staging"
  desired_count   = 2
  # ... same 50 lines with slight differences
}

# environments/production/main.tf
resource "aws_ecs_service" "app" {
  name            = "app-production"
  desired_count   = 3
  # ... same 50 lines with slight differences
}

# FIX: Use a shared module with environment-specific variables
# modules/app-service/main.tf
resource "aws_ecs_service" "app" {
  name          = "app-${var.environment}"
  desired_count = var.desired_count
  # ... configuration using variables
}

# environments/dev/main.tf
module "app" {
  source        = "../../modules/app-service"
  environment   = "dev"
  desired_count = 1
}

# environments/production/main.tf
module "app" {
  source        = "../../modules/app-service"
  environment   = "production"
  desired_count = 3
}
```

## Anti-Pattern 4: Using count When for_each Is Better

```hcl
# ANTI-PATTERN: Using count for named resources
variable "subnet_names" {
  default = ["web", "app", "data"]
}

resource "aws_subnet" "private" {
  count      = length(var.subnet_names)
  vpc_id     = aws_vpc.main.id
  cidr_block = cidrsubnet(var.vpc_cidr, 8, count.index)

  tags = {
    Name = var.subnet_names[count.index]
  }
}

# Problem: Removing "app" from the list shifts indices,
# causing "data" subnet to be destroyed and recreated

# FIX: Use for_each with a map
variable "subnets" {
  default = {
    web  = { cidr_index = 0 }
    app  = { cidr_index = 1 }
    data = { cidr_index = 2 }
  }
}

resource "aws_subnet" "private" {
  for_each   = var.subnets
  vpc_id     = aws_vpc.main.id
  cidr_block = cidrsubnet(var.vpc_cidr, 8, each.value.cidr_index)

  tags = {
    Name = each.key
  }
}

# Now removing "app" only affects the app subnet
```

## Anti-Pattern 5: Secrets in Terraform Code

```hcl
# ANTI-PATTERN: Secrets in code or tfvars
variable "db_password" {
  default = "SuperSecretPassword123!"  # Never do this
}

resource "aws_db_instance" "main" {
  password = var.db_password
}

# FIX: Use a secrets manager
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "production/database/password"
}

resource "aws_db_instance" "main" {
  password = data.aws_secretsmanager_secret_version.db_password.secret_string
}

# Or use Terraform variables marked as sensitive
variable "db_password" {
  type      = string
  sensitive = true
  # Set via TF_VAR_db_password environment variable
  # or via a secure variable in Terraform Cloud
}
```

## Anti-Pattern 6: Not Using Lifecycle Rules

```hcl
# ANTI-PATTERN: Production database with no protection
resource "aws_db_instance" "production" {
  identifier = "production-db"
  # ... no lifecycle configuration
}
# Someone accidentally runs terraform destroy and
# the production database is gone

# FIX: Add lifecycle protection
resource "aws_db_instance" "production" {
  identifier          = "production-db"
  deletion_protection = true

  lifecycle {
    prevent_destroy = true

    # Ignore changes managed outside Terraform
    ignore_changes = [
      latest_restorable_time
    ]
  }
}
```

## Anti-Pattern 7: Overly Complex Expressions

```hcl
# ANTI-PATTERN: Unreadable nested expressions
resource "aws_iam_role_policy" "complex" {
  policy = jsonencode({
    Statement = [for s in flatten([for k, v in var.permissions : [for action in v.actions : {
      Effect = "Allow", Action = action, Resource = v.resources
    }]]) : s if contains(keys(var.enabled_permissions), s.Action)]
  })
}

# FIX: Break into readable locals
locals {
  # Step 1: Expand permissions into individual statements
  expanded_permissions = flatten([
    for role, config in var.permissions : [
      for action in config.actions : {
        effect   = "Allow"
        action   = action
        resource = config.resources
      }
    ]
  ])

  # Step 2: Filter to only enabled permissions
  active_permissions = [
    for perm in local.expanded_permissions :
    perm if contains(keys(var.enabled_permissions), perm.action)
  ]
}

resource "aws_iam_role_policy" "clear" {
  policy = jsonencode({
    Statement = local.active_permissions
  })
}
```

## Anti-Pattern 8: Not Validating Inputs

```hcl
# ANTI-PATTERN: No input validation
variable "environment" {
  type = string
}

variable "instance_type" {
  type = string
}

# FIX: Validate all inputs
variable "environment" {
  type        = string
  description = "Deployment environment"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type"

  validation {
    condition     = can(regex("^t3\\.(micro|small|medium|large|xlarge|2xlarge)$", var.instance_type))
    error_message = "Only t3 instance types are allowed."
  }
}
```

## Anti-Pattern 9: Running Terraform Locally for Production

```yaml
# ANTI-PATTERN: Engineers run terraform apply from their laptops
# - No audit trail
# - No consistent state
# - Risk of stale local state
# - No approval process

# FIX: All production changes go through CI/CD
# .github/workflows/terraform-deploy.yaml
name: Terraform Deploy

on:
  push:
    branches: [main]
    paths: ['infrastructure/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # Requires approval
    steps:
      - uses: actions/checkout@v4
      - name: Terraform Apply
        run: |
          terraform init
          terraform apply -auto-approve
```

## Anti-Pattern 10: Ignoring Drift

```yaml
# ANTI-PATTERN: Never checking for drift
# Someone makes a manual change in the console
# Terraform does not know about it
# Next apply might overwrite or conflict

# FIX: Automated drift detection
# .github/workflows/drift-detection.yaml
name: Drift Detection

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours

jobs:
  detect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check for Drift
        run: |
          terraform init
          terraform plan -detailed-exitcode
          # Exit code 2 means drift detected
```

## Best Practices for Avoiding Anti-Patterns

Establish coding standards before the codebase grows. It is much harder to fix anti-patterns in 1000 resources than in 10.

Use automated linting and scanning to catch anti-patterns early. Tools like TFLint and Checkov can detect many of these patterns automatically.

Conduct regular code reviews. Fresh eyes catch patterns that become invisible to the people who work in the code daily.

Refactor incrementally. Do not try to fix every anti-pattern at once. Address them gradually as part of regular development work.

Document the why behind standards. Engineers are more likely to follow guidelines when they understand the problems that anti-patterns cause.

## Conclusion

Terraform anti-patterns are inevitable in any growing codebase, but recognizing and fixing them systematically keeps your infrastructure manageable and reliable. By understanding the common patterns - monolithic state, hardcoded values, copy-paste code, missing validation, and inadequate protection mechanisms - you can proactively design your Terraform code to avoid these pitfalls. Regular refactoring, automated checks, and code review practices help keep anti-patterns at bay as your infrastructure grows.
