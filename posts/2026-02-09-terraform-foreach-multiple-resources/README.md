# How to Use Terraform for_each to Create Multiple Kubernetes Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Infrastructure as Code

Description: Master the for_each meta-argument in Terraform to efficiently create multiple Kubernetes resources from maps and sets, improving code maintainability and reducing duplication.

---

When managing Kubernetes infrastructure with Terraform, you often need to create multiple similar resources such as namespaces, deployments, or services. The for_each meta-argument provides a powerful way to iterate over collections and create multiple resource instances with a single resource block. Unlike count, for_each uses map keys or set values to identify resources, making your infrastructure more maintainable and less prone to errors during modifications.

## Understanding for_each Basics

The for_each meta-argument accepts either a map or a set of strings. Terraform creates one resource instance for each element in the collection. You access the current element using each.key and each.value within the resource block.

Here's the fundamental difference between count and for_each:

- **count** creates resources identified by index numbers (0, 1, 2). Adding or removing items in the middle causes Terraform to recreate downstream resources.
- **for_each** creates resources identified by map keys or set values. Adding or removing items only affects those specific resources.

## Creating Multiple Namespaces

Let's start with a practical example of creating multiple Kubernetes namespaces for different teams:

```hcl
# variables.tf
variable "teams" {
  description = "Map of team namespaces with configuration"
  type = map(object({
    resource_quota_cpu    = string
    resource_quota_memory = string
    network_policy        = bool
  }))
  default = {
    frontend = {
      resource_quota_cpu    = "10"
      resource_quota_memory = "20Gi"
      network_policy        = true
    }
    backend = {
      resource_quota_cpu    = "20"
      resource_quota_memory = "40Gi"
      network_policy        = true
    }
    data = {
      resource_quota_cpu    = "15"
      resource_quota_memory = "60Gi"
      network_policy        = false
    }
  }
}

# namespaces.tf
resource "kubernetes_namespace" "team" {
  for_each = var.teams

  metadata {
    name = each.key
    labels = {
      team        = each.key
      managed-by  = "terraform"
    }
  }
}

resource "kubernetes_resource_quota" "team" {
  for_each = var.teams

  metadata {
    name      = "${each.key}-quota"
    namespace = kubernetes_namespace.team[each.key].metadata[0].name
  }

  spec {
    hard = {
      "requests.cpu"    = each.value.resource_quota_cpu
      "requests.memory" = each.value.resource_quota_memory
      "limits.cpu"      = each.value.resource_quota_cpu
      "limits.memory"   = each.value.resource_quota_memory
    }
  }
}
```

This configuration creates three namespaces, each with its own resource quota. If you add a new team or remove an existing one, Terraform only creates or destroys that specific namespace, leaving others untouched.

## Managing Multiple Deployments with for_each

Complex applications often consist of multiple microservices. Using for_each, you can define all services in a single variable and deploy them with consistent configuration:

```hcl
# variables.tf
variable "microservices" {
  description = "Microservices to deploy"
  type = map(object({
    image          = string
    replicas       = number
    port           = number
    cpu_request    = string
    memory_request = string
    env_vars       = map(string)
  }))
}

# terraform.tfvars
microservices = {
  api-gateway = {
    image          = "myapp/api-gateway:v2.1.0"
    replicas       = 3
    port           = 8080
    cpu_request    = "500m"
    memory_request = "512Mi"
    env_vars = {
      LOG_LEVEL = "info"
      PORT      = "8080"
    }
  }
  auth-service = {
    image          = "myapp/auth-service:v1.5.2"
    replicas       = 2
    port           = 8081
    cpu_request    = "250m"
    memory_request = "256Mi"
    env_vars = {
      LOG_LEVEL    = "debug"
      PORT         = "8081"
      TOKEN_EXPIRY = "3600"
    }
  }
  user-service = {
    image          = "myapp/user-service:v1.3.0"
    replicas       = 2
    port           = 8082
    cpu_request    = "250m"
    memory_request = "256Mi"
    env_vars = {
      LOG_LEVEL = "info"
      PORT      = "8082"
    }
  }
}

# deployments.tf
resource "kubernetes_deployment" "microservice" {
  for_each = var.microservices

  metadata {
    name      = each.key
    namespace = "production"
    labels = {
      app = each.key
    }
  }

  spec {
    replicas = each.value.replicas

    selector {
      match_labels = {
        app = each.key
      }
    }

    template {
      metadata {
        labels = {
          app = each.key
        }
      }

      spec {
        container {
          name  = each.key
          image = each.value.image

          port {
            container_port = each.value.port
          }

          resources {
            requests = {
              cpu    = each.value.cpu_request
              memory = each.value.memory_request
            }
          }

          dynamic "env" {
            for_each = each.value.env_vars
            content {
              name  = env.key
              value = env.value
            }
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "microservice" {
  for_each = var.microservices

  metadata {
    name      = each.key
    namespace = "production"
  }

  spec {
    selector = {
      app = each.key
    }

    port {
      port        = each.value.port
      target_port = each.value.port
    }

    type = "ClusterIP"
  }
}
```

This approach creates both a deployment and service for each microservice. The each.key value serves as the service name, making it easy to reference services consistently.

## Using for_each with Sets

When you don't need additional metadata, sets provide a cleaner syntax. Here's an example creating ConfigMaps for multiple environments:

```hcl
variable "environments" {
  description = "Environments to create ConfigMaps for"
  type        = set(string)
  default     = ["development", "staging", "production"]
}

resource "kubernetes_config_map" "app_config" {
  for_each = var.environments

  metadata {
    name      = "app-config-${each.key}"
    namespace = "default"
  }

  data = {
    environment  = each.key
    api_endpoint = "https://api.${each.key}.example.com"
    log_level    = each.key == "production" ? "warn" : "debug"
  }
}
```

## Combining for_each with Local Values

Sometimes you need to transform data before using it with for_each. Local values allow you to process and merge data from multiple sources:

```hcl
variable "base_services" {
  description = "Base services configuration"
  type = map(object({
    image    = string
    replicas = number
  }))
}

variable "enable_monitoring" {
  description = "Enable monitoring services"
  type        = bool
  default     = true
}

locals {
  # Conditionally add monitoring services
  monitoring_services = var.enable_monitoring ? {
    prometheus = {
      image    = "prom/prometheus:latest"
      replicas = 1
    }
    grafana = {
      image    = "grafana/grafana:latest"
      replicas = 1
    }
  } : {}

  # Merge base and monitoring services
  all_services = merge(var.base_services, local.monitoring_services)

  # Transform service names to include namespace prefix
  namespaced_services = {
    for name, config in local.all_services :
    "prod-${name}" => config
  }
}

resource "kubernetes_deployment" "service" {
  for_each = local.namespaced_services

  metadata {
    name      = each.key
    namespace = "production"
  }

  spec {
    replicas = each.value.replicas

    selector {
      match_labels = {
        app = each.key
      }
    }

    template {
      metadata {
        labels = {
          app = each.key
        }
      }

      spec {
        container {
          name  = each.key
          image = each.value.image
        }
      }
    }
  }
}
```

## Creating Multiple Ingress Rules

Ingress configuration benefits greatly from for_each, especially when managing multiple domains or paths:

```hcl
variable "ingress_rules" {
  description = "Ingress routing rules"
  type = map(object({
    host         = string
    service_name = string
    service_port = number
    path         = string
  }))
  default = {
    api = {
      host         = "api.example.com"
      service_name = "api-gateway"
      service_port = 8080
      path         = "/"
    }
    auth = {
      host         = "auth.example.com"
      service_name = "auth-service"
      service_port = 8081
      path         = "/"
    }
    admin = {
      host         = "admin.example.com"
      service_name = "admin-panel"
      service_port = 3000
      path         = "/"
    }
  }
}

resource "kubernetes_ingress_v1" "app" {
  metadata {
    name      = "app-ingress"
    namespace = "production"
    annotations = {
      "kubernetes.io/ingress.class"                = "nginx"
      "cert-manager.io/cluster-issuer"             = "letsencrypt-prod"
      "nginx.ingress.kubernetes.io/ssl-redirect"   = "true"
    }
  }

  spec {
    dynamic "rule" {
      for_each = var.ingress_rules
      content {
        host = rule.value.host

        http {
          path {
            path      = rule.value.path
            path_type = "Prefix"

            backend {
              service {
                name = rule.value.service_name
                port {
                  number = rule.value.service_port
                }
              }
            }
          }
        }
      }
    }

    dynamic "tls" {
      for_each = var.ingress_rules
      content {
        hosts       = [tls.value.host]
        secret_name = "${tls.key}-tls"
      }
    }
  }
}
```

## Referencing for_each Resources

When you create resources with for_each, you access them using map notation in other resources:

```hcl
# Create multiple secrets
resource "kubernetes_secret" "db_credentials" {
  for_each = toset(["app1", "app2", "app3"])

  metadata {
    name      = "${each.key}-db-secret"
    namespace = "default"
  }

  data = {
    username = "user_${each.key}"
    password = random_password.db_password[each.key].result
  }
}

resource "random_password" "db_password" {
  for_each = toset(["app1", "app2", "app3"])

  length  = 16
  special = true
}

# Reference specific secret in deployment
resource "kubernetes_deployment" "app1" {
  metadata {
    name = "app1"
  }

  spec {
    template {
      spec {
        container {
          name = "app1"

          env {
            name = "DB_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.db_credentials["app1"].metadata[0].name
                key  = "password"
              }
            }
          }
        }
      }
    }
  }
}
```

## Best Practices for for_each

Follow these guidelines when using for_each:

1. **Use descriptive keys** - Choose meaningful names that identify resources clearly.

2. **Prefer maps over sets for complex data** - Maps allow you to store configuration alongside keys.

3. **Use toset() for string lists** - Convert lists to sets when you only have simple string values.

4. **Avoid changing keys** - Renaming a map key destroys and recreates the resource. Plan key names carefully.

5. **Validate input with variable validation** - Catch configuration errors before applying.

6. **Use locals for data transformation** - Keep resource blocks clean by processing data in locals.

The for_each meta-argument makes Terraform configurations more maintainable and safer to modify. By identifying resources with meaningful keys instead of numeric indices, you reduce the risk of accidental resource recreation and make your infrastructure code easier to understand and extend.
