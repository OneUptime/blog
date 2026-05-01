# How to Deploy Service Mesh (Istio) with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Kubernetes, Istio, Service Mesh, mTLS, Traffic Management, Infrastructure as Code

Description: Learn how to deploy Istio service mesh on Kubernetes with OpenTofu using Helm, including installation of the control plane, ingress gateway, and enabling sidecar injection per namespace.

---

Istio provides mTLS between services, traffic management, and observability without code changes. Deploying Istio with OpenTofu ensures the control plane, gateways, and namespace configurations are reproducible and version-controlled.

## Istio Architecture

```mermaid
graph TB
    A[Istio Ingress Gateway] --> B[Service A<br/>+ Envoy Sidecar]
    B --> C[Service B<br/>+ Envoy Sidecar]
    B --> D[Service C<br/>+ Envoy Sidecar]
    E[Istiod Control Plane] -.->|Config| B
    E -.->|Config| C
    E -.->|Config| D
```

## Install Istio via Helm

```hcl
# istio.tf

# Step 1: Install Istio base (CRDs)

resource "helm_release" "istio_base" {
  name             = "istio-base"
  repository       = "https://istio-release.storage.googleapis.com/charts"
  chart            = "base"
  version          = "1.29.2"
  namespace        = "istio-system"
  create_namespace = true

  set {
    name  = "defaultRevision"
    value = "default"
  }
}

# Step 2: Install Istiod control plane
resource "helm_release" "istiod" {
  name       = "istiod"
  repository = "https://istio-release.storage.googleapis.com/charts"
  chart      = "istiod"
  version    = "1.29.2"
  namespace  = "istio-system"

  values = [
    yamlencode({
      resources = {
        requests = { cpu = "200m", memory = "200Mi" }
      }

      autoscaleEnabled = true
      autoscaleMin     = 1
      autoscaleMax     = 5

      meshConfig = {
        # Enable proxy access logging
        accessLogFile = "/dev/stdout"

        # Set default proxy tracing sampling (1%)
        defaultConfig = {
          tracing = {
            sampling = 1.0
          }
        }
      }

      global = {
        proxy = {
          resources = {
            requests = { cpu = "10m", memory = "40Mi" }
            limits   = { cpu = "200m", memory = "256Mi" }
          }
        }
      }
    })
  ]

  depends_on = [helm_release.istio_base]
}

# Step 3: Install Ingress Gateway
resource "helm_release" "istio_ingress" {
  name       = "istio-ingressgateway"
  repository = "https://istio-release.storage.googleapis.com/charts"
  chart      = "gateway"
  version    = "1.29.2"
  namespace  = "istio-ingress"

  create_namespace = true

  values = [
    yamlencode({
      service = {
        type = "LoadBalancer"
      }
      autoscaling = {
        enabled = false
      }
      replicaCount = var.environment == "production" ? 3 : 2
    })
  ]

  depends_on = [helm_release.istiod]
}
```

## Enable Sidecar Injection per Namespace

```hcl
# namespaces.tf
resource "kubernetes_namespace" "apps" {
  metadata {
    name = "apps"
    labels = {
      # Enable automatic sidecar injection
      "istio-injection" = "enabled"
    }
  }
}

resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = "monitoring"
    labels = {
      "istio-injection" = "enabled"
    }
  }
}
```

## PeerAuthentication for mTLS

```hcl
# mtls.tf - apply after the Istio CRDs exist
resource "kubernetes_manifest" "peer_authentication_strict" {
  manifest = {
    apiVersion = "security.istio.io/v1"
    kind       = "PeerAuthentication"
    metadata = {
      name      = "default"
      namespace = "istio-system"
    }
    spec = {
      mtls = {
        mode = "STRICT"  # Enforce mTLS mesh-wide from the root namespace
      }
    }
  }

  depends_on = [helm_release.istiod]
}
```

## Gateway and VirtualService

```hcl
# gateway.tf - apply after the Istio CRDs exist
resource "kubernetes_manifest" "gateway" {
  manifest = {
    apiVersion = "networking.istio.io/v1"
    kind       = "Gateway"
    metadata = {
      name      = "app-gateway"
      namespace = "apps"
    }
    spec = {
      selector = {
        istio = "ingressgateway"
      }
      servers = [{
        port = {
          number   = 443
          name     = "https"
          protocol = "HTTPS"
        }
        tls = {
          mode           = "SIMPLE"
          credentialName = "app-tls-cert"
        }
        hosts = [var.app_domain]
      }]
    }
  }

  depends_on = [helm_release.istio_ingress]
}

resource "kubernetes_manifest" "virtual_service" {
  manifest = {
    apiVersion = "networking.istio.io/v1"
    kind       = "VirtualService"
    metadata = {
      name      = "app"
      namespace = "apps"
    }
    spec = {
      hosts    = [var.app_domain]
      gateways = ["app-gateway"]
      http = [{
        route = [{
          destination = {
            host = "app-service"
            port = { number = 80 }
          }
        }]
      }]
    }
  }

  depends_on = [kubernetes_manifest.gateway]
}
```

## Best Practices

- Install Istio in the order: base (CRDs) → istiod → gateways - use `depends_on` to enforce this.
- Enable `STRICT` mTLS mode with a `PeerAuthentication` in the root namespace, and use `PERMISSIVE` temporarily during migration to avoid breaking existing traffic.
- Set sidecar proxy resource limits - without them, proxies consume unbounded memory on high-traffic services.
- Use `kubernetes_manifest` for Istio custom resources after the Istio CRDs already exist - on a fresh cluster, apply the Helm releases first and then apply the Istio custom resources in a second run.
- Pin supported Helm chart versions and test Istio upgrades in staging first - Istio upgrades can break traffic routing if versions are mismatched.
