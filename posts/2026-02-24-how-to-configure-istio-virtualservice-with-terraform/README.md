# How to Configure Istio VirtualService with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Terraform, VirtualService, Traffic Management, Kubernetes

Description: Detailed walkthrough for defining and managing Istio VirtualService resources using Terraform with practical routing examples.

---

VirtualService is one of the most frequently used Istio resources. It controls how requests get routed to your services, handling things like traffic splitting, header-based routing, retries, and timeouts. Managing VirtualServices through Terraform means you get plan/apply workflows, state tracking, and the ability to review routing changes before they go live.

This guide covers the most common VirtualService patterns and how to express them as Terraform configuration.

## Basic VirtualService

Start with a simple VirtualService that routes all traffic to a single service:

```hcl
resource "kubernetes_manifest" "basic_vs" {
  manifest = {
    apiVersion = "networking.istio.io/v1"
    kind       = "VirtualService"

    metadata = {
      name      = "web-frontend"
      namespace = "production"
    }

    spec = {
      hosts = ["web-frontend.production.svc.cluster.local"]

      http = [{
        route = [{
          destination = {
            host = "web-frontend.production.svc.cluster.local"
            port = {
              number = 8080
            }
          }
        }]
      }]
    }
  }
}
```

## VirtualService with External Host and Gateway

When your service needs to be accessible from outside the mesh, attach it to a Gateway:

```hcl
resource "kubernetes_manifest" "external_vs" {
  manifest = {
    apiVersion = "networking.istio.io/v1"
    kind       = "VirtualService"

    metadata = {
      name      = "api-service"
      namespace = "production"
    }

    spec = {
      hosts = [
        "api.example.com",
        "api-service.production.svc.cluster.local"
      ]

      gateways = [
        "istio-ingress/main-gateway",
        "mesh"
      ]

      http = [{
        match = [{
          uri = {
            prefix = "/api/v1"
          }
        }]

        route = [{
          destination = {
            host = "api-service.production.svc.cluster.local"
            port = {
              number = 8080
            }
          }
        }]
      }]
    }
  }
}
```

Including both the Gateway name and "mesh" in the gateways list means the routing rules apply to both external traffic (through the gateway) and internal mesh traffic.

## Traffic Splitting for Canary Deployments

One of the most common uses for VirtualService is canary releases. Split traffic between two versions of your service:

```hcl
variable "canary_weight" {
  description = "Percentage of traffic to send to canary"
  type        = number
  default     = 10

  validation {
    condition     = var.canary_weight >= 0 && var.canary_weight <= 100
    error_message = "Canary weight must be between 0 and 100."
  }
}

resource "kubernetes_manifest" "canary_vs" {
  manifest = {
    apiVersion = "networking.istio.io/v1"
    kind       = "VirtualService"

    metadata = {
      name      = "payment-service"
      namespace = "production"
    }

    spec = {
      hosts = ["payment-service.production.svc.cluster.local"]

      http = [{
        route = [
          {
            destination = {
              host   = "payment-service.production.svc.cluster.local"
              subset = "stable"
              port = {
                number = 8080
              }
            }
            weight = 100 - var.canary_weight
          },
          {
            destination = {
              host   = "payment-service.production.svc.cluster.local"
              subset = "canary"
              port = {
                number = 8080
              }
            }
            weight = var.canary_weight
          }
        ]
      }]
    }
  }
}
```

Now you can gradually shift traffic by changing the variable:

```bash
# Start with 10% canary traffic
terraform apply -var="canary_weight=10"

# Increase to 50%
terraform apply -var="canary_weight=50"

# Full rollout
terraform apply -var="canary_weight=100"
```

## Header-Based Routing

Route requests based on HTTP headers. This is great for testing new versions without affecting regular users:

```hcl
resource "kubernetes_manifest" "header_routing_vs" {
  manifest = {
    apiVersion = "networking.istio.io/v1"
    kind       = "VirtualService"

    metadata = {
      name      = "catalog-service"
      namespace = "production"
    }

    spec = {
      hosts = ["catalog-service.production.svc.cluster.local"]

      http = [
        {
          match = [{
            headers = {
              x-test-version = {
                exact = "v2"
              }
            }
          }]
          route = [{
            destination = {
              host   = "catalog-service.production.svc.cluster.local"
              subset = "v2"
              port = {
                number = 8080
              }
            }
          }]
        },
        {
          route = [{
            destination = {
              host   = "catalog-service.production.svc.cluster.local"
              subset = "v1"
              port = {
                number = 8080
              }
            }
          }]
        }
      ]
    }
  }
}
```

Requests with the `x-test-version: v2` header go to the v2 subset. Everything else goes to v1.

## Configuring Retries and Timeouts

Add resilience to your routing with retries and timeouts:

```hcl
resource "kubernetes_manifest" "resilient_vs" {
  manifest = {
    apiVersion = "networking.istio.io/v1"
    kind       = "VirtualService"

    metadata = {
      name      = "order-service"
      namespace = "production"
    }

    spec = {
      hosts = ["order-service.production.svc.cluster.local"]

      http = [{
        timeout = "30s"

        retries = {
          attempts      = 3
          perTryTimeout = "10s"
          retryOn       = "5xx,reset,connect-failure,retriable-status-codes"
        }

        route = [{
          destination = {
            host = "order-service.production.svc.cluster.local"
            port = {
              number = 8080
            }
          }
        }]
      }]
    }
  }
}
```

The `perTryTimeout` multiplied by `attempts` should be less than or equal to the overall `timeout`. Otherwise the overall timeout will cut off retries before they exhaust their attempts.

## URL Rewriting

Rewrite URLs before forwarding to the backend:

```hcl
resource "kubernetes_manifest" "rewrite_vs" {
  manifest = {
    apiVersion = "networking.istio.io/v1"
    kind       = "VirtualService"

    metadata = {
      name      = "legacy-api"
      namespace = "production"
    }

    spec = {
      hosts    = ["api.example.com"]
      gateways = ["istio-ingress/main-gateway"]

      http = [{
        match = [{
          uri = {
            prefix = "/api/v1/users"
          }
        }]

        rewrite = {
          uri = "/users"
        }

        route = [{
          destination = {
            host = "user-service.production.svc.cluster.local"
            port = {
              number = 8080
            }
          }
        }]
      }]
    }
  }
}
```

## Fault Injection for Testing

Inject faults to test how your services handle failures:

```hcl
resource "kubernetes_manifest" "fault_injection_vs" {
  manifest = {
    apiVersion = "networking.istio.io/v1"
    kind       = "VirtualService"

    metadata = {
      name      = "payment-service-fault-test"
      namespace = "staging"
    }

    spec = {
      hosts = ["payment-service.staging.svc.cluster.local"]

      http = [{
        fault = {
          delay = {
            percentage = {
              value = 10
            }
            fixedDelay = "5s"
          }
          abort = {
            percentage = {
              value = 5
            }
            httpStatus = 503
          }
        }

        route = [{
          destination = {
            host = "payment-service.staging.svc.cluster.local"
            port = {
              number = 8080
            }
          }
        }]
      }]
    }
  }
}
```

This adds a 5-second delay to 10% of requests and returns a 503 error for 5% of requests. Obviously do not do this in production, but it is extremely useful for chaos testing in staging.

## Dynamic VirtualService with for_each

Generate VirtualServices for multiple services from a variable:

```hcl
variable "service_routes" {
  type = map(object({
    port          = number
    timeout       = optional(string, "30s")
    external_host = optional(string, "")
    gateway       = optional(string, "")
  }))
}

resource "kubernetes_manifest" "dynamic_vs" {
  for_each = var.service_routes

  manifest = {
    apiVersion = "networking.istio.io/v1"
    kind       = "VirtualService"

    metadata = {
      name      = each.key
      namespace = "production"
    }

    spec = {
      hosts = compact([
        each.value.external_host,
        "${each.key}.production.svc.cluster.local"
      ])

      gateways = compact([each.value.gateway, "mesh"])

      http = [{
        timeout = each.value.timeout

        route = [{
          destination = {
            host = "${each.key}.production.svc.cluster.local"
            port = {
              number = each.value.port
            }
          }
        }]
      }]
    }
  }
}
```

Apply with a tfvars file:

```hcl
service_routes = {
  api-gateway = {
    port          = 8080
    timeout       = "60s"
    external_host = "api.example.com"
    gateway       = "istio-ingress/main-gateway"
  }
  user-service = {
    port    = 8080
    timeout = "10s"
  }
  order-service = {
    port    = 8080
    timeout = "30s"
  }
}
```

Managing VirtualServices through Terraform gives you a reviewable, auditable trail of every routing change. When something goes wrong with traffic routing, you can check the Terraform state to see what changed and when. And because every change goes through `terraform plan` first, you catch misconfiguration before it hits your cluster.
