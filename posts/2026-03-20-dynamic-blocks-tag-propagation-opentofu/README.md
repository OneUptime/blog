# How to Use Dynamic Blocks for Tag Propagation in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, AWS, Tagging, Dynamic Blocks, Cost Management

Description: Learn how to use dynamic blocks in OpenTofu to propagate tags consistently across all resources, including Auto Scaling Groups, ECS tasks, and nested tag configurations.

## Introduction

Consistent tagging is essential for cost allocation, security compliance, and resource management. While most AWS resources accept a simple `tags` map, some resources (like Auto Scaling Groups with `propagate_at_launch`) require individual `tag` blocks instead. OpenTofu's dynamic blocks make this pattern clean and reusable.

## Standard Tag Map Propagation

For resources that accept a flat `tags` map, use `merge` to combine global and resource-specific tags.

```hcl
variable "global_tags" {
  description = "Tags applied to all resources"
  type = map(string)
  default = {
    ManagedBy   = "OpenTofu"
    Project     = "myapp"
    Environment = "prod"
  }
}

variable "resource_tags" {
  description = "Additional tags for this specific resource"
  type        = map(string)
  default     = {}
}

locals {
  # Merge global tags with resource-specific tags (resource wins on conflict)
  common_tags = merge(var.global_tags, var.resource_tags)
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type
  # Apply merged tags to all resources
  tags = local.common_tags
}
```

## Dynamic Tag Blocks for Auto Scaling Groups

Auto Scaling Groups require individual `tag` blocks (not a map) because each tag needs a `propagate_at_launch` flag.

```hcl
locals {
  asg_tags = merge(var.global_tags, {
    Name       = "app-asg-instance"
    AutoScaled = "true"
  })
}

resource "aws_autoscaling_group" "app" {
  name                = "app-asg"
  min_size            = var.min_size
  max_size            = var.max_size
  vpc_zone_identifier = var.subnet_ids

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  # Convert the tags map into individual tag blocks with propagation
  dynamic "tag" {
    for_each = local.asg_tags
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true  # Propagate all tags to launched instances
    }
  }
}
```

## Selective Tag Propagation

Not all tags should propagate to instances. Use an object map to control propagation per tag.

```hcl
variable "asg_tags_with_propagation" {
  description = "Tags with per-tag propagation control"
  type = map(object({
    value               = string
    propagate_at_launch = bool
  }))
  default = {
    "Environment" = { value = "prod",   propagate_at_launch = true  }
    "ManagedBy"   = { value = "tofu",   propagate_at_launch = true  }
    "ASGOnly"     = { value = "yes",    propagate_at_launch = false }
  }
}

resource "aws_autoscaling_group" "app" {
  name                = "app-asg"
  min_size            = 1
  max_size            = 5
  vpc_zone_identifier = var.subnet_ids

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  dynamic "tag" {
    for_each = var.asg_tags_with_propagation
    content {
      key                 = tag.key
      value               = tag.value.value
      propagate_at_launch = tag.value.propagate_at_launch
    }
  }
}
```

## ECS Service Tag Propagation

ECS services support propagating tags from service to tasks.

```hcl
resource "aws_ecs_service" "app" {
  name            = var.service_name
  cluster         = var.cluster_arn
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count

  # Propagate tags from the service definition to the tasks it launches
  propagate_tags = "SERVICE"

  tags = merge(var.global_tags, {
    Service = var.service_name
  })

  network_configuration {
    subnets         = var.subnet_ids
    security_groups = var.security_group_ids
  }
}
```

## Tagging Module Pattern

Create a reusable tagging module that generates consistent tag maps.

```hcl
# modules/tags/main.tf

variable "environment"  { type = string }
variable "project"      { type = string }
variable "team"         { type = string }
variable "extra_tags"   { type = map(string); default = {} }

output "tags" {
  value = merge({
    Environment = var.environment
    Project     = var.project
    Team        = var.team
    ManagedBy   = "OpenTofu"
    CreatedDate = "2026-03-20"
  }, var.extra_tags)
}
```

## Conclusion

Consistent tag propagation through dynamic blocks ensures every resource and its children carry the correct metadata. The Auto Scaling Group pattern with `propagate_at_launch` is particularly important - without it, EC2 instances launched by the ASG won't inherit tags, making cost allocation and compliance reporting inaccurate.
