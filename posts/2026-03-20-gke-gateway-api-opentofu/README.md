# How to Set Up GKE Gateway API with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GKE, Gateway API, Kubernetes, OpenTofu, Networking, Ingress

Description: Learn how to configure GKE Gateway API with OpenTofu for advanced HTTP routing, TLS termination, and traffic splitting using the Kubernetes Gateway API spec.

## Overview

GKE Gateway API is the next-generation Kubernetes ingress solution, offering more expressive routing rules, multi-tenancy support, and standardized traffic management. OpenTofu can enable the Gateway API on the cluster, and once the cluster is available and the Gateway API CRDs are installed, the Kubernetes provider can deploy Gateway and HTTPRoute resources in a separate apply.

## Step 1: Enable Gateway API on GKE Cluster

```hcl
# main.tf - GKE cluster with Gateway API enabled

resource "google_container_cluster" "gateway_cluster" {
  name     = "gateway-api-cluster"
  location = "us-central1"

  initial_node_count = 1

  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name

  networking_mode = "VPC_NATIVE"
  ip_allocation_policy {}

  # Enable Gateway API
  gateway_api_config {
    channel = "CHANNEL_STANDARD"
  }
}
```

## Step 2: Deploy a Gateway

```hcl
# Apply after the cluster exists and Gateway API CRDs are installed; tls-secret must already exist
resource "kubernetes_manifest" "external_gateway" {
  manifest = {
    apiVersion = "gateway.networking.k8s.io/v1"
    kind       = "Gateway"
    metadata = {
      name      = "external-gateway"
      namespace = "default"
    }
    spec = {
      # GKE-managed external Application Load Balancer
      gatewayClassName = "gke-l7-global-external-managed"
      listeners = [
        {
          name     = "https"
          port     = 443
          protocol = "HTTPS"
          tls = {
            mode = "Terminate"
            certificateRefs = [
              {
                name = "tls-secret"
              }
            ]
          }
        }
      ]
    }
  }
}
```

## Step 3: Deploy HTTPRoute Resources

```hcl
# HTTPRoute for the main web application
resource "kubernetes_manifest" "web_app_route" {
  manifest = {
    apiVersion = "gateway.networking.k8s.io/v1"
    kind       = "HTTPRoute"
    metadata = {
      name      = "web-app-route"
      namespace = "default"
    }
    spec = {
      parentRefs = [
        {
          name = "external-gateway"
        }
      ]
      hostnames = ["app.example.com"]
      rules = [
        {
          matches = [
            {
              path = {
                type  = "PathPrefix"
                value = "/api"
              }
            }
          ]
          backendRefs = [
            {
              name = "api-service"
              port = 8080
            }
          ]
        },
        {
          matches = [
            {
              path = {
                type  = "PathPrefix"
                value = "/"
              }
            }
          ]
          backendRefs = [
            {
              name = "web-service"
              port = 80
            }
          ]
        }
      ]
    }
  }

  depends_on = [kubernetes_manifest.external_gateway]
}
```

## Step 4: Traffic Splitting for Canary Deployments

```hcl
# Replace the web_app_route resource with this version to split "/" traffic between stable and canary backends
resource "kubernetes_manifest" "web_app_route" {
  manifest = {
    apiVersion = "gateway.networking.k8s.io/v1"
    kind       = "HTTPRoute"
    metadata = {
      name      = "web-app-route"
      namespace = "default"
    }
    spec = {
      parentRefs = [
        {
          name = "external-gateway"
        }
      ]
      hostnames = ["app.example.com"]
      rules = [
        {
          matches = [
            {
              path = {
                type  = "PathPrefix"
                value = "/api"
              }
            }
          ]
          backendRefs = [
            {
              name = "api-service"
              port = 8080
            }
          ]
        },
        {
          matches = [
            {
              path = {
                type  = "PathPrefix"
                value = "/"
              }
            }
          ]
          backendRefs = [
            {
              name   = "app-v1"
              port   = 80
              weight = 90  # 90% to stable version
            },
            {
              name   = "app-v2"
              port   = 80
              weight = 10  # 10% to canary version
            }
          ]
        }
      ]
    }
  }

  depends_on = [kubernetes_manifest.external_gateway]
}
```

## Summary

GKE Gateway API with OpenTofu provides a Kubernetes-native approach to advanced traffic management. After the cluster exists and Gateway API is enabled, HTTPRoutes can provide path-based routing, header matching, and weighted traffic splitting for canary deployments. The GKE-managed gateway eliminates the need to manage an ingress controller while providing integration with Google Cloud Load Balancing.
