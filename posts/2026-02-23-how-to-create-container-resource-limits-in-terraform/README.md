# How to Create Container Resource Limits in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Containers, Resources, Kubernetes, ECS, Performance

Description: Learn how to configure container resource limits and requests in Terraform for Kubernetes, ECS, and other platforms to ensure optimal performance and stability.

---

Resource limits are fundamental to running containers in production. Without proper resource constraints, a single runaway container can consume all available CPU and memory, starving other containers on the same host. Resource requests ensure your containers get the minimum resources they need to function, while limits cap the maximum they can consume. Terraform provides a consistent way to define these constraints across container platforms.

This guide covers how to configure container resource limits in Terraform for Kubernetes, AWS ECS, and Azure Container Apps, including best practices for sizing and troubleshooting.

## Understanding Requests vs Limits

In Kubernetes, resource management uses two concepts:

- **Requests**: The guaranteed minimum resources for a container. The scheduler uses requests to decide which node to place the pod on.
- **Limits**: The maximum resources a container can use. If a container exceeds its memory limit, it is killed (OOMKilled). CPU is throttled when limits are exceeded.

In ECS, you allocate CPU and memory at the task level and optionally at the container level within that allocation.

## Kubernetes Resource Limits

### Basic Resource Configuration

```hcl
# Kubernetes deployment with resource limits
resource "kubernetes_deployment" "api" {
  metadata {
    name = "api-service"
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "api-service"
      }
    }

    template {
      metadata {
        labels = {
          app = "api-service"
        }
      }

      spec {
        container {
          name  = "api"
          image = "myregistry.example.com/api:v2.0"

          resources {
            # Minimum guaranteed resources
            requests = {
              cpu    = "250m"    # 0.25 CPU cores
              memory = "256Mi"   # 256 MiB of memory
            }

            # Maximum allowed resources
            limits = {
              cpu    = "500m"    # 0.5 CPU cores
              memory = "512Mi"   # 512 MiB of memory
            }
          }

          port {
            container_port = 8080
          }
        }
      }
    }
  }
}
```

### Resource Limits with Variables

Use variables for flexible resource configuration across environments:

```hcl
# Resource configuration variables
variable "resource_profiles" {
  description = "Resource profiles for different service tiers"
  type = map(object({
    cpu_request    = string
    cpu_limit      = string
    memory_request = string
    memory_limit   = string
    replicas       = number
  }))
  default = {
    small = {
      cpu_request    = "100m"
      cpu_limit      = "250m"
      memory_request = "128Mi"
      memory_limit   = "256Mi"
      replicas       = 2
    }
    medium = {
      cpu_request    = "250m"
      cpu_limit      = "500m"
      memory_request = "256Mi"
      memory_limit   = "512Mi"
      replicas       = 3
    }
    large = {
      cpu_request    = "500m"
      cpu_limit      = "1000m"
      memory_request = "512Mi"
      memory_limit   = "1Gi"
      replicas       = 5
    }
    xlarge = {
      cpu_request    = "1000m"
      cpu_limit      = "2000m"
      memory_request = "1Gi"
      memory_limit   = "2Gi"
      replicas       = 5
    }
  }
}

variable "service_profile" {
  description = "Which resource profile to use"
  type        = string
  default     = "medium"
}

# Deployment using the selected profile
resource "kubernetes_deployment" "app" {
  metadata {
    name = "my-app"
  }

  spec {
    replicas = var.resource_profiles[var.service_profile].replicas

    selector {
      match_labels = {
        app = "my-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "my-app"
        }
      }

      spec {
        container {
          name  = "app"
          image = "myregistry.example.com/app:v1.0"

          resources {
            requests = {
              cpu    = var.resource_profiles[var.service_profile].cpu_request
              memory = var.resource_profiles[var.service_profile].memory_request
            }
            limits = {
              cpu    = var.resource_profiles[var.service_profile].cpu_limit
              memory = var.resource_profiles[var.service_profile].memory_limit
            }
          }
        }
      }
    }
  }
}
```

### Namespace-Level Resource Quotas

Enforce resource limits at the namespace level:

```hcl
# Resource quota for a namespace
resource "kubernetes_resource_quota" "team_quota" {
  metadata {
    name      = "team-resource-quota"
    namespace = kubernetes_namespace.team.metadata[0].name
  }

  spec {
    hard = {
      # Total CPU requests allowed in this namespace
      "requests.cpu" = "10"
      # Total CPU limits allowed
      "limits.cpu" = "20"
      # Total memory requests allowed
      "requests.memory" = "20Gi"
      # Total memory limits allowed
      "limits.memory" = "40Gi"
      # Maximum number of pods
      pods = "50"
      # Maximum number of services
      services = "20"
      # Maximum persistent volume claims
      persistentvolumeclaims = "10"
    }
  }
}

# Limit range for default resource constraints
resource "kubernetes_limit_range" "defaults" {
  metadata {
    name      = "default-limits"
    namespace = kubernetes_namespace.team.metadata[0].name
  }

  spec {
    limit {
      type = "Container"

      # Default limits applied when none are specified
      default = {
        cpu    = "500m"
        memory = "512Mi"
      }

      # Default requests applied when none are specified
      default_request = {
        cpu    = "100m"
        memory = "128Mi"
      }

      # Maximum limits any container can request
      max = {
        cpu    = "4"
        memory = "8Gi"
      }

      # Minimum limits any container must have
      min = {
        cpu    = "50m"
        memory = "64Mi"
      }
    }

    limit {
      type = "Pod"

      max = {
        cpu    = "8"
        memory = "16Gi"
      }
    }
  }
}
```

## AWS ECS Resource Configuration

### Fargate Task Resources

```hcl
# ECS Fargate valid CPU/memory combinations:
# CPU (units)  | Memory (MiB)
# 256          | 512, 1024, 2048
# 512          | 1024-4096 (in 1024 increments)
# 1024         | 2048-8192 (in 1024 increments)
# 2048         | 4096-16384 (in 1024 increments)
# 4096         | 8192-30720 (in 1024 increments)

variable "ecs_resources" {
  description = "ECS task resource configuration"
  type = object({
    cpu    = number
    memory = number
    containers = map(object({
      cpu    = number
      memory = number
    }))
  })
  default = {
    cpu    = 1024  # Total task CPU (1 vCPU)
    memory = 2048  # Total task memory (2 GB)
    containers = {
      app = {
        cpu    = 768   # Container-level CPU reservation
        memory = 1536  # Container-level memory hard limit
      }
      sidecar = {
        cpu    = 256   # Remaining CPU for sidecar
        memory = 512   # Remaining memory for sidecar
      }
    }
  }
}

# ECS task definition with resource allocation
resource "aws_ecs_task_definition" "app" {
  family                   = "my-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"

  # Task-level resources (total for all containers)
  cpu    = var.ecs_resources.cpu
  memory = var.ecs_resources.memory

  execution_role_arn = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "${aws_ecr_repository.app.repository_url}:v1.0"
      essential = true

      # Container-level resource allocation
      cpu            = var.ecs_resources.containers["app"].cpu
      memory         = var.ecs_resources.containers["app"].memory
      # Soft limit - container can use more if available
      memoryReservation = var.ecs_resources.containers["app"].memory - 256

      portMappings = [
        { containerPort = 8080, protocol = "tcp" }
      ]
    },
    {
      name      = "datadog"
      image     = "public.ecr.aws/datadog/agent:latest"
      essential = false

      cpu            = var.ecs_resources.containers["sidecar"].cpu
      memory         = var.ecs_resources.containers["sidecar"].memory
      memoryReservation = 256
    }
  ])
}
```

## Vertical Pod Autoscaler Configuration

Automatically adjust resource limits based on usage:

```hcl
# Vertical Pod Autoscaler for automatic resource tuning
resource "kubernetes_manifest" "vpa" {
  manifest = {
    apiVersion = "autoscaling.k8s.io/v1"
    kind       = "VerticalPodAutoscaler"
    metadata = {
      name      = "api-vpa"
      namespace = "default"
    }
    spec = {
      targetRef = {
        apiVersion = "apps/v1"
        kind       = "Deployment"
        name       = kubernetes_deployment.api.metadata[0].name
      }
      updatePolicy = {
        updateMode = "Auto"  # Automatically apply recommendations
      }
      resourcePolicy = {
        containerPolicies = [
          {
            containerName = "api"
            minAllowed = {
              cpu    = "100m"
              memory = "128Mi"
            }
            maxAllowed = {
              cpu    = "2"
              memory = "4Gi"
            }
          }
        ]
      }
    }
  }
}
```

## Outputs

```hcl
output "resource_profile" {
  description = "Active resource profile"
  value       = var.service_profile
}

output "total_cpu_allocated" {
  description = "Total CPU allocated across all replicas"
  value       = "${var.resource_profiles[var.service_profile].replicas} x ${var.resource_profiles[var.service_profile].cpu_request}"
}
```

## Monitoring with OneUptime

Resource limits protect your infrastructure, but you need monitoring to know when containers are approaching their limits. OneUptime tracks CPU and memory utilization, OOMKill events, and CPU throttling so you can right-size your containers before users are affected. Visit [OneUptime](https://oneuptime.com) for container resource monitoring.

## Conclusion

Container resource limits in Terraform are essential for stable, predictable deployments. Set requests to the typical resource usage and limits to the maximum acceptable burst. Use variables and profiles to maintain consistent resource allocation across environments. Namespace-level quotas prevent any single team from consuming all cluster resources. By managing resource constraints in Terraform, you create a clear contract between your applications and the infrastructure, making capacity planning and cost optimization straightforward.

For more container topics, see [How to Create Container Health Check Configurations in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-container-health-check-configurations-in-terraform/view) and [How to Create Container Service Auto Scaling in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-container-service-auto-scaling-in-terraform/view).
