# How to Create Kubernetes Mutating Webhooks with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Mutating Webhooks, OpenTofu, Admission Control, Security, Infrastructure

Description: Learn how to create Kubernetes Mutating Admission Webhooks with OpenTofu to automatically inject sidecars, add labels, and modify pod specifications at deployment time.

## Overview

Kubernetes Mutating Admission Webhooks intercept API requests before objects are persisted and can modify them. Common use cases include sidecar injection (Istio), automatic secret injection, default label application, and security hardening. OpenTofu manages webhook configurations.

## Step 1: Deploy the Webhook Server

```hcl
# main.tf - Deploy the mutating webhook server

resource "kubernetes_namespace_v1" "webhook_system" {
  metadata {
    name = "webhook-system"
  }
}

resource "kubernetes_deployment_v1" "webhook_server" {
  metadata {
    name      = "mutating-webhook-server"
    namespace = kubernetes_namespace_v1.webhook_system.metadata[0].name
  }

  spec {
    replicas = 2

    selector {
      match_labels = { app = "webhook-server" }
    }

    template {
      metadata {
        labels = { app = "webhook-server" }
      }

      spec {
        container {
          name  = "webhook-server"
          image = "myregistry/admission-webhook:latest"

          port { container_port = 8443 }

          volume_mount {
            name       = "tls-certs"
            mount_path = "/tls"
            read_only  = true
          }
        }

        volume {
          name = "tls-certs"
          secret {
            secret_name = "webhook-tls-certs"
          }
        }
      }
    }
  }
}

resource "kubernetes_service_v1" "webhook_service" {
  metadata {
    name      = "webhook-service"
    namespace = kubernetes_namespace_v1.webhook_system.metadata[0].name
  }

  spec {
    selector = { app = "webhook-server" }
    port {
      port        = 443
      target_port = 8443
    }
  }
}
```

## Step 2: Create the MutatingWebhookConfiguration

```hcl
# Register the mutating webhook with the API server
resource "kubernetes_mutating_webhook_configuration_v1" "sidecar_injector" {
  metadata {
    name = "sidecar-injector"
    labels = {
      "app" = "sidecar-injector"
    }
  }

  webhook {
    name                      = "sidecar-injector.example.com"
    admission_review_versions = ["v1"]
    side_effects              = "None"
    failure_policy            = "Fail"  # "Fail" or "Ignore"
    timeout_seconds           = 10

    client_config {
      service {
        namespace = kubernetes_namespace_v1.webhook_system.metadata[0].name
        name      = kubernetes_service_v1.webhook_service.metadata[0].name
        path      = "/mutate-pod"
        port      = 443
      }

      # PEM-encoded CA bundle for TLS verification of the webhook server
      ca_bundle = file("${path.module}/certs/ca.crt")
    }

    # Only intercept pods with this label
    object_selector {
      match_labels = {
        "sidecar-injection" = "enabled"
      }
    }

    # Apply to all namespaces except kube-system and kube-public
    namespace_selector {
      match_expressions {
        key      = "kubernetes.io/metadata.name"
        operator = "NotIn"
        values   = ["kube-system", "kube-public"]
      }
    }

    rule {
      api_groups   = [""]
      api_versions = ["v1"]
      operations   = ["CREATE"]
      resources    = ["pods"]
    }
  }
}
```

## Step 3: Label Defaulting Webhook

```hcl
# Webhook that adds default labels to pods and deployments
resource "kubernetes_mutating_webhook_configuration_v1" "label_defaulter" {
  metadata {
    name = "default-label-injector"
  }

  webhook {
    name                      = "label-defaulter.example.com"
    admission_review_versions = ["v1"]
    side_effects              = "None"
    failure_policy            = "Ignore"  # Don't block on failure
    timeout_seconds           = 5

    client_config {
      service {
        namespace = kubernetes_namespace_v1.webhook_system.metadata[0].name
        name      = kubernetes_service_v1.webhook_service.metadata[0].name
        path      = "/mutate-labels"
      }
      ca_bundle = file("${path.module}/certs/ca.crt")
    }

    rule {
      api_groups   = [""]
      api_versions = ["v1"]
      operations   = ["CREATE", "UPDATE"]
      resources    = ["pods"]
    }

    rule {
      api_groups   = ["apps"]
      api_versions = ["v1"]
      operations   = ["CREATE", "UPDATE"]
      resources    = ["deployments"]
    }
  }
}
```

## Summary

Kubernetes Mutating Webhooks with OpenTofu enable automated pod modifications at admission time. Use `failure_policy = "Ignore"` for optional mutations like label defaulting to avoid blocking admission requests when the webhook fails. For critical mutations like sidecar injection, use `failure_policy = "Fail"` so requests are rejected if the webhook cannot be called successfully.
