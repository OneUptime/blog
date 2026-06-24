# How to Configure EKS Network Policies with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EKS, Network Policies, Kubernetes, Security, VPC CNI, Infrastructure as Code

Description: Learn how to enable and configure Kubernetes Network Policies on EKS using the VPC CNI network policy controller with OpenTofu to restrict pod-to-pod communication.

## Introduction

Kubernetes Network Policies define how pods can communicate with each other and external endpoints. On EKS, the Amazon VPC CNI plugin supports standard Kubernetes NetworkPolicies on supported Amazon EC2 Linux nodes, enforcing them with eBPF without an additional CNI plugin.

## Prerequisites

- OpenTofu v1.6+
- Amazon EKS cluster on supported Amazon EC2 Linux nodes with a supported Kubernetes/platform version for VPC CNI network policies
- Linux kernel 5.10+ on worker nodes
- VPC CNI add-on version 1.21.0+
- Network policy support enabled on the VPC CNI add-on

## Step 1: Enable Network Policy Support on VPC CNI

```hcl
# Update VPC CNI add-on with network policy support enabled

resource "aws_eks_addon" "vpc_cni" {
  cluster_name             = var.cluster_name
  addon_name               = "vpc-cni"
  addon_version            = data.aws_eks_addon_version.vpc_cni.version
  service_account_role_arn = aws_iam_role.vpc_cni.arn
  resolve_conflicts_on_update = "OVERWRITE"

  # Enable network policy support and policy decision logs
  configuration_values = jsonencode({
    enableNetworkPolicy = "true"
    nodeAgent = {
      enablePolicyEventLogs = "true"
    }
  })
}
```

## Step 2: Create a Default Deny-All Policy

```hcl
# Deny all ingress and egress by default in the apps namespace
# This establishes a default-deny baseline once the policy is enforced
resource "kubernetes_network_policy" "default_deny" {
  metadata {
    name      = "default-deny-all"
    namespace = "apps"
  }

  spec {
    pod_selector {}  # Selects all pods in the namespace

    # Empty ingress means deny all inbound traffic
    # Empty egress means deny all outbound traffic
    policy_types = ["Ingress", "Egress"]
  }
}
```

## Step 3: Allow Frontend to Backend Communication

```hcl
# Allow frontend pods to communicate with backend pods on port 8080
resource "kubernetes_network_policy" "frontend_to_backend" {
  metadata {
    name      = "allow-frontend-to-backend"
    namespace = "apps"
  }

  spec {
    # This policy applies to backend pods
    pod_selector {
      match_labels = { role = "backend" }
    }

    ingress {
      # Allow traffic from pods with role=frontend
      from {
        pod_selector {
          match_labels = { role = "frontend" }
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

## Step 4: Allow DNS Egress for All Pods

```hcl
# Allow all pods to reach CoreDNS for name resolution
resource "kubernetes_network_policy" "allow_dns" {
  metadata {
    name      = "allow-dns-egress"
    namespace = "apps"
  }

  spec {
    pod_selector {}

    egress {
      # Allow UDP/TCP on port 53 for DNS
      to {
        namespace_selector {
          match_labels = { "kubernetes.io/metadata.name" = "kube-system" }
        }
        pod_selector {
          match_labels = { "k8s-app" = "kube-dns" }
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

## Step 5: Allow Cross-Namespace Traffic

```hcl
# Allow the monitoring namespace to scrape metrics from apps namespace
resource "kubernetes_network_policy" "allow_monitoring" {
  metadata {
    name      = "allow-monitoring-scrape"
    namespace = "apps"
  }

  spec {
    pod_selector {}

    ingress {
      from {
        namespace_selector {
          match_labels = { "kubernetes.io/metadata.name" = "monitoring" }
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

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply

# Verify network policies are active
kubectl -n apps get networkpolicies
```

## Conclusion

Kubernetes Network Policies on EKS with the VPC CNI add-on provide eBPF-based, kernel-level traffic enforcement on supported EC2 Linux nodes without requiring an additional CNI plugin. Always start with a default-deny policy and explicitly allow required traffic flows. Label your pods consistently to enable precise policy targeting. Use `kubectl describe networkpolicy` to verify policy application and check the VPC CNI network policy logs for enforcement visibility.
