# How to Deploy HashiCorp Consul on Kubernetes with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Consul, Service Mesh, Service Discovery, OpenTofu, Helm

Description: Learn how to deploy HashiCorp Consul on Kubernetes using OpenTofu and Helm to enable service mesh, service discovery, and health checking for microservices.

## Overview

HashiCorp Consul provides service discovery, service mesh with mTLS, health checking, and a key-value store. OpenTofu deploys Consul via the official Helm chart with server HA mode and connect service mesh enabled.

## Step 1: Deploy Consul with Helm

```hcl
# main.tf - Deploy HashiCorp Consul via Helm

resource "helm_release" "consul" {
  name             = "consul"
  repository       = "https://helm.releases.hashicorp.com"
  chart            = "consul"
  version          = "1.3.0"
  namespace        = "consul"
  create_namespace = true

  values = [yamlencode({
    global = {
      name       = "consul"
      datacenter = "dc1"

      # Enable TLS for all Consul communications
      tls = {
        enabled = true
      }

      # Enable Gossip encryption
      gossipEncryption = {
        autoGenerate = true
      }

      # Enable ACLs
      acls = {
        manageSystemACLs = true
      }

      metrics = {
        enabled          = true
        enableAgentMetrics = true
      }
    }

    server = {
      enabled   = true
      replicas  = 3

      resources = {
        requests = { memory = "100Mi", cpu = "100m" }
        limits   = { memory = "256Mi", cpu = "200m" }
      }

      storage = "10Gi"
    }

    client = {
      enabled = true

      resources = {
        requests = { memory = "100Mi", cpu = "100m" }
        limits   = { memory = "200Mi", cpu = "200m" }
      }
    }

    # Enable connect service mesh
    connectInject = {
      enabled = true
      default = false  # Opt-in per namespace/pod

      resources = {
        requests = { memory = "50Mi", cpu = "50m" }
        limits   = { memory = "100Mi", cpu = "100m" }
      }
    }

    # Consul UI
    ui = {
      enabled = true
      service = {
        type = "ClusterIP"
      }
    }

    # Ingress gateway for external traffic
    ingressGateways = {
      enabled = true
      defaults = {
        replicas = 2
      }
      gateways = [{
        name = "ingress-gateway"
        service = {
          type = "LoadBalancer"
        }
      }]
    }
  })]
}
```

## Step 2: Enable Service Mesh for a Workload

```hcl
# Create the application namespace
resource "kubernetes_namespace" "app" {
  metadata {
    name = "production"
  }
}

# Opt a pod into Consul Connect injection via pod annotation.
# With connectInject.default = false, each pod opts in by setting
# the consul.hashicorp.com/connect-inject annotation to "true".
resource "kubernetes_deployment" "frontend" {
  metadata {
    name      = "frontend-service"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "frontend-service"
      }
    }

    template {
      metadata {
        labels = {
          app = "frontend-service"
        }
        annotations = {
          "consul.hashicorp.com/connect-inject" = "true"
        }
      }

      spec {
        container {
          name  = "frontend"
          image = "nginx:1.27"
        }
      }
    }
  }
}
```

## Step 3: Service Intentions (mTLS Authorization)

```hcl
# Define which services can communicate with each other
resource "kubernetes_manifest" "service_intention" {
  depends_on = [helm_release.consul]

  manifest = {
    apiVersion = "consul.hashicorp.com/v1alpha1"
    kind       = "ServiceIntentions"
    metadata = {
      name      = "api-allow-frontend"
      namespace = "production"
    }
    spec = {
      destination = {
        name = "api-service"
      }
      sources = [
        {
          name   = "frontend-service"
          action = "allow"
        },
        {
          name   = "*"
          action = "deny"  # Deny all other sources
        }
      ]
    }
  }
}
```

## Step 4: Consul Ingress Gateway Configuration

```hcl
# Configure Consul ingress gateway to route external traffic
resource "kubernetes_manifest" "ingress_gateway" {
  manifest = {
    apiVersion = "consul.hashicorp.com/v1alpha1"
    kind       = "IngressGateway"
    metadata = {
      name      = "ingress-gateway"
      namespace = "consul"
    }
    spec = {
      listeners = [
        {
          port     = 80
          protocol = "http"
          services = [
            {
              name = "frontend-service"
              hosts = ["app.example.com"]
            }
          ]
        }
      ]
    }
  }
}
```

## Summary

HashiCorp Consul deployed with OpenTofu on Kubernetes provides a full service mesh with automatic mTLS between services, service discovery via DNS, and fine-grained access control through Service Intentions. The connect inject approach adds a sidecar proxy to pods without code changes, making it easy to incrementally adopt the service mesh in existing applications.
