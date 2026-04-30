# How to Configure GKE Network Policy with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GKE, Network Policy, Kubernetes, OpenTofu, Security, Networking

Description: Learn how to enable and configure GKE Network Policy with OpenTofu to control pod-to-pod communication using Kubernetes Network Policy resources.

## Overview

GKE Network Policy controls which pods can communicate with each other and with external endpoints. OpenTofu can enable Calico network policy on a Standard cluster or provision GKE Dataplane V2, then deploy NetworkPolicy resources for microsegmentation.

## Step 1: Enable Network Policy on GKE Cluster

```hcl
# main.tf - GKE cluster with network policy enabled

resource "google_container_cluster" "cluster" {
  name     = "network-policy-cluster"
  location = "us-central1"

  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name

  networking_mode = "VPC_NATIVE"
  ip_allocation_policy {}

  # Enable Calico network policy on a GKE Standard cluster
  network_policy {
    enabled  = true
    provider = "CALICO"
  }

  addons_config {
    network_policy_config {
      disabled = false
    }
  }

  # For GKE Dataplane V2, remove the network_policy block above and use:
  # datapath_provider = "ADVANCED_DATAPATH"
}
```

## Step 2: Default Deny All Policy

```hcl
# Default deny-all ingress and egress policy - must be paired with allow rules
resource "kubernetes_network_policy_v1" "default_deny_all" {
  metadata {
    name      = "default-deny-all"
    namespace = "production"
  }

  spec {
    pod_selector {}  # Empty = applies to all pods in namespace

    # No ingress or egress rules + both policy types = deny all traffic
    policy_types = ["Ingress", "Egress"]
  }
}
```

## Step 3: Allow Frontend to Backend Communication

```hcl
# Allow frontend pods to reach backend pods on port 8080
resource "kubernetes_network_policy_v1" "frontend_to_backend" {
  metadata {
    name      = "allow-frontend-to-backend"
    namespace = "production"
  }

  spec {
    pod_selector {
      match_labels = {
        app = "backend"
      }
    }

    ingress {
      from {
        pod_selector {
          match_labels = {
            app = "frontend"
          }
        }
      }

      ports {
        port     = "8080"
        protocol = "TCP"
      }
    }

    policy_types = ["Ingress"]
  }
}
```

## Step 4: Allow DNS Egress

```hcl
# Allow pods to reach the cluster DNS service for DNS resolution
resource "kubernetes_network_policy_v1" "allow_dns" {
  metadata {
    name      = "allow-dns-egress"
    namespace = "production"
  }

  spec {
    pod_selector {}

    egress {
      to {
        namespace_selector {
          match_labels = {
            "kubernetes.io/metadata.name" = "kube-system"
          }
        }
        pod_selector {
          match_labels = {
            k8s-app = "kube-dns"
          }
        }
      }

      ports {
        port     = "53"
        protocol = "UDP"
      }

      ports {
        port     = "53"
        protocol = "TCP"
      }
    }

    policy_types = ["Egress"]
  }
}
```

## Step 5: Cross-Namespace Communication

```hcl
# Allow monitoring namespace to scrape metrics from production pods
resource "kubernetes_network_policy_v1" "allow_monitoring_scrape" {
  metadata {
    name      = "allow-monitoring-scrape"
    namespace = "production"
  }

  spec {
    pod_selector {
      match_labels = {
        "prometheus.io/scrape" = "true"
      }
    }

    ingress {
      from {
        namespace_selector {
          match_labels = {
            "kubernetes.io/metadata.name" = "monitoring"
          }
        }
      }

      ports {
        port     = "9090"
        protocol = "TCP"
      }
    }

    policy_types = ["Ingress"]
  }
}
```

## Summary

GKE Network Policy with OpenTofu enables microsegmentation within Kubernetes clusters. Start with a default deny-all policy and progressively add allow rules for legitimate traffic flows. This zero-trust approach ensures that compromised pods cannot freely communicate within the cluster.
