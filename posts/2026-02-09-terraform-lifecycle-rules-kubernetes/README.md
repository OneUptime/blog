# How to Implement Terraform Lifecycle Rules for Kubernetes Resource Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Resource Management

Description: Learn how to use Terraform lifecycle rules to control resource creation, updates, and deletion behavior in Kubernetes environments, preventing unintended downtime and data loss.

---

Terraform lifecycle rules provide fine-grained control over how resources are created, updated, and destroyed. In Kubernetes environments, where applications must maintain availability and data integrity, lifecycle rules become critical for preventing accidental deletions, managing rolling updates, and handling resource replacements safely. Understanding and implementing these rules correctly can save you from production incidents and data loss.

## Understanding Lifecycle Meta-Arguments

Terraform supports several lifecycle meta-arguments that modify default resource behavior:

- **create_before_destroy** - Creates replacement resources before destroying old ones
- **prevent_destroy** - Blocks resource deletion, useful for critical infrastructure
- **ignore_changes** - Tells Terraform to ignore changes to specific attributes
- **replace_triggered_by** - Forces replacement when referenced resources change

These rules apply within the lifecycle block of any resource.

## Preventing Accidental Deletion of Critical Resources

Certain Kubernetes resources like PersistentVolumeClaims or StatefulSets should never be accidentally deleted because they store stateful data. The prevent_destroy rule protects these resources:

```hcl
resource "kubernetes_persistent_volume_claim" "database" {
  metadata {
    name      = "postgres-data"
    namespace = "production"
  }

  spec {
    access_modes = ["ReadWriteOnce"]
    resources {
      requests = {
        storage = "100Gi"
      }
    }
    storage_class_name = "fast-ssd"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "kubernetes_stateful_set" "database" {
  metadata {
    name      = "postgres"
    namespace = "production"
  }

  spec {
    service_name = "postgres"
    replicas     = 3

    selector {
      match_labels = {
        app = "postgres"
      }
    }

    template {
      metadata {
        labels = {
          app = "postgres"
        }
      }

      spec {
        container {
          name  = "postgres"
          image = "postgres:14"

          volume_mount {
            name       = "data"
            mount_path = "/var/lib/postgresql/data"
          }
        }
      }
    }

    volume_claim_template {
      metadata {
        name = "data"
      }

      spec {
        access_modes = ["ReadWriteOnce"]
        resources {
          requests = {
            storage = "50Gi"
          }
        }
      }
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}
```

If you attempt to destroy these resources while the rule is present in the configuration, Terraform will refuse and display an error. To remove the protection, edit the configuration so the prevent_destroy rule no longer applies before planning the deletion.

## Managing Safe Resource Replacements

Kubernetes deployments handle ordinary image and pod template updates with rolling updates. The create_before_destroy rule is only appropriate when Terraform must replace a resource and Kubernetes can allow the old and new objects to exist at the same time. Because Kubernetes object names are unique within a namespace, use a generated name or another unique naming strategy for resources that use create_before_destroy:

```hcl
variable "rollout_id" {
  description = "Unique identifier for this replacement rollout"
  type        = string
}

resource "kubernetes_deployment" "api" {
  metadata {
    generate_name = "api-server-"
    namespace     = "production"
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app        = "api"
        rollout_id = var.rollout_id
      }
    }

    template {
      metadata {
        labels = {
          app        = "api"
          rollout_id = var.rollout_id
        }
      }

      spec {
        container {
          name  = "api"
          image = "myapp/api:v2.3.1"

          port {
            container_port = 8080
          }

          resources {
            requests = {
              cpu    = "500m"
              memory = "512Mi"
            }
            limits = {
              cpu    = "1000m"
              memory = "1Gi"
            }
          }

          liveness_probe {
            http_get {
              path = "/health"
              port = 8080
            }
            initial_delay_seconds = 30
            period_seconds        = 10
          }

          readiness_probe {
            http_get {
              path = "/ready"
              port = 8080
            }
            initial_delay_seconds = 10
            period_seconds        = 5
          }
        }
      }
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "kubernetes_service" "api" {
  metadata {
    name      = "api-service"
    namespace = "production"
  }

  spec {
    selector = {
      app = "api"
    }

    port {
      port        = 80
      target_port = 8080
    }

    type = "LoadBalancer"
  }
}
```

With create_before_destroy and a unique Deployment name, Terraform can create the replacement Deployment before destroying the previous one. The Kubernetes provider waits for Deployment rollout by default, while the Service's broader selector can route traffic to available pods during the replacement.

## Ignoring External Changes

Kubernetes controllers and operators often modify resources after creation. For example, the Horizontal Pod Autoscaler changes replica counts dynamically. Use ignore_changes to prevent Terraform from reverting these modifications:

```hcl
resource "kubernetes_deployment" "web" {
  metadata {
    name      = "web-frontend"
    namespace = "production"
  }

  spec {
    replicas = 2  # Initial replica count

    selector {
      match_labels = {
        app = "web"
      }
    }

    template {
      metadata {
        labels = {
          app = "web"
        }
      }

      spec {
        container {
          name  = "nginx"
          image = "nginx:1.21"

          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
          }
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      spec[0].replicas  # Let HPA manage replica count
    ]
  }
}

resource "kubernetes_horizontal_pod_autoscaler_v2" "web" {
  metadata {
    name      = "web-hpa"
    namespace = "production"
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment.web.metadata[0].name
    }

    min_replicas = 2
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
```

Now the HPA can scale the deployment without Terraform trying to reset the replica count to 2.

## Ignoring Multiple Fields

You can ignore multiple fields or entire nested blocks. This is useful for resources modified by admission controllers or mutating webhooks:

```hcl
resource "kubernetes_pod" "monitoring" {
  metadata {
    name      = "monitoring-agent"
    namespace = "kube-system"
  }

  spec {
    container {
      name  = "agent"
      image = "monitoring/agent:v1.0"

      env {
        name  = "CLUSTER_NAME"
        value = "production-cluster"
      }
    }
  }

  lifecycle {
    ignore_changes = [
      spec[0].container[0].env,              # Ignore injected env vars
      metadata[0].annotations,                # Ignore added annotations
      spec[0].container[0].resources          # Ignore resource modifications
    ]
  }
}
```

## Using Pod Template Annotations for Coordinated Updates

The replace_triggered_by argument forces resource replacement when specific referenced resources change. For Kubernetes Deployments that consume ConfigMaps or Secrets, a safer pattern is to place a hash of that data in the pod template annotations so Kubernetes performs a normal rolling update:

```hcl
resource "kubernetes_config_map" "app_config" {
  metadata {
    name      = "app-config"
    namespace = "production"
  }

  data = {
    database_host = "postgres.production.svc.cluster.local"
    cache_host    = "redis.production.svc.cluster.local"
    log_level     = "info"
  }
}

resource "kubernetes_secret" "app_secrets" {
  metadata {
    name      = "app-secrets"
    namespace = "production"
  }

  data = {
    api_key     = "super-secret-key"
    db_password = "database-password"
  }
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
        # Add hash to trigger a rollout when config changes
        annotations = {
          config_hash  = sha256(jsonencode(kubernetes_config_map.app_config.data))
          secrets_hash = sha256(jsonencode(kubernetes_secret.app_secrets.data))
        }
      }

      spec {
        container {
          name  = "app"
          image = "myapp/application:v1.0"

          env_from {
            config_map_ref {
              name = kubernetes_config_map.app_config.metadata[0].name
            }
          }

          env_from {
            secret_ref {
              name = kubernetes_secret.app_secrets.metadata[0].name
            }
          }
        }
      }
    }
  }
}
```

When the ConfigMap or Secret data changes, the pod template annotations change, and Kubernetes rolls out new pods that pick up the new configuration values. Use replace_triggered_by only when replacing the Terraform-managed resource itself is acceptable.

## Combining Multiple Lifecycle Rules

You can combine multiple lifecycle rules for complex scenarios:

```hcl
resource "kubernetes_stateful_set" "elasticsearch" {
  metadata {
    name      = "elasticsearch"
    namespace = "logging"
  }

  spec {
    service_name = "elasticsearch"
    replicas     = 3

    selector {
      match_labels = {
        app = "elasticsearch"
      }
    }

    template {
      metadata {
        labels = {
          app = "elasticsearch"
        }
      }

      spec {
        container {
          name  = "elasticsearch"
          image = "docker.elastic.co/elasticsearch/elasticsearch:8.5.0"

          env {
            name  = "cluster.name"
            value = "prod-logs"
          }

          env {
            name  = "discovery.type"
            value = "zen"
          }

          resources {
            requests = {
              cpu    = "1000m"
              memory = "2Gi"
            }
          }

          volume_mount {
            name       = "data"
            mount_path = "/usr/share/elasticsearch/data"
          }
        }
      }
    }

    volume_claim_template {
      metadata {
        name = "data"
      }

      spec {
        access_modes = ["ReadWriteOnce"]
        resources {
          requests = {
            storage = "100Gi"
          }
        }
        storage_class_name = "fast-ssd"
      }
    }
  }

  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      spec[0].replicas  # Allow manual scaling
    ]
  }
}
```

This configuration protects the StatefulSet from deletion and allows operators to manually adjust replica counts without Terraform interference.

## Conditional Resource Patterns for Lifecycle Rules

Lifecycle rules must use literal values, so you cannot set prevent_destroy directly from a variable. To use different lifecycle behavior by environment, split the resources or modules so only the production resource includes the rule:

```hcl
variable "environment" {
  description = "Environment name"
  type        = string
}

resource "kubernetes_namespace" "app_production" {
  count = var.environment == "production" ? 1 : 0

  metadata {
    name = "app-${var.environment}"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "kubernetes_namespace" "app_non_production" {
  count = var.environment == "production" ? 0 : 1

  metadata {
    name = "app-${var.environment}"
  }
}
```

Production namespaces gain deletion protection while development environments remain easy to tear down.

## Handling Lifecycle Rule Changes

When you add or remove lifecycle rules, Terraform may require special handling:

1. **Adding prevent_destroy** - Apply immediately, takes effect on next destroy attempt
2. **Removing prevent_destroy** - Remove the rule from configuration before planning a deletion
3. **Adding create_before_destroy** - Changes replacement ordering the next time replacement is required
4. **Adding ignore_changes** - Prevents future updates to ignored fields but doesn't revert existing differences

Always run terraform plan to understand the impact before applying lifecycle rule changes.

Lifecycle rules give you precise control over Terraform's behavior in Kubernetes environments. By preventing accidental deletions, managing replacement order, and ignoring external changes, you can maintain service availability and data integrity while still benefiting from infrastructure as code. Choose lifecycle rules based on your specific operational requirements and risk tolerance for each resource type.
