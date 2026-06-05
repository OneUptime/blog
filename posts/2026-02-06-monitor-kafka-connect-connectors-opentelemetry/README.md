# How to Monitor Kafka Connect Connectors with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kafka Connect, Monitoring, Connector, Apache Kafka, JMX, Observability

Description: Learn how to monitor Kafka Connect connectors with OpenTelemetry using JMX metrics, connector health checks, and task-level observability for reliable data pipelines.

---

Kafka Connect is the integration framework for Apache Kafka that moves data between Kafka and external systems like databases, search indexes, and cloud storage. A single Kafka Connect cluster might run dozens of connectors, each with multiple tasks, creating a complex operational surface that requires dedicated monitoring. When a connector task fails or slows down, the ripple effects can include data loss, stale search indexes, or broken ETL pipelines. OpenTelemetry gives you the tools to collect connector metrics, track task health, and alert on problems before they impact downstream systems.

This guide covers monitoring Kafka Connect using the OpenTelemetry Java JMX Scraper for connector metrics, the REST API for health checks, and application-level tracing for custom connectors.

## Kafka Connect Metrics Architecture

Kafka Connect exposes metrics through JMX, just like the rest of the Kafka ecosystem. These metrics cover three levels: the worker (the Connect process itself), the connectors (logical groupings of tasks), and the individual tasks (the units that actually move data). Each level provides different insights.

```mermaid
graph TB
    A[Kafka Connect Worker] --> B[Connector: jdbc-source]
    A --> C[Connector: elastic-sink]
    B --> D[Task 0]
    B --> E[Task 1]
    C --> F[Task 0]
    C --> G[Task 1]
    C --> H[Task 2]

    I[OTel JMX Scraper] -->|scrape| A
    I -->|OTLP| K[OTel Collector]
    K -->|export| J[Metrics Backend]

    style A fill:#9cf,stroke:#333
    style I fill:#fc9,stroke:#333
    style J fill:#9f9,stroke:#333
```

## Enabling JMX on Kafka Connect

Before OpenTelemetry can scrape metrics, JMX must be enabled on the Kafka Connect worker. Add the JMX configuration to the Connect startup:

```bash
# kafka-connect-env.sh

# Enable JMX for the Kafka Connect worker process
export KAFKA_JMX_OPTS="-Dcom.sun.management.jmxremote \
  -Dcom.sun.management.jmxremote.port=9999 \
  -Dcom.sun.management.jmxremote.rmi.port=9999 \
  -Dcom.sun.management.jmxremote.authenticate=true \
  -Dcom.sun.management.jmxremote.ssl=false \
  -Dcom.sun.management.jmxremote.password.file=/etc/kafka/jmxremote.password \
  -Dcom.sun.management.jmxremote.access.file=/etc/kafka/jmxremote.access \
  -Djava.rmi.server.hostname=localhost"
```

For Docker or Kubernetes deployments, set this through environment variables in your container configuration:

```yaml
# docker-compose.yml - Kafka Connect with JMX enabled
services:
  kafka-connect:
    image: confluentinc/cp-kafka-connect:7.6.0
    environment:
      CONNECT_BOOTSTRAP_SERVERS: "kafka:9092"
      CONNECT_GROUP_ID: "connect-cluster"
      CONNECT_CONFIG_STORAGE_TOPIC: "connect-configs"
      CONNECT_OFFSET_STORAGE_TOPIC: "connect-offsets"
      CONNECT_STATUS_STORAGE_TOPIC: "connect-status"
      CONNECT_KEY_CONVERTER: "org.apache.kafka.connect.json.JsonConverter"
      CONNECT_VALUE_CONVERTER: "org.apache.kafka.connect.json.JsonConverter"
      # Enable JMX
      KAFKA_JMX_PORT: "9999"
      KAFKA_JMX_HOSTNAME: "kafka-connect"
    ports:
      - "8083:8083"   # REST API
      - "9999:9999"   # JMX
```

## JMX Scraper Configuration for Kafka Connect Metrics

The OpenTelemetry Collector's `jmx` receiver has been deprecated. Use the OpenTelemetry Java JMX Scraper as the JMX process and send its OTLP metrics to the Collector:

```properties
# jmx-scraper.properties
otel.jmx.service.url=service:jmx:rmi:///jndi/rmi://kafka-connect:9999/jmxrmi
otel.jmx.target.system=kafka-connect
otel.metric.export.interval=30000
otel.jmx.username=monitor
otel.jmx.password=change-me
otel.metrics.exporter=otlp
otel.exporter.otlp.endpoint=http://otel-collector:4317
otel.resource.attributes=kafka.connect.cluster=connect-cluster
```

Run the scraper with the released JAR:

```bash
java -jar opentelemetry-jmx-scraper.jar -config jmx-scraper.properties
```

The Collector then receives the metrics over OTLP and exports them to your backend:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 15s
    send_batch_size: 200

  # Add Connect cluster identification
  resource:
    attributes:
      - key: kafka.connect.cluster
        value: ${env:CONNECT_CLUSTER_NAME}
        action: upsert

exporters:
  otlp:
    endpoint: https://oneuptime-ingest.example.com:4317
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp]
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

The `otel.jmx.target.system=kafka-connect` setting uses the built-in metric definitions for Kafka Connect, which map to the standard JMX MBeans that Connect exposes.

## Key Metrics to Monitor

Kafka Connect exposes a rich set of metrics across workers, connectors, and tasks. Here are the most important ones for operational monitoring:

### Worker-Level Metrics

```yaml
# Worker metrics from JMX MBean:
# kafka.connect:type=connect-worker-metrics

# Number of connectors in the worker
kafka.connect.worker.connector.count:
  description: "Total connectors deployed to this worker"

# Task startup and failure rates
kafka.connect.worker.task.startup.count:
  description: "Total task starts, with kafka.connect.worker.task.startup.result=success or failure"

# Rebalance metrics - critical for cluster stability
kafka.connect.worker.rebalance.completed.count:
  description: "Total completed rebalances"
kafka.connect.worker.rebalance.time.average:
  description: "Average time spent in rebalance"
```

Frequent rebalances indicate cluster instability. Each rebalance pauses all connectors on the affected workers, so high rebalance frequency directly impacts data pipeline throughput.

### Connector-Level Metrics

```yaml
# Connector metrics from JMX MBean:
# kafka.connect:type=connector-metrics,connector=*

# Connector status
kafka.connect.connector.status:
  description: "Connector running state"
  # kafka.connect.connector.state values include running, paused, failed,
  # unassigned, restarting, degraded, stopped, and unknown

# Task-level metrics from JMX MBean:
# kafka.connect:type=connector-task-metrics,connector=*,task=*

kafka.connect.task.status:
  description: "Individual task state"
  # kafka.connect.task.state values include running, paused, failed,
  # unassigned, restarting, destroyed, and unknown
```

### Source Connector Metrics

```yaml
# Source connector metrics from JMX MBean:
# kafka.connect:type=source-task-metrics,connector=*,task=*

# Records produced to Kafka
kafka.connect.source.poll.batch.time.average:
  description: "Average time for a poll batch"
kafka.connect.source.record.write.count:
  description: "Total records written to Kafka"
kafka.connect.source.record.active.count:
  description: "Records polled but not yet committed"

# Poll rate indicates source throughput
kafka.connect.source.record.poll.count:
  description: "Total records polled from source"
```

### Sink Connector Metrics

```yaml
# Sink connector metrics from JMX MBean:
# kafka.connect:type=sink-task-metrics,connector=*,task=*

# Records consumed from Kafka
kafka.connect.sink.record.read.count:
  description: "Total records read from Kafka"
kafka.connect.sink.record.send.count:
  description: "Total records sent to destination"

# Offset commit tracking
kafka.connect.task.offset.commit.failure.ratio:
  description: "Ratio of failed offset commits"
kafka.connect.task.offset.commit.time.average:
  description: "Average offset commit duration"

# Partition-level metrics for identifying lag
kafka.connect.sink.partition.count:
  description: "Number of partitions assigned to this task"
```

The gap between `kafka.connect.sink.record.read.count` and `kafka.connect.sink.record.send.count` indicates records that were read from Kafka but not yet successfully sent to the sink task after transformations. `kafka.connect.sink.record.active.count` is the direct backlog metric for records not yet committed, flushed, or acknowledged by the sink task.

## Monitoring Connector Health via REST API

Kafka Connect's REST API provides connector and task status information that complements JMX metrics. You can run a small script alongside the Collector to poll the REST API and export health metrics over OTLP:

```python
# connect_health_check.py - Poll Connect REST API and emit OTel metrics
import requests
import time
from opentelemetry import metrics
from opentelemetry.metrics import CallbackOptions, Observation
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Set up OTel metrics
reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://otel-collector:4317"),
    export_interval_millis=30000,
)
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter("kafka-connect-health")

CONNECT_URL = "http://kafka-connect:8083"

def fetch_connector_statuses():
    """Poll all connectors and their tasks for health status."""
    # Get list of all connectors
    resp = requests.get(f"{CONNECT_URL}/connectors", timeout=5)
    resp.raise_for_status()
    connectors = resp.json()

    for connector_name in connectors:
        # Get connector status including task details
        status_resp = requests.get(
            f"{CONNECT_URL}/connectors/{connector_name}/status",
            timeout=5)
        status_resp.raise_for_status()
        yield connector_name, status_resp.json()

def observe_connector_health(options: CallbackOptions):
    """Report connector health as observable gauge measurements."""
    try:
        for connector_name, status in fetch_connector_statuses():
            # Check connector state
            connector_state = status["connector"]["state"]
            is_running = 1 if connector_state == "RUNNING" else 0

            yield Observation(is_running, {
                "kafka.connect.connector": connector_name,
                "kafka.connect.connector.state": connector_state,
                "kafka.connect.worker.id": status["connector"]["worker_id"],
            })

    except requests.exceptions.RequestException:
        print("Cannot connect to Kafka Connect REST API")
        return []

def observe_task_health(options: CallbackOptions):
    """Report task health as observable gauge measurements."""
    try:
        for connector_name, status in fetch_connector_statuses():
            # Check each task state
            for task in status["tasks"]:
                task_state = task["state"]
                task_healthy = 1 if task_state == "RUNNING" else 0

                yield Observation(task_healthy, {
                    "kafka.connect.connector": connector_name,
                    "kafka.connect.task.id": task["id"],
                    "kafka.connect.task.state": task_state,
                    "kafka.connect.worker.id": task.get("worker_id", ""),
                })

                if task_state == "FAILED":
                    # Log the failure trace for debugging
                    print(f"FAILED task {connector_name}/{task['id']}: "
                          f"{task.get('trace', 'no trace')}")

    except requests.exceptions.RequestException:
        print("Cannot connect to Kafka Connect REST API")
        return []

# Create gauges for connector and task status
connector_status_gauge = meter.create_observable_gauge(
    "kafka.connect.connector.health",
    callbacks=[observe_connector_health],
    description="Connector health status (1=running, 0=not running)",
)

task_status_gauge = meter.create_observable_gauge(
    "kafka.connect.task.health",
    callbacks=[observe_task_health],
    description="Task health status (1=running, 0=not running)",
)

try:
    while True:
        time.sleep(60)
except KeyboardInterrupt:
    provider.shutdown()
```

This script polls the Connect REST API on the metric reader's export interval and emits health metrics through OpenTelemetry. The REST API provides information that JMX does not easily expose, like the specific error trace when a task fails. Combining both sources gives you complete visibility.

## Alerting on Common Failure Patterns

Based on the collected metrics, set up alerts for these common Kafka Connect failure patterns:

**Connector task failure**: A task enters the FAILED state and stops processing data.

```yaml
# Alert condition (expressed as a metric query)
# kafka.connect.task.health == 0 for any connector/task combination
# Severity: Critical
# Action: Check task trace via REST API, restart if transient
```

**Growing source record active count**: Source connector polls records but cannot write them to Kafka, indicating Kafka broker issues.

```yaml
# Alert condition:
# kafka.connect.source.record.active.count > threshold
# sustained for 5 minutes
# Severity: Warning
# Action: Check Kafka broker health and network connectivity
```

**Sink offset commit failures**: The sink connector cannot commit offsets, which means progress is not being tracked and records will be reprocessed after a restart.

```yaml
# Alert condition:
# kafka.connect.task.offset.commit.failure.ratio > 0.05
# Severity: Warning
# Action: Check destination system health and Connect worker resources
```

**Frequent rebalances**: Workers joining and leaving the group too often, causing processing pauses.

```yaml
# Alert condition:
# kafka.connect.worker.rebalance.completed.count increases
# more than 5 times per hour
# Severity: Warning
# Action: Check worker health, network stability, and session timeouts
```

## Tracing Custom Connectors

If you are building custom Kafka Connect connectors, you can add OpenTelemetry tracing directly into the connector code:

```java
// CustomSinkTask.java - Sink task with OTel tracing
import org.apache.kafka.connect.sink.SinkTask;
import org.apache.kafka.connect.sink.SinkRecord;
import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.context.Scope;
import org.apache.kafka.common.TopicPartition;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class CustomSinkTask extends SinkTask {

    private static final Tracer tracer =
        GlobalOpenTelemetry.getTracer("custom-sink-connector");

    @Override
    public void put(Collection<SinkRecord> records) {
        if (records.isEmpty()) return;

        // Create a span for the batch write operation
        Span span = tracer.spanBuilder("sink.put_batch")
            .setAttribute("kafka.connect.batch.size", records.size())
            .setAttribute("kafka.connect.connector",
                this.getClass().getSimpleName())
            .startSpan();

        try (Scope scope = span.makeCurrent()) {
            // Group records by topic-partition for efficient writes
            Map<TopicPartition, List<SinkRecord>> grouped =
                groupByPartition(records);

            for (Map.Entry<TopicPartition, List<SinkRecord>> entry
                    : grouped.entrySet()) {
                // Create a child span per partition batch
                Span partitionSpan = tracer
                    .spanBuilder("sink.write_partition")
                    .setAttribute("kafka.topic", entry.getKey().topic())
                    .setAttribute("kafka.partition",
                        entry.getKey().partition())
                    .setAttribute("record.count",
                        entry.getValue().size())
                    .startSpan();

                try (Scope partitionScope =
                         partitionSpan.makeCurrent()) {
                    writeToDestination(entry.getValue());
                    partitionSpan.setAttribute("write.success", true);
                } catch (Exception e) {
                    partitionSpan.recordException(e);
                    partitionSpan.setAttribute("write.success", false);
                    throw new RuntimeException("Failed to write partition batch", e);
                } finally {
                    partitionSpan.end();
                }
            }

            span.setAttribute("batch.success", true);
        } catch (Exception e) {
            span.recordException(e);
            span.setAttribute("batch.success", false);
            throw new RuntimeException("Failed to write records", e);
        } finally {
            span.end();
        }
    }

    @Override
    public String version() { return "1.0.0"; }

    @Override
    public void start(java.util.Map<String, String> props) {
        // Connector task initialization
    }

    @Override
    public void stop() {
        // Cleanup resources
    }

    private Map<TopicPartition, List<SinkRecord>> groupByPartition(
            Collection<SinkRecord> records) {
        Map<TopicPartition, List<SinkRecord>> grouped = new HashMap<>();
        for (SinkRecord record : records) {
            TopicPartition partition =
                new TopicPartition(record.topic(), record.kafkaPartition());
            grouped.computeIfAbsent(partition, key -> new ArrayList<>())
                .add(record);
        }
        return grouped;
    }

    private void writeToDestination(List<SinkRecord> records) {
        // Write records to the destination system.
    }
}
```

The tracing in this custom sink task creates spans for each batch write and for each partition within the batch. This granularity helps identify whether write failures are partition-specific or affect the entire batch. The exception recording on the span preserves the full error details for debugging in your trace backend.

## Dashboard Metrics Summary

Here is a summary of the metrics you should display on your Kafka Connect monitoring dashboard:

| Metric | Source | What It Tells You |
|--------|--------|-------------------|
| Connector count | JMX | Total connectors deployed |
| Task status | REST API | Which tasks are running or failed |
| Rebalance rate | JMX | Cluster stability |
| Source poll rate | JMX | Source connector throughput |
| Sink read/write gap | JMX | Destination write backlog |
| Offset commit failure ratio | JMX | Progress tracking reliability |
| Worker memory/CPU | System | Resource utilization |

## Conclusion

Monitoring Kafka Connect with OpenTelemetry provides the operational visibility needed to run reliable data pipelines. The JMX Scraper captures worker, connector, and task-level metrics without modifying connector code. REST API health checks add failure details that JMX does not expose. For custom connectors, OpenTelemetry tracing gives you batch and partition-level visibility into write operations and error patterns. Together, these approaches form a comprehensive monitoring strategy that helps you detect and resolve Kafka Connect issues before they impact the data systems downstream.
