# How to Instrument Kafka Connect Workers and Connector Task Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kafka Connect, JMX, Connector Metrics

Description: Monitor Kafka Connect worker health and connector task performance metrics using the OpenTelemetry Collector JMX receiver for pipeline visibility.

Kafka Connect runs connectors that move data between Kafka and external systems. Each connector has one or more tasks that do the actual work. Monitoring these tasks and the Connect workers that host them is essential for ensuring your data pipelines are healthy. Kafka Connect exposes metrics via JMX that the OpenTelemetry JMX Scraper can collect and send to the Collector.

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

## JMX Scraper and Collector Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

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
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp]
```

Run the JMX Scraper as a separate process and point it at the Collector:

```bash
java -jar /opt/opentelemetry-jmx-scraper.jar -config \
  otel.jmx.service.url=service:jmx:rmi:///jndi/rmi://kafka-connect:9999/jmxrmi \
  otel.jmx.target.system=kafka-connect \
  otel.metric.export.interval=15000 \
  otel.exporter.otlp.endpoint=http://otel-collector:4317 \
  otel.resource.attributes=service.name=kafka-connect
```

## Key Kafka Connect Metrics

### Worker Metrics

```text
# Worker-level metrics

kafka.connect.worker.connector.count       - Number of connectors on this worker
kafka.connect.worker.task.count            - Number of running tasks
kafka.connect.worker.connector.startup.count{result="success"} - Successful startups
kafka.connect.worker.connector.startup.count{result="failure"} - Failed startups
kafka.connect.worker.task.startup.count{result="failure"}      - Failed task startups
```

### Connector Metrics

```text
# Per-connector metrics (JMX MBean)
# kafka.connect:type=connector-metrics,connector={name}
kafka.connect.connector.status             - Connector state indicator with kafka.connect.connector.state
kafka.connect.task.status                  - Task state indicator with kafka.connect.task.state
```

### Task Metrics (Source Connectors)

```text
# Source task metrics
kafka.connect.source.poll.batch.time.average  - Average time to poll a batch
kafka.connect.source.poll.batch.time.max      - Max poll batch time
kafka.connect.source.record.active.count      - Records being processed
kafka.connect.source.record.write.count       - Records written to Kafka
kafka.connect.source.record.poll.count        - Records polled before transformation
```

### Task Metrics (Sink Connectors)

```text
# Sink task metrics
kafka.connect.sink.record.read.count        - Records read from Kafka
kafka.connect.sink.record.send.count        - Records sent to the sink
kafka.connect.sink.record.active.count      - Records not yet committed, flushed, or acknowledged
kafka.connect.sink.record.lag.max           - Maximum sink task lag for assigned partitions
kafka.connect.sink.put.batch.time.average   - Average batch put time
kafka.connect.task.offset.commit.time.average - Average offset commit time
```

## Monitoring Connector Health via REST API

Kafka Connect also exposes a REST API. Use it to check connector and task status:

```python
# Script to check connector status
import requests

CONNECT_URL = "http://kafka-connect:8083"

def check_connectors():
    # List all connectors
    connectors = requests.get(f"{CONNECT_URL}/connectors").json()

    for name in connectors:
        # Get connector status
        status = requests.get(f"{CONNECT_URL}/connectors/{name}/status").json()

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
  condition: kafka.connect.task.status{kafka.connect.task.state="failed"} == 1
  severity: critical
  message: "Connector '{{ connector }}' task {{ task_id }} has failed"

# Worker has no tasks
- alert: KafkaConnectWorkerEmpty
  condition: kafka.connect.worker.task.count == 0
  for: 5m
  severity: warning
  message: "Connect worker has no running tasks"

# Slow source polling
- alert: KafkaConnectSlowPolling
  condition: kafka.connect.source.poll.batch.time.average > 10
  for: 10m
  severity: warning
  message: "Source connector polling taking {{ value }}s per batch"

# Sink lag (records accumulating)
- alert: KafkaConnectSinkLag
  condition: kafka.connect.sink.record.lag.max > 50000
  for: 5m
  severity: warning
  message: "Sink connector has {{ value }} records of lag"

# Connector startup failures
- alert: KafkaConnectStartupFailure
  condition: increase(kafka.connect.worker.connector.startup.count{kafka.connect.worker.connector.startup.result="failure"}[5m]) > 0
  severity: critical
```

## Monitoring Multiple Workers

For distributed Kafka Connect clusters:

```bash
java -jar /opt/opentelemetry-jmx-scraper.jar -config \
  otel.jmx.service.url=service:jmx:rmi:///jndi/rmi://connect-1:9999/jmxrmi \
  otel.jmx.target.system=kafka-connect \
  otel.exporter.otlp.endpoint=http://otel-collector:4317 \
  otel.resource.attributes=service.name=kafka-connect,worker.id=connect-1

java -jar /opt/opentelemetry-jmx-scraper.jar -config \
  otel.jmx.service.url=service:jmx:rmi:///jndi/rmi://connect-2:9999/jmxrmi \
  otel.jmx.target.system=kafka-connect \
  otel.exporter.otlp.endpoint=http://otel-collector:4317 \
  otel.resource.attributes=service.name=kafka-connect,worker.id=connect-2
```

## Summary

Kafka Connect metrics tell you whether your data pipelines are healthy and keeping up. The JMX Scraper collects worker-level metrics (task count, startup failures), source connector metrics (poll times, write counts), and sink connector metrics (read counts, put times). Alert on task failures, slow polling, and startup failures to catch pipeline issues quickly. Combine JMX metrics with REST API status checks for complete visibility.
