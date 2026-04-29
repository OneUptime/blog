# How to Deploy MongoDB on Kubernetes with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, MongoDB, Database, OpenTofu, Helm, ReplicaSet, High Availability

Description: Learn how to deploy MongoDB on Kubernetes using OpenTofu and the Bitnami Helm chart with replica sets, persistent storage, authentication, and monitoring.

## Overview

MongoDB on Kubernetes with the Bitnami Helm chart provides a production-ready replica set deployment with automatic primary election, persistent storage, and built-in authentication. OpenTofu manages the deployment, secrets, and access configuration declaratively.

## Step 1: Deploy MongoDB with Helm

```hcl
# main.tf - Deploy MongoDB via Bitnami Helm chart

resource "random_password" "mongodb_root" {
  length  = 32
  special = false
}

resource "random_password" "mongodb_app" {
  length  = 32
  special = false
}

resource "kubernetes_secret" "mongodb_auth" {
  metadata {
    name      = "mongodb-auth"
    namespace = "mongodb"
  }

  data = {
    mongodb-root-password     = random_password.mongodb_root.result
    mongodb-passwords         = random_password.mongodb_app.result
    mongodb-replica-set-key   = random_password.mongodb_root.result
  }
}

resource "helm_release" "mongodb" {
  name             = "mongodb"
  repository       = "https://charts.bitnami.com/bitnami"
  chart            = "mongodb"
  version          = "14.12.0"
  namespace        = "mongodb"
  create_namespace = true

  values = [yamlencode({
    architecture = "replicaset"  # standalone or replicaset

    auth = {
      enabled        = true
      rootUser       = "root"
      usernames      = ["appuser"]
      databases      = ["appdb"]
      existingSecret = kubernetes_secret.mongodb_auth.metadata[0].name
    }

    replicaSetName = "rs0"  # Replica set name (replicaSetKey is read from existingSecret)

    replicaCount = 3  # 1 primary + 2 secondaries

    persistence = {
      enabled      = true
      size         = "20Gi"
      storageClass = "gp3"
    }

    resources = {
      requests = { memory = "256Mi", cpu = "250m" }
      limits   = { memory = "1Gi", cpu = "1000m" }
    }

    # MongoDB configuration
    configuration = <<-MONGO_CONF
      net:
        maxIncomingConnections: 200
      operationProfiling:
        mode: slowOp
        slowOpThresholdMs: 100
      wiredTiger:
        engineConfig:
          cacheSizeGB: 0.5
    MONGO_CONF

    # Arbiter node for tie-breaking (cost-effective HA)
    arbiter = {
      enabled = true
    }

    metrics = {
      enabled = true
      serviceMonitor = {
        enabled = true
      }
    }

    # Backup with mongodump
    backup = {
      enabled = true
      cronjob = {
        schedule = "0 2 * * *"
      }
    }
  })]
}
```

## Step 2: PodDisruptionBudget for MongoDB

```hcl
# Ensure replica set maintains majority during disruptions
resource "kubernetes_pod_disruption_budget_v1" "mongodb" {
  metadata {
    name      = "mongodb-pdb"
    namespace = "mongodb"
  }

  spec {
    # Maintain majority (2 out of 3 nodes)
    min_available = 2
    selector {
      match_labels = {
        "app.kubernetes.io/name"      = "mongodb"
        "app.kubernetes.io/component" = "mongodb"
      }
    }
  }
}
```

## Step 3: MongoDB Sharded Cluster

```hcl
# Sharded cluster for very large datasets
resource "helm_release" "mongodb_sharded" {
  name      = "mongodb-sharded"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "mongodb-sharded"
  version    = "8.0.0"
  namespace  = "mongodb"

  values = [yamlencode({
    shards      = 2  # Number of shards
    configsvr = {
      replicaCount = 3
    }
    mongos = {
      replicaCount = 2
    }
    shardsvr = {
      dataNode = {
        replicaCount = 3
      }
      persistence = {
        size = "50Gi"
      }
    }
  })]
}
```

## Step 4: Outputs

```hcl
output "mongodb_host" {
  value       = "mongodb.mongodb.svc.cluster.local"
  description = "MongoDB service host"
}

output "mongodb_connection_string" {
  value     = "mongodb://appuser:PASSWORD@mongodb-0.mongodb-headless.mongodb.svc.cluster.local:27017,mongodb-1.mongodb-headless.mongodb.svc.cluster.local:27017,mongodb-2.mongodb-headless.mongodb.svc.cluster.local:27017/appdb?replicaSet=rs0"
  sensitive = true
}
```

## Summary

MongoDB deployed with OpenTofu on Kubernetes using Bitnami's Helm chart provides a 3-node replica set with automatic failover. The arbiter node enables a 3-vote replica set using only 2 data nodes, reducing storage costs while maintaining HA. For very large datasets, the sharded cluster configuration distributes data across multiple shards, each being its own replica set for fault tolerance.
