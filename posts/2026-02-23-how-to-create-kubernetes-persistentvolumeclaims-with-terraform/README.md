# How to Create Kubernetes PersistentVolumeClaims with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, PersistentVolumeClaims, Storage, Infrastructure as Code

Description: How to create Kubernetes PersistentVolumeClaims with Terraform to request and consume persistent storage in your cluster workloads.

---

PersistentVolumeClaims (PVCs) are how pods request storage in Kubernetes. A PVC specifies what kind of storage you need - how much, what access mode, and what storage class - and Kubernetes either finds an existing PersistentVolume that matches or dynamically provisions one. Managing PVCs through Terraform gives you version-controlled storage requests that deploy consistently across environments.

This guide covers creating PVCs with Terraform, binding them to specific PVs, using StorageClasses for dynamic provisioning, and mounting them in pods.

## Provider Configuration

```hcl
# providers.tf
terraform {
  required_version = ">= 1.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

provider "kubernetes" {
  config_path = "~/.kube/config"
}
```

## Basic PVC with Dynamic Provisioning

The simplest PVC lets the StorageClass dynamically provision the backing volume.

```hcl
# pvc.tf - Basic PVC with dynamic provisioning
resource "kubernetes_persistent_volume_claim" "app_data" {
  metadata {
    name      = "app-data"
    namespace = "default"

    labels = {
      app        = "my-app"
      managed-by = "terraform"
    }
  }

  spec {
    access_modes = ["ReadWriteOnce"]

    resources {
      requests = {
        storage = "10Gi"
      }
    }

    # Use the default storage class (or specify one)
    storage_class_name = "standard"
  }
}
```

When this PVC is created, the `standard` StorageClass will automatically provision a PersistentVolume of at least 10Gi with ReadWriteOnce access.

## PVC Bound to a Specific PV

Sometimes you need to bind a PVC to a pre-existing PV. Use a label selector to match the right volume.

```hcl
# Pre-existing PV
resource "kubernetes_persistent_volume" "database_vol" {
  metadata {
    name = "database-volume"

    labels = {
      app  = "postgres"
      tier = "database"
    }
  }

  spec {
    capacity = {
      storage = "50Gi"
    }

    access_modes                     = ["ReadWriteOnce"]
    persistent_volume_reclaim_policy = "Retain"
    storage_class_name               = "manual"

    persistent_volume_source {
      host_path {
        path = "/mnt/data/postgres"
        type = "DirectoryOrCreate"
      }
    }
  }
}

# PVC that binds to the specific PV above
resource "kubernetes_persistent_volume_claim" "database_claim" {
  metadata {
    name      = "database-claim"
    namespace = "database"
  }

  spec {
    access_modes       = ["ReadWriteOnce"]
    storage_class_name = "manual"

    resources {
      requests = {
        storage = "50Gi"
      }
    }

    # Use a selector to bind to the specific PV
    selector {
      match_labels = {
        app  = "postgres"
        tier = "database"
      }
    }
  }
}
```

You can also bind directly by volume name:

```hcl
resource "kubernetes_persistent_volume_claim" "direct_bind" {
  metadata {
    name      = "direct-bind-claim"
    namespace = "default"
  }

  spec {
    access_modes       = ["ReadWriteOnce"]
    storage_class_name = "manual"
    volume_name        = kubernetes_persistent_volume.database_vol.metadata[0].name

    resources {
      requests = {
        storage = "50Gi"
      }
    }
  }
}
```

## PVC with Different Access Modes

Different workloads need different access patterns.

```hcl
# ReadWriteOnce - Single node read-write (most common for databases)
resource "kubernetes_persistent_volume_claim" "database_pvc" {
  metadata {
    name      = "postgres-data"
    namespace = "database"
  }

  spec {
    access_modes       = ["ReadWriteOnce"]
    storage_class_name = "ssd"

    resources {
      requests = {
        storage = "100Gi"
      }
    }
  }
}

# ReadWriteMany - Multiple nodes read-write (shared storage)
resource "kubernetes_persistent_volume_claim" "shared_pvc" {
  metadata {
    name      = "shared-uploads"
    namespace = "default"
  }

  spec {
    access_modes       = ["ReadWriteMany"]
    storage_class_name = "nfs"  # Must support RWX

    resources {
      requests = {
        storage = "200Gi"
      }
    }
  }
}

# ReadOnlyMany - Multiple nodes read-only (shared reference data)
resource "kubernetes_persistent_volume_claim" "reference_data" {
  metadata {
    name      = "reference-data"
    namespace = "default"
  }

  spec {
    access_modes       = ["ReadOnlyMany"]
    storage_class_name = "nfs"

    resources {
      requests = {
        storage = "50Gi"
      }
    }
  }
}
```

## Mounting PVCs in Deployments

Here is how to use PVCs in your pod specs.

```hcl
# deployment_with_pvc.tf - Mount the PVC in a Deployment
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "app-with-storage"
    namespace = "default"
  }

  spec {
    replicas = 1  # RWO volumes can only be used by one node

    selector {
      match_labels = {
        app = "app-with-storage"
      }
    }

    template {
      metadata {
        labels = {
          app = "app-with-storage"
        }
      }

      spec {
        container {
          name  = "app"
          image = "myregistry.io/app:latest"

          # Mount the PVC
          volume_mount {
            name       = "data"
            mount_path = "/app/data"
          }

          # Mount a sub-path from the same PVC
          volume_mount {
            name       = "data"
            mount_path = "/app/logs"
            sub_path   = "logs"
          }

          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
          }
        }

        volume {
          name = "data"
          persistent_volume_claim {
            claim_name = kubernetes_persistent_volume_claim.app_data.metadata[0].name
          }
        }
      }
    }
  }
}
```

## Creating PVCs for Multiple Services

```hcl
# multiple_pvcs.tf - PVCs for different services
variable "service_storage" {
  type = map(object({
    namespace     = string
    size          = string
    access_mode   = string
    storage_class = string
  }))
  default = {
    "api-data" = {
      namespace     = "backend"
      size          = "20Gi"
      access_mode   = "ReadWriteOnce"
      storage_class = "ssd"
    }
    "uploads" = {
      namespace     = "backend"
      size          = "100Gi"
      access_mode   = "ReadWriteMany"
      storage_class = "nfs"
    }
    "cache" = {
      namespace     = "backend"
      size          = "5Gi"
      access_mode   = "ReadWriteOnce"
      storage_class = "ssd"
    }
    "ml-models" = {
      namespace     = "ml"
      size          = "50Gi"
      access_mode   = "ReadOnlyMany"
      storage_class = "standard"
    }
  }
}

resource "kubernetes_persistent_volume_claim" "services" {
  for_each = var.service_storage

  metadata {
    name      = each.key
    namespace = each.value.namespace

    labels = {
      managed-by = "terraform"
    }
  }

  spec {
    access_modes       = [each.value.access_mode]
    storage_class_name = each.value.storage_class

    resources {
      requests = {
        storage = each.value.size
      }
    }
  }
}
```

## Volume Expansion

If your StorageClass supports volume expansion (most cloud providers do), you can resize PVCs by changing the storage request.

```hcl
# expandable_pvc.tf - PVC that can be resized
resource "kubernetes_persistent_volume_claim" "expandable" {
  metadata {
    name      = "expandable-data"
    namespace = "default"
  }

  spec {
    access_modes       = ["ReadWriteOnce"]
    storage_class_name = "fast-ssd"  # Must have allowVolumeExpansion: true

    resources {
      requests = {
        # Change this value to resize the volume
        # (can only increase, not decrease)
        storage = "20Gi"
      }
    }
  }
}
```

When you increase the storage request and run `terraform apply`, Kubernetes will expand the underlying volume. Some volume types require the pod to be restarted for the filesystem to recognize the new size.

## Lifecycle Management

Protect important PVCs from accidental deletion.

```hcl
# protected_pvc.tf - PVC with deletion protection
resource "kubernetes_persistent_volume_claim" "critical_data" {
  metadata {
    name      = "critical-database"
    namespace = "production"

    annotations = {
      "description" = "Production database storage - do not delete"
    }
  }

  spec {
    access_modes       = ["ReadWriteOnce"]
    storage_class_name = "ssd"

    resources {
      requests = {
        storage = "200Gi"
      }
    }
  }

  # Prevent Terraform from deleting this PVC
  lifecycle {
    prevent_destroy = true
  }
}
```

## Monitoring Storage Usage

PVCs have a fixed size, and if your application fills up the volume, things break. Monitor disk usage inside your pods and set up alerts when usage exceeds 80%. [OneUptime](https://oneuptime.com) can track the health of applications that depend on persistent storage, alerting you to degraded performance that often correlates with storage pressure.

## Summary

PersistentVolumeClaims are the standard way pods request storage in Kubernetes. With Terraform, you can manage PVCs declaratively, using dynamic provisioning through StorageClasses for most workloads and manual binding for special cases. Key patterns include using `for_each` for multiple services, protecting critical PVCs with `prevent_destroy`, and leveraging volume expansion to resize storage without downtime. Always match your access mode to your workload pattern - RWO for single-node writes, RWX for shared storage, and ROX for read-heavy reference data.

For the PV side of storage management, see [Kubernetes PersistentVolumes with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-kubernetes-persistentvolumes-with-terraform/view).
