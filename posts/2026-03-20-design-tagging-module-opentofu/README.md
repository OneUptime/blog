# How to Design a Tagging Module for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Tagging, AWS, Module, Cost Management, Compliance

Description: Learn how to design a tagging module for OpenTofu that generates consistent, validated tag maps enforcing organizational tagging standards across all resources.

## Introduction

Inconsistent tagging is one of the top causes of cloud cost visibility problems. A tagging module enforces mandatory tags, validates tag values, and generates the complete tag map that all other modules consume - ensuring every resource carries the same required metadata.

## Module Design

```hcl
# modules/tags/variables.tf

variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "prod", "sandbox"], var.environment)
    error_message = "Environment must be dev, staging, prod, or sandbox."
  }
}

variable "project"     { type = string }
variable "team"        { type = string }
variable "cost_center" { type = string }

variable "service" {
  description = "Name of the service or application this resource belongs to"
  type        = string
  default     = ""
}

variable "component" {
  description = "Specific component (e.g., api, worker, database)"
  type        = string
  default     = ""
}

variable "data_classification" {
  type    = string
  default = "internal"
  validation {
    condition     = contains(["public", "internal", "confidential", "restricted"], var.data_classification)
    error_message = "data_classification must be public, internal, confidential, or restricted."
  }
}

variable "additional_tags" {
  description = "Additional tags to merge with the standard set"
  type        = map(string)
  default     = {}
}
```

```hcl
# modules/tags/main.tf
locals {
  # Required tags that every resource must have
  required_tags = {
    Environment        = var.environment
    Project            = var.project
    Team               = var.team
    CostCenter         = var.cost_center
    ManagedBy          = "OpenTofu"
    DataClassification = var.data_classification
  }

  # Optional tags added when values are provided
  optional_tags = {
    for k, v in {
      Service   = var.service
      Component = var.component
    } : k => v if v != ""
  }

  # Final merged tag map
  tags = merge(var.additional_tags, local.optional_tags, local.required_tags)
}
```

```hcl
# modules/tags/outputs.tf
output "tags" {
  description = "Complete tag map to apply to resources"
  value       = local.tags
}

output "asg_tags" {
  description = "Tag format suitable for Auto Scaling Groups with propagate_at_launch"
  value = [
    for k, v in local.tags : {
      key                 = k
      value               = v
      propagate_at_launch = true
    }
  ]
}

output "name_prefix" {
  description = "Consistent resource name prefix"
  value       = "${var.project}-${var.environment}"
}
```

## Using the Tagging Module

```hcl
# Instantiate the tagging module once per stack
module "tags" {
  source      = "./modules/tags"
  environment = var.environment
  project     = "myapp"
  team        = "platform"
  cost_center = "CC-1234"
  service     = "payment-api"
  additional_tags = {
    "Terraform:Workspace" = terraform.workspace
  }
}

# Pass the tag map to all resources
resource "aws_instance" "app" {
  ami           = data.aws_ami.app.id
  instance_type = "t3.medium"
  # Use the tag module's output directly
  tags = module.tags.tags
}

resource "aws_autoscaling_group" "app" {
  name                = "${module.tags.name_prefix}-asg"
  min_size            = 1
  max_size            = 5
  vpc_zone_identifier = [aws_subnet.app.id]

  launch_template {
    id      = aws_launch_template.app.id
    version = aws_launch_template.app.latest_version
  }

  # Use the ASG-specific format for tag propagation
  dynamic "tag" {
    for_each = module.tags.asg_tags
    content {
      key                 = tag.value.key
      value               = tag.value.value
      propagate_at_launch = tag.value.propagate_at_launch
    }
  }
}
```

## Enforcing Tags with AWS Config

Pair the tagging module with an AWS Config managed rule to catch non-compliant supported resources.

```hcl
resource "aws_config_config_rule" "required_tags" {
  name = "required-tags"
  source {
    owner             = "AWS"
    source_identifier = "REQUIRED_TAGS"
  }

  input_parameters = jsonencode({
    tag1Key   = "Environment"
    tag2Key   = "Project"
    tag3Key   = "Team"
    tag4Key   = "CostCenter"
  })
}
```

## Conclusion

A dedicated tagging module is one of the highest-leverage infrastructure investments. By validating tags at plan time and generating consistent tag maps, it eliminates the two most common tagging problems: missing required tags and inconsistent tag values. All other modules consume it through `module.tags.tags`, making the standard easy to follow.
