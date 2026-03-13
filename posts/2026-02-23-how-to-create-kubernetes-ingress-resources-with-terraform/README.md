# How to Create Kubernetes Ingress Resources with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Ingresses, Networking, Load Balancing, Infrastructure as Code

Description: How to create Kubernetes Ingress resources with Terraform to route external HTTP and HTTPS traffic to your cluster services.

---

Ingress resources are how you expose HTTP and HTTPS routes from outside the cluster to your Services. Instead of creating a LoadBalancer Service for every application, a single Ingress controller can route traffic to multiple backends based on hostname or path. Managing Ingress resources through Terraform keeps your routing rules version-controlled alongside the Services they point to.

This post covers creating Ingress resources with Terraform, from simple single-service setups to complex multi-host configurations with TLS termination.

## Prerequisites

An Ingress resource on its own does nothing. You need an Ingress controller running in your cluster (like nginx-ingress, Traefik, or a cloud-provider controller like GKE's ingress-gce). Make sure one is installed before creating Ingress resources.

## Provider Configuration

```hcl
# providers.tf
terraform {
  required_version = ">= 1.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

provider "kubernetes" {
  config_path = "~/.kube/config"
}
```

## Simple Ingress

The simplest Ingress routes all traffic to a single Service.

```hcl
# simple_ingress.tf - Route all traffic to one service
resource "kubernetes_ingress_v1" "simple" {
  metadata {
    name      = "simple-ingress"
    namespace = "default"

    labels = {
      managed-by = "terraform"
    }
  }

  spec {
    # Default backend catches all unmatched requests
    default_backend {
      service {
        name = "web-app"
        port {
          number = 80
        }
      }
    }
  }
}
```

## Path-Based Routing

Route requests to different Services based on the URL path.

```hcl
# path_ingress.tf - Route by URL path
resource "kubernetes_ingress_v1" "path_based" {
  metadata {
    name      = "path-based-ingress"
    namespace = "default"

    annotations = {
      # Use the nginx ingress controller
      "kubernetes.io/ingress.class" = "nginx"

      # Rewrite target to strip the path prefix
      "nginx.ingress.kubernetes.io/rewrite-target" = "/$2"
    }
  }

  spec {
    rule {
      host = "app.example.com"

      http {
        # Route /api/* to the API service
        path {
          path      = "/api(/|$)(.*)"
          path_type = "ImplementationSpecific"

          backend {
            service {
              name = "api-service"
              port {
                number = 80
              }
            }
          }
        }

        # Route /admin/* to the admin service
        path {
          path      = "/admin(/|$)(.*)"
          path_type = "ImplementationSpecific"

          backend {
            service {
              name = "admin-service"
              port {
                number = 80
              }
            }
          }
        }

        # Everything else goes to the frontend
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = "frontend-service"
              port {
                number = 80
              }
            }
          }
        }
      }
    }
  }
}
```

## Host-Based Routing

Route traffic to different Services based on the hostname.

```hcl
# host_ingress.tf - Route by hostname
resource "kubernetes_ingress_v1" "host_based" {
  metadata {
    name      = "host-based-ingress"
    namespace = "default"

    annotations = {
      "kubernetes.io/ingress.class" = "nginx"
    }
  }

  spec {
    # Route for the main website
    rule {
      host = "www.example.com"

      http {
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = "website-service"
              port {
                number = 80
              }
            }
          }
        }
      }
    }

    # Route for the API
    rule {
      host = "api.example.com"

      http {
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = "api-service"
              port {
                number = 80
              }
            }
          }
        }
      }
    }

    # Route for the dashboard
    rule {
      host = "dashboard.example.com"

      http {
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = "dashboard-service"
              port {
                number = 80
              }
            }
          }
        }
      }
    }
  }
}
```

## Ingress with TLS Termination

Configure HTTPS with TLS certificates.

```hcl
# tls_ingress.tf - HTTPS with TLS termination at the ingress
resource "kubernetes_secret" "tls_cert" {
  metadata {
    name      = "example-tls"
    namespace = "default"
  }

  type = "kubernetes.io/tls"

  data = {
    "tls.crt" = file("${path.module}/certs/tls.crt")
    "tls.key" = file("${path.module}/certs/tls.key")
  }
}

resource "kubernetes_ingress_v1" "tls_ingress" {
  metadata {
    name      = "tls-ingress"
    namespace = "default"

    annotations = {
      "kubernetes.io/ingress.class" = "nginx"

      # Force HTTPS redirect
      "nginx.ingress.kubernetes.io/ssl-redirect" = "true"

      # HSTS header
      "nginx.ingress.kubernetes.io/hsts"         = "true"
      "nginx.ingress.kubernetes.io/hsts-max-age" = "31536000"
    }
  }

  spec {
    # TLS configuration
    tls {
      hosts       = ["app.example.com", "api.example.com"]
      secret_name = kubernetes_secret.tls_cert.metadata[0].name
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
              port {
                number = 80
              }
            }
          }
        }
      }
    }

    rule {
      host = "api.example.com"

      http {
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = "api-service"
              port {
                number = 80
              }
            }
          }
        }
      }
    }
  }
}
```

## Ingress with cert-manager for Automatic TLS

If you have cert-manager installed, you can get certificates issued automatically by adding annotations.

```hcl
# certmanager_ingress.tf - Automatic TLS with cert-manager
resource "kubernetes_ingress_v1" "auto_tls" {
  metadata {
    name      = "auto-tls-ingress"
    namespace = "default"

    annotations = {
      "kubernetes.io/ingress.class"              = "nginx"
      "cert-manager.io/cluster-issuer"           = "letsencrypt-prod"
      "nginx.ingress.kubernetes.io/ssl-redirect" = "true"
    }
  }

  spec {
    tls {
      hosts       = ["app.example.com"]
      secret_name = "app-tls-auto"  # cert-manager will create this
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
              port {
                number = 80
              }
            }
          }
        }
      }
    }
  }
}
```

## Ingress with Rate Limiting and Custom Headers

Nginx ingress controller supports many annotations for traffic management.

```hcl
# advanced_ingress.tf - Ingress with traffic management
resource "kubernetes_ingress_v1" "advanced" {
  metadata {
    name      = "advanced-ingress"
    namespace = "default"

    annotations = {
      "kubernetes.io/ingress.class" = "nginx"

      # Rate limiting
      "nginx.ingress.kubernetes.io/limit-rps"         = "10"
      "nginx.ingress.kubernetes.io/limit-connections"  = "5"

      # Request size limit
      "nginx.ingress.kubernetes.io/proxy-body-size" = "10m"

      # Timeouts
      "nginx.ingress.kubernetes.io/proxy-connect-timeout" = "10"
      "nginx.ingress.kubernetes.io/proxy-read-timeout"    = "60"
      "nginx.ingress.kubernetes.io/proxy-send-timeout"    = "60"

      # CORS headers
      "nginx.ingress.kubernetes.io/enable-cors"        = "true"
      "nginx.ingress.kubernetes.io/cors-allow-origin"  = "https://frontend.example.com"
      "nginx.ingress.kubernetes.io/cors-allow-methods" = "GET, POST, PUT, DELETE, OPTIONS"

      # Custom response headers
      "nginx.ingress.kubernetes.io/configuration-snippet" = <<-EOT
        more_set_headers "X-Frame-Options: SAMEORIGIN";
        more_set_headers "X-Content-Type-Options: nosniff";
      EOT
    }
  }

  spec {
    tls {
      hosts       = ["api.example.com"]
      secret_name = "api-tls"
    }

    rule {
      host = "api.example.com"

      http {
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = "api-service"
              port {
                number = 80
              }
            }
          }
        }
      }
    }
  }
}
```

## Dynamic Ingress with for_each

Create Ingress rules from a variable map for multi-tenant or multi-app setups.

```hcl
# dynamic_ingress.tf - Generate ingress rules from configuration
variable "apps" {
  type = map(object({
    hostname     = string
    service_name = string
    service_port = number
    tls_enabled  = optional(bool, true)
  }))
  default = {
    frontend = {
      hostname     = "www.example.com"
      service_name = "frontend-svc"
      service_port = 80
    }
    api = {
      hostname     = "api.example.com"
      service_name = "api-svc"
      service_port = 80
    }
  }
}

resource "kubernetes_ingress_v1" "apps" {
  for_each = var.apps

  metadata {
    name      = "${each.key}-ingress"
    namespace = "default"

    annotations = {
      "kubernetes.io/ingress.class"    = "nginx"
      "cert-manager.io/cluster-issuer" = "letsencrypt-prod"
    }
  }

  spec {
    dynamic "tls" {
      for_each = each.value.tls_enabled ? [1] : []
      content {
        hosts       = [each.value.hostname]
        secret_name = "${each.key}-tls"
      }
    }

    rule {
      host = each.value.hostname

      http {
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = each.value.service_name
              port {
                number = each.value.service_port
              }
            }
          }
        }
      }
    }
  }
}
```

## Monitoring Ingress Routes

After deploying your Ingress resources, verify that routes work correctly and monitor them for errors. Track response codes, latency, and availability for each route. [OneUptime](https://oneuptime.com) provides external monitoring that validates your Ingress is routing traffic correctly, alerting you when endpoints become unreachable or slow.

## Summary

Kubernetes Ingress resources managed through Terraform give you version-controlled HTTP routing for your cluster. Whether you need simple single-service routing, path-based splitting, host-based virtual hosting, or TLS termination, the `kubernetes_ingress_v1` resource handles it all. Combined with annotations for your specific Ingress controller, you can configure rate limiting, CORS, timeouts, and security headers alongside your routing rules.

For securing your cluster network beyond Ingress, check out [Kubernetes NetworkPolicies with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-kubernetes-networkpolicies-with-terraform/view).
