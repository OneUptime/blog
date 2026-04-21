# How to Deploy Traefik Ingress Controller on Kubernetes with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Traefik, Ingress Controller, OpenTofu, Helm, Load Balancer

Description: Learn how to deploy Traefik ingress controller on Kubernetes using OpenTofu and Helm with TLS termination, middleware, rate limiting, and automatic Let's Encrypt certificate provisioning.

## Overview

Traefik is a cloud-native reverse proxy and ingress controller with built-in service discovery, automatic TLS via Let's Encrypt, and a powerful middleware system for authentication, rate limiting, and request transformation. OpenTofu deploys Traefik via the official Helm chart.

## Step 1: Deploy Traefik with Helm

```hcl
# main.tf - Deploy Traefik via Helm

resource "helm_release" "traefik" {
  name             = "traefik"
  repository       = "https://traefik.github.io/charts"
  chart            = "traefik"
  version          = "39.0.8"
  namespace        = "traefik"
  create_namespace = true

  values = [yamlencode({
    deployment = {
      # Use a single replica with Traefik's built-in ACME storage.
      replicas = 1
    }

    # Enable ACME (Let's Encrypt) for automatic TLS
    certificatesResolvers = {
      letsencrypt = {
        acme = {
          email   = var.acme_email
          storage = "/data/acme.json"
          httpChallenge = {
            entryPoint = "web"
          }
        }
      }
    }

    # Entry points
    ports = {
      web = {
        port = 8000
        expose = {
          default = true
        }
        exposedPort = 80
        protocol = "TCP"
        http = {
          redirections = {
            entryPoint = {
              to     = "websecure"
              scheme = "https"
            }
          }
        }
      }
      websecure = {
        port = 8443
        expose = {
          default = true
        }
        exposedPort = 443
        protocol = "TCP"
        http = {
          tls = {
            enabled      = true
            certResolver = "letsencrypt"
          }
        }
      }
    }

    # Persistent storage for ACME certificate data
    persistence = {
      enabled = true
      size    = "1Gi"
      path    = "/data"
    }

    # Traefik dashboard
    ingressRoute = {
      dashboard = {
        enabled = false  # Disable public dashboard in production
      }
    }

    # Metrics
    metrics = {
      prometheus = {
        entryPoint        = "metrics"
        addServicesLabels = true
      }
    }

    resources = {
      requests = { cpu = "100m", memory = "128Mi" }
      limits   = { cpu = "500m", memory = "512Mi" }
    }
  })]
}
```

## Step 2: Create an IngressRoute

```hcl
# Traefik IngressRoute with TLS
resource "kubernetes_manifest" "ingress_route" {
  depends_on = [helm_release.traefik]

  manifest = {
    apiVersion = "traefik.io/v1alpha1"
    kind       = "IngressRoute"
    metadata = {
      name      = "app-ingress"
      namespace = "default"
    }
    spec = {
      entryPoints = ["websecure"]
      routes = [
        {
          match = "Host(`app.example.com`) && PathPrefix(`/api`)"
          kind  = "Rule"
          services = [{
            name = "api-service"
            port = 8080
          }]
          middlewares = [
            { name = "rate-limit" }
          ]
        },
        {
          match = "Host(`app.example.com`)"
          kind  = "Rule"
          services = [{
            name = "frontend-service"
            port = 80
          }]
        }
      ]
      tls = {
        certResolver = "letsencrypt"
      }
    }
  }
}
```

## Step 3: Rate Limiting Middleware

```hcl
# Rate limiting middleware
resource "kubernetes_manifest" "rate_limit_middleware" {
  depends_on = [helm_release.traefik]

  manifest = {
    apiVersion = "traefik.io/v1alpha1"
    kind       = "Middleware"
    metadata = {
      name      = "rate-limit"
      namespace = "default"
    }
    spec = {
      rateLimit = {
        average = 100  # 100 requests per second
        burst   = 50   # Allow bursts of 50
        period  = "1s"
        sourceCriterion = {
          ipStrategy = {
            depth = 1
          }
        }
      }
    }
  }
}

# Basic auth middleware
resource "kubernetes_manifest" "basic_auth_middleware" {
  depends_on = [helm_release.traefik]

  manifest = {
    apiVersion = "traefik.io/v1alpha1"
    kind       = "Middleware"
    metadata = {
      name      = "basic-auth"
      namespace = "default"
    }
    spec = {
      basicAuth = {
        secret = "traefik-basic-auth"
      }
    }
  }
}
```

## Summary

Traefik deployed with OpenTofu provides a developer-friendly ingress controller with built-in Let's Encrypt integration, eliminating the need for cert-manager in single-instance setups. The middleware system enables request transformation, authentication, and rate limiting as reusable components. IngressRoute custom resources provide more expressive routing rules than standard Kubernetes Ingress, supporting complex matching conditions and weighted traffic splitting.
