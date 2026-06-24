# How to Monitor Message Queues in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Message Queue, Monitoring, Prometheus, Grafana

Description: Set up comprehensive monitoring for RabbitMQ, Kafka, and other message queues in Rancher using Prometheus and Grafana dashboards.

## Introduction

Monitoring message queues is critical for ensuring message delivery, detecting backlogs, and preventing consumer lag from causing service degradation. This guide covers setting up Prometheus metrics collection and Grafana dashboards for RabbitMQ and Apache Kafka in Rancher-managed clusters.

## Prerequisites

- Rancher Monitoring (Prometheus/Grafana) stack installed
- RabbitMQ Cluster Operator and Strimzi installed if you use the custom resources below
- Message queue deployments with metrics endpoints
- kubectl access

## Step 1: Enable Metrics for RabbitMQ

```yaml
# rabbitmq-with-metrics.yaml - RabbitMQ monitored by the built-in Prometheus plugin

apiVersion: rabbitmq.com/v1beta1
kind: RabbitmqCluster
metadata:
  name: rabbitmq-monitored
  namespace: messaging
spec:
  replicas: 3
```

```yaml
# rabbitmq-servicemonitor.yaml - ServiceMonitor for RabbitMQ
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rabbitmq-metrics
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  namespaceSelector:
    matchNames:
      - messaging
  selector:
    matchLabels:
      app.kubernetes.io/component: rabbitmq
  endpoints:
    - port: prometheus
      interval: 30s
      path: /metrics
    - port: prometheus
      interval: 30s
      path: /metrics/detailed
      params:
        family:
          - queue_coarse_metrics
          - queue_metrics
```

## Step 2: Enable Metrics for Kafka (Strimzi)

```yaml
# kafka-with-metrics.yaml - KRaft-based Kafka cluster with JMX metrics
apiVersion: kafka.strimzi.io/v1
kind: KafkaNodePool
metadata:
  name: dual-role
  namespace: kafka
  labels:
    strimzi.io/cluster: kafka-monitored
spec:
  replicas: 3
  roles:
    - controller
    - broker
  storage:
    type: jbod
    volumes:
      - id: 0
        type: ephemeral
        kraftMetadata: shared
---
apiVersion: kafka.strimzi.io/v1
kind: Kafka
metadata:
  name: kafka-monitored
  namespace: kafka
spec:
  kafka:
    listeners:
      - name: plain
        port: 9092
        type: internal
        tls: false
      - name: tls
        port: 9093
        type: internal
        tls: true
    config:
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
    metricsConfig:
      type: jmxPrometheusExporter
      valueFrom:
        configMapKeyRef:
          name: kafka-jmx-config
          key: kafka-metrics-config.yml
  entityOperator:
    topicOperator: {}
    userOperator: {}
  kafkaExporter:
    topicRegex: ".*"
    groupRegex: ".*"
    showAllOffsets: true
---
# kafka-jmx-config.yaml - JMX metrics configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: kafka-jmx-config
  namespace: kafka
data:
  kafka-metrics-config.yml: |
    # See https://github.com/prometheus/jmx_exporter for more info about JMX Prometheus Exporter metrics
    lowercaseOutputName: true
    rules:
    # Special cases and very specific rules
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
    - pattern: kafka.server<type=(.+), cipher=(.+), protocol=(.+), listener=(.+), networkProcessor=(.+)><>connections
      name: kafka_server_$1_connections_tls_info
      type: GAUGE
      labels:
        cipher: "$2"
        protocol: "$3"
        listener: "$4"
        networkProcessor: "$5"
    - pattern: kafka.server<type=(.+), clientSoftwareName=(.+), clientSoftwareVersion=(.+), listener=(.+), networkProcessor=(.+)><>connections
      name: kafka_server_$1_connections_software
      type: GAUGE
      labels:
        clientSoftwareName: "$2"
        clientSoftwareVersion: "$3"
        listener: "$4"
        networkProcessor: "$5"
    - pattern: "kafka.server<type=(.+), listener=(.+), networkProcessor=(.+)><>(.+-total):"
      name: kafka_server_$1_$4
      type: COUNTER
      labels:
        listener: "$2"
        networkProcessor: "$3"
    - pattern: "kafka.server<type=(.+), listener=(.+), networkProcessor=(.+)><>(.+):"
      name: kafka_server_$1_$4
      type: GAUGE
      labels:
        listener: "$2"
        networkProcessor: "$3"
    - pattern: kafka.server<type=(.+), listener=(.+), networkProcessor=(.+)><>(.+-total)
      name: kafka_server_$1_$4
      type: COUNTER
      labels:
        listener: "$2"
        networkProcessor: "$3"
    - pattern: kafka.server<type=(.+), listener=(.+), networkProcessor=(.+)><>(.+)
      name: kafka_server_$1_$4
      type: GAUGE
      labels:
        listener: "$2"
        networkProcessor: "$3"
    # Some percent metrics use MeanRate attribute
    # Ex) kafka.server<type=(KafkaRequestHandlerPool), name=(RequestHandlerAvgIdlePercent)><>MeanRate
    - pattern: kafka.(\\w+)<type=(.+), name=(.+)Percent\\w*><>MeanRate
      name: kafka_$1_$2_$3_percent
      type: GAUGE
    # Generic gauges for percents
    - pattern: kafka.(\\w+)<type=(.+), name=(.+)Percent\\w*><>Value
      name: kafka_$1_$2_$3_percent
      type: GAUGE
    - pattern: kafka.(\\w+)<type=(.+), name=(.+)Percent\\w*, (.+)=(.+)><>Value
      name: kafka_$1_$2_$3_percent
      type: GAUGE
      labels:
        "$4": "$5"
    # Generic per-second counters with 0-2 key/value pairs
    - pattern: kafka.(\\w+)<type=(.+), name=(.+)PerSec\\w*, (.+)=(.+), (.+)=(.+)><>Count
      name: kafka_$1_$2_$3_total
      type: COUNTER
      labels:
        "$4": "$5"
        "$6": "$7"
    - pattern: kafka.(\\w+)<type=(.+), name=(.+)PerSec\\w*, (.+)=(.+)><>Count
      name: kafka_$1_$2_$3_total
      type: COUNTER
      labels:
        "$4": "$5"
    - pattern: kafka.(\\w+)<type=(.+), name=(.+)PerSec\\w*><>Count
      name: kafka_$1_$2_$3_total
      type: COUNTER
    # Generic gauges with 0-2 key/value pairs
    - pattern: kafka.(\\w+)<type=(.+), name=(.+), (.+)=(.+), (.+)=(.+)><>Value
      name: kafka_$1_$2_$3
      type: GAUGE
      labels:
        "$4": "$5"
        "$6": "$7"
    - pattern: kafka.(\\w+)<type=(.+), name=(.+), (.+)=(.+)><>Value
      name: kafka_$1_$2_$3
      type: GAUGE
      labels:
        "$4": "$5"
    - pattern: kafka.(\\w+)<type=(.+), name=(.+)><>Value
      name: kafka_$1_$2_$3
      type: GAUGE
    # Emulate Prometheus 'Summary' metrics for the exported 'Histogram's.
    # Note that these are missing the '_sum' metric!
    - pattern: kafka.(\\w+)<type=(.+), name=(.+), (.+)=(.+), (.+)=(.+)><>Count
      name: kafka_$1_$2_$3_count
      type: COUNTER
      labels:
        "$4": "$5"
        "$6": "$7"
    - pattern: kafka.(\\w+)<type=(.+), name=(.+), (.+)=(.*), (.+)=(.+)><>(\\d+)thPercentile
      name: kafka_$1_$2_$3
      type: GAUGE
      labels:
        "$4": "$5"
        "$6": "$7"
        quantile: "0.$8"
    - pattern: kafka.(\\w+)<type=(.+), name=(.+), (.+)=(.+)><>Count
      name: kafka_$1_$2_$3_count
      type: COUNTER
      labels:
        "$4": "$5"
    - pattern: kafka.(\\w+)<type=(.+), name=(.+), (.+)=(.*)><>(\\d+)thPercentile
      name: kafka_$1_$2_$3
      type: GAUGE
      labels:
        "$4": "$5"
        quantile: "0.$6"
    - pattern: kafka.(\\w+)<type=(.+), name=(.+)><>Count
      name: kafka_$1_$2_$3_count
      type: COUNTER
    - pattern: kafka.(\\w+)<type=(.+), name=(.+)><>(\\d+)thPercentile
      name: kafka_$1_$2_$3
      type: GAUGE
      labels:
        quantile: "0.$4"
    # KRaft overall related metrics
    # distinguish between always increasing COUNTER (total and max) and variable GAUGE (all others) metrics
    - pattern: "kafka.server<type=raft-metrics><>(.+-total|.+-max):"
      name: kafka_server_raftmetrics_$1
      type: COUNTER
    - pattern: "kafka.server<type=raft-metrics><>(current-state): (.+)"
      name: kafka_server_raftmetrics_$1
      value: 1
      type: UNTYPED
      labels:
        $1: "$2"
    - pattern: "kafka.server<type=raft-metrics><>(.+):"
      name: kafka_server_raftmetrics_$1
      type: GAUGE
    # KRaft "low level" channels related metrics
    # distinguish between always increasing COUNTER (total and max) and variable GAUGE (all others) metrics
    - pattern: "kafka.server<type=raft-channel-metrics><>(.+-total|.+-max):"
      name: kafka_server_raftchannelmetrics_$1
      type: COUNTER
    - pattern: "kafka.server<type=raft-channel-metrics><>(.+):"
      name: kafka_server_raftchannelmetrics_$1
      type: GAUGE
    # Broker metrics related to fetching metadata topic records in KRaft mode
    - pattern: "kafka.server<type=broker-metadata-metrics><>(.+):"
      name: kafka_server_brokermetadatametrics_$1
      type: GAUGE
```

```yaml
# kafka-podmonitor.yaml - PodMonitor for Kafka (Strimzi creates pods)
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: kafka-metrics
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  namespaceSelector:
    matchNames:
      - kafka
  selector:
    matchLabels:
      strimzi.io/kind: Kafka
  podMetricsEndpoints:
    - port: tcp-prometheus
      interval: 30s
      path: /metrics
      relabelings:
        - separator: ;
          regex: __meta_kubernetes_pod_label_(strimzi_io_.+)
          replacement: $1
          action: labelmap
        - sourceLabels: [__meta_kubernetes_namespace]
          separator: ;
          regex: (.*)
          targetLabel: namespace
          replacement: $1
          action: replace
        - sourceLabels: [__meta_kubernetes_pod_name]
          separator: ;
          regex: (.*)
          targetLabel: kubernetes_pod_name
          replacement: $1
          action: replace
        - sourceLabels: [__meta_kubernetes_pod_node_name]
          separator: ;
          regex: (.*)
          targetLabel: node_name
          replacement: $1
          action: replace
        - sourceLabels: [__meta_kubernetes_pod_host_ip]
          separator: ;
          regex: (.*)
          targetLabel: node_ip
          replacement: $1
          action: replace
```

## Step 3: Configure Prometheus Alerting Rules

```yaml
# mq-alerts.yaml - Comprehensive message queue alerts
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: message-queue-alerts
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  groups:
    - name: rabbitmq
      rules:
        # RabbitMQ - Queue depth alert
        - alert: RabbitMQQueueDepthHigh
          expr: rabbitmq_detailed_queue_messages > 10000
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "RabbitMQ queue {{ $labels.queue }} has {{ $value }} messages"

        # RabbitMQ - No consumers
        - alert: RabbitMQQueueNoConsumers
          expr: ((rabbitmq_detailed_queue_consumers == 0) + rabbitmq_detailed_queue_messages) > 0
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "RabbitMQ queue {{ $labels.queue }} has no consumers but has {{ $value | humanize }} messages"

        # RabbitMQ - Memory high
        - alert: RabbitMQMemoryHigh
          expr: rabbitmq_process_resident_memory_bytes / rabbitmq_resident_memory_limit_bytes > 0.8
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "RabbitMQ memory usage is {{ $value | humanizePercentage }}"

    - name: kafka
      rules:
        # Kafka consumer lag
        - alert: KafkaConsumerGroupLagHigh
          expr: kafka_consumergroup_lag > 1000
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Kafka consumer group {{ $labels.consumergroup }} topic {{ $labels.topic }} partition {{ $labels.partition }} lag is {{ $value }}"

        # Kafka under-replicated partitions
        - alert: KafkaUnderReplicatedPartitions
          expr: kafka_server_replicamanager_underreplicatedpartitions > 0
          for: 1m
          labels:
            severity: warning
          annotations:
            summary: "Kafka broker {{ $labels.kubernetes_pod_name }} has {{ $value }} under-replicated partitions"

        # Kafka controller state
        - alert: KafkaAbnormalControllerState
          expr: sum(kafka_controller_kafkacontroller_activecontrollercount) by (strimzi_io_name, namespace) != 1
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Kafka cluster {{ $labels.strimzi_io_name }} in namespace {{ $labels.namespace }} has {{ $value }} active controllers"
```

## Step 4: Import Grafana Dashboards

```bash
# Import the official RabbitMQ and Strimzi dashboards
# RabbitMQ:
# https://raw.githubusercontent.com/rabbitmq/rabbitmq-server/main/deps/rabbitmq_prometheus/docker/grafana/dashboards/RabbitMQ-Overview.json

# Kafka:
# https://raw.githubusercontent.com/strimzi/strimzi-kafka-operator/main/examples/metrics/grafana-dashboards/strimzi-kafka.json
# https://raw.githubusercontent.com/strimzi/strimzi-kafka-operator/main/examples/metrics/grafana-dashboards/strimzi-kafka-exporter.json

# Download and apply as ConfigMaps
curl -fsSL "https://raw.githubusercontent.com/rabbitmq/rabbitmq-server/main/deps/rabbitmq_prometheus/docker/grafana/dashboards/RabbitMQ-Overview.json" | \
  kubectl create configmap rabbitmq-overview-dashboard \
  --from-file=RabbitMQ-Overview.json=/dev/stdin \
  --namespace=cattle-dashboards \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl label configmap rabbitmq-overview-dashboard \
  --namespace=cattle-dashboards \
  grafana_dashboard=1 \
  --overwrite

curl -fsSL "https://raw.githubusercontent.com/strimzi/strimzi-kafka-operator/main/examples/metrics/grafana-dashboards/strimzi-kafka.json" | \
  kubectl create configmap strimzi-kafka-dashboard \
  --from-file=strimzi-kafka.json=/dev/stdin \
  --namespace=cattle-dashboards \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl label configmap strimzi-kafka-dashboard \
  --namespace=cattle-dashboards \
  grafana_dashboard=1 \
  --overwrite

curl -fsSL "https://raw.githubusercontent.com/strimzi/strimzi-kafka-operator/main/examples/metrics/grafana-dashboards/strimzi-kafka-exporter.json" | \
  kubectl create configmap strimzi-kafka-exporter-dashboard \
  --from-file=strimzi-kafka-exporter.json=/dev/stdin \
  --namespace=cattle-dashboards \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl label configmap strimzi-kafka-exporter-dashboard \
  --namespace=cattle-dashboards \
  grafana_dashboard=1 \
  --overwrite
```

## Step 5: Check Kafka Consumer Lag from the Command Line

```bash
# Check the top 20 consumer group partitions by lag
kubectl exec -n kafka \
  $(kubectl get pod -n kafka -l strimzi.io/cluster=kafka-monitored,strimzi.io/kind=Kafka -o name | head -n 1) -- \
  bin/kafka-consumer-groups.sh \
  --bootstrap-server kafka-monitored-kafka-bootstrap:9092 \
  --describe \
  --all-groups | \
  sort -k6 -rn | head -20
```

## Step 6: Real-Time Queue Monitoring Script

```bash
#!/bin/bash
# monitor-queues.sh - Real-time queue monitoring

RABBITMQ_NS="messaging"
KAFKA_NS="kafka"
RABBITMQ_POD=$(kubectl get pod -n "$RABBITMQ_NS" -l app.kubernetes.io/component=rabbitmq -o name | head -n 1)
KAFKA_POD=$(kubectl get pod -n "$KAFKA_NS" -l strimzi.io/cluster=kafka-monitored,strimzi.io/kind=Kafka -o name | head -n 1)

echo "=== RabbitMQ Queue Status ==="
kubectl exec -n "$RABBITMQ_NS" \
  "$RABBITMQ_POD" -- \
  rabbitmqctl list_queues -p / name messages messages_ready messages_unacknowledged consumers 2>/dev/null

echo ""
echo "=== Kafka Consumer Group Lag ==="
kubectl exec -n "$KAFKA_NS" \
  "$KAFKA_POD" -- \
  bin/kafka-consumer-groups.sh \
  --bootstrap-server kafka-monitored-kafka-bootstrap:9092 \
  --list 2>/dev/null | while read -r GROUP; do
  echo "Group: $GROUP"
  kubectl exec -n "$KAFKA_NS" \
    "$KAFKA_POD" -- \
    bin/kafka-consumer-groups.sh \
    --bootstrap-server kafka-monitored-kafka-bootstrap:9092 \
    --describe --group "$GROUP" 2>/dev/null | \
    awk 'NR>1 {sum += $6} END {print "  Total lag: " sum+0}'
done
```

## Conclusion

Comprehensive monitoring of RabbitMQ and Kafka in Rancher prevents message loss, consumer lag, and queue buildup from going undetected until they cause service outages. The combination of Prometheus metrics, Grafana dashboards, and well-tuned alerting rules gives you complete visibility into your messaging infrastructure. Key metrics to watch include queue depth, consumer count, consumer lag, and memory/disk usage, with alerts configured to trigger before these metrics reach critical thresholds.
