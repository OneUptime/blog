# How to Build Real-Time Monitoring with Dapr Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Monitoring, Pub/Sub, Alert, Real-Time

Description: Learn how to build a real-time system monitoring platform using Dapr pub/sub for event routing and alerting with threshold-based rules.

---

Real-time monitoring systems collect metrics from distributed services, evaluate them against thresholds, and trigger alerts when anomalies occur. Dapr pub/sub provides the event backbone connecting metric collectors, threshold evaluators, and notification sinks without direct service coupling.

## Metric Collection Pipeline

Services emit metrics as Dapr events:

```python
from dapr.clients import DaprClient
import psutil
import time
import json

def collect_and_publish_metrics(service_name: str):
    with DaprClient() as client:
        while True:
            metrics = {
                "service": service_name,
                "timestamp": int(time.time() * 1000),
                "cpu": psutil.cpu_percent(),
                "memory": psutil.virtual_memory().percent,
                "disk": psutil.disk_usage('/').percent,
                "network_in": psutil.net_io_counters().bytes_recv,
                "network_out": psutil.net_io_counters().bytes_sent
            }

            client.publish_event(
                pubsub_name='pubsub',
                topic_name='system-metrics',
                data=json.dumps(metrics)
            )

            time.sleep(10)
```

## Threshold Evaluator Service

Subscribe to metrics and publish alerts when thresholds are breached:

```javascript
const { DaprServer, DaprClient } = require('@dapr/dapr');

const thresholds = {
  cpu: 85,
  memory: 90,
  disk: 95
};

const server = new DaprServer({ serverPort: 3001 });
const client = new DaprClient();

server.pubsub.subscribe('pubsub', 'system-metrics', async (metrics) => {
  for (const [metric, threshold] of Object.entries(thresholds)) {
    if (metrics[metric] > threshold) {
      const alert = {
        service: metrics.service,
        metric,
        value: metrics[metric],
        threshold,
        severity: metrics[metric] > threshold * 1.1 ? 'critical' : 'warning',
        timestamp: metrics.timestamp
      };

      await client.pubsub.publish('pubsub', 'monitoring-alerts', alert);
    }
  }
});
```

## Alert Routing with Subscription Rules

Route alerts by severity to different handlers:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: critical-alert-sub
spec:
  pubsubname: pubsub
  topic: monitoring-alerts
  routes:
    rules:
    - match: event.data.severity == "critical"
      path: /handle-critical
    - match: event.data.severity == "warning"
      path: /handle-warning
    default: /handle-info
```

## Alert Aggregation with Dapr State

Track alert frequency to avoid notification flooding:

```python
from dapr.clients import DaprClient
import json

def handle_alert(alert: dict) -> bool:
    alert_key = f"alert:{alert['service']}:{alert['metric']}"

    with DaprClient() as client:
        result = client.get_state('statestore', alert_key)
        state = json.loads(result.data or '{"count": 0, "lastNotified": 0}')

        state['count'] += 1
        current_time = int(__import__('time').time())

        # Only notify if last notification was > 5 minutes ago
        if current_time - state['lastNotified'] < 300:
            client.save_state('statestore', alert_key, json.dumps(state))
            return False

        state['lastNotified'] = current_time
        state['count'] = 0
        client.save_state('statestore', alert_key, json.dumps(state))
        return True
```

## Auto-Remediation with Dapr Service Invocation

For known alert types, trigger automated remediation:

```javascript
server.pubsub.subscribe('pubsub', 'monitoring-alerts', async (alert) => {
  if (alert.severity === 'critical' && alert.metric === 'memory') {
    // Invoke auto-remediation service
    await client.invoker.invoke(
      'remediation-service',
      'clear-cache',
      'POST',
      { service: alert.service }
    );
  }
});
```

## Real-Time Dashboard Feed

Publish processed alert data for dashboards:

```python
import json
from dapr.clients import DaprClient

@app.route('/system-metrics', methods=['POST'])
def metrics_handler():
    data = request.json['data']

    # Store rolling window in Dapr state
    with DaprClient() as client:
        client.publish_event('pubsub', 'dashboard-feed', json.dumps({
            "type": "metric",
            "data": data
        }))

    return '', 200
```

## Summary

Real-time monitoring with Dapr pub/sub creates a clean separation between metric collection, threshold evaluation, and alert delivery. Metric collectors publish to a central topic, threshold evaluators subscribe and re-publish alerts with severity labels, and alert handlers use Dapr state to prevent flooding. Dapr subscription routing rules direct critical alerts to immediate notification handlers while warning-level alerts go to slower channels.
