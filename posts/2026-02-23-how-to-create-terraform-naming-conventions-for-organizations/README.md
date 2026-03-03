# How to Create Terraform Naming Conventions for Organizations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Naming Convention, Best Practices, Team Collaboration, Infrastructure as Code

Description: Design and implement consistent Terraform naming conventions across your organization to improve readability, enable automation, and simplify resource management.

---

Names are the first thing you see when reading Terraform code or browsing cloud resources in a console. Good names tell you what a resource does, who owns it, and what environment it belongs to without looking at any other configuration. Bad names force you to click through resource details, cross-reference documentation, or ask a colleague what "resource-1" actually is.

Naming conventions are especially important in organizations where multiple teams manage infrastructure. When every team follows the same naming pattern, resources are self-documenting. When each team invents its own scheme, the cloud account becomes a confusing mess of inconsistent names.

## The Two Types of Names

In Terraform, every resource has two names: the Terraform identifier and the cloud resource name.

```hcl
# Terraform identifier: "web_server"
# This is the name used in Terraform code and state
resource "aws_instance" "web_server" {
  # Cloud resource name: "prod-api-web-01"
  # This is what appears in the AWS console and APIs
  tags = {
    Name = "prod-api-web-01"
  }
}
```

Both need conventions, and they serve different purposes.

## Terraform Identifier Conventions

Terraform identifiers are used in code references, state addresses, and import commands. They should be descriptive and follow HCL conventions:

```hcl
# Convention: snake_case, descriptive, no type prefix
# Format: <descriptive_name>

# GOOD: Clear what the resource represents
resource "aws_instance" "api_server" {}
resource "aws_security_group" "api_ingress" {}
resource "aws_db_instance" "orders_primary" {}
resource "aws_s3_bucket" "application_logs" {}

# BAD: Includes resource type in name (redundant)
resource "aws_instance" "aws_instance_api" {}

# BAD: Too generic
resource "aws_instance" "server" {}
resource "aws_security_group" "sg" {}

# BAD: Uses PascalCase or camelCase
resource "aws_instance" "ApiServer" {}
resource "aws_instance" "apiServer" {}

# BAD: Uses numbers without meaning
resource "aws_instance" "instance_1" {}
```

### Module Identifier Conventions

```hcl
# Module names should describe what they create, not how
# Format: <domain>_<purpose>

# GOOD
module "api_networking" {
  source = "./modules/networking"
}

module "order_database" {
  source = "./modules/rds"
}

# BAD: Named after the technology
module "vpc" {
  source = "./modules/networking"
}

module "rds" {
  source = "./modules/rds"
}
```

## Cloud Resource Naming Conventions

Cloud resource names appear in consoles, billing reports, logs, and monitoring dashboards. They need to convey information to people who may not have access to the Terraform code:

### The Standard Naming Pattern

```text
<environment>-<project>-<component>-<qualifier>
```

```hcl
# Examples following the pattern:
# environment-project-component-qualifier

locals {
  # Build the name prefix from common variables
  name_prefix = "${var.environment}-${var.project}"
}

# VPC: prod-ecommerce-vpc
resource "aws_vpc" "main" {
  tags = {
    Name = "${local.name_prefix}-vpc"
  }
}

# Subnets: prod-ecommerce-private-subnet-1a
resource "aws_subnet" "private" {
  count = length(var.availability_zones)

  tags = {
    Name = "${local.name_prefix}-private-subnet-${var.availability_zones[count.index]}"
  }
}

# EC2: prod-ecommerce-api-server
resource "aws_instance" "api" {
  tags = {
    Name = "${local.name_prefix}-api-server"
  }
}

# RDS: prod-ecommerce-orders-db
resource "aws_db_instance" "orders" {
  identifier = "${local.name_prefix}-orders-db"
}

# S3: prod-ecommerce-application-logs
resource "aws_s3_bucket" "logs" {
  bucket = "${local.name_prefix}-application-logs"
}
```

### Handling Cloud-Specific Constraints

Different cloud resources have different naming rules:

```hcl
locals {
  # Standard prefix for most resources
  name_prefix = "${var.environment}-${var.project}"

  # S3 buckets: globally unique, lowercase, no underscores
  # Append account ID for uniqueness
  s3_prefix = "${var.environment}-${var.project}-${data.aws_caller_identity.current.account_id}"

  # IAM roles: max 64 characters, alphanumeric plus specific special chars
  iam_prefix = "${var.environment}-${var.project}"

  # RDS identifiers: lowercase, hyphens only, max 63 characters
  rds_prefix = lower("${var.environment}-${var.project}")

  # CloudWatch log groups: forward slashes allowed
  log_prefix = "/${var.environment}/${var.project}"
}

# S3 bucket with account-specific naming
resource "aws_s3_bucket" "data" {
  bucket = "${local.s3_prefix}-data-lake"
}

# IAM role following naming constraints
resource "aws_iam_role" "api" {
  name = "${local.iam_prefix}-api-execution-role"
}

# RDS with identifier constraints
resource "aws_db_instance" "main" {
  identifier = "${local.rds_prefix}-main"
}

# CloudWatch with hierarchical naming
resource "aws_cloudwatch_log_group" "api" {
  name = "${local.log_prefix}/api/application"
}
```

## Tag Naming Conventions

Tags are just as important as resource names. Standardize tag keys across the organization:

```hcl
# Standard tag key convention: PascalCase
# Every resource must have these tags

locals {
  required_tags = {
    Environment = var.environment       # production, staging, development
    Project     = var.project           # ecommerce, analytics, platform
    Team        = var.team              # platform-team, api-team
    ManagedBy   = "terraform"           # terraform, manual, cloudformation
    CostCenter  = var.cost_center       # eng-001, ops-002
    Owner       = var.owner_email       # team-lead@company.com
    Repository  = var.repository        # github.com/company/infra
  }
}

# Helper module to enforce required tags
variable "tags" {
  type        = map(string)
  description = "Additional tags to apply to resources."
  default     = {}
}

locals {
  all_tags = merge(local.required_tags, var.tags)
}

# Usage in resources
resource "aws_instance" "api" {
  ami           = var.ami_id
  instance_type = var.instance_type
  tags          = merge(local.all_tags, {
    Name = "${local.name_prefix}-api-server"
    Role = "api"
  })
}
```

## Variable Naming Conventions

```hcl
# Variable naming: snake_case, descriptive, prefixed by domain

# GOOD: Clear domain and purpose
variable "database_instance_class" {
  type        = string
  description = "RDS instance class for the primary database."
}

variable "api_server_instance_type" {
  type        = string
  description = "EC2 instance type for API servers."
}

variable "vpc_cidr_block" {
  type        = string
  description = "CIDR block for the VPC."
}

# BAD: Ambiguous
variable "size" {}
variable "type" {}
variable "cidr" {}

# Boolean variables: use is_, has_, or enable_ prefix
variable "is_production" {
  type        = bool
  description = "Whether this is a production environment."
}

variable "enable_encryption" {
  type        = bool
  description = "Whether to enable encryption at rest."
  default     = true
}

variable "has_public_access" {
  type        = bool
  description = "Whether the resource should be publicly accessible."
  default     = false
}
```

## Output Naming Conventions

```hcl
# Output naming: <resource>_<attribute>
# Match the resource name with the specific attribute

output "vpc_id" {
  description = "The ID of the VPC."
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "The CIDR block of the VPC."
  value       = aws_vpc.main.cidr_block
}

output "private_subnet_ids" {
  description = "List of private subnet IDs."
  value       = aws_subnet.private[*].id
}

output "database_endpoint" {
  description = "The connection endpoint for the primary database."
  value       = aws_db_instance.main.endpoint
}

output "database_port" {
  description = "The port number for the primary database."
  value       = aws_db_instance.main.port
}
```

## Enforcing Naming Conventions

Automate enforcement through linting and CI checks:

```hcl
# .tflint.hcl
rule "terraform_naming_convention" {
  enabled = true

  # Enforce snake_case for all identifiers
  variable {
    format = "snake_case"
  }

  resource {
    format = "snake_case"
  }

  output {
    format = "snake_case"
  }

  module {
    format = "snake_case"
  }

  data {
    format = "snake_case"
  }

  locals {
    format = "snake_case"
  }
}
```

```yaml
# .github/workflows/naming-check.yml
name: Naming Convention Check

on:
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check Cloud Resource Names
        run: |
          # Verify all Name tags follow the convention
          grep -rn 'Name\s*=' --include="*.tf" | while read line; do
            # Check for the expected pattern
            if ! echo "$line" | grep -qP 'Name\s*=.*\$\{(local\.name_prefix|var\.environment)'; then
              echo "WARNING: Possible naming convention violation: $line"
            fi
          done

      - name: TFLint Naming Check
        uses: terraform-linters/setup-tflint@v4
      - run: tflint --init && tflint --recursive
```

## Documenting Your Conventions

Create a reference document that teams can consult:

```markdown
# Naming Convention Reference

## Quick Reference Table

| Type | Convention | Example |
|------|-----------|---------|
| Terraform resource | snake_case | api_server |
| Terraform variable | snake_case | database_port |
| Terraform output | snake_case | vpc_id |
| Cloud resource name | kebab-case with prefix | prod-api-web-server |
| S3 bucket | kebab-case with account | prod-api-123456-logs |
| IAM role | kebab-case with prefix | prod-api-execution-role |
| Tag keys | PascalCase | Environment, CostCenter |
| CloudWatch log group | forward-slash hierarchy | /prod/api/application |
```

For more on creating consistent standards across teams, see our guide on [creating Terraform style guides for teams](https://oneuptime.com/blog/post/2026-02-23-how-to-create-terraform-style-guides-for-teams/view).

Naming conventions are deceptively simple. Getting the whole organization to agree and follow them consistently is the real challenge. Start with a minimal set of rules, enforce them automatically, and expand as needed. The goal is not perfection but consistency.
