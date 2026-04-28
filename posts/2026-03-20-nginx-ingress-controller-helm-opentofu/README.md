# How to Deploy NGINX Ingress Controller with Helm and OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Nginx, Ingress, Helm, OpenTofu, Infrastructure

Description: Learn how to deploy the NGINX Ingress Controller with Helm and OpenTofu for Kubernetes HTTP/HTTPS routing with TLS termination and rate limiting.

## Overview

NGINX Ingress Controller is one of the most widely used Kubernetes ingress implementations. OpenTofu manages the Helm release with production-ready configurations including HPA, anti-affinity rules, and custom NGINX settings.

## Step 1: Configure the Helm Provider

```hcl
# main.tf - Helm provider configuration

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

provider "helm" {
  kubernetes {
    config_path = "~/.kube/config"
  }
}
```

## Step 2: Deploy NGINX Ingress Controller

```hcl
# Deploy NGINX Ingress Controller via Helm
resource "helm_release" "nginx_ingress" {
  name             = "ingress-nginx"
  repository       = "https://kubernetes.github.io/ingress-nginx"
  chart            = "ingress-nginx"
  namespace        = "ingress-nginx"
  create_namespace = true
  version          = "4.9.1"

  values = [
    yamlencode({
      controller = {
        # Replica count with HPA
        replicaCount = 2

        # Anti-affinity for spreading across nodes
        affinity = {
          podAntiAffinity = {
            requiredDuringSchedulingIgnoredDuringExecution = [
              {
                topologyKey = "kubernetes.io/hostname"
                labelSelector = {
                  matchLabels = {
                    "app.kubernetes.io/component" = "controller"
                  }
                }
              }
            ]
          }
        }

        # HPA for automatic scaling
        autoscaling = {
          enabled     = true
          minReplicas = 2
          maxReplicas = 10
          targetCPUUtilizationPercentage    = 80
          targetMemoryUtilizationPercentage = 80
        }

        # Custom NGINX configuration
        config = {
          use-gzip              = "true"
          gzip-level            = "6"
          proxy-body-size       = "50m"
          proxy-connect-timeout = "60"
          proxy-read-timeout    = "120"
          proxy-send-timeout    = "120"
          ssl-protocols         = "TLSv1.2 TLSv1.3"
          ssl-ciphers           = "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256"
        }

        # Service configuration
        service = {
          type = "LoadBalancer"
          annotations = {
            "service.beta.kubernetes.io/aws-load-balancer-type"             = "nlb"
            "service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled" = "true"
          }
        }

        resources = {
          requests = { cpu = "100m", memory = "128Mi" }
          limits   = { cpu = "1", memory = "512Mi" }
        }

        metrics = {
          enabled = true
          serviceMonitor = { enabled = true }
        }
      }
    })
  ]
}
```

## Step 3: Create an Ingress Resource

```hcl
# Ingress resource using the NGINX controller
resource "kubernetes_ingress_v1" "app_ingress" {
  metadata {
    name      = "app-ingress"
    namespace = "production"
    annotations = {
      "nginx.ingress.kubernetes.io/ssl-redirect"     = "true"
      "nginx.ingress.kubernetes.io/proxy-body-size"  = "10m"
      "cert-manager.io/cluster-issuer"               = "letsencrypt-prod"
    }
  }

  spec {
    ingress_class_name = "nginx"

    tls {
      hosts       = ["app.example.com"]
      secret_name = "app-tls-secret"
    }

    rule {
      host = "app.example.com"
      http {
        path {
          path      = "/"
          path_type = "Prefix"
          backend {
            service {
              name = "web-service"
              port { number = 80 }
            }
          }
        }
        path {
          path      = "/api"
          path_type = "Prefix"
          backend {
            service {
              name = "api-service"
              port { number = 8080 }
            }
          }
        }
      }
    }
  }
}
```

## Summary

NGINX Ingress Controller deployed with Helm and OpenTofu provides a production-ready ingress layer with HPA, metrics, and custom NGINX configuration. Anti-affinity rules ensure replicas spread across nodes, and HPA handles traffic spikes automatically. Combine with cert-manager for automated TLS certificate management.
