# How to Create Kubernetes Validating Webhooks with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Validating Webhooks, OpenTofu, Admission Control, Policy, Security

Description: Learn how to create Kubernetes Validating Admission Webhooks with OpenTofu to enforce custom policies and reject non-compliant resources before they're created.

## Overview

Kubernetes Validating Admission Webhooks intercept API requests and can accept or reject them based on custom logic. Unlike mutating webhooks, they cannot modify objects-only approve or deny them. Common uses include enforcing label requirements, image registry policies, and resource limit mandates.

## Step 1: Deploy the Validation Webhook Server

```hcl
# main.tf - Deploy the validating webhook server
# Assumes the policy-system namespace and validator-tls-certs Secret already exist.

resource "kubernetes_deployment_v1" "validator_server" {
  metadata {
    name      = "policy-validator"
    namespace = "policy-system"
  }

  spec {
    replicas = 2

    selector {
      match_labels = { app = "policy-validator" }
    }

    template {
      metadata {
        labels = { app = "policy-validator" }
      }

      spec {
        container {
          name  = "validator"
          image = "myregistry/policy-validator:latest"
          port { container_port = 8443 }

          volume_mount {
            name       = "tls-certs"
            mount_path = "/tls"
            read_only  = true
          }
        }

        volume {
          name = "tls-certs"
          secret { secret_name = "validator-tls-certs" }
        }
      }
    }
  }
}

resource "kubernetes_service_v1" "validator_service" {
  metadata {
    name      = "policy-validator"
    namespace = "policy-system"
  }

  spec {
    selector = { app = "policy-validator" }
    port {
      port        = 443
      target_port = 8443
    }
  }
}
```

## Step 2: Create the ValidatingWebhookConfiguration

```hcl
# ValidatingWebhookConfiguration for enforcing image policies
resource "kubernetes_validating_webhook_configuration_v1" "image_policy" {
  metadata {
    name = "image-policy-validator"
  }

  webhook {
    name                      = "image-policy.example.com"
    admission_review_versions = ["v1"]
    side_effects              = "None"
    failure_policy            = "Fail"
    timeout_seconds           = 10

    client_config {
      service {
        namespace = "policy-system"
        name      = kubernetes_service_v1.validator_service.metadata[0].name
        path      = "/validate-image-policy"
      }
      ca_bundle = file("${path.module}/certs/ca.crt")
    }

    # Apply to pod creation and updates
    rule {
      api_groups   = [""]
      api_versions = ["v1"]
      operations   = ["CREATE", "UPDATE"]
      resources    = ["pods"]
    }

    # Skip kube-system and policy-system namespaces
    namespace_selector {
      match_expressions {
        key      = "kubernetes.io/metadata.name"
        operator = "NotIn"
        values   = ["kube-system", "kube-public", "policy-system"]
      }
    }
  }
}
```

## Step 3: Enforce Required Labels

```hcl
# Webhook to require specific labels on all deployments
resource "kubernetes_validating_webhook_configuration_v1" "required_labels" {
  metadata {
    name = "required-labels-validator"
  }

  webhook {
    name                      = "required-labels.example.com"
    admission_review_versions = ["v1"]
    side_effects              = "None"
    failure_policy            = "Fail"
    timeout_seconds           = 5

    client_config {
      service {
        namespace = "policy-system"
        name      = "policy-validator"
        path      = "/validate-required-labels"
      }
      ca_bundle = file("${path.module}/certs/ca.crt")
    }

    rule {
      api_groups   = ["apps"]
      api_versions = ["v1"]
      operations   = ["CREATE", "UPDATE"]
      resources    = ["deployments", "statefulsets"]
    }

    # Match all namespaces with label enforcement enabled
    namespace_selector {
      match_labels = {
        "policy.example.com/label-enforcement" = "enabled"
      }
    }
  }
}
```

## Step 4: OpenPolicy Agent (OPA) Gatekeeper Alternative

```hcl
# OPA Gatekeeper is a popular alternative - install via Helm
resource "helm_release" "gatekeeper" {
  name             = "gatekeeper"
  repository       = "https://open-policy-agent.github.io/gatekeeper/charts"
  chart            = "gatekeeper"
  namespace        = "gatekeeper-system"
  create_namespace = true
  version          = "3.14.0"

  set {
    name  = "validatingWebhookTimeoutSeconds"
    value = "15"
  }
}
```

## Summary

Kubernetes Validating Webhooks with OpenTofu enforce custom admission policies that can't be expressed with built-in RBAC or PSS. They're ideal for organization-specific rules like required labels, approved image registries, and resource limit mandates. Consider OPA Gatekeeper as a policy engine for managing complex validation logic without writing custom webhook code.
