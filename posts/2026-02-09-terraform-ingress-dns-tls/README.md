# How to Build Terraform Modules for Kubernetes Ingress with DNS and TLS Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Ingress

Description: Learn how to create Terraform modules that provision Kubernetes Ingress resources with automated DNS configuration via Route53 or CloudDNS and TLS certificate management through cert-manager for production-ready HTTPS endpoints.

---

Exposing Kubernetes applications requires ingress configuration, DNS records, and TLS certificates. Managing these separately creates coordination overhead and opportunities for misconfiguration. Terraform modules can automate the entire stack, provisioning ingress resources with matching DNS entries and requesting certificates automatically.

This guide shows you how to build modules that provision complete ingress infrastructure with automated DNS and TLS management.

## Understanding the Ingress Stack

A complete ingress setup has three components: the ingress resource defining routing rules, DNS records pointing to the load balancer, and TLS certificates for HTTPS. Terraform can manage all three, using outputs from one resource as inputs to another.

The ingress controller (like NGINX or Traefik) creates a load balancer. You query this to get its address, create DNS records, then configure ingress with TLS.

## Building the Basic Ingress Module

Start with a module structure:

```hcl
# modules/ingress/variables.tf
variable "name" {
  description = "Name of the ingress resource"
  type        = string
}

variable "namespace" {
  description = "Kubernetes namespace"
  type        = string
}

variable "hostname" {
  description = "DNS hostname for the ingress"
  type        = string
}

variable "service_name" {
  description = "Backend service name"
  type        = string
}

variable "service_port" {
  description = "Backend service port"
  type        = number
}

variable "enable_tls" {
  description = "Enable TLS with cert-manager"
  type        = bool
  default     = true
}

variable "cert_manager_issuer" {
  description = "Cert-manager issuer name"
  type        = string
  default     = "letsencrypt-prod"
}
```

Implementation:

```hcl
# modules/ingress/main.tf
terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

resource "kubernetes_ingress_v1" "main" {
  metadata {
    name      = var.name
    namespace = var.namespace
    annotations = merge(
      {
        "kubernetes.io/ingress.class"                    = "nginx"
        "nginx.ingress.kubernetes.io/ssl-redirect"       = "true"
        "nginx.ingress.kubernetes.io/force-ssl-redirect" = "true"
      },
      var.enable_tls ? {
        "cert-manager.io/cluster-issuer" = var.cert_manager_issuer
      } : {}
    )
  }

  spec {
    dynamic "tls" {
      for_each = var.enable_tls ? [1] : []
      content {
        hosts       = [var.hostname]
        secret_name = "${var.name}-tls"
      }
    }

    rule {
      host = var.hostname

      http {
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = var.service_name
              port {
                number = var.service_port
              }
            }
          }
        }
      }
    }
  }
}

output "ingress_name" {
  value = kubernetes_ingress_v1.main.metadata[0].name
}

output "hostname" {
  value = var.hostname
}

output "load_balancer_ip" {
  value = try(kubernetes_ingress_v1.main.status[0].load_balancer[0].ingress[0].ip, "")
}

output "load_balancer_hostname" {
  value = try(kubernetes_ingress_v1.main.status[0].load_balancer[0].ingress[0].hostname, "")
}
```

## Adding AWS Route53 DNS Integration

Extend the module with Route53 support:

```hcl
# modules/ingress-with-dns/variables.tf
variable "create_dns_record" {
  description = "Create DNS record in Route53"
  type        = bool
  default     = true
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID"
  type        = string
  default     = ""
}

variable "dns_ttl" {
  description = "DNS record TTL"
  type        = number
  default     = 300
}
```

```hcl
# modules/ingress-with-dns/main.tf
terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

resource "kubernetes_ingress_v1" "main" {
  metadata {
    name      = var.name
    namespace = var.namespace
    annotations = {
      "kubernetes.io/ingress.class"              = "nginx"
      "cert-manager.io/cluster-issuer"           = var.cert_manager_issuer
      "nginx.ingress.kubernetes.io/ssl-redirect" = "true"
    }
  }

  spec {
    tls {
      hosts       = [var.hostname]
      secret_name = "${var.name}-tls"
    }

    rule {
      host = var.hostname

      http {
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = var.service_name
              port {
                number = var.service_port
              }
            }
          }
        }
      }
    }
  }

  wait_for_load_balancer = var.create_dns_record
}

# Wait for load balancer to get an address
data "kubernetes_ingress_v1" "main" {
  count = var.create_dns_record ? 1 : 0

  metadata {
    name      = kubernetes_ingress_v1.main.metadata[0].name
    namespace = kubernetes_ingress_v1.main.metadata[0].namespace
  }

  depends_on = [kubernetes_ingress_v1.main]
}

locals {
  load_balancer_hostname = var.create_dns_record ? (
    try(data.kubernetes_ingress_v1.main[0].status[0].load_balancer[0].ingress[0].hostname, "")
  ) : ""
}

# Create Route53 record
resource "aws_route53_record" "main" {
  count = var.create_dns_record && var.route53_zone_id != "" ? 1 : 0

  zone_id = var.route53_zone_id
  name    = var.hostname
  type    = "CNAME"
  ttl     = var.dns_ttl
  records = [local.load_balancer_hostname]

  depends_on = [kubernetes_ingress_v1.main]
}

output "dns_record_fqdn" {
  value = var.create_dns_record ? aws_route53_record.main[0].fqdn : var.hostname
}
```

Use the module:

```hcl
# main.tf
module "app_ingress" {
  source = "./modules/ingress-with-dns"

  name                 = "myapp"
  namespace            = "production"
  hostname             = "app.example.com"
  service_name         = "myapp-service"
  service_port         = 80
  create_dns_record    = true
  route53_zone_id      = "Z1234567890ABC"
  cert_manager_issuer  = "letsencrypt-prod"
}

output "app_url" {
  value = "https://${module.app_ingress.dns_record_fqdn}"
}
```

## Adding Google Cloud DNS Support

Create a version for GCP:

```hcl
# modules/ingress-gcp/main.tf
terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

data "kubernetes_ingress_v1" "main" {
  metadata {
    name      = kubernetes_ingress_v1.main.metadata[0].name
    namespace = kubernetes_ingress_v1.main.metadata[0].namespace
  }

  depends_on = [kubernetes_ingress_v1.main]
}

locals {
  load_balancer_ip = try(
    data.kubernetes_ingress_v1.main.status[0].load_balancer[0].ingress[0].ip,
    ""
  )
}

resource "google_dns_record_set" "main" {
  count = var.create_dns_record && var.cloud_dns_zone != "" ? 1 : 0

  name         = "${var.hostname}."
  managed_zone = var.cloud_dns_zone
  type         = "A"
  ttl          = var.dns_ttl
  rrdatas      = [local.load_balancer_ip]

  depends_on = [kubernetes_ingress_v1.main]
}
```

## Implementing Multi-Path Ingress

Support multiple backends:

```hcl
# modules/ingress-multi-path/variables.tf
variable "paths" {
  description = "List of path configurations"
  type = list(object({
    path         = string
    service_name = string
    service_port = number
    path_type    = optional(string, "Prefix")
  }))
}
```

```hcl
# modules/ingress-multi-path/main.tf
resource "kubernetes_ingress_v1" "main" {
  metadata {
    name      = var.name
    namespace = var.namespace
    annotations = {
      "kubernetes.io/ingress.class"        = "nginx"
      "cert-manager.io/cluster-issuer"     = var.cert_manager_issuer
      "nginx.ingress.kubernetes.io/rewrite-target" = "/$2"
    }
  }

  spec {
    tls {
      hosts       = [var.hostname]
      secret_name = "${var.name}-tls"
    }

    rule {
      host = var.hostname

      http {
        dynamic "path" {
          for_each = var.paths

          content {
            path      = path.value.path
            path_type = path.value.path_type

            backend {
              service {
                name = path.value.service_name
                port {
                  number = path.value.service_port
                }
              }
            }
          }
        }
      }
    }
  }
}
```

Use with multiple paths:

```hcl
module "api_gateway" {
  source = "./modules/ingress-multi-path"

  name      = "api-gateway"
  namespace = "production"
  hostname  = "api.example.com"

  paths = [
    {
      path         = "/auth"
      service_name = "auth-service"
      service_port = 8080
    },
    {
      path         = "/users"
      service_name = "user-service"
      service_port = 8081
    },
    {
      path         = "/orders"
      service_name = "order-service"
      service_port = 8082
    }
  ]

  route53_zone_id     = var.route53_zone_id
  cert_manager_issuer = "letsencrypt-prod"
}
```

## Adding Rate Limiting and Authentication

Include advanced annotations:

```hcl
# modules/ingress-advanced/variables.tf
variable "rate_limit" {
  description = "Rate limit configuration"
  type = object({
    enabled = bool
    rpm     = optional(number, 100)
    burst   = optional(number, 200)
  })
  default = {
    enabled = false
  }
}

variable "enable_oauth" {
  description = "Enable OAuth authentication"
  type        = bool
  default     = false
}

variable "oauth_url" {
  description = "OAuth provider URL"
  type        = string
  default     = ""
}
```

```hcl
# modules/ingress-advanced/main.tf
locals {
  base_annotations = {
    "kubernetes.io/ingress.class"        = "nginx"
    "cert-manager.io/cluster-issuer"     = var.cert_manager_issuer
    "nginx.ingress.kubernetes.io/ssl-redirect" = "true"
  }

  rate_limit_annotations = var.rate_limit.enabled ? {
    "nginx.ingress.kubernetes.io/limit-rps"         = tostring(var.rate_limit.rpm / 60)
    "nginx.ingress.kubernetes.io/limit-burst-multiplier" = tostring(var.rate_limit.burst / (var.rate_limit.rpm / 60))
  } : {}

  oauth_annotations = var.enable_oauth ? {
    "nginx.ingress.kubernetes.io/auth-url"    = "${var.oauth_url}/oauth2/auth"
    "nginx.ingress.kubernetes.io/auth-signin" = "${var.oauth_url}/oauth2/start"
  } : {}

  all_annotations = merge(
    local.base_annotations,
    local.rate_limit_annotations,
    local.oauth_annotations
  )
}

resource "kubernetes_ingress_v1" "main" {
  metadata {
    name        = var.name
    namespace   = var.namespace
    annotations = local.all_annotations
  }

  spec {
    tls {
      hosts       = [var.hostname]
      secret_name = "${var.name}-tls"
    }

    rule {
      host = var.hostname

      http {
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = var.service_name
              port {
                number = var.service_port
              }
            }
          }
        }
      }
    }
  }
}
```

## Creating a Complete Stack Module

Combine everything:

```hcl
# modules/ingress-stack/main.tf
module "ingress" {
  source = "../ingress-with-dns"

  name                = var.name
  namespace           = var.namespace
  hostname            = var.hostname
  service_name        = var.service_name
  service_port        = var.service_port
  create_dns_record   = true
  route53_zone_id     = var.route53_zone_id
  cert_manager_issuer = var.cert_manager_issuer
}

# Create monitoring dashboard
resource "kubernetes_config_map" "monitoring" {
  metadata {
    name      = "${var.name}-monitoring"
    namespace = var.namespace
    labels = {
      grafana_dashboard = "1"
    }
  }

  data = {
    "dashboard.json" = jsonencode({
      title = "${var.name} Ingress Dashboard"
      panels = [
        {
          title = "Request Rate"
          targets = [{
            expr = "rate(nginx_ingress_controller_requests{ingress=\"${var.name}\"}[5m])"
          }]
        }
      ]
    })
  }
}

output "url" {
  value = "https://${module.ingress.dns_record_fqdn}"
}

output "certificate_secret" {
  value = "${var.name}-tls"
}
```

## Summary

Terraform modules automate the complete ingress stack including routing configuration, DNS management, and TLS certificates. By integrating with Route53 or Cloud DNS, modules create matching DNS records automatically. Cert-manager annotations request certificates without manual intervention. This approach eliminates coordination overhead and ensures consistency across all ingress resources, from development to production environments.
