# How to Create Kubernetes DaemonSets with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, DaemonSet, Infrastructure as Code, Monitoring, Logging

Description: How to create Kubernetes DaemonSets with Terraform to run pods on every node for logging, monitoring, and system-level tasks.

---

DaemonSets ensure that a copy of a pod runs on every node (or a selected subset of nodes) in your cluster. They are the right choice for cluster-wide services like log collectors, monitoring agents, network plugins, and storage daemons. When a new node joins the cluster, the DaemonSet automatically schedules a pod on it. When a node is removed, the pod is garbage collected.

This guide walks through creating DaemonSets with Terraform for common use cases, including node selection, tolerations, and resource management.

## Provider Setup

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

## Basic DaemonSet - Log Collector

A Fluentd log collector is one of the most common DaemonSet use cases.

```hcl
# fluentd_daemonset.tf - Log collection agent on every node
resource "kubernetes_daemonset" "fluentd" {
  metadata {
    name      = "fluentd"
    namespace = "logging"

    labels = {
      app        = "fluentd"
      managed-by = "terraform"
    }
  }

  spec {
    selector {
      match_labels = {
        app = "fluentd"
      }
    }

    template {
      metadata {
        labels = {
          app = "fluentd"
        }
      }

      spec {
        # Run as a system service account with appropriate permissions
        service_account_name = "fluentd"

        # Tolerate master node taints so logs are collected there too
        toleration {
          key      = "node-role.kubernetes.io/control-plane"
          operator = "Exists"
          effect   = "NoSchedule"
        }

        toleration {
          key      = "node-role.kubernetes.io/master"
          operator = "Exists"
          effect   = "NoSchedule"
        }

        container {
          name  = "fluentd"
          image = "fluent/fluentd-kubernetes-daemonset:v1.16-debian-elasticsearch8-1"

          env {
            name  = "FLUENT_ELASTICSEARCH_HOST"
            value = "elasticsearch.logging.svc.cluster.local"
          }

          env {
            name  = "FLUENT_ELASTICSEARCH_PORT"
            value = "9200"
          }

          # Mount the node's log directories
          volume_mount {
            name       = "varlog"
            mount_path = "/var/log"
            read_only  = true
          }

          volume_mount {
            name       = "containers"
            mount_path = "/var/lib/docker/containers"
            read_only  = true
          }

          # Set resource limits to prevent the agent from consuming too much
          resources {
            requests = {
              cpu    = "100m"
              memory = "200Mi"
            }
            limits = {
              cpu    = "300m"
              memory = "512Mi"
            }
          }
        }

        # Mount host paths for log access
        volume {
          name = "varlog"
          host_path {
            path = "/var/log"
          }
        }

        volume {
          name = "containers"
          host_path {
            path = "/var/lib/docker/containers"
          }
        }

        # Use the host network if needed for network monitoring
        # host_network = true
      }
    }
  }
}
```

## Node Monitoring DaemonSet

Run a Prometheus node exporter on every node to collect system metrics.

```hcl
# node_exporter.tf - System metrics collection
resource "kubernetes_daemonset" "node_exporter" {
  metadata {
    name      = "node-exporter"
    namespace = "monitoring"

    labels = {
      app = "node-exporter"
    }
  }

  spec {
    selector {
      match_labels = {
        app = "node-exporter"
      }
    }

    template {
      metadata {
        labels = {
          app = "node-exporter"
        }

        annotations = {
          # Prometheus scrape configuration
          "prometheus.io/scrape" = "true"
          "prometheus.io/port"   = "9100"
          "prometheus.io/path"   = "/metrics"
        }
      }

      spec {
        # Use host network and PID namespace for accurate system metrics
        host_network = true
        host_pid     = true

        # Tolerate all taints to run on every single node
        toleration {
          operator = "Exists"
        }

        container {
          name  = "node-exporter"
          image = "prom/node-exporter:v1.7.0"

          args = [
            "--path.procfs=/host/proc",
            "--path.sysfs=/host/sys",
            "--path.rootfs=/host/root",
            "--collector.filesystem.mount-points-exclude=^/(dev|proc|sys|var/lib/docker/.+)($|/)",
          ]

          port {
            container_port = 9100
            host_port      = 9100
            name           = "metrics"
          }

          # Mount host filesystem paths (read-only)
          volume_mount {
            name       = "proc"
            mount_path = "/host/proc"
            read_only  = true
          }

          volume_mount {
            name       = "sys"
            mount_path = "/host/sys"
            read_only  = true
          }

          volume_mount {
            name       = "root"
            mount_path = "/host/root"
            read_only  = true
            mount_propagation = "HostToContainer"
          }

          resources {
            requests = {
              cpu    = "50m"
              memory = "64Mi"
            }
            limits = {
              cpu    = "200m"
              memory = "128Mi"
            }
          }
        }

        volume {
          name = "proc"
          host_path {
            path = "/proc"
          }
        }

        volume {
          name = "sys"
          host_path {
            path = "/sys"
          }
        }

        volume {
          name = "root"
          host_path {
            path = "/"
          }
        }
      }
    }
  }
}
```

## DaemonSet with Node Selection

Sometimes you only want a DaemonSet to run on specific nodes, like GPU nodes or nodes in a certain availability zone.

```hcl
# selective_daemonset.tf - Run only on nodes with specific labels
resource "kubernetes_daemonset" "gpu_monitor" {
  metadata {
    name      = "gpu-monitor"
    namespace = "monitoring"
  }

  spec {
    selector {
      match_labels = {
        app = "gpu-monitor"
      }
    }

    template {
      metadata {
        labels = {
          app = "gpu-monitor"
        }
      }

      spec {
        # Only schedule on nodes with GPU label
        node_selector = {
          "accelerator" = "nvidia-gpu"
        }

        # Tolerate the GPU taint
        toleration {
          key      = "nvidia.com/gpu"
          operator = "Exists"
          effect   = "NoSchedule"
        }

        container {
          name  = "dcgm-exporter"
          image = "nvcr.io/nvidia/k8s/dcgm-exporter:3.3.0-3.2.0-ubuntu22.04"

          port {
            container_port = 9400
            name           = "metrics"
          }

          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
            limits = {
              cpu    = "200m"
              memory = "256Mi"
            }
          }

          security_context {
            privileged = true
          }
        }
      }
    }
  }
}
```

## DaemonSet with Node Affinity

For more complex node selection logic, use node affinity.

```hcl
# affinity_daemonset.tf - DaemonSet with node affinity rules
resource "kubernetes_daemonset" "zone_agent" {
  metadata {
    name      = "zone-agent"
    namespace = "system"
  }

  spec {
    selector {
      match_labels = {
        app = "zone-agent"
      }
    }

    template {
      metadata {
        labels = {
          app = "zone-agent"
        }
      }

      spec {
        affinity {
          node_affinity {
            required_during_scheduling_ignored_during_execution {
              node_selector_term {
                match_expressions {
                  key      = "topology.kubernetes.io/zone"
                  operator = "In"
                  values   = ["us-central1-a", "us-central1-b"]
                }
              }

              node_selector_term {
                match_expressions {
                  key      = "node.kubernetes.io/instance-type"
                  operator = "NotIn"
                  values   = ["t3.micro", "t3.small"]
                }
              }
            }
          }
        }

        container {
          name  = "agent"
          image = "myregistry.io/zone-agent:v1.0"

          resources {
            requests = {
              cpu    = "50m"
              memory = "64Mi"
            }
            limits = {
              cpu    = "100m"
              memory = "128Mi"
            }
          }
        }
      }
    }
  }
}
```

## Update Strategy

DaemonSets support rolling updates to minimize disruption.

```hcl
# The update strategy controls how pods are replaced
spec {
  selector {
    match_labels = {
      app = "my-daemon"
    }
  }

  # Rolling update (default) - update one node at a time
  strategy {
    type = "RollingUpdate"

    rolling_update {
      max_unavailable = "1"  # Update one node at a time
    }
  }

  # Or use OnDelete - pods only update when manually deleted
  # strategy {
  #   type = "OnDelete"
  # }
}
```

## ServiceAccount and RBAC for DaemonSets

DaemonSets often need special permissions to access node-level resources.

```hcl
# rbac.tf - ServiceAccount and permissions for the DaemonSet
resource "kubernetes_service_account" "fluentd" {
  metadata {
    name      = "fluentd"
    namespace = "logging"
  }
}

resource "kubernetes_cluster_role" "fluentd" {
  metadata {
    name = "fluentd"
  }

  rule {
    api_groups = [""]
    resources  = ["pods", "namespaces"]
    verbs      = ["get", "list", "watch"]
  }
}

resource "kubernetes_cluster_role_binding" "fluentd" {
  metadata {
    name = "fluentd"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role.fluentd.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.fluentd.metadata[0].name
    namespace = "logging"
  }
}
```

## Monitoring Your DaemonSets

DaemonSets should have 100% availability - if a DaemonSet pod is not running on a node, that node is not being monitored, its logs are not being collected, or its network plugin is missing. Monitor the DaemonSet's `desiredNumberScheduled` versus `currentNumberScheduled` to catch gaps. [OneUptime](https://oneuptime.com) can help you monitor the overall health of your cluster infrastructure, ensuring your DaemonSet-powered observability stack is itself observed.

## Summary

DaemonSets are the right tool for any workload that needs to run on every node (or a selected subset). Common use cases include log collection, node monitoring, network plugins, and storage daemons. With Terraform, you can manage these cluster-wide services alongside your application infrastructure, using node selectors, tolerations, and affinity rules to control exactly where pods run. Remember to set appropriate resource limits to prevent agents from starving application workloads.
