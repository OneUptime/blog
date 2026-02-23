# How to Generate YAML Output with yamlencode in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, YAML, Kubernetes, Configuration Generation, Infrastructure as Code

Description: A hands-on guide to generating YAML output files and configurations from Terraform using the yamlencode function with real-world examples and best practices.

---

Terraform is not just for managing cloud resources. It is also a powerful tool for generating configuration files that other systems consume. When those systems expect YAML, the `yamlencode` function is your go-to tool. This guide focuses on practical patterns for generating useful YAML output from your Terraform configurations.

## The Basics of YAML Generation

The core pattern is simple: build a data structure in Terraform and pass it to `yamlencode`:

```hcl
resource "local_file" "config" {
  filename = "${path.module}/output/config.yaml"
  content  = yamlencode({
    app_name    = "my-service"
    environment = var.environment
    port        = 8080
  })
}
```

This creates a YAML file with the data structure serialized. Let's look at real-world applications of this pattern.

## Generating Kubernetes Manifests

### Creating a Complete Deployment

```hcl
variable "app_name" {
  default = "web-api"
}

variable "image_tag" {
  default = "v1.2.3"
}

variable "replicas" {
  default = 3
}

locals {
  deployment = {
    apiVersion = "apps/v1"
    kind       = "Deployment"
    metadata = {
      name      = var.app_name
      namespace = var.environment
      labels = {
        app     = var.app_name
        version = var.image_tag
      }
    }
    spec = {
      replicas = var.replicas
      selector = {
        matchLabels = {
          app = var.app_name
        }
      }
      template = {
        metadata = {
          labels = {
            app     = var.app_name
            version = var.image_tag
          }
        }
        spec = {
          containers = [{
            name  = var.app_name
            image = "${var.ecr_repo}/${var.app_name}:${var.image_tag}"
            ports = [{
              containerPort = 8080
            }]
            resources = {
              requests = {
                cpu    = "250m"
                memory = "256Mi"
              }
              limits = {
                cpu    = "500m"
                memory = "512Mi"
              }
            }
            livenessProbe = {
              httpGet = {
                path = "/health"
                port = 8080
              }
              initialDelaySeconds = 30
              periodSeconds       = 10
            }
          }]
        }
      }
    }
  }
}

resource "local_file" "deployment" {
  filename = "${path.module}/generated/deployment.yaml"
  content  = yamlencode(local.deployment)
}
```

### Generating Multiple Kubernetes Resources

When you need to generate several related resources:

```hcl
locals {
  # Define the service
  k8s_service = {
    apiVersion = "v1"
    kind       = "Service"
    metadata = {
      name      = var.app_name
      namespace = var.environment
    }
    spec = {
      selector = { app = var.app_name }
      ports = [{
        port       = 80
        targetPort = 8080
        protocol   = "TCP"
      }]
      type = "ClusterIP"
    }
  }

  # Define the horizontal pod autoscaler
  k8s_hpa = {
    apiVersion = "autoscaling/v2"
    kind       = "HorizontalPodAutoscaler"
    metadata = {
      name      = var.app_name
      namespace = var.environment
    }
    spec = {
      scaleTargetRef = {
        apiVersion = "apps/v1"
        kind       = "Deployment"
        name       = var.app_name
      }
      minReplicas = var.min_replicas
      maxReplicas = var.max_replicas
      metrics = [{
        type = "Resource"
        resource = {
          name = "cpu"
          target = {
            type               = "Utilization"
            averageUtilization = 70
          }
        }
      }]
    }
  }
}

# Write each resource to its own file
resource "local_file" "service" {
  filename = "${path.module}/generated/service.yaml"
  content  = yamlencode(local.k8s_service)
}

resource "local_file" "hpa" {
  filename = "${path.module}/generated/hpa.yaml"
  content  = yamlencode(local.k8s_hpa)
}

# Or combine them into a single multi-document YAML file
resource "local_file" "all_resources" {
  filename = "${path.module}/generated/all-resources.yaml"
  content  = join("\n---\n", [
    yamlencode(local.deployment),
    yamlencode(local.k8s_service),
    yamlencode(local.k8s_hpa),
  ])
}
```

## Generating Helm Values

One of the most practical applications is generating Helm values files:

```hcl
locals {
  helm_values = {
    replicaCount = var.replicas

    image = {
      repository = "${var.ecr_repo}/${var.app_name}"
      tag        = var.image_tag
      pullPolicy = "IfNotPresent"
    }

    service = {
      type = "ClusterIP"
      port = 80
    }

    ingress = {
      enabled = true
      className = "nginx"
      annotations = {
        "cert-manager.io/cluster-issuer" = "letsencrypt-prod"
      }
      hosts = [{
        host = "${var.app_name}.${var.domain}"
        paths = [{
          path     = "/"
          pathType = "Prefix"
        }]
      }]
      tls = [{
        secretName = "${var.app_name}-tls"
        hosts      = ["${var.app_name}.${var.domain}"]
      }]
    }

    resources = {
      limits   = { cpu = "500m", memory = "512Mi" }
      requests = { cpu = "250m", memory = "256Mi" }
    }

    autoscaling = {
      enabled                        = true
      minReplicas                    = var.min_replicas
      maxReplicas                    = var.max_replicas
      targetCPUUtilizationPercentage = 70
    }

    env = [
      for key, value in var.app_env_vars :
      { name = key, value = value }
    ]
  }
}

resource "local_file" "helm_values" {
  filename = "${path.module}/generated/values-${var.environment}.yaml"
  content  = yamlencode(local.helm_values)
}

# Use the values file with a Helm release
resource "helm_release" "app" {
  name       = var.app_name
  repository = var.helm_repo
  chart      = var.helm_chart
  namespace  = var.environment
  values     = [yamlencode(local.helm_values)]
}
```

## Generating Monitoring Configurations

### Prometheus Alerting Rules

```hcl
variable "alert_rules" {
  type = list(object({
    name        = string
    expr        = string
    for         = string
    severity    = string
    description = string
  }))
  default = [
    {
      name        = "HighCPU"
      expr        = "rate(container_cpu_usage_seconds_total[5m]) > 0.8"
      for         = "5m"
      severity    = "warning"
      description = "CPU usage is above 80% for 5 minutes"
    },
    {
      name        = "HighMemory"
      expr        = "container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.9"
      for         = "5m"
      severity    = "critical"
      description = "Memory usage is above 90% for 5 minutes"
    },
  ]
}

locals {
  prometheus_rules = {
    apiVersion = "monitoring.coreos.com/v1"
    kind       = "PrometheusRule"
    metadata = {
      name      = "${var.app_name}-alerts"
      namespace = "monitoring"
    }
    spec = {
      groups = [{
        name = "${var.app_name}.rules"
        rules = [
          for rule in var.alert_rules : {
            alert = rule.name
            expr  = rule.expr
            for   = rule.for
            labels = {
              severity = rule.severity
              app      = var.app_name
            }
            annotations = {
              description = rule.description
            }
          }
        ]
      }]
    }
  }
}

resource "local_file" "prometheus_rules" {
  filename = "${path.module}/generated/prometheus-rules.yaml"
  content  = yamlencode(local.prometheus_rules)
}
```

## Generating CI/CD Pipelines

### GitHub Actions Workflow

```hcl
locals {
  github_workflow = {
    name = "Deploy ${var.app_name}"
    on = {
      push = {
        branches = ["main"]
      }
    }
    jobs = {
      deploy = {
        runs-on = "ubuntu-latest"
        steps = [
          {
            name = "Checkout"
            uses = "actions/checkout@v4"
          },
          {
            name = "Configure AWS Credentials"
            uses = "aws-actions/configure-aws-credentials@v4"
            with = {
              role-to-assume = var.deploy_role_arn
              aws-region     = var.region
            }
          },
          {
            name = "Deploy"
            run  = "./scripts/deploy.sh ${var.environment}"
            env = {
              CLUSTER_NAME = var.cluster_name
              SERVICE_NAME = var.app_name
            }
          },
        ]
      }
    }
  }
}

resource "local_file" "github_workflow" {
  filename = "${path.module}/generated/.github/workflows/deploy.yaml"
  content  = yamlencode(local.github_workflow)
}
```

## Formatting Tips

### Adding the Document Start Marker

YAML documents often start with `---`. Add it manually:

```hcl
resource "local_file" "config" {
  filename = "${path.module}/output/config.yaml"
  content  = "---\n${yamlencode(local.config_data)}"
}
```

### Adding Comments

Since `yamlencode` does not support comments, prepend them manually:

```hcl
locals {
  yaml_header = <<-EOT
    # Auto-generated by Terraform
    # Do not edit manually
    # Last updated: ${timestamp()}
    ---
  EOT

  yaml_content = yamlencode(local.config_data)
}

resource "local_file" "config" {
  filename = "${path.module}/output/config.yaml"
  content  = "${local.yaml_header}\n${local.yaml_content}"
}
```

## Common Patterns Summary

| Use Case | Pattern |
|----------|---------|
| Single file | `yamlencode(data)` |
| Multi-doc YAML | `join("\n---\n", [yamlencode(doc1), yamlencode(doc2)])` |
| With header | `"---\n${yamlencode(data)}"` |
| With comments | Prepend comment block to yaml output |
| Helm values | `helm_release { values = [yamlencode(data)] }` |

## Summary

Generating YAML output with `yamlencode` turns Terraform into a configuration generation engine. From Kubernetes manifests to Helm values, Prometheus rules to CI/CD pipelines, the pattern is always the same: build your data structure in Terraform, then serialize it with `yamlencode`. This approach gives you the full power of Terraform's variable interpolation, conditionals, and loops while producing clean YAML that other tools can consume. For reading YAML back into Terraform, see [yamldecode](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-yamldecode-function-in-terraform/view).
