# How to Implement RabbitMQ High Availability with Mirrored Queues on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, Kubernetes, High-Availability

Description: Learn how to configure RabbitMQ mirrored queues (classic queue mirroring) for high availability on Kubernetes with automatic failover, partition handling, and production-ready clustering.

---

RabbitMQ high availability through mirrored queues ensures messages survive broker failures by replicating queue contents across multiple nodes in a cluster. Running RabbitMQ on Kubernetes with proper mirroring configuration provides automatic failover, data durability, and resilience against node failures.

This guide covers implementing production-grade RabbitMQ high availability using mirrored queues on Kubernetes.

## Understanding RabbitMQ Mirroring

RabbitMQ offers two approaches for high availability:

- Classic mirrored queues (traditional approach)
- Quorum queues (modern Raft-based approach, recommended for new deployments)

Mirrored queues work by designating one node as the master and others as mirrors. All operations go through the master, which then synchronizes with mirrors. On master failure, a mirror is promoted automatically.

## Deploying RabbitMQ Cluster on Kubernetes

Start with a StatefulSet deployment:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: rabbitmq
  namespace: messaging
spec:
  clusterIP: None
  ports:
  - port: 5672
    name: amqp
  - port: 15672
    name: management
  - port: 4369
    name: epmd
  - port: 25672
    name: clustering
  selector:
    app: rabbitmq
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: rabbitmq
  namespace: messaging
spec:
  serviceName: rabbitmq
  replicas: 3
  selector:
    matchLabels:
      app: rabbitmq
  template:
    metadata:
      labels:
        app: rabbitmq
    spec:
      serviceAccountName: rabbitmq
      terminationGracePeriodSeconds: 30
      initContainers:
      - name: setup-config
        image: busybox:1.35
        command:
        - sh
        - -c
        - |
          cp /config/rabbitmq.conf /etc/rabbitmq/rabbitmq.conf
          cp /config/enabled_plugins /etc/rabbitmq/enabled_plugins
        volumeMounts:
        - name: config
          mountPath: /config
        - name: config-volume
          mountPath: /etc/rabbitmq
      containers:
      - name: rabbitmq
        image: rabbitmq:3.12-management
        ports:
        - containerPort: 5672
          name: amqp
        - containerPort: 15672
          name: management
        - containerPort: 4369
          name: epmd
        - containerPort: 25672
          name: clustering
        env:
        - name: RABBITMQ_DEFAULT_USER
          valueFrom:
            secretKeyRef:
              name: rabbitmq-secret
              key: username
        - name: RABBITMQ_DEFAULT_PASS
          valueFrom:
            secretKeyRef:
              name: rabbitmq-secret
              key: password
        - name: RABBITMQ_ERLANG_COOKIE
          valueFrom:
            secretKeyRef:
              name: rabbitmq-secret
              key: erlang-cookie
        - name: MY_POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: MY_POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: RABBITMQ_USE_LONGNAME
          value: "true"
        - name: RABBITMQ_NODENAME
          value: rabbit@$(MY_POD_NAME).rabbitmq.$(MY_POD_NAMESPACE).svc.cluster.local
        - name: K8S_SERVICE_NAME
          value: rabbitmq
        volumeMounts:
        - name: config-volume
          mountPath: /etc/rabbitmq
        - name: data
          mountPath: /var/lib/rabbitmq
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "3Gi"
            cpu: "2000m"
        livenessProbe:
          exec:
            command:
            - rabbitmq-diagnostics
            - ping
          initialDelaySeconds: 60
          periodSeconds: 30
          timeoutSeconds: 10
        readinessProbe:
          exec:
            command:
            - rabbitmq-diagnostics
            - check_running
          initialDelaySeconds: 20
          periodSeconds: 10
          timeoutSeconds: 5
      volumes:
      - name: config
        configMap:
          name: rabbitmq-config
      - name: config-volume
        emptyDir: {}
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 50Gi
```

## Configuring Mirrored Queues

Create RabbitMQ configuration with mirroring policies:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rabbitmq-config
  namespace: messaging
data:
  enabled_plugins: |
    [rabbitmq_management,rabbitmq_peer_discovery_k8s,rabbitmq_prometheus].

  rabbitmq.conf: |
    # Clustering
    cluster_formation.peer_discovery_backend = k8s
    cluster_formation.k8s.host = kubernetes.default.svc.cluster.local
    cluster_formation.k8s.address_type = hostname
    cluster_formation.k8s.hostname_suffix = .rabbitmq.messaging.svc.cluster.local
    cluster_formation.k8s.service_name = rabbitmq

    # Network settings
    cluster_partition_handling = autoheal
    tcp_listen_options.backlog = 4096
    tcp_listen_options.nodelay = true

    # Memory and disk thresholds
    vm_memory_high_watermark.relative = 0.6
    disk_free_limit.absolute = 2GB

    # High availability defaults
    queue_master_locator = min-masters

    # Prometheus monitoring
    prometheus.tcp.port = 15692
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: rabbitmq-policies
  namespace: messaging
data:
  policies.json: |
    {
      "policies": [
        {
          "name": "ha-all",
          "pattern": "^ha\\.",
          "definition": {
            "ha-mode": "all",
            "ha-sync-mode": "automatic",
            "ha-promote-on-shutdown": "always",
            "ha-promote-on-failure": "always"
          },
          "priority": 10,
          "apply-to": "queues"
        },
        {
          "name": "ha-two",
          "pattern": "^ha2\\.",
          "definition": {
            "ha-mode": "exactly",
            "ha-params": 2,
            "ha-sync-mode": "automatic"
          },
          "priority": 5,
          "apply-to": "queues"
        },
        {
          "name": "ha-majority",
          "pattern": ".*",
          "definition": {
            "ha-mode": "exactly",
            "ha-params": 2,
            "ha-sync-mode": "automatic"
          },
          "priority": 0,
          "apply-to": "queues"
        }
      ]
    }
```

Apply policies using a job:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: apply-rabbitmq-policies
  namespace: messaging
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: apply-policies
        image: curlimages/curl:8.4.0
        command:
        - sh
        - -c
        - |
          until curl -f http://rabbitmq-0.rabbitmq:15672/api/overview \
            -u $RABBITMQ_USER:$RABBITMQ_PASS; do
            echo "Waiting for RabbitMQ..."
            sleep 5
          done

          # Apply each policy
          for policy in $(cat /policies/policies.json | jq -r '.policies[] | @json'); do
            name=$(echo $policy | jq -r '.name')
            pattern=$(echo $policy | jq -r '.pattern')
            definition=$(echo $policy | jq -r '.definition')
            priority=$(echo $policy | jq -r '.priority')
            apply_to=$(echo $policy | jq -r '."apply-to"')

            curl -X PUT \
              -u $RABBITMQ_USER:$RABBITMQ_PASS \
              -H "Content-Type: application/json" \
              -d "{\"pattern\":\"$pattern\",\"definition\":$definition,\"priority\":$priority,\"apply-to\":\"$apply_to\"}" \
              http://rabbitmq:15672/api/policies/%2f/$name
          done
        env:
        - name: RABBITMQ_USER
          valueFrom:
            secretKeyRef:
              name: rabbitmq-secret
              key: username
        - name: RABBITMQ_PASS
          valueFrom:
            secretKeyRef:
              name: rabbitmq-secret
              key: password
        volumeMounts:
        - name: policies
          mountPath: /policies
      volumes:
      - name: policies
        configMap:
          name: rabbitmq-policies
```

## Creating Highly Available Queues

Declare queues with mirroring enabled:

```python
import pika
import json

# Connection parameters
credentials = pika.PlainCredentials('admin', 'password')
parameters = pika.ConnectionParameters(
    host='rabbitmq.messaging.svc.cluster.local',
    port=5672,
    credentials=credentials,
    connection_attempts=5,
    retry_delay=5
)

connection = pika.BlockingConnection(parameters)
channel = connection.channel()

# Declare mirrored queue (matches ha. pattern)
channel.queue_declare(
    queue='ha.orders',
    durable=True,
    arguments={
        'x-queue-type': 'classic'  # Use classic queue for mirroring
    }
)

# Declare exchange
channel.exchange_declare(
    exchange='orders-exchange',
    exchange_type='topic',
    durable=True
)

# Bind queue to exchange
channel.queue_bind(
    queue='ha.orders',
    exchange='orders-exchange',
    routing_key='orders.#'
)

print("Mirrored queue created successfully")
connection.close()
```

## Implementing Producer with HA Support

Create a producer with connection failover:

```go
package main

import (
    "fmt"
    "log"
    "time"
    "github.com/streadway/amqp"
)

type HAProducer struct {
    urls       []string
    conn       *amqp.Connection
    channel    *amqp.Channel
    reconnect  chan bool
}

func NewHAProducer(urls []string) *HAProducer {
    producer := &HAProducer{
        urls:      urls,
        reconnect: make(chan bool),
    }
    go producer.handleReconnect()
    producer.connect()
    return producer
}

func (p *HAProducer) connect() error {
    for _, url := range p.urls {
        conn, err := amqp.Dial(url)
        if err == nil {
            p.conn = conn
            p.channel, err = conn.Channel()
            if err == nil {
                // Enable publisher confirms
                p.channel.Confirm(false)

                go func() {
                    <-p.conn.NotifyClose(make(chan *amqp.Error))
                    p.reconnect <- true
                }()

                log.Printf("Connected to %s", url)
                return nil
            }
        }
    }
    return fmt.Errorf("failed to connect to any broker")
}

func (p *HAProducer) handleReconnect() {
    for range p.reconnect {
        log.Println("Connection lost, reconnecting...")
        time.Sleep(5 * time.Second)
        p.connect()
    }
}

func (p *HAProducer) Publish(exchange, key string, msg []byte) error {
    return p.channel.Publish(
        exchange,
        key,
        true,  // mandatory
        false, // immediate
        amqp.Publishing{
            DeliveryMode: amqp.Persistent,
            ContentType:  "application/json",
            Body:         msg,
        },
    )
}

func main() {
    urls := []string{
        "amqp://admin:password@rabbitmq-0.rabbitmq:5672/",
        "amqp://admin:password@rabbitmq-1.rabbitmq:5672/",
        "amqp://admin:password@rabbitmq-2.rabbitmq:5672/",
    }

    producer := NewHAProducer(urls)
    defer producer.conn.Close()

    // Publish messages
    for i := 0; i < 1000; i++ {
        msg := fmt.Sprintf(`{"id":%d,"data":"message %d"}`, i, i)
        err := producer.Publish("orders-exchange", "orders.new", []byte(msg))
        if err != nil {
            log.Printf("Failed to publish: %v", err)
        }
        time.Sleep(100 * time.Millisecond)
    }
}
```

## Implementing Consumer with HA Support

Create a consumer that handles node failures:

```go
func (c *HAConsumer) Consume() {
    msgs, err := c.channel.Consume(
        "ha.orders",
        "",
        false, // auto-ack disabled
        false,
        false,
        false,
        nil,
    )
    if err != nil {
        log.Fatal(err)
    }

    for msg := range msgs {
        err := processMessage(msg.Body)
        if err != nil {
            // Negative acknowledge, requeue for retry
            msg.Nack(false, true)
        } else {
            // Acknowledge successful processing
            msg.Ack(false)
        }
    }
}
```

## Monitoring Mirrored Queues

Create Prometheus alerts for HA monitoring:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: rabbitmq-ha-alerts
  namespace: messaging
spec:
  groups:
  - name: rabbitmq-ha.rules
    interval: 30s
    rules:
    - alert: RabbitMQQueueNotMirrored
      expr: rabbitmq_queue_mirrors < 2
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Queue not properly mirrored"
        description: "Queue {{ $labels.queue }} has only {{ $value }} mirrors"

    - alert: RabbitMQMirrorNotSynced
      expr: rabbitmq_queue_mirror_sync_messages_pending > 10000
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Mirror synchronization lagging"
        description: "{{ $value }} messages pending sync on {{ $labels.queue }}"

    - alert: RabbitMQClusterPartition
      expr: rabbitmq_partitions > 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Cluster partition detected"
        description: "RabbitMQ cluster is partitioned"

    - alert: RabbitMQNodeDown
      expr: up{job="rabbitmq"} == 0
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "RabbitMQ node down"
        description: "Node {{ $labels.instance }} is down"
```

## Testing Failover

Test automatic failover by killing the master node:

```bash
# Identify master node for a queue
kubectl exec -it rabbitmq-0 -n messaging -- \
  rabbitmqctl list_queues name pid slave_pids

# Kill the master node
kubectl delete pod rabbitmq-1 -n messaging

# Verify queue is still accessible
kubectl exec -it rabbitmq-0 -n messaging -- \
  rabbitmqctl list_queues name pid slave_pids
```

Monitor consumer lag during failover to verify seamless transition.

## Best Practices

Follow these practices for RabbitMQ HA:

1. Use odd number of nodes (3, 5) to avoid split-brain
2. Set appropriate memory and disk thresholds
3. Configure autoheal for partition handling
4. Use persistent messages for critical data
5. Enable publisher confirms for reliability
6. Monitor mirror synchronization status
7. Test failover scenarios regularly
8. Consider quorum queues for new deployments
9. Size persistent volumes appropriately
10. Implement proper connection retry logic

## Conclusion

Implementing RabbitMQ high availability with mirrored queues on Kubernetes provides automatic failover and data durability for message-driven systems. By properly configuring clustering, mirroring policies, and client connection handling, you can build resilient messaging infrastructure that survives node failures transparently.

Key components include StatefulSet deployment with persistent storage, mirroring policies for automatic replication, connection retry logic in clients, monitoring for synchronization and partition issues, and regular failover testing. With proper HA configuration, RabbitMQ clusters on Kubernetes deliver the reliability required for mission-critical messaging workloads.
