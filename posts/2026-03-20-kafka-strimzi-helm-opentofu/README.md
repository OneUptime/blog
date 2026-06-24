# How to Deploy Apache Kafka with Strimzi on Kubernetes using OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kafka, Strimzi, OpenTofu, Helm, Streaming, Message Queue

Description: Learn how to deploy Apache Kafka on Kubernetes using Strimzi Operator and OpenTofu for production-grade event streaming with KRaft mode, TLS, and automatic topic management.

## Overview

Strimzi simplifies running Apache Kafka on Kubernetes by providing Kubernetes operators that manage Kafka clusters through custom resources. OpenTofu deploys the Strimzi operator via Helm and then, after the Strimzi CRDs are installed, creates Kafka clusters, topics, and users declaratively.

## Step 1: Deploy Strimzi Operator with Helm

```hcl
# main.tf - Deploy Strimzi Kafka Operator via Helm

resource "helm_release" "strimzi" {
  name             = "strimzi"
  repository       = "https://strimzi.io/charts/"
  chart            = "strimzi-kafka-operator"
  version          = "0.39.0"
  namespace        = "kafka"
  create_namespace = true

  values = [yamlencode({
    replicas = 2

    resources = {
      requests = { memory = "256Mi", cpu = "200m" }
      limits   = { memory = "512Mi", cpu = "500m" }
    }

    # Watch only the release namespace. To watch additional namespaces,
    # list existing namespaces here and omit the release namespace itself.
    watchNamespaces = []

    # Required for KRaft in Strimzi 0.39
    featureGates = "+UseKRaft"

    logLevel = "INFO"
  })]
}
```

## Step 2: Create a Kafka Cluster (KRaft Mode)

```hcl
# Apply the Helm release first so the Strimzi CRDs exist before planning
# these custom resources with kubernetes_manifest.
resource "kubernetes_manifest" "kafka_node_pool" {
  depends_on = [helm_release.strimzi]

  manifest = {
    apiVersion = "kafka.strimzi.io/v1beta2"
    kind       = "KafkaNodePool"
    metadata = {
      name      = "dual-role"
      namespace = "kafka"
      labels = {
        "strimzi.io/cluster" = "production-kafka"
      }
    }
    spec = {
      replicas = 3
      roles    = ["controller", "broker"]

      storage = {
        type = "jbod"
        volumes = [{
          id          = 0
          type        = "persistent-claim"
          size        = "100Gi"
          class       = "gp3"
          deleteClaim = false
        }]
      }
    }
  }
}

# Kafka cluster using KRaft (ZooKeeper is not used at runtime)
resource "kubernetes_manifest" "kafka_cluster" {
  depends_on = [kubernetes_manifest.kafka_node_pool]

  manifest = {
    apiVersion = "kafka.strimzi.io/v1beta2"
    kind       = "Kafka"
    metadata = {
      name      = "production-kafka"
      namespace = "kafka"
      annotations = {
        "strimzi.io/node-pools" = "enabled"
        "strimzi.io/kraft"      = "enabled"
      }
    }
    spec = {
      kafka = {
        version         = "3.6.1"
        metadataVersion = "3.6-IV2"

        # Required by the 0.39 CRD schema and ignored when node pools are used
        replicas = 3

        listeners = [
          {
            name = "plain"
            port = 9092
            type = "internal"
            tls  = false
          },
          {
            name = "tls"
            port = 9093
            type = "internal"
            tls  = true
            authentication = {
              type = "tls"
            }
          },
          {
            name = "external"
            port = 9094
            type = "loadbalancer"
            tls  = true
            authentication = {
              type = "tls"
            }
          }
        ]

        authorization = {
          type = "simple"
        }

        config = {
          "offsets.topic.replication.factor"         = 3
          "transaction.state.log.replication.factor" = 3
          "transaction.state.log.min.isr"            = 2
          "default.replication.factor"               = 3
          "min.insync.replicas"                      = 2
          "inter.broker.protocol.version"            = "3.6"
          "log.retention.hours"                      = 168
          "log.segment.bytes"                        = 1073741824
        }

        # Required by the 0.39 CRD schema and ignored when node pools are used
        storage = {
          type = "jbod"
          volumes = [{
            id          = 0
            type        = "persistent-claim"
            size        = "100Gi"
            class       = "gp3"
            deleteClaim = false
          }]
        }

        resources = {
          requests = { memory = "2Gi", cpu = "500m" }
          limits   = { memory = "4Gi", cpu = "2000m" }
        }

        # JVM options
        jvmOptions = {
          "-Xms" = "1g"
          "-Xmx" = "2g"
        }
      }

      # Required by the 0.39 CRD schema and ignored in KRaft mode
      zookeeper = {
        replicas = 3
        storage = {
          type        = "persistent-claim"
          size        = "100Gi"
          class       = "gp3"
          deleteClaim = false
        }
      }

      entityOperator = {
        topicOperator = {}
        userOperator  = {}
      }
    }
  }
}
```

## Step 3: Create Kafka Topics

```hcl
# Create Kafka topics declaratively
resource "kubernetes_manifest" "kafka_topic_orders" {
  depends_on = [kubernetes_manifest.kafka_cluster]

  manifest = {
    apiVersion = "kafka.strimzi.io/v1beta2"
    kind       = "KafkaTopic"
    metadata = {
      name      = "orders"
      namespace = "kafka"
      labels = {
        "strimzi.io/cluster" = "production-kafka"
      }
    }
    spec = {
      partitions = 12
      replicas   = 3
      config = {
        "retention.ms"          = "604800000"  # 7 days
        "cleanup.policy"        = "delete"
        "min.insync.replicas"   = "2"
        "compression.type"      = "snappy"
      }
    }
  }
}
```

## Step 4: Create a Kafka User with ACLs

```hcl
# Create a Kafka user with specific permissions
resource "kubernetes_manifest" "kafka_user_producer" {
  depends_on = [kubernetes_manifest.kafka_cluster]

  manifest = {
    apiVersion = "kafka.strimzi.io/v1beta2"
    kind       = "KafkaUser"
    metadata = {
      name      = "order-producer"
      namespace = "kafka"
      labels = {
        "strimzi.io/cluster" = "production-kafka"
      }
    }
    spec = {
      authentication = {
        type = "tls"
      }
      authorization = {
        type = "simple"
        acls = [
          {
            resource = {
              type        = "topic"
              name        = "orders"
              patternType = "literal"
            }
            operations = ["Write", "Describe"]
            host       = "*"
          },
          {
            resource = {
              type = "cluster"
            }
            operations = ["IdempotentWrite"]
            host       = "*"
          }
        ]
      }
    }
  }
}
```

## Summary

Strimzi operator deployed with OpenTofu manages Kafka clusters on Kubernetes as native Kubernetes resources. In Strimzi 0.39, KRaft requires the `UseKRaft` feature gate and `KafkaNodePool` resources, and the `Kafka` resource still includes schema-placeholder fields such as `zookeeper` even though ZooKeeper is not used at runtime. The entity operator manages Kafka users, and the default unidirectional topic operator in Strimzi 0.39 lets you manage `KafkaTopic` resources declaratively for GitOps workflows.
