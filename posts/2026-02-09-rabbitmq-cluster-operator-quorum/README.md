# How to Deploy RabbitMQ Cluster Operator with Quorum Queues on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RabbitMQ, Message Queue, High Availability

Description: Learn how to deploy RabbitMQ using the Cluster Operator on Kubernetes and configure quorum queues for high availability, data safety, and fault tolerance in distributed messaging systems.

---

RabbitMQ's Cluster Operator simplifies deploying and managing RabbitMQ clusters on Kubernetes. Combined with quorum queues, a replicated queue type built on the Raft consensus algorithm, you get strong consistency guarantees and automatic failover capabilities. This combination provides production-grade messaging infrastructure with minimal operational overhead.

In this guide, you'll learn how to deploy RabbitMQ using the Cluster Operator, configure quorum queues for high availability, implement proper resource management, and monitor cluster health for reliable message delivery.

## Understanding RabbitMQ Quorum Queues

Traditional RabbitMQ mirrored classic queues relied on leader-follower replication and were removed in RabbitMQ 4.0. Quorum queues use Raft consensus for strong consistency, providing:

- Replicated FIFO queues with all operations going through a leader
- Automatic leader election on node failure
- Data safety for confirmed messages as long as a majority of queue members remains available
- Poison message handling with configurable delivery limits
- Predictable failure handling during node restarts and upgrades

Quorum queues are ideal for scenarios requiring data safety and consistency over maximum throughput.

## Installing the RabbitMQ Cluster Operator

Install the operator using kubectl:

```bash
# Install the operator

kubectl apply -f https://github.com/rabbitmq/cluster-operator/releases/latest/download/cluster-operator.yml

# Verify operator installation
kubectl get pods -n rabbitmq-system
```

You should see the cluster operator pod running:

```text
NAME                                         READY   STATUS    RESTARTS   AGE
rabbitmq-cluster-operator-7b9c9f5b4d-xk8nh   1/1     Running   0          30s
```

Alternatively, install using Helm:

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

helm install rabbitmq-operator bitnami/rabbitmq-cluster-operator \
  --namespace rabbitmq-system \
  --create-namespace
```

## Deploying a Basic RabbitMQ Cluster

Create a RabbitmqCluster resource:

```yaml
apiVersion: rabbitmq.com/v1beta1
kind: RabbitmqCluster
metadata:
  name: production-rabbitmq
  namespace: rabbitmq
spec:
  replicas: 3
  image: rabbitmq:4.3-management
  service:
    type: ClusterIP
  persistence:
    storageClassName: standard
    storage: 10Gi
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 1000m
      memory: 2Gi
  rabbitmq:
    additionalConfig: |
      cluster_formation.peer_discovery_backend = rabbit_peer_discovery_k8s
      cluster_formation.k8s.host = kubernetes.default.svc.cluster.local
      cluster_formation.k8s.address_type = hostname
      cluster_name = production-rabbitmq
      log.console.level = info
```

Apply the cluster configuration:

```bash
kubectl create namespace rabbitmq
kubectl apply -f rabbitmq-cluster.yaml

# Watch cluster creation
kubectl get rabbitmqcluster -n rabbitmq -w

# Once ready, verify pods
kubectl get pods -n rabbitmq
```

## Configuring Quorum Queues

Declare quorum queues using the management API or client libraries. Create a ConfigMap with queue definitions:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rabbitmq-definitions
  namespace: rabbitmq
data:
  definitions.json: |
    {
      "queues": [
        {
          "name": "orders",
          "vhost": "/",
          "durable": true,
          "auto_delete": false,
          "arguments": {
            "x-queue-type": "quorum",
            "x-quorum-initial-group-size": 3,
            "x-max-length": 100000,
            "x-max-length-bytes": 1073741824
          }
        },
        {
          "name": "notifications",
          "vhost": "/",
          "durable": true,
          "auto_delete": false,
          "arguments": {
            "x-queue-type": "quorum",
            "x-delivery-limit": 3
          }
        }
      ],
      "exchanges": [
        {
          "name": "events",
          "vhost": "/",
          "type": "topic",
          "durable": true,
          "auto_delete": false
        }
      ],
      "bindings": [
        {
          "source": "events",
          "vhost": "/",
          "destination": "orders",
          "destination_type": "queue",
          "routing_key": "order.*"
        }
      ]
    }
```

Update the RabbitmqCluster to load definitions:

```yaml
apiVersion: rabbitmq.com/v1beta1
kind: RabbitmqCluster
metadata:
  name: production-rabbitmq
  namespace: rabbitmq
spec:
  replicas: 3
  image: rabbitmq:4.3-management
  override:
    statefulSet:
      spec:
        template:
          spec:
            containers:
            - name: rabbitmq
              volumeMounts:
              - name: definitions
                mountPath: /etc/rabbitmq/definitions.json
                subPath: definitions.json
            volumes:
            - name: definitions
              configMap:
                name: rabbitmq-definitions
  rabbitmq:
    additionalConfig: |
      definitions.import_backend = local_filesystem
      definitions.local.path = /etc/rabbitmq/definitions.json
```

## Creating Quorum Queues Programmatically

Use RabbitMQ client libraries to declare quorum queues:

### Python (Pika)

```python
import pika

# Connect to RabbitMQ
connection = pika.BlockingConnection(
    pika.ConnectionParameters(
        host='production-rabbitmq.rabbitmq.svc.cluster.local',
        credentials=pika.PlainCredentials('username', 'password')
    )
)
channel = connection.channel()

# Declare quorum queue
channel.queue_declare(
    queue='payments',
    durable=True,
    arguments={
        'x-queue-type': 'quorum',
        'x-quorum-initial-group-size': 3,
        'x-max-length': 50000,
        'x-delivery-limit': 5  # Drop or dead-letter after repeated failed deliveries
    }
)

# Publish message with confirmation
channel.confirm_delivery()
channel.basic_publish(
    exchange='',
    routing_key='payments',
    body='Payment data',
    properties=pika.BasicProperties(
        delivery_mode=2,  # Persistent
    )
)

connection.close()
```

### Go (amqp091-go)

```go
package main

import (
    "log"
    "time"

    amqp "github.com/rabbitmq/amqp091-go"
)

func main() {
    conn, err := amqp.Dial("amqp://username:password@production-rabbitmq.rabbitmq.svc.cluster.local:5672/")
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    ch, err := conn.Channel()
    if err != nil {
        log.Fatal(err)
    }
    defer ch.Close()

    // Declare quorum queue
    args := amqp.Table{
        "x-queue-type": "quorum",
        "x-quorum-initial-group-size": 3,
        "x-max-length": 50000,
        "x-delivery-limit": 5,
    }

    _, err = ch.QueueDeclare(
        "payments",  // name
        true,        // durable
        false,       // delete when unused
        false,       // exclusive
        false,       // no-wait
        args,        // arguments
    )
    if err != nil {
        log.Fatal(err)
    }

    // Publish with confirmation
    if err := ch.Confirm(false); err != nil {
        log.Fatal(err)
    }
    confirmCh := ch.NotifyPublish(make(chan amqp.Confirmation, 1))

    err = ch.Publish(
        "",         // exchange
        "payments", // routing key
        true,       // mandatory
        false,      // immediate
        amqp.Publishing{
            DeliveryMode: amqp.Persistent,
            ContentType:  "text/plain",
            Body:        []byte("Payment data"),
        },
    )
    if err != nil {
        log.Fatal(err)
    }

    select {
    case confirm := <-confirmCh:
        if !confirm.Ack {
            log.Fatal("message was not confirmed by broker")
        }
    case <-time.After(5 * time.Second):
        log.Fatal("timed out waiting for publisher confirm")
    }
}
```

## Configuring Quorum Queue Policies

Apply policies for consistent quorum queue configuration:

```yaml
apiVersion: rabbitmq.com/v1beta1
kind: RabbitmqCluster
metadata:
  name: production-rabbitmq
  namespace: rabbitmq
spec:
  replicas: 3
  rabbitmq:
    additionalConfig: |
      # Set default queue type to quorum
      default_queue_type = quorum
      # Keep quorum queue leaders reasonably balanced
      queue_leader_locator = balanced
```

Define policies via management API:

```bash
# Get RabbitMQ credentials
USERNAME=$(kubectl get secret production-rabbitmq-default-user -n rabbitmq -o jsonpath='{.data.username}' | base64 -d)
PASSWORD=$(kubectl get secret production-rabbitmq-default-user -n rabbitmq -o jsonpath='{.data.password}' | base64 -d)

# Port-forward to management interface
kubectl port-forward -n rabbitmq svc/production-rabbitmq 15672:15672 &

# Set policy for quorum queues
curl -u $USERNAME:$PASSWORD -X PUT \
  http://localhost:15672/api/policies/%2f/quorum-policy \
  -H "content-type: application/json" \
  -d '{
    "pattern": ".*",
    "definition": {
      "max-length": 100000,
      "delivery-limit": 3,
      "overflow": "reject-publish"
    },
    "priority": 1,
    "apply-to": "quorum_queues"
  }'
```

## Implementing High Availability Configuration

Configure anti-affinity to spread RabbitMQ nodes across availability zones:

```yaml
apiVersion: rabbitmq.com/v1beta1
kind: RabbitmqCluster
metadata:
  name: production-rabbitmq
  namespace: rabbitmq
spec:
  replicas: 3
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
          - key: app.kubernetes.io/name
            operator: In
            values:
            - production-rabbitmq
        topologyKey: topology.kubernetes.io/zone
  persistence:
    storageClassName: fast-ssd
    storage: 20Gi
  resources:
    requests:
      cpu: 1000m
      memory: 2Gi
    limits:
      cpu: 2000m
      memory: 4Gi
```

## Consuming from Quorum Queues

Implement consumers with proper acknowledgment:

```python
import pika

connection = pika.BlockingConnection(
    pika.ConnectionParameters(
        host='production-rabbitmq.rabbitmq.svc.cluster.local',
        credentials=pika.PlainCredentials('username', 'password')
    )
)
channel = connection.channel()

# Set prefetch count for fair dispatch
channel.basic_qos(prefetch_count=10)

def callback(ch, method, properties, body):
    try:
        # Process message
        print(f"Received {body}")
        # Acknowledge after successful processing
        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as e:
        print(f"Error processing message: {e}")
        # Negative acknowledge without requeue - will be discarded or dead-lettered if a DLX is configured
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

# Consume from quorum queue
channel.basic_consume(
    queue='orders',
    on_message_callback=callback,
    auto_ack=False  # Manual acknowledgment
)

print('Waiting for messages...')
channel.start_consuming()
```

## Monitoring Quorum Queue Health

The Cluster Operator enables RabbitMQ's built-in Prometheus plugin by default. Expose the metrics port with a ServiceMonitor:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: production-rabbitmq
  namespace: monitoring
  labels:
    app: rabbitmq
spec:
  selector:
    matchLabels:
      app.kubernetes.io/component: rabbitmq
  namespaceSelector:
    matchNames:
    - rabbitmq
  endpoints:
  - port: prometheus
    path: /metrics
    interval: 15s
    scrapeTimeout: 14s
  - port: prometheus
    path: /metrics/detailed
    interval: 15s
    scrapeTimeout: 14s
    params:
      family:
      - queue_coarse_metrics
      - queue_consumer_count
      - ra_metrics
```

Create alerts for quorum queue issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: rabbitmq-quorum-alerts
  namespace: monitoring
spec:
  groups:
  - name: rabbitmq-quorum
    rules:
    - alert: QuorumQueueFrequentLeaderElections
      expr: |
        increase(rabbitmq_detailed_raft_elections[10m]) > 3
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Frequent Raft leader elections"
        description: "Queue {{ $labels.queue }} has had repeated Raft leader elections"

    - alert: QuorumQueueHighLength
      expr: |
        rabbitmq_detailed_queue_messages_ready > 10000
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Quorum queue length high"
```

## Handling Node Failures

Quorum queues automatically handle node failures through Raft consensus:

```bash
# Simulate node failure
kubectl delete pod production-rabbitmq-server-1 -n rabbitmq

# Watch automatic recovery
kubectl get pods -n rabbitmq -w

# Verify queue leadership transferred
kubectl exec -n rabbitmq production-rabbitmq-server-0 -- \
  rabbitmqctl list_queues name type leader
```

The queue automatically elects a new leader and continues processing messages.

## Best Practices

Follow these practices for RabbitMQ quorum queues:

1. **Use at least 3 replicas** - Quorum requires majority consensus
2. **Set delivery limits** - Configure dead-letter handling for failed messages
3. **Monitor queue length** - Alert on growing backlogs
4. **Use manual acknowledgment** - Ensure messages are processed before acking
5. **Configure resource limits** - Prevent memory exhaustion
6. **Enable persistence** - Use durable queues and persistent messages
7. **Spread across zones** - Use anti-affinity for availability

## Troubleshooting Common Issues

Common problems and solutions:

```bash
# Check cluster status
kubectl exec -n rabbitmq production-rabbitmq-server-0 -- rabbitmqctl cluster_status

# View quorum queue details
kubectl exec -n rabbitmq production-rabbitmq-server-0 -- \
  rabbitmqctl list_queues name type members online leader

# Check for alarms
kubectl exec -n rabbitmq production-rabbitmq-server-0 -- rabbitmqctl alarm_status

# View logs
kubectl logs -n rabbitmq production-rabbitmq-server-0 -f
```

## Conclusion

Deploying RabbitMQ with the Cluster Operator and quorum queues provides a robust, highly available messaging platform on Kubernetes. The combination of declarative cluster management, automatic failover, and strong consistency guarantees ensures reliable message delivery even during failures.

Understanding how to configure quorum queues, implement proper consumer patterns, and monitor cluster health enables you to build resilient distributed systems. The Raft-based replication in quorum queues provides safety guarantees that traditional mirrored queues cannot match, making them the recommended choice for production workloads requiring data consistency.
