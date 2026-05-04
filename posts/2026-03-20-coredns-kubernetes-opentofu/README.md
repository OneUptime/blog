# How to Configure CoreDNS with OpenTofu on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Kubernetes, CoreDNS, DNS, Service Discovery, Infrastructure as Code

Description: Learn how to configure CoreDNS on Kubernetes clusters using OpenTofu to customize DNS resolution, add stub zones, and forward queries for service discovery.

## Introduction

CoreDNS is the default DNS server in Kubernetes clusters. While Kubernetes manages a default CoreDNS deployment, you often need to customize it - adding forwarding rules, stub zones for on-premises DNS, or custom hosts entries. OpenTofu with the Kubernetes provider manages CoreDNS configuration as code.

## Provider Setup

```hcl
terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }
}

provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = var.kube_context
}
```

## Customizing the CoreDNS ConfigMap

Patch the existing CoreDNS ConfigMap to add custom DNS rules.

```hcl
resource "kubernetes_config_map_v1" "coredns" {
  metadata {
    name      = "coredns"
    namespace = "kube-system"
  }

  data = {
    Corefile = <<-EOF
      .:53 {
        errors
        health {
          lameduck 5s
        }
        ready

        # Kubernetes in-cluster DNS
        kubernetes cluster.local in-addr.arpa ip6.arpa {
          pods insecure
          fallthrough in-addr.arpa ip6.arpa
          ttl 30
        }

        # Forward on-premises domain to internal DNS
        forward corporate.example.com 10.0.0.2 10.0.0.3 {
          max_concurrent 1000
        }

        # Forward a specific internal domain to its resolver
        forward internal.example.com 192.168.1.1

        prometheus :9153
        forward . /etc/resolv.conf {
          max_concurrent 1000
        }
        cache 30
        loop
        reload
        loadbalance
      }
    EOF
  }

  lifecycle {
    # Prevent tofu from reverting changes made by Kubernetes admission controllers
    ignore_changes = [metadata[0].annotations]
  }
}
```

## Deploying CoreDNS via Helm

For EKS or custom clusters, deploy CoreDNS with custom values via Helm.

```hcl
resource "helm_release" "coredns" {
  name       = "coredns"
  repository = "https://coredns.github.io/helm"
  chart      = "coredns"
  namespace  = "kube-system"
  version    = "1.29.0"

  values = [
    yamlencode({
      replicaCount = 2

      resources = {
        limits = {
          memory = "170Mi"
        }
        requests = {
          cpu    = "100m"
          memory = "70Mi"
        }
      }

      # Custom Corefile passed through Helm values
      servers = [{
        zones = [{ zone = "." }]
        port  = 53
        plugins = [
          { name = "errors" },
          { name = "health", configBlock = "lameduck 5s" },
          { name = "ready" },
          {
            name        = "kubernetes"
            parameters  = "cluster.local in-addr.arpa ip6.arpa"
            configBlock = "pods insecure\nfallthrough in-addr.arpa ip6.arpa\nttl 30"
          },
          { name = "forward", parameters = ". /etc/resolv.conf" },
          { name = "cache", parameters = "30" },
          { name = "loadbalance" }
        ]
      }]
    })
  ]
}
```

## Custom Hosts Entry

Add static host entries for specific names.

```hcl
# Add custom hosts to CoreDNS via a hosts plugin addition

locals {
  custom_hosts = <<-EOF
    10.0.1.50 legacy-db.internal
    10.0.1.51 legacy-api.internal
  EOF
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan

# Restart CoreDNS pods to reload config
kubectl rollout restart deployment coredns -n kube-system
```

## Summary

CoreDNS customization is essential for Kubernetes clusters that need to resolve on-premises domains, route DNS to internal resolvers, or add static host entries. OpenTofu manages CoreDNS ConfigMaps and Helm deployments as code, making DNS configuration reviewable, versioned, and consistent across clusters.
