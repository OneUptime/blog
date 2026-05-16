# How to Set Up RabbitMQ on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, RabbitMQ, Kubernetes, Message Queue, AMQP, DevOps

Description: Deploy RabbitMQ message broker on Talos Linux using the RabbitMQ Cluster Operator with clustering, management UI, and persistent queues.

---

RabbitMQ is one of the most widely deployed message brokers in the world. It supports multiple messaging protocols including AMQP, MQTT, and STOMP, making it versatile for various integration patterns. Running RabbitMQ on Talos Linux gives you a message broker on a secure, immutable OS where the underlying system cannot be tampered with, which is especially important for infrastructure that handles critical message flows.

This guide walks through deploying RabbitMQ on Talos Linux, from a basic cluster to a production-ready setup with the RabbitMQ Cluster Operator.

## Why RabbitMQ on Talos Linux

Message brokers sit at the heart of distributed systems, routing messages between services. Any instability in the broker can cascade across your entire application. Talos Linux reduces this risk by eliminating OS-level variability. Every node boots into the same state, and there is no way for ad-hoc changes to creep in. For RabbitMQ, this means your broker nodes run on a predictable foundation.

## Prerequisites

- Talos Linux cluster with at least three worker nodes
- `kubectl` and `talosctl` configured
- A StorageClass for persistent volumes
- At least 2GB RAM per RabbitMQ node

## Step 1: Install the RabbitMQ Cluster Operator

The RabbitMQ Cluster Operator is the recommended way to run RabbitMQ on Kubernetes:

```bash
# Install the RabbitMQ Cluster Operator

kubectl apply -f https://github.com/rabbitmq/cluster-operator/releases/latest/download/cluster-operator.yml

# Verify the operator is running
kubectl get pods -n rabbitmq-system
```

## Step 2: Create a Namespace

```yaml
# rabbitmq-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: rabbitmq
```

```bash
kubectl apply -f rabbitmq-namespace.yaml
```

## Step 3: Deploy a RabbitMQ Cluster

```yaml
# rabbitmq-cluster.yaml
apiVersion: rabbitmq.com/v1beta1
kind: RabbitmqCluster
metadata:
  name: rabbitmq-prod
  namespace: rabbitmq
spec:
  replicas: 3
  image: rabbitmq:4.2-management
  resources:
    requests:
      memory: "2Gi"
      cpu: "500m"
    limits:
      memory: "2Gi"
      cpu: "1000m"
  persistence:
    storageClassName: local-path
    storage: 20Gi
  rabbitmq:
    additionalConfig: |
      # Queue and channel limits
      channel_max = 2048
      default_vhost = /

      # Memory and disk thresholds
      vm_memory_high_watermark.relative = 0.7
      disk_free_limit.absolute = 2GB

      # Clustering settings
      cluster_partition_handling = pause_minority
      cluster_formation.peer_discovery_backend = rabbit_peer_discovery_k8s
      cluster_formation.k8s.host = kubernetes.default.svc.cluster.local
      cluster_formation.k8s.address_type = hostname

      # Queue settings
      queue_leader_locator = balanced

      # Management plugin settings
      management.tcp.port = 15672
    additionalPlugins:
      - rabbitmq_management
      - rabbitmq_peer_discovery_k8s
      - rabbitmq_prometheus
      - rabbitmq_shovel
      - rabbitmq_shovel_management
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchExpressions:
              - key: app.kubernetes.io/name
                operator: In
                values:
                  - rabbitmq-prod
          topologyKey: kubernetes.io/hostname
```

```bash
kubectl apply -f rabbitmq-cluster.yaml

# Watch the cluster come up
kubectl get pods -n rabbitmq -w
```

## Step 4: Access the Management UI

RabbitMQ includes a web management interface for monitoring and administration:

```bash
# Get the default admin credentials
kubectl get secret rabbitmq-prod-default-user -n rabbitmq -o jsonpath='{.data.username}' | base64 --decode
kubectl get secret rabbitmq-prod-default-user -n rabbitmq -o jsonpath='{.data.password}' | base64 --decode

# Port-forward the management UI
kubectl port-forward svc/rabbitmq-prod -n rabbitmq 15672:15672

# Access at http://localhost:15672
```

## Step 5: Verify the Cluster

```bash
# Check cluster status
kubectl exec -it rabbitmq-prod-server-0 -n rabbitmq -- rabbitmqctl cluster_status

# List nodes in the cluster
kubectl exec -it rabbitmq-prod-server-0 -n rabbitmq -- rabbitmqctl cluster_status --formatter json

# Check queue status
kubectl exec -it rabbitmq-prod-server-0 -n rabbitmq -- rabbitmqctl list_queues name messages consumers
```

## Step 6: Create Queues and Exchanges

You can manage RabbitMQ through its management API or CLI. The HTTP API uses the same admin credentials you retrieved earlier:

```bash
export RABBITMQ_USER=$(kubectl get secret rabbitmq-prod-default-user -n rabbitmq -o jsonpath='{.data.username}' | base64 --decode)
export RABBITMQ_PASSWORD=$(kubectl get secret rabbitmq-prod-default-user -n rabbitmq -o jsonpath='{.data.password}' | base64 --decode)

# Declare an exchange
curl -u "$RABBITMQ_USER:$RABBITMQ_PASSWORD" \
  -H "content-type: application/json" \
  -X PUT http://localhost:15672/api/exchanges/%2F/events \
  -d '{"type":"topic","durable":true}'

# Declare a queue with durability
curl -u "$RABBITMQ_USER:$RABBITMQ_PASSWORD" \
  -H "content-type: application/json" \
  -X PUT http://localhost:15672/api/queues/%2F/order-events \
  -d '{"durable":true,"arguments":{"x-queue-type":"quorum"}}'

# Bind the queue to the exchange
curl -u "$RABBITMQ_USER:$RABBITMQ_PASSWORD" \
  -H "content-type: application/json" \
  -X POST http://localhost:15672/api/bindings/%2F/e/events/q/order-events \
  -d '{"routing_key":"orders.#"}'

# Publish a test message
curl -u "$RABBITMQ_USER:$RABBITMQ_PASSWORD" \
  -H "content-type: application/json" \
  -X POST http://localhost:15672/api/exchanges/%2F/events/publish \
  -d '{"properties":{},"routing_key":"orders.created","payload":"{\"order_id\":\"12345\",\"status\":\"created\"}","payload_encoding":"string"}'

# Consume the message
curl -u "$RABBITMQ_USER:$RABBITMQ_PASSWORD" \
  -H "content-type: application/json" \
  -X POST http://localhost:15672/api/queues/%2F/order-events/get \
  -d '{"count":1,"ackmode":"ack_requeue_false","encoding":"auto","truncate":50000}'
```

## Using Quorum Queues

For production, always use quorum queues instead of classic mirrored queues. Quorum queues use the Raft consensus protocol and provide better data safety:

```bash
# Set the default queue type for the default vhost
kubectl exec -it rabbitmq-prod-server-0 -n rabbitmq -- \
  rabbitmqctl update_vhost_metadata / --default-queue-type quorum
```

## Step 7: Configure TLS

For secure communication, add TLS to your RabbitMQ cluster:

```yaml
# rabbitmq-tls.yaml
apiVersion: rabbitmq.com/v1beta1
kind: RabbitmqCluster
metadata:
  name: rabbitmq-prod
  namespace: rabbitmq
spec:
  replicas: 3
  tls:
    secretName: rabbitmq-tls-secret
    disableNonTLSListeners: true
```

## Monitoring RabbitMQ

RabbitMQ includes a built-in Prometheus endpoint:

```yaml
# rabbitmq-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rabbitmq-monitor
  namespace: rabbitmq
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: rabbitmq-prod
  endpoints:
    - port: prometheus
      interval: 15s
```

Key metrics to monitor:
- `rabbitmq_queue_messages` - total messages in queues
- `rabbitmq_queue_messages_unacked` - unacknowledged messages
- `rabbitmq_connections` - active connections
- `rabbitmq_channels` - active channels
- `rabbitmq_process_resident_memory_bytes` - memory consumption

## Scaling Considerations

RabbitMQ scaling works differently from databases. Adding more nodes to a RabbitMQ cluster does not automatically distribute existing queues. Quorum queues have a fixed number of replicas set at creation time. To handle more throughput, consider:

- Spreading queue leaders across nodes using the `balanced` queue leader locator
- Using consistent hash exchange for load distribution
- Sharding queues across multiple queues with a naming convention
- Scaling consumers rather than broker nodes for most workloads

## Conclusion

RabbitMQ on Talos Linux provides a reliable message broker on a secure foundation. The RabbitMQ Cluster Operator simplifies deployment and lifecycle management, handling cluster formation, credential management, and plugin configuration. For production deployments, use quorum queues for data safety, enable TLS for encrypted communication, monitor queue depth and consumer lag, and spread cluster nodes across physical hosts using pod anti-affinity. This combination gives you a messaging layer that is both robust and operationally straightforward.
