# How to Handle Kubernetes Resource Updates in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Resource Management, Infrastructure as Code, DevOps

Description: Learn how to handle Kubernetes resource updates in Terraform, including in-place updates, force replacements, lifecycle management, and dealing with server-side field managers.

---

Updating Kubernetes resources through Terraform is not always as straightforward as changing a value and running `terraform apply`. Some fields can be updated in place, others require destroying and recreating the resource, and some are managed by controllers that fight with Terraform for control. Understanding how Terraform handles these different update scenarios saves you from unexpected downtime and frustrating plan outputs.

This guide walks through the different update behaviors and how to manage them effectively.

## Understanding Update Behaviors

Kubernetes resources have three categories of fields when it comes to updates:

1. **Mutable fields** - Can be changed in place (replica count, image, environment variables)
2. **Immutable fields** - Cannot be changed after creation (pod selector labels, service ClusterIP)
3. **Server-managed fields** - Set or modified by controllers and the API server (status, managed fields, some annotations)

Terraform handles each differently, and knowing which category a field falls into prevents surprises.

## In-Place Updates

Most fields on Kubernetes resources support in-place updates. Terraform detects the change and sends a PATCH request to the API server.

```hcl
# Updating replica count or image triggers an in-place update
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "my-app"
    namespace = "production"
  }

  spec {
    # Changing this value triggers an in-place update
    replicas = 5  # was 3

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
          # Changing the image also triggers an in-place update
          image = "my-app:2.0.0"  # was 1.0.0

          resources {
            requests = {
              cpu    = "200m"  # Updating resource requests
              memory = "256Mi"
            }
            limits = {
              cpu    = "500m"
              memory = "512Mi"
            }
          }
        }
      }
    }
  }
}
```

When you run `terraform plan`, you will see something like:

```text
~ resource "kubernetes_deployment" "app" {
    ~ spec {
        ~ replicas = 3 -> 5
        ~ template {
            ~ spec {
                ~ container {
                    ~ image = "my-app:1.0.0" -> "my-app:2.0.0"
                  }
              }
          }
      }
  }
```

The `~` prefix indicates an in-place update. No downtime, no recreation.

## Force Replacement (Destroy and Recreate)

Some fields are immutable after creation. Changing them forces Terraform to destroy and recreate the resource.

```hcl
# Changing selector labels forces replacement
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "my-app"
    namespace = "production"
  }

  spec {
    selector {
      match_labels = {
        # Changing this forces destroy and recreate
        app = "my-app-v2"  # was "my-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "my-app-v2"
        }
      }

      spec {
        container {
          name  = "app"
          image = "my-app:2.0.0"
        }
      }
    }
  }
}
```

The plan output shows `-/+` indicating replacement:

```text
-/+ resource "kubernetes_deployment" "app" {
      # forces replacement
    }
```

To avoid downtime during replacements, use `create_before_destroy`:

```hcl
resource "kubernetes_deployment" "app" {
  # ... spec above ...

  lifecycle {
    create_before_destroy = true
  }
}
```

## Using ignore_changes for Server-Managed Fields

Kubernetes controllers and the API server modify resources after creation. Without `ignore_changes`, Terraform tries to revert these modifications on every apply.

```hcl
# HPA modifies replica count - tell Terraform to ignore it
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "my-app"
    namespace = "production"
  }

  spec {
    # HPA will manage replicas, so ignore Terraform's value
    replicas = 3

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
          image = "my-app:1.0.0"
        }
      }
    }
  }

  lifecycle {
    # Ignore replica count since HPA manages it
    ignore_changes = [
      spec[0].replicas
    ]
  }
}

# HPA controls the replica count
resource "kubernetes_horizontal_pod_autoscaler_v2" "app" {
  metadata {
    name      = "my-app"
    namespace = "production"
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment.app.metadata[0].name
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
```

## Handling Annotation Conflicts

External controllers like cert-manager, external-dns, and ArgoCD add annotations to your resources. Terraform sees these as drift and tries to remove them.

```hcl
resource "kubernetes_service" "app" {
  metadata {
    name      = "my-app"
    namespace = "production"

    annotations = {
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }

  spec {
    selector = {
      app = "my-app"
    }

    port {
      port        = 80
      target_port = 8080
    }
  }

  lifecycle {
    # Ignore annotations added by external controllers
    ignore_changes = [
      metadata[0].annotations["kubectl.kubernetes.io/last-applied-configuration"],
      metadata[0].annotations["field.cattle.io/publicEndpoints"],
    ]
  }
}
```

For broader annotation ignoring, you can ignore the entire annotations map, but this means Terraform will not manage any annotations at all:

```hcl
lifecycle {
  ignore_changes = [
    metadata[0].annotations
  ]
}
```

## Preventing Accidental Destruction

Some resources should never be destroyed, even during replacements. Use `prevent_destroy` for these.

```hcl
# Prevent accidental deletion of the namespace
resource "kubernetes_namespace" "production" {
  metadata {
    name = "production"

    labels = {
      environment = "production"
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Protect persistent volume claims from deletion
resource "kubernetes_persistent_volume_claim" "data" {
  metadata {
    name      = "app-data"
    namespace = "production"
  }

  spec {
    access_modes = ["ReadWriteOnce"]

    resources {
      requests = {
        storage = "100Gi"
      }
    }

    storage_class_name = "gp3"
  }

  lifecycle {
    prevent_destroy = true
  }
}
```

## Dealing with wait_for_rollout

By default, the Kubernetes provider waits for deployments to complete their rollout. This can cause long apply times or timeouts on failing deployments.

```hcl
resource "kubernetes_deployment" "app" {
  # Setting this to false makes apply faster but less safe
  wait_for_rollout = false

  metadata {
    name      = "my-app"
    namespace = "production"
  }

  spec {
    replicas = 3

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
          image = "my-app:1.0.0"
        }
      }
    }
  }

  timeouts {
    create = "5m"
    update = "5m"
    delete = "5m"
  }
}
```

Setting `wait_for_rollout = false` means Terraform does not wait for all pods to become ready. This is useful in development but risky in production since a broken deployment will not fail the apply.

## Handling ConfigMap and Secret Updates

Changing a ConfigMap or Secret does not automatically restart pods that reference them. A common pattern is to hash the config data and include it as a pod annotation.

```hcl
resource "kubernetes_config_map" "app" {
  metadata {
    name      = "app-config"
    namespace = "production"
  }

  data = {
    "config.yaml" = yamlencode(var.app_config)
  }
}

resource "kubernetes_deployment" "app" {
  metadata {
    name      = "my-app"
    namespace = "production"
  }

  spec {
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

        # Hash the config to trigger pod restarts on config changes
        annotations = {
          "config-hash" = md5(yamlencode(var.app_config))
        }
      }

      spec {
        container {
          name  = "app"
          image = "my-app:1.0.0"

          volume_mount {
            name       = "config"
            mount_path = "/etc/config"
          }
        }

        volume {
          name = "config"

          config_map {
            name = kubernetes_config_map.app.metadata[0].name
          }
        }
      }
    }
  }
}
```

The `config-hash` annotation changes whenever the config changes, which triggers a rolling update of the pods.

## Using Terraform Import for Existing Resources

When you need to bring existing Kubernetes resources under Terraform management:

```bash
# Import an existing deployment
terraform import kubernetes_deployment.app production/my-app

# Import an existing service
terraform import kubernetes_service.app production/my-app

# Import an existing namespace
terraform import kubernetes_namespace.production production
```

After importing, run `terraform plan` to see what Terraform wants to change and adjust your configuration to match the current state before applying any updates.

## Best Practices for Resource Updates

Follow these guidelines to keep updates smooth:

- Always run `terraform plan` before `terraform apply` to review what will change
- Use `ignore_changes` for fields managed by external controllers
- Set `prevent_destroy` on stateful resources you cannot afford to lose
- Use `create_before_destroy` for resources where downtime is unacceptable
- Hash configuration data to trigger pod restarts when configs change
- Keep selector labels immutable to avoid forced replacements
- Set appropriate timeouts for long-running rollouts

For more on managing Kubernetes resources with Terraform, check out our guide on [handling Kubernetes resource dependencies](https://oneuptime.com/blog/post/2026-02-23-kubernetes-resource-dependencies-terraform/view).
