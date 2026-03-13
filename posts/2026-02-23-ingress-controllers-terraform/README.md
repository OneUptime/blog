# How to Deploy Ingress Controllers with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Ingresses, NGINX, Traefik, Load Balancer, DevOps

Description: Learn how to deploy and configure popular Kubernetes ingress controllers like NGINX and Traefik using Terraform, including load balancer configuration and SSL termination.

---

An ingress controller is the gateway to your Kubernetes cluster. It receives external traffic and routes it to the right services based on hostnames, paths, and other rules. Without one, your Kubernetes services are only accessible from inside the cluster. Deploying an ingress controller through Terraform ensures it is consistently configured, versioned, and integrated with your cloud provider's load balancer infrastructure.

This guide covers deploying the two most popular ingress controllers - NGINX and Traefik - along with production-ready configurations.

## Deploying NGINX Ingress Controller

The NGINX ingress controller is the most widely used option. The community-maintained chart from the kubernetes/ingress-nginx project is the standard choice.

```hcl
# Create the ingress namespace
resource "kubernetes_namespace" "ingress" {
  metadata {
    name = "ingress-nginx"

    labels = {
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }
}

# Deploy NGINX Ingress Controller
resource "helm_release" "nginx_ingress" {
  name       = "ingress-nginx"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  namespace  = kubernetes_namespace.ingress.metadata[0].name
  version    = "4.9.0"

  values = [
    yamlencode({
      controller = {
        # Run multiple replicas for high availability
        replicaCount = 2

        # Resource limits
        resources = {
          requests = {
            cpu    = "100m"
            memory = "128Mi"
          }
          limits = {
            memory = "256Mi"
          }
        }

        # Pod disruption budget
        minAvailable = 1

        # Metrics for monitoring
        metrics = {
          enabled = true
          serviceMonitor = {
            enabled = true
          }
        }

        # Autoscaling based on load
        autoscaling = {
          enabled     = true
          minReplicas = 2
          maxReplicas = 10
          targetCPUUtilizationPercentage    = 70
          targetMemoryUtilizationPercentage = 80
        }
      }
    })
  ]

  wait    = true
  timeout = 300
}
```

## NGINX on AWS with NLB

On AWS, you typically want a Network Load Balancer (NLB) for better performance and static IPs.

```hcl
# NGINX Ingress on AWS with NLB configuration
resource "helm_release" "nginx_ingress_aws" {
  name       = "ingress-nginx"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  namespace  = "ingress-nginx"
  version    = "4.9.0"

  values = [
    yamlencode({
      controller = {
        replicaCount = 2

        service = {
          type = "LoadBalancer"

          annotations = {
            # Use NLB instead of classic load balancer
            "service.beta.kubernetes.io/aws-load-balancer-type"     = "nlb"
            "service.beta.kubernetes.io/aws-load-balancer-scheme"   = "internet-facing"
            # Enable cross-zone load balancing
            "service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled" = "true"
            # Preserve client IP
            "service.beta.kubernetes.io/aws-load-balancer-target-group-attributes" = "preserve_client_ip.enabled=true"
          }

          # Use specific ports
          targetPorts = {
            http  = "http"
            https = "https"
          }
        }

        # Node affinity for dedicated ingress nodes
        nodeSelector = {
          "node-role" = "ingress"
        }

        tolerations = [{
          key      = "dedicated"
          operator = "Equal"
          value    = "ingress"
          effect   = "NoSchedule"
        }]
      }
    })
  ]
}

# Get the load balancer hostname after deployment
data "kubernetes_service" "nginx_ingress" {
  metadata {
    name      = "ingress-nginx-controller"
    namespace = "ingress-nginx"
  }

  depends_on = [helm_release.nginx_ingress_aws]
}

output "ingress_lb_hostname" {
  value = data.kubernetes_service.nginx_ingress.status[0].load_balancer[0].ingress[0].hostname
}
```

## NGINX on GKE

On GKE, the configuration uses Google Cloud load balancer annotations.

```hcl
# NGINX Ingress on GKE
resource "helm_release" "nginx_ingress_gke" {
  name       = "ingress-nginx"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  namespace  = "ingress-nginx"
  version    = "4.9.0"

  values = [
    yamlencode({
      controller = {
        replicaCount = 2

        service = {
          # Request a static IP (created separately)
          loadBalancerIP = google_compute_address.ingress.address

          annotations = {
            # Use a regional external IP
            "cloud.google.com/load-balancer-type" = "External"
          }
        }
      }
    })
  ]
}

# Reserve a static IP for the ingress
resource "google_compute_address" "ingress" {
  name   = "ingress-ip"
  region = var.gcp_region
}
```

## Deploying Traefik Ingress Controller

Traefik is an alternative with built-in support for automatic TLS, middleware, and canary deployments.

```hcl
# Deploy Traefik Ingress Controller
resource "helm_release" "traefik" {
  name             = "traefik"
  repository       = "https://traefik.github.io/charts"
  chart            = "traefik"
  namespace        = "traefik"
  create_namespace = true
  version          = "26.0.0"

  values = [
    yamlencode({
      # Deployment configuration
      deployment = {
        replicas = 2
      }

      # Entry points (ports)
      ports = {
        web = {
          port     = 8000
          expose   = true
          protocol = "TCP"
          # Redirect HTTP to HTTPS
          redirectTo = {
            port = "websecure"
          }
        }
        websecure = {
          port     = 8443
          expose   = true
          protocol = "TCP"
          tls = {
            enabled = true
          }
        }
      }

      # Enable the dashboard
      ingressRoute = {
        dashboard = {
          enabled = true
        }
      }

      # Resource limits
      resources = {
        requests = {
          cpu    = "100m"
          memory = "128Mi"
        }
        limits = {
          memory = "256Mi"
        }
      }

      # Access logs
      logs = {
        access = {
          enabled = true
        }
      }

      # Prometheus metrics
      metrics = {
        prometheus = {
          entryPoint            = "metrics"
          addEntryPointsLabels  = true
          addRoutersLabels      = true
          addServicesLabels     = true
        }
      }
    })
  ]
}
```

## Creating Ingress Resources

Once your controller is deployed, create ingress resources to route traffic.

```hcl
# Basic ingress resource for NGINX controller
resource "kubernetes_ingress_v1" "app" {
  metadata {
    name      = "my-app"
    namespace = "production"

    annotations = {
      # NGINX-specific annotations
      "nginx.ingress.kubernetes.io/ssl-redirect"    = "true"
      "nginx.ingress.kubernetes.io/proxy-body-size" = "50m"
      # Rate limiting
      "nginx.ingress.kubernetes.io/limit-rps" = "50"
      # cert-manager integration
      "cert-manager.io/cluster-issuer" = "letsencrypt-prod"
    }
  }

  spec {
    ingress_class_name = "nginx"

    tls {
      hosts       = ["app.example.com", "api.example.com"]
      secret_name = "app-tls"
    }

    rule {
      host = "app.example.com"

      http {
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = "frontend"
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
              name = "api"
              port {
                number = 8080
              }
            }
          }
        }
      }
    }
  }
}
```

## Multiple Ingress Controllers

In some environments, you need multiple ingress controllers - one for public traffic and one for internal services.

```hcl
# Public ingress controller
resource "helm_release" "nginx_public" {
  name       = "ingress-nginx-public"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  namespace  = "ingress-nginx"
  version    = "4.9.0"

  values = [
    yamlencode({
      controller = {
        ingressClassResource = {
          name            = "nginx-public"
          controllerValue = "k8s.io/ingress-nginx-public"
        }
        service = {
          annotations = {
            "service.beta.kubernetes.io/aws-load-balancer-scheme" = "internet-facing"
          }
        }
      }
    })
  ]
}

# Internal ingress controller
resource "helm_release" "nginx_internal" {
  name       = "ingress-nginx-internal"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  namespace  = "ingress-nginx"
  version    = "4.9.0"

  values = [
    yamlencode({
      controller = {
        ingressClassResource = {
          name            = "nginx-internal"
          controllerValue = "k8s.io/ingress-nginx-internal"
        }
        service = {
          annotations = {
            "service.beta.kubernetes.io/aws-load-balancer-scheme" = "internal"
          }
          # Internal load balancer in a private subnet
          internal = {
            enabled = true
          }
        }
      }
    })
  ]
}
```

## Custom NGINX Configuration

Pass custom NGINX configuration through the Helm values.

```hcl
resource "helm_release" "nginx_ingress" {
  # ... base config ...

  values = [
    yamlencode({
      controller = {
        config = {
          # Custom NGINX configuration
          "proxy-buffer-size"      = "16k"
          "proxy-buffers"          = "4 16k"
          "client-max-body-size"   = "100m"
          "keep-alive"             = "75"
          "keep-alive-requests"    = "1000"
          "upstream-keepalive-connections" = "100"
          "use-gzip"               = "true"
          "gzip-level"             = "5"
          "gzip-min-length"        = "256"
          # Security headers
          "hide-headers"           = "X-Powered-By,Server"
          "ssl-protocols"          = "TLSv1.2 TLSv1.3"
          "ssl-ciphers"            = "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256"
        }
      }
    })
  ]
}
```

## Best Practices

- Run at least 2 replicas of your ingress controller for high availability
- Use PodDisruptionBudgets to prevent all replicas from going down during node drains
- Monitor your ingress controller with Prometheus metrics
- Use NLB on AWS for better performance and static IP support
- Separate public and internal ingress controllers for different traffic types
- Set appropriate resource requests and limits
- Enable autoscaling for variable traffic patterns
- Always pin chart versions

For more on TLS certificate management, check out our guide on [deploying cert-manager with Terraform](https://oneuptime.com/blog/post/2026-02-23-cert-manager-terraform/view).
