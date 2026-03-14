# How to Use the for_each Meta-Argument with Maps in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, For_each, Maps, Infrastructure as Code

Description: Learn how to use the Terraform for_each meta-argument with maps to create multiple resources with stable identifiers, including patterns for maps of strings, maps of objects.

---

The `for_each` meta-argument with maps is the preferred way to create multiple resources in Terraform. Each map key becomes a stable identifier for the resource instance, which means adding or removing entries only affects the specific resources involved - unlike `count`, where index shifts can trigger unnecessary recreations.

This post covers `for_each` with maps from basic usage to advanced patterns.

## Basic Map Usage

Pass a map directly to `for_each`:

```hcl
resource "aws_s3_bucket" "this" {
  for_each = {
    data    = "Data storage bucket"
    logs    = "Application logs"
    backups = "Database backups"
  }

  bucket = "${var.project}-${var.environment}-${each.key}"

  tags = {
    Name        = each.key
    Description = each.value
  }
}
```

Inside the resource block, `each.key` gives you the map key and `each.value` gives you the corresponding value. This creates:

- `aws_s3_bucket.this["data"]`
- `aws_s3_bucket.this["logs"]`
- `aws_s3_bucket.this["backups"]`

## Map of Strings

The simplest map pattern maps names to a single property:

```hcl
variable "iam_users" {
  type = map(string)
  default = {
    alice   = "engineering"
    bob     = "platform"
    charlie = "security"
    diana   = "engineering"
  }
}

resource "aws_iam_user" "this" {
  for_each = var.iam_users

  name = each.key

  tags = {
    Team = each.value
  }
}
```

If you remove "bob" from the map, Terraform only destroys Bob's user. Alice, Charlie, and Diana are unaffected because their keys have not changed.

## Map of Objects

For resources with multiple configurable attributes, use a map of objects:

```hcl
variable "instances" {
  type = map(object({
    instance_type = string
    subnet_id     = string
    volume_size   = number
    public        = bool
  }))
}

resource "aws_instance" "this" {
  for_each = var.instances

  ami                         = var.ami_id
  instance_type               = each.value.instance_type
  subnet_id                   = each.value.subnet_id
  associate_public_ip_address = each.value.public

  root_block_device {
    volume_size = each.value.volume_size
    volume_type = "gp3"
  }

  tags = {
    Name = "${var.project}-${each.key}"
  }
}
```

Usage:

```hcl
instances = {
  web = {
    instance_type = "t3.small"
    subnet_id     = "subnet-abc123"
    volume_size   = 30
    public        = true
  }
  api = {
    instance_type = "t3.medium"
    subnet_id     = "subnet-def456"
    volume_size   = 50
    public        = false
  }
  worker = {
    instance_type = "c5.large"
    subnet_id     = "subnet-ghi789"
    volume_size   = 100
    public        = false
  }
}
```

## Inline Maps

You can construct maps inline for small, fixed sets of resources:

```hcl
resource "aws_cloudwatch_log_group" "this" {
  for_each = {
    app     = 30
    access  = 90
    error   = 365
    audit   = 2555
  }

  name              = "/aws/${var.project}/${each.key}"
  retention_in_days = each.value

  tags = local.common_tags
}
```

## Map from Variables in Locals

Often you need to transform variable data into a map for `for_each`:

```hcl
variable "services" {
  type = map(object({
    port     = number
    cpu      = number
    memory   = number
    replicas = number
  }))
}

locals {
  # Create a map of target groups from services that need a load balancer
  public_services = {
    for name, svc in var.services : name => svc
    if lookup(svc, "public", false)
  }
}

resource "aws_lb_target_group" "this" {
  for_each = local.public_services

  name        = "${var.project}-${each.key}"
  port        = each.value.port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path = "/health"
    port = each.value.port
  }
}
```

## Creating Related Resources from the Same Map

One map can drive multiple resource types:

```hcl
variable "databases" {
  type = map(object({
    engine         = string
    instance_class = string
    storage_gb     = number
    port           = number
  }))
}

# Create the database instances
resource "aws_db_instance" "this" {
  for_each = var.databases

  identifier        = "${var.project}-${each.key}"
  engine            = each.value.engine
  instance_class    = each.value.instance_class
  allocated_storage = each.value.storage_gb
  port              = each.value.port
  username          = "admin"
  password          = var.db_passwords[each.key]

  tags = merge(local.common_tags, {
    Name = "${var.project}-${each.key}"
  })
}

# Create a security group for each database
resource "aws_security_group" "db" {
  for_each = var.databases

  name        = "${var.project}-${each.key}-db-sg"
  description = "Security group for ${each.key} database"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = each.value.port
    to_port     = each.value.port
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "${each.key} database access"
  }
}

# Create a CloudWatch alarm for each database
resource "aws_cloudwatch_metric_alarm" "db_cpu" {
  for_each = var.databases

  alarm_name  = "${var.project}-${each.key}-high-cpu"
  namespace   = "AWS/RDS"
  metric_name = "CPUUtilization"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.this[each.key].identifier
  }

  comparison_operator = "GreaterThanThreshold"
  threshold           = 80
  evaluation_periods  = 3
  period              = 300
  statistic           = "Average"
}
```

## Referencing for_each Resources

Reference a specific instance by key:

```hcl
# Reference a specific database
output "orders_db_endpoint" {
  value = aws_db_instance.this["orders"].endpoint
}

# Reference all databases
output "all_db_endpoints" {
  value = {
    for name, db in aws_db_instance.this : name => db.endpoint
  }
}
```

Reference one for_each resource from another:

```hcl
resource "aws_db_instance" "this" {
  for_each = var.databases
  # ...
  vpc_security_group_ids = [aws_security_group.db[each.key].id]
}
```

This works because both resources iterate over the same map, so the keys match.

## Computed Maps

You can compute the map in locals:

```hcl
variable "environments" {
  type    = list(string)
  default = ["dev", "staging", "production"]
}

locals {
  # Convert list to map for for_each
  environment_map = {
    for env in var.environments : env => {
      instance_type = env == "production" ? "m5.large" : "t3.micro"
      replicas      = env == "production" ? 3 : 1
      domain        = "${env}.example.com"
    }
  }
}

resource "aws_ecs_service" "app" {
  for_each = local.environment_map

  name          = "${var.project}-${each.key}"
  desired_count = each.value.replicas
  # ...
}
```

## Map Keys Must Be Known at Plan Time

One important constraint: map keys used with `for_each` must be known during the planning phase. They cannot depend on resource attributes that are only known after apply.

```hcl
# This FAILS - the key depends on a resource attribute
resource "aws_security_group_rule" "this" {
  for_each = {
    for sg in aws_security_group.dynamic : sg.id => sg
    # sg.id is not known until apply
  }
}

# This WORKS - the key is from a variable (known at plan time)
resource "aws_security_group_rule" "this" {
  for_each = {
    for name, config in var.rules : name => config
    # name comes from the variable, known at plan time
  }
}
```

## Dynamic Blocks with for_each Maps

`for_each` can be used inside dynamic blocks too:

```hcl
variable "ingress_rules" {
  type = map(object({
    port        = number
    protocol    = string
    cidr_blocks = list(string)
  }))
}

resource "aws_security_group" "app" {
  name   = "${var.project}-app-sg"
  vpc_id = var.vpc_id

  dynamic "ingress" {
    for_each = var.ingress_rules

    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.key
    }
  }
}
```

## Outputting for_each Resources

When outputting maps of resources, use a `for` expression:

```hcl
output "instance_ids" {
  description = "Map of instance names to their IDs"
  value = {
    for name, instance in aws_instance.this : name => instance.id
  }
}

output "instance_private_ips" {
  description = "Map of instance names to private IPs"
  value = {
    for name, instance in aws_instance.this : name => instance.private_ip
  }
}

output "database_connection_strings" {
  description = "Map of database names to connection strings"
  value = {
    for name, db in aws_db_instance.this :
    name => "postgresql://admin@${db.endpoint}/${name}"
  }
  sensitive = true
}
```

## Summary

Using `for_each` with maps is the standard approach for creating multiple resources in Terraform. Map keys provide stable identifiers that protect against the index-shifting problems of `count`. Use maps of strings for simple configurations, maps of objects for complex ones, and computed maps in locals for transformed data. The same map can drive multiple resource types, keeping related infrastructure consistent. Always ensure your map keys are known at plan time, and use `for` expressions to output clean maps of resource attributes.

For more on `for_each`, see our posts on [using for_each with sets](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-for-each-meta-argument-with-sets-in-terraform/view) and [converting lists to sets](https://oneuptime.com/blog/post/2026-02-23-how-to-convert-lists-to-sets-for-for-each-in-terraform/view).
