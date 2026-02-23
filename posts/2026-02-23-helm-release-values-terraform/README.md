# How to Configure Helm Release Values in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Helm, Infrastructure as Code, DevOps

Description: Learn how to configure Helm release values in Terraform using the helm_release resource, including inline values, YAML files, sensitive values, and dynamic value generation.

---

When you deploy applications on Kubernetes using Helm charts, one of the most important tasks is getting the values right. The values file controls everything from replica counts and resource limits to feature flags and database connection strings. Terraform's Helm provider gives you several ways to pass values to a Helm release, and choosing the right approach makes a real difference in maintainability.

This guide walks through the different methods for configuring Helm release values in Terraform, with practical examples you can use in your own projects.

## Setting Up the Helm Provider

Before working with Helm releases, you need to configure the Helm provider. This tells Terraform how to connect to your Kubernetes cluster.

```hcl
# providers.tf
terraform {
  required_providers {
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }
}

# Configure the Helm provider to use your kubeconfig
provider "helm" {
  kubernetes {
    config_path    = "~/.kube/config"
    config_context = "my-cluster"
  }
}
```

## Inline Values with the set Block

The simplest way to pass values is using the `set` block. Each `set` block overrides a single value in the chart's values.yaml.

```hcl
# Deploy nginx with inline set values
resource "helm_release" "nginx" {
  name       = "my-nginx"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "nginx"
  namespace  = "web"
  version    = "15.4.0"

  # Override individual values using set blocks
  set {
    name  = "replicaCount"
    value = "3"
  }

  set {
    name  = "service.type"
    value = "ClusterIP"
  }

  # Nested values use dot notation
  set {
    name  = "resources.requests.memory"
    value = "128Mi"
  }

  set {
    name  = "resources.requests.cpu"
    value = "100m"
  }

  set {
    name  = "resources.limits.memory"
    value = "256Mi"
  }
}
```

The `set` block works well for a handful of values, but it gets verbose quickly. Each value needs its own block, which means a chart with 20 overrides turns into 20 separate blocks.

## Using the values Attribute with YAML

For more complex configurations, the `values` attribute lets you pass an entire YAML document as a string. This is much cleaner when you have lots of values to set.

```hcl
# Deploy with inline YAML values
resource "helm_release" "prometheus" {
  name       = "prometheus"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  namespace  = "monitoring"
  version    = "55.0.0"

  # Pass a complete YAML document as values
  values = [
    yamlencode({
      grafana = {
        enabled = true
        adminPassword = "change-me"
        ingress = {
          enabled = true
          hosts   = ["grafana.example.com"]
        }
      }
      prometheus = {
        prometheusSpec = {
          retention         = "30d"
          storageSpec = {
            volumeClaimTemplate = {
              spec = {
                accessModes = ["ReadWriteOnce"]
                resources = {
                  requests = {
                    storage = "50Gi"
                  }
                }
              }
            }
          }
        }
      }
    })
  ]
}
```

The `yamlencode` function converts an HCL map to a YAML string. This lets you use Terraform's native syntax while still producing the YAML that Helm expects.

## Loading Values from External YAML Files

When your values file gets large, keeping it inline becomes unwieldy. You can load values from separate YAML files instead.

```hcl
# Deploy using an external values file
resource "helm_release" "grafana" {
  name       = "grafana"
  repository = "https://grafana.github.io/helm-charts"
  chart      = "grafana"
  namespace  = "monitoring"
  version    = "7.0.0"

  # Load values from a file on disk
  values = [
    file("${path.module}/values/grafana-values.yaml")
  ]
}
```

And the corresponding values file:

```yaml
# values/grafana-values.yaml
replicaCount: 2

persistence:
  enabled: true
  size: 10Gi

datasources:
  datasources.yaml:
    apiVersion: 1
    datasources:
      - name: Prometheus
        type: prometheus
        url: http://prometheus-server.monitoring.svc.cluster.local
        access: proxy
        isDefault: true
```

## Combining Multiple Value Sources

Terraform's `values` attribute accepts a list of YAML strings. They get merged in order, with later values overriding earlier ones. This lets you layer configurations.

```hcl
# Layer multiple value sources together
resource "helm_release" "app" {
  name      = "my-app"
  chart     = "./charts/my-app"
  namespace = "production"

  # Base values come first, then environment-specific overrides
  values = [
    file("${path.module}/values/base.yaml"),
    file("${path.module}/values/${var.environment}.yaml"),
    yamlencode({
      image = {
        tag = var.image_tag
      }
    })
  ]
}
```

This pattern works well for multi-environment deployments. You keep shared configuration in a base file, environment-specific tweaks in separate files, and dynamic values (like image tags from CI) in inline HCL.

## Handling Sensitive Values

Some values are sensitive and should not appear in Terraform plan output. Use `set_sensitive` for these.

```hcl
# Deploy with sensitive values hidden from plan output
resource "helm_release" "database" {
  name       = "postgresql"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "postgresql"
  namespace  = "database"
  version    = "14.0.0"

  set {
    name  = "auth.postgresPassword"
    value = var.postgres_password
  }

  # Use set_sensitive to hide values in plan output
  set_sensitive {
    name  = "auth.password"
    value = var.db_password
  }

  set_sensitive {
    name  = "auth.replicationPassword"
    value = var.replication_password
  }
}

# Mark variables as sensitive too
variable "db_password" {
  type      = string
  sensitive = true
}

variable "replication_password" {
  type      = string
  sensitive = true
}
```

The `set_sensitive` block behaves the same as `set`, but Terraform redacts the value in the plan output. This is important for passwords, API keys, and other secrets.

## Dynamic Value Generation with Terraform Data

One of the biggest advantages of managing Helm values through Terraform is that you can reference other Terraform resources and data sources.

```hcl
# Look up the RDS endpoint dynamically
data "aws_db_instance" "main" {
  db_instance_identifier = "production-db"
}

# Look up the S3 bucket for storage
data "aws_s3_bucket" "assets" {
  bucket = "my-app-assets"
}

# Use Terraform data to generate Helm values dynamically
resource "helm_release" "app" {
  name      = "my-app"
  chart     = "./charts/my-app"
  namespace = "production"

  values = [
    yamlencode({
      database = {
        host     = data.aws_db_instance.main.endpoint
        port     = data.aws_db_instance.main.port
        name     = "myapp"
      }
      storage = {
        bucket = data.aws_s3_bucket.assets.id
        region = data.aws_s3_bucket.assets.region
      }
      env = var.environment
    })
  ]
}
```

This removes the need to hardcode infrastructure details in your values files. When your database endpoint changes, Terraform picks it up automatically.

## Using templatefile for Complex Values

When you need to inject Terraform variables into a YAML template, `templatefile` is your friend.

```hcl
# Use templatefile to inject variables into a YAML template
resource "helm_release" "app" {
  name      = "my-app"
  chart     = "./charts/my-app"
  namespace = var.namespace

  values = [
    templatefile("${path.module}/values/app.yaml.tpl", {
      environment   = var.environment
      domain        = var.domain
      replica_count = var.environment == "production" ? 3 : 1
      cpu_limit     = var.environment == "production" ? "1000m" : "500m"
      memory_limit  = var.environment == "production" ? "1Gi" : "512Mi"
    })
  ]
}
```

And the template file:

```yaml
# values/app.yaml.tpl
replicaCount: ${replica_count}

ingress:
  enabled: true
  hosts:
    - host: app.${domain}
      paths:
        - path: /
          pathType: Prefix

resources:
  limits:
    cpu: ${cpu_limit}
    memory: ${memory_limit}

env:
  - name: ENVIRONMENT
    value: ${environment}
```

## Working with List Values

Setting list values through `set` blocks requires special syntax with array indexing.

```hcl
# Set list values using array index notation
resource "helm_release" "nginx_ingress" {
  name       = "ingress-nginx"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  namespace  = "ingress"

  # Set list items with index notation
  set {
    name  = "controller.extraArgs.default-ssl-certificate"
    value = "ingress/wildcard-tls"
  }

  # For list values, use backslash-escaped braces
  set {
    name  = "controller.service.annotations.service\\.beta\\.kubernetes\\.io/aws-load-balancer-type"
    value = "nlb"
  }

  # Multiple list items
  set {
    name  = "controller.tolerations[0].key"
    value = "dedicated"
  }

  set {
    name  = "controller.tolerations[0].operator"
    value = "Equal"
  }

  set {
    name  = "controller.tolerations[0].value"
    value = "ingress"
  }

  set {
    name  = "controller.tolerations[0].effect"
    value = "NoSchedule"
  }
}
```

As you can see, list values with `set` blocks get messy fast. For anything involving lists, prefer the `values` attribute with `yamlencode` instead.

## Debugging Helm Values

When your Helm release is not deploying as expected, check what values Terraform is actually passing.

```hcl
# Output the computed values for debugging
output "helm_values" {
  value = helm_release.app.metadata
}

# You can also use terraform plan to see what values will be set
# Run: terraform plan -target=helm_release.app
```

You can also use `helm get values` after a deploy to verify what was applied:

```bash
# Check the actual values applied to the release
helm get values my-app -n production
```

## Best Practices

Keep these guidelines in mind when working with Helm values in Terraform:

- Use `values` with `yamlencode` for complex configurations instead of many `set` blocks
- Keep sensitive values in `set_sensitive` blocks or pass them through Terraform variables marked as sensitive
- Layer your values files: base configuration, environment overrides, then dynamic values
- Use `templatefile` sparingly - `yamlencode` with HCL maps is usually cleaner
- Pin your chart versions to avoid unexpected changes during applies
- Store values files alongside your Terraform code in version control

For more on deploying Kubernetes resources with Terraform, check out our guide on [handling Kubernetes resource dependencies](https://oneuptime.com/blog/post/2026-02-23-kubernetes-resource-dependencies-terraform/view).

Managing Helm values in Terraform gives you the best of both worlds: Helm's chart ecosystem and Terraform's state management, variable system, and dependency graph. Once you find the right pattern for your team, the workflow becomes straightforward and repeatable.
