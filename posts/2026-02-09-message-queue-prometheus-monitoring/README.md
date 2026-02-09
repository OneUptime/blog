# How to Configure Message Queue Monitoring with Prometheus Exporters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Monitoring, Prometheus, Message-Queue

Description: Learn how to implement comprehensive monitoring for Kafka, RabbitMQ, NATS, and other message queues using Prometheus exporters with alerting and visualization best practices.

---

Monitoring message queues is critical for maintaining reliable data pipelines and event-driven architectures. Prometheus exporters provide standardized metrics collection for various message queue systems, enabling you to track performance, identify bottlenecks, and respond to issues before they impact your applications.

This guide covers implementing production-grade monitoring for multiple message queue technologies using Prometheus exporters.

## Understanding Message Queue Metrics

Key metrics to monitor across all message queue systems include:

- Message throughput (messages per second)
- Queue depth and backlog size
- Consumer lag and processing latency
- Connection and channel counts
- Error rates and failed messages
- Resource utilization (CPU, memory, disk, network)
- Replication lag (for distributed systems)

Different message queue systems expose these metrics in various formats, which is where Prometheus exporters provide value by standardizing the format.

## Monitoring Kafka with JMX Exporter

Kafka exposes metrics through JMX, requiring the JMX exporter to convert them to Prometheus format.

Create a JMX exporter configuration:

```yaml
# kafka-jmx-exporter-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kafka-jmx-config
  namespace: kafka
data:
  jmx-exporter.yml: |
    lowercaseOutputName: true
    lowercaseOutputLabelNames: true
    whitelistObjectNames:
    - kafka.server:type=BrokerTopicMetrics,name=*
    - kafka.server:type=ReplicaManager,name=*
    - kafka.server:type=KafkaRequestHandlerPool,name=*
    - kafka.server:type=ReplicaFetcherManager,name=*
    - kafka.controller:type=KafkaController,name=*
    - kafka.network:type=RequestMetrics,name=*
    - kafka.log:type=LogFlushStats,name=*
    - java.lang:type=Memory
    - java.lang:type=GarbageCollector,name=*
    rules:
    - pattern: kafka.server<type=(.+), name=(.+)><>Value
      name: kafka_server_$1_$2
    - pattern: kafka.controller<type=(.+), name=(.+)><>Value
      name: kafka_controller_$1_$2
```

Deploy Kafka with JMX exporter sidecar:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kafka
  namespace: kafka
spec:
  serviceName: kafka
  replicas: 3
  selector:
    matchLabels:
      app: kafka
  template:
    metadata:
      labels:
        app: kafka
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "5556"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: kafka
        image: confluentinc/cp-kafka:7.5.0
        ports:
        - containerPort: 9092
          name: kafka
        - containerPort: 9999
          name: jmx
        env:
        - name: KAFKA_JMX_PORT
          value: "9999"
        - name: KAFKA_JMX_HOSTNAME
          value: "localhost"
      - name: jmx-exporter
        image: bitnami/jmx-exporter:0.19.0
        ports:
        - containerPort: 5556
          name: metrics
        args:
        - "5556"
        - "/etc/jmx-exporter/jmx-exporter.yml"
        volumeMounts:
        - name: jmx-config
          mountPath: /etc/jmx-exporter
      volumes:
      - name: jmx-config
        configMap:
          name: kafka-jmx-config
```

Create a ServiceMonitor for Prometheus Operator:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kafka-metrics
  namespace: kafka
spec:
  selector:
    matchLabels:
      app: kafka
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

## Monitoring RabbitMQ with Built-in Exporter

RabbitMQ 3.8+ includes a built-in Prometheus plugin. Enable it in the deployment:

```yaml
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
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "15692"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: rabbitmq
        image: rabbitmq:3.12-management
        ports:
        - containerPort: 5672
          name: amqp
        - containerPort: 15672
          name: management
        - containerPort: 15692
          name: prometheus
        env:
        - name: RABBITMQ_PROMETHEUS_PLUGIN
          value: "true"
        volumeMounts:
        - name: config
          mountPath: /etc/rabbitmq
      volumes:
      - name: config
        configMap:
          name: rabbitmq-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: rabbitmq-config
  namespace: messaging
data:
  enabled_plugins: |
    [rabbitmq_management,rabbitmq_prometheus].
  rabbitmq.conf: |
    prometheus.return_per_object_metrics = true
    prometheus.tcp.port = 15692
```

Create ServiceMonitor for RabbitMQ:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rabbitmq-metrics
  namespace: messaging
spec:
  selector:
    matchLabels:
      app: rabbitmq
  endpoints:
  - port: prometheus
    interval: 30s
    path: /metrics
```

## Monitoring NATS with Exporter

Deploy NATS with the Prometheus exporter:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: nats
  namespace: nats
spec:
  serviceName: nats
  replicas: 3
  selector:
    matchLabels:
      app: nats
  template:
    metadata:
      labels:
        app: nats
    spec:
      containers:
      - name: nats
        image: nats:2.10-alpine
        ports:
        - containerPort: 4222
          name: client
        - containerPort: 8222
          name: monitoring
        command:
        - nats-server
        - --config
        - /etc/nats-config/nats.conf
        volumeMounts:
        - name: config
          mountPath: /etc/nats-config
      - name: nats-exporter
        image: natsio/prometheus-nats-exporter:0.14.0
        ports:
        - containerPort: 7777
          name: metrics
        args:
        - -varz
        - -connz
        - -routez
        - -subz
        - -gatewayz
        - http://localhost:8222
      volumes:
      - name: config
        configMap:
          name: nats-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: nats-config
  namespace: nats
data:
  nats.conf: |
    port: 4222
    http_port: 8222
    cluster {
      port: 6222
      routes = [
        nats://nats-0.nats:6222
        nats://nats-1.nats:6222
        nats://nats-2.nats:6222
      ]
    }
```

## Monitoring Redis Streams

Use Redis exporter for monitoring Redis-based message queues:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-exporter
  namespace: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis-exporter
  template:
    metadata:
      labels:
        app: redis-exporter
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9121"
    spec:
      containers:
      - name: redis-exporter
        image: oliver006/redis_exporter:v1.55.0
        ports:
        - containerPort: 9121
          name: metrics
        env:
        - name: REDIS_ADDR
          value: "redis://redis-master:6379"
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-auth
              key: password
        args:
        - --include-system-metrics
        - --check-keys=stream:*
        - --check-streams=orders,events
```

## Creating Comprehensive Dashboards

Import Grafana dashboards for each message queue system. Create a unified dashboard configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mq-dashboard
  namespace: monitoring
data:
  dashboard.json: |
    {
      "dashboard": {
        "title": "Message Queue Overview",
        "panels": [
          {
            "title": "Messages Per Second",
            "targets": [
              {
                "expr": "rate(kafka_server_brokertopicmetrics_messagesinpersec[5m])",
                "legendFormat": "Kafka - {{topic}}"
              },
              {
                "expr": "rate(rabbitmq_queue_messages_published_total[5m])",
                "legendFormat": "RabbitMQ - {{queue}}"
              },
              {
                "expr": "rate(nats_varz_in_msgs[5m])",
                "legendFormat": "NATS"
              }
            ]
          },
          {
            "title": "Consumer Lag",
            "targets": [
              {
                "expr": "kafka_consumergroup_lag",
                "legendFormat": "{{consumergroup}} - {{topic}}"
              }
            ]
          },
          {
            "title": "Queue Depth",
            "targets": [
              {
                "expr": "rabbitmq_queue_messages_ready",
                "legendFormat": "RabbitMQ - {{queue}}"
              },
              {
                "expr": "redis_stream_length",
                "legendFormat": "Redis - {{stream}}"
              }
            ]
          }
        ]
      }
    }
```

## Setting Up Alerting Rules

Create comprehensive alerting rules:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: message-queue-alerts
  namespace: monitoring
spec:
  groups:
  - name: kafka.rules
    interval: 30s
    rules:
    - alert: KafkaConsumerLagHigh
      expr: kafka_consumergroup_lag > 10000
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High consumer lag detected"
        description: "Consumer group {{ $labels.consumergroup }} lag is {{ $value }}"

    - alert: KafkaPartitionOffline
      expr: kafka_controller_offlinepartitionscount > 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Kafka partitions offline"
        description: "{{ $value }} partitions are offline"

  - name: rabbitmq.rules
    interval: 30s
    rules:
    - alert: RabbitMQQueueDepthHigh
      expr: rabbitmq_queue_messages_ready > 10000
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High queue depth in RabbitMQ"
        description: "Queue {{ $labels.queue }} has {{ $value }} messages"

    - alert: RabbitMQConsumerDown
      expr: rabbitmq_queue_consumers == 0
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "No consumers on RabbitMQ queue"
        description: "Queue {{ $labels.queue }} has no consumers"

    - alert: RabbitMQMemoryHigh
      expr: rabbitmq_resident_memory_limit_bytes / rabbitmq_resident_memory_bytes < 0.1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "RabbitMQ memory usage high"

  - name: nats.rules
    interval: 30s
    rules:
    - alert: NATSSlowConsumer
      expr: nats_varz_slow_consumers > 0
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "Slow consumers detected in NATS"
        description: "{{ $value }} slow consumers detected"

    - alert: NATSConnectionsHigh
      expr: nats_varz_connections > 1000
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High number of NATS connections"
```

## Implementing Custom Metrics

For application-specific metrics, instrument your code:

```go
package main

import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    messagesProcessed = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "mq_messages_processed_total",
            Help: "Total messages processed by type",
        },
        []string{"queue", "status"},
    )

    processingDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "mq_message_processing_duration_seconds",
            Help: "Message processing duration in seconds",
            Buckets: prometheus.ExponentialBuckets(0.001, 2, 10),
        },
        []string{"queue"},
    )

    queueBacklog = promauto.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "mq_queue_backlog",
            Help: "Current backlog in the queue",
        },
        []string{"queue"},
    )
)

func processMessage(queue string, msg []byte) error {
    timer := prometheus.NewTimer(processingDuration.WithLabelValues(queue))
    defer timer.ObserveDuration()

    // Process message logic
    err := handleMessage(msg)

    if err != nil {
        messagesProcessed.WithLabelValues(queue, "failed").Inc()
        return err
    }

    messagesProcessed.WithLabelValues(queue, "success").Inc()
    return nil
}
```

## Monitoring Best Practices

Follow these practices for effective message queue monitoring:

1. Set appropriate scrape intervals based on traffic volume
2. Use recording rules for frequently queried metrics
3. Implement multi-level alerting (warning, critical)
4. Monitor both infrastructure and application-level metrics
5. Set up dashboards per team/service
6. Use label-based filtering for multi-tenant environments
7. Implement dead letter queue monitoring
8. Track message age and processing latency
9. Monitor resource utilization trends
10. Set up capacity planning alerts

## Conclusion

Implementing comprehensive monitoring for message queues using Prometheus exporters provides visibility into system health, performance bottlenecks, and potential issues before they impact production. By standardizing metrics collection across different message queue technologies, you can build unified dashboards and alerting rules that work consistently across your infrastructure.

Key components include JMX exporters for Kafka, built-in Prometheus support in RabbitMQ, dedicated exporters for NATS and Redis, comprehensive alerting rules for critical conditions, and custom application metrics for business-level visibility. With proper monitoring in place, you can maintain reliable message-driven architectures at scale.
