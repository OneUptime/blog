# How to Create Kubernetes Vertical Pod Autoscalers with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, VPA, Vertical Pod Autoscaler, OpenTofu, Resource Optimization, Infrastructure

Description: Learn how to create Kubernetes Vertical Pod Autoscalers (VPA) with OpenTofu to automatically right-size container CPU and memory requests for optimal resource utilization.

## Overview

Kubernetes Vertical Pod Autoscaler automatically adjusts CPU and memory requests for containers based on historical usage patterns. VPA eliminates the need to manually tune resource requests and helps prevent OOMKilled pods. OpenTofu manages VPA objects with different update modes.
VPA requires a metrics source such as Metrics Server, and the VPA CRD must exist before OpenTofu can plan `kubernetes_manifest` resources for `VerticalPodAutoscaler` objects.

## Step 1: Install VPA

```hcl
# main.tf - Deploy VPA with Helm first.
# Apply this first in a separate configuration or workspace so the
# VerticalPodAutoscaler CRD exists before planning kubernetes_manifest
# resources for VPA objects.

resource "helm_release" "vpa" {
  name       = "vpa"
  repository = "https://charts.fairwinds.com/stable"
  chart      = "vpa"
  namespace  = "kube-system"
  version    = "4.11.0"

  set {
    name  = "admissionController.enabled"
    value = "true"
  }
}
```

## Step 2: VPA in Recommendation Mode (Off)

```hcl
# VPA in "Off" mode - provides recommendations without applying them
resource "kubernetes_manifest" "web_app_vpa_off" {
  manifest = {
    apiVersion = "autoscaling.k8s.io/v1"
    kind       = "VerticalPodAutoscaler"
    metadata = {
      name      = "web-app-vpa-recommendations"
      namespace = "production"
    }
    spec = {
      targetRef = {
        apiVersion = "apps/v1"
        kind       = "Deployment"
        name       = "web-app"
      }
      updatePolicy = {
        # "Off" - only generates recommendations, doesn't change pods
        updateMode = "Off"
      }
      resourcePolicy = {
        containerPolicies = [
          {
            containerName = "web-app"
            minAllowed = {
              cpu    = "100m"
              memory = "128Mi"
            }
            maxAllowed = {
              cpu    = "4"
              memory = "8Gi"
            }
          }
        ]
      }
    }
  }
}
```

## Step 3: VPA in Recreate Mode (Applies Recommendations)

```hcl
# VPA in "Recreate" mode - evicts pods and recreates them with updated requests
resource "kubernetes_manifest" "api_vpa_recreate" {
  manifest = {
    apiVersion = "autoscaling.k8s.io/v1"
    kind       = "VerticalPodAutoscaler"
    metadata = {
      name      = "api-service-vpa"
      namespace = "production"
    }
    spec = {
      targetRef = {
        apiVersion = "apps/v1"
        kind       = "Deployment"
        name       = "api-service"
      }
      updatePolicy = {
        # "Recreate" - evicts pods and restarts them with updated requests
        updateMode = "Recreate"
      }
      resourcePolicy = {
        containerPolicies = [
          {
            containerName          = "api"
            controlledResources    = ["cpu", "memory"]
            # Define bounds for VPA recommendations
            minAllowed = {
              cpu    = "50m"
              memory = "64Mi"
            }
            maxAllowed = {
              cpu    = "2"
              memory = "4Gi"
            }
          }
        ]
      }
    }
  }
}
```

## Step 4: VPA in Initial Mode with a Wildcard Policy

```hcl
# VPA applying the same bounds to all regular containers without explicit policies
resource "kubernetes_manifest" "full_vpa" {
  manifest = {
    apiVersion = "autoscaling.k8s.io/v1"
    kind       = "VerticalPodAutoscaler"
    metadata = {
      name      = "full-app-vpa"
      namespace = "production"
    }
    spec = {
      targetRef = {
        apiVersion = "apps/v1"
        kind       = "Deployment"
        name       = "full-app"
      }
      updatePolicy = {
        updateMode = "Initial"  # Only apply recommendations at pod creation
      }
      resourcePolicy = {
        containerPolicies = [
          {
            containerName = "*"  # Apply to all regular containers without an explicit policy
            minAllowed = { cpu = "50m", memory = "64Mi" }
            maxAllowed  = { cpu = "4", memory = "8Gi" }
          }
        ]
      }
    }
  }
}
```

## Summary

Kubernetes VPA with OpenTofu automates resource request optimization. Start in "Off" mode to collect recommendations without disrupting workloads, then gradually move to "Initial" (apply at pod creation only) and "Recreate" (evict and recreate pods with updated resources). VPA and HPA can work together as long as they do not manage the same resource metric, such as VPA on memory with HPA on CPU, or HPA on custom or external metrics.
