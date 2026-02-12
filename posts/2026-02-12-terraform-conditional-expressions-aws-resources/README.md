# How to Use Terraform Conditional Expressions for AWS Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, Infrastructure as Code, DevOps

Description: Master Terraform conditional expressions for AWS resources, including count-based conditionals, for_each patterns, dynamic blocks, and real-world examples.

---

Terraform's conditional expressions let you create flexible infrastructure code that adapts to different environments, requirements, and scenarios. Instead of maintaining separate configurations for staging and production, you write one config that behaves differently based on variables. This is especially powerful when managing AWS resources where environments often share 90% of their configuration but differ in scale, redundancy, or features.

Let's go through the various ways to use conditionals in Terraform, with practical AWS examples for each.

## The Ternary Operator

The most basic conditional in Terraform is the ternary operator: `condition ? true_value : false_value`. It works on any attribute:

```hcl
variable "environment" {
  type    = string
  default = "production"
}

# Different instance sizes per environment
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.environment == "production" ? "m6i.xlarge" : "t3.medium"

  # Enable detailed monitoring only in production
  monitoring = var.environment == "production" ? true : false

  tags = {
    Name        = "app-server"
    Environment = var.environment
  }
}
```

You can nest ternaries, but please don't go more than one level deep - it gets unreadable fast:

```hcl
# One level of nesting is acceptable
instance_type = var.environment == "production" ? "m6i.xlarge" : (
  var.environment == "staging" ? "m6i.large" : "t3.medium"
)
```

## Conditional Resource Creation with Count

The `count` meta-argument combined with a conditional is how you create or skip entire resources:

```hcl
variable "enable_nat_gateway" {
  type    = bool
  default = true
}

variable "create_bastion" {
  type    = bool
  default = false
}

# Only create NAT Gateway when enabled
resource "aws_nat_gateway" "main" {
  count         = var.enable_nat_gateway ? 1 : 0
  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "main-nat-gw"
  }
}

resource "aws_eip" "nat" {
  count  = var.enable_nat_gateway ? 1 : 0
  domain = "vpc"
}

# Bastion host only for non-production environments
resource "aws_instance" "bastion" {
  count         = var.create_bastion ? 1 : 0
  ami           = var.ami_id
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "bastion"
  }
}
```

When referencing a resource that uses count, remember to use the index: `aws_nat_gateway.main[0].id`. If the resource wasn't created, referencing it will fail, so you need another conditional:

```hcl
# Route that conditionally uses the NAT gateway
resource "aws_route" "private_nat" {
  count                  = var.enable_nat_gateway ? 1 : 0
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main[0].id
}
```

## Conditional with for_each

Sometimes `count` isn't enough. When you need conditional creation of resources that also need to be iterated, `for_each` with conditional filtering is the answer:

```hcl
variable "databases" {
  type = map(object({
    engine         = string
    instance_class = string
    enabled        = bool
  }))
  default = {
    users = {
      engine         = "postgres"
      instance_class = "db.r6g.large"
      enabled        = true
    }
    analytics = {
      engine         = "postgres"
      instance_class = "db.r6g.xlarge"
      enabled        = true
    }
    legacy = {
      engine         = "mysql"
      instance_class = "db.t3.medium"
      enabled        = false  # don't create this one
    }
  }
}

# Only create databases where enabled = true
resource "aws_db_instance" "databases" {
  for_each = {
    for name, config in var.databases : name => config
    if config.enabled
  }

  identifier     = each.key
  engine         = each.value.engine
  instance_class = each.value.instance_class
  allocated_storage = 20

  tags = {
    Name = each.key
  }
}
```

The `if config.enabled` filter in the `for` expression means only databases with `enabled = true` get created.

## Dynamic Blocks with Conditionals

Dynamic blocks let you conditionally include configuration blocks within a resource. This is great for optional features:

```hcl
variable "enable_encryption" {
  type    = bool
  default = true
}

variable "enable_logging" {
  type    = bool
  default = true
}

variable "ip_whitelist" {
  type    = list(string)
  default = []
}

resource "aws_s3_bucket" "data" {
  bucket = "my-data-bucket"
}

# Conditionally add server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  count  = var.enable_encryption ? 1 : 0
  bucket = aws_s3_bucket.data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

# Security group with conditional ingress rules
resource "aws_security_group" "app" {
  name_prefix = "app-"
  vpc_id      = var.vpc_id

  # Always allow HTTPS
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Conditionally add IP whitelist rules
  dynamic "ingress" {
    for_each = length(var.ip_whitelist) > 0 ? [1] : []
    content {
      from_port   = 8080
      to_port     = 8080
      protocol    = "tcp"
      cidr_blocks = var.ip_whitelist
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## Conditional Outputs

Outputs can be conditional too. This is useful when a resource might not exist:

```hcl
output "bastion_ip" {
  description = "Public IP of the bastion host"
  value       = var.create_bastion ? aws_instance.bastion[0].public_ip : "N/A"
}

output "nat_gateway_ip" {
  description = "Elastic IP of the NAT gateway"
  value       = var.enable_nat_gateway ? aws_eip.nat[0].public_ip : null
}
```

## Conditional Locals for Cleaner Code

When conditionals get complex, move them into locals. It makes the resource blocks much cleaner:

```hcl
locals {
  # Determine settings based on environment
  is_production = var.environment == "production"

  instance_type = local.is_production ? "m6i.xlarge" : "t3.medium"
  min_size      = local.is_production ? 3 : 1
  max_size      = local.is_production ? 10 : 3

  # Multi-AZ only in production
  az_count = local.is_production ? 3 : 1

  # Build a list of subnets based on AZ count
  selected_subnets = slice(var.subnet_ids, 0, local.az_count)

  # Merge default tags with environment-specific tags
  common_tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  extra_tags = local.is_production ? {
    CostCenter = "production-infra"
    OnCall     = "platform-team"
  } : {}

  all_tags = merge(local.common_tags, local.extra_tags)
}

resource "aws_autoscaling_group" "app" {
  name                = "app-asg"
  min_size            = local.min_size
  max_size            = local.max_size
  vpc_zone_identifier = local.selected_subnets

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  dynamic "tag" {
    for_each = local.all_tags
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }
}
```

## Conditional Module Calls

You can conditionally include entire modules:

```hcl
# Only create monitoring stack in production
module "monitoring" {
  count  = var.environment == "production" ? 1 : 0
  source = "./modules/monitoring"

  cluster_name = var.cluster_name
  alarm_topic  = aws_sns_topic.alerts.arn
}

# WAF only for production
module "waf" {
  count  = var.environment == "production" ? 1 : 0
  source = "./modules/waf"

  alb_arn = aws_lb.main.arn
}
```

## The try() and coalesce() Functions

These functions act as fallbacks and work well with conditionals:

```hcl
locals {
  # Use try() for nested lookups that might not exist
  db_config = try(var.environment_configs[var.environment].database, {
    instance_class = "db.t3.medium"
    storage        = 20
  })

  # Use coalesce() to pick the first non-null value
  alarm_topic = coalesce(
    var.custom_alarm_topic_arn,
    try(module.monitoring[0].alarm_topic_arn, null),
    aws_sns_topic.default_alerts.arn
  )
}
```

## Practical Example: Multi-Environment VPC

Here's a complete example that ties everything together - a VPC module that adapts to the environment:

```hcl
locals {
  is_prod = var.environment == "production"

  config = {
    nat_gateways = local.is_prod ? length(var.azs) : 1
    vpc_flow_logs = local.is_prod
    private_subnets = local.is_prod ? length(var.azs) : 2
  }
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.environment}-vpc"
    Environment = var.environment
  }
}

# One NAT gateway per AZ in production, just one in other environments
resource "aws_nat_gateway" "main" {
  count         = local.config.nat_gateways
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
}

# VPC flow logs only in production
resource "aws_flow_log" "main" {
  count                = local.config.vpc_flow_logs ? 1 : 0
  vpc_id               = aws_vpc.main.id
  traffic_type         = "ALL"
  log_destination      = aws_cloudwatch_log_group.flow_logs[0].arn
  log_destination_type = "cloud-watch-logs"
  iam_role_arn         = aws_iam_role.flow_logs[0].arn
}
```

## Summary

Terraform conditionals keep your infrastructure code DRY (Don't Repeat Yourself). Instead of maintaining separate files for each environment, you write one configuration that adapts. The key patterns are: ternary operators for attribute values, `count` for resource creation, `for_each` with filtering for collections, and `dynamic` blocks for optional configuration sections. Move complex logic into `locals` to keep resource blocks readable, and you'll have infrastructure code that's both flexible and maintainable.
