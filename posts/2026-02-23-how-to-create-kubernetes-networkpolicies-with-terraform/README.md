# How to Create Kubernetes NetworkPolicies with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, NetworkPolicies, Security, Networking, Infrastructure as Code

Description: How to create Kubernetes NetworkPolicies with Terraform to control pod-to-pod traffic and secure your cluster network.

---

By default, all pods in a Kubernetes cluster can communicate with every other pod. That is convenient for getting started but problematic for production security. NetworkPolicies let you define rules for which pods can talk to which other pods, effectively creating a firewall at the pod level. Managing these policies through Terraform means your network security rules are code-reviewed and applied consistently.

This guide covers creating NetworkPolicies with Terraform, from basic deny rules to complex multi-tier application policies.

## Prerequisites

NetworkPolicies only work if your cluster has a network plugin that supports them. Calico, Cilium, and Weave Net support NetworkPolicies. The default kubenet plugin on some cloud providers does not. On GKE, you need to enable network policy enforcement. On EKS, you need Calico or Cilium installed.

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

## Default Deny All Ingress

The first policy you should apply to any namespace is a default deny. This blocks all incoming traffic to pods unless explicitly allowed.

```hcl
# deny_all.tf - Block all ingress by default
resource "kubernetes_network_policy" "default_deny_ingress" {
  metadata {
    name      = "default-deny-ingress"
    namespace = "production"
  }

  spec {
    # Empty pod_selector matches ALL pods in the namespace
    pod_selector {}

    # Apply to ingress traffic
    policy_types = ["Ingress"]

    # No ingress rules = deny all incoming traffic
  }
}
```

## Default Deny All Egress

You can also restrict outgoing traffic from pods.

```hcl
# deny_egress.tf - Block all egress by default
resource "kubernetes_network_policy" "default_deny_egress" {
  metadata {
    name      = "default-deny-egress"
    namespace = "production"
  }

  spec {
    pod_selector {}

    policy_types = ["Egress"]

    # No egress rules = deny all outgoing traffic
  }
}
```

## Default Deny All (Ingress and Egress)

```hcl
# deny_all_both.tf - Block all traffic in both directions
resource "kubernetes_network_policy" "default_deny_all" {
  metadata {
    name      = "default-deny-all"
    namespace = "production"
  }

  spec {
    pod_selector {}

    policy_types = ["Ingress", "Egress"]
  }
}
```

## Allow Specific Ingress Traffic

After applying a default deny, create policies to allow the traffic you want.

```hcl
# allow_web_ingress.tf - Allow ingress to the web tier
resource "kubernetes_network_policy" "allow_web_ingress" {
  metadata {
    name      = "allow-web-ingress"
    namespace = "production"
  }

  spec {
    # Apply to pods labeled app=web
    pod_selector {
      match_labels = {
        app = "web"
      }
    }

    policy_types = ["Ingress"]

    ingress {
      # Allow traffic from the ingress controller namespace
      from {
        namespace_selector {
          match_labels = {
            name = "ingress-nginx"
          }
        }
      }

      # Only on port 8080
      ports {
        port     = "8080"
        protocol = "TCP"
      }
    }
  }
}
```

## Three-Tier Application Network Policy

A common pattern is a three-tier application where the frontend talks to the API, and the API talks to the database. No other communication should be allowed.

```hcl
# three_tier.tf - Network policies for a three-tier application

# Frontend can receive traffic from ingress and send to API
resource "kubernetes_network_policy" "frontend_policy" {
  metadata {
    name      = "frontend-policy"
    namespace = "production"
  }

  spec {
    pod_selector {
      match_labels = {
        tier = "frontend"
      }
    }

    policy_types = ["Ingress", "Egress"]

    # Allow ingress from ingress controller
    ingress {
      from {
        namespace_selector {
          match_labels = {
            name = "ingress-nginx"
          }
        }
      }

      ports {
        port     = "80"
        protocol = "TCP"
      }
    }

    # Allow egress to API tier
    egress {
      to {
        pod_selector {
          match_labels = {
            tier = "api"
          }
        }
      }

      ports {
        port     = "8080"
        protocol = "TCP"
      }
    }

    # Allow DNS lookups
    egress {
      to {
        namespace_selector {}

        pod_selector {
          match_labels = {
            "k8s-app" = "kube-dns"
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
  }
}

# API can receive from frontend and send to database
resource "kubernetes_network_policy" "api_policy" {
  metadata {
    name      = "api-policy"
    namespace = "production"
  }

  spec {
    pod_selector {
      match_labels = {
        tier = "api"
      }
    }

    policy_types = ["Ingress", "Egress"]

    # Allow ingress from frontend tier
    ingress {
      from {
        pod_selector {
          match_labels = {
            tier = "frontend"
          }
        }
      }

      ports {
        port     = "8080"
        protocol = "TCP"
      }
    }

    # Allow egress to database tier
    egress {
      to {
        pod_selector {
          match_labels = {
            tier = "database"
          }
        }
      }

      ports {
        port     = "5432"
        protocol = "TCP"
      }
    }

    # Allow DNS lookups
    egress {
      to {
        namespace_selector {}

        pod_selector {
          match_labels = {
            "k8s-app" = "kube-dns"
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
  }
}

# Database only accepts traffic from the API tier
resource "kubernetes_network_policy" "database_policy" {
  metadata {
    name      = "database-policy"
    namespace = "production"
  }

  spec {
    pod_selector {
      match_labels = {
        tier = "database"
      }
    }

    policy_types = ["Ingress", "Egress"]

    # Only the API tier can connect
    ingress {
      from {
        pod_selector {
          match_labels = {
            tier = "api"
          }
        }
      }

      ports {
        port     = "5432"
        protocol = "TCP"
      }
    }

    # Allow DNS for the database (needed for some replication setups)
    egress {
      to {
        namespace_selector {}

        pod_selector {
          match_labels = {
            "k8s-app" = "kube-dns"
          }
        }
      }

      ports {
        port     = "53"
        protocol = "UDP"
      }
    }
  }
}
```

## Allow Traffic from Specific Namespaces

```hcl
# cross_namespace.tf - Allow traffic from monitoring namespace
resource "kubernetes_network_policy" "allow_monitoring" {
  metadata {
    name      = "allow-monitoring-scrape"
    namespace = "production"
  }

  spec {
    pod_selector {}  # All pods in the namespace

    policy_types = ["Ingress"]

    ingress {
      # Allow Prometheus to scrape metrics
      from {
        namespace_selector {
          match_labels = {
            name = "monitoring"
          }
        }

        pod_selector {
          match_labels = {
            app = "prometheus"
          }
        }
      }

      ports {
        port     = "9090"
        protocol = "TCP"
      }
    }
  }
}
```

## Allow Egress to External Services

```hcl
# external_egress.tf - Allow pods to reach external APIs
resource "kubernetes_network_policy" "allow_external_api" {
  metadata {
    name      = "allow-external-api"
    namespace = "production"
  }

  spec {
    pod_selector {
      match_labels = {
        needs-external-access = "true"
      }
    }

    policy_types = ["Egress"]

    # Allow HTTPS to specific external CIDR ranges
    egress {
      to {
        ip_block {
          cidr = "0.0.0.0/0"

          # Block internal traffic through this rule
          except = [
            "10.0.0.0/8",
            "172.16.0.0/12",
            "192.168.0.0/16",
          ]
        }
      }

      ports {
        port     = "443"
        protocol = "TCP"
      }
    }

    # Allow DNS
    egress {
      to {
        namespace_selector {}

        pod_selector {
          match_labels = {
            "k8s-app" = "kube-dns"
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
  }
}
```

## Applying Policies Across Namespaces

```hcl
# multi_namespace_policies.tf - Apply default deny to multiple namespaces
variable "secure_namespaces" {
  type    = list(string)
  default = ["production", "staging", "backend", "frontend"]
}

resource "kubernetes_network_policy" "default_deny" {
  for_each = toset(var.secure_namespaces)

  metadata {
    name      = "default-deny-all"
    namespace = each.value
  }

  spec {
    pod_selector {}
    policy_types = ["Ingress", "Egress"]
  }
}
```

## Testing NetworkPolicies

After applying policies, test them to make sure they work as expected.

```bash
# Test connectivity between pods
kubectl exec -n production deploy/frontend -- curl -s --max-time 3 http://api-service:8080/health

# This should be blocked
kubectl exec -n production deploy/frontend -- curl -s --max-time 3 http://database:5432

# Test DNS resolution still works
kubectl exec -n production deploy/frontend -- nslookup api-service
```

## Monitoring Network Security

NetworkPolicies are only effective if they are correctly configured and actively enforced. Monitor for pods that bypass network policies (misconfigured labels), legitimate traffic being blocked (missing allow rules), and policy enforcement failures. [OneUptime](https://oneuptime.com) can help you monitor application connectivity, detecting when services cannot communicate due to network policy changes.

## Summary

Kubernetes NetworkPolicies managed through Terraform provide pod-level network segmentation. Start with default deny policies in every namespace, then explicitly allow the traffic your application needs. The three-tier pattern (frontend, API, database) is a good starting template. Always remember to allow DNS egress (port 53), and test your policies after applying them. NetworkPolicies are additive - if any policy allows a connection, it is allowed, even if another policy would deny it.
