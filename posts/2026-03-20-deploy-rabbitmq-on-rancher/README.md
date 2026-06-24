# How to Deploy RabbitMQ on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, RabbitMQ, Kubernetes, Message Queue, Helm, AMQP

Description: Deploy a production-ready RabbitMQ cluster on Rancher using Helm with persistent storage, management UI access, and proper resource configuration.

## Introduction

RabbitMQ is a widely used open-source message broker supporting AMQP, MQTT, and STOMP protocols. Running it on Rancher enables automatic pod recovery, clustered deployment, and seamless integration with cloud-native applications.

## Prerequisites

- Rancher-managed Kubernetes cluster with at least 3 worker nodes for a three-node RabbitMQ cluster
- `helm` 3.8+ and `kubectl` available
- A StorageClass for persistent volumes

## Step 1: Add Bitnami Repository

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

## Step 2: Configure Values

```yaml
# rabbitmq-values.yaml

auth:
  username: admin
  password: "securepassword"
  erlangCookie: "your-erlang-cookie-secret"   # Must be consistent across replicas

replicaCount: 3   # Three-node cluster layout

persistence:
  enabled: true
  storageClass: "longhorn"
  size: 20Gi

resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "1Gi"
    cpu: "1"

metrics:
  enabled: true   # Enable Prometheus metrics endpoint
  serviceMonitor:
    default:
      enabled: false   # Set true if Prometheus Operator is installed
```

## Step 3: Deploy RabbitMQ

```bash
kubectl create namespace messaging

helm install rabbitmq bitnami/rabbitmq \
  --namespace messaging \
  --values rabbitmq-values.yaml
```

## Step 4: Verify the Cluster

```bash
# Check all pods are running
kubectl get pods -n messaging

# Check cluster status from inside a pod
kubectl exec -it rabbitmq-0 -n messaging -- rabbitmqctl cluster_status
```

A healthy cluster shows all three nodes listed under `running_nodes`.

## Step 5: Access the Management UI

```bash
# Port-forward to access the RabbitMQ management console
kubectl port-forward svc/rabbitmq -n messaging 15672:15672

# Open http://localhost:15672 and log in with admin/securepassword
```

## Step 6: Create a Test Queue

Use the management HTTP API to create a queue and verify publishing. Keep the port-forward from the previous step running while you execute these commands.

```bash
# Declare a test queue
curl -u admin:securepassword -H "content-type:application/json" \
  -X PUT http://127.0.0.1:15672/api/queues/%2F/test-queue \
  -d '{"auto_delete":false,"durable":true,"arguments":{}}'

# Declare a direct exchange
curl -u admin:securepassword -H "content-type:application/json" \
  -X PUT http://127.0.0.1:15672/api/exchanges/%2F/test-exchange \
  -d '{"type":"direct","auto_delete":false,"durable":true,"internal":false,"arguments":{}}'

# Bind the queue to the exchange
curl -u admin:securepassword -H "content-type:application/json" \
  -X POST http://127.0.0.1:15672/api/bindings/%2F/e/test-exchange/q/test-queue \
  -d '{"routing_key":"test-queue","arguments":{}}'

# Publish a test message
curl -u admin:securepassword -H "content-type:application/json" \
  -X PUT http://127.0.0.1:15672/api/exchanges/%2F/test-exchange/publish \
  -d '{"properties":{},"routing_key":"test-queue","payload":"Hello, RabbitMQ!","payload_encoding":"string"}'

# Get the message
curl -u admin:securepassword -H "content-type:application/json" \
  -X POST http://127.0.0.1:15672/api/queues/%2F/test-queue/get \
  -d '{"count":1,"ackmode":"ack_requeue_false","encoding":"auto","truncate":50000}'
```

## Step 7: Configure a Service for Applications

Expose RabbitMQ to other pods in the cluster via the ClusterIP service created by the Helm chart.

```yaml
# Application environment variable pointing to RabbitMQ
env:
  - name: RABBITMQ_URL
    value: "amqp://admin:securepassword@rabbitmq.messaging.svc.cluster.local:5672/%2f"
```

## Conclusion

Your RabbitMQ cluster is now running on Rancher as a three-node StatefulSet. The `rabbitmq_peer_discovery_k8s` plugin handles node discovery automatically using the Kubernetes API and the chart's headless service. For queue-level high availability in RabbitMQ 4.x, use replicated data types such as quorum queues or streams. Monitor queue depths and message rates through the management UI or Prometheus integration.
