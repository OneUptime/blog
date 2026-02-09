# How to Monitor Kafka Broker Metrics (Under-Replicated Partitions, ISR Shrink, Active Controllers) with the JMX Receiver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kafka, JMX Receiver, Broker Metrics

Description: Monitor Kafka broker health metrics including under-replicated partitions, ISR shrink rate, and active controller count using the OpenTelemetry JMX receiver.

Apache Kafka exposes its metrics through JMX (Java Management Extensions). The OpenTelemetry Collector's JMX receiver connects to Kafka brokers via JMX and collects critical health metrics like under-replicated partitions, ISR shrink/expand rates, and active controller count. These metrics are essential for detecting cluster health issues before they impact consumers.

## Enabling JMX on Kafka Brokers

Add JMX configuration to your Kafka broker startup:

```bash
# In kafka-server-start.sh or via environment variable
export KAFKA_JMX_OPTS="-Dcom.sun.management.jmxremote \
  -Dcom.sun.management.jmxremote.port=9999 \
  -Dcom.sun.management.jmxremote.authenticate=false \
  -Dcom.sun.management.jmxremote.ssl=false \
  -Djava.rmi.server.hostname=0.0.0.0"
export JMX_PORT=9999
```

For Docker-based Kafka:

```yaml
# docker-compose.yaml
services:
  kafka:
    image: confluentinc/cp-kafka:latest
    environment:
      KAFKA_JMX_PORT: 9999
      KAFKA_JMX_HOSTNAME: kafka
```

## Collector JMX Receiver Configuration

```yaml
# otel-collector-config.yaml
receivers:
  jmx:
    jar_path: /opt/opentelemetry-jmx-metrics.jar
    endpoint: kafka-broker:9999
    target_system: kafka
    collection_interval: 15s

processors:
  batch:
    timeout: 10s
  resource:
    attributes:
      - key: service.name
        value: kafka
        action: upsert
      - key: service.type
        value: message-broker
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [jmx]
      processors: [resource, batch]
      exporters: [otlp]
```

The `target_system: kafka` tells the JMX receiver to use Kafka-specific metric definitions.

## Critical Kafka Broker Metrics

### Under-Replicated Partitions

```
kafka.broker.under_replicated_partitions
JMX: kafka.server:type=ReplicaManager,name=UnderReplicatedPartitions
```

This is the single most important Kafka metric. A value above 0 means some partitions do not have enough replicas in sync. Causes include:
- A broker is down or slow
- Disk I/O saturation on a broker
- Network issues between brokers

### ISR Shrink and Expand Rate

```
kafka.broker.isr_shrinks_per_sec
JMX: kafka.server:type=ReplicaManager,name=IsrShrinksPerSec

kafka.broker.isr_expands_per_sec
JMX: kafka.server:type=ReplicaManager,name=IsrExpandsPerSec
```

ISR (In-Sync Replica) shrinks indicate replicas falling behind. Frequent shrinks followed by expands suggest intermittent network or disk issues.

### Active Controller Count

```
kafka.broker.active_controller_count
JMX: kafka.controller:type=KafkaController,name=ActiveControllerCount
```

Exactly one broker should be the active controller. If no broker reports `ActiveControllerCount = 1`, the cluster has no leader. If multiple brokers report it, there is a split-brain situation.

### Request Handler Idle Ratio

```
kafka.broker.request_handler_avg_idle_percent
JMX: kafka.server:type=KafkaRequestHandlerPool,name=RequestHandlerAvgIdlePercent
```

This shows what percentage of time the request handler threads are idle. Below 20% means the broker is overloaded.

### Log Flush Rate and Time

```
kafka.broker.log_flush_rate_and_time
JMX: kafka.log:type=LogFlushStats,name=LogFlushRateAndTimeMs
```

Slow log flushes indicate disk I/O problems.

## Custom JMX Metric Definitions

For metrics not covered by the default Kafka target system, define custom metrics:

```yaml
receivers:
  jmx:
    jar_path: /opt/opentelemetry-jmx-metrics.jar
    endpoint: kafka-broker:9999
    target_system: kafka
    collection_interval: 15s
    # Additional custom metrics
    additional_jars: []
    resource_attributes:
      broker.id: "1"
```

## Monitoring Multiple Brokers

For a multi-broker cluster, use multiple JMX receiver instances:

```yaml
receivers:
  jmx/broker-1:
    jar_path: /opt/opentelemetry-jmx-metrics.jar
    endpoint: kafka-1:9999
    target_system: kafka
    collection_interval: 15s
    resource_attributes:
      broker.id: "1"

  jmx/broker-2:
    jar_path: /opt/opentelemetry-jmx-metrics.jar
    endpoint: kafka-2:9999
    target_system: kafka
    collection_interval: 15s
    resource_attributes:
      broker.id: "2"

  jmx/broker-3:
    jar_path: /opt/opentelemetry-jmx-metrics.jar
    endpoint: kafka-3:9999
    target_system: kafka
    collection_interval: 15s
    resource_attributes:
      broker.id: "3"

service:
  pipelines:
    metrics:
      receivers: [jmx/broker-1, jmx/broker-2, jmx/broker-3]
      processors: [resource, batch]
      exporters: [otlp]
```

## Alert Conditions

```yaml
# Under-replicated partitions
- alert: KafkaUnderReplicatedPartitions
  condition: kafka.broker.under_replicated_partitions > 0
  for: 5m
  severity: critical
  message: "Broker {{ broker.id }} has {{ value }} under-replicated partitions"

# No active controller
- alert: KafkaNoActiveController
  condition: sum(kafka.broker.active_controller_count) == 0
  for: 1m
  severity: critical
  message: "No active Kafka controller. Cluster cannot elect partition leaders."

# Request handler overloaded
- alert: KafkaBrokerOverloaded
  condition: kafka.broker.request_handler_avg_idle_percent < 0.2
  for: 5m
  severity: warning
  message: "Broker {{ broker.id }} request handlers are {{ value }}% idle"

# Frequent ISR shrinks
- alert: KafkaISRShrinks
  condition: rate(kafka.broker.isr_shrinks_per_sec[5m]) > 1
  for: 10m
  severity: warning
```

## Summary

Kafka broker health depends on partition replication, controller election, and request handling capacity. The OpenTelemetry JMX receiver connects to Kafka brokers and collects these metrics without modifying broker configuration (beyond enabling JMX). Focus on under-replicated partitions as the primary health indicator, monitor ISR shrink/expand rates for replication stability, and track request handler idle percentage to detect overloaded brokers. Set up alerts on each metric to catch issues before they impact consumers.
