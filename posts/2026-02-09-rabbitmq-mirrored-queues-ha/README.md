# How to Implement RabbitMQ High Availability with Mirrored Queues on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, Kubernetes, High-Availability

Description: Learn how to configure RabbitMQ mirrored queues (classic queue mirroring) for high availability on Kubernetes with automatic failover, partition handling, and production-ready clustering.

---

RabbitMQ high availability through mirrored queues helps messages survive broker failures by replicating queue contents across multiple nodes in a cluster. Running RabbitMQ on Kubernetes with proper mirroring configuration provides automatic failover, data durability for durable queues with persistent messages, and resilience against node failures.

This guide covers implementing RabbitMQ high availability using mirrored queues on Kubernetes for legacy RabbitMQ 3.13 and earlier deployments. Classic queue mirroring was deprecated in 2021 and removed in RabbitMQ 4.0, so use quorum queues or streams for new deployments.

## Understanding RabbitMQ Mirroring

RabbitMQ offers two approaches for high availability:

- Classic mirrored queues (traditional approach)
- Quorum queues (modern Raft-based approach, recommended for new deployments)

Mirrored queues work by designating one node as the leader and others as mirrors. All operations go through the leader, which then synchronizes with mirrors. On leader failure, a synchronized mirror is promoted automatically.

## Deploying RabbitMQ Cluster on Kubernetes

Start with a StatefulSet deployment:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: rabbitmq
  namespace: messaging
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: rabbitmq-peer-discovery
  namespace: messaging
rules:
- apiGroups: [""]
  resources: ["endpoints"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: rabbitmq-peer-discovery
  namespace: messaging
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: rabbitmq-peer-discovery
subjects:
- kind: ServiceAccount
  name: rabbitmq
  namespace: messaging
---
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
  - port: 15692
    name: prometheus
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
        image: rabbitmq:3.13-management
        ports:
        - containerPort: 5672
          name: amqp
        - containerPort: 15672
          name: management
        - containerPort: 15692
          name: prometheus
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
    queue_leader_locator = balanced

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
            "ha-sync-mode": "automatic"
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
          curl -X PUT \
            -u $RABBITMQ_USER:$RABBITMQ_PASS \
            -H "Content-Type: application/json" \
            -d '{"pattern":"^ha\\.","definition":{"ha-mode":"all","ha-sync-mode":"automatic"},"priority":10,"apply-to":"queues"}' \
            http://rabbitmq-0.rabbitmq:15672/api/policies/%2f/ha-all

          curl -X PUT \
            -u $RABBITMQ_USER:$RABBITMQ_PASS \
            -H "Content-Type: application/json" \
            -d '{"pattern":"^ha2\\.","definition":{"ha-mode":"exactly","ha-params":2,"ha-sync-mode":"automatic"},"priority":5,"apply-to":"queues"}' \
            http://rabbitmq-0.rabbitmq:15672/api/policies/%2f/ha-two

          curl -X PUT \
            -u $RABBITMQ_USER:$RABBITMQ_PASS \
            -H "Content-Type: application/json" \
            -d '{"pattern":".*","definition":{"ha-mode":"exactly","ha-params":2,"ha-sync-mode":"automatic"},"priority":0,"apply-to":"queues"}' \
            http://rabbitmq-0.rabbitmq:15672/api/policies/%2f/ha-majority
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
    "context"
    "fmt"
    "log"
    "sync"
    "time"

    amqp "github.com/rabbitmq/amqp091-go"
)

type HAProducer struct {
    urls       []string
    mu         sync.RWMutex
    conn       *amqp.Connection
    channel    *amqp.Channel
    confirms   chan amqp.Confirmation
    reconnect  chan bool
}

func NewHAProducer(urls []string) (*HAProducer, error) {
    producer := &HAProducer{
        urls:      urls,
        reconnect: make(chan bool, 1),
    }
    go producer.handleReconnect()
    if err := producer.connect(); err != nil {
        return nil, err
    }
    return producer, nil
}

func (p *HAProducer) connect() error {
    for _, url := range p.urls {
        conn, err := amqp.Dial(url)
        if err == nil {
            channel, err := conn.Channel()
            if err != nil {
                conn.Close()
                continue
            }

            // Enable publisher confirms
            if err := channel.Confirm(false); err != nil {
                channel.Close()
                conn.Close()
                continue
            }

            p.mu.Lock()
            p.conn = conn
            p.channel = channel
            p.confirms = channel.NotifyPublish(make(chan amqp.Confirmation, 1))
            p.mu.Unlock()

            go func(c *amqp.Connection) {
                <-c.NotifyClose(make(chan *amqp.Error))
                p.reconnect <- true
            }(conn)

            log.Printf("Connected to %s", url)
            return nil
        }
    }
    return fmt.Errorf("failed to connect to any broker")
}

func (p *HAProducer) handleReconnect() {
    for range p.reconnect {
        log.Println("Connection lost, reconnecting...")
        time.Sleep(5 * time.Second)
        if err := p.connect(); err != nil {
            log.Printf("Reconnect failed: %v", err)
        }
    }
}

func (p *HAProducer) Publish(exchange, key string, msg []byte) error {
    p.mu.RLock()
    channel := p.channel
    confirms := p.confirms
    p.mu.RUnlock()

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    err := channel.PublishWithContext(
        ctx,
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
    if err != nil {
        return err
    }

    confirm := <-confirms
    if !confirm.Ack {
        return fmt.Errorf("message was not confirmed by RabbitMQ")
    }
    return nil
}

func main() {
    urls := []string{
        "amqp://admin:password@rabbitmq-0.rabbitmq:5672/",
        "amqp://admin:password@rabbitmq-1.rabbitmq:5672/",
        "amqp://admin:password@rabbitmq-2.rabbitmq:5672/",
    }

    producer, err := NewHAProducer(urls)
    if err != nil {
        log.Fatal(err)
    }
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

Create Prometheus alerts for RabbitMQ availability and queue health. The queue-specific expressions below require scraping RabbitMQ's per-object or detailed Prometheus metrics. Mirror-specific state should be checked with the management API or `rabbitmqctl list_queues`, because RabbitMQ's built-in Prometheus plugin does not expose mirror count or synchronization metrics:

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
    - alert: RabbitMQHAQueueBacklogHigh
      expr: rabbitmq_detailed_queue_messages{queue=~"ha\\..*|ha2\\..*"} > 10000
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "HA queue backlog is high"
        description: "Queue {{ $labels.queue }} has {{ $value }} ready or unacknowledged messages"

    - alert: RabbitMQHAQueueNoConsumers
      expr: rabbitmq_detailed_queue_consumers{queue=~"ha\\..*|ha2\\..*"} == 0
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "HA queue has no consumers"
        description: "Queue {{ $labels.queue }} has no active consumers"

    - alert: RabbitMQManagementMetricsMissing
      expr: absent(rabbitmq_build_info)
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "RabbitMQ metrics are missing"
        description: "Prometheus is not receiving RabbitMQ built-in metrics"

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

Test automatic failover by killing the leader node:

```bash
# Identify leader and mirror nodes for a queue
kubectl exec -it rabbitmq-0 -n messaging -- \
  rabbitmqctl list_queues name policy pid mirror_pids synchronised_mirror_pids

# Kill the leader node
kubectl delete pod rabbitmq-1 -n messaging

# Verify queue is still accessible
kubectl exec -it rabbitmq-0 -n messaging -- \
  rabbitmqctl list_queues name policy pid mirror_pids synchronised_mirror_pids
```

Monitor consumer lag during failover to verify that the queue recovers and consumers resume after leader promotion.

## Best Practices

Follow these practices for RabbitMQ HA:

1. Use an odd number of nodes (3, 5) with a partition strategy such as `pause_minority` when consistency is more important than availability during partitions
2. Set appropriate memory and disk thresholds
3. Choose partition handling deliberately; `autoheal` prioritizes service continuity over consistency
4. Use persistent messages for critical data
5. Enable publisher confirms for reliability
6. Monitor mirror synchronization status
7. Test failover scenarios regularly
8. Consider quorum queues for new deployments
9. Size persistent volumes appropriately
10. Implement proper connection retry logic

## Conclusion

Implementing RabbitMQ high availability with mirrored queues on Kubernetes provides automatic failover and data durability for legacy RabbitMQ 3.13 and earlier message-driven systems. By properly configuring clustering, mirroring policies, and client connection handling, you can build resilient messaging infrastructure that survives node failures.

Key components include StatefulSet deployment with persistent storage, mirroring policies for automatic replication, connection retry logic in clients, monitoring for synchronization and partition issues, and regular failover testing. With proper HA configuration, RabbitMQ clusters on Kubernetes deliver the reliability required for mission-critical messaging workloads.
