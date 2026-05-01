# How to Deploy CoreDNS on EKS with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EKS, CoreDNS, DNS, Kubernetes, Service Discovery, Infrastructure as Code

Description: Learn how to configure and tune CoreDNS on EKS using OpenTofu to optimize DNS resolution performance and configure custom DNS rules for service discovery.

## Introduction

CoreDNS is the default DNS server for Kubernetes clusters, handling service discovery and external DNS resolution for pods. On EKS, you can run it as an Amazon EKS add-on, which this guide uses. This guide covers deploying, tuning, and customizing CoreDNS configuration for production workloads.

## Prerequisites

- OpenTofu v1.6+
- An existing EKS cluster
- AWS provider configured
- `kubectl` configured for the cluster

## Step 1: Deploy CoreDNS as an EKS Add-On

```hcl
# Deploy CoreDNS via the EKS managed add-on

data "aws_eks_cluster" "this" {
  name = var.cluster_name
}

data "aws_eks_addon_version" "coredns" {
  addon_name         = "coredns"
  kubernetes_version = data.aws_eks_cluster.this.version
  most_recent        = true
}

resource "aws_eks_addon" "coredns" {
  cluster_name                = var.cluster_name
  addon_name                  = "coredns"
  addon_version               = data.aws_eks_addon_version.coredns.version
  configuration_values        = jsonencode(local.coredns_config)
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "OVERWRITE"

  tags = {
    Name    = "coredns"
    Cluster = var.cluster_name
  }
}
```

## Step 2: Tune CoreDNS Resources for Production

```hcl
# These values become part of aws_eks_addon.coredns.configuration_values.
locals {
  coredns_config_base = {
    resources = {
      requests = {
        cpu    = "100m"
        memory = "70Mi"
      }
      limits = {
        memory = "170Mi"
      }
    }
  }
}
```

## Step 3: Customize CoreDNS Configuration

```hcl
# Extend the add-on configuration with a custom Corefile.
locals {
  coredns_config_with_corefile = merge(local.coredns_config_base, {
    corefile = <<-EOF
      .:53 {
          errors
          health {
             lameduck 5s
          }
          ready
          kubernetes cluster.local in-addr.arpa ip6.arpa {
             pods insecure
             fallthrough in-addr.arpa ip6.arpa
             ttl 30
          }
          # Forward on-premises domain to corporate DNS
          forward corp.example.com 192.168.1.10 192.168.1.11 {
             force_tcp
          }
          # Cache DNS responses for better performance
          cache 30
          loop
          reload
          loadbalance
          # Enable Prometheus metrics
          prometheus :9153
          forward . /etc/resolv.conf {
             max_concurrent 1000
          }
          log . {
             class error
          }
      }
    EOF
  })
}
```

## Step 4: Configure EKS-Managed CoreDNS Autoscaling

CoreDNS autoscaling requires an EKS platform version and CoreDNS add-on version that support the feature.

```hcl
# Enable EKS-managed autoscaling instead of a separate Kubernetes HPA.
locals {
  coredns_config = merge(local.coredns_config_with_corefile, {
    autoScaling = {
      enabled     = true
      minReplicas = 2
      maxReplicas = 10
    }
  })
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Verify the CoreDNS rollout completed
kubectl rollout status deployment/coredns --namespace kube-system

# Verify CoreDNS is running
kubectl -n kube-system get pods -l k8s-app=kube-dns
kubectl -n kube-system logs -l k8s-app=kube-dns --tail=20

# Test DNS resolution from a pod
kubectl run dns-test --image=busybox --rm -it --restart=Never -- nslookup kubernetes.default
```

## Conclusion

Properly tuned CoreDNS is critical for cluster-wide service discovery performance. Use EKS-managed autoscaling, enable caching to reduce upstream DNS load, and configure custom forwarding rules for hybrid environments. Monitor CoreDNS metrics via Prometheus (`coredns_dns_requests_total`) to detect DNS bottlenecks before they impact application performance.
