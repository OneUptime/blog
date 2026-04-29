# How to Deploy Linkerd Service Mesh on Kubernetes with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Linkerd, Service Mesh, OpenTofu, Helm, mTLS, Observability

Description: Learn how to deploy Linkerd service mesh on Kubernetes using OpenTofu and Helm for lightweight, automatic mTLS, golden metrics observability, and traffic management.

## Overview

Linkerd is a lightweight, security-first service mesh for Kubernetes. It automatically encrypts meshed pod-to-pod traffic with mTLS, provides golden metrics (success rate, latency, throughput), and adds traffic routing with minimal overhead. OpenTofu deploys Linkerd using the official CRD and control plane charts.

## Step 1: Generate and Store Linkerd Certificates

```hcl
# main.tf - Generate trust anchor and issuer certificates for Linkerd

resource "tls_private_key" "trust_anchor" {
  algorithm = "ECDSA"
  ecdsa_curve = "P256"
}

resource "tls_self_signed_cert" "trust_anchor" {
  private_key_pem = tls_private_key.trust_anchor.private_key_pem

  subject {
    common_name = "root.linkerd.cluster.local"
  }

  is_ca_certificate     = true
  validity_period_hours = 87600  # 10 years
  allowed_uses          = ["cert_signing", "crl_signing"]
}

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
  cert_request_pem      = tls_cert_request.issuer.cert_request_pem
  ca_private_key_pem    = tls_private_key.trust_anchor.private_key_pem
  ca_cert_pem           = tls_self_signed_cert.trust_anchor.cert_pem
  is_ca_certificate     = true
  validity_period_hours = 8760  # 1 year
  allowed_uses          = ["cert_signing"]
}
```

## Step 2: Deploy Linkerd CRDs and Control Plane

```hcl
# Install Linkerd CRDs and Gateway API first
resource "helm_release" "linkerd_crds" {
  name             = "linkerd-crds"
  repository       = "https://helm.linkerd.io/edge"
  chart            = "linkerd-crds"
  namespace        = "linkerd"
  create_namespace = true

  set {
    name  = "installGatewayAPI"
    value = "true"
  }
}

# Deploy Linkerd control plane
resource "helm_release" "linkerd_control_plane" {
  name       = "linkerd-control-plane"
  repository = "https://helm.linkerd.io/edge"
  chart      = "linkerd-control-plane"
  namespace  = "linkerd"

  depends_on = [helm_release.linkerd_crds]

  set {
    name  = "identityTrustAnchorsPEM"
    value = tls_self_signed_cert.trust_anchor.cert_pem
  }

  set_sensitive {
    name  = "identity.issuer.tls.crtPEM"
    value = tls_locally_signed_cert.issuer.cert_pem
  }

  set_sensitive {
    name  = "identity.issuer.tls.keyPEM"
    value = tls_private_key.issuer.private_key_pem
  }

  values = [yamlencode({
    controllerReplicas = 2

    proxy = {
      resources = {
        cpu = {
          request = "100m"
          limit   = "1000m"
        }
        memory = {
          request = "20Mi"
          limit   = "250Mi"
        }
      }
    }
  })]
}

# Deploy Linkerd Viz (observability)
resource "helm_release" "linkerd_viz" {
  name             = "linkerd-viz"
  repository       = "https://helm.linkerd.io/edge"
  chart            = "linkerd-viz"
  namespace        = "linkerd-viz"
  create_namespace = true

  depends_on = [helm_release.linkerd_control_plane]

  values = [yamlencode({
    dashboard = {
      replicas = 1
    }
    prometheus = {
      enabled = true
    }
  })]
}
```

## Step 3: Annotate Namespaces for Injection

```hcl
# Enable Linkerd proxy injection for a namespace
resource "kubernetes_namespace" "production" {
  metadata {
    name = "production"
    annotations = {
      "linkerd.io/inject" = "enabled"
    }
  }
}
```

## Step 4: HTTPRoute for Canary Deployments

```hcl
# Linkerd HTTPRoute for weighted canary traffic
resource "kubernetes_manifest" "canary_route" {
  depends_on = [helm_release.linkerd_control_plane]

  manifest = {
    apiVersion = "gateway.networking.k8s.io/v1"
    kind       = "HTTPRoute"
    metadata = {
      name      = "app-split"
      namespace = "production"
    }
    spec = {
      parentRefs = [{
        name  = "app"
        kind  = "Service"
        group = "core"
        port  = 80
      }]
      rules = [{
        backendRefs = [
          {
            name   = "app-stable"
            port   = 80
            weight = 90
          },
          {
            name   = "app-canary"
            port   = 80
            weight = 10
          }
        ]
      }]
    }
  }
}
```

## Step 5: HTTPRoute for Retries and Timeouts

```hcl
# Define per-route policies for the API service
resource "kubernetes_manifest" "api_route_policy" {
  depends_on = [helm_release.linkerd_control_plane]

  manifest = {
    apiVersion = "gateway.networking.k8s.io/v1"
    kind       = "HTTPRoute"
    metadata = {
      name      = "api-orders-route"
      namespace = "production"
      annotations = {
        "retry.linkerd.io/http"      = "5xx"
        "retry.linkerd.io/limit"     = "2"
        "retry.linkerd.io/timeout"   = "1s"
        "timeout.linkerd.io/request" = "5s"
      }
    }
    spec = {
      parentRefs = [{
        name  = "api"
        kind  = "Service"
        group = "core"
        port  = 80
      }]
      rules = [{
        matches = [{
          method = "GET"
          path = {
            type  = "Exact"
            value = "/api/orders"
          }
        }]
      }]
    }
  }
}
```

## Summary

Linkerd deployed with OpenTofu provides a lightweight service mesh with zero-configuration mTLS for meshed workloads using the proxy injection model. The Viz extension delivers golden metrics - success rate, requests per second, and latency percentiles - for every meshed service. HTTPRoutes add per-route timeout and retry policies, and weighted HTTPRoute backends enable progressive delivery without application changes.
