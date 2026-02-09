# How to Deploy RabbitMQ Quorum Queues on Kubernetes for Message Durability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RabbitMQ, Message Queues

Description: Configure RabbitMQ with quorum queues on Kubernetes to achieve high availability and message durability using the Raft consensus algorithm for distributed messaging.

---

RabbitMQ quorum queues provide stronger durability and consistency guarantees than classic mirrored queues. Built on the Raft consensus algorithm, quorum queues ensure messages are replicated across multiple nodes before acknowledging receipt. When deployed on Kubernetes, quorum queues combine RabbitMQ's reliable messaging with container orchestration benefits. This guide shows you how to deploy and configure RabbitMQ with quorum queues for production workloads.

## Understanding Quorum Queues

Quorum queues differ from classic RabbitMQ queues in important ways. They use Raft consensus for replication instead of primary-mirror approaches. This means messages must be written to a majority of replicas before being acknowledged to publishers. If you have three replicas, two must confirm before the message is considered delivered.

This approach prevents message loss during network partitions and node failures. Classic mirrored queues can lose messages when partitions occur, but quorum queues maintain consistency through Raft's leader election and log replication.

The tradeoff is slightly higher latency for publish operations since the cluster must achieve consensus. For most applications, this small overhead is worthwhile for the durability guarantees.

## Deploying RabbitMQ on Kubernetes

Start by installing the RabbitMQ cluster operator:

```bash
# Install RabbitMQ operator
kubectl apply -f https://github.com/rabbitmq/cluster-operator/releases/latest/download/cluster-operator.yml

# Verify operator is running
kubectl get pods -n rabbitmq-system
```

Create a three-node RabbitMQ cluster:

```yaml
# rabbitmq-cluster.yaml
apiVersion: rabbitmq.com/v1beta1
kind: RabbitmqCluster
metadata:
  name: rabbitmq
  namespace: messaging
spec:
  replicas: 3

  # Resource configuration
  resources:
    requests:
      cpu: 1
      memory: 2Gi
    limits:
      cpu: 2
      memory: 4Gi

  # Persistent storage
  persistence:
    storageClassName: fast-ssd
    storage: 20Gi

  # RabbitMQ configuration
  rabbitmq:
    additionalConfig: |
      # Quorum queue defaults
      default_queue_type = quorum

      # Raft settings
      raft.wal_max_size_bytes = 512000000
      raft.snapshot_interval = 4096

      # Memory settings
      vm_memory_high_watermark.relative = 0.6
      vm_memory_high_watermark_paging_ratio = 0.75

      # Disk space monitoring
      disk_free_limit.absolute = 2GB

    additionalPlugins:
      - rabbitmq_management
      - rabbitmq_prometheus
      - rabbitmq_federation

  # Service configuration
  service:
    type: LoadBalancer
    annotations:
      service.beta.kubernetes.io/aws-load-balancer-type: nlb

  # Pod anti-affinity for high availability
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchExpressions:
              - key: app.kubernetes.io/name
                operator: In
                values:
                  - rabbitmq
          topologyKey: kubernetes.io/hostname

  # Override settings
  override:
    statefulSet:
      spec:
        template:
          spec:
            containers:
              - name: rabbitmq
                env:
                  - name: RABBITMQ_SERVER_ADDITIONAL_ERL_ARGS
                    value: "+S 2:2 +sbwt none +sbwtdcpu none +sbwtdio none"
```

Deploy the cluster:

```bash
kubectl create namespace messaging
kubectl apply -f rabbitmq-cluster.yaml

# Wait for cluster to be ready
kubectl get rabbitmqcluster -n messaging -w
```

## Configuring Quorum Queues

Access the management UI to configure queues:

```bash
# Get admin credentials
kubectl get secret rabbitmq-default-user -n messaging \
  -o jsonpath='{.data.username}' | base64 -d && echo

kubectl get secret rabbitmq-default-user -n messaging \
  -o jsonpath='{.data.password}' | base64 -d && echo

# Port forward to management UI
kubectl port-forward svc/rabbitmq 15672:15672 -n messaging
```

Create a quorum queue via the management API:

```bash
# Create quorum queue
curl -u admin:password -X PUT \
  http://localhost:15672/api/queues/%2F/events.quorum \
  -H "Content-Type: application/json" \
  -d '{
    "durable": true,
    "arguments": {
      "x-queue-type": "quorum",
      "x-quorum-initial-group-size": 3,
      "x-delivery-limit": 5,
      "x-max-length": 1000000,
      "x-max-length-bytes": 1073741824
    }
  }'
```

Define queue policies for automatic quorum queue configuration:

```bash
# Set policy for all queues matching pattern
curl -u admin:password -X PUT \
  http://localhost:15672/api/policies/%2F/quorum-policy \
  -H "Content-Type: application/json" \
  -d '{
    "pattern": "^quorum\.",
    "definition": {
      "queue-type": "quorum",
      "delivery-limit": 5,
      "max-length": 1000000,
      "overflow": "reject-publish"
    },
    "priority": 1,
    "apply-to": "queues"
  }'
```

## Implementing Producer Code

Publish messages with proper confirmation handling:

```python
# publisher.py
import pika
import json
import time

# Connection parameters
credentials = pika.PlainCredentials('admin', 'password')
parameters = pika.ConnectionParameters(
    host='localhost',
    port=5672,
    credentials=credentials,
    connection_attempts=3,
    retry_delay=2
)

# Connect to RabbitMQ
connection = pika.BlockingConnection(parameters)
channel = connection.channel()

# Enable publisher confirms
channel.confirm_delivery()

# Declare quorum queue
channel.queue_declare(
    queue='events.quorum',
    durable=True,
    arguments={
        'x-queue-type': 'quorum',
        'x-quorum-initial-group-size': 3
    }
)

def publish_message(message):
    """Publish message with confirmation"""
    try:
        # Publish with mandatory flag
        channel.basic_publish(
            exchange='',
            routing_key='events.quorum',
            body=json.dumps(message),
            properties=pika.BasicProperties(
                delivery_mode=2,  # Persistent message
                content_type='application/json'
            ),
            mandatory=True
        )
        print(f"Message published and confirmed: {message['id']}")
        return True
    except pika.exceptions.UnroutableError:
        print(f"Message was returned (no queue bound): {message['id']}")
        return False
    except Exception as e:
        print(f"Error publishing message: {e}")
        return False

# Publish messages
for i in range(100):
    message = {
        'id': i,
        'timestamp': time.time(),
        'data': f'Event {i}'
    }
    publish_message(message)
    time.sleep(0.1)

connection.close()
```

## Implementing Consumer Code

Consume messages with proper acknowledgment:

```python
# consumer.py
import pika
import json
import time

credentials = pika.PlainCredentials('admin', 'password')
parameters = pika.ConnectionParameters(
    host='localhost',
    port=5672,
    credentials=credentials
)

connection = pika.BlockingConnection(parameters)
channel = connection.channel()

# Set prefetch count for load distribution
channel.basic_qos(prefetch_count=10)

def callback(ch, method, properties, body):
    """Process message"""
    try:
        message = json.loads(body)
        print(f"Processing message: {message['id']}")

        # Simulate processing
        time.sleep(0.5)

        # Acknowledge message after successful processing
        ch.basic_ack(delivery_tag=method.delivery_tag)
        print(f"Message acknowledged: {message['id']}")

    except Exception as e:
        print(f"Error processing message: {e}")
        # Negative acknowledge with requeue
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

# Start consuming
channel.basic_consume(
    queue='events.quorum',
    on_message_callback=callback,
    auto_ack=False  # Manual acknowledgment
)

print("Waiting for messages. Press CTRL+C to exit.")
try:
    channel.start_consuming()
except KeyboardInterrupt:
    channel.stop_consuming()

connection.close()
```

## Configuring Dead Letter Exchanges

Handle poison messages using dead letter exchanges:

```bash
# Create dead letter exchange and queue
curl -u admin:password -X PUT \
  http://localhost:15672/api/exchanges/%2F/dlx \
  -H "Content-Type: application/json" \
  -d '{"type": "direct", "durable": true}'

curl -u admin:password -X PUT \
  http://localhost:15672/api/queues/%2F/events.dlq \
  -H "Content-Type: application/json" \
  -d '{
    "durable": true,
    "arguments": {
      "x-queue-type": "quorum"
    }
  }'

curl -u admin:password -X POST \
  http://localhost:15672/api/bindings/%2F/e/dlx/q/events.dlq \
  -H "Content-Type: application/json" \
  -d '{"routing_key": "events.quorum"}'

# Update main queue with DLX
curl -u admin:password -X PUT \
  http://localhost:15672/api/queues/%2F/events.quorum \
  -H "Content-Type: application/json" \
  -d '{
    "durable": true,
    "arguments": {
      "x-queue-type": "quorum",
      "x-delivery-limit": 5,
      "x-dead-letter-exchange": "dlx",
      "x-dead-letter-routing-key": "events.quorum"
    }
  }'
```

After five delivery attempts, messages move to the dead letter queue automatically.

## Monitoring Quorum Queue Health

Check queue status via the API:

```bash
# Get queue details
curl -u admin:password \
  http://localhost:15672/api/queues/%2F/events.quorum | jq

# Check Raft member status
curl -u admin:password \
  http://localhost:15672/api/queues/%2F/events.quorum | \
  jq '.leader, .members'
```

Deploy Prometheus monitoring:

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rabbitmq
  namespace: messaging
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: rabbitmq
  endpoints:
  - port: prometheus
    interval: 30s
```

Key metrics to monitor:

- `rabbitmq_queue_messages_ready` - Messages waiting for delivery
- `rabbitmq_queue_messages_unacked` - Messages delivered but not acknowledged
- `rabbitmq_quorum_queue_disk_writes_total` - Raft write operations
- `rabbitmq_quorum_queue_members` - Replica count
- `rabbitmq_queue_consumer_utilisation` - Consumer efficiency

## Scaling Consumers

Deploy consumer applications as Kubernetes deployments:

```yaml
# consumer-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: event-consumer
  namespace: messaging
spec:
  replicas: 5
  selector:
    matchLabels:
      app: event-consumer
  template:
    metadata:
      labels:
        app: event-consumer
    spec:
      containers:
      - name: consumer
        image: your-registry/event-consumer:latest
        env:
        - name: RABBITMQ_HOST
          value: rabbitmq.messaging.svc.cluster.local
        - name: RABBITMQ_USER
          valueFrom:
            secretKeyRef:
              name: rabbitmq-default-user
              key: username
        - name: RABBITMQ_PASSWORD
          valueFrom:
            secretKeyRef:
              name: rabbitmq-default-user
              key: password
        - name: QUEUE_NAME
          value: events.quorum
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1
            memory: 1Gi
```

Scale consumers based on queue depth:

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: event-consumer-hpa
  namespace: messaging
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: event-consumer
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: External
    external:
      metric:
        name: rabbitmq_queue_messages_ready
        selector:
          matchLabels:
            queue: events.quorum
      target:
        type: AverageValue
        averageValue: "100"
```

## Handling Node Failures

Quorum queues automatically handle node failures. When a RabbitMQ node fails, Raft elects a new leader from the remaining replicas. Messages continue to be processed with no data loss.

Test failure handling:

```bash
# Delete a pod to simulate failure
kubectl delete pod rabbitmq-server-1 -n messaging

# Watch recovery
kubectl get pods -n messaging -w

# Check queue status
curl -u admin:password \
  http://localhost:15672/api/queues/%2F/events.quorum | \
  jq '.state, .leader, .members'
```

The operator automatically recreates the deleted pod and rejoins it to the cluster.

## Conclusion

RabbitMQ quorum queues on Kubernetes provide enterprise-grade message durability through Raft consensus. By properly configuring replication, implementing publisher confirms and consumer acknowledgments, and monitoring queue health, you build a resilient messaging system that survives node failures without losing messages. The combination of quorum queues for durability and Kubernetes for orchestration creates a reliable foundation for distributed applications that require guaranteed message delivery and high availability.
