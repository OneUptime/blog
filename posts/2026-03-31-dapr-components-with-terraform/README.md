# How to Deploy Dapr Components with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Terraform, Kubernetes, Component, Infrastructure as Code

Description: Manage Dapr component manifests (state stores, pub/sub, bindings) with Terraform using the Kubernetes provider for version-controlled component lifecycle management.

---

## Managing Dapr Components as Code

Dapr components - state stores, pub/sub brokers, bindings, and secret stores - are Kubernetes custom resources. Terraform's Kubernetes provider can manage these alongside your cluster infrastructure, keeping component definitions version-controlled and consistent across environments.

## Setting Up the Kubernetes Provider

```hcl
terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = "my-cluster"
}
```

## State Store Component

Deploy a Redis state store as a Terraform resource:

```hcl
resource "kubernetes_manifest" "dapr_statestore" {
  manifest = {
    apiVersion = "dapr.io/v1alpha1"
    kind       = "Component"
    metadata = {
      name      = "statestore"
      namespace = "default"
    }
    spec = {
      type    = "state.redis"
      version = "v1"
      metadata = [
        {
          name  = "redisHost"
          value = "${var.redis_host}:6379"
        },
        {
          name = "redisPassword"
          secretKeyRef = {
            name = "redis-secret"
            key  = "password"
          }
        },
        {
          name  = "actorStateStore"
          value = "true"
        }
      ]
    }
  }
}
```

## Pub/Sub Component

```hcl
resource "kubernetes_manifest" "dapr_pubsub" {
  manifest = {
    apiVersion = "dapr.io/v1alpha1"
    kind       = "Component"
    metadata = {
      name      = "pubsub"
      namespace = "default"
    }
    spec = {
      type    = "pubsub.kafka"
      version = "v1"
      metadata = [
        {
          name  = "brokers"
          value = var.kafka_brokers
        },
        {
          name  = "authType"
          value = "none"
        },
        {
          name  = "initialOffset"
          value = "newest"
        }
      ]
    }
  }
}
```

## Secret Store Component

```hcl
resource "kubernetes_manifest" "dapr_secretstore" {
  manifest = {
    apiVersion = "dapr.io/v1alpha1"
    kind       = "Component"
    metadata = {
      name      = "vault"
      namespace = "default"
    }
    spec = {
      type    = "secretstores.hashicorp.vault"
      version = "v1"
      metadata = [
        {
          name  = "vaultAddr"
          value = var.vault_address
        },
        {
          name  = "vaultToken"
          secretKeyRef = {
            name = "vault-token"
            key  = "token"
          }
        }
      ]
    }
  }
}
```

## Variables and Environment Promotion

```hcl
variable "redis_host" {
  description = "Redis host address"
  type        = string
}

variable "kafka_brokers" {
  description = "Kafka broker addresses"
  type        = string
}

variable "vault_address" {
  description = "HashiCorp Vault address"
  type        = string
}
```

Create per-environment variable files:

```hcl
# prod.tfvars
redis_host    = "redis-prod.internal"
kafka_brokers = "kafka-1.prod:9092,kafka-2.prod:9092"
vault_address = "https://vault.prod.internal"
```

## Applying Components

```bash
# Plan component changes
terraform plan -var-file=prod.tfvars

# Apply components
terraform apply -var-file=prod.tfvars

# Verify components are registered
kubectl get components -n default
```

## Summary

Managing Dapr components with Terraform's `kubernetes_manifest` resource brings the full IaC lifecycle - plan, apply, destroy - to your Dapr configuration. This ensures that component definitions are version-controlled, peer-reviewed via pull requests, and consistently promoted from dev to production using the same workflow as your underlying infrastructure.
