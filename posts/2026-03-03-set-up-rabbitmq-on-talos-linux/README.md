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
  image: rabbitmq:3.13-management
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
      default_user = admin
      default_pass = rabbitmq-secure-password

      # Memory and disk thresholds
      vm_memory_high_watermark.relative = 0.7
      disk_free_limit.absolute = 2GB

      # Clustering settings
      cluster_partition_handling = pause_minority
      cluster_formation.peer_discovery_backend = rabbit_peer_discovery_k8s
      cluster_formation.k8s.host = kubernetes.default.svc.cluster.local
      cluster_formation.k8s.address_type = hostname

      # Queue settings
      queue_master_locator = min-masters

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

# Check queue mirroring status
kubectl exec -it rabbitmq-prod-server-0 -n rabbitmq -- rabbitmqctl list_queues name messages consumers
```

## Step 6: Create Queues and Exchanges

You can manage RabbitMQ through its management API or CLI:

```bash
# Declare an exchange
kubectl exec -it rabbitmq-prod-server-0 -n rabbitmq -- \
  rabbitmqadmin declare exchange name=events type=topic durable=true

# Declare a queue with durability
kubectl exec -it rabbitmq-prod-server-0 -n rabbitmq -- \
  rabbitmqadmin declare queue name=order-events durable=true \
  arguments='{"x-queue-type": "quorum"}'

# Bind the queue to the exchange
kubectl exec -it rabbitmq-prod-server-0 -n rabbitmq -- \
  rabbitmqadmin declare binding source=events \
  destination=order-events routing_key="orders.#"

# Publish a test message
kubectl exec -it rabbitmq-prod-server-0 -n rabbitmq -- \
  rabbitmqadmin publish exchange=events routing_key="orders.created" \
  payload='{"order_id": "12345", "status": "created"}'

# Consume the message
kubectl exec -it rabbitmq-prod-server-0 -n rabbitmq -- \
  rabbitmqadmin get queue=order-events count=1
```

## Using Quorum Queues

For production, always use quorum queues instead of classic mirrored queues. Quorum queues use the Raft consensus protocol and provide better data safety:

```bash
# Create a quorum queue policy
kubectl exec -it rabbitmq-prod-server-0 -n rabbitmq -- \
  rabbitmqctl set_policy quorum-queues "^" \
  '{"queue-type":"quorum"}' \
  --apply-to queues --priority 1
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
  rabbitmq:
    additionalConfig: |
      ssl_options.verify = verify_peer
      ssl_options.fail_if_no_peer_cert = false
      management.ssl.port = 15671
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
- `rabbitmq_node_mem_used` - memory consumption

## Scaling Considerations

RabbitMQ scaling works differently from databases. Adding more nodes to a RabbitMQ cluster does not automatically distribute existing queues. Quorum queues have a fixed number of replicas set at creation time. To handle more throughput, consider:

- Spreading queues across nodes using the `min-masters` queue master locator
- Using consistent hash exchange for load distribution
- Sharding queues across multiple queues with a naming convention
- Scaling consumers rather than broker nodes for most workloads

## Conclusion

RabbitMQ on Talos Linux provides a reliable message broker on a secure foundation. The RabbitMQ Cluster Operator simplifies deployment and lifecycle management, handling cluster formation, credential management, and plugin configuration. For production deployments, use quorum queues for data safety, enable TLS for encrypted communication, monitor queue depth and consumer lag, and spread cluster nodes across physical hosts using pod anti-affinity. This combination gives you a messaging layer that is both robust and operationally straightforward.
