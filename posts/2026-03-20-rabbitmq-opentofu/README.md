# How to Deploy RabbitMQ with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, RabbitMQ, Messaging, Kubernetes, Helm, Infrastructure as Code, AMQP

Description: Learn how to deploy RabbitMQ on Kubernetes using OpenTofu with clustering, persistent storage, management UI, and federation for production message broker deployments.

---

RabbitMQ is a widely deployed open-source message broker that supports AMQP 0-9-1 natively and MQTT and STOMP via plugins. Deploying it on Kubernetes with the RabbitMQ Cluster Operator gives you automatic clustering and rolling updates, while the Messaging Topology Operator manages queues and exchanges declaratively. OpenTofu automates the setup.

This example assumes the `rabbitmq-tls` and `rabbitmq-ca` Secrets are created separately in the `rabbitmq` namespace before you apply the operator and cluster manifests, and that `rabbitmq-ca` contains the CA certificate used to sign the RabbitMQ server certificate.

## Deploying RabbitMQ with the Cluster Operator

```hcl
# main.tf

terraform {
  required_providers {
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
  }
}

provider "helm" {
  kubernetes {
    host                   = var.cluster_endpoint
    cluster_ca_certificate = base64decode(var.cluster_ca_cert)
    token                  = var.cluster_token
  }
}

provider "kubernetes" {
  host                   = var.cluster_endpoint
  cluster_ca_certificate = base64decode(var.cluster_ca_cert)
  token                  = var.cluster_token
}

resource "kubernetes_namespace" "rabbitmq" {
  metadata {
    name = "rabbitmq"
  }
}

# Deploy the RabbitMQ Cluster Operator and Messaging Topology Operator
resource "helm_release" "rabbitmq_operator" {
  name       = "rabbitmq-cluster-operator"
  repository = "oci://registry-1.docker.io/bitnamicharts"
  chart      = "rabbitmq-cluster-operator"
  version    = "4.3.4"
  namespace  = kubernetes_namespace.rabbitmq.metadata[0].name

  # Trust the RabbitMQ management CA so topology resources can reconcile over HTTPS.
  values = [yamlencode({
    msgTopologyOperator = {
      enabled = true
      extraVolumes = [
        {
          name = "rabbitmq-ca"
          secret = {
            secretName = "rabbitmq-ca"
          }
        }
      ]
      extraVolumeMounts = [
        {
          name      = "rabbitmq-ca"
          mountPath = "/etc/ssl/certs/rabbitmq-ca.crt"
          subPath   = "ca.crt"
          readOnly  = true
        }
      ]
    }
  })]

  wait    = true
  timeout = 300
}
```

Apply this operator configuration first. Then run OpenTofu again with the `RabbitmqCluster` and topology resources below after the operator CRDs exist in the cluster.

## Creating a RabbitMQ Cluster

```hcl
# cluster.tf
# Apply this after the first OpenTofu run has installed the operator CRDs.
resource "kubernetes_manifest" "rabbitmq_cluster" {
  depends_on = [helm_release.rabbitmq_operator]

  manifest = {
    apiVersion = "rabbitmq.com/v1beta1"
    kind       = "RabbitmqCluster"
    metadata = {
      name      = "production-rabbitmq"
      namespace = kubernetes_namespace.rabbitmq.metadata[0].name
    }
    spec = {
      replicas = 3  # 3-node cluster for HA

      resources = {
        requests = {
          cpu    = "500m"
          memory = "1Gi"
        }
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
      }

      persistence = {
        storageClassName = var.storage_class
        storage          = "20Gi"
      }

      rabbitmq = {
        additionalConfig = <<-CONFIG
          # Management UI port
          management.tcp.port = 15672
          # Set disk free limit
          disk_free_limit.relative = 1.5
          # Cluster high-availability settings
          cluster_partition_handling = pause_minority
        CONFIG

        additionalPlugins = [
          "rabbitmq_management",
          "rabbitmq_shovel",
          "rabbitmq_shovel_management",
          "rabbitmq_prometheus",
        ]
      }

      service = {
        type = "ClusterIP"
      }

      tls = {
        # Enable TLS for AMQP connections
        secretName          = "rabbitmq-tls"
        caSecretName        = "rabbitmq-ca"
        disableNonTLSListeners = true
      }
    }
  }
}
```

## Declaring Queues and Exchanges

```hcl
# topology.tf
# Create a queue via the Topology Operator
resource "kubernetes_manifest" "orders_queue" {
  depends_on = [kubernetes_manifest.rabbitmq_cluster]

  manifest = {
    apiVersion = "rabbitmq.com/v1beta1"
    kind       = "Queue"
    metadata = {
      name      = "orders-queue"
      namespace = kubernetes_namespace.rabbitmq.metadata[0].name
    }
    spec = {
      name    = "orders"
      durable = true

      arguments = {
        "x-message-ttl"          = 86400000  # 24 hours TTL
        "x-dead-letter-exchange" = "orders-dlx"
        "x-max-length"           = 100000
      }

      rabbitmqClusterReference = {
        name = kubernetes_manifest.rabbitmq_cluster.manifest.metadata.name
      }
    }
  }
}

# Create a dead-letter exchange and queue
resource "kubernetes_manifest" "orders_dlx_exchange" {
  depends_on = [kubernetes_manifest.rabbitmq_cluster]

  manifest = {
    apiVersion = "rabbitmq.com/v1beta1"
    kind       = "Exchange"
    metadata = {
      name      = "orders-dlx-exchange"
      namespace = kubernetes_namespace.rabbitmq.metadata[0].name
    }
    spec = {
      name    = "orders-dlx"
      type    = "fanout"
      durable = true

      rabbitmqClusterReference = {
        name = kubernetes_manifest.rabbitmq_cluster.manifest.metadata.name
      }
    }
  }
}

resource "kubernetes_manifest" "orders_dlq" {
  depends_on = [kubernetes_manifest.rabbitmq_cluster]

  manifest = {
    apiVersion = "rabbitmq.com/v1beta1"
    kind       = "Queue"
    metadata = {
      name      = "orders-dlq"
      namespace = kubernetes_namespace.rabbitmq.metadata[0].name
    }
    spec = {
      name    = "orders-dlq"
      durable = true

      rabbitmqClusterReference = {
        name = kubernetes_manifest.rabbitmq_cluster.manifest.metadata.name
      }
    }
  }
}

resource "kubernetes_manifest" "orders_dlq_binding" {
  depends_on = [
    kubernetes_manifest.orders_dlx_exchange,
    kubernetes_manifest.orders_dlq,
  ]

  manifest = {
    apiVersion = "rabbitmq.com/v1beta1"
    kind       = "Binding"
    metadata = {
      name      = "orders-dlq-binding"
      namespace = kubernetes_namespace.rabbitmq.metadata[0].name
    }
    spec = {
      source          = "orders-dlx"
      destination     = "orders-dlq"
      destinationType = "queue"

      rabbitmqClusterReference = {
        name = kubernetes_manifest.rabbitmq_cluster.manifest.metadata.name
      }
    }
  }
}

# Create an exchange for topic routing
resource "kubernetes_manifest" "orders_exchange" {
  depends_on = [kubernetes_manifest.rabbitmq_cluster]

  manifest = {
    apiVersion = "rabbitmq.com/v1beta1"
    kind       = "Exchange"
    metadata = {
      name      = "orders-exchange"
      namespace = kubernetes_namespace.rabbitmq.metadata[0].name
    }
    spec = {
      name    = "orders"
      type    = "topic"
      durable = true

      rabbitmqClusterReference = {
        name = kubernetes_manifest.rabbitmq_cluster.manifest.metadata.name
      }
    }
  }
}
```

## Best Practices

- Deploy with 3 replicas (odd number) to maintain quorum in split-brain scenarios.
- Scrape RabbitMQ metrics with Prometheus; the Cluster Operator enables the `rabbitmq_prometheus` plugin by default.
- Use quorum queues for replicated workloads; classic queue mirroring was removed in RabbitMQ 4.x.
- When using dead-lettering, create the dead-letter exchange and bind it to a DLQ; if the DLX is missing when messages are dead-lettered, RabbitMQ drops them.
- Use TLS for all AMQP connections in production - the default unencrypted connections are not appropriate for sensitive data.
