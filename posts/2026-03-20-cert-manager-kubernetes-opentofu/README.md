# How to Deploy cert-manager on Kubernetes with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cert-Manager, TLS, OpenTofu, Helm, Certificate, Let's Encrypt

Description: Learn how to deploy cert-manager on Kubernetes using OpenTofu and Helm to automate TLS certificate provisioning and renewal from Let's Encrypt and other issuers.

## Overview

cert-manager automates TLS certificate management in Kubernetes. It integrates with Let's Encrypt, HashiCorp Vault, and other certificate authorities to issue and renew certificates automatically. OpenTofu deploys cert-manager via Helm and configures ClusterIssuers declaratively. Because `ClusterIssuer` and `Certificate` are custom resources, apply them only after cert-manager is installed and its CRDs exist in the cluster.

## Step 1: Deploy cert-manager with Helm

```hcl
# main.tf - Deploy cert-manager via Helm

terraform {
  required_providers {
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

# Install cert-manager CRDs and controller
resource "helm_release" "cert_manager" {
  name             = "cert-manager"
  repository       = "https://charts.jetstack.io"
  chart            = "cert-manager"
  version          = "v1.20.2"
  namespace        = "cert-manager"
  create_namespace = true

  set {
    name  = "crds.enabled"
    value = "true"
  }

  set {
    name  = "replicaCount"
    value = "2"
  }

  set {
    name  = "prometheus.enabled"
    value = "true"
  }

  values = [yamlencode({
    global = {
      leaderElection = {
        namespace = "cert-manager"
      }
    }
    resources = {
      requests = { cpu = "50m", memory = "64Mi" }
      limits   = { cpu = "200m", memory = "256Mi" }
    }
  })]
}
```

## Step 2: Configure Let's Encrypt ClusterIssuers

```hcl
# Apply these manifests in a second OpenTofu run, after cert-manager is installed and its CRDs exist
resource "kubernetes_manifest" "cluster_issuer_staging" {
  depends_on = [helm_release.cert_manager]

  manifest = {
    apiVersion = "cert-manager.io/v1"
    kind       = "ClusterIssuer"
    metadata = {
      name = "letsencrypt-staging"
    }
    spec = {
      acme = {
        server = "https://acme-staging-v02.api.letsencrypt.org/directory"
        email  = var.acme_email
        privateKeySecretRef = {
          name = "letsencrypt-staging-account-key"
        }
        solvers = [{
          http01 = {
            ingress = {
              ingressClassName = "nginx"
            }
          }
        }]
      }
    }
  }
}

# Production issuer - use after staging validation
resource "kubernetes_manifest" "cluster_issuer_production" {
  depends_on = [helm_release.cert_manager]

  manifest = {
    apiVersion = "cert-manager.io/v1"
    kind       = "ClusterIssuer"
    metadata = {
      name = "letsencrypt-production"
    }
    spec = {
      acme = {
        server = "https://acme-v02.api.letsencrypt.org/directory"
        email  = var.acme_email
        privateKeySecretRef = {
          name = "letsencrypt-production-account-key"
        }
        solvers = [{
          http01 = {
            ingress = {
              ingressClassName = "nginx"
            }
          }
        }]
      }
    }
  }
}
```

## Step 3: DNS-01 Challenge with Route53

```hcl
# DNS-01 challenge for wildcard certificates using AWS Route53
# Assumes cert-manager can authenticate to Route53 with ambient AWS credentials such as IRSA or EKS Pod Identity
resource "kubernetes_manifest" "cluster_issuer_dns" {
  depends_on = [helm_release.cert_manager]

  manifest = {
    apiVersion = "cert-manager.io/v1"
    kind       = "ClusterIssuer"
    metadata = {
      name = "letsencrypt-dns01"
    }
    spec = {
      acme = {
        server = "https://acme-v02.api.letsencrypt.org/directory"
        email  = var.acme_email
        privateKeySecretRef = {
          name = "letsencrypt-dns01-key"
        }
        solvers = [{
          dns01 = {
            route53 = {
              region       = "us-east-1"
              hostedZoneID = var.route53_zone_id
            }
          }
        }]
      }
    }
  }
}
```

## Step 4: Issue a Certificate

```hcl
# Request a certificate for an application after the ClusterIssuer exists
resource "kubernetes_manifest" "app_certificate" {
  depends_on = [kubernetes_manifest.cluster_issuer_production]

  manifest = {
    apiVersion = "cert-manager.io/v1"
    kind       = "Certificate"
    metadata = {
      name      = "app-tls"
      namespace = "default"
    }
    spec = {
      secretName = "app-tls-secret"
      issuerRef = {
        name = "letsencrypt-production"
        kind = "ClusterIssuer"
      }
      dnsNames = [
        "app.example.com",
        "www.app.example.com"
      ]
      # Renew 30 days before expiry
      renewBefore = "720h"
    }
  }
}
```

## Step 5: Annotated Ingress (Alternative to Certificate resource)

```hcl
# Ingress with cert-manager annotation - automatically provisions certificate
resource "kubernetes_ingress_v1" "app" {
  metadata {
    name      = "app-ingress"
    namespace = "default"
    annotations = {
      "cert-manager.io/cluster-issuer"            = "letsencrypt-production"
      "nginx.ingress.kubernetes.io/ssl-redirect"  = "true"
    }
  }

  spec {
    ingress_class_name = "nginx"

    tls {
      hosts       = ["app.example.com"]
      secret_name = "app-tls-ingress"
    }

    rule {
      host = "app.example.com"
      http {
        path {
          path      = "/"
          path_type = "Prefix"
          backend {
            service {
              name = "app-service"
              port { number = 80 }
            }
          }
        }
      }
    }
  }
}
```

## Summary

cert-manager deployed with OpenTofu automates TLS certificate lifecycle management. Combining HTTP-01 challenges for non-wildcard certificates and DNS-01 challenges for wildcard certificates covers the common ACME use cases. The annotated Ingress approach is the simplest path - cert-manager detects the annotation and provisions certificates automatically without requiring a separate Certificate resource.
