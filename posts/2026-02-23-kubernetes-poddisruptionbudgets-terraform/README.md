# How to Create Kubernetes PodDisruptionBudgets with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, PodDisruptionBudget, High Availability, Reliability, DevOps

Description: Learn how to create and manage Kubernetes PodDisruptionBudgets with Terraform to protect application availability during node drains, cluster upgrades, and autoscaler operations.

---

When Kubernetes needs to evict pods - during node drains, cluster upgrades, or autoscaler scale-downs - it does not know which of your pods are critical and which can safely restart. PodDisruptionBudgets (PDBs) tell Kubernetes the minimum number of pods that must remain running during voluntary disruptions. Without them, a node drain could take down all replicas of your service simultaneously.

This guide covers creating PDBs with Terraform and understanding when and how to use them effectively.

## What PodDisruptionBudgets Protect Against

PDBs protect against voluntary disruptions - actions initiated by the cluster administrator or automation:

- Node drains during upgrades (`kubectl drain`)
- Cluster Autoscaler removing underutilized nodes
- Spot/preemptible instance termination (when the cloud provider signals in advance)
- Maintenance operations on the underlying infrastructure

They do not protect against involuntary disruptions like hardware failures, kernel panics, or OOM kills. For those, you need multiple replicas and proper health checks.

## Basic PDB with minAvailable

The `minAvailable` field specifies the minimum number of pods that must remain available during disruptions.

```hcl
# A deployment with 3 replicas
resource "kubernetes_deployment" "api" {
  metadata {
    name      = "api"
    namespace = "production"
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "api"
      }
    }

    template {
      metadata {
        labels = {
          app = "api"
        }
      }

      spec {
        container {
          name  = "api"
          image = "my-api:1.0.0"

          port {
            container_port = 8080
          }
        }
      }
    }
  }
}

# PDB ensuring at least 2 pods are always running
resource "kubernetes_pod_disruption_budget_v1" "api" {
  metadata {
    name      = "api"
    namespace = "production"
  }

  spec {
    min_available = "2"

    selector {
      match_labels = {
        app = "api"
      }
    }
  }
}
```

With this PDB, Kubernetes will only evict one pod at a time from the `api` deployment, always keeping at least 2 running. If a node drain tries to evict a pod and doing so would drop the available count below 2, the drain blocks until another pod is ready on a different node.

## PDB with maxUnavailable

Alternatively, specify the maximum number of pods that can be down simultaneously.

```hcl
# PDB allowing at most 1 pod to be unavailable
resource "kubernetes_pod_disruption_budget_v1" "worker" {
  metadata {
    name      = "worker"
    namespace = "production"
  }

  spec {
    max_unavailable = "1"

    selector {
      match_labels = {
        app = "worker"
      }
    }
  }
}
```

The difference between `minAvailable` and `maxUnavailable` matters when your replica count changes. If you have 5 replicas and set `minAvailable = 4`, that always means 1 can be disrupted. But if you scale down to 3 replicas, `minAvailable = 4` becomes impossible to satisfy and disruptions are blocked entirely. `maxUnavailable = 1` works regardless of replica count.

## Percentage-Based PDBs

You can use percentages instead of absolute numbers, which scales with your deployment.

```hcl
# Allow up to 25% of pods to be unavailable
resource "kubernetes_pod_disruption_budget_v1" "frontend" {
  metadata {
    name      = "frontend"
    namespace = "production"
  }

  spec {
    max_unavailable = "25%"

    selector {
      match_labels = {
        app = "frontend"
      }
    }
  }
}
```

With 4 replicas, 25% means 1 pod can be unavailable. With 8 replicas, 2 can be unavailable. Percentages are rounded up, so with 3 replicas, 25% rounds up to 1.

## PDBs for StatefulSets

StatefulSets are particularly important to protect since they often run databases and other stateful workloads.

```hcl
# StatefulSet for a database
resource "kubernetes_stateful_set" "postgres" {
  metadata {
    name      = "postgres"
    namespace = "database"
  }

  spec {
    replicas     = 3
    service_name = "postgres"

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
          image = "postgres:16"
        }
      }
    }
  }
}

# Strict PDB for the database - always keep quorum
resource "kubernetes_pod_disruption_budget_v1" "postgres" {
  metadata {
    name      = "postgres"
    namespace = "database"
  }

  spec {
    # For a 3-node database, 2 must always be running for quorum
    min_available = "2"

    selector {
      match_labels = {
        app = "postgres"
      }
    }
  }
}
```

## PDBs for All Common Workloads

Create PDBs alongside every production deployment using a module or locals pattern.

```hcl
# Define all services with their PDB requirements
locals {
  services = {
    api = {
      replicas        = 3
      max_unavailable = "1"
    }
    frontend = {
      replicas        = 4
      max_unavailable = "25%"
    }
    worker = {
      replicas        = 5
      max_unavailable = "2"
    }
    scheduler = {
      replicas        = 2
      max_unavailable = "1"
    }
  }
}

# Create deployments
resource "kubernetes_deployment" "services" {
  for_each = local.services

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
          image = "${each.key}:latest"
        }
      }
    }
  }
}

# Create PDBs for all services
resource "kubernetes_pod_disruption_budget_v1" "services" {
  for_each = local.services

  metadata {
    name      = each.key
    namespace = "production"
  }

  spec {
    max_unavailable = each.value.max_unavailable

    selector {
      match_labels = {
        app = each.key
      }
    }
  }
}
```

## PDBs for System Components

Do not forget PDBs for infrastructure components like ingress controllers and monitoring.

```hcl
# PDB for NGINX ingress controller
resource "kubernetes_pod_disruption_budget_v1" "nginx_ingress" {
  metadata {
    name      = "nginx-ingress-controller"
    namespace = "ingress-nginx"
  }

  spec {
    min_available = "1"

    selector {
      match_labels = {
        "app.kubernetes.io/name"      = "ingress-nginx"
        "app.kubernetes.io/component" = "controller"
      }
    }
  }
}

# PDB for CoreDNS
resource "kubernetes_pod_disruption_budget_v1" "coredns" {
  metadata {
    name      = "coredns"
    namespace = "kube-system"
  }

  spec {
    min_available = "1"

    selector {
      match_labels = {
        "k8s-app" = "kube-dns"
      }
    }
  }
}
```

## Common Pitfalls

### PDB That Blocks All Evictions

Setting `minAvailable` equal to your replica count means no pods can ever be evicted:

```hcl
# BAD: This blocks all voluntary disruptions
resource "kubernetes_pod_disruption_budget_v1" "bad_pdb" {
  metadata {
    name      = "too-strict"
    namespace = "production"
  }

  spec {
    # If deployment has 3 replicas and minAvailable is 3,
    # no pod can ever be evicted
    min_available = "3"  # Do not do this for a 3-replica deployment

    selector {
      match_labels = {
        app = "my-app"
      }
    }
  }
}
```

This means node drains will hang indefinitely, cluster upgrades will stall, and the autoscaler cannot reclaim nodes. Always allow at least one pod to be disrupted.

### PDB for Single-Replica Deployments

PDBs on single-replica deployments are tricky. `minAvailable = 1` means the pod can never be evicted, blocking drains. Consider whether you actually need the PDB:

```hcl
# For single-replica deployments, use maxUnavailable = 0
# only if you truly need zero downtime during disruptions
# Otherwise, just accept the disruption
resource "kubernetes_pod_disruption_budget_v1" "singleton" {
  metadata {
    name      = "singleton"
    namespace = "production"
  }

  spec {
    # This allows eviction - the pod will briefly be down
    max_unavailable = "1"

    selector {
      match_labels = {
        app = "singleton"
      }
    }
  }
}
```

## Monitoring PDB Status

Check PDB status to ensure they are not blocking operations:

```bash
# List all PDBs and their status
kubectl get pdb -A

# Describe a specific PDB
kubectl describe pdb api -n production

# Check for PDBs that might block drains
kubectl get pdb -A -o json | jq '.items[] | select(.status.disruptionsAllowed == 0) | .metadata.name'
```

## Best Practices

- Create a PDB for every production deployment with more than 1 replica
- Use `maxUnavailable` instead of `minAvailable` for better behavior during scaling
- Never set `minAvailable` equal to your replica count
- Use percentages for deployments that scale frequently
- For databases with quorum requirements, set `minAvailable` to your quorum size
- Test PDBs by draining a node and verifying pods are evicted one at a time
- Monitor PDB status - stuck PDBs block cluster upgrades and autoscaling
- Include PDBs for system components like ingress controllers and CoreDNS

For more on Kubernetes reliability, see our guide on [handling Kubernetes rolling updates in Terraform](https://oneuptime.com/blog/post/2026-02-23-kubernetes-rolling-updates-terraform/view).
