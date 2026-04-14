# How to Build IoT Alert Systems with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, IoT, Alert, Pub/Sub, Monitoring

Description: Learn how to build a configurable IoT alert system using Dapr pub/sub for event routing and state management for alert rule storage.

---

IoT alert systems detect abnormal conditions from device telemetry and notify operations teams through the appropriate channels. Dapr pub/sub decouples alert detection from notification delivery, enabling you to add new alert rules and notification channels without modifying the ingestion pipeline.

## Alert System Architecture

```text
Telemetry -> Alert Evaluator -> alert-triggered topic -> Deduplicator -> Notification Router
                                                                        -> Email Handler
                                                                        -> SMS Handler
                                                                        -> PagerDuty Handler
                                                                        -> Dashboard
```

## Define Alert Rules

Store alert rules in Dapr state for dynamic configuration:

```python
from dapr.clients import DaprClient
import json

def create_alert_rule(rule: dict):
    with DaprClient() as client:
        client.save_state(
            'statestore',
            f"alert-rule:{rule['ruleId']}",
            json.dumps(rule)
        )

        # Keep index of all rules
        rules_index = json.loads(
            client.get_state('statestore', 'alert-rules-index').data or '[]'
        )
        if rule['ruleId'] not in rules_index:
            rules_index.append(rule['ruleId'])
            client.save_state('statestore', 'alert-rules-index', json.dumps(rules_index))

# Example rules
create_alert_rule({
    "ruleId": "high-temperature",
    "sensorType": "temperature",
    "condition": "gt",
    "threshold": 85,
    "severity": "critical",
    "channels": ["sms", "email", "pagerduty"]
})

create_alert_rule({
    "ruleId": "low-battery",
    "sensorType": "battery",
    "condition": "lt",
    "threshold": 15,
    "severity": "warning",
    "channels": ["email"]
})
```

## Alert Evaluator Service

Subscribe to telemetry and evaluate against stored rules:

```python
@app.route('/iot-telemetry', methods=['POST'])
def evaluate_alerts():
    event = request.json
    telemetry = event['data']

    with DaprClient() as client:
        # Load rules index
        rules_index = json.loads(
            client.get_state('statestore', 'alert-rules-index').data or '[]'
        )

        for rule_id in rules_index:
            rule_data = client.get_state('statestore', f'alert-rule:{rule_id}').data
            if not rule_data:
                continue
            rule = json.loads(rule_data)

            if rule['sensorType'] != telemetry['sensorType']:
                continue

            if evaluate_condition(telemetry['value'], rule['condition'], rule['threshold']):
                alert = {
                    "ruleId": rule['ruleId'],
                    "deviceId": telemetry['deviceId'],
                    "sensorType": telemetry['sensorType'],
                    "value": telemetry['value'],
                    "threshold": rule['threshold'],
                    "severity": rule['severity'],
                    "channels": rule['channels'],
                    "triggeredAt": telemetry['timestamp']
                }
                client.publish_event('pubsub', 'alert-triggered', json.dumps(alert), data_content_type='application/json')

    return '', 200

def evaluate_condition(value, condition: str, threshold) -> bool:
    conditions = {
        'gt': lambda v, t: v > t,
        'lt': lambda v, t: v < t,
        'eq': lambda v, t: v == t,
        'gte': lambda v, t: v >= t,
        'lte': lambda v, t: v <= t
    }
    return conditions.get(condition, lambda v, t: False)(value, threshold)
```

## Alert Deduplication

Prevent alert floods using Dapr state:

```python
@app.route('/alert-triggered', methods=['POST'])
def deduplicate_alert():
    event = request.json
    alert = event['data']

    dedup_key = f"alert-active:{alert['deviceId']}:{alert['ruleId']}"

    with DaprClient() as client:
        existing = client.get_state('statestore', dedup_key).data

        if existing:
            # Alert already active, suppress
            return '', 200

        # Mark alert as active with 15-minute suppression window
        client.save_state(
            'statestore', dedup_key,
            json.dumps({"triggeredAt": alert['triggeredAt']}),
            state_metadata={"ttlInSeconds": "900"}
        )

        # Route to notification channels
        client.publish_event('pubsub', 'alert-notify', json.dumps(alert), data_content_type='application/json')

    return '', 200
```

## Notification Router

```python
import json

@app.route('/alert-notify', methods=['POST'])
def route_notification():
    event = request.json
    alert = event['data']

    with DaprClient() as client:
        for channel in alert.get('channels', []):
            client.publish_event('pubsub', f'notify-{channel}', json.dumps(alert), data_content_type='application/json')

    return '', 200
```

## Alert Dashboard Feed

```python
import json

@app.route('/alert-triggered', methods=['POST'])
def feed_dashboard():
    event = request.json
    alert = event['data']

    with DaprClient() as client:
        client.publish_event('pubsub', 'dashboard-alerts', json.dumps({
            "type": "iot-alert",
            "data": alert
        }), data_content_type='application/json')

    return '', 200
```

## Summary

Dapr pub/sub creates a flexible IoT alert pipeline where alert rules are stored dynamically in Dapr state and evaluated against incoming telemetry. A deduplication layer uses TTL-based state entries to suppress repeated alerts within a configurable window. The notification router fans alerts to channel-specific handlers via separate pub/sub topics, allowing new notification channels to be added by subscribing a new service without changing the alert evaluator.
