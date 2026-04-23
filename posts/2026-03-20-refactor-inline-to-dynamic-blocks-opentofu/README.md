# How to Refactor Inline Blocks to Dynamic Blocks in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Dynamic Blocks, Refactoring, HCL, Infrastructure as Code

Description: Learn how to refactor repetitive inline resource blocks in OpenTofu to dynamic blocks for cleaner, more maintainable configurations.

When the same type of nested block appears multiple times within a resource, inline repetition becomes hard to maintain. Dynamic blocks replace repeated inline blocks with a single, loop-driven block that generates them from a variable or local. When the repetition is at the resource level or inside an argument value, use `for_each` or a `for` expression instead.

## The Problem: Repetitive Inline Blocks

```hcl
# Hard to maintain: adding a rule requires editing the resource directly

resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = [var.internal_cidr]
  }
}
```

## The Solution: Dynamic Block

```hcl
# Clean: rules are a variable, resource block doesn't change
variable "ingress_rules" {
  type = list(object({
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
  }))
  default = [
    { from_port = 80,   to_port = 80,   protocol = "tcp", cidr_blocks = ["0.0.0.0/0"] },
    { from_port = 443,  to_port = 443,  protocol = "tcp", cidr_blocks = ["0.0.0.0/0"] },
    { from_port = 8080, to_port = 8080, protocol = "tcp", cidr_blocks = ["10.0.0.0/8"] },
  ]
}

resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = var.vpc_id

  # Generate one ingress block per rule in the variable
  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
    }
  }
}
```

For `aws_security_group` specifically, the AWS provider currently recommends dedicated `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources over inline `ingress` and `egress` rules. Treat this example as a demonstration of `dynamic` syntax for repeated nested blocks.

## ECS Container Definitions with `for` Expressions

Because `container_definitions` is a JSON argument rather than a nested HCL block, use a `for` expression instead of a `dynamic` block:

```hcl
variable "env_vars" {
  type    = map(string)
  default = { LOG_LEVEL = "info", PORT = "8080" }
}

resource "aws_ecs_task_definition" "app" {
  family = "my-app"

  container_definitions = jsonencode([{
    name  = "app"
    image = var.image_uri

    # Generate one environment object for each key-value pair
    environment = [
      for k, v in var.env_vars : { name = k, value = v }
    ]
  }])
}
```

## ALB Listener Rules with `for_each`

Because each listener rule is a separate resource, use resource-level `for_each` rather than a `dynamic` block:

```hcl
variable "path_routing_rules" {
  type = list(object({
    path            = string
    target_group_arn = string
    priority        = number
  }))
}

resource "aws_lb_listener_rule" "path_rules" {
  for_each     = { for r in var.path_routing_rules : r.path => r }
  listener_arn = aws_lb_listener.http.arn
  priority     = each.value.priority

  action {
    type             = "forward"
    target_group_arn = each.value.target_group_arn
  }

  condition {
    path_pattern { values = [each.value.path] }
  }
}
```

## Conditional Dynamic Blocks

Use `for_each` with an empty list to optionally include a block:

```hcl
variable "enable_access_logs" {
  type    = bool
  default = false
}

resource "aws_lb" "main" {
  name               = "main-lb"
  load_balancer_type = "application"
  subnets            = var.subnet_ids

  # access_logs block only added when enabled
  dynamic "access_logs" {
    for_each = var.enable_access_logs ? [1] : []
    content {
      bucket  = var.log_bucket
      enabled = true
    }
  }
}
```

## Conclusion

Dynamic blocks eliminate repetitive inline block definitions when a resource schema uses repeatable nested blocks. Use `for_each` when you need multiple resource instances, and use `for` expressions when you need to build complex argument values such as JSON-encoded ECS container definitions. For provider-specific edge cases such as `aws_security_group` inline rules, follow the provider's current guidance.
