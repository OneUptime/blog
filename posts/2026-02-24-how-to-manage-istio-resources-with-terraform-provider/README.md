# How to Manage Istio Resources with Terraform Provider

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Terraform, Kubernetes, Provider, Infrastructure as Code

Description: Learn to manage Istio custom resources like VirtualService, DestinationRule, and Gateway using the Kubernetes Terraform provider.

---

Once Istio is installed, you still need to manage all the custom resources that make up your mesh configuration: VirtualServices, DestinationRules, Gateways, AuthorizationPolicies, and more. Managing these through Terraform alongside the rest of your infrastructure gives you a single workflow for everything.

The Kubernetes Terraform provider can handle any Kubernetes custom resource, including Istio CRDs. This guide shows you how to define and manage Istio resources as Terraform configuration.

## Provider Setup

You need the Kubernetes provider configured to talk to your cluster:

```hcl
terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.27"
    }
  }
}

provider "kubernetes" {
  config_path = "~/.kube/config"
}
```

## Using kubernetes_manifest for Istio CRDs

The `kubernetes_manifest` resource type can manage any Kubernetes resource, including Istio custom resources. This is the most flexible approach:

```hcl
resource "kubernetes_manifest" "virtualservice" {
  manifest = {
    apiVersion = "networking.istio.io/v1"
    kind       = "VirtualService"

    metadata = {
      name      = "my-app"
      namespace = "production"
    }

    spec = {
      hosts = ["my-app.example.com"]

      gateways = ["istio-ingress/main-gateway"]

      http = [{
        match = [{
          uri = {
            prefix = "/"
          }
        }]

        route = [{
          destination = {
            host = "my-app.production.svc.cluster.local"
            port = {
              number = 8080
            }
          }
        }]

        timeout = "30s"

        retries = {
          attempts      = 3
          perTryTimeout = "10s"
          retryOn       = "5xx,reset,connect-failure"
        }
      }]
    }
  }
}
```

## Managing Gateways

Define your Istio Gateway as a Terraform resource:

```hcl
resource "kubernetes_manifest" "gateway" {
  manifest = {
    apiVersion = "networking.istio.io/v1"
    kind       = "Gateway"

    metadata = {
      name      = "main-gateway"
      namespace = "istio-ingress"
    }

    spec = {
      selector = {
        istio = "ingress"
      }

      servers = [
        {
          port = {
            number   = 80
            name     = "http"
            protocol = "HTTP"
          }
          hosts = ["*.example.com"]
          tls = {
            httpsRedirect = true
          }
        },
        {
          port = {
            number   = 443
            name     = "https"
            protocol = "HTTPS"
          }
          hosts = ["*.example.com"]
          tls = {
            mode           = "SIMPLE"
            credentialName = "wildcard-cert"
          }
        }
      ]
    }
  }
}
```

## DestinationRules with Variables

Make your DestinationRules configurable through Terraform variables:

```hcl
variable "services" {
  description = "Map of services and their traffic policies"
  type = map(object({
    port                  = number
    max_connections       = optional(number, 100)
    max_pending_requests  = optional(number, 100)
    consecutive_5xx       = optional(number, 5)
    ejection_time         = optional(string, "30s")
  }))
}

resource "kubernetes_manifest" "destination_rules" {
  for_each = var.services

  manifest = {
    apiVersion = "networking.istio.io/v1"
    kind       = "DestinationRule"

    metadata = {
      name      = each.key
      namespace = "production"
    }

    spec = {
      host = "${each.key}.production.svc.cluster.local"

      trafficPolicy = {
        connectionPool = {
          tcp = {
            maxConnections = each.value.max_connections
          }
          http = {
            http1MaxPendingRequests = each.value.max_pending_requests
          }
        }
        outlierDetection = {
          consecutive5xxErrors = each.value.consecutive_5xx
          interval             = "30s"
          baseEjectionTime     = each.value.ejection_time
          maxEjectionPercent   = 50
        }
      }
    }
  }
}
```

Use it in your tfvars:

```hcl
# production.tfvars
services = {
  api-gateway = {
    port                 = 8080
    max_connections      = 200
    max_pending_requests = 200
    consecutive_5xx      = 3
    ejection_time        = "60s"
  }
  user-service = {
    port = 8080
  }
  order-service = {
    port            = 8080
    max_connections = 150
    consecutive_5xx = 3
  }
}
```

## AuthorizationPolicies

Define service-to-service authorization:

```hcl
variable "authorization_rules" {
  description = "Map of services to their allowed callers"
  type = map(object({
    allowed_service_accounts = list(string)
    allowed_methods          = optional(list(string), [])
  }))
  default = {}
}

resource "kubernetes_manifest" "auth_policies" {
  for_each = var.authorization_rules

  manifest = {
    apiVersion = "security.istio.io/v1"
    kind       = "AuthorizationPolicy"

    metadata = {
      name      = "${each.key}-policy"
      namespace = "production"
    }

    spec = {
      selector = {
        matchLabels = {
          app = each.key
        }
      }

      action = "ALLOW"

      rules = [for sa in each.value.allowed_service_accounts : {
        from = [{
          source = {
            principals = ["cluster.local/ns/production/sa/${sa}"]
          }
        }]
        to = length(each.value.allowed_methods) > 0 ? [{
          operation = {
            methods = each.value.allowed_methods
          }
        }] : []
      }]
    }
  }
}
```

## ServiceEntry for External Services

Register external services in the mesh:

```hcl
variable "external_services" {
  description = "External services to register with Istio"
  type = map(object({
    hosts      = list(string)
    ports      = list(object({
      number   = number
      name     = string
      protocol = string
    }))
    resolution = optional(string, "DNS")
  }))
}

resource "kubernetes_manifest" "service_entries" {
  for_each = var.external_services

  manifest = {
    apiVersion = "networking.istio.io/v1"
    kind       = "ServiceEntry"

    metadata = {
      name      = each.key
      namespace = "production"
    }

    spec = {
      hosts      = each.value.hosts
      location   = "MESH_EXTERNAL"
      ports      = each.value.ports
      resolution = each.value.resolution
    }
  }
}
```

## Handling Resource Dependencies

Some Istio resources depend on others. Use `depends_on` to enforce ordering:

```hcl
resource "kubernetes_manifest" "gateway" {
  # ... gateway definition
}

resource "kubernetes_manifest" "virtualservice" {
  manifest = {
    # ... virtualservice that references the gateway
  }

  depends_on = [kubernetes_manifest.gateway]
}
```

## Importing Existing Resources

If you already have Istio resources created outside Terraform, import them:

```bash
terraform import 'kubernetes_manifest.virtualservice' \
  "apiVersion=networking.istio.io/v1,kind=VirtualService,namespace=production,name=my-app"
```

After importing, run `terraform plan` to verify the imported resource matches your configuration. Fix any drift before making new changes.

## Working with Terraform Modules

Create a module for common Istio resource patterns:

```hcl
# modules/istio-service/main.tf
variable "name" {
  type = string
}

variable "namespace" {
  type = string
}

variable "port" {
  type    = number
  default = 8080
}

variable "external_host" {
  type    = string
  default = ""
}

variable "gateway" {
  type    = string
  default = ""
}

resource "kubernetes_manifest" "virtualservice" {
  manifest = {
    apiVersion = "networking.istio.io/v1"
    kind       = "VirtualService"
    metadata = {
      name      = var.name
      namespace = var.namespace
    }
    spec = {
      hosts    = compact([var.external_host, "${var.name}.${var.namespace}.svc.cluster.local"])
      gateways = compact([var.gateway, "mesh"])
      http = [{
        route = [{
          destination = {
            host = "${var.name}.${var.namespace}.svc.cluster.local"
            port = { number = var.port }
          }
        }]
      }]
    }
  }
}
```

Use the module for each service:

```hcl
module "api_gateway_istio" {
  source = "./modules/istio-service"

  name          = "api-gateway"
  namespace     = "production"
  port          = 8080
  external_host = "api.example.com"
  gateway       = "istio-ingress/main-gateway"
}

module "user_service_istio" {
  source = "./modules/istio-service"

  name      = "user-service"
  namespace = "production"
  port      = 8080
}
```

## Plan and Apply Workflow

The standard Terraform workflow applies perfectly:

```bash
terraform plan -var-file=production.tfvars -out=plan.out
terraform apply plan.out
```

Review the plan output carefully before applying. Terraform shows you exactly which Istio resources will be created, modified, or destroyed.

Managing Istio resources through Terraform gives you the same review-and-apply workflow you use for the rest of your infrastructure. The `kubernetes_manifest` resource type handles any Istio CRD, and Terraform modules let you build reusable patterns that keep configuration consistent across services. Combined with remote state and team workflows, it is a solid approach for organizations that are already invested in the Terraform ecosystem.
