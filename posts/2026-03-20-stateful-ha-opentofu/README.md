# How to Deploy Stateful Applications with HA Using OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, StatefulSet, High Availability, OpenTofu, Persistent Storage

Description: Learn how to deploy stateful applications with high availability using OpenTofu with Kubernetes StatefulSets, persistent volumes, pod disruption budgets, and leader election.

## Overview

Stateful applications (databases, message queues, caches) require special HA handling because they maintain data on disk. OpenTofu configures StatefulSets with topology spread constraints, persistent volume claims, and pod disruption budgets for resilient stateful workloads.

## Step 1: StatefulSet with Topology Spread

```hcl
# main.tf - HA StatefulSet for PostgreSQL

resource "kubernetes_stateful_set" "postgresql_ha" {
  metadata {
    name      = "postgresql-ha"
    namespace = "database"
  }

  depends_on = [
    kubernetes_service.postgresql_headless,
    kubernetes_storage_class.zone_redundant
  ]

  spec {
    service_name = "postgresql-ha-headless"
    replicas     = 3

    selector {
      match_labels = { app = "postgresql-ha" }
    }

    # Spread pods across zones for zone redundancy
    template {
      metadata {
        labels = { app = "postgresql-ha" }
      }

      spec {
        topology_spread_constraint {
          max_skew           = 1
          topology_key       = "topology.kubernetes.io/zone"
          when_unsatisfiable = "DoNotSchedule"
          label_selector {
            match_labels = { app = "postgresql-ha" }
          }
        }

        # Anti-affinity prevents two replicas on same node
        affinity {
          pod_anti_affinity {
            required_during_scheduling_ignored_during_execution {
              label_selector {
                match_labels = { app = "postgresql-ha" }
              }
              topology_key = "kubernetes.io/hostname"
            }
          }
        }

        container {
          name  = "postgresql"
          image = "bitnami/postgresql-repmgr:15"

          port { container_port = 5432 }

          env {
            name = "MY_POD_NAME"
            value_from {
              field_ref {
                field_path = "metadata.name"
              }
            }
          }

          env {
            name = "REPMGR_NAMESPACE"
            value_from {
              field_ref {
                field_path = "metadata.namespace"
              }
            }
          }

          # Store real values in a Secret named postgresql-ha-secret.
          env {
            name = "POSTGRESQL_PASSWORD"
            value_from {
              secret_key_ref {
                name = "postgresql-ha-secret"
                key  = "postgresql-password"
              }
            }
          }

          env {
            name = "REPMGR_PASSWORD"
            value_from {
              secret_key_ref {
                name = "postgresql-ha-secret"
                key  = "repmgr-password"
              }
            }
          }

          env {
            name  = "REPMGR_PRIMARY_HOST"
            value = "postgresql-ha-0.postgresql-ha-headless.$(REPMGR_NAMESPACE).svc.cluster.local"
          }

          env {
            name  = "REPMGR_PARTNER_NODES"
            value = "postgresql-ha-0.postgresql-ha-headless.$(REPMGR_NAMESPACE).svc.cluster.local,postgresql-ha-1.postgresql-ha-headless.$(REPMGR_NAMESPACE).svc.cluster.local,postgresql-ha-2.postgresql-ha-headless.$(REPMGR_NAMESPACE).svc.cluster.local"
          }

          env {
            name  = "REPMGR_NODE_NAME"
            value = "$(MY_POD_NAME)"
          }

          env {
            name  = "REPMGR_NODE_NETWORK_NAME"
            value = "$(MY_POD_NAME).postgresql-ha-headless.$(REPMGR_NAMESPACE).svc.cluster.local"
          }

          readiness_probe {
            exec {
              command = ["/bin/bash", "-c", "pg_isready -U postgres"]
            }
            period_seconds    = 10
            failure_threshold = 3
          }

          volume_mount {
            name       = "data"
            mount_path = "/bitnami/postgresql"
          }
        }
      }
    }

    volume_claim_template {
      metadata { name = "data" }
      spec {
        access_modes       = ["ReadWriteOnce"]
        storage_class_name = "premium-ssd-zrs"
        resources {
          requests = { storage = "50Gi" }
        }
      }
    }
  }
}
```

## Step 2: Pod Disruption Budget for Quorum

```hcl
# Ensure quorum is maintained during disruptions
resource "kubernetes_pod_disruption_budget_v1" "postgresql_ha" {
  metadata {
    name      = "postgresql-ha-pdb"
    namespace = "database"
  }

  spec {
    min_available = 2  # Need majority online (2/3)
    selector {
      match_labels = { app = "postgresql-ha" }
    }
  }
}
```

## Step 3: Headless Service for StatefulSet

```hcl
# Headless service for stable DNS identity
resource "kubernetes_service" "postgresql_headless" {
  metadata {
    name      = "postgresql-ha-headless"
    namespace = "database"
  }

  spec {
    cluster_ip = "None"  # Headless service
    selector   = { app = "postgresql-ha" }
    publish_not_ready_addresses = true  # Register DNS before ready

    port {
      name        = "postgresql"
      port        = 5432
      target_port = 5432
    }
  }
}

# Service for reads (all replicas)
resource "kubernetes_service" "postgresql_read" {
  metadata {
    name      = "postgresql-ha-read"
    namespace = "database"
  }

  spec {
    selector = { app = "postgresql-ha" }
    port {
      name        = "postgresql"
      port        = 5432
      target_port = 5432
    }
  }
}
```

## Step 4: Storage Class for Zone-Redundant Storage

```hcl
# StorageClass using zone-redundant disks (Azure)
resource "kubernetes_storage_class" "zone_redundant" {
  metadata {
    name = "premium-ssd-zrs"
    annotations = {
      "storageclass.kubernetes.io/is-default-class" = "false"
    }
  }

  storage_provisioner    = "disk.csi.azure.com"
  reclaim_policy         = "Retain"
  allow_volume_expansion = true
  volume_binding_mode    = "WaitForFirstConsumer"

  parameters = {
    skuName     = "Premium_ZRS"  # Zone-redundant SSD
    cachingMode = "ReadOnly"
    kind        = "managed"
  }
}
```

## Summary

Stateful HA applications configured with OpenTofu use StatefulSets with topology spread constraints for zone distribution and pod anti-affinity to prevent multiple replicas on the same node. Pod Disruption Budgets enforce quorum by preventing too many pods from being disrupted simultaneously during maintenance. Headless services provide stable DNS names (pod-0.service.namespace.svc.cluster.local) that allow replicas to discover each other for cluster formation and leader election.
