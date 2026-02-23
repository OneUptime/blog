# How to Use Custom Condition Checks in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Validation, Conditions, Infrastructure as Code, DevOps

Description: Learn how to implement custom condition checks in Terraform using variable validation, preconditions, postconditions, and check blocks to catch misconfigurations early.

---

Terraform configurations can fail in subtle ways. You might pass an invalid CIDR block, reference a nonexistent AMI, or deploy a database with insufficient storage for your workload. These problems are often caught late - during apply or even after deployment. Custom condition checks let you catch them early, with clear error messages that tell the operator exactly what went wrong.

Terraform provides four mechanisms for custom conditions: variable validation rules, preconditions, postconditions, and check blocks. Each serves a different purpose and runs at a different point in the workflow. Understanding when to use each one is the key to building robust configurations.

## Variable Validation Rules

Variable validation is the first line of defense. It runs during `terraform plan` and catches invalid inputs before Terraform even considers what resources to create.

```hcl
variable "environment" {
  description = "Deployment environment"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, production."
  }
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string

  validation {
    # Ensure only approved instance families are used
    condition     = can(regex("^(t3|t3a|m5|m5a|c5|r5)\\.", var.instance_type))
    error_message = "Instance type must be from an approved family: t3, t3a, m5, m5a, c5, or r5."
  }
}
```

### Multiple Validation Rules

You can define multiple validation blocks on a single variable. Each one is checked independently.

```hcl
variable "cidr_block" {
  description = "VPC CIDR block"
  type        = string

  validation {
    # Check that it is a valid CIDR notation
    condition     = can(cidrhost(var.cidr_block, 0))
    error_message = "Must be a valid CIDR block (e.g., 10.0.0.0/16)."
  }

  validation {
    # Enforce minimum network size
    condition     = tonumber(split("/", var.cidr_block)[1]) <= 20
    error_message = "CIDR block must be /20 or larger for production VPCs."
  }

  validation {
    # Only allow RFC 1918 private ranges
    condition = anytrue([
      can(cidrsubnet("10.0.0.0/8", 0, 0)) && startswith(var.cidr_block, "10."),
      can(cidrsubnet("172.16.0.0/12", 0, 0)) && startswith(var.cidr_block, "172."),
      can(cidrsubnet("192.168.0.0/16", 0, 0)) && startswith(var.cidr_block, "192.168."),
    ])
    error_message = "CIDR block must be in a private IP range (10.x, 172.16-31.x, or 192.168.x)."
  }
}
```

### Using can() for Safe Type Checking

The `can()` function is invaluable for validation. It evaluates an expression and returns `true` if the expression succeeds, `false` if it produces an error.

```hcl
variable "port" {
  description = "Application port number"
  type        = number

  validation {
    condition     = var.port >= 1 && var.port <= 65535
    error_message = "Port must be between 1 and 65535."
  }

  validation {
    condition     = var.port > 1023
    error_message = "Port must be above 1023 to avoid privileged ports."
  }
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)

  validation {
    condition     = length(var.tags) > 0
    error_message = "At least one tag must be provided."
  }

  validation {
    condition     = contains(keys(var.tags), "Owner")
    error_message = "Tags must include an 'Owner' key."
  }
}
```

## Preconditions

Preconditions run after variables are resolved but before the resource is created or updated. They can reference other resources, data sources, and locals - things that are not available during variable validation.

```hcl
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  subnet_id     = var.subnet_id

  lifecycle {
    precondition {
      # Verify the AMI is not too old
      condition     = timecmp(data.aws_ami.ubuntu.creation_date, timeadd(timestamp(), "-720h")) > 0
      error_message = "The selected AMI is more than 30 days old. Please update the AMI filter."
    }

    precondition {
      # Verify subnet is in the expected VPC
      condition     = data.aws_subnet.selected.vpc_id == var.vpc_id
      error_message = "The selected subnet does not belong to the expected VPC."
    }
  }
}
```

### Preconditions on Data Sources

Data sources can also have preconditions. This is useful for validating assumptions about existing infrastructure.

```hcl
data "aws_subnet" "app" {
  id = var.subnet_id

  lifecycle {
    precondition {
      condition     = self.available_ip_address_count > 10
      error_message = "Subnet ${var.subnet_id} has fewer than 10 available IPs. Choose a different subnet."
    }
  }
}
```

## Postconditions

Postconditions verify the actual state of a resource after it has been created. They catch problems that only become apparent after provisioning.

```hcl
resource "aws_db_instance" "main" {
  identifier     = "app-database"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"
  allocated_storage = 100
  db_name        = "appdb"
  username       = var.db_username
  password       = var.db_password
  skip_final_snapshot = true

  lifecycle {
    postcondition {
      # Verify the database endpoint is accessible
      condition     = self.endpoint != ""
      error_message = "Database was created but no endpoint was assigned."
    }

    postcondition {
      # Verify storage encryption was applied
      condition     = self.storage_encrypted == true
      error_message = "Database storage encryption was not enabled. Check the instance configuration."
    }
  }
}
```

### Postconditions on Output Values

Module outputs can also have postconditions, which are useful for validating the interface between modules.

```hcl
output "database_endpoint" {
  description = "The database connection endpoint"
  value       = aws_db_instance.main.endpoint

  precondition {
    condition     = aws_db_instance.main.status == "available"
    error_message = "Database is not in 'available' state."
  }
}
```

## Check Blocks

Check blocks are different from the others. They run after apply and produce warnings, not errors. They do not block the deployment. This makes them ideal for operational checks that you want visibility into but that should not prevent deployment.

```hcl
check "website_health" {
  data "http" "app_health" {
    url = "https://${aws_lb.main.dns_name}/health"
  }

  assert {
    condition     = data.http.app_health.status_code == 200
    error_message = "Application health check failed after deployment."
  }
}

check "certificate_expiry" {
  data "aws_acm_certificate" "app" {
    domain   = "app.example.com"
    statuses = ["ISSUED"]
  }

  assert {
    condition     = timecmp(data.aws_acm_certificate.app.not_after, timeadd(timestamp(), "720h")) > 0
    error_message = "SSL certificate expires within 30 days. Please renew."
  }
}
```

## Choosing the Right Condition Type

Here is a quick decision guide:

| Condition Type | When It Runs | Fails On | Use For |
|---|---|---|---|
| Variable validation | Plan (early) | Error | Input format and value constraints |
| Precondition | Plan (after data) | Error | Assumptions about existing infrastructure |
| Postcondition | Apply | Error | Verifying resource state after creation |
| Check block | Apply | Warning | Operational health checks |

## Advanced Patterns

### Cross-Resource Validation

Preconditions can validate relationships between resources.

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type
  subnet_id     = aws_subnet.app.id

  lifecycle {
    precondition {
      # Make sure the security group and instance are in the same VPC
      condition     = aws_security_group.app.vpc_id == aws_subnet.app.vpc_id
      error_message = "Security group and subnet must be in the same VPC."
    }
  }
}
```

### Conditional Validation Based on Environment

```hcl
variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number

  validation {
    condition     = var.backup_retention_days >= 1 && var.backup_retention_days <= 35
    error_message = "Backup retention must be between 1 and 35 days."
  }
}

resource "aws_db_instance" "main" {
  # ... configuration ...
  backup_retention_period = var.backup_retention_days

  lifecycle {
    precondition {
      # Production databases need at least 7 days of backup retention
      condition     = var.environment != "production" || var.backup_retention_days >= 7
      error_message = "Production databases require at least 7 days of backup retention."
    }
  }
}
```

### Validating Complex Objects

```hcl
variable "alb_rules" {
  description = "ALB listener rules"
  type = list(object({
    priority  = number
    path      = string
    target_group_arn = string
  }))

  validation {
    # Ensure all priorities are unique
    condition     = length(var.alb_rules) == length(distinct([for r in var.alb_rules : r.priority]))
    error_message = "All ALB rule priorities must be unique."
  }

  validation {
    # Ensure priorities are in valid range
    condition     = alltrue([for r in var.alb_rules : r.priority >= 1 && r.priority <= 50000])
    error_message = "ALB rule priorities must be between 1 and 50000."
  }
}
```

## Error Message Best Practices

Good error messages make the difference between a helpful validation and a frustrating one. Follow these guidelines:

1. **State what is wrong**, not just what the constraint is.
2. **Include the invalid value** when possible (using variable references).
3. **Suggest a fix** or provide valid examples.

```hcl
variable "region" {
  type = string

  validation {
    condition     = can(regex("^(us|eu|ap)-(east|west|central|south|north|southeast|northeast)-[1-3]$", var.region))
    error_message = "Invalid AWS region '${var.region}'. Expected format: us-east-1, eu-west-2, ap-southeast-1, etc."
  }
}
```

## Summary

Custom condition checks are one of Terraform's most powerful features for building reliable infrastructure. Variable validations catch bad inputs early. Preconditions validate assumptions before resources are created. Postconditions verify the results after creation. And check blocks provide ongoing operational visibility without blocking deployments.

Use all four in combination to create configurations that fail early, fail clearly, and give operators the information they need to fix problems quickly. For related topics, see our posts on [Terraform preconditions](https://oneuptime.com/blog/post/2026-01-30-terraform-preconditions/view) and [Terraform check blocks](https://oneuptime.com/blog/post/2026-01-30-terraform-check-blocks/view).
