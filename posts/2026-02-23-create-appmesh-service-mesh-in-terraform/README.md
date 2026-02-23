# How to Create AppMesh Service Mesh in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, App Mesh, Service Mesh, Microservices, Infrastructure as Code

Description: Learn how to create AWS App Mesh service meshes with virtual nodes, virtual services, virtual routers, and routes using Terraform for microservices networking.

---

AWS App Mesh is a service mesh that provides application-level networking so your services can communicate across different compute environments. It standardizes how your microservices communicate, giving you consistent visibility and traffic controls regardless of whether your services run on ECS, EKS, or EC2. Managing App Mesh through Terraform lets you define your entire service mesh topology in code, making it reproducible and easy to review.

This guide covers creating a mesh, defining virtual nodes and virtual services, setting up routing with virtual routers, and configuring traffic policies.

## Prerequisites

- Terraform 1.0 or later
- AWS CLI configured with appropriate permissions
- Existing ECS or EKS services to integrate with the mesh
- Basic understanding of service mesh concepts

## Provider Configuration

```hcl
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Creating the Mesh

The mesh is the top-level resource. All other App Mesh resources exist within a mesh.

```hcl
# Create the service mesh
resource "aws_appmesh_mesh" "main" {
  name = "production-mesh"

  spec {
    # Allow egress traffic to destinations outside the mesh
    egress_filter {
      type = "ALLOW_ALL" # or DROP_ALL to restrict external traffic
    }

    service_discovery {
      ip_preference = "IPv4_PREFERRED"
    }
  }

  tags = {
    Environment = "production"
  }
}
```

## Creating Virtual Nodes

Virtual nodes represent your actual running services. Each microservice gets a virtual node that defines its service discovery, listeners, and backends.

```hcl
# Virtual node for the frontend service
resource "aws_appmesh_virtual_node" "frontend" {
  name      = "frontend-vn"
  mesh_name = aws_appmesh_mesh.main.name

  spec {
    # How other services discover this node
    service_discovery {
      aws_cloud_map {
        namespace_name = aws_service_discovery_private_dns_namespace.main.name
        service_name   = "frontend"
      }
    }

    # Port this service listens on
    listener {
      port_mapping {
        port     = 8080
        protocol = "http"
      }

      # Health check configuration
      health_check {
        healthy_threshold   = 2
        unhealthy_threshold = 3
        timeout_millis      = 5000
        interval_millis     = 10000
        path                = "/health"
        port                = 8080
        protocol            = "http"
      }

      # Connection pool to prevent overloading
      connection_pool {
        http {
          max_connections      = 100
          max_pending_requests = 50
        }
      }
    }

    # Services this node talks to
    backend {
      virtual_service {
        virtual_service_name = "${aws_appmesh_virtual_service.api.name}"
      }
    }

    backend {
      virtual_service {
        virtual_service_name = "${aws_appmesh_virtual_service.auth.name}"
      }
    }

    # Logging configuration
    logging {
      access_log {
        file {
          path = "/dev/stdout"
        }
      }
    }
  }
}

# Virtual node for the API service
resource "aws_appmesh_virtual_node" "api" {
  name      = "api-vn"
  mesh_name = aws_appmesh_mesh.main.name

  spec {
    service_discovery {
      aws_cloud_map {
        namespace_name = aws_service_discovery_private_dns_namespace.main.name
        service_name   = "api"
      }
    }

    listener {
      port_mapping {
        port     = 3000
        protocol = "http"
      }

      health_check {
        healthy_threshold   = 2
        unhealthy_threshold = 3
        timeout_millis      = 5000
        interval_millis     = 10000
        path                = "/api/health"
        port                = 3000
        protocol            = "http"
      }
    }

    backend {
      virtual_service {
        virtual_service_name = "${aws_appmesh_virtual_service.database_proxy.name}"
      }
    }

    logging {
      access_log {
        file {
          path = "/dev/stdout"
        }
      }
    }
  }
}

# Virtual node for the API service - v2 (for canary deployments)
resource "aws_appmesh_virtual_node" "api_v2" {
  name      = "api-v2-vn"
  mesh_name = aws_appmesh_mesh.main.name

  spec {
    service_discovery {
      aws_cloud_map {
        namespace_name = aws_service_discovery_private_dns_namespace.main.name
        service_name   = "api-v2"
      }
    }

    listener {
      port_mapping {
        port     = 3000
        protocol = "http"
      }

      health_check {
        healthy_threshold   = 2
        unhealthy_threshold = 3
        timeout_millis      = 5000
        interval_millis     = 10000
        path                = "/api/health"
        port                = 3000
        protocol            = "http"
      }
    }

    backend {
      virtual_service {
        virtual_service_name = "${aws_appmesh_virtual_service.database_proxy.name}"
      }
    }

    logging {
      access_log {
        file {
          path = "/dev/stdout"
        }
      }
    }
  }
}

# Virtual node for the auth service
resource "aws_appmesh_virtual_node" "auth" {
  name      = "auth-vn"
  mesh_name = aws_appmesh_mesh.main.name

  spec {
    service_discovery {
      aws_cloud_map {
        namespace_name = aws_service_discovery_private_dns_namespace.main.name
        service_name   = "auth"
      }
    }

    listener {
      port_mapping {
        port     = 4000
        protocol = "grpc"
      }

      health_check {
        healthy_threshold   = 2
        unhealthy_threshold = 3
        timeout_millis      = 5000
        interval_millis     = 10000
        port                = 4000
        protocol            = "grpc"
      }
    }

    logging {
      access_log {
        file {
          path = "/dev/stdout"
        }
      }
    }
  }
}
```

## Creating Virtual Routers and Routes

Virtual routers handle traffic distribution between virtual nodes. Routes define the rules for how traffic gets routed.

```hcl
# Virtual router for the API service
resource "aws_appmesh_virtual_router" "api" {
  name      = "api-vr"
  mesh_name = aws_appmesh_mesh.main.name

  spec {
    listener {
      port_mapping {
        port     = 3000
        protocol = "http"
      }
    }
  }
}

# Route with weighted targets for canary deployment
resource "aws_appmesh_route" "api_route" {
  name                = "api-route"
  mesh_name           = aws_appmesh_mesh.main.name
  virtual_router_name = aws_appmesh_virtual_router.api.name

  spec {
    http_route {
      match {
        prefix = "/"
      }

      action {
        # Split traffic between v1 and v2
        weighted_target {
          virtual_node = aws_appmesh_virtual_node.api.name
          weight       = 90
        }

        weighted_target {
          virtual_node = aws_appmesh_virtual_node.api_v2.name
          weight       = 10
        }
      }

      # Retry policy
      retry_policy {
        http_retry_events = [
          "server-error",
          "gateway-error",
        ]
        max_retries = 3

        per_retry_timeout {
          unit  = "s"
          value = 5
        }
      }

      # Timeout settings
      timeout {
        idle {
          unit  = "s"
          value = 60
        }

        per_request {
          unit  = "s"
          value = 30
        }
      }
    }
  }
}

# Header-based routing for testing v2
resource "aws_appmesh_route" "api_v2_header_route" {
  name                = "api-v2-header-route"
  mesh_name           = aws_appmesh_mesh.main.name
  virtual_router_name = aws_appmesh_virtual_router.api.name

  # Higher priority routes are evaluated first
  spec {
    priority = 1

    http_route {
      match {
        prefix = "/"

        header {
          name = "x-api-version"

          match {
            exact = "v2"
          }
        }
      }

      action {
        weighted_target {
          virtual_node = aws_appmesh_virtual_node.api_v2.name
          weight       = 100
        }
      }
    }
  }
}

# Virtual router for the auth service (gRPC)
resource "aws_appmesh_virtual_router" "auth" {
  name      = "auth-vr"
  mesh_name = aws_appmesh_mesh.main.name

  spec {
    listener {
      port_mapping {
        port     = 4000
        protocol = "grpc"
      }
    }
  }
}

# gRPC route for auth service
resource "aws_appmesh_route" "auth_route" {
  name                = "auth-route"
  mesh_name           = aws_appmesh_mesh.main.name
  virtual_router_name = aws_appmesh_virtual_router.auth.name

  spec {
    grpc_route {
      match {
        service_name = "auth.AuthService"
      }

      action {
        weighted_target {
          virtual_node = aws_appmesh_virtual_node.auth.name
          weight       = 100
        }
      }

      retry_policy {
        grpc_retry_events = [
          "unavailable",
          "deadline-exceeded",
        ]
        max_retries = 2

        per_retry_timeout {
          unit  = "s"
          value = 3
        }
      }
    }
  }
}
```

## Creating Virtual Services

Virtual services abstract your actual services. Other nodes reference virtual services as backends, and the virtual service routes traffic to the appropriate virtual router or virtual node.

```hcl
# Virtual service backed by a virtual router (enables weighted routing)
resource "aws_appmesh_virtual_service" "api" {
  name      = "api.${aws_service_discovery_private_dns_namespace.main.name}"
  mesh_name = aws_appmesh_mesh.main.name

  spec {
    provider {
      virtual_router {
        virtual_router_name = aws_appmesh_virtual_router.api.name
      }
    }
  }
}

# Virtual service backed by a virtual router
resource "aws_appmesh_virtual_service" "auth" {
  name      = "auth.${aws_service_discovery_private_dns_namespace.main.name}"
  mesh_name = aws_appmesh_mesh.main.name

  spec {
    provider {
      virtual_router {
        virtual_router_name = aws_appmesh_virtual_router.auth.name
      }
    }
  }
}

# Virtual service backed directly by a virtual node (no routing)
resource "aws_appmesh_virtual_service" "database_proxy" {
  name      = "db-proxy.${aws_service_discovery_private_dns_namespace.main.name}"
  mesh_name = aws_appmesh_mesh.main.name

  spec {
    provider {
      virtual_node {
        virtual_node_name = "db-proxy-vn"
      }
    }
  }
}
```

## Virtual Gateway for Ingress

A virtual gateway lets traffic from outside the mesh reach services inside it.

```hcl
# Virtual gateway for external traffic
resource "aws_appmesh_virtual_gateway" "ingress" {
  name      = "ingress-gateway"
  mesh_name = aws_appmesh_mesh.main.name

  spec {
    listener {
      port_mapping {
        port     = 8080
        protocol = "http"
      }

      health_check {
        healthy_threshold   = 2
        unhealthy_threshold = 3
        timeout_millis      = 5000
        interval_millis     = 10000
        path                = "/health"
        port                = 8080
        protocol            = "http"
      }
    }

    logging {
      access_log {
        file {
          path = "/dev/stdout"
        }
      }
    }
  }
}

# Gateway route to direct traffic to the frontend service
resource "aws_appmesh_gateway_route" "frontend" {
  name                 = "frontend-gateway-route"
  mesh_name            = aws_appmesh_mesh.main.name
  virtual_gateway_name = aws_appmesh_virtual_gateway.ingress.name

  spec {
    http_route {
      match {
        prefix = "/"
      }

      action {
        target {
          virtual_service {
            virtual_service_name = "frontend.${aws_service_discovery_private_dns_namespace.main.name}"
          }
        }
      }
    }
  }
}

# Gateway route for API traffic
resource "aws_appmesh_gateway_route" "api" {
  name                 = "api-gateway-route"
  mesh_name            = aws_appmesh_mesh.main.name
  virtual_gateway_name = aws_appmesh_virtual_gateway.ingress.name

  spec {
    http_route {
      match {
        prefix = "/api"
      }

      action {
        target {
          virtual_service {
            virtual_service_name = aws_appmesh_virtual_service.api.name
          }
        }

        rewrite {
          prefix {
            value = "/"
          }
        }
      }
    }
  }
}
```

## Cloud Map Service Discovery

App Mesh integrates with AWS Cloud Map for service discovery.

```hcl
# Private DNS namespace for service discovery
resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "mesh.local"
  description = "Service discovery namespace for App Mesh"
  vpc         = aws_vpc.main.id
}
```

## Best Practices

1. **Start with ALLOW_ALL egress.** Begin with permissive egress filtering and tighten it to DROP_ALL once you have mapped all your service dependencies.

2. **Use virtual routers for services that need traffic splitting.** If a service does not need canary deployments or weighted routing, you can back the virtual service directly with a virtual node.

3. **Configure retry policies.** Retries at the mesh level are more reliable than application-level retries because the Envoy proxy handles them consistently.

4. **Enable access logging.** Log to stdout so your container logging infrastructure captures mesh traffic data.

5. **Use health checks on every listener.** Health checks ensure the mesh only routes traffic to healthy instances.

6. **Plan your service names.** Virtual service names should match your DNS names so existing service discovery integrations work smoothly.

## Conclusion

AWS App Mesh with Terraform gives you a declarative way to manage the networking layer of your microservices. From traffic splitting for canary deployments to retry policies and health checks, everything is defined in code. Start with a simple mesh, add virtual nodes for each service, and introduce routing complexity as your needs grow. The result is consistent, observable service-to-service communication that you can version control and review just like your application code.

For related reading, check out our guide on [creating Cloud Map service discovery in Terraform](https://oneuptime.com/blog/post/2026-02-23-create-cloud-map-service-discovery-in-terraform/view).
