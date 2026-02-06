# How to Instrument Kafka Connect Workers and Connector Task Metrics with OpenTelemetry JMX Receiver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kafka Connect, JMX, Connector Metrics

Description: Monitor Kafka Connect worker health and connector task performance metrics using the OpenTelemetry Collector JMX receiver for pipeline visibility.

Kafka Connect runs connectors that move data between Kafka and external systems. Each connector has one or more tasks that do the actual work. Monitoring these tasks and the Connect workers that host them is essential for ensuring your data pipelines are healthy. Kafka Connect exposes metrics via JMX that the OpenTelemetry Collector can collect.

## Enabling JMX on Kafka Connect

Add JMX configuration to your Connect worker startup:

```bash
export KAFKA_JMX_OPTS="-Dcom.sun.management.jmxremote \
  -Dcom.sun.management.jmxremote.port=9999 \
  -Dcom.sun.management.jmxremote.authenticate=false \
  -Dcom.sun.management.jmxremote.ssl=false"
export JMX_PORT=9999
```

For Docker-based Kafka Connect:

```yaml
services:
  kafka-connect:
    image: confluentinc/cp-kafka-connect:latest
    environment:
      KAFKA_JMX_PORT: 9999
      CONNECT_BOOTSTRAP_SERVERS: kafka:9092
      CONNECT_GROUP_ID: connect-cluster
      CONNECT_CONFIG_STORAGE_TOPIC: connect-configs
      CONNECT_OFFSET_STORAGE_TOPIC: connect-offsets
      CONNECT_STATUS_STORAGE_TOPIC: connect-status
```

## Collector Configuration

```yaml
receivers:
  jmx/kafka-connect:
    jar_path: /opt/opentelemetry-jmx-metrics.jar
    endpoint: kafka-connect:9999
    target_system: kafka-connect
    collection_interval: 15s
    resource_attributes:
      service.name: kafka-connect

processors:
  batch:
    timeout: 10s
  resource:
    attributes:
      - key: service.type
        value: data-pipeline
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [jmx/kafka-connect]
      processors: [resource, batch]
      exporters: [otlp]
```

## Key Kafka Connect Metrics

### Worker Metrics

```
# Worker-level metrics
kafka.connect.worker.connector_count       - Number of connectors on this worker
kafka.connect.worker.task_count            - Number of running tasks
kafka.connect.worker.connector_startup_attempts_total - Startup attempts
kafka.connect.worker.connector_startup_success_total  - Successful startups
kafka.connect.worker.connector_startup_failure_total  - Failed startups
```

### Connector Metrics

```
# Per-connector metrics (JMX MBean)
# kafka.connect:type=connector-metrics,connector={name}
kafka.connect.connector.status             - Connector state (RUNNING, PAUSED, FAILED)
kafka.connect.connector.type               - Source or Sink
```

### Task Metrics (Source Connectors)

```
# Source task metrics
kafka.connect.source.task.poll_batch_avg_time_ms  - Average time to poll a batch
kafka.connect.source.task.poll_batch_max_time_ms  - Max poll batch time
kafka.connect.source.task.source_record_active_count - Records being processed
kafka.connect.source.task.source_record_write_total  - Records written to Kafka
kafka.connect.source.task.source_record_write_rate   - Write rate (records/sec)
```

### Task Metrics (Sink Connectors)

```
# Sink task metrics
kafka.connect.sink.task.sink_record_read_total     - Records read from Kafka
kafka.connect.sink.task.sink_record_read_rate      - Read rate (records/sec)
kafka.connect.sink.task.sink_record_send_total     - Records sent to the sink
kafka.connect.sink.task.sink_record_send_rate      - Send rate
kafka.connect.sink.task.put_batch_avg_time_ms      - Average batch put time
kafka.connect.sink.task.offset_commit_avg_time_ms  - Average offset commit time
```

## Monitoring Connector Health via REST API

Kafka Connect also exposes a REST API. Use the Collector's HTTP receiver to scrape it:

```python
# Script to check connector status and report to Collector
import requests
import json

CONNECT_URL = "http://kafka-connect:8083"
COLLECTOR_URL = "http://otel-collector:4318/v1/metrics"

def check_connectors():
    # List all connectors
    connectors = requests.get(f"{CONNECT_URL}/connectors").json()

    for name in connectors:
        # Get connector status
        status = requests.get(f"{CONNECT_URL}/connectors/{name}/status").json()
        connector_state = status["connector"]["state"]

        # Check each task
        for task in status["tasks"]:
            task_id = task["id"]
            task_state = task["state"]

            if task_state == "FAILED":
                print(f"ALERT: Connector {name} task {task_id} is FAILED")
                print(f"  Error: {task.get('trace', 'unknown')}")

check_connectors()
```

## Alert Conditions

```yaml
# Connector task failure
- alert: KafkaConnectTaskFailed
  condition: kafka.connect.connector.status == "FAILED"
  severity: critical
  message: "Connector '{{ connector }}' task {{ task_id }} has failed"

# Worker has no tasks
- alert: KafkaConnectWorkerEmpty
  condition: kafka.connect.worker.task_count == 0
  for: 5m
  severity: warning
  message: "Connect worker has no running tasks"

# Slow source polling
- alert: KafkaConnectSlowPolling
  condition: kafka.connect.source.task.poll_batch_avg_time_ms > 10000
  for: 10m
  severity: warning
  message: "Source connector polling taking {{ value }}ms per batch"

# Sink lag (records accumulating)
- alert: KafkaConnectSinkLag
  condition: kafka.connect.sink.task.sink_record_active_count > 50000
  for: 5m
  severity: warning
  message: "Sink connector has {{ value }} records pending"

# Connector startup failures
- alert: KafkaConnectStartupFailure
  condition: increase(kafka.connect.worker.connector_startup_failure_total[5m]) > 0
  severity: critical
```

## Monitoring Multiple Workers

For distributed Kafka Connect clusters:

```yaml
receivers:
  jmx/connect-worker-1:
    jar_path: /opt/opentelemetry-jmx-metrics.jar
    endpoint: connect-1:9999
    target_system: kafka-connect
    resource_attributes:
      worker.id: "connect-1"

  jmx/connect-worker-2:
    jar_path: /opt/opentelemetry-jmx-metrics.jar
    endpoint: connect-2:9999
    target_system: kafka-connect
    resource_attributes:
      worker.id: "connect-2"

service:
  pipelines:
    metrics:
      receivers: [jmx/connect-worker-1, jmx/connect-worker-2]
      processors: [resource, batch]
      exporters: [otlp]
```

## Summary

Kafka Connect metrics tell you whether your data pipelines are healthy and keeping up. The JMX receiver collects worker-level metrics (task count, startup failures), source connector metrics (poll times, write rates), and sink connector metrics (read rates, put times). Alert on task failures, slow polling, and startup failures to catch pipeline issues quickly. Combine JMX metrics with REST API status checks for complete visibility.
