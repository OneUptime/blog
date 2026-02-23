# How to Create Terraform Modules with Validation Rules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Validation, Input Validation, Infrastructure as Code

Description: Learn how to add validation rules to Terraform modules using variable validation, preconditions, postconditions, and custom check blocks for safer infrastructure deployments.

---

Validation rules are your first line of defense against misconfiguration. When someone passes an invalid CIDR block, an unsupported instance type, or a name that is too long for the cloud provider, you want Terraform to catch it during planning - not after it has already started creating resources. This post shows how to build comprehensive validation into your Terraform modules.

## Variable Validation Basics

Terraform lets you add `validation` blocks to any variable. Each validation block has a `condition` that must be true and an `error_message` that explains what went wrong.

```hcl
# Basic string validation
variable "environment" {
  description = "Deployment environment"
  type        = string

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

# Numeric range validation
variable "instance_count" {
  description = "Number of instances to create"
  type        = number

  validation {
    condition     = var.instance_count >= 1 && var.instance_count <= 100
    error_message = "Instance count must be between 1 and 100."
  }
}

# String pattern validation with regex
variable "name" {
  description = "Resource name prefix"
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,23}$", var.name))
    error_message = "Name must be 3-24 characters, start with a letter, and contain only lowercase alphanumeric characters and hyphens."
  }
}
```

## Multiple Validation Rules on One Variable

You can add multiple validation blocks to a single variable. Each one is checked independently.

```hcl
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string

  # Check it is a valid CIDR notation
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid CIDR notation (e.g., 10.0.0.0/16)."
  }

  # Check the prefix length is appropriate for a VPC
  validation {
    condition     = tonumber(split("/", var.vpc_cidr)[1]) >= 16 && tonumber(split("/", var.vpc_cidr)[1]) <= 24
    error_message = "VPC CIDR prefix must be between /16 and /24."
  }

  # Check it is in a private IP range
  validation {
    condition = anytrue([
      can(regex("^10\\.", var.vpc_cidr)),
      can(regex("^172\\.(1[6-9]|2[0-9]|3[01])\\.", var.vpc_cidr)),
      can(regex("^192\\.168\\.", var.vpc_cidr)),
    ])
    error_message = "VPC CIDR must be in a private IP range (10.0.0.0/8, 172.16.0.0/12, or 192.168.0.0/16)."
  }
}
```

## Validating Complex Types

Validation works with maps, lists, and objects too.

```hcl
# List validation - ensure all subnets are valid CIDRs
variable "subnet_cidrs" {
  description = "List of CIDR blocks for subnets"
  type        = list(string)

  validation {
    condition     = length(var.subnet_cidrs) > 0
    error_message = "At least one subnet CIDR must be provided."
  }

  validation {
    condition     = alltrue([for cidr in var.subnet_cidrs : can(cidrhost(cidr, 0))])
    error_message = "All subnet CIDRs must be valid CIDR notation."
  }
}

# Map validation - check all values are non-empty
variable "tags" {
  description = "Resource tags"
  type        = map(string)

  validation {
    condition     = alltrue([for k, v in var.tags : length(v) > 0])
    error_message = "All tag values must be non-empty strings."
  }
}

# Object validation
variable "database_config" {
  description = "Database configuration"
  type = object({
    engine         = string
    engine_version = string
    instance_class = string
    storage_gb     = number
    multi_az       = bool
  })

  validation {
    condition     = contains(["postgres", "mysql", "mariadb"], var.database_config.engine)
    error_message = "Database engine must be postgres, mysql, or mariadb."
  }

  validation {
    condition     = var.database_config.storage_gb >= 20 && var.database_config.storage_gb <= 65536
    error_message = "Database storage must be between 20 GB and 65536 GB."
  }

  validation {
    condition     = can(regex("^db\\.", var.database_config.instance_class))
    error_message = "Instance class must start with 'db.' (e.g., db.t3.medium)."
  }
}
```

## Cross-Variable Validation with Preconditions

Variable validation blocks can only reference the variable they are attached to. For validations that involve multiple variables, use `precondition` blocks on resources or data sources.

```hcl
variable "environment" {
  type = string
}

variable "instance_type" {
  type = string
}

variable "multi_az" {
  type = bool
}

# Validate that production environments use appropriate instance sizes
resource "aws_db_instance" "this" {
  identifier     = var.name
  engine         = var.engine
  instance_class = var.instance_type
  multi_az       = var.multi_az

  lifecycle {
    # Production must use multi-AZ
    precondition {
      condition     = var.environment != "production" || var.multi_az == true
      error_message = "Production databases must have multi_az enabled."
    }

    # Production must not use burstable instances
    precondition {
      condition     = var.environment != "production" || !can(regex("^db\\.t[23]\\.", var.instance_type))
      error_message = "Production databases must not use burstable (t2/t3) instance types. Use r6g or m6g series."
    }

    # Verify the database was created successfully
    postcondition {
      condition     = self.status == "available"
      error_message = "Database instance failed to reach available status."
    }
  }
}
```

## Postconditions for Output Verification

Postconditions verify that resources were created correctly.

```hcl
# Verify subnet has expected properties after creation
resource "aws_subnet" "this" {
  vpc_id            = var.vpc_id
  cidr_block        = var.cidr_block
  availability_zone = var.availability_zone

  lifecycle {
    postcondition {
      condition     = self.available_ip_address_count > 0
      error_message = "Subnet has no available IP addresses. Check CIDR sizing."
    }
  }
}

# Verify an ECS service reached steady state
resource "aws_ecs_service" "this" {
  name            = var.name
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count

  lifecycle {
    postcondition {
      condition     = self.desired_count > 0
      error_message = "ECS service desired count must be greater than 0 after creation."
    }
  }
}
```

## Check Blocks for Ongoing Assertions

Terraform 1.5 introduced `check` blocks that run assertions during every plan and apply without affecting resource creation.

```hcl
# Check that the VPC has the expected CIDR
check "vpc_cidr_check" {
  data "aws_vpc" "this" {
    id = aws_vpc.this.id
  }

  assert {
    condition     = data.aws_vpc.this.cidr_block == var.cidr_block
    error_message = "VPC CIDR block does not match the expected value."
  }
}

# Check that DNS resolution is working
check "dns_check" {
  data "dns_a_record_set" "app" {
    host = var.domain_name
  }

  assert {
    condition     = length(data.dns_a_record_set.app.addrs) > 0
    error_message = "DNS record for ${var.domain_name} does not resolve to any IP addresses."
  }
}

# Check that a certificate is not about to expire
check "cert_expiry" {
  data "aws_acm_certificate" "this" {
    domain   = var.domain_name
    statuses = ["ISSUED"]
  }

  assert {
    condition     = timecmp(data.aws_acm_certificate.this.not_after, timeadd(timestamp(), "720h")) > 0
    error_message = "SSL certificate for ${var.domain_name} expires within 30 days."
  }
}
```

## Building a Validation Library

Create a set of common validation patterns that your organization can reuse:

```hcl
# Common validation patterns for AWS resources

# AWS account ID validation
variable "account_id" {
  type = string
  validation {
    condition     = can(regex("^[0-9]{12}$", var.account_id))
    error_message = "AWS account ID must be exactly 12 digits."
  }
}

# AWS region validation
variable "region" {
  type = string
  validation {
    condition     = can(regex("^[a-z]{2}-(north|south|east|west|central|northeast|southeast|northwest|southwest)-[0-9]$", var.region))
    error_message = "Invalid AWS region format."
  }
}

# ARN validation
variable "role_arn" {
  type = string
  validation {
    condition     = can(regex("^arn:aws:iam::[0-9]{12}:role/.+$", var.role_arn))
    error_message = "Must be a valid IAM role ARN."
  }
}

# S3 bucket name validation (AWS naming rules)
variable "bucket_name" {
  type = string
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$", var.bucket_name))
    error_message = "S3 bucket name must be 3-63 characters, lowercase, and follow AWS naming rules."
  }
  validation {
    condition     = !can(regex("\\.\\.|-\\.|\\.-", var.bucket_name))
    error_message = "S3 bucket name must not contain consecutive dots or mixed dots and hyphens."
  }
}

# Email validation
variable "notification_email" {
  type = string
  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.notification_email))
    error_message = "Must be a valid email address."
  }
}

# Port number validation
variable "app_port" {
  type = number
  validation {
    condition     = var.app_port >= 1 && var.app_port <= 65535
    error_message = "Port must be between 1 and 65535."
  }
  validation {
    condition     = var.app_port >= 1024
    error_message = "Application port should be above 1024 (non-privileged)."
  }
}
```

## Testing Validation Rules

Write tests specifically for your validation rules to make sure they catch bad input:

```hcl
# tests/validation.tftest.hcl

# Test that valid input passes
run "valid_input" {
  command = plan

  variables {
    name         = "my-app"
    environment  = "production"
    vpc_cidr     = "10.0.0.0/16"
    instance_count = 3
  }

  # Should succeed without errors
}

# Test that invalid environment is rejected
run "invalid_environment" {
  command = plan

  variables {
    name        = "my-app"
    environment = "invalid"
    vpc_cidr    = "10.0.0.0/16"
  }

  expect_failures = [
    var.environment,
  ]
}

# Test that invalid CIDR is rejected
run "invalid_cidr" {
  command = plan

  variables {
    name        = "my-app"
    environment = "production"
    vpc_cidr    = "not-a-cidr"
  }

  expect_failures = [
    var.vpc_cidr,
  ]
}

# Test that public CIDR is rejected
run "public_cidr_rejected" {
  command = plan

  variables {
    name        = "my-app"
    environment = "production"
    vpc_cidr    = "8.8.8.0/24"
  }

  expect_failures = [
    var.vpc_cidr,
  ]
}
```

## Conclusion

Validation rules transform your Terraform modules from "hope it works" to "guaranteed correct input." Start with variable validation for basic type and format checks, use preconditions for cross-variable business logic, add postconditions to verify resource creation, and leverage check blocks for ongoing assertions. The investment in validation rules pays off every time they catch a misconfiguration before it reaches your infrastructure.

For more on module quality, see our guides on [how to use Terraform module best practices for large organizations](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-module-best-practices-for-large-organizations/view) and [how to handle module errors and debugging in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-module-errors-and-debugging-in-terraform/view).
