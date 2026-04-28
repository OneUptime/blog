# How to Use Nested Dynamic Blocks in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, HCL, Dynamic Blocks, Nested, Collection, Infrastructure as Code, DevOps

Description: A guide to using nested dynamic blocks in OpenTofu to generate hierarchically structured configuration from complex data.

## Introduction

Nested dynamic blocks allow you to generate multiple levels of configuration blocks from nested data structures. When a resource requires blocks that themselves contain repeated sub-blocks, you can nest `dynamic` declarations inside the `content` of another `dynamic` block. This is useful for complex resources like WAF rules, Kubernetes configurations, and multi-level security policies.

## Basic Nested Dynamic Block

```hcl
variable "networks" {
  type = list(object({
    network    = string
    public_ips = list(string)
  }))
}

resource "google_compute_instance" "app" {
  name         = "app-server"
  machine_type = "e2-medium"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  dynamic "network_interface" {
    for_each = var.networks
    content {
      network = network_interface.value.network

      # Nested dynamic inside network_interface block
      dynamic "access_config" {
        for_each = network_interface.value.public_ips
        content {
          nat_ip = access_config.value
        }
      }
    }
  }
}
```

## AWS WAF Rules with Nested Statements

```hcl
variable "ip_sets" {
  type = list(object({
    name      = string
    addresses = list(string)
    action    = string
  }))
}

resource "aws_wafv2_web_acl" "app" {
  name  = "app-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  dynamic "rule" {
    for_each = var.ip_sets
    content {
      name     = rule.value.name
      priority = rule.key + 1

      dynamic "action" {
        for_each = rule.value.action == "block" ? [1] : []
        content {
          block {}
        }
      }

      dynamic "action" {
        for_each = rule.value.action == "allow" ? [1] : []
        content {
          allow {}
        }
      }

      statement {
        ip_set_reference_statement {
          arn = aws_wafv2_ip_set.sets[rule.key].arn
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = rule.value.name
        sampled_requests_enabled   = true
      }
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "app-waf"
    sampled_requests_enabled   = true
  }
}
```

## Kubernetes Resource Requests and Limits

```hcl
variable "containers" {
  type = list(object({
    name  = string
    image = string
    ports = list(number)
    env   = map(string)
    resources = object({
      requests = map(string)
      limits   = map(string)
    })
  }))
}

resource "kubernetes_deployment" "app" {
  metadata {
    name = "app"
  }

  spec {
    replicas = 3

    selector {
      match_labels = { app = "myapp" }
    }

    template {
      metadata {
        labels = { app = "myapp" }
      }

      spec {
        dynamic "container" {
          for_each = var.containers
          content {
            name  = container.value.name
            image = container.value.image

            dynamic "port" {
              for_each = container.value.ports
              content {
                container_port = port.value
              }
            }

            dynamic "env" {
              for_each = container.value.env
              content {
                name  = env.key
                value = env.value
              }
            }

            resources {
              requests = container.value.resources.requests
              limits   = container.value.resources.limits
            }
          }
        }
      }
    }
  }
}
```

## Iterator Names in Nested Blocks

```hcl
variable "stages" {
  type = list(object({
    name = string
    actions = list(object({
      name     = string
      provider = string
    }))
  }))
}

resource "aws_codepipeline" "main" {
  name     = "app-pipeline"
  role_arn = aws_iam_role.pipeline.arn

  artifact_store {
    location = aws_s3_bucket.artifacts.bucket
    type     = "S3"
  }

  # Use explicit iterator names to avoid confusion in nested blocks
  dynamic "stage" {
    for_each = var.stages
    iterator = pipeline_stage  # Explicit name

    content {
      name = pipeline_stage.value.name

      # Nested dynamic with its own iterator
      dynamic "action" {
        for_each = pipeline_stage.value.actions
        iterator = pipeline_action  # Different name from outer iterator

        content {
          name     = pipeline_action.value.name
          category = "Source"
          owner    = "AWS"
          provider = pipeline_action.value.provider
          version  = "1"
        }
      }
    }
  }
}
```

## IAM Policy with Nested Conditions

```hcl
variable "policy_statements" {
  type = list(object({
    actions    = list(string)
    resources  = list(string)
    conditions = list(object({
      test     = string
      variable = string
      values   = list(string)
    }))
  }))
}

data "aws_iam_policy_document" "complex" {
  dynamic "statement" {
    for_each = var.policy_statements
    content {
      effect    = "Allow"
      actions   = statement.value.actions
      resources = statement.value.resources

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

## Best Practices for Nested Dynamic Blocks

```hcl
# Always use explicit iterator names in nested blocks

# to avoid confusion between inner and outer iterators

# Bad: Hard to tell which iterator 'key' and 'value' refer to
# dynamic "outer" {
#   for_each = var.outer_list
#   content {
#     dynamic "inner" {
#       for_each = outer.value.inner_list  # Using 'outer' here is clear
#       content {
#         value = inner.value  # But 'inner' could be confused
#       }
#     }
#   }
# }

# Good: Use descriptive iterator names
dynamic "rule_group" {
  for_each = var.rule_groups
  iterator = rule_group

  content {
    dynamic "rule" {
      for_each = rule_group.value.rules
      iterator = rule

      content {
        priority = rule.key
        action   = rule.value.action
      }
    }
  }
}
```

## Conclusion

Nested dynamic blocks enable generating hierarchical configuration from complex nested data structures. The key to working with nested dynamic blocks is using explicit `iterator` names for each level to prevent confusion between the outer and inner iterator variables. Nested dynamic blocks are particularly powerful for Kubernetes deployments with multiple containers and ports, AWS WAF rules with nested statements, IAM policies with multiple conditions per statement, and any resource that requires multi-level repeated block structures. Keep the data structures clean and consider flattening complex nesting to locals for readability before passing to dynamic blocks.
