# How to Implement Infrastructure as Code for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Infrastructure as Code, Terraform, Pulumi, DevOps

Description: Learn how to use Terraform and Pulumi to provision Dapr infrastructure including Kubernetes clusters, message brokers, and Dapr installation as code.

---

Infrastructure as Code (IaC) for Dapr covers provisioning the underlying cloud resources (Kubernetes clusters, Redis, Kafka), installing Dapr on the cluster, and deploying Dapr components - all in a reproducible, version-controlled manner.

## Terraform for Cloud Infrastructure

Provision an AKS cluster and Redis for Dapr:

```hcl
# main.tf
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "dapr_rg" {
  name     = "dapr-production-rg"
  location = "East US"
}

resource "azurerm_kubernetes_cluster" "dapr_cluster" {
  name                = "dapr-aks"
  location            = azurerm_resource_group.dapr_rg.location
  resource_group_name = azurerm_resource_group.dapr_rg.name
  dns_prefix          = "dapr-aks"

  default_node_pool {
    name       = "system"
    node_count = 3
    vm_size    = "Standard_D4s_v3"
  }

  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_redis_cache" "dapr_redis" {
  name                = "dapr-redis-prod"
  location            = azurerm_resource_group.dapr_rg.location
  resource_group_name = azurerm_resource_group.dapr_rg.name
  capacity            = 2
  family              = "C"
  sku_name            = "Standard"
  non_ssl_port_enabled = false
  minimum_tls_version = "1.2"
}
```

## Install Dapr with Terraform Helm Provider

```hcl
# dapr.tf
provider "helm" {
  kubernetes {
    host                   = azurerm_kubernetes_cluster.dapr_cluster.kube_config[0].host
    client_certificate     = base64decode(azurerm_kubernetes_cluster.dapr_cluster.kube_config[0].client_certificate)
    client_key             = base64decode(azurerm_kubernetes_cluster.dapr_cluster.kube_config[0].client_key)
    cluster_ca_certificate = base64decode(azurerm_kubernetes_cluster.dapr_cluster.kube_config[0].cluster_ca_certificate)
  }
}

resource "helm_release" "dapr" {
  name             = "dapr"
  repository       = "https://dapr.github.io/helm-charts/"
  chart            = "dapr"
  version          = "1.13.0"
  namespace        = "dapr-system"
  create_namespace = true
  timeout          = 300
  wait             = true

  set {
    name  = "global.ha.enabled"
    value = "true"
  }

  set {
    name  = "dapr_sentry.replicaCount"
    value = "3"
  }
}
```

## Deploy Dapr Components with Kubernetes Terraform Provider

```hcl
# components.tf
resource "kubernetes_manifest" "pubsub_component" {
  manifest = {
    apiVersion = "dapr.io/v1alpha1"
    kind       = "Component"
    metadata = {
      name      = "pubsub"
      namespace = "production"
    }
    spec = {
      type    = "pubsub.redis"
      version = "v1"
      metadata = [
        {
          name  = "redisHost"
          value = "${azurerm_redis_cache.dapr_redis.hostname}:6380"
        },
        {
          name = "redisPassword"
          secretKeyRef = {
            name = "redis-credentials"
            key  = "password"
          }
        },
        {
          name  = "enableTLS"
          value = "true"
        }
      ]
    }
  }

  depends_on = [helm_release.dapr]
}
```

## Pulumi Alternative

```typescript
// index.ts (Pulumi TypeScript)
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

const daprNamespace = new k8s.core.v1.Namespace("dapr-system", {
    metadata: { name: "dapr-system" }
});

const dapr = new k8s.helm.v3.Release("dapr", {
    chart: "dapr",
    repositoryOpts: { repo: "https://dapr.github.io/helm-charts/" },
    version: "1.13.0",
    namespace: daprNamespace.metadata.name,
    values: { global: { ha: { enabled: true } } }
});
```

## Summary

IaC for Dapr combines cloud resource provisioning (Terraform/Pulumi), cluster-level Dapr installation via Helm, and Dapr component deployment through the Kubernetes Terraform provider or Pulumi's Kubernetes SDK. Version all IaC files in Git alongside application code and use Terraform workspaces or Pulumi stacks to manage environment-specific configurations.
