# How to Configure Terraform Dynamic Blocks for Kubernetes Container Definitions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Infrastructure as Code

Description: Learn how to use Terraform dynamic blocks to generate flexible and reusable Kubernetes container definitions, reducing code duplication and improving maintainability.

---

Managing Kubernetes container definitions in Terraform can become repetitive and difficult to maintain when you need to deploy similar containers with slight variations. Dynamic blocks provide an elegant solution by allowing you to generate nested configuration blocks programmatically based on input variables or data structures.

## Understanding Dynamic Blocks

Dynamic blocks in Terraform act as a loop construct that generates multiple nested blocks within a resource or module. Instead of manually writing out each container definition, you can define the structure once and iterate over a collection to create multiple instances.

The basic syntax follows this pattern:

```hcl
dynamic "block_name" {
  for_each = var.collection
  content {
    # Block configuration using each.value
  }
}
```

## Basic Container Definition with Dynamic Blocks

Let's start with a simple example where we define multiple containers in a Kubernetes deployment. Instead of hardcoding each container, we'll use a variable to define them:

```hcl
# variables.tf
variable "containers" {
  description = "List of containers to deploy"
  type = list(object({
    name  = string
    image = string
    port  = number
  }))
  default = [
    {
      name  = "nginx"
      image = "nginx:1.21"
      port  = 80
    },
    {
      name  = "sidecar"
      image = "busybox:latest"
      port  = 8080
    }
  ]
}

# deployment.tf
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "multi-container-app"
    namespace = "default"
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "multi-container"
      }
    }

    template {
      metadata {
        labels = {
          app = "multi-container"
        }
      }

      spec {
        # Dynamic block for containers
        dynamic "container" {
          for_each = var.containers
          content {
            name  = container.value.name
            image = container.value.image

            port {
              container_port = container.value.port
            }
          }
        }
      }
    }
  }
}
```

This approach lets you add or remove containers by simply modifying the variable, without touching the resource definition.

## Advanced Container Configuration

Real-world applications require more complex configurations including environment variables, volume mounts, resource limits, and health checks. Let's expand our dynamic blocks to handle these scenarios:

```hcl
# variables.tf
variable "advanced_containers" {
  description = "Advanced container definitions with full configuration"
  type = list(object({
    name            = string
    image           = string
    port            = number
    cpu_request     = string
    memory_request  = string
    cpu_limit       = string
    memory_limit    = string
    env_vars        = map(string)
    volume_mounts   = list(object({
      name       = string
      mount_path = string
      read_only  = bool
    }))
    liveness_probe = object({
      path                = string
      port                = number
      initial_delay       = number
      period              = number
    })
  }))
}

# deployment.tf
resource "kubernetes_deployment" "advanced_app" {
  metadata {
    name      = "advanced-app"
    namespace = "production"
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "advanced"
      }
    }

    template {
      metadata {
        labels = {
          app = "advanced"
        }
      }

      spec {
        dynamic "container" {
          for_each = var.advanced_containers
          content {
            name  = container.value.name
            image = container.value.image

            port {
              container_port = container.value.port
            }

            # Resource limits and requests
            resources {
              requests = {
                cpu    = container.value.cpu_request
                memory = container.value.memory_request
              }
              limits = {
                cpu    = container.value.cpu_limit
                memory = container.value.memory_limit
              }
            }

            # Dynamic environment variables
            dynamic "env" {
              for_each = container.value.env_vars
              content {
                name  = env.key
                value = env.value
              }
            }

            # Dynamic volume mounts
            dynamic "volume_mount" {
              for_each = container.value.volume_mounts
              content {
                name       = volume_mount.value.name
                mount_path = volume_mount.value.mount_path
                read_only  = volume_mount.value.read_only
              }
            }

            # Liveness probe
            liveness_probe {
              http_get {
                path = container.value.liveness_probe.path
                port = container.value.liveness_probe.port
              }
              initial_delay_seconds = container.value.liveness_probe.initial_delay
              period_seconds        = container.value.liveness_probe.period
            }
          }
        }

        # Define volumes referenced by containers
        volume {
          name = "config-volume"
          config_map {
            name = "app-config"
          }
        }

        volume {
          name = "data-volume"
          persistent_volume_claim {
            claim_name = "data-pvc"
          }
        }
      }
    }
  }
}
```

Notice how we nest dynamic blocks within dynamic blocks. The outer dynamic block creates each container, while inner dynamic blocks generate environment variables and volume mounts for each container.

## Using terraform.tfvars for Configuration

To use this setup, create a terraform.tfvars file with your container definitions:

```hcl
advanced_containers = [
  {
    name           = "api"
    image          = "myapp/api:v1.2.3"
    port           = 8000
    cpu_request    = "100m"
    memory_request = "128Mi"
    cpu_limit      = "500m"
    memory_limit   = "512Mi"
    env_vars = {
      DATABASE_URL = "postgres://db:5432/myapp"
      LOG_LEVEL    = "info"
      CACHE_ENABLED = "true"
    }
    volume_mounts = [
      {
        name       = "config-volume"
        mount_path = "/etc/config"
        read_only  = true
      }
    ]
    liveness_probe = {
      path          = "/health"
      port          = 8000
      initial_delay = 30
      period        = 10
    }
  },
  {
    name           = "worker"
    image          = "myapp/worker:v1.2.3"
    port           = 9000
    cpu_request    = "200m"
    memory_request = "256Mi"
    cpu_limit      = "1000m"
    memory_limit   = "1Gi"
    env_vars = {
      QUEUE_URL     = "redis://redis:6379"
      WORKER_THREADS = "4"
    }
    volume_mounts = [
      {
        name       = "data-volume"
        mount_path = "/data"
        read_only  = false
      }
    ]
    liveness_probe = {
      path          = "/healthz"
      port          = 9000
      initial_delay = 15
      period        = 5
    }
  }
]
```

## Conditional Container Configuration

Sometimes you want to include containers only under certain conditions. You can combine dynamic blocks with conditional expressions:

```hcl
variable "enable_monitoring" {
  description = "Enable Prometheus monitoring sidecar"
  type        = bool
  default     = true
}

variable "monitoring_container" {
  description = "Monitoring sidecar configuration"
  type = object({
    name  = string
    image = string
    port  = number
  })
  default = {
    name  = "prometheus-exporter"
    image = "prom/node-exporter:latest"
    port  = 9100
  }
}

locals {
  # Conditionally add monitoring container to the list
  all_containers = concat(
    var.advanced_containers,
    var.enable_monitoring ? [var.monitoring_container] : []
  )
}

# Use local.all_containers in the dynamic block
dynamic "container" {
  for_each = local.all_containers
  content {
    name  = container.value.name
    image = container.value.image
    # ... rest of configuration
  }
}
```

## Best Practices for Dynamic Container Blocks

When using dynamic blocks for container definitions, follow these guidelines:

1. **Keep variable structures consistent** - Use object types with clear schemas to prevent configuration errors.

2. **Validate inputs** - Add validation rules to your variables to catch mistakes early.

3. **Use locals for transformations** - When you need to manipulate data before using it in dynamic blocks, use local values.

4. **Document your variables** - Clear descriptions help team members understand what each field does.

5. **Avoid over-nesting** - Too many nested dynamic blocks become hard to read. Consider breaking complex configurations into separate modules.

6. **Test with terraform plan** - Always review the plan output to ensure dynamic blocks generate the expected configuration.

## Dynamic Blocks with Init Containers

You can also use dynamic blocks for init containers, which run before your main containers:

```hcl
variable "init_containers" {
  description = "Init containers that run before main containers"
  type = list(object({
    name    = string
    image   = string
    command = list(string)
  }))
  default = []
}

# In the pod spec
dynamic "init_container" {
  for_each = var.init_containers
  content {
    name    = init_container.value.name
    image   = init_container.value.image
    command = init_container.value.command
  }
}
```

Dynamic blocks transform how you manage Kubernetes container definitions in Terraform. By defining reusable patterns and leveraging variables, you create infrastructure code that's easier to maintain, test, and scale across multiple environments. The key is finding the right balance between flexibility and simplicity, ensuring your team can understand and modify the configuration as needed.
