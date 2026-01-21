# How to Monitor and Manage Kafka Connect Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Apache Kafka, Kafka Connect, Monitoring, REST API, JMX, Observability, Operations

Description: Learn how to monitor and manage Kafka Connect clusters using the REST API, JMX metrics, and operational best practices for maintaining healthy connector deployments.

---

Monitoring Kafka Connect is essential for maintaining reliable data pipelines. This guide covers the REST API for management, JMX metrics for monitoring, and best practices for operating Connect clusters.

## Kafka Connect REST API

### Cluster Information

```bash
# Get Connect cluster info
curl http://localhost:8083/ | jq

# Response:
{
  "version": "3.7.0",
  "commit": "abc123",
  "kafka_cluster_id": "lkc-xxx"
}
```

### Connector Operations

```bash
# List all connectors
curl http://localhost:8083/connectors | jq

# Get connector details
curl http://localhost:8083/connectors/my-connector | jq

# Get connector config
curl http://localhost:8083/connectors/my-connector/config | jq

# Get connector status
curl http://localhost:8083/connectors/my-connector/status | jq
```

### Create and Update Connectors

```bash
# Create connector
curl -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-connector",
    "config": {
      "connector.class": "io.confluent.connect.jdbc.JdbcSourceConnector",
      "connection.url": "jdbc:postgresql://localhost:5432/mydb",
      "topic.prefix": "jdbc-",
      "mode": "incrementing",
      "incrementing.column.name": "id"
    }
  }'

# Update connector config
curl -X PUT http://localhost:8083/connectors/my-connector/config \
  -H "Content-Type: application/json" \
  -d '{
    "connector.class": "io.confluent.connect.jdbc.JdbcSourceConnector",
    "connection.url": "jdbc:postgresql://localhost:5432/mydb",
    "topic.prefix": "jdbc-",
    "mode": "incrementing",
    "incrementing.column.name": "id",
    "poll.interval.ms": "5000"
  }'
```

### Connector Lifecycle

```bash
# Pause connector
curl -X PUT http://localhost:8083/connectors/my-connector/pause

# Resume connector
curl -X PUT http://localhost:8083/connectors/my-connector/resume

# Restart connector
curl -X POST http://localhost:8083/connectors/my-connector/restart

# Restart connector with options (Connect 3.0+)
curl -X POST "http://localhost:8083/connectors/my-connector/restart?includeTasks=true&onlyFailed=true"

# Delete connector
curl -X DELETE http://localhost:8083/connectors/my-connector
```

### Task Management

```bash
# List tasks
curl http://localhost:8083/connectors/my-connector/tasks | jq

# Get task status
curl http://localhost:8083/connectors/my-connector/tasks/0/status | jq

# Restart specific task
curl -X POST http://localhost:8083/connectors/my-connector/tasks/0/restart
```

### Connector Topics (Connect 3.0+)

```bash
# Get topics used by connector
curl http://localhost:8083/connectors/my-connector/topics | jq

# Reset connector topics
curl -X PUT http://localhost:8083/connectors/my-connector/topics/reset
```

## Python Management Script

```python
import requests
from typing import Dict, List, Optional
import json

class KafkaConnectClient:
    def __init__(self, base_url: str = "http://localhost:8083"):
        self.base_url = base_url.rstrip('/')

    def get_connectors(self) -> List[str]:
        response = requests.get(f"{self.base_url}/connectors")
        response.raise_for_status()
        return response.json()

    def get_connector_status(self, name: str) -> Dict:
        response = requests.get(f"{self.base_url}/connectors/{name}/status")
        response.raise_for_status()
        return response.json()

    def create_connector(self, name: str, config: Dict) -> Dict:
        payload = {"name": name, "config": config}
        response = requests.post(
            f"{self.base_url}/connectors",
            headers={"Content-Type": "application/json"},
            json=payload
        )
        response.raise_for_status()
        return response.json()

    def update_connector(self, name: str, config: Dict) -> Dict:
        response = requests.put(
            f"{self.base_url}/connectors/{name}/config",
            headers={"Content-Type": "application/json"},
            json=config
        )
        response.raise_for_status()
        return response.json()

    def delete_connector(self, name: str) -> bool:
        response = requests.delete(f"{self.base_url}/connectors/{name}")
        return response.status_code == 204

    def pause_connector(self, name: str) -> bool:
        response = requests.put(f"{self.base_url}/connectors/{name}/pause")
        return response.status_code == 202

    def resume_connector(self, name: str) -> bool:
        response = requests.put(f"{self.base_url}/connectors/{name}/resume")
        return response.status_code == 202

    def restart_connector(self, name: str, include_tasks: bool = True,
                         only_failed: bool = True) -> bool:
        url = f"{self.base_url}/connectors/{name}/restart"
        params = {
            "includeTasks": str(include_tasks).lower(),
            "onlyFailed": str(only_failed).lower()
        }
        response = requests.post(url, params=params)
        return response.status_code in [200, 202, 204]

    def get_all_statuses(self) -> Dict[str, Dict]:
        statuses = {}
        for connector in self.get_connectors():
            statuses[connector] = self.get_connector_status(connector)
        return statuses

    def get_failed_connectors(self) -> List[str]:
        failed = []
        for connector, status in self.get_all_statuses().items():
            connector_state = status.get('connector', {}).get('state')
            if connector_state == 'FAILED':
                failed.append(connector)
                continue

            for task in status.get('tasks', []):
                if task.get('state') == 'FAILED':
                    failed.append(connector)
                    break

        return failed


# Usage
client = KafkaConnectClient("http://localhost:8083")

# Check all connectors
for name, status in client.get_all_statuses().items():
    print(f"{name}: {status['connector']['state']}")
    for task in status['tasks']:
        print(f"  Task {task['id']}: {task['state']}")

# Restart failed connectors
for connector in client.get_failed_connectors():
    print(f"Restarting failed connector: {connector}")
    client.restart_connector(connector)
```

## JMX Metrics

### Enable JMX

```bash
# Environment variable
export KAFKA_JMX_OPTS="-Dcom.sun.management.jmxremote \
  -Dcom.sun.management.jmxremote.port=9999 \
  -Dcom.sun.management.jmxremote.authenticate=false \
  -Dcom.sun.management.jmxremote.ssl=false"
```

### Key Metrics

#### Connector Metrics

```
kafka.connect:type=connector-metrics,connector="{connector}"
- connector-class
- connector-type
- connector-version
- status

kafka.connect:type=connector-task-metrics,connector="{connector}",task="{task}"
- status
- running-ratio
- pause-ratio
- batch-size-avg
- batch-size-max
```

#### Source Connector Metrics

```
kafka.connect:type=source-task-metrics,connector="{connector}",task="{task}"
- source-record-poll-rate
- source-record-poll-total
- source-record-write-rate
- source-record-write-total
- source-record-active-count
- source-record-active-count-max
- poll-batch-avg-time-ms
- poll-batch-max-time-ms
```

#### Sink Connector Metrics

```
kafka.connect:type=sink-task-metrics,connector="{connector}",task="{task}"
- sink-record-read-rate
- sink-record-read-total
- sink-record-send-rate
- sink-record-send-total
- sink-record-active-count
- sink-record-active-count-max
- put-batch-avg-time-ms
- put-batch-max-time-ms
- partition-count
- offset-commit-success-percentage
- offset-commit-skip-rate
```

#### Worker Metrics

```
kafka.connect:type=connect-worker-metrics
- connector-count
- connector-startup-attempts-total
- connector-startup-failure-percentage
- connector-startup-success-percentage
- task-count
- task-startup-attempts-total
- task-startup-failure-percentage
- task-startup-success-percentage

kafka.connect:type=connect-worker-rebalance-metrics
- leader-name
- epoch
- rebalance-avg-time-ms
- rebalance-max-time-ms
- rebalancing
- completed-rebalances-total
```

## Prometheus JMX Exporter

### Configuration

```yaml
# kafka-connect-jmx-config.yml
lowercaseOutputName: true
lowercaseOutputLabelNames: true

rules:
  # Connector metrics
  - pattern: kafka.connect<type=connector-metrics, connector=(.+)><>(.+)
    name: kafka_connect_connector_$2
    type: GAUGE
    labels:
      connector: "$1"

  # Connector task metrics
  - pattern: kafka.connect<type=connector-task-metrics, connector=(.+), task=(.+)><>(.+)
    name: kafka_connect_connector_task_$3
    type: GAUGE
    labels:
      connector: "$1"
      task: "$2"

  # Source task metrics
  - pattern: kafka.connect<type=source-task-metrics, connector=(.+), task=(.+)><>(.+)
    name: kafka_connect_source_task_$3
    type: GAUGE
    labels:
      connector: "$1"
      task: "$2"

  # Sink task metrics
  - pattern: kafka.connect<type=sink-task-metrics, connector=(.+), task=(.+)><>(.+)
    name: kafka_connect_sink_task_$3
    type: GAUGE
    labels:
      connector: "$1"
      task: "$2"

  # Worker metrics
  - pattern: kafka.connect<type=connect-worker-metrics><>(.+)
    name: kafka_connect_worker_$1
    type: GAUGE

  # Worker rebalance metrics
  - pattern: kafka.connect<type=connect-worker-rebalance-metrics><>(.+)
    name: kafka_connect_worker_rebalance_$1
    type: GAUGE
```

### Docker Compose with JMX Exporter

```yaml
services:
  kafka-connect:
    image: confluentinc/cp-kafka-connect:7.5.0
    environment:
      KAFKA_JMX_OPTS: >-
        -javaagent:/opt/jmx_exporter/jmx_prometheus_javaagent-0.19.0.jar=9404:/opt/jmx_exporter/config.yml
    volumes:
      - ./jmx_prometheus_javaagent-0.19.0.jar:/opt/jmx_exporter/jmx_prometheus_javaagent-0.19.0.jar
      - ./kafka-connect-jmx-config.yml:/opt/jmx_exporter/config.yml
    ports:
      - "9404:9404"
```

## Alerting Rules

### Prometheus Alerts

```yaml
groups:
  - name: kafka-connect
    rules:
      # Connector failed
      - alert: KafkaConnectConnectorFailed
        expr: kafka_connect_connector_status == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Kafka Connect connector {{ $labels.connector }} failed"

      # Task failed
      - alert: KafkaConnectTaskFailed
        expr: kafka_connect_connector_task_status == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Kafka Connect task {{ $labels.task }} of connector {{ $labels.connector }} failed"

      # High rebalance rate
      - alert: KafkaConnectHighRebalanceRate
        expr: rate(kafka_connect_worker_rebalance_completed_rebalances_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High Kafka Connect rebalance rate"

      # Low throughput
      - alert: KafkaConnectLowThroughput
        expr: kafka_connect_source_task_source_record_poll_rate < 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low throughput on connector {{ $labels.connector }}"

      # High lag (for sink connectors)
      - alert: KafkaConnectSinkLag
        expr: kafka_connect_sink_task_sink_record_lag > 10000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High lag on sink connector {{ $labels.connector }}"
```

## Grafana Dashboard

### Key Panels

```json
{
  "panels": [
    {
      "title": "Connector Status",
      "type": "stat",
      "targets": [
        {
          "expr": "count(kafka_connect_connector_status == 1)",
          "legendFormat": "Running"
        },
        {
          "expr": "count(kafka_connect_connector_status == 0)",
          "legendFormat": "Failed"
        }
      ]
    },
    {
      "title": "Source Record Rate",
      "type": "graph",
      "targets": [
        {
          "expr": "sum(kafka_connect_source_task_source_record_write_rate) by (connector)",
          "legendFormat": "{{ connector }}"
        }
      ]
    },
    {
      "title": "Sink Record Rate",
      "type": "graph",
      "targets": [
        {
          "expr": "sum(kafka_connect_sink_task_sink_record_send_rate) by (connector)",
          "legendFormat": "{{ connector }}"
        }
      ]
    },
    {
      "title": "Task Processing Time",
      "type": "graph",
      "targets": [
        {
          "expr": "kafka_connect_source_task_poll_batch_avg_time_ms",
          "legendFormat": "{{ connector }} - Task {{ task }}"
        }
      ]
    }
  ]
}
```

## Health Check Script

```bash
#!/bin/bash
# connect-health-check.sh

CONNECT_URL="${CONNECT_URL:-http://localhost:8083}"

check_connector_status() {
    local connector=$1
    local status=$(curl -s "$CONNECT_URL/connectors/$connector/status")

    local connector_state=$(echo $status | jq -r '.connector.state')
    if [ "$connector_state" != "RUNNING" ]; then
        echo "CRITICAL: Connector $connector state: $connector_state"
        return 1
    fi

    local failed_tasks=$(echo $status | jq -r '.tasks[] | select(.state != "RUNNING") | .id')
    if [ -n "$failed_tasks" ]; then
        echo "CRITICAL: Connector $connector has failed tasks: $failed_tasks"
        return 1
    fi

    echo "OK: Connector $connector is healthy"
    return 0
}

# Check all connectors
connectors=$(curl -s "$CONNECT_URL/connectors")
exit_code=0

for connector in $(echo $connectors | jq -r '.[]'); do
    if ! check_connector_status $connector; then
        exit_code=1
    fi
done

exit $exit_code
```

## Auto-Recovery Script

```python
#!/usr/bin/env python3
import time
import logging
from kafka_connect_client import KafkaConnectClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def auto_recover_connectors(connect_url: str, check_interval: int = 60):
    client = KafkaConnectClient(connect_url)

    while True:
        try:
            failed = client.get_failed_connectors()

            for connector in failed:
                logger.warning(f"Detected failed connector: {connector}")

                # Attempt restart
                if client.restart_connector(connector, include_tasks=True, only_failed=True):
                    logger.info(f"Restarted connector: {connector}")
                else:
                    logger.error(f"Failed to restart connector: {connector}")

        except Exception as e:
            logger.error(f"Error checking connectors: {e}")

        time.sleep(check_interval)

if __name__ == "__main__":
    auto_recover_connectors("http://localhost:8083")
```

## Best Practices

### 1. Use Distributed Mode for Production

```properties
# connect-distributed.properties
group.id=connect-cluster
config.storage.topic=connect-configs
offset.storage.topic=connect-offsets
status.storage.topic=connect-status
config.storage.replication.factor=3
offset.storage.replication.factor=3
status.storage.replication.factor=3
```

### 2. Configure Error Handling

```json
{
  "config": {
    "errors.tolerance": "all",
    "errors.log.enable": "true",
    "errors.log.include.messages": "true",
    "errors.deadletterqueue.topic.name": "dlq-connector-errors",
    "errors.deadletterqueue.topic.replication.factor": "3"
  }
}
```

### 3. Set Appropriate Timeouts

```json
{
  "config": {
    "request.timeout.ms": "40000",
    "retry.backoff.ms": "500",
    "max.request.size": "10485760"
  }
}
```

### 4. Monitor These Key Metrics

| Metric | Threshold | Action |
|--------|-----------|--------|
| connector-status | != RUNNING | Alert, auto-restart |
| task-status | != RUNNING | Alert, restart task |
| source-record-poll-rate | < baseline | Investigate source |
| sink-record-lag | > 10000 | Scale tasks |
| rebalance-rate | > 0.1/min | Investigate instability |

## Summary

| Operation | REST Endpoint |
|-----------|--------------|
| List connectors | GET /connectors |
| Create connector | POST /connectors |
| Get status | GET /connectors/{name}/status |
| Restart | POST /connectors/{name}/restart |
| Pause/Resume | PUT /connectors/{name}/pause|resume |
| Delete | DELETE /connectors/{name} |

Effective monitoring and management of Kafka Connect requires combining the REST API for operations, JMX metrics for observability, and automated recovery for reliability.
