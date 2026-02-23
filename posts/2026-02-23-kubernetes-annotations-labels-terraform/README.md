# How to Create Kubernetes Annotations and Labels with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Labels, Annotations, Infrastructure as Code

Description: Learn how to manage Kubernetes annotations and labels with Terraform, including best practices for organizing resources, using selectors, and applying consistent metadata across your cluster.

---

Labels and annotations are fundamental to how Kubernetes organizes, selects, and extends resources. Labels drive service discovery, scheduling, and network policies. Annotations carry metadata used by controllers, tools, and operators. Getting them right in Terraform means your Kubernetes resources are properly organized, discoverable, and functional from day one.

This guide covers how to manage both labels and annotations across different Kubernetes resources using the Terraform Kubernetes provider.

## Labels vs Annotations - When to Use Each

Before diving into Terraform code, a quick refresher on the difference. Labels are key-value pairs used for identification and selection. Kubernetes itself uses labels for things like matching pods to services and applying network policies. Labels have strict formatting rules - keys and values must be 63 characters or less and contain only alphanumeric characters, dashes, underscores, and dots.

Annotations are also key-value pairs, but they are for non-identifying metadata. They can contain arbitrary data - URLs, JSON strings, timestamps - and are typically consumed by controllers, tools, or humans. There is no length restriction on annotation values.

## Basic Labels on Kubernetes Resources

Here is how to set labels on a namespace and deployment.

```hcl
# Create a namespace with labels
resource "kubernetes_namespace" "app" {
  metadata {
    name = "my-application"

    # Labels help identify and select resources
    labels = {
      "app.kubernetes.io/name"       = "my-application"
      "app.kubernetes.io/managed-by" = "terraform"
      "app.kubernetes.io/part-of"    = "platform"
      "environment"                   = var.environment
      "team"                          = "backend"
    }
  }
}

# Create a deployment with matching labels
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "my-app"
    namespace = kubernetes_namespace.app.metadata[0].name

    # Labels on the deployment itself
    labels = {
      "app.kubernetes.io/name"       = "my-app"
      "app.kubernetes.io/version"    = var.app_version
      "app.kubernetes.io/component"  = "api"
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }

  spec {
    replicas = 3

    # Selector must match pod template labels
    selector {
      match_labels = {
        "app.kubernetes.io/name"      = "my-app"
        "app.kubernetes.io/component" = "api"
      }
    }

    template {
      metadata {
        # Pod template labels - must include selector labels
        labels = {
          "app.kubernetes.io/name"      = "my-app"
          "app.kubernetes.io/version"   = var.app_version
          "app.kubernetes.io/component" = "api"
        }
      }

      spec {
        container {
          name  = "api"
          image = "my-app:${var.app_version}"
        }
      }
    }
  }
}
```

## Annotations for Controllers and Tools

Annotations are how you communicate with Kubernetes controllers and external tools. Different tools look for specific annotations to change their behavior.

```hcl
# Service with annotations for cloud load balancer configuration
resource "kubernetes_service" "app" {
  metadata {
    name      = "my-app"
    namespace = kubernetes_namespace.app.metadata[0].name

    labels = {
      "app.kubernetes.io/name" = "my-app"
    }

    # Annotations configure external tools and controllers
    annotations = {
      # AWS load balancer controller annotations
      "service.beta.kubernetes.io/aws-load-balancer-type"            = "nlb"
      "service.beta.kubernetes.io/aws-load-balancer-scheme"          = "internet-facing"
      "service.beta.kubernetes.io/aws-load-balancer-ssl-cert"        = var.acm_certificate_arn
      "service.beta.kubernetes.io/aws-load-balancer-ssl-ports"       = "443"
      "service.beta.kubernetes.io/aws-load-balancer-backend-protocol" = "http"

      # External DNS annotation for automatic DNS record creation
      "external-dns.alpha.kubernetes.io/hostname" = "api.example.com"
    }
  }

  spec {
    selector = {
      "app.kubernetes.io/name" = "my-app"
    }

    port {
      name        = "https"
      port        = 443
      target_port = 8080
    }

    type = "LoadBalancer"
  }
}
```

## Using Common Labels with Local Values

To keep labels consistent across resources, define common labels in a locals block and merge them.

```hcl
# Define common labels once and reuse them everywhere
locals {
  common_labels = {
    "app.kubernetes.io/managed-by" = "terraform"
    "app.kubernetes.io/part-of"    = var.project_name
    "environment"                   = var.environment
    "team"                          = var.team
  }

  app_labels = merge(local.common_labels, {
    "app.kubernetes.io/name"    = "my-app"
    "app.kubernetes.io/version" = var.app_version
  })

  # Selector labels should be a subset - only immutable identifiers
  selector_labels = {
    "app.kubernetes.io/name" = "my-app"
  }
}

resource "kubernetes_deployment" "app" {
  metadata {
    name      = "my-app"
    namespace = "production"
    labels    = local.app_labels
  }

  spec {
    replicas = 3

    selector {
      match_labels = local.selector_labels
    }

    template {
      metadata {
        labels = local.app_labels
      }

      spec {
        container {
          name  = "app"
          image = "my-app:${var.app_version}"
        }
      }
    }
  }
}

# The service uses the same selector labels
resource "kubernetes_service" "app" {
  metadata {
    name      = "my-app"
    namespace = "production"
    labels    = local.app_labels
  }

  spec {
    selector = local.selector_labels

    port {
      port        = 80
      target_port = 8080
    }
  }
}
```

## Dynamic Labels with for_each

When creating multiple similar resources, you can dynamically generate labels.

```hcl
# Define multiple microservices with their specific labels
variable "services" {
  type = map(object({
    image     = string
    port      = number
    component = string
    replicas  = number
  }))
  default = {
    api = {
      image     = "my-app-api:1.0"
      port      = 8080
      component = "api"
      replicas  = 3
    }
    worker = {
      image     = "my-app-worker:1.0"
      port      = 9090
      component = "worker"
      replicas  = 2
    }
  }
}

# Create deployments dynamically with proper labels
resource "kubernetes_deployment" "services" {
  for_each = var.services

  metadata {
    name      = each.key
    namespace = "production"

    # Merge common labels with service-specific labels
    labels = merge(local.common_labels, {
      "app.kubernetes.io/name"      = each.key
      "app.kubernetes.io/component" = each.value.component
    })
  }

  spec {
    replicas = each.value.replicas

    selector {
      match_labels = {
        "app.kubernetes.io/name" = each.key
      }
    }

    template {
      metadata {
        labels = merge(local.common_labels, {
          "app.kubernetes.io/name"      = each.key
          "app.kubernetes.io/component" = each.value.component
        })

        # Add pod-level annotations for monitoring
        annotations = {
          "prometheus.io/scrape" = "true"
          "prometheus.io/port"   = tostring(each.value.port)
          "prometheus.io/path"   = "/metrics"
        }
      }

      spec {
        container {
          name  = each.key
          image = each.value.image

          port {
            container_port = each.value.port
          }
        }
      }
    }
  }
}
```

## Ingress Annotations

Ingress resources rely heavily on annotations to configure the ingress controller's behavior.

```hcl
# Ingress with controller-specific annotations
resource "kubernetes_ingress_v1" "app" {
  metadata {
    name      = "my-app"
    namespace = "production"

    labels = local.app_labels

    annotations = {
      # NGINX ingress controller annotations
      "nginx.ingress.kubernetes.io/rewrite-target"       = "/"
      "nginx.ingress.kubernetes.io/ssl-redirect"         = "true"
      "nginx.ingress.kubernetes.io/proxy-body-size"      = "50m"
      "nginx.ingress.kubernetes.io/proxy-read-timeout"   = "60"
      "nginx.ingress.kubernetes.io/proxy-send-timeout"   = "60"
      "nginx.ingress.kubernetes.io/limit-rps"            = "100"

      # cert-manager annotation for automatic TLS certificates
      "cert-manager.io/cluster-issuer" = "letsencrypt-prod"
    }
  }

  spec {
    ingress_class_name = "nginx"

    tls {
      hosts       = ["app.example.com"]
      secret_name = "app-tls"
    }

    rule {
      host = "app.example.com"

      http {
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = "my-app"
              port {
                number = 80
              }
            }
          }
        }
      }
    }
  }
}
```

## Handling Label Changes Carefully

One important thing to know: changing selector labels on an existing deployment will force Terraform to destroy and recreate it. This causes downtime. Structure your labels so that selector labels are stable, and put changing values (like version numbers) only in non-selector labels.

```hcl
# Selector labels should never change after creation
locals {
  # These are stable - never change them
  selector_labels = {
    "app.kubernetes.io/name"      = "my-app"
    "app.kubernetes.io/component" = "api"
  }

  # These can change safely
  pod_labels = merge(local.selector_labels, {
    "app.kubernetes.io/version" = var.app_version
    "config-hash"               = md5(jsonencode(var.config))
  })
}
```

## Annotation-Based Configuration Pattern

A useful pattern is storing configuration metadata in annotations to track what Terraform applied.

```hcl
# Track Terraform metadata in annotations
resource "kubernetes_config_map" "app" {
  metadata {
    name      = "app-config"
    namespace = "production"

    labels = local.common_labels

    annotations = {
      # Track deployment metadata
      "terraform.io/module"     = "app-config"
      "terraform.io/workspace"  = terraform.workspace
      "terraform.io/applied-at" = timestamp()
      "app.example.com/config-version" = var.config_version
    }
  }

  data = {
    "config.yaml" = yamlencode(var.app_config)
  }

  lifecycle {
    # Prevent annotation changes from triggering unnecessary updates
    ignore_changes = [
      metadata[0].annotations["terraform.io/applied-at"]
    ]
  }
}
```

## Best Practices

Follow these guidelines for labels and annotations:

- Use the [recommended Kubernetes labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/) (`app.kubernetes.io/*`) for standard metadata
- Keep selector labels minimal and immutable
- Define common labels in `locals` and merge them per resource
- Use annotations for tool-specific configuration, not labels
- Do not put frequently-changing values in labels used by selectors
- Use `ignore_changes` in lifecycle blocks for auto-generated annotations you do not want Terraform to fight over

For more Terraform and Kubernetes patterns, see our guide on [handling Kubernetes resource updates in Terraform](https://oneuptime.com/blog/post/2026-02-23-kubernetes-resource-updates-terraform/view).
