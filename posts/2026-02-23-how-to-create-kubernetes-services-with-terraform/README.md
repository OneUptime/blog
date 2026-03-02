# How to Create Kubernetes Services with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Service, Networking, Infrastructure as Code, DevOps

Description: Complete guide to creating Kubernetes Services with Terraform covering ClusterIP, NodePort, LoadBalancer, and ExternalName types.

---

Kubernetes Services provide stable networking for your pods. Since pods are ephemeral and their IP addresses change every time they restart, Services give you a fixed endpoint that routes traffic to the right set of pods. Managing Services through Terraform means your networking configuration lives alongside your application infrastructure, reviewable and version-controlled.

This post covers all four Kubernetes Service types - ClusterIP, NodePort, LoadBalancer, and ExternalName - and shows how to create each one with Terraform.

## Provider Setup

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

## ClusterIP Service

ClusterIP is the default Service type. It exposes the Service on an internal IP address, reachable only from within the cluster.

```hcl
# clusterip.tf - Internal service for pod-to-pod communication
resource "kubernetes_service" "api_internal" {
  metadata {
    name      = "api-service"
    namespace = "backend"

    labels = {
      app        = "api-server"
      managed-by = "terraform"
    }
  }

  spec {
    # ClusterIP is the default type - internal only
    type = "ClusterIP"

    # Route traffic to pods matching these labels
    selector = {
      app = "api-server"
    }

    port {
      name        = "http"
      port        = 80        # Port the service listens on
      target_port = 8080      # Port the container is listening on
      protocol    = "TCP"
    }

    # Optional: expose multiple ports
    port {
      name        = "grpc"
      port        = 9090
      target_port = 9090
      protocol    = "TCP"
    }
  }
}
```

Other pods in the cluster can now reach this service at `api-service.backend.svc.cluster.local` on ports 80 and 9090.

## Headless Service

A headless Service (ClusterIP set to "None") is useful when you want to reach individual pods directly, common with StatefulSets.

```hcl
# headless.tf - Headless service for direct pod addressing
resource "kubernetes_service" "database_headless" {
  metadata {
    name      = "database"
    namespace = "data"

    labels = {
      app = "postgres"
    }
  }

  spec {
    type       = "ClusterIP"
    cluster_ip = "None"  # This makes it headless

    selector = {
      app = "postgres"
    }

    port {
      name        = "postgres"
      port        = 5432
      target_port = 5432
    }
  }
}
```

With a headless Service, DNS returns the individual pod IPs instead of a single virtual IP. Each pod gets a DNS entry like `pod-0.database.data.svc.cluster.local`.

## NodePort Service

NodePort exposes the Service on a static port on every node in the cluster. External traffic can reach the service by connecting to any node's IP on that port.

```hcl
# nodeport.tf - Service accessible from outside the cluster via node ports
resource "kubernetes_service" "web_nodeport" {
  metadata {
    name      = "web-nodeport"
    namespace = "frontend"

    labels = {
      app = "web-app"
    }
  }

  spec {
    type = "NodePort"

    selector = {
      app = "web-app"
    }

    port {
      name        = "http"
      port        = 80
      target_port = 8080
      node_port   = 30080  # Must be in range 30000-32767
      protocol    = "TCP"
    }
  }
}

output "web_nodeport_port" {
  description = "Access the web app on any node IP at this port"
  value       = kubernetes_service.web_nodeport.spec[0].port[0].node_port
}
```

## LoadBalancer Service

LoadBalancer is the standard way to expose a Service externally in cloud environments. The cloud provider provisions an external load balancer that routes traffic to your Service.

```hcl
# loadbalancer.tf - Service with cloud load balancer
resource "kubernetes_service" "web_public" {
  metadata {
    name      = "web-public"
    namespace = "frontend"

    labels = {
      app = "web-app"
    }

    annotations = {
      # GKE-specific: use an internal load balancer instead of external
      # "networking.gke.io/load-balancer-type" = "Internal"

      # AWS-specific: use NLB instead of CLB
      # "service.beta.kubernetes.io/aws-load-balancer-type" = "nlb"
    }
  }

  spec {
    type = "LoadBalancer"

    selector = {
      app = "web-app"
    }

    port {
      name        = "http"
      port        = 80
      target_port = 8080
      protocol    = "TCP"
    }

    port {
      name        = "https"
      port        = 443
      target_port = 8443
      protocol    = "TCP"
    }

    # Restrict access to specific IP ranges
    load_balancer_source_ranges = [
      "10.0.0.0/8",
      "203.0.113.0/24",
    ]

    # Preserve client IP addresses
    external_traffic_policy = "Local"
  }
}

# Output the load balancer IP once it is assigned
output "load_balancer_ip" {
  description = "External IP of the load balancer"
  value       = kubernetes_service.web_public.status[0].load_balancer[0].ingress[0].ip
}
```

## ExternalName Service

ExternalName maps a Service to an external DNS name. It does not create any proxy or port forwarding. Instead it returns a CNAME record.

```hcl
# externalname.tf - Map to an external service
resource "kubernetes_service" "external_db" {
  metadata {
    name      = "external-database"
    namespace = "backend"
  }

  spec {
    type          = "ExternalName"
    external_name = "db-prod.abc123.us-east-1.rds.amazonaws.com"
  }
}
```

Pods can now connect to `external-database.backend.svc.cluster.local` and it will resolve to the RDS endpoint. This is useful for abstracting external dependencies behind a stable internal name.

## Service with Session Affinity

When you need requests from the same client to hit the same pod, use session affinity.

```hcl
# session_affinity.tf - Sticky sessions
resource "kubernetes_service" "sticky_app" {
  metadata {
    name      = "sticky-app"
    namespace = "default"
  }

  spec {
    type = "ClusterIP"

    selector = {
      app = "sticky-app"
    }

    port {
      port        = 80
      target_port = 8080
    }

    # Client IP-based session affinity
    session_affinity = "ClientIP"

    session_affinity_config {
      client_ip {
        timeout_seconds = 10800  # 3 hours
      }
    }
  }
}
```

## Creating Services Alongside Deployments

A common pattern is to create the Deployment and Service together, referencing the same labels.

```hcl
# app.tf - Deployment and Service as a unit
locals {
  app_labels = {
    app     = "my-api"
    version = "v2"
  }
}

resource "kubernetes_deployment" "my_api" {
  metadata {
    name      = "my-api"
    namespace = "default"
  }

  spec {
    replicas = 3

    selector {
      match_labels = local.app_labels
    }

    template {
      metadata {
        labels = local.app_labels
      }

      spec {
        container {
          name  = "api"
          image = "myregistry.io/api:v2"

          port {
            container_port = 8080
            name           = "http"
          }

          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "my_api" {
  metadata {
    name      = "my-api"
    namespace = "default"
  }

  spec {
    # Use the same labels from the Deployment
    selector = local.app_labels

    port {
      name        = "http"
      port        = 80
      target_port = "http"  # References the named port on the container
    }

    type = "ClusterIP"
  }
}
```

## Multi-Port Service with Named Ports

```hcl
# multiport.tf - Service exposing multiple application ports
resource "kubernetes_service" "multi_port_app" {
  metadata {
    name      = "multi-port-app"
    namespace = "default"
  }

  spec {
    selector = {
      app = "multi-port-app"
    }

    port {
      name        = "http"
      port        = 80
      target_port = 8080
    }

    port {
      name        = "metrics"
      port        = 9090
      target_port = 9090
    }

    port {
      name        = "admin"
      port        = 8081
      target_port = 8081
    }
  }
}
```

## Monitoring Services

Once your Services are running, monitoring their health is essential. Check that the Service endpoints are populated (meaning the selector matches running pods) and that the Service is responding correctly. [OneUptime](https://oneuptime.com) can monitor your Service endpoints externally, verifying they are reachable and responding within acceptable latency thresholds.

## Summary

Kubernetes Services are the networking glue that connects your pods to each other and to the outside world. ClusterIP handles internal traffic, NodePort exposes services on node ports, LoadBalancer provisions cloud load balancers, and ExternalName maps to external DNS names. By managing Services in Terraform alongside your Deployments, you keep your networking configuration consistent and auditable.

For routing external traffic to your Services, check out [Kubernetes Ingress Resources with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-kubernetes-ingress-resources-with-terraform/view).
