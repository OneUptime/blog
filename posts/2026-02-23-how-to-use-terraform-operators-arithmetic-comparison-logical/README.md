# How to Use Terraform Operators (Arithmetic Comparison Logical)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Infrastructure as Code, Operators, Expressions

Description: Learn how to use arithmetic, comparison, and logical operators in Terraform to build dynamic infrastructure configurations with calculated values and conditional logic.

---

Terraform supports three categories of operators: arithmetic for calculations, comparison for evaluating conditions, and logical for combining boolean expressions. While they are straightforward if you have any programming background, there are some Terraform-specific behaviors worth knowing about.

Let's go through each category with practical infrastructure examples.

## Arithmetic Operators

Terraform supports the standard math operators:

| Operator | Operation | Example | Result |
|----------|-----------|---------|--------|
| `+` | Addition | `5 + 3` | `8` |
| `-` | Subtraction | `10 - 4` | `6` |
| `*` | Multiplication | `3 * 7` | `21` |
| `/` | Division | `15 / 4` | `3.75` |
| `%` | Modulo (remainder) | `17 % 5` | `2` |
| `-` (unary) | Negation | `-(5)` | `-5` |

### Practical Examples

```hcl
variable "base_port" {
  type    = number
  default = 8080
}

variable "instance_count" {
  type    = number
  default = 3
}

variable "vpc_cidr_prefix" {
  type    = number
  default = 16
}

locals {
  # Calculate ports for multiple services
  api_port    = var.base_port         # 8080
  admin_port  = var.base_port + 1     # 8081
  metrics_port = var.base_port + 2    # 8082

  # Calculate capacity
  max_instances  = var.instance_count * 3     # 9
  total_vcpus    = var.instance_count * 2     # 6 (assuming 2 vCPUs each)

  # Calculate CIDR subnets
  # A /16 VPC split into /24 subnets gives 256 subnets
  available_subnets = pow(2, 24 - var.vpc_cidr_prefix)  # 256

  # Modulo for round-robin distribution
  az_index = var.instance_count % 3  # Distributes across 3 AZs
}
```

### CIDR Calculations

Terraform has built-in functions for CIDR math, but sometimes you need arithmetic too:

```hcl
variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

locals {
  # Calculate how many /24 subnets we need
  # 3 AZs * 3 tiers (public, private, database) = 9 subnets
  az_count     = 3
  tier_count   = 3
  total_subnets = local.az_count * local.tier_count  # 9
}

# Create subnets using arithmetic for CIDR offsets
resource "aws_subnet" "public" {
  count = local.az_count

  vpc_id     = aws_vpc.main.id
  # Public subnets: 10.0.0.0/24, 10.0.1.0/24, 10.0.2.0/24
  cidr_block = cidrsubnet(var.vpc_cidr, 8, count.index)

  tags = {
    Name = "public-${count.index}"
    Tier = "public"
  }
}

resource "aws_subnet" "private" {
  count = local.az_count

  vpc_id     = aws_vpc.main.id
  # Private subnets: 10.0.10.0/24, 10.0.11.0/24, 10.0.12.0/24
  # Offset by 10 to leave room for public subnets
  cidr_block = cidrsubnet(var.vpc_cidr, 8, count.index + 10)

  tags = {
    Name = "private-${count.index}"
    Tier = "private"
  }
}
```

### Division Behavior

Division in Terraform always produces a floating-point result:

```hcl
locals {
  # Integer division still gives float
  result1 = 10 / 3    # 3.3333333333333335
  result2 = 15 / 5    # 3 (but internally it is 3.0)

  # If you need integer division, use floor()
  integer_div = floor(10 / 3)  # 3

  # Ceiling division (round up)
  ceil_div = ceil(10 / 3)  # 4

  # Practical use: calculate number of batches
  items_per_batch = 25
  total_items     = 100
  num_batches     = ceil(local.total_items / local.items_per_batch)  # 4
}
```

## Comparison Operators

Comparison operators return boolean values (`true` or `false`):

| Operator | Meaning | Example | Result |
|----------|---------|---------|--------|
| `==` | Equal | `5 == 5` | `true` |
| `!=` | Not equal | `5 != 3` | `true` |
| `<` | Less than | `3 < 5` | `true` |
| `>` | Greater than | `5 > 3` | `true` |
| `<=` | Less than or equal | `5 <= 5` | `true` |
| `>=` | Greater than or equal | `3 >= 5` | `false` |

### String Comparison

```hcl
variable "environment" {
  type = string
}

locals {
  # Exact string comparison
  is_production = var.environment == "production"
  is_not_dev    = var.environment != "development"

  # String comparison is case-sensitive
  check1 = "Hello" == "hello"   # false
  check2 = "Hello" == "Hello"   # true
}
```

### Using Comparisons for Conditional Resources

```hcl
variable "environment" {
  type = string
}

variable "instance_count" {
  type    = number
  default = 1
}

# Only create monitoring in production
resource "aws_cloudwatch_metric_alarm" "cpu" {
  count = var.environment == "production" ? 1 : 0

  alarm_name          = "high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
}

# Choose instance type based on environment
locals {
  instance_type = var.environment == "production" ? "t3.large" : (
    var.environment == "staging" ? "t3.small" : "t3.micro"
  )
}
```

### Numeric Comparisons for Validation

```hcl
variable "replica_count" {
  type = number

  validation {
    condition     = var.replica_count >= 1 && var.replica_count <= 10
    error_message = "Replica count must be between 1 and 10."
  }
}

variable "volume_size" {
  type = number

  validation {
    condition     = var.volume_size >= 20 && var.volume_size <= 16384
    error_message = "Volume size must be between 20 GB and 16384 GB."
  }
}
```

## Logical Operators

Logical operators work with boolean values:

| Operator | Meaning | Example | Result |
|----------|---------|---------|--------|
| `&&` | AND | `true && false` | `false` |
| `\|\|` | OR | `true \|\| false` | `true` |
| `!` | NOT | `!true` | `false` |

### Combining Conditions

```hcl
variable "environment" {
  type = string
}

variable "enable_monitoring" {
  type    = bool
  default = true
}

variable "instance_count" {
  type    = number
  default = 1
}

locals {
  # AND - both conditions must be true
  create_alarm = var.environment == "production" && var.enable_monitoring

  # OR - at least one condition must be true
  needs_load_balancer = var.instance_count > 1 || var.environment == "production"

  # NOT - invert a condition
  is_ephemeral = !(var.environment == "production" || var.environment == "staging")

  # Complex combinations
  full_monitoring = (
    var.environment == "production" &&
    var.enable_monitoring &&
    var.instance_count >= 3
  )
}
```

### Practical Example: Feature Flags

```hcl
variable "features" {
  type = object({
    enable_cdn       = bool
    enable_waf       = bool
    enable_backups   = bool
    enable_encryption = bool
  })
  default = {
    enable_cdn        = false
    enable_waf        = false
    enable_backups    = true
    enable_encryption = true
  }
}

# CDN requires WAF in production
locals {
  create_cdn = var.features.enable_cdn && (
    var.environment != "production" || var.features.enable_waf
  )
}

# Create CDN only if conditions are met
resource "aws_cloudfront_distribution" "app" {
  count = local.create_cdn ? 1 : 0

  enabled = true
  # ... distribution config
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "app"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
  }

  origin {
    domain_name = aws_lb.app.dns_name
    origin_id   = "app"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
```

## Operator Precedence

Terraform follows standard operator precedence:

1. `!`, `-` (unary negation) - highest
2. `*`, `/`, `%`
3. `+`, `-`
4. `>`, `>=`, `<`, `<=`
5. `==`, `!=`
6. `&&`
7. `||` - lowest

When in doubt, use parentheses:

```hcl
locals {
  # Without parentheses - && binds tighter than ||
  result1 = true || false && false   # true (false && false = false, true || false = true)

  # With parentheses - clear intent
  result2 = (true || false) && false  # false
  result3 = true || (false && false)  # true
}
```

## Operators in Common Patterns

### Dynamic Sizing

```hcl
variable "environment" {
  type = string
}

locals {
  env_multiplier = var.environment == "production" ? 3 : 1

  config = {
    instance_count  = 2 * local.env_multiplier     # prod: 6, non-prod: 2
    volume_size     = 50 * local.env_multiplier     # prod: 150, non-prod: 50
    retention_days  = 30 * local.env_multiplier     # prod: 90, non-prod: 30
    max_connections = 100 * local.env_multiplier    # prod: 300, non-prod: 100
  }
}
```

### Validation with Multiple Operators

```hcl
variable "config" {
  type = object({
    min_size     = number
    max_size     = number
    desired_size = number
  })

  validation {
    condition = (
      var.config.min_size >= 0 &&
      var.config.max_size >= var.config.min_size &&
      var.config.desired_size >= var.config.min_size &&
      var.config.desired_size <= var.config.max_size
    )
    error_message = "Desired size must be between min_size and max_size, and min_size must not exceed max_size."
  }
}
```

## Summary

Terraform's operators cover the three essential categories: arithmetic (`+`, `-`, `*`, `/`, `%`) for calculations, comparison (`==`, `!=`, `<`, `>`, `<=`, `>=`) for conditions, and logical (`&&`, `||`, `!`) for combining boolean expressions. Use them in locals for calculated values, in conditional expressions for dynamic configuration, and in validation blocks for input checking. When combining multiple operators, use parentheses to make the precedence explicit and your code readable.
