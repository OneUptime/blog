# How to Implement Error Escalation with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Error Handling, Escalation, Pub/Sub, Observability

Description: Learn how to implement tiered error escalation in Dapr applications, routing failures from automatic retries through alerts to manual intervention workflows.

---

## Why Error Escalation Matters

Not every error needs human attention immediately, but persistent failures should escalate through defined tiers: automatic retry, team alert, on-call page, and incident ticket. Dapr's pub/sub and workflow building blocks provide the primitives to build this escalation ladder without external orchestration tools.

## Escalation Tiers Overview

Define four escalation tiers:

- **Tier 1**: Automatic retry (handled by Dapr resiliency policy)
- **Tier 2**: Team Slack notification after N consecutive failures
- **Tier 3**: PagerDuty alert after sustained failure window
- **Tier 4**: Incident ticket with full context dump

## Publishing Error Events

Every service publishes structured error events to a shared topic:

```python
from dapr.clients import DaprClient
import json
from datetime import datetime, timezone

def publish_error_event(service_id: str, error_type: str, message: str, context: dict):
    with DaprClient() as client:
        event = {
            "serviceId": service_id,
            "errorType": error_type,
            "message": message,
            "context": context,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "severity": classify_severity(error_type)
        }
        client.publish_event(
            pubsub_name="platform-pubsub",
            topic_name="service-errors",
            data=json.dumps(event),
            data_content_type="application/json"
        )

def classify_severity(error_type: str) -> str:
    if error_type in ("TIMEOUT", "UNAVAILABLE"):
        return "transient"
    if error_type in ("INVALID_INPUT", "NOT_FOUND"):
        return "permanent"
    return "unknown"
```

## Escalation Processor Service

A dedicated escalation service subscribes to error events and maintains failure counters in state store:

```python
from flask import Flask, request
from dapr.clients import DaprClient
import json

app = Flask(__name__)

@app.route("/dapr/subscribe", methods=["GET"])
def subscribe():
    subscriptions = [
        {"pubsubname": "platform-pubsub", "topic": "service-errors", "route": "/service-errors"},
        {"pubsubname": "platform-pubsub", "topic": "service-recovered", "route": "/service-recovered"},
    ]
    return json.dumps(subscriptions), 200, {"Content-Type": "application/json"}

@app.route("/service-errors", methods=["POST"])
def handle_error_event():
    event = request.get_json().get("data", {})
    service_id = event.get("serviceId")

    with DaprClient() as client:
        key = f"error-count:{service_id}"
        state = client.get_state(store_name="escalation-state", key=key)
        count_data = json.loads(state.data) if state.data else {"count": 0, "firstErrorAt": event["timestamp"]}

        count_data["count"] += 1
        count_data["lastErrorAt"] = event["timestamp"]

        client.save_state(store_name="escalation-state", key=key, value=json.dumps(count_data))

        # Escalation logic
        if count_data["count"] == 3:
            notify_team_slack(service_id, event)
        elif count_data["count"] == 10:
            alert_pagerduty(service_id, event, count_data)
        elif count_data["count"] == 25:
            create_incident_ticket(service_id, event, count_data)

    return "", 200
```

## Resetting Escalation Counters on Recovery

Subscribe to success events to reset the counter:

```python
@app.route("/service-recovered", methods=["POST"])
def handle_recovery():
    event = request.get_json().get("data", {})
    service_id = event.get("serviceId")

    with DaprClient() as client:
        client.delete_state(
            store_name="escalation-state",
            key=f"error-count:{service_id}"
        )

    resolve_open_incidents(service_id)
    return "", 200
```

## Escalation Policy Configuration

Store escalation thresholds in a Dapr secret for easy tuning:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: escalation-config
spec:
  type: secretstores.local.env
  version: v1
```

```bash
export ESCALATION_SLACK_THRESHOLD=3
export ESCALATION_PAGERDUTY_THRESHOLD=10
export ESCALATION_TICKET_THRESHOLD=25
```

## Summary

Dapr's pub/sub and state management building blocks enable a clean error escalation pipeline that routes failures from automatic retries through Slack notifications to PagerDuty alerts and incident tickets. A dedicated escalation service maintains per-service failure counters and triggers the appropriate tier based on configurable thresholds. Success events reset counters automatically, preventing stale escalation state after a recovery.
