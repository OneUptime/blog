# How to Troubleshoot Kafka Connect Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Kafka Connect, Troubleshooting, Connectors, Error Handling, Debugging

Description: A comprehensive guide to troubleshooting Kafka Connect failures, covering connector errors, task failures, and common issues with source and sink connectors.

---

Kafka Connect is powerful but can be challenging to debug when things go wrong. This guide covers common failures, diagnostic techniques, and solutions for reliable connector operation.

## Common Failure Types

### Connector States

| State | Description |
|-------|-------------|
| RUNNING | Connector is operating normally |
| PAUSED | Connector is paused |
| FAILED | Connector has failed |
| UNASSIGNED | Connector tasks not assigned |

### Task States

| State | Description |
|-------|-------------|
| RUNNING | Task is processing records |
| FAILED | Task has encountered an error |
| PAUSED | Task is paused |

## Diagnostic Commands

### Check Connector Status

```bash
# List all connectors
curl -s http://localhost:8083/connectors | jq

# Get connector status
curl -s http://localhost:8083/connectors/my-connector/status | jq

# Get connector config
curl -s http://localhost:8083/connectors/my-connector/config | jq

# Get task status
curl -s http://localhost:8083/connectors/my-connector/tasks/0/status | jq
```

### View Connector Logs

```bash
# Connect worker logs
docker logs kafka-connect 2>&1 | grep -i "error\|exception\|failed"

# Or on bare metal
tail -f /var/log/kafka-connect/connect.log | grep -i "error"

# Filter by connector name
grep "my-connector" /var/log/kafka-connect/connect.log | tail -100
```

### Check Worker Health

```bash
# Get worker info
curl -s http://localhost:8083/ | jq

# List connector plugins
curl -s http://localhost:8083/connector-plugins | jq
```

## Java Troubleshooting Tools

### Connector Status Monitor

```java
import org.apache.http.client.methods.*;
import org.apache.http.impl.client.*;
import org.apache.http.util.EntityUtils;
import com.fasterxml.jackson.databind.*;

import java.util.*;
import java.util.concurrent.*;

public class ConnectStatusMonitor {

    private final String connectUrl;
    private final CloseableHttpClient httpClient;
    private final ObjectMapper mapper;

    public ConnectStatusMonitor(String connectUrl) {
        this.connectUrl = connectUrl;
        this.httpClient = HttpClients.createDefault();
        this.mapper = new ObjectMapper();
    }

    public Map<String, Object> getConnectorStatus(String connectorName) throws Exception {
        HttpGet request = new HttpGet(connectUrl + "/connectors/" + connectorName + "/status");
        try (CloseableHttpResponse response = httpClient.execute(request)) {
            String json = EntityUtils.toString(response.getEntity());
            return mapper.readValue(json, Map.class);
        }
    }

    public List<String> getFailedConnectors() throws Exception {
        List<String> failed = new ArrayList<>();

        HttpGet request = new HttpGet(connectUrl + "/connectors");
        try (CloseableHttpResponse response = httpClient.execute(request)) {
            String json = EntityUtils.toString(response.getEntity());
            List<String> connectors = mapper.readValue(json, List.class);

            for (String connector : connectors) {
                Map<String, Object> status = getConnectorStatus(connector);
                Map<String, Object> connectorState = (Map<String, Object>) status.get("connector");
                String state = (String) connectorState.get("state");

                if ("FAILED".equals(state)) {
                    failed.add(connector);
                }

                // Check tasks
                List<Map<String, Object>> tasks = (List<Map<String, Object>>) status.get("tasks");
                for (Map<String, Object> task : tasks) {
                    if ("FAILED".equals(task.get("state"))) {
                        failed.add(connector + "/task-" + task.get("id"));
                    }
                }
            }
        }

        return failed;
    }

    public void restartConnector(String connectorName) throws Exception {
        HttpPost request = new HttpPost(connectUrl + "/connectors/" + connectorName + "/restart");
        try (CloseableHttpResponse response = httpClient.execute(request)) {
            System.out.println("Restart status: " + response.getStatusLine().getStatusCode());
        }
    }

    public void restartTask(String connectorName, int taskId) throws Exception {
        HttpPost request = new HttpPost(
            connectUrl + "/connectors/" + connectorName + "/tasks/" + taskId + "/restart");
        try (CloseableHttpResponse response = httpClient.execute(request)) {
            System.out.println("Task restart status: " + response.getStatusLine().getStatusCode());
        }
    }

    public void startHealthCheck(long intervalMs) {
        ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
        scheduler.scheduleAtFixedRate(() -> {
            try {
                List<String> failed = getFailedConnectors();
                if (!failed.isEmpty()) {
                    System.out.println("Failed connectors/tasks: " + failed);

                    // Auto-restart failed tasks
                    for (String item : failed) {
                        if (item.contains("/task-")) {
                            String[] parts = item.split("/task-");
                            restartTask(parts[0], Integer.parseInt(parts[1]));
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Health check failed: " + e.getMessage());
            }
        }, 0, intervalMs, TimeUnit.MILLISECONDS);
    }
}
```

### Error Handler Configuration

```java
import java.util.*;

public class ConnectorConfigBuilder {

    /**
     * Build connector config with error handling
     */
    public static Map<String, String> buildSinkConnectorConfig(
            String name,
            String connectorClass,
            String topics,
            Map<String, String> additionalConfig) {

        Map<String, String> config = new HashMap<>();

        // Basic settings
        config.put("name", name);
        config.put("connector.class", connectorClass);
        config.put("topics", topics);
        config.put("tasks.max", "3");

        // Error handling - log and continue
        config.put("errors.tolerance", "all");
        config.put("errors.log.enable", "true");
        config.put("errors.log.include.messages", "true");

        // Dead letter queue
        config.put("errors.deadletterqueue.topic.name", name + "-dlq");
        config.put("errors.deadletterqueue.topic.replication.factor", "3");
        config.put("errors.deadletterqueue.context.headers.enable", "true");

        // Retry settings
        config.put("errors.retry.timeout", "60000");
        config.put("errors.retry.delay.max.ms", "10000");

        // Add additional config
        config.putAll(additionalConfig);

        return config;
    }

    /**
     * Build source connector config with error handling
     */
    public static Map<String, String> buildSourceConnectorConfig(
            String name,
            String connectorClass,
            Map<String, String> additionalConfig) {

        Map<String, String> config = new HashMap<>();

        config.put("name", name);
        config.put("connector.class", connectorClass);
        config.put("tasks.max", "1");

        // Error handling
        config.put("errors.tolerance", "all");
        config.put("errors.log.enable", "true");

        // Producer settings for source connector
        config.put("producer.override.acks", "all");
        config.put("producer.override.retries", "10");
        config.put("producer.override.retry.backoff.ms", "500");

        config.putAll(additionalConfig);

        return config;
    }
}
```

### Connect Metrics Collector

```java
import javax.management.*;
import javax.management.remote.*;
import java.util.*;

public class ConnectMetricsCollector {

    private final MBeanServerConnection mbeanConnection;

    public ConnectMetricsCollector(String jmxUrl) throws Exception {
        JMXServiceURL url = new JMXServiceURL(jmxUrl);
        JMXConnector connector = JMXConnectorFactory.connect(url);
        this.mbeanConnection = connector.getMBeanServerConnection();
    }

    public Map<String, Object> getConnectorMetrics(String connectorName) throws Exception {
        Map<String, Object> metrics = new HashMap<>();

        // Connector task metrics
        ObjectName taskMetrics = new ObjectName(
            "kafka.connect:type=connector-task-metrics,connector=" + connectorName + ",task=*");

        Set<ObjectName> names = mbeanConnection.queryNames(taskMetrics, null);
        for (ObjectName name : names) {
            MBeanInfo info = mbeanConnection.getMBeanInfo(name);
            for (MBeanAttributeInfo attr : info.getAttributes()) {
                Object value = mbeanConnection.getAttribute(name, attr.getName());
                metrics.put(name.getKeyProperty("task") + "." + attr.getName(), value);
            }
        }

        return metrics;
    }

    public void checkErrorMetrics(String connectorName) throws Exception {
        Map<String, Object> metrics = getConnectorMetrics(connectorName);

        for (Map.Entry<String, Object> entry : metrics.entrySet()) {
            String key = entry.getKey();
            Object value = entry.getValue();

            // Check for error indicators
            if (key.contains("total-errors") && value instanceof Number) {
                long errors = ((Number) value).longValue();
                if (errors > 0) {
                    System.out.println("WARNING: " + key + " = " + errors);
                }
            }

            if (key.contains("deadletterqueue-produce-requests")) {
                System.out.println("DLQ writes: " + key + " = " + value);
            }
        }
    }
}
```

## Python Troubleshooting Tools

```python
import requests
import json
import time
from typing import Dict, List, Any, Optional
import logging
from dataclasses import dataclass
from enum import Enum

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ConnectorState(Enum):
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    FAILED = "FAILED"
    UNASSIGNED = "UNASSIGNED"


@dataclass
class TaskStatus:
    id: int
    state: str
    worker_id: str
    trace: Optional[str] = None


@dataclass
class ConnectorStatus:
    name: str
    state: str
    worker_id: str
    tasks: List[TaskStatus]
    trace: Optional[str] = None


class KafkaConnectClient:
    """Client for Kafka Connect REST API"""

    def __init__(self, connect_url: str):
        self.connect_url = connect_url.rstrip('/')

    def list_connectors(self) -> List[str]:
        """List all connectors"""
        response = requests.get(f"{self.connect_url}/connectors")
        response.raise_for_status()
        return response.json()

    def get_connector_status(self, name: str) -> ConnectorStatus:
        """Get connector status"""
        response = requests.get(f"{self.connect_url}/connectors/{name}/status")
        response.raise_for_status()
        data = response.json()

        connector = data['connector']
        tasks = [
            TaskStatus(
                id=t['id'],
                state=t['state'],
                worker_id=t['worker_id'],
                trace=t.get('trace')
            )
            for t in data['tasks']
        ]

        return ConnectorStatus(
            name=name,
            state=connector['state'],
            worker_id=connector['worker_id'],
            tasks=tasks,
            trace=connector.get('trace')
        )

    def get_connector_config(self, name: str) -> Dict[str, str]:
        """Get connector configuration"""
        response = requests.get(f"{self.connect_url}/connectors/{name}/config")
        response.raise_for_status()
        return response.json()

    def create_connector(self, name: str, config: Dict[str, str]) -> Dict:
        """Create a new connector"""
        payload = {"name": name, "config": config}
        response = requests.post(
            f"{self.connect_url}/connectors",
            headers={"Content-Type": "application/json"},
            json=payload
        )
        response.raise_for_status()
        return response.json()

    def update_connector(self, name: str, config: Dict[str, str]) -> Dict:
        """Update connector configuration"""
        response = requests.put(
            f"{self.connect_url}/connectors/{name}/config",
            headers={"Content-Type": "application/json"},
            json=config
        )
        response.raise_for_status()
        return response.json()

    def delete_connector(self, name: str):
        """Delete a connector"""
        response = requests.delete(f"{self.connect_url}/connectors/{name}")
        response.raise_for_status()

    def restart_connector(self, name: str):
        """Restart a connector"""
        response = requests.post(f"{self.connect_url}/connectors/{name}/restart")
        response.raise_for_status()

    def restart_task(self, name: str, task_id: int):
        """Restart a specific task"""
        response = requests.post(
            f"{self.connect_url}/connectors/{name}/tasks/{task_id}/restart"
        )
        response.raise_for_status()

    def pause_connector(self, name: str):
        """Pause a connector"""
        response = requests.put(f"{self.connect_url}/connectors/{name}/pause")
        response.raise_for_status()

    def resume_connector(self, name: str):
        """Resume a paused connector"""
        response = requests.put(f"{self.connect_url}/connectors/{name}/resume")
        response.raise_for_status()


class ConnectTroubleshooter:
    """Troubleshooting utilities for Kafka Connect"""

    def __init__(self, connect_url: str):
        self.client = KafkaConnectClient(connect_url)

    def check_all_connectors(self) -> Dict[str, List[str]]:
        """Check status of all connectors"""
        results = {
            'healthy': [],
            'failed_connectors': [],
            'failed_tasks': [],
            'paused': []
        }

        connectors = self.client.list_connectors()
        for name in connectors:
            try:
                status = self.client.get_connector_status(name)

                if status.state == ConnectorState.FAILED.value:
                    results['failed_connectors'].append(name)
                    logger.error(f"Connector {name} FAILED: {status.trace}")
                elif status.state == ConnectorState.PAUSED.value:
                    results['paused'].append(name)
                else:
                    # Check tasks
                    all_tasks_running = True
                    for task in status.tasks:
                        if task.state == ConnectorState.FAILED.value:
                            results['failed_tasks'].append(f"{name}/task-{task.id}")
                            logger.error(f"Task {name}/{task.id} FAILED: {task.trace}")
                            all_tasks_running = False

                    if all_tasks_running:
                        results['healthy'].append(name)

            except Exception as e:
                logger.error(f"Error checking {name}: {e}")
                results['failed_connectors'].append(name)

        return results

    def diagnose_connector(self, name: str) -> Dict[str, Any]:
        """Diagnose issues with a specific connector"""
        diagnosis = {
            'connector': name,
            'issues': [],
            'recommendations': []
        }

        try:
            status = self.client.get_connector_status(name)
            config = self.client.get_connector_config(name)

            # Check connector state
            if status.state == ConnectorState.FAILED.value:
                diagnosis['issues'].append({
                    'type': 'CONNECTOR_FAILED',
                    'message': status.trace
                })
                diagnosis['recommendations'].append(
                    "Check connector configuration and restart"
                )

            # Check tasks
            for task in status.tasks:
                if task.state == ConnectorState.FAILED.value:
                    diagnosis['issues'].append({
                        'type': 'TASK_FAILED',
                        'task_id': task.id,
                        'message': task.trace
                    })

                    # Analyze error
                    if task.trace:
                        self._analyze_error(task.trace, diagnosis)

            # Check configuration
            self._check_config(config, diagnosis)

        except requests.exceptions.RequestException as e:
            diagnosis['issues'].append({
                'type': 'CONNECTION_ERROR',
                'message': str(e)
            })

        return diagnosis

    def _analyze_error(self, trace: str, diagnosis: Dict):
        """Analyze error trace and provide recommendations"""
        trace_lower = trace.lower()

        if 'connection' in trace_lower or 'timeout' in trace_lower:
            diagnosis['recommendations'].append(
                "Check network connectivity to source/sink system"
            )

        if 'authentication' in trace_lower or 'permission' in trace_lower:
            diagnosis['recommendations'].append(
                "Verify authentication credentials and permissions"
            )

        if 'serialization' in trace_lower or 'schema' in trace_lower:
            diagnosis['recommendations'].append(
                "Check schema compatibility and converter configuration"
            )

        if 'offset' in trace_lower:
            diagnosis['recommendations'].append(
                "Consider resetting offsets or checking offset storage"
            )

    def _check_config(self, config: Dict[str, str], diagnosis: Dict):
        """Check configuration for common issues"""
        # Check error handling
        if config.get('errors.tolerance') != 'all':
            diagnosis['recommendations'].append(
                "Consider setting errors.tolerance=all for resilience"
            )

        # Check DLQ
        if not config.get('errors.deadletterqueue.topic.name'):
            diagnosis['recommendations'].append(
                "Consider configuring a dead letter queue"
            )

        # Check tasks.max
        tasks_max = int(config.get('tasks.max', '1'))
        if tasks_max == 1:
            diagnosis['recommendations'].append(
                "Consider increasing tasks.max for better parallelism"
            )

    def auto_heal(self, max_restart_attempts: int = 3) -> Dict[str, List[str]]:
        """Attempt to automatically fix failed connectors/tasks"""
        results = {
            'restarted_connectors': [],
            'restarted_tasks': [],
            'failed_to_restart': []
        }

        check_results = self.check_all_connectors()

        # Restart failed connectors
        for connector in check_results['failed_connectors']:
            try:
                logger.info(f"Restarting connector: {connector}")
                self.client.restart_connector(connector)
                results['restarted_connectors'].append(connector)
            except Exception as e:
                logger.error(f"Failed to restart {connector}: {e}")
                results['failed_to_restart'].append(connector)

        # Restart failed tasks
        for task_ref in check_results['failed_tasks']:
            connector, task_part = task_ref.split('/task-')
            task_id = int(task_part)
            try:
                logger.info(f"Restarting task: {task_ref}")
                self.client.restart_task(connector, task_id)
                results['restarted_tasks'].append(task_ref)
            except Exception as e:
                logger.error(f"Failed to restart {task_ref}: {e}")
                results['failed_to_restart'].append(task_ref)

        return results


class ConnectHealthMonitor:
    """Continuous health monitoring for Kafka Connect"""

    def __init__(self, connect_url: str, check_interval: int = 60):
        self.troubleshooter = ConnectTroubleshooter(connect_url)
        self.check_interval = check_interval
        self.running = False

    def start(self, auto_heal: bool = False):
        """Start health monitoring"""
        self.running = True
        logger.info("Starting Connect health monitor")

        while self.running:
            try:
                results = self.troubleshooter.check_all_connectors()

                # Log status
                logger.info(f"Healthy: {len(results['healthy'])}, "
                          f"Failed: {len(results['failed_connectors']) + len(results['failed_tasks'])}, "
                          f"Paused: {len(results['paused'])}")

                # Auto-heal if enabled
                if auto_heal and (results['failed_connectors'] or results['failed_tasks']):
                    heal_results = self.troubleshooter.auto_heal()
                    logger.info(f"Auto-heal results: {heal_results}")

            except Exception as e:
                logger.error(f"Health check failed: {e}")

            time.sleep(self.check_interval)

    def stop(self):
        """Stop health monitoring"""
        self.running = False


# Connector configuration templates
def build_jdbc_source_config(name: str, connection_url: str,
                             table: str, topic_prefix: str) -> Dict[str, str]:
    """Build JDBC source connector config with error handling"""
    return {
        "connector.class": "io.confluent.connect.jdbc.JdbcSourceConnector",
        "connection.url": connection_url,
        "table.whitelist": table,
        "topic.prefix": topic_prefix,
        "mode": "incrementing",
        "incrementing.column.name": "id",
        "tasks.max": "1",
        "poll.interval.ms": "1000",
        # Error handling
        "errors.tolerance": "all",
        "errors.log.enable": "true",
        "errors.log.include.messages": "true"
    }


def build_elasticsearch_sink_config(name: str, connection_url: str,
                                    topics: str) -> Dict[str, str]:
    """Build Elasticsearch sink connector config with error handling"""
    return {
        "connector.class": "io.confluent.connect.elasticsearch.ElasticsearchSinkConnector",
        "connection.url": connection_url,
        "topics": topics,
        "tasks.max": "3",
        "key.ignore": "true",
        "schema.ignore": "true",
        "type.name": "_doc",
        # Error handling
        "errors.tolerance": "all",
        "errors.log.enable": "true",
        "errors.log.include.messages": "true",
        "errors.deadletterqueue.topic.name": f"{name}-dlq",
        "errors.deadletterqueue.topic.replication.factor": "3",
        "errors.deadletterqueue.context.headers.enable": "true",
        # Retry settings
        "max.retries": "5",
        "retry.backoff.ms": "1000"
    }


# Example usage
def main():
    connect_url = "http://localhost:8083"

    # Create troubleshooter
    troubleshooter = ConnectTroubleshooter(connect_url)

    # Check all connectors
    results = troubleshooter.check_all_connectors()
    print(f"Results: {json.dumps(results, indent=2)}")

    # Diagnose specific connector
    if results['failed_connectors']:
        connector = results['failed_connectors'][0]
        diagnosis = troubleshooter.diagnose_connector(connector)
        print(f"Diagnosis: {json.dumps(diagnosis, indent=2)}")

    # Start health monitor with auto-heal
    monitor = ConnectHealthMonitor(connect_url, check_interval=30)
    try:
        monitor.start(auto_heal=True)
    except KeyboardInterrupt:
        monitor.stop()


if __name__ == '__main__':
    main()
```

## Common Issues and Solutions

### Issue: Connector Fails Immediately

```bash
# Check if connector class is available
curl -s http://localhost:8083/connector-plugins | jq '.[].class'

# Verify plugin path
ls /usr/share/java/kafka-connect-*
```

### Issue: Task Fails with Serialization Error

```json
{
  "key.converter": "org.apache.kafka.connect.storage.StringConverter",
  "value.converter": "org.apache.kafka.connect.json.JsonConverter",
  "value.converter.schemas.enable": "false"
}
```

### Issue: Out of Memory

```properties
# In connect-distributed.properties
KAFKA_HEAP_OPTS="-Xms4G -Xmx4G"
```

## Best Practices

1. **Always configure error handling**: Use `errors.tolerance=all` and DLQ
2. **Monitor connector metrics**: Set up alerts on error rates
3. **Use appropriate tasks.max**: Balance parallelism with resources
4. **Implement health checks**: Automated monitoring and restart
5. **Version control configs**: Track connector configurations in git

## Conclusion

Effective Kafka Connect troubleshooting requires understanding connector states, proper error handling configuration, and monitoring. By implementing health checks and auto-healing, you can maintain reliable data pipelines with minimal manual intervention.
