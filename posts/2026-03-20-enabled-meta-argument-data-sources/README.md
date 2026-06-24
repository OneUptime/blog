# How to Use the enabled Meta-Argument with Data Sources in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Data Source, Enabled, Count, Conditional, HCL, Infrastructure as Code

Description: Learn how to conditionally enable or disable data sources in OpenTofu using the count trick and the enabled pattern for conditional data source evaluation.

---

OpenTofu supports an `enabled` meta-argument for data sources inside a `lifecycle` block. In OpenTofu v1.11 and later, this is the cleanest way to conditionally include or skip a single data source. `count` and `for_each` are still useful when you need indexed or keyed instances.

---

## The count = 0/1 Pattern

If you need indexed instances, or you're working with an older configuration, set `count` to `1` to include the data source, or `0` to skip it entirely:

```hcl
variable "use_existing_vpc" {
  type    = bool
  default = false
}

# Only query the VPC if use_existing_vpc is true

data "aws_vpc" "existing" {
  count = var.use_existing_vpc ? 1 : 0

  tags = {
    Name = "existing-vpc"
  }
}

# Pick between the existing VPC or a new one
locals {
  vpc_id = var.use_existing_vpc ? data.aws_vpc.existing[0].id : aws_vpc.new.id
}
```

---

## Conditional Secret Lookup

```hcl
variable "environment" {
  type    = string
  default = "development"
}

# Only read production secrets when in production
data "aws_secretsmanager_secret_version" "prod_db" {
  secret_id = "production/database/password"

  lifecycle {
    enabled = var.environment == "production"
  }
}

locals {
  db_password = data.aws_secretsmanager_secret_version.prod_db != null ? (
    jsondecode(data.aws_secretsmanager_secret_version.prod_db.secret_string)["password"]
  ) : var.dev_db_password
}
```

---

## Conditionally Reading Certificates

```hcl
variable "enable_https" {
  type    = bool
  default = true
}

# Only look up the ACM certificate if HTTPS is enabled
data "aws_acm_certificate" "app" {
  domain      = "app.example.com"
  statuses    = ["ISSUED"]
  most_recent = true

  lifecycle {
    enabled = var.enable_https
  }
}

resource "aws_lb_listener" "https" {
  count = var.enable_https ? 1 : 0

  load_balancer_arn = aws_lb.app.arn
  port              = 443
  protocol          = "HTTPS"
  certificate_arn   = data.aws_acm_certificate.app != null ? data.aws_acm_certificate.app.arn : null

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
```

---

## Accessing Results Safely

When using `enabled`, a disabled data source evaluates to `null`. When using `count`, you still need the `[0]` index. Use a conditional expression or `try()` to guard the reference:

```hcl
variable "use_existing_key" {
  type    = bool
  default = false
}

data "aws_key_pair" "existing" {
  key_name = "my-existing-key"

  lifecycle {
    enabled = var.use_existing_key
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"

  # Use try() to safely access the optional data source result
  key_name = try(data.aws_key_pair.existing.key_name, null)
}
```

---

## Using for_each as an Enable/Disable Pattern

An alternative to `count` that's clearer for some use cases:

```hcl
variable "enable_az_lookup" {
  type    = bool
  default = true
}

# Create a named optional data source instance
data "aws_availability_zones" "available" {
  for_each = var.enable_az_lookup ? toset(["main"]) : toset([])

  state = "available"
}

locals {
  availability_zone_names = var.enable_az_lookup ? data.aws_availability_zones.available["main"].names : []
}
```

---

## Pattern Summary

| Pattern | Use When |
|---|---|
| `lifecycle { enabled = var.enabled }` | Single optional data source in OpenTofu v1.11+ |
| `count = var.enabled ? 1 : 0` | Older configurations or indexed optional data sources |
| `for_each = var.enabled ? toset(["main"]) : toset([])` | Named optional data source |

---

## Summary

OpenTofu data sources support `enabled`, `count`, and `for_each` meta-arguments for conditional evaluation. In OpenTofu v1.11 and later, `lifecycle { enabled = condition }` is the standard way to make a single data source optional. Use `count` or `for_each` when you need indexed or keyed instances, and guard optional references with a conditional expression or `try()` to handle disabled data sources safely.
