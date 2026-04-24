# How to Deploy RabbitMQ on Kubernetes with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RabbitMQ, Message Queue, OpenTofu, Helm, High Availability

Description: Learn how to deploy RabbitMQ on Kubernetes using OpenTofu and the Bitnami Helm chart with clustering, persistent storage, management UI, and monitoring.

## Overview

RabbitMQ is a message broker supporting AMQP, MQTT, and STOMP protocols. OpenTofu deploys RabbitMQ via the Bitnami Helm chart with a clustered setup, quorum queues for HA, and the management plugin for administration.

## Step 1: Deploy RabbitMQ with Helm

```hcl
# main.tf - Deploy RabbitMQ via Bitnami Helm chart

terraform {
  required_providers {
    helm = {
      source = "hashicorp/helm"
    }
    kubernetes = {
      source = "hashicorp/kubernetes"
    }
    random = {
      source = "hashicorp/random"
    }
    rabbitmq = {
      source = "registry.terraform.io/cyrilgdn/rabbitmq"
    }
  }
}

resource "random_password" "rabbitmq" {
  length  = 32
  special = false
}

resource "random_password" "rabbitmq_erlang_cookie" {
  length  = 64
  special = false
}

resource "kubernetes_namespace" "rabbitmq" {
  metadata {
    name = "rabbitmq"
  }
}

resource "kubernetes_secret" "rabbitmq_auth" {
  metadata {
    name      = "rabbitmq-auth"
    namespace = kubernetes_namespace.rabbitmq.metadata[0].name
  }

  data = {
    "rabbitmq-password"      = random_password.rabbitmq.result
    "rabbitmq-erlang-cookie" = random_password.rabbitmq_erlang_cookie.result
  }
}

resource "helm_release" "rabbitmq" {
  name             = "rabbitmq"
  repository       = "https://charts.bitnami.com/bitnami"
  chart            = "rabbitmq"
  version          = "13.0.0"
  namespace        = kubernetes_namespace.rabbitmq.metadata[0].name
  create_namespace = false

  values = [yamlencode({
    auth = {
      username               = "admin"
      existingPasswordSecret = kubernetes_secret.rabbitmq_auth.metadata[0].name
      existingErlangSecret   = kubernetes_secret.rabbitmq_auth.metadata[0].name
    }

    # 3-node cluster for HA
    replicaCount = 3

    persistence = {
      enabled      = true
      size         = "20Gi"
      storageClass = "gp3"
    }

    resources = {
      requests = { memory = "256Mi", cpu = "250m" }
      limits   = { memory = "1Gi", cpu = "1000m" }
    }

    # RabbitMQ configuration
    extraConfiguration = <<-RABBIT_CONF
      ## Default vhost
      default_vhost = /
      default_user = admin

      ## Memory high watermark
      vm_memory_high_watermark.relative = 0.6

      ## Disk free limit
      disk_free_limit.absolute = 2GB

      ## Use classic queue storage version 2 for any classic queues
      classic_queue.default_version = 2
    RABBIT_CONF

    # Enable plugins
    plugins = "rabbitmq_management rabbitmq_peer_discovery_k8s rabbitmq_prometheus"

    # Kubernetes peer discovery for clustering
    clustering = {
      enabled                = true
      addressType            = "hostname"
      rebalance              = true
      forceBoot              = false
    }

    metrics = {
      enabled = true
      serviceMonitor = {
        enabled = true
      }
    }

    # Management UI ingress
    ingress = {
      enabled          = true
      ingressClassName = "nginx"
      hostname         = "rabbitmq.example.com"
      annotations = {
        "cert-manager.io/cluster-issuer" = "letsencrypt-production"
      }
      tls = true
    }
  })]
}
```

## Step 2: PodDisruptionBudget

```hcl
# Ensure quorum is maintained (need majority of nodes online)
resource "kubernetes_pod_disruption_budget_v1" "rabbitmq" {
  metadata {
    name      = "rabbitmq-pdb"
    namespace = kubernetes_namespace.rabbitmq.metadata[0].name
  }

  spec {
    # Maintain quorum: at least 2 out of 3 nodes
    min_available = 2
    selector {
      match_labels = {
        "app.kubernetes.io/name"     = "rabbitmq"
        "app.kubernetes.io/instance" = "rabbitmq"
      }
    }
  }
}
```

## Step 3: Create Queues and Exchanges via RabbitMQ Provider

```hcl
# Configure RabbitMQ resources via the RabbitMQ provider
provider "rabbitmq" {
  endpoint = "https://rabbitmq.example.com"
  username = "admin"
  password = random_password.rabbitmq.result
}

resource "rabbitmq_vhost" "app" {
  depends_on = [helm_release.rabbitmq]

  name               = "app-vhost"
  default_queue_type = "quorum"
}

resource "rabbitmq_permissions" "app" {
  user  = "admin"
  vhost = rabbitmq_vhost.app.name

  permissions {
    configure = ".*"
    write     = ".*"
    read      = ".*"
  }
}

resource "rabbitmq_exchange" "events" {
  name  = "app.events"
  vhost = rabbitmq_permissions.app.vhost

  settings {
    type        = "topic"
    durable     = true
    auto_delete = false
  }
}

resource "rabbitmq_queue" "order_events" {
  name  = "order-events"
  vhost = rabbitmq_permissions.app.vhost

  settings {
    durable     = true
    auto_delete = false
    # Quorum queue for high availability
    arguments_json = jsonencode({
      "x-queue-type"     = "quorum"
      "x-delivery-limit" = 5
    })
  }
}
```

## Summary

RabbitMQ deployed with OpenTofu on Kubernetes using Bitnami's Helm chart provides a clustered, highly available message broker. Quorum queues replace classic mirrored queues and offer better durability guarantees with the Raft consensus algorithm. The Kubernetes peer discovery plugin handles cluster formation automatically as pods start, and the Prometheus metrics endpoint integrates with existing monitoring infrastructure.
