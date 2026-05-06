# How to Implement Canary Deployments with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Canary Deployment, Progressive Delivery, AWS, Kubernetes, Infrastructure as Code, Reliability

Description: Learn how to implement canary deployments using OpenTofu to progressively release new versions to a small subset of users before full rollout.

---

Canary deployments release new versions to a small percentage of users first, validating stability before broader rollout. Unlike blue-green, canary shifts traffic gradually and can be automated based on error rate metrics. OpenTofu manages the infrastructure for canary routing.

## Canary with AWS ALB and Weighted Target Groups

```hcl
# main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "canary_weight" {
  description = "Percentage of traffic routed to the canary (0-100)"
  type        = number
  default     = 0

  validation {
    condition     = var.canary_weight >= 0 && var.canary_weight <= 100
    error_message = "canary_weight must be between 0 and 100"
  }
}

# Stable target group (existing version)
resource "aws_lb_target_group" "stable" {
  name     = "${var.app_name}-stable"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path = "/health"
  }
}

# Canary target group (new version)
resource "aws_lb_target_group" "canary" {
  name     = "${var.app_name}-canary"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path = "/health"
  }
}

# Weighted forwarding
resource "aws_lb_listener_rule" "canary" {
  listener_arn = aws_lb_listener.main.arn
  priority     = 100

  action {
    type = "forward"

    forward {
      target_group {
        arn    = aws_lb_target_group.stable.arn
        weight = 100 - var.canary_weight
      }

      target_group {
        arn    = aws_lb_target_group.canary.arn
        weight = var.canary_weight
      }
    }
  }

  condition {
    path_pattern {
      values = ["/*"]
    }
  }
}
```

## Canary on Kubernetes with Argo Rollouts

```hcl
# k8s_canary.tf
# Install the controller and CRDs first. The kubernetes_manifest resources
# below need the Rollout CRDs to exist at plan time.
resource "helm_release" "argo_rollouts" {
  name       = "argo-rollouts"
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argo-rollouts"
  version    = "2.35.0"
  namespace  = "argo-rollouts"
  create_namespace = true

  wait    = true
  timeout = 300
}

# After the CRDs exist (typically from a prior apply or separate stack),
# create a Rollout resource instead of a Deployment. This assumes matching
# stable/canary Services and the referenced Istio VirtualService already exist.
resource "kubernetes_manifest" "app_rollout" {
  depends_on = [helm_release.argo_rollouts]

  manifest = {
    apiVersion = "argoproj.io/v1alpha1"
    kind       = "Rollout"
    metadata = {
      name      = var.app_name
      namespace = var.namespace
    }
    spec = {
      replicas = var.desired_replicas

      strategy = {
        canary = {
          # Step-by-step traffic progression
          steps = [
            { setWeight = 5 },                    # 5% to canary
            { pause = { duration = "5m" } },       # Wait 5 minutes
            { setWeight = 20 },                    # 20% to canary
            { pause = { duration = "10m" } },      # Wait 10 minutes - monitor metrics
            { setWeight = 50 },                    # 50% to canary
            { pause = { duration = "10m" } },
            { setWeight = 80 },                    # 80% to canary
            { pause = { duration = "5m" } },
          ]

          # Automated analysis - abort rollout if error rate exceeds 1%
          analysis = {
            templates = [{
              templateName = "error-rate-check"
            }]
            args = [{
              name  = "service-name"
              value = var.app_name
            }]
          }

          canaryService = "${var.app_name}-canary"
          stableService = "${var.app_name}-stable"

          trafficRouting = {
            istio = {
              virtualService = {
                name   = var.app_name
                routes = ["primary"]
              }
            }
          }
        }
      }

      selector = {
        matchLabels = {
          app = var.app_name
        }
      }

      template = {
        metadata = {
          labels = {
            app = var.app_name
          }
        }
        spec = {
          containers = [{
            name  = var.app_name
            image = var.app_image
          }]
        }
      }
    }
  }
}
```

## Analysis Template for Automated Promotion

```hcl
# analysis.tf
resource "kubernetes_manifest" "error_rate_analysis" {
  manifest = {
    apiVersion = "argoproj.io/v1alpha1"
    kind       = "AnalysisTemplate"
    metadata = {
      name      = "error-rate-check"
      namespace = var.namespace
    }
    spec = {
      args = [{
        name = "service-name"
      }]
      metrics = [{
        name             = "error-rate"
        interval         = "1m"
        failureLimit     = 3  # Abort after 3 failed measurements
        successCondition = "result[0] < 0.01"  # Fail if error rate > 1%

        provider = {
          prometheus = {
            address = "http://kube-prometheus-stack-prometheus:9090"
            # Adjust metric and label names to match your Prometheus schema.
            query   = <<-QUERY
              sum(rate(http_requests_total{service="{{args.service-name}}", status=~"5.."}[5m]))
              /
              sum(rate(http_requests_total{service="{{args.service-name}}"}[5m]))
            QUERY
          }
        }
      }]
    }
  }
}
```

## Best Practices

- Start with a small canary weight (1-5%) to limit blast radius.
- Define automated promotion and abort criteria based on error rates and latency - don't rely on manual observation.
- Keep canary deployments to under 30 minutes for single-service updates to minimize the window of dual-version operation.
- Use canary analysis with Prometheus or Datadog to make data-driven promotion decisions.
- Maintain database schema backward compatibility so both versions can run simultaneously during the canary window.
