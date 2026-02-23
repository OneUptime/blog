# How to Use Dynamic Blocks for Tags in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, Tags, AWS, Infrastructure as Code, Cost Management

Description: Learn how to use Terraform dynamic blocks to manage resource tags programmatically across AWS Auto Scaling Groups, ECS, and other services.

---

Most Terraform resources accept tags as a simple map, which makes them straightforward to manage. But some resources - notably Auto Scaling Groups and a few other AWS services - require tags as repeated nested blocks rather than a flat map. This is where dynamic blocks become essential for tag management. This post covers how to handle both styles and keep your tagging consistent across your infrastructure.

## The Two Tag Formats in Terraform

Most AWS resources use the simple map format:

```hcl
# Simple map format - used by most resources
resource "aws_instance" "app" {
  ami           = data.aws_ami.app.id
  instance_type = "t3.medium"

  tags = {
    Name        = "my-app"
    Environment = "prod"
    Team        = "platform"
  }
}
```

But Auto Scaling Groups use a nested block format:

```hcl
# Nested block format - used by ASGs
resource "aws_autoscaling_group" "app" {
  name                = "my-app-asg"
  min_size            = 1
  max_size            = 5
  vpc_zone_identifier = aws_subnet.private[*].id

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  # Each tag is a separate block with propagation control
  tag {
    key                 = "Name"
    value               = "my-app"
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = "prod"
    propagate_at_launch = true
  }

  tag {
    key                 = "Team"
    value               = "platform"
    propagate_at_launch = true
  }
}
```

Writing out each tag block manually is tedious and error-prone, especially when you have 10 or more tags. Dynamic blocks solve this.

## Using Dynamic Blocks for ASG Tags

Convert a tag map into dynamic blocks:

```hcl
# Define tags as a map
locals {
  common_tags = {
    Environment = terraform.workspace
    Project     = "myapp"
    ManagedBy   = "terraform"
    Team        = "platform"
    CostCenter  = "CC-001"
  }
}

resource "aws_autoscaling_group" "app" {
  name                = "${terraform.workspace}-app-asg"
  min_size            = var.min_size
  max_size            = var.max_size
  vpc_zone_identifier = aws_subnet.private[*].id

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  # Generate tag blocks from the map
  dynamic "tag" {
    for_each = merge(local.common_tags, {
      Name = "${terraform.workspace}-app"
    })

    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }
}
```

## Controlling Tag Propagation

Not all tags should propagate to launched instances. Use a more detailed structure when you need per-tag control:

```hcl
variable "asg_tags" {
  description = "Tags for the ASG with propagation control"
  type = list(object({
    key                 = string
    value               = string
    propagate_at_launch = bool
  }))
  default = [
    {
      key                 = "Name"
      value               = "app-instance"
      propagate_at_launch = true
    },
    {
      key                 = "Environment"
      value               = "prod"
      propagate_at_launch = true
    },
    {
      key                 = "ASGName"
      value               = "app-asg"
      propagate_at_launch = false  # Only on the ASG itself
    },
    {
      key                 = "ScalingPolicy"
      value               = "target-tracking"
      propagate_at_launch = false  # Only on the ASG itself
    }
  ]
}

resource "aws_autoscaling_group" "app" {
  name                = "${terraform.workspace}-app-asg"
  min_size            = var.min_size
  max_size            = var.max_size
  vpc_zone_identifier = aws_subnet.private[*].id

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  dynamic "tag" {
    for_each = var.asg_tags

    content {
      key                 = tag.value.key
      value               = tag.value.value
      propagate_at_launch = tag.value.propagate_at_launch
    }
  }
}
```

## Merging Tag Sources with Dynamic Blocks

In real projects, tags come from multiple sources. Merge them before passing to the dynamic block:

```hcl
locals {
  # Organization-wide tags
  org_tags = {
    Organization = "MyCompany"
    ManagedBy    = "terraform"
    CostCenter   = var.cost_center
  }

  # Environment-specific tags
  env_tags = {
    Environment = terraform.workspace
    Region      = data.aws_region.current.name
  }

  # Application-specific tags
  app_tags = {
    Application = "webapp"
    Team        = "platform"
    Service     = "frontend"
  }

  # Merge all tag sources
  all_tags = merge(
    local.org_tags,
    local.env_tags,
    local.app_tags,
    var.additional_tags  # Allow callers to add custom tags
  )

  # Tags that should NOT propagate to instances
  asg_only_tag_keys = toset(["ASGName", "ScalingPolicy", "DesiredCapacity"])

  # Convert the flat map to a list of tag objects with propagation control
  asg_tag_list = [
    for key, value in local.all_tags : {
      key                 = key
      value               = value
      propagate_at_launch = !contains(local.asg_only_tag_keys, key)
    }
  ]
}

variable "additional_tags" {
  description = "Additional tags to apply"
  type        = map(string)
  default     = {}
}

resource "aws_autoscaling_group" "app" {
  name                = "${terraform.workspace}-app-asg"
  min_size            = var.min_size
  max_size            = var.max_size
  vpc_zone_identifier = aws_subnet.private[*].id

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  # Use the pre-processed tag list
  dynamic "tag" {
    for_each = local.asg_tag_list

    content {
      key                 = tag.value.key
      value               = tag.value.value
      propagate_at_launch = tag.value.propagate_at_launch
    }
  }
}
```

## Building a Reusable Tag Module

Create a module that standardizes tagging across your organization:

```hcl
# modules/tags/variables.tf
variable "environment" {
  description = "Environment name"
  type        = string
}

variable "project" {
  description = "Project name"
  type        = string
}

variable "team" {
  description = "Owning team"
  type        = string
}

variable "cost_center" {
  description = "Cost center code"
  type        = string
}

variable "additional_tags" {
  description = "Additional tags to merge"
  type        = map(string)
  default     = {}
}
```

```hcl
# modules/tags/outputs.tf
output "tags" {
  description = "Standard tags as a map (for most resources)"
  value = merge(
    {
      Environment = var.environment
      Project     = var.project
      Team        = var.team
      CostCenter  = var.cost_center
      ManagedBy   = "terraform"
    },
    var.additional_tags
  )
}

output "asg_tags" {
  description = "Standard tags as a list for ASG dynamic blocks"
  value = [
    for key, value in merge(
      {
        Environment = var.environment
        Project     = var.project
        Team        = var.team
        CostCenter  = var.cost_center
        ManagedBy   = "terraform"
      },
      var.additional_tags
    ) : {
      key                 = key
      value               = value
      propagate_at_launch = true
    }
  ]
}
```

Use it:

```hcl
# main.tf
module "tags" {
  source = "./modules/tags"

  environment = terraform.workspace
  project     = "webapp"
  team        = "platform"
  cost_center = "CC-001"

  additional_tags = {
    Service = "frontend"
  }
}

# Regular resources use the map output
resource "aws_instance" "app" {
  ami           = data.aws_ami.app.id
  instance_type = "t3.medium"
  tags          = merge(module.tags.tags, { Name = "${terraform.workspace}-app" })
}

# ASGs use the list output with dynamic blocks
resource "aws_autoscaling_group" "app" {
  name                = "${terraform.workspace}-app-asg"
  min_size            = 1
  max_size            = 5
  vpc_zone_identifier = aws_subnet.private[*].id

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  dynamic "tag" {
    for_each = concat(module.tags.asg_tags, [
      {
        key                 = "Name"
        value               = "${terraform.workspace}-app"
        propagate_at_launch = true
      }
    ])

    content {
      key                 = tag.value.key
      value               = tag.value.value
      propagate_at_launch = tag.value.propagate_at_launch
    }
  }
}
```

## Tags for ECS Services

ECS also has specific tagging needs, particularly for task propagation:

```hcl
resource "aws_ecs_service" "app" {
  name            = "${terraform.workspace}-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count

  # Propagate tags from the service to tasks
  propagate_tags = "SERVICE"

  tags = local.all_tags
}
```

## Using Provider Default Tags

For AWS, the simplest approach to consistent tagging is provider-level default tags. This eliminates the need for dynamic blocks in most cases:

```hcl
provider "aws" {
  region = var.region

  default_tags {
    tags = local.org_tags
  }
}

# Now every resource automatically gets org_tags
# You only need to add resource-specific tags
resource "aws_instance" "app" {
  ami           = data.aws_ami.app.id
  instance_type = "t3.medium"

  tags = {
    Name    = "${terraform.workspace}-app"
    Service = "frontend"
  }
  # org_tags are applied automatically
}
```

But default tags do not help with ASG tag blocks - you still need dynamic blocks there. Combine both approaches:

```hcl
provider "aws" {
  default_tags {
    tags = local.org_tags
  }
}

# For ASGs, explicitly include all tags including org tags
resource "aws_autoscaling_group" "app" {
  # ... config ...

  dynamic "tag" {
    for_each = merge(local.org_tags, local.app_tags, {
      Name = "${terraform.workspace}-app"
    })

    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }
}
```

## Conditional Tags

Add tags based on conditions:

```hcl
locals {
  # Tags that only apply in certain environments
  conditional_tags = merge(
    # Base tags always present
    {
      Environment = terraform.workspace
      Project     = "webapp"
    },
    # Compliance tags only in production
    terraform.workspace == "prod" ? {
      Compliance   = "SOC2"
      DataClass    = "confidential"
      BackupPolicy = "daily"
    } : {},
    # Cost optimization tags only in non-production
    terraform.workspace != "prod" ? {
      AutoShutdown = "true"
      ShutdownTime = "19:00"
    } : {}
  )
}
```

## Summary

Dynamic blocks solve the specific problem of resources that require tags as nested blocks rather than maps. Auto Scaling Groups are the most common example, but the same pattern applies anywhere you see repeated tag blocks. The best approach is to define your tags once as a map, then convert them to whatever format each resource needs. Combine dynamic blocks with provider default tags for a comprehensive tagging strategy that covers all resource types. For more on using tags with workspaces, see our post on [workspace-specific tags](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-workspace-specific-tags-in-terraform/view).
