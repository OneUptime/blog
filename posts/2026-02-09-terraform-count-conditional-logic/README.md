# How to Use Terraform Count and Conditional Logic for Kubernetes Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Conditional Logic

Description: Master the count meta-argument and conditional expressions in Terraform to create flexible Kubernetes configurations that adapt to different environments and requirements.

---

Terraform's count meta-argument and conditional expressions enable you to create resources dynamically based on variables, environment settings, or other conditions. In Kubernetes deployments, this flexibility allows you to maintain a single configuration that adapts to development, staging, and production environments, optionally enabling features like monitoring, autoscaling, or additional security controls.

## Understanding Count Basics

The count meta-argument specifies how many instances of a resource to create. Set count to 0 to skip resource creation entirely:

```hcl
variable "enable_monitoring" {
  description = "Enable monitoring stack"
  type        = bool
  default     = false
}

resource "kubernetes_namespace" "monitoring" {
  count = var.enable_monitoring ? 1 : 0

  metadata {
    name = "monitoring"
  }
}

resource "kubernetes_deployment" "prometheus" {
  count = var.enable_monitoring ? 1 : 0

  metadata {
    name      = "prometheus"
    namespace = kubernetes_namespace.monitoring[0].metadata[0].name
  }

  spec {
    replicas = 1

    selector {
      match_labels = {
        app = "prometheus"
      }
    }

    template {
      metadata {
        labels = {
          app = "prometheus"
        }
      }

      spec {
        container {
          name  = "prometheus"
          image = "prom/prometheus:latest"

          port {
            container_port = 9090
          }
        }
      }
    }
  }
}
```

When enable_monitoring is false, both resources have count = 0 and aren't created.

## Creating Multiple Similar Resources

Use count to create multiple instances of the same resource with slight variations:

```hcl
variable "worker_count" {
  description = "Number of worker deployments"
  type        = number
  default     = 3
}

resource "kubernetes_deployment" "worker" {
  count = var.worker_count

  metadata {
    name      = "worker-${count.index}"
    namespace = "production"
    labels = {
      app   = "worker"
      index = tostring(count.index)
    }
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app   = "worker"
        index = tostring(count.index)
      }
    }

    template {
      metadata {
        labels = {
          app   = "worker"
          index = tostring(count.index)
        }
      }

      spec {
        container {
          name  = "worker"
          image = "myapp/worker:v1.0"

          env {
            name  = "WORKER_ID"
            value = tostring(count.index)
          }

          env {
            name  = "WORKER_COUNT"
            value = tostring(var.worker_count)
          }
        }
      }
    }
  }
}
```

This creates worker-0, worker-1, and worker-2 deployments, each with unique labels and environment variables.

## Environment-Based Conditional Resources

Deploy different resources based on environment:

```hcl
variable "environment" {
  description = "Environment name"
  type        = string
}

locals {
  is_production = var.environment == "production"
  is_dev        = var.environment == "dev"
}

resource "kubernetes_horizontal_pod_autoscaler_v2" "app" {
  count = local.is_production ? 1 : 0

  metadata {
    name      = "app-hpa"
    namespace = "application"
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = "application"
    }

    min_replicas = 3
    max_replicas = 10

    metric {
      type = "Resource"
      resource {
        name = "cpu"
        target {
          type                = "Utilization"
          average_utilization = 70
        }
      }
    }
  }
}

resource "kubernetes_pod_disruption_budget_v1" "app" {
  count = local.is_production ? 1 : 0

  metadata {
    name      = "app-pdb"
    namespace = "application"
  }

  spec {
    min_available = 2

    selector {
      match_labels = {
        app = "application"
      }
    }
  }
}

resource "kubernetes_deployment" "debug_tools" {
  count = local.is_dev ? 1 : 0

  metadata {
    name      = "debug-tools"
    namespace = "application"
  }

  spec {
    replicas = 1

    selector {
      match_labels = {
        app = "debug-tools"
      }
    }

    template {
      metadata {
        labels = {
          app = "debug-tools"
        }
      }

      spec {
        container {
          name    = "debug"
          image   = "nicolaka/netshoot:latest"
          command = ["sleep", "infinity"]
        }
      }
    }
  }
}
```

Production gets autoscaling and pod disruption budgets, while development gets debug tools.

## Conditional Resource Configuration

Use conditionals to modify resource properties:

```hcl
variable "environment" {
  type = string
}

variable "enable_tls" {
  type    = bool
  default = true
}

locals {
  replica_count = var.environment == "production" ? 5 : (var.environment == "staging" ? 3 : 1)
  resource_limits = var.environment == "production" ? {
    cpu    = "1000m"
    memory = "2Gi"
  } : {
    cpu    = "500m"
    memory = "512Mi"
  }
}

resource "kubernetes_deployment" "app" {
  metadata {
    name      = "application"
    namespace = var.environment
  }

  spec {
    replicas = local.replica_count

    selector {
      match_labels = {
        app = "application"
      }
    }

    template {
      metadata {
        labels = {
          app = "application"
        }
      }

      spec {
        container {
          name  = "app"
          image = "myapp/app:${var.environment}"

          port {
            container_port = 8080
          }

          resources {
            requests = {
              cpu    = local.resource_limits.cpu
              memory = local.resource_limits.memory
            }
            limits = local.resource_limits
          }

          env {
            name  = "ENVIRONMENT"
            value = var.environment
          }

          env {
            name  = "DEBUG"
            value = var.environment != "production" ? "true" : "false"
          }
        }
      }
    }
  }
}

resource "kubernetes_ingress_v1" "app" {
  metadata {
    name      = "app-ingress"
    namespace = var.environment

    annotations = merge(
      {
        "kubernetes.io/ingress.class" = "nginx"
      },
      var.enable_tls ? {
        "cert-manager.io/cluster-issuer" = "letsencrypt-prod"
      } : {}
    )
  }

  spec {
    dynamic "rule" {
      for_each = [1]
      content {
        host = "${var.environment}.example.com"

        http {
          path {
            path      = "/"
            path_type = "Prefix"

            backend {
              service {
                name = "application"
                port {
                  number = 80
                }
              }
            }
          }
        }
      }
    }

    dynamic "tls" {
      for_each = var.enable_tls ? [1] : []
      content {
        hosts       = ["${var.environment}.example.com"]
        secret_name = "${var.environment}-tls"
      }
    }
  }
}
```

## Conditional Init Containers

Add init containers based on conditions:

```hcl
variable "enable_database_migration" {
  type    = bool
  default = true
}

variable "enable_cache_warmup" {
  type    = bool
  default = false
}

locals {
  init_containers = concat(
    var.enable_database_migration ? [{
      name    = "db-migrate"
      image   = "myapp/db-migrate:v1.0"
      command = ["./migrate.sh"]
    }] : [],
    var.enable_cache_warmup ? [{
      name    = "cache-warmup"
      image   = "myapp/cache-warmup:v1.0"
      command = ["./warmup.sh"]
    }] : []
  )
}

resource "kubernetes_deployment" "app" {
  metadata {
    name      = "application"
    namespace = "production"
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "application"
      }
    }

    template {
      metadata {
        labels = {
          app = "application"
        }
      }

      spec {
        dynamic "init_container" {
          for_each = local.init_containers
          content {
            name    = init_container.value.name
            image   = init_container.value.image
            command = init_container.value.command
          }
        }

        container {
          name  = "app"
          image = "myapp/app:v1.0"
        }
      }
    }
  }
}
```

## Conditional Sidecar Containers

Inject sidecar containers conditionally:

```hcl
variable "enable_service_mesh" {
  type    = bool
  default = false
}

variable "enable_log_shipper" {
  type    = bool
  default = true
}

locals {
  sidecar_containers = concat(
    [{
      name  = "app"
      image = "myapp/app:v1.0"
      port {
        container_port = 8080
      }
    }],
    var.enable_service_mesh ? [{
      name  = "envoy"
      image = "envoyproxy/envoy:v1.24.0"
      port {
        container_port = 15001
      }
    }] : [],
    var.enable_log_shipper ? [{
      name  = "fluent-bit"
      image = "fluent/fluent-bit:2.0"
      volume_mount {
        name       = "logs"
        mount_path = "/var/log"
      }
    }] : []
  )
}

resource "kubernetes_deployment" "app" {
  metadata {
    name      = "application"
    namespace = "production"
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "application"
      }
    }

    template {
      metadata {
        labels = {
          app = "application"
        }
      }

      spec {
        dynamic "container" {
          for_each = local.sidecar_containers
          content {
            name  = container.value.name
            image = container.value.image

            dynamic "port" {
              for_each = try([container.value.port], [])
              content {
                container_port = port.value.container_port
              }
            }

            dynamic "volume_mount" {
              for_each = try([container.value.volume_mount], [])
              content {
                name       = volume_mount.value.name
                mount_path = volume_mount.value.mount_path
              }
            }
          }
        }

        dynamic "volume" {
          for_each = var.enable_log_shipper ? [1] : []
          content {
            name = "logs"
            empty_dir {}
          }
        }
      }
    }
  }
}
```

## Conditional Network Policies

Apply network policies based on security requirements:

```hcl
variable "enforce_network_policies" {
  type    = bool
  default = true
}

variable "allowed_namespaces" {
  type    = list(string)
  default = []
}

resource "kubernetes_network_policy" "deny_all" {
  count = var.enforce_network_policies ? 1 : 0

  metadata {
    name      = "deny-all"
    namespace = "application"
  }

  spec {
    pod_selector {}
    policy_types = ["Ingress", "Egress"]
  }
}

resource "kubernetes_network_policy" "allow_from_namespaces" {
  count = var.enforce_network_policies && length(var.allowed_namespaces) > 0 ? 1 : 0

  metadata {
    name      = "allow-from-namespaces"
    namespace = "application"
  }

  spec {
    pod_selector {}
    policy_types = ["Ingress"]

    dynamic "ingress" {
      for_each = var.allowed_namespaces
      content {
        from {
          namespace_selector {
            match_labels = {
              name = ingress.value
            }
          }
        }
      }
    }
  }
}
```

## Conditional Volume Mounts

Mount volumes based on configuration:

```hcl
variable "mount_secrets" {
  type    = bool
  default = false
}

variable "mount_config" {
  type    = bool
  default = true
}

locals {
  volume_mounts = concat(
    var.mount_config ? [{
      name       = "config"
      mount_path = "/etc/config"
    }] : [],
    var.mount_secrets ? [{
      name       = "secrets"
      mount_path = "/etc/secrets"
      read_only  = true
    }] : []
  )

  volumes = concat(
    var.mount_config ? [{
      name = "config"
      config_map = {
        name = "app-config"
      }
    }] : [],
    var.mount_secrets ? [{
      name = "secrets"
      secret = {
        secret_name = "app-secrets"
      }
    }] : []
  )
}

resource "kubernetes_deployment" "app" {
  metadata {
    name      = "application"
    namespace = "production"
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "application"
      }
    }

    template {
      metadata {
        labels = {
          app = "application"
        }
      }

      spec {
        container {
          name  = "app"
          image = "myapp/app:v1.0"

          dynamic "volume_mount" {
            for_each = local.volume_mounts
            content {
              name       = volume_mount.value.name
              mount_path = volume_mount.value.mount_path
              read_only  = try(volume_mount.value.read_only, false)
            }
          }
        }

        dynamic "volume" {
          for_each = local.volumes
          content {
            name = volume.value.name

            dynamic "config_map" {
              for_each = try([volume.value.config_map], [])
              content {
                name = config_map.value.name
              }
            }

            dynamic "secret" {
              for_each = try([volume.value.secret], [])
              content {
                secret_name = secret.value.secret_name
              }
            }
          }
        }
      }
    }
  }
}
```

## Combining Count with Conditional Logic

Create sophisticated conditional resource creation:

```hcl
variable "environment" {
  type = string
}

variable "enable_monitoring" {
  type    = bool
  default = false
}

locals {
  # Create monitoring resources only in staging and production when enabled
  create_monitoring = var.enable_monitoring && contains(["staging", "production"], var.environment)
  
  # Number of monitoring instances based on environment
  monitoring_replicas = var.environment == "production" ? 3 : 1
}

resource "kubernetes_deployment" "prometheus" {
  count = local.create_monitoring ? local.monitoring_replicas : 0

  metadata {
    name      = "prometheus-${count.index}"
    namespace = "monitoring"
  }

  spec {
    replicas = 1

    selector {
      match_labels = {
        app   = "prometheus"
        shard = tostring(count.index)
      }
    }

    template {
      metadata {
        labels = {
          app   = "prometheus"
          shard = tostring(count.index)
        }
      }

      spec {
        container {
          name  = "prometheus"
          image = "prom/prometheus:latest"
        }
      }
    }
  }
}
```

The count meta-argument and conditional expressions make Terraform configurations adaptable to different requirements without duplication. By combining these features, you create flexible Kubernetes deployments that scale from development to production, enabling or disabling features based on environment, security requirements, or operational needs.
