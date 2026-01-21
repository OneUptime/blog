# How to Monitor Kafka with Prometheus and Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Prometheus, Grafana, Monitoring, Observability, JMX, Metrics

Description: A comprehensive guide to monitoring Apache Kafka with Prometheus and Grafana, covering JMX exporter configuration, key metrics, alerting rules, and dashboard creation for production Kafka clusters.

---

Monitoring Kafka is essential for maintaining healthy clusters and detecting issues before they impact applications. This guide covers setting up comprehensive Kafka monitoring using Prometheus for metrics collection and Grafana for visualization.

## Monitoring Architecture

```
Kafka Broker (JMX) -> JMX Exporter -> Prometheus -> Grafana
                                         |
                                   Alertmanager
```

## JMX Exporter Setup

### Download JMX Exporter

```bash
wget https://repo1.maven.org/maven2/io/prometheus/jmx/jmx_prometheus_javaagent/0.19.0/jmx_prometheus_javaagent-0.19.0.jar
```

### Kafka JMX Configuration

Create `kafka-jmx-config.yml`:

```yaml
lowercaseOutputName: true
lowercaseOutputLabelNames: true

rules:
  # Broker metrics
  - pattern: kafka.server<type=(.+), name=(.+), clientId=(.+), topic=(.+), partition=(.*)><>Value
    name: kafka_server_$1_$2
    type: GAUGE
    labels:
      clientId: "$3"
      topic: "$4"
      partition: "$5"

  - pattern: kafka.server<type=(.+), name=(.+), clientId=(.+), brokerHost=(.+), brokerPort=(.+)><>Value
    name: kafka_server_$1_$2
    type: GAUGE
    labels:
      clientId: "$3"
      broker: "$4:$5"

  - pattern: kafka.server<type=(.+), name=(.+)><>Value
    name: kafka_server_$1_$2
    type: GAUGE

  - pattern: kafka.server<type=(.+), name=(.+)><>Count
    name: kafka_server_$1_$2_count
    type: COUNTER

  - pattern: kafka.server<type=(.+), name=(.+)><>MeanRate
    name: kafka_server_$1_$2_meanrate
    type: GAUGE

  - pattern: kafka.server<type=(.+), name=(.+)><>OneMinuteRate
    name: kafka_server_$1_$2_1min_rate
    type: GAUGE

  - pattern: kafka.server<type=(.+), name=(.+)><>FiveMinuteRate
    name: kafka_server_$1_$2_5min_rate
    type: GAUGE

  - pattern: kafka.server<type=(.+), name=(.+)><>FifteenMinuteRate
    name: kafka_server_$1_$2_15min_rate
    type: GAUGE

  # Controller metrics
  - pattern: kafka.controller<type=(.+), name=(.+)><>Value
    name: kafka_controller_$1_$2
    type: GAUGE

  - pattern: kafka.controller<type=(.+), name=(.+)><>Count
    name: kafka_controller_$1_$2_count
    type: COUNTER

  # Network metrics
  - pattern: kafka.network<type=(.+), name=(.+), networkProcessor=(.+)><>Count
    name: kafka_network_$1_$2_count
    type: COUNTER
    labels:
      networkProcessor: "$3"

  - pattern: kafka.network<type=(.+), name=(.+)><>Value
    name: kafka_network_$1_$2
    type: GAUGE

  - pattern: kafka.network<type=(.+), name=(.+)><>Count
    name: kafka_network_$1_$2_count
    type: COUNTER

  # Log metrics
  - pattern: kafka.log<type=(.+), name=(.+), topic=(.+), partition=(.+)><>Value
    name: kafka_log_$1_$2
    type: GAUGE
    labels:
      topic: "$3"
      partition: "$4"

  # Consumer group metrics
  - pattern: kafka.server<type=group-coordinator-metrics, name=(.+)><>Value
    name: kafka_coordinator_$1
    type: GAUGE

  # Producer/Consumer metrics
  - pattern: kafka.producer<type=(.+), name=(.+), clientId=(.+)><>Value
    name: kafka_producer_$1_$2
    type: GAUGE
    labels:
      clientId: "$3"

  - pattern: kafka.consumer<type=(.+), name=(.+), clientId=(.+)><>Value
    name: kafka_consumer_$1_$2
    type: GAUGE
    labels:
      clientId: "$3"

  # JVM metrics
  - pattern: java.lang<type=Memory><HeapMemoryUsage>(\w+)
    name: jvm_memory_heap_$1
    type: GAUGE

  - pattern: java.lang<type=Memory><NonHeapMemoryUsage>(\w+)
    name: jvm_memory_nonheap_$1
    type: GAUGE

  - pattern: java.lang<type=GarbageCollector, name=(.+)><>CollectionCount
    name: jvm_gc_collection_count
    type: COUNTER
    labels:
      gc: "$1"

  - pattern: java.lang<type=GarbageCollector, name=(.+)><>CollectionTime
    name: jvm_gc_collection_time_ms
    type: COUNTER
    labels:
      gc: "$1"
```

### Configure Kafka Broker

Add to `kafka-server-start.sh` or set environment variable:

```bash
export KAFKA_OPTS="-javaagent:/path/to/jmx_prometheus_javaagent-0.19.0.jar=9404:/path/to/kafka-jmx-config.yml"
```

Or in `server.properties`:

```properties
# Enable JMX
JMX_PORT=9999
```

## Docker Compose Setup

```yaml
version: '3.8'

services:
  kafka:
    image: apache/kafka:3.7.0
    container_name: kafka
    ports:
      - "9092:9092"
      - "9404:9404"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_OPTS: "-javaagent:/opt/jmx_exporter/jmx_prometheus_javaagent.jar=9404:/opt/jmx_exporter/kafka-jmx-config.yml"
    volumes:
      - ./jmx_prometheus_javaagent-0.19.0.jar:/opt/jmx_exporter/jmx_prometheus_javaagent.jar
      - ./kafka-jmx-config.yml:/opt/jmx_exporter/kafka-jmx-config.yml
    networks:
      - monitoring

  prometheus:
    image: prom/prometheus:v2.48.0
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./alert-rules.yml:/etc/prometheus/alert-rules.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:10.2.0
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    networks:
      - monitoring

  alertmanager:
    image: prom/alertmanager:v0.26.0
    container_name: alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
    networks:
      - monitoring

volumes:
  prometheus-data:
  grafana-data:

networks:
  monitoring:
    driver: bridge
```

## Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

rule_files:
  - /etc/prometheus/alert-rules.yml

scrape_configs:
  - job_name: 'kafka'
    static_configs:
      - targets:
          - kafka:9404
        labels:
          cluster: 'production'

  - job_name: 'kafka-connect'
    static_configs:
      - targets:
          - kafka-connect:8083

  - job_name: 'kafka-lag-exporter'
    static_configs:
      - targets:
          - kafka-lag-exporter:8000
```

## Key Metrics to Monitor

### Broker Health

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| kafka_server_replicamanager_underreplicatedpartitions | Under-replicated partitions | > 0 |
| kafka_controller_kafkacontroller_activecontrollercount | Active controllers | != 1 |
| kafka_server_replicamanager_offlinereplicacount | Offline replicas | > 0 |
| kafka_server_replicamanager_partitioncount | Total partitions | Monitor trends |

### Throughput

| Metric | Description |
|--------|-------------|
| kafka_server_brokertopicmetrics_messagesin_total | Messages in per second |
| kafka_server_brokertopicmetrics_bytesin_total | Bytes in per second |
| kafka_server_brokertopicmetrics_bytesout_total | Bytes out per second |

### Latency

| Metric | Description |
|--------|-------------|
| kafka_network_requestmetrics_totaltimems | Request total time |
| kafka_network_requestmetrics_requestqueuetimems | Request queue time |
| kafka_network_requestmetrics_remotetimems | Remote time |

### Consumer Lag

| Metric | Description |
|--------|-------------|
| kafka_consumer_fetch_manager_records_lag | Consumer lag |
| kafka_consumer_fetch_manager_records_lag_max | Max consumer lag |

## Alerting Rules

```yaml
# alert-rules.yml
groups:
  - name: kafka-alerts
    rules:
      # Under-replicated partitions
      - alert: KafkaUnderReplicatedPartitions
        expr: kafka_server_replicamanager_underreplicatedpartitions > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Kafka has under-replicated partitions"
          description: "Broker {{ $labels.instance }} has {{ $value }} under-replicated partitions"

      # No active controller
      - alert: KafkaNoActiveController
        expr: sum(kafka_controller_kafkacontroller_activecontrollercount) == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "No active Kafka controller"
          description: "The Kafka cluster has no active controller"

      # Multiple controllers
      - alert: KafkaMultipleControllers
        expr: sum(kafka_controller_kafkacontroller_activecontrollercount) > 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Multiple Kafka controllers detected"
          description: "The Kafka cluster has {{ $value }} active controllers"

      # Offline partitions
      - alert: KafkaOfflinePartitions
        expr: kafka_controller_kafkacontroller_offlinepartitionscount > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Kafka has offline partitions"
          description: "{{ $value }} partitions are offline"

      # High request latency
      - alert: KafkaHighRequestLatency
        expr: kafka_network_requestmetrics_totaltimems{quantile="0.99"} > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High Kafka request latency"
          description: "99th percentile request latency is {{ $value }}ms"

      # Consumer lag
      - alert: KafkaConsumerLagHigh
        expr: kafka_consumer_fetch_manager_records_lag > 10000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High Kafka consumer lag"
          description: "Consumer {{ $labels.client_id }} has lag of {{ $value }}"

      # Broker down
      - alert: KafkaBrokerDown
        expr: up{job="kafka"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Kafka broker is down"
          description: "Broker {{ $labels.instance }} is not responding"

      # ISR shrinking
      - alert: KafkaISRShrinking
        expr: increase(kafka_server_replicamanager_isrshrinks_total[5m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Kafka ISR is shrinking"
          description: "ISR shrinks detected on broker {{ $labels.instance }}"

      # Disk space
      - alert: KafkaLogDirectoryLow
        expr: kafka_log_log_size / kafka_log_log_size_max > 0.8
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Kafka log directory space is low"
          description: "Log directory usage is {{ $value | humanizePercentage }}"
```

## Grafana Dashboards

### Dashboard JSON Example

```json
{
  "dashboard": {
    "title": "Kafka Overview",
    "panels": [
      {
        "title": "Messages In/Out Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(kafka_server_brokertopicmetrics_messagesin_total[5m]))",
            "legendFormat": "Messages In"
          },
          {
            "expr": "sum(rate(kafka_server_brokertopicmetrics_messagesout_total[5m]))",
            "legendFormat": "Messages Out"
          }
        ]
      },
      {
        "title": "Under-Replicated Partitions",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(kafka_server_replicamanager_underreplicatedpartitions)"
          }
        ],
        "thresholds": {
          "mode": "absolute",
          "steps": [
            {"color": "green", "value": null},
            {"color": "red", "value": 1}
          ]
        }
      },
      {
        "title": "Active Controllers",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(kafka_controller_kafkacontroller_activecontrollercount)"
          }
        ]
      },
      {
        "title": "Request Latency (p99)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, sum(rate(kafka_network_requestmetrics_totaltimems_bucket[5m])) by (le, request))",
            "legendFormat": "{{ request }}"
          }
        ]
      },
      {
        "title": "Consumer Lag by Group",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(kafka_consumer_fetch_manager_records_lag) by (client_id)",
            "legendFormat": "{{ client_id }}"
          }
        ]
      }
    ]
  }
}
```

## Kafka Lag Exporter

For detailed consumer lag monitoring, use kafka-lag-exporter:

```yaml
# kafka-lag-exporter deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kafka-lag-exporter
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: kafka-lag-exporter
          image: seglo/kafka-lag-exporter:latest
          ports:
            - containerPort: 8000
          env:
            - name: KAFKA_LAG_EXPORTER_CLUSTERS_0_NAME
              value: "production"
            - name: KAFKA_LAG_EXPORTER_CLUSTERS_0_BOOTSTRAP_BROKERS
              value: "kafka:9092"
```

## Best Practices

### 1. Set Appropriate Scrape Intervals

```yaml
scrape_configs:
  - job_name: 'kafka'
    scrape_interval: 15s  # Balance detail vs overhead
```

### 2. Use Recording Rules

```yaml
groups:
  - name: kafka-recording
    rules:
      - record: kafka:messages_in:rate5m
        expr: sum(rate(kafka_server_brokertopicmetrics_messagesin_total[5m]))

      - record: kafka:bytes_in:rate5m
        expr: sum(rate(kafka_server_brokertopicmetrics_bytesin_total[5m]))
```

### 3. Configure Retention

```bash
# Prometheus retention
--storage.tsdb.retention.time=15d
--storage.tsdb.retention.size=50GB
```

### 4. Alert on Leading Indicators

- ISR changes before under-replication
- Lag growth rate before high lag
- CPU/memory trends before exhaustion

## Conclusion

Effective Kafka monitoring requires:

1. **JMX metrics export** from all brokers
2. **Key metrics tracking**: Under-replicated partitions, lag, throughput
3. **Proactive alerting** on leading indicators
4. **Visual dashboards** for quick assessment
5. **Historical data** for trend analysis

Start with essential metrics, then expand coverage as you understand your cluster's behavior patterns.
