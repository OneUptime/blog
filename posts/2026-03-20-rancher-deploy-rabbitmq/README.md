# How to Deploy RabbitMQ on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, RabbitMQ, Message Queue, AMQP

Description: Deploy a production-ready RabbitMQ cluster on Rancher using the RabbitMQ Cluster Operator with high availability, persistent storage, and monitoring.

## Introduction

RabbitMQ is a widely used open-source message broker supporting AMQP, MQTT, and STOMP protocols. Deploying RabbitMQ on Rancher with the Kubernetes operator provides automated cluster management, rolling upgrades, and integrated monitoring. This guide covers deploying a highly available RabbitMQ cluster using the RabbitMQ Cluster Operator.

## Prerequisites

- Rancher-managed Kubernetes cluster
- Helm 3.8+ installed (if using the Helm installation option)
- kubectl with cluster-admin access
- A StorageClass for persistent volumes

## Step 1: Install the RabbitMQ Cluster Operator

```bash
# Install RabbitMQ Cluster Operator

kubectl apply -f "https://github.com/rabbitmq/cluster-operator/releases/latest/download/cluster-operator.yml"

# Or via Helm
helm install rabbitmq-operator oci://registry-1.docker.io/bitnamicharts/rabbitmq-cluster-operator \
  --namespace rabbitmq-system \
  --create-namespace

# Verify the operator is running
kubectl get pods -n rabbitmq-system
```

## Step 2: Deploy a RabbitMQ Cluster

```yaml
# rabbitmq-cluster.yaml - Production RabbitMQ cluster
apiVersion: rabbitmq.com/v1beta1
kind: RabbitmqCluster
metadata:
  name: rabbitmq-prod
  namespace: messaging
spec:
  # 3 nodes for HA quorum queues
  replicas: 3
  image: rabbitmq:4.2-management

  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 2Gi

  persistence:
    storageClassName: standard
    storage: 20Gi

  rabbitmq:
    additionalPlugins:
      - rabbitmq_prometheus
      - rabbitmq_shovel
      - rabbitmq_shovel_management
    additionalConfig: |
      # Default virtual host
      default_vhost = /

      # Cluster formation settings
      cluster_formation.peer_discovery_backend = rabbit_peer_discovery_k8s
      cluster_formation.k8s.address_type = hostname

      # Queue settings
      queue.default_queue_type = quorum

      # Memory alarm threshold (80% of available RAM)
      vm_memory_high_watermark.relative = 0.8

      # Disk free space alarm threshold
      disk_free_limit.relative = 2.0

      # Logging
      log.console.level = info
      log.file.level = warning

    advancedConfig: |
      [
        {rabbit, [
          {default_consumer_prefetch, {false, 100}}
        ]}
      ].

  service:
    type: ClusterIP

  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchLabels:
              app.kubernetes.io/name: rabbitmq-prod
          topologyKey: kubernetes.io/hostname
```

```bash
# Create namespace and apply
kubectl create namespace messaging
kubectl apply -f rabbitmq-cluster.yaml

# Watch cluster come up
kubectl get rabbitmqclusters -n messaging -w
```

## Step 3: Configure Users and Virtual Hosts

```bash
# Get the default username/password
USERNAME=$(kubectl get secret rabbitmq-prod-default-user \
  -n messaging \
  -o jsonpath='{.data.username}' | base64 -d)
PASSWORD=$(kubectl get secret rabbitmq-prod-default-user \
  -n messaging \
  -o jsonpath='{.data.password}' | base64 -d)

# Port forward to management UI
kubectl port-forward -n messaging svc/rabbitmq-prod 15672:15672 &

# Create application user via API
curl -s -u "${USERNAME}:${PASSWORD}" \
  -X PUT \
  -H "Content-Type: application/json" \
  http://localhost:15672/api/users/appuser \
  -d '{"password": "AppUserP@ss", "tags": ""}'

# Create a virtual host
curl -s -u "${USERNAME}:${PASSWORD}" \
  -X PUT \
  http://localhost:15672/api/vhosts/production

# Grant permissions
curl -s -u "${USERNAME}:${PASSWORD}" \
  -X PUT \
  -H "Content-Type: application/json" \
  http://localhost:15672/api/permissions/production/appuser \
  -d '{"configure": ".*", "write": ".*", "read": ".*"}'

# Store the application password in a Kubernetes Secret for workloads
kubectl create secret generic rabbitmq-app-credentials \
  -n production \
  --from-literal=password='AppUserP@ss' \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Step 4: Create Quorum Queues

Quorum queues provide better data safety guarantees:

```bash
# Create a quorum queue via management API
curl -s -u "${USERNAME}:${PASSWORD}" \
  -X PUT \
  -H "Content-Type: application/json" \
  http://localhost:15672/api/queues/production/orders \
  -d '{
    "durable": true,
    "arguments": {
      "x-queue-type": "quorum",
      "x-delivery-limit": 5,
      "x-dead-letter-exchange": "",
      "x-dead-letter-routing-key": "orders.dlq",
      "x-message-ttl": 86400000
    }
  }'

# Create a dead-letter queue
curl -s -u "${USERNAME}:${PASSWORD}" \
  -X PUT \
  -H "Content-Type: application/json" \
  http://localhost:15672/api/queues/production/orders.dlq \
  -d '{"durable": true, "arguments": {"x-queue-type": "quorum"}}'
```

## Step 5: Configure Applications to Use RabbitMQ

```yaml
# app-deployment.yaml - Application connecting to RabbitMQ
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-processor
  namespace: production
spec:
  selector:
    matchLabels:
      app: order-processor
  template:
    metadata:
      labels:
        app: order-processor
    spec:
      containers:
        - name: order-processor
          image: registry.example.com/order-processor:v1.0
          env:
            - name: RABBITMQ_HOST
              value: "rabbitmq-prod.messaging.svc.cluster.local"
            - name: RABBITMQ_PORT
              value: "5672"
            - name: RABBITMQ_VHOST
              value: "production"
            - name: RABBITMQ_USER
              value: "appuser"
            - name: RABBITMQ_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: rabbitmq-app-credentials
                  key: password
            - name: RABBITMQ_URI
              value: "amqp://appuser:$(RABBITMQ_PASSWORD)@rabbitmq-prod.messaging.svc.cluster.local:5672/production"
```

## Step 6: Configure Prometheus Monitoring

```yaml
# rabbitmq-servicemonitor.yaml - Prometheus ServiceMonitor for RabbitMQ
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rabbitmq-monitor
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  namespaceSelector:
    matchNames:
      - messaging
  selector:
    matchLabels:
      app.kubernetes.io/name: rabbitmq-prod
  endpoints:
    - port: prometheus
      scheme: http
      interval: 30s
      path: /metrics
```

## Step 7: Set Up Shovel Plugin for Cross-Cluster Messaging

```bash
# Configure a shovel to forward messages to another cluster
curl -s -u "${USERNAME}:${PASSWORD}" \
  -X PUT \
  -H "Content-Type: application/json" \
  http://localhost:15672/api/parameters/shovel/production/cross-cluster-shovel \
  -d '{
    "value": {
      "src-protocol": "amqp091",
      "src-uri": "amqp://localhost/production",
      "src-queue": "orders",
      "dest-protocol": "amqp091",
      "dest-uri": "amqp://remote-rabbitmq.example.com/production",
      "dest-queue": "orders-remote",
      "reconnect-delay": 5,
      "ack-mode": "on-confirm"
    }
  }'
```

## Troubleshooting

```bash
# Check cluster status
kubectl exec -n messaging rabbitmq-prod-server-0 -- \
  rabbitmqctl cluster_status

# Check queue status
kubectl exec -n messaging rabbitmq-prod-server-0 -- \
  rabbitmqctl list_queues -p production name messages messages_unacknowledged

# Check consumers
kubectl exec -n messaging rabbitmq-prod-server-0 -- \
  rabbitmqctl list_consumers -p production

# Force a node to join the cluster
kubectl exec -n messaging rabbitmq-prod-server-1 -- \
  rabbitmqctl stop_app
kubectl exec -n messaging rabbitmq-prod-server-1 -- \
  rabbitmqctl join_cluster rabbit@rabbitmq-prod-server-0.rabbitmq-prod-nodes.messaging
kubectl exec -n messaging rabbitmq-prod-server-1 -- \
  rabbitmqctl start_app
```

## Conclusion

RabbitMQ on Rancher with the Cluster Operator provides a production-grade message broker with automatic cluster management, rolling upgrades, and Kubernetes-native configuration. Use quorum queues for critical messages requiring high data safety guarantees. The built-in Prometheus exporter integrates seamlessly with Rancher's monitoring stack, providing visibility into queue depths, consumer rates, and cluster health.
