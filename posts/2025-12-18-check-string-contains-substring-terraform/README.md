# How to Check if String Contains Substring in Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, DevOps, String Functions, HCL

Description: Learn how to check if a string contains a substring in Terraform using various functions. This guide covers strcontains, regex, and creative workarounds for different Terraform versions and use cases.

String manipulation is a common requirement in Terraform configurations. Whether you're parsing resource names, validating inputs, or conditionally creating resources based on string content, knowing how to check for substrings is essential. Let's explore the different methods available.

## Method 1: strcontains Function (Terraform 1.5+)

The `strcontains` function was introduced in Terraform 1.5 and is the most straightforward approach.

```hcl
# Basic usage
locals {
  environment_name = "production-us-east-1"

  is_production = strcontains(local.environment_name, "production")
  is_staging    = strcontains(local.environment_name, "staging")
  is_us_region  = strcontains(local.environment_name, "us-")
}

output "checks" {
  value = {
    is_production = local.is_production  # true
    is_staging    = local.is_staging     # false
    is_us_region  = local.is_us_region   # true
  }
}
```

### Practical Examples

```hcl
variable "instance_name" {
  type        = string
  description = "Name of the EC2 instance"
}

variable "ami_id" {
  type        = string
  description = "AMI ID to use"
}

locals {
  # Determine instance characteristics from name
  is_web_server     = strcontains(var.instance_name, "web")
  is_api_server     = strcontains(var.instance_name, "api")
  is_database       = strcontains(var.instance_name, "db")
  is_production     = strcontains(var.instance_name, "prod")
  is_gpu_instance   = strcontains(var.ami_id, "gpu") || strcontains(var.ami_id, "nvidia")

  # Set instance type based on role
  instance_type = local.is_database ? "r5.large" : (
    local.is_web_server ? "t3.medium" : "t3.small"
  )

  # Enable enhanced monitoring for production
  enable_monitoring = local.is_production
}

resource "aws_instance" "main" {
  ami           = var.ami_id
  instance_type = local.instance_type

  monitoring = local.enable_monitoring

  tags = {
    Name        = var.instance_name
    Role        = local.is_web_server ? "web" : (local.is_api_server ? "api" : "other")
    Environment = local.is_production ? "production" : "non-production"
  }
}
```

## Method 2: Using regex Function

For Terraform versions before 1.5, or when you need pattern matching, use `regex` with `can`.

```hcl
locals {
  url = "https://api.example.com/v2/users"

  # Check if string contains substring using regex
  contains_https = can(regex("https", local.url))
  contains_api   = can(regex("api", local.url))
  is_v2_api      = can(regex("/v2/", local.url))

  # Case-insensitive check
  contains_example_ci = can(regex("(?i)example", local.url))
}

output "url_checks" {
  value = {
    has_https  = local.contains_https  # true
    has_api    = local.contains_api    # true
    is_v2      = local.is_v2_api       # true
  }
}
```

### Using regexall for Multiple Matches

```hcl
locals {
  log_message = "ERROR: Connection failed. ERROR: Timeout. WARNING: Retry attempted."

  # Count occurrences
  error_count   = length(regexall("ERROR", local.log_message))
  warning_count = length(regexall("WARNING", local.log_message))

  # Check if contains at least one
  has_errors   = local.error_count > 0
  has_warnings = local.warning_count > 0
}

output "log_analysis" {
  value = {
    error_count   = local.error_count    # 2
    warning_count = local.warning_count  # 1
    has_errors    = local.has_errors     # true
    has_warnings  = local.has_warnings   # true
  }
}
```

## Method 3: Using replace Function

A creative workaround using `replace` to detect substrings.

```hcl
locals {
  text = "Hello World"

  # If substring exists, replace changes the string
  # If strings are different, substring was found
  contains_world = local.text != replace(local.text, "World", "")
  contains_foo   = local.text != replace(local.text, "foo", "")
}

output "replace_checks" {
  value = {
    has_world = local.contains_world  # true
    has_foo   = local.contains_foo    # false
  }
}
```

## Method 4: Using split Function

Check substring by seeing if split produces multiple parts.

```hcl
locals {
  filepath = "/var/log/application/error.log"

  # Split by substring - if length > 1, substring exists
  contains_log = length(split("/log/", local.filepath)) > 1
  contains_tmp = length(split("/tmp/", local.filepath)) > 1
}

output "split_checks" {
  value = {
    has_log = local.contains_log  # true
    has_tmp = local.contains_tmp  # false
  }
}
```

## Conditional Resource Creation

Use substring checks to conditionally create resources.

```hcl
variable "server_name" {
  type = string
}

locals {
  is_production = strcontains(var.server_name, "prod")
  is_database   = strcontains(var.server_name, "db") || strcontains(var.server_name, "database")
  is_cache      = strcontains(var.server_name, "cache") || strcontains(var.server_name, "redis")
}

# Only create backup for production databases
resource "aws_backup_plan" "database" {
  count = local.is_production && local.is_database ? 1 : 0

  name = "${var.server_name}-backup-plan"

  rule {
    rule_name         = "daily-backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 5 ? * * *)"

    lifecycle {
      delete_after = 30
    }
  }
}

# Only create ElastiCache alarm for cache servers
resource "aws_cloudwatch_metric_alarm" "cache_memory" {
  count = local.is_cache ? 1 : 0

  alarm_name          = "${var.server_name}-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 80
}
```

## Validating Input Variables

Use substring checks in variable validation.

```hcl
variable "environment" {
  type        = string
  description = "Environment name (must contain 'dev', 'staging', or 'prod')"

  validation {
    condition = (
      strcontains(var.environment, "dev") ||
      strcontains(var.environment, "staging") ||
      strcontains(var.environment, "prod")
    )
    error_message = "Environment must contain 'dev', 'staging', or 'prod'."
  }
}

variable "bucket_name" {
  type        = string
  description = "S3 bucket name"

  validation {
    condition     = !strcontains(var.bucket_name, "_")
    error_message = "S3 bucket names cannot contain underscores."
  }

  validation {
    condition     = !strcontains(var.bucket_name, "..")
    error_message = "S3 bucket names cannot contain consecutive periods."
  }
}

variable "database_endpoint" {
  type        = string
  description = "Database endpoint URL"

  validation {
    condition     = strcontains(var.database_endpoint, "rds.amazonaws.com")
    error_message = "Database endpoint must be an RDS endpoint."
  }
}
```

## Processing Lists with Substring Checks

```hcl
variable "server_names" {
  type    = list(string)
  default = [
    "web-prod-1",
    "web-prod-2",
    "api-prod-1",
    "web-staging-1",
    "db-prod-1"
  ]
}

locals {
  # Filter servers by substring
  production_servers = [
    for name in var.server_names : name
    if strcontains(name, "prod")
  ]

  web_servers = [
    for name in var.server_names : name
    if strcontains(name, "web")
  ]

  # Create map of server types
  server_types = {
    for name in var.server_names : name => (
      strcontains(name, "web") ? "web" : (
        strcontains(name, "api") ? "api" : (
          strcontains(name, "db") ? "database" : "other"
        )
      )
    )
  }
}

output "filtered_servers" {
  value = {
    production = local.production_servers
    web        = local.web_servers
    types      = local.server_types
  }
}
```

## Working with Tags

```hcl
variable "tags" {
  type = map(string)
  default = {
    Name        = "my-application-prod"
    Environment = "production"
    Team        = "platform-engineering"
  }
}

locals {
  # Check tag values
  is_prod_by_name = strcontains(lookup(var.tags, "Name", ""), "prod")
  is_platform_team = strcontains(lookup(var.tags, "Team", ""), "platform")

  # Add tags based on checks
  enhanced_tags = merge(var.tags, {
    Monitoring = local.is_prod_by_name ? "enhanced" : "basic"
    CostCenter = local.is_platform_team ? "platform" : "general"
  })
}

resource "aws_instance" "main" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = local.enhanced_tags
}
```

## Creating a Reusable Function

```hcl
# Using locals to create reusable check patterns
locals {
  # Helper function via locals
  environment_checks = {
    for env in ["dev", "staging", "prod"] : env => strcontains(var.environment, env)
  }

  # Complex check helper
  name_analysis = {
    original    = var.resource_name
    has_prefix  = strcontains(var.resource_name, var.name_prefix)
    has_suffix  = strcontains(var.resource_name, var.name_suffix)
    is_valid    = strcontains(var.resource_name, var.name_prefix) && strcontains(var.resource_name, var.name_suffix)
  }
}

variable "environment" {
  type    = string
  default = "production-us-east-1"
}

variable "resource_name" {
  type    = string
  default = "app-myservice-prod"
}

variable "name_prefix" {
  type    = string
  default = "app-"
}

variable "name_suffix" {
  type    = string
  default = "-prod"
}

output "analysis" {
  value = {
    environment_checks = local.environment_checks
    name_analysis      = local.name_analysis
  }
}
```

## Best Practices

1. **Use strcontains for simple checks** - It's the most readable option in Terraform 1.5+
2. **Use regex for patterns** - When you need wildcards or complex matching
3. **Combine with can()** - Makes regex checks safe (won't error on no match)
4. **Use in validation** - Catch invalid inputs early
5. **Document your checks** - Add comments explaining the business logic
6. **Test edge cases** - Empty strings, case sensitivity, special characters

By mastering these string checking techniques, you can create more dynamic and intelligent Terraform configurations that adapt based on naming conventions and string patterns.
