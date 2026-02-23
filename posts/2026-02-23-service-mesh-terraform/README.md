# How to Deploy Service Mesh with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Service Mesh, Istio, Linkerd, Infrastructure as Code, DevOps

Description: Learn how to deploy and configure service meshes like Istio and Linkerd on Kubernetes using Terraform, including traffic management, mTLS, and observability setup.

---

A service mesh adds a dedicated infrastructure layer for service-to-service communication. It handles mutual TLS, traffic routing, retries, circuit breaking, and observability without requiring changes to your application code. Deploying a service mesh through Terraform gives you repeatable, version-controlled infrastructure that integrates with the rest of your Kubernetes platform.

This guide covers deploying both Istio and Linkerd using Terraform, along with common traffic management patterns.

## Choosing Between Istio and Linkerd

Istio is the feature-rich option. It supports complex traffic routing, fault injection, multi-cluster networking, and extensive policy management. The tradeoff is higher resource consumption and operational complexity.

Linkerd is the lightweight option. It focuses on simplicity and performance, with lower resource overhead and an easier learning curve. It does mutual TLS and observability well but has fewer traffic management features than Istio.

## Deploying Istio with Terraform

Istio is best installed using its official Helm charts, which split the installation into base components, istiod (the control plane), and optional gateways.

```hcl
# Create the istio-system namespace
resource "kubernetes_namespace" "istio_system" {
  metadata {
    name = "istio-system"

    labels = {
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }
}

# Install Istio base (CRDs and cluster-wide resources)
resource "helm_release" "istio_base" {
  name       = "istio-base"
  repository = "https://istio-release.storage.googleapis.com/charts"
  chart      = "base"
  namespace  = kubernetes_namespace.istio_system.metadata[0].name
  version    = "1.20.0"

  wait = true
}

# Install istiod (control plane)
resource "helm_release" "istiod" {
  name       = "istiod"
  repository = "https://istio-release.storage.googleapis.com/charts"
  chart      = "istiod"
  namespace  = kubernetes_namespace.istio_system.metadata[0].name
  version    = "1.20.0"

  values = [
    yamlencode({
      pilot = {
        resources = {
          requests = {
            cpu    = "200m"
            memory = "256Mi"
          }
          limits = {
            memory = "1Gi"
          }
        }
        autoscaleEnabled = true
        autoscaleMin     = 2
        autoscaleMax     = 5
      }

      # Global mesh configuration
      meshConfig = {
        # Enable access logging
        accessLogFile = "/dev/stdout"
        # Enable mTLS by default
        defaultConfig = {
          holdApplicationUntilProxyStarts = true
        }
      }

      global = {
        # Proxy (sidecar) configuration
        proxy = {
          resources = {
            requests = {
              cpu    = "50m"
              memory = "64Mi"
            }
            limits = {
              memory = "256Mi"
            }
          }
        }
      }
    })
  ]

  depends_on = [helm_release.istio_base]

  wait    = true
  timeout = 300
}

# Install Istio Ingress Gateway
resource "helm_release" "istio_gateway" {
  name       = "istio-ingress"
  repository = "https://istio-release.storage.googleapis.com/charts"
  chart      = "gateway"
  namespace  = kubernetes_namespace.istio_system.metadata[0].name
  version    = "1.20.0"

  values = [
    yamlencode({
      replicaCount = 2

      service = {
        type = "LoadBalancer"
        annotations = {
          "service.beta.kubernetes.io/aws-load-balancer-type" = "nlb"
        }
      }

      autoscaling = {
        enabled     = true
        minReplicas = 2
        maxReplicas = 10
      }
    })
  ]

  depends_on = [helm_release.istiod]
}
```

## Enabling Sidecar Injection

Istio injects sidecar proxies into pods. Enable it per namespace with a label.

```hcl
# Enable Istio sidecar injection for the production namespace
resource "kubernetes_namespace" "production" {
  metadata {
    name = "production"

    labels = {
      # This label tells Istio to inject sidecars into all pods
      "istio-injection" = "enabled"
    }
  }
}
```

## Istio Traffic Management

Once Istio is running, use VirtualServices and DestinationRules for traffic management.

```hcl
# Gateway for external traffic
resource "kubectl_manifest" "gateway" {
  yaml_body = <<YAML
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingress
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*.example.com"
      tls:
        httpsRedirect: true
    - port:
        number: 443
        name: https
        protocol: HTTPS
      hosts:
        - "*.example.com"
      tls:
        mode: SIMPLE
        credentialName: wildcard-tls
YAML

  depends_on = [helm_release.istio_gateway]
}

# VirtualService for traffic routing
resource "kubectl_manifest" "app_virtual_service" {
  yaml_body = <<YAML
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: production
spec:
  hosts:
    - app.example.com
  gateways:
    - istio-system/main-gateway
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: my-app
            subset: canary
    - route:
        - destination:
            host: my-app
            subset: stable
          weight: 90
        - destination:
            host: my-app
            subset: canary
          weight: 10
YAML

  depends_on = [helm_release.istiod]
}

# DestinationRule for traffic policies
resource "kubectl_manifest" "app_destination_rule" {
  yaml_body = <<YAML
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-app
  namespace: production
spec:
  host: my-app
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
  subsets:
    - name: stable
      labels:
        version: v1
    - name: canary
      labels:
        version: v2
YAML

  depends_on = [helm_release.istiod]
}
```

## Deploying Linkerd with Terraform

Linkerd requires trust anchors and issuer certificates. Generate them before installation.

```hcl
# Generate the trust anchor certificate
resource "tls_private_key" "trust_anchor" {
  algorithm   = "ECDSA"
  ecdsa_curve = "P256"
}

resource "tls_self_signed_cert" "trust_anchor" {
  private_key_pem = tls_private_key.trust_anchor.private_key_pem

  subject {
    common_name = "root.linkerd.cluster.local"
  }

  validity_period_hours = 87600  # 10 years
  is_ca_certificate     = true

  allowed_uses = [
    "cert_signing",
    "crl_signing",
  ]
}

# Generate the issuer certificate signed by the trust anchor
resource "tls_private_key" "issuer" {
  algorithm   = "ECDSA"
  ecdsa_curve = "P256"
}

resource "tls_cert_request" "issuer" {
  private_key_pem = tls_private_key.issuer.private_key_pem

  subject {
    common_name = "identity.linkerd.cluster.local"
  }
}

resource "tls_locally_signed_cert" "issuer" {
  cert_request_pem   = tls_cert_request.issuer.cert_request_pem
  ca_private_key_pem = tls_private_key.trust_anchor.private_key_pem
  ca_cert_pem        = tls_self_signed_cert.trust_anchor.cert_pem

  validity_period_hours = 8760  # 1 year
  is_ca_certificate     = true

  allowed_uses = [
    "cert_signing",
    "crl_signing",
  ]
}

# Install Linkerd CRDs
resource "helm_release" "linkerd_crds" {
  name       = "linkerd-crds"
  repository = "https://helm.linkerd.io/stable"
  chart      = "linkerd-crds"
  namespace  = "linkerd"
  create_namespace = true
  version    = "1.8.0"
}

# Install Linkerd control plane
resource "helm_release" "linkerd" {
  name       = "linkerd-control-plane"
  repository = "https://helm.linkerd.io/stable"
  chart      = "linkerd-control-plane"
  namespace  = "linkerd"
  version    = "1.16.0"

  values = [
    yamlencode({
      identityTrustAnchorsPEM = tls_self_signed_cert.trust_anchor.cert_pem
      identity = {
        issuer = {
          tls = {
            crtPEM = tls_locally_signed_cert.issuer.cert_pem
            keyPEM = tls_private_key.issuer.private_key_pem
          }
        }
      }
    })
  ]

  depends_on = [helm_release.linkerd_crds]

  wait    = true
  timeout = 300
}
```

## Enabling Linkerd for Namespaces

```hcl
# Annotate a namespace for Linkerd injection
resource "kubernetes_namespace" "app" {
  metadata {
    name = "production"

    annotations = {
      "linkerd.io/inject" = "enabled"
    }
  }
}
```

## Strict mTLS with Istio

Enforce mutual TLS across the mesh.

```hcl
# Enforce strict mTLS for the entire mesh
resource "kubectl_manifest" "strict_mtls" {
  yaml_body = <<YAML
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
YAML

  depends_on = [helm_release.istiod]
}
```

## Best Practices

- Start with a small scope: enable the mesh for one namespace first, then expand
- Monitor sidecar resource consumption and adjust proxy resource limits
- Use gradual traffic shifting (canary) for deployments
- Keep trust anchor certificates with long validity (5-10 years) and rotate issuer certificates more frequently
- Enable access logging in the mesh for troubleshooting
- Use PeerAuthentication to enforce strict mTLS
- Monitor mesh health with the built-in dashboards (Kiali for Istio, Linkerd Viz for Linkerd)

For more on traffic routing, see our guide on [deploying ingress controllers with Terraform](https://oneuptime.com/blog/post/2026-02-23-ingress-controllers-terraform/view).
