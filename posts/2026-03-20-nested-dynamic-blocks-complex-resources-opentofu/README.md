# How to Use Nested Dynamic Blocks for Complex Resources in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Dynamic Blocks, HCL, Nested Blocks, Advanced

Description: Learn how to nest dynamic blocks inside other dynamic blocks in OpenTofu to handle deeply structured resources like IAM policies, ECS task definitions, and Kubernetes specs.

## Introduction

Some OpenTofu resources have deeply nested block structures. Nested dynamic blocks let you generate complex, multi-level configurations from structured data, avoiding the combinatorial explosion of static HCL that would otherwise be required.

## Nested Dynamic: IAM Policy Conditions

An IAM policy `statement` block can contain multiple `condition` blocks. Use nested dynamic blocks to generate both.

```hcl
variable "policy_statements" {
  type = list(object({
    sid       = string
    effect    = string
    actions   = list(string)
    resources = list(string)
    conditions = list(object({
      test     = string
      variable = string
      values   = list(string)
    }))
  }))
}

data "aws_iam_policy_document" "policy" {
  # Outer dynamic: one statement block per policy statement
  dynamic "statement" {
    for_each = var.policy_statements
    content {
      sid       = statement.value.sid
      effect    = statement.value.effect
      actions   = statement.value.actions
      resources = statement.value.resources

      # Inner dynamic: one condition block per condition in this statement
      dynamic "condition" {
        for_each = statement.value.conditions
        content {
          test     = condition.value.test
          variable = condition.value.variable
          values   = condition.value.values
        }
      }
    }
  }
}
```

## Nested Dynamic: ECS Task Placement Strategies

ECS services support multiple placement strategy and constraint blocks.

```hcl
variable "placement_strategies" {
  type = list(object({
    type  = string  # "binpack", "spread", "random"
    field = string
  }))
  default = [
    { type = "spread", field = "attribute:ecs.availability-zone" },
    { type = "binpack", field = "cpu" }
  ]
}

variable "placement_constraints" {
  type = list(object({
    type       = string
    expression = string
  }))
  default = []
}

resource "aws_ecs_service" "app" {
  name            = var.service_name
  cluster         = var.cluster_arn
  task_definition = var.task_definition_arn
  desired_count   = var.desired_count

  dynamic "ordered_placement_strategy" {
    for_each = var.placement_strategies
    content {
      type  = ordered_placement_strategy.value.type
      field = ordered_placement_strategy.value.field
    }
  }

  dynamic "placement_constraints" {
    for_each = var.placement_constraints
    content {
      type       = placement_constraints.value.type
      expression = placement_constraints.value.expression
    }
  }
}
```

## `for_each` with CloudWatch Metric Alarms and Dimensions

```hcl
variable "metric_alarms" {
  type = list(object({
    name               = string
    metric_name        = string
    namespace          = string
    comparison_operator = string
    threshold          = number
    evaluation_periods = number
    dimensions = list(object({
      name  = string
      value = string
    }))
    alarm_actions = list(string)
  }))
  default = []
}

resource "aws_cloudwatch_metric_alarm" "alarms" {
  for_each = {
    for alarm in var.metric_alarms : alarm.name => alarm
  }

  alarm_name          = each.value.name
  metric_name         = each.value.metric_name
  namespace           = each.value.namespace
  comparison_operator = each.value.comparison_operator
  threshold           = each.value.threshold
  evaluation_periods  = each.value.evaluation_periods
  alarm_actions       = each.value.alarm_actions

  # `dimensions` is a map argument on this resource, not a block, so it is built
  # with a `for` expression rather than a dynamic block.
  dimensions = {
    for dim in each.value.dimensions : dim.name => dim.value
  }
}
```

## Nested Dynamic: Kubernetes Resource Limits Per Container

```hcl
variable "containers" {
  type = list(object({
    name  = string
    image = string
    ports = list(object({
      container_port = number
      protocol       = string
    }))
    env = list(object({
      name  = string
      value = string
    }))
  }))
}

resource "kubernetes_deployment" "app" {
  spec {
    template {
      spec {
        # Outer: one container block per container definition
        dynamic "container" {
          for_each = var.containers
          content {
            name  = container.value.name
            image = container.value.image

            # Inner: one port block per port in this container
            dynamic "port" {
              for_each = container.value.ports
              content {
                container_port = port.value.container_port
                protocol       = port.value.protocol
              }
            }

            # Inner: one env block per env var in this container
            dynamic "env" {
              for_each = container.value.env
              content {
                name  = env.value.name
                value = env.value.value
              }
            }
          }
        }
      }
    }
  }
}
```

## Conclusion

Nested dynamic blocks let you handle arbitrarily complex resource structures without combinatorial HCL explosion. Keep nesting to two or three levels maximum for readability - if you need deeper nesting, consider restructuring your data model or splitting into multiple resources.
