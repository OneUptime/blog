# How to Deploy RabbitMQ Cluster Operator with Quorum Queues on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RabbitMQ, Message Queue, High Availability

Description: Learn how to deploy RabbitMQ using the Cluster Operator on Kubernetes and configure quorum queues for high availability, data safety, and fault tolerance in distributed messaging systems.

---

RabbitMQ's Cluster Operator simplifies deploying and managing RabbitMQ clusters on Kubernetes. Combined with quorum queues, a replicated queue type built on the Raft consensus algorithm, you get strong consistency guarantees and automatic failover capabilities. This combination provides production-grade messaging infrastructure with minimal operational overhead.

In this guide, you'll learn how to deploy RabbitMQ using the Cluster Operator, configure quorum queues for high availability, implement proper resource management, and monitor cluster health for reliable message delivery.

## Understanding RabbitMQ Quorum Queues

Traditional RabbitMQ mirrored queues rely on leader-follower replication with eventual consistency. Quorum queues use Raft consensus for strong consistency, providing:

- Guaranteed message ordering across replicas
- Automatic leader election on node failure
- No message loss during network partitions
- Built-in at-least-once delivery semantics
- Better performance under high load

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

```
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

Create a RabbitMQCluster resource:

```yaml
apiVersion: rabbitmq.com/v1beta1
kind: RabbitMQCluster
metadata:
  name: production-rabbitmq
  namespace: rabbitmq
spec:
  replicas: 3
  image: rabbitmq:3.12-management
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

Update the RabbitMQCluster to load definitions:

```yaml
apiVersion: rabbitmq.com/v1beta1
kind: RabbitMQCluster
metadata:
  name: production-rabbitmq
  namespace: rabbitmq
spec:
  replicas: 3
  image: rabbitmq:3.12-management
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
      management.load_definitions = /etc/rabbitmq/definitions.json
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
        'x-delivery-limit': 5  # Dead letter after 5 delivery attempts
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
}
```

## Configuring Quorum Queue Policies

Apply policies for consistent quorum queue configuration:

```yaml
apiVersion: rabbitmq.com/v1beta1
kind: RabbitMQCluster
metadata:
  name: production-rabbitmq
  namespace: rabbitmq
spec:
  replicas: 3
  rabbitmq:
    additionalConfig: |
      # Set default queue type to quorum
      default_queue_type = quorum
      # Configure delivery limit
      quorum_queue.delivery_limit = 3
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
kind: RabbitMQCluster
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
        # Negative acknowledge - will be redelivered or dead-lettered
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

Deploy RabbitMQ Prometheus exporter:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: rabbitmq-exporter
  namespace: rabbitmq
  labels:
    app: rabbitmq-exporter
spec:
  ports:
  - port: 9419
    name: metrics
  selector:
    app: rabbitmq-exporter
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rabbitmq-exporter
  namespace: rabbitmq
spec:
  replicas: 1
  selector:
    matchLabels:
      app: rabbitmq-exporter
  template:
    metadata:
      labels:
        app: rabbitmq-exporter
    spec:
      containers:
      - name: exporter
        image: kbudde/rabbitmq-exporter:latest
        env:
        - name: RABBIT_URL
          value: http://production-rabbitmq.rabbitmq.svc.cluster.local:15672
        - name: RABBIT_USER
          valueFrom:
            secretKeyRef:
              name: production-rabbitmq-default-user
              key: username
        - name: RABBIT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: production-rabbitmq-default-user
              key: password
        ports:
        - containerPort: 9419
          name: metrics
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
    - alert: QuorumQueueLostQuorum
      expr: |
        rabbitmq_queue_members{queue_type="quorum"} < 2
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Quorum queue lost quorum"
        description: "Queue {{ $labels.queue }} has fewer than 2 members"

    - alert: QuorumQueueHighLength
      expr: |
        rabbitmq_queue_messages{queue_type="quorum"} > 10000
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
