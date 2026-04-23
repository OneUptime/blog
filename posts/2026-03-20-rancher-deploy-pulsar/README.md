# How to Deploy Apache Pulsar on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Pulsar, Message Queue, Streaming

Description: Deploy Apache Pulsar on Rancher for multi-tenant, geo-replicated messaging with built-in multi-tenancy, schema registry, and tiered storage.

## Introduction

Apache Pulsar is a cloud-native distributed messaging and streaming platform that combines the best features of traditional message queues and streaming platforms. Its layered architecture separates compute (brokers) from storage (BookKeeper), enabling independent scaling. This guide covers deploying Pulsar on Rancher using the official Helm chart.

## Prerequisites

- Rancher-managed Kubernetes cluster (Kubernetes 1.25+) with at least 3 nodes
- Helm 3.12+ installed
- kubectl 1.25+ with cluster-admin access
- `pulsar-admin` available locally, or access to the Pulsar `toolset` pod
- At least 8GB RAM per Pulsar node
- A StorageClass for persistent volumes

## Step 1: Add the Pulsar Helm Repository

```bash
# Add the Apache Pulsar Helm chart repository

helm repo add apache https://pulsar.apache.org/charts
helm repo update

# Check available versions
helm search repo apache/pulsar
```

## Step 2: Configure Pulsar Values

```yaml
# pulsar-values.yaml - Minimal production Pulsar configuration
# Full Pulsar includes ZooKeeper, BookKeeper, Brokers, Proxy, and Pulsar Manager

namespace: pulsar

# Enable specific components
components:
  zookeeper: true
  bookkeeper: true
  broker: true
  functions: false        # Disable Pulsar Functions for minimal deployment
  proxy: true
  toolset: true
  pulsar_manager: true

# ZooKeeper configuration
zookeeper:
  replicaCount: 3
  resources:
    requests:
      memory: 512Mi
      cpu: 100m
  volumes:
    data:
      storageClassName: standard
      size: 10Gi

# BookKeeper configuration (storage layer)
bookkeeper:
  replicaCount: 3
  resources:
    requests:
      memory: 2Gi
      cpu: 500m
  volumes:
    journal:
      storageClassName: standard
      size: 10Gi
    ledgers:
      storageClassName: standard
      size: 50Gi

# Broker configuration (compute layer)
broker:
  replicaCount: 2
  resources:
    requests:
      memory: 2Gi
      cpu: 500m
  configData:
    # Default number of broker threads
    numExecutorThreadPoolSize: "8"
    # Maximum message size (5MB)
    maxMessageSize: "5242880"
    # Default message retention
    defaultRetentionTimeInMinutes: "10080"   # 7 days

# Proxy configuration
proxy:
  replicaCount: 2
  resources:
    requests:
      memory: 1Gi
      cpu: 250m
  service:
    type: ClusterIP

# Pulsar Manager
pulsar_manager:
  resources:
    requests:
      memory: 512Mi
      cpu: 100m
```

## Step 3: Deploy Pulsar

```bash
# Create namespace
kubectl create namespace pulsar

# Install Pulsar using Helm
helm install pulsar apache/pulsar \
  --namespace pulsar \
  --values pulsar-values.yaml \
  --timeout 20m \
  --wait

# Check status
kubectl get pods -n pulsar
```

## Step 4: Configure Tenants and Namespaces

```bash
# Port forward to Pulsar admin
kubectl port-forward -n pulsar svc/pulsar-broker 8080:8080 &

# Create a tenant
pulsar-admin --admin-url http://localhost:8080 \
  tenants create my-tenant \
  --admin-roles admin \
  --allowed-clusters pulsar

# Create a namespace
pulsar-admin --admin-url http://localhost:8080 \
  namespaces create my-tenant/production

# Configure namespace retention
pulsar-admin --admin-url http://localhost:8080 \
  namespaces set-retention my-tenant/production \
  --size 10G \
  --time 7d

# Create a topic
pulsar-admin --admin-url http://localhost:8080 \
  topics create-partitioned-topic persistent://my-tenant/production/orders \
  --partitions 12
```

## Step 5: Connect Applications to Pulsar

```yaml
# app-deployment.yaml - Application using Pulsar
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
        - name: order-service
          image: registry.example.com/order-service:v1.0
          env:
            - name: PULSAR_SERVICE_URL
              value: "pulsar://pulsar-proxy.pulsar.svc.cluster.local:6650"
            - name: PULSAR_HTTP_URL
              value: "http://pulsar-proxy.pulsar.svc.cluster.local"
            - name: PULSAR_TENANT
              value: "my-tenant"
            - name: PULSAR_NAMESPACE
              value: "production"
            - name: PULSAR_TOPIC
              value: "persistent://my-tenant/production/orders"
```

## Step 6: Configure Tiered Storage

Pulsar can offload old data to object storage:

```yaml
# pulsar-tiered-storage-values.yaml - Add to broker config
broker:
  configData:
    # Enable AWS S3 offload. Provide credentials separately via IAM/IRSA or
    # another AWS credential source supported by the default provider chain.
    managedLedgerOffloadDriver: aws-s3
    s3ManagedLedgerOffloadBucket: my-pulsar-offload
    s3ManagedLedgerOffloadRegion: us-east-1
    s3ManagedLedgerOffloadServiceEndpoint: https://s3.us-east-1.amazonaws.com
    # Disable size-based offload and offload segments older than 30 days
    managedLedgerOffloadAutoTriggerSizeThresholdBytes: "-1"
    managedLedgerOffloadThresholdInSeconds: "2592000"
```

## Step 7: Monitor Pulsar

```bash
# List brokers in the cluster
kubectl exec -n pulsar pulsar-broker-0 -- \
  ./bin/pulsar-admin brokers list pulsar

# Check topic stats
kubectl exec -n pulsar pulsar-broker-0 -- \
  ./bin/pulsar-admin topics stats \
  persistent://my-tenant/production/orders

# Inspect internal topic stats
kubectl exec -n pulsar pulsar-broker-0 -- \
  ./bin/pulsar-admin topics stats-internal \
  persistent://my-tenant/production/orders

# Access Pulsar Manager UI
kubectl port-forward -n pulsar svc/pulsar-pulsar-manager 9527:9527
```

## Troubleshooting

```bash
# Inspect ZooKeeper metadata
kubectl exec -n pulsar pulsar-zookeeper-0 -- \
  ./bin/pulsar zookeeper-shell ls /

# Run a BookKeeper sanity test
kubectl exec -n pulsar pulsar-bookie-0 -- \
  ./bin/bookkeeper shell bookiesanity

# Check broker logs
kubectl logs -n pulsar pulsar-broker-0 --tail=100

# Run a basic BookKeeper write/read test
kubectl exec -n pulsar pulsar-bookie-0 -- \
  ./bin/bookkeeper shell simpletest
```

## Conclusion

Apache Pulsar on Rancher provides a feature-rich messaging platform with native multi-tenancy, geo-replication, and tiered storage. Its layered architecture enables independent scaling of brokers and BookKeeper storage nodes. While more complex to operate than RabbitMQ or NATS, Pulsar is an excellent choice for organizations that need built-in multi-tenancy, schema registry, or cloud-native tiered storage capabilities.
