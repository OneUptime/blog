# How to Use Dapr for Telecommunications Microservices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Telecommunications, Microservice, Event-Driven, Scalability

Description: Build telecommunications microservices with Dapr for subscriber management, billing, network event processing, and real-time usage tracking at scale.

---

Telecommunications systems process millions of events per second: call detail records (CDRs), SMS deliveries, data usage events, and network alarms. Dapr's high-throughput pub/sub, state management, and workflow capabilities handle these volume requirements while enabling the modular service decomposition that telcos need for agility.

## Telecom Architecture with Dapr

```text
Network Elements -> Event Ingestion (Dapr) -> CDR Processing (Dapr)
                                           -> Billing Service (Dapr)
                                           -> Subscriber Service (Dapr)
                                           -> Notification Service (Dapr)
                                           -> Fraud Detection (Dapr)
```

## High-Volume CDR Processing

Call Detail Records arrive in high volumes. Use Dapr bulk pub/sub for efficient processing:

```python
# cdr_processor/processor.py
from flask import Flask, request, jsonify
from dapr.clients import DaprClient
import json

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([{
        'pubsubname': 'telecom-pubsub',
        'topic': 'raw-cdr',
        'route': '/events/cdr',
        'bulkSubscribe': {
            'enabled': True,
            'maxMessagesCount': 500,
            'maxAwaitDurationMs': 1000
        }
    }])

@app.route('/events/cdr', methods=['POST'])
def handle_cdr_batch():
    """Process a batch of call detail records"""
    envelope = request.json
    entries = envelope.get('entries', [])
    cdrs = [entry['event'].get('data', {}) for entry in entries]

    enriched_cdrs = []
    billing_events = []

    with DaprClient() as client:
        for cdr in cdrs:
            enriched = enrich_cdr(cdr)
            enriched_cdrs.append(enriched)

            # Calculate billing impact
            billing_events.append({
                'subscriber_id': cdr['caller_id'],
                'event_type': cdr['call_type'],
                'duration_seconds': cdr.get('duration', 0),
                'data_bytes': cdr.get('data_bytes', 0),
                'timestamp': cdr['timestamp']
            })

        # Batch publish billing events
        for billing_event in billing_events:
            client.publish_event("telecom-pubsub", "billing-event",
                                 json.dumps(billing_event))

    # Return per-entry statuses as required by bulk subscribe
    return jsonify({
        'statuses': [
            {'entryId': entry['entryId'], 'status': 'SUCCESS'}
            for entry in entries
        ]
    })

def enrich_cdr(cdr: dict) -> dict:
    """Add derived fields to CDR"""
    return {
        **cdr,
        'duration_minutes': cdr.get('duration', 0) / 60,
        'cost_estimate': calculate_cost(cdr),
        'is_roaming': cdr.get('network_id') != 'home-network'
    }
```

## Subscriber Usage Tracking

Track real-time usage against plan limits:

```python
# billing_service/usage.py
from decimal import Decimal

def update_subscriber_usage(subscriber_id: str, event: dict):
    with DaprClient() as client:
        usage_key = f"usage:{subscriber_id}:{get_billing_period()}"

        # Use ETag for safe concurrent updates
        state = client.get_state("billing-statestore", usage_key)
        usage = json.loads(state.data or '{"voice_minutes": 0, "data_mb": 0, "sms_count": 0}')
        etag = state.etag

        if event['event_type'] == 'voice':
            usage['voice_minutes'] = str(
                Decimal(usage['voice_minutes']) + Decimal(str(event['duration_seconds'] / 60))
            )
        elif event['event_type'] == 'data':
            usage['data_mb'] = str(
                Decimal(usage['data_mb']) + Decimal(str(event['data_bytes'] / 1024 / 1024))
            )
        elif event['event_type'] == 'sms':
            usage['sms_count'] = int(usage['sms_count']) + 1

        client.save_state("billing-statestore", usage_key,
                          json.dumps(usage), etag=etag)

        # Check plan limits
        plan = json.loads(
            client.get_state("subscriber-statestore",
                             f"plan:{subscriber_id}").data or '{}'
        )
        check_plan_limits(subscriber_id, usage, plan, client)
```

## Network Alarm Processing

Handle network alarms with severity-based routing:

```python
# network_ops/alarms.py
@app.route('/events/network-alarm', methods=['POST'])
def handle_network_alarm():
    alarm = request.json.get('data', {})
    severity = alarm.get('severity', 'INFO')

    with DaprClient() as client:
        client.save_state("network-statestore",
                          f"alarm:{alarm['alarm_id']}", json.dumps(alarm))

        if severity in ('CRITICAL', 'MAJOR'):
            # Immediately invoke NOC notification
            client.invoke_method(
                app_id="noc-service",
                method_name="alerts/create",
                http_verb="POST",
                data=json.dumps({
                    'alarm': alarm,
                    'priority': 'P1' if severity == 'CRITICAL' else 'P2'
                }).encode()
            )

        # Publish for downstream correlation
        client.publish_event("telecom-pubsub", "network-alarm",
                             json.dumps(alarm))

    return jsonify({'status': 'SUCCESS'})
```

## Fraud Detection Integration

Real-time fraud scoring via service invocation:

```python
def screen_cdr_for_fraud(cdr: dict) -> bool:
    """Returns True if fraudulent"""
    FRAUD_INDICATORS = [
        cdr.get('international_call') and cdr.get('duration', 0) > 7200,  # 2hr+ intl call
        cdr.get('calls_per_hour', 0) > 100,  # High call frequency
        cdr.get('roaming') and cdr.get('data_bytes', 0) > 5e9  # 5GB+ roaming
    ]

    if any(FRAUD_INDICATORS):
        with DaprClient() as client:
            result = client.invoke_method(
                app_id="fraud-scoring-service",
                method_name="score",
                http_verb="POST",
                data=json.dumps(cdr).encode()
            )
            score = json.loads(result.data)
            return score.get('fraud_probability', 0) > 0.85

    return False
```

## Summary

Dapr enables telecommunications microservices at scale through bulk pub/sub for high-volume CDR processing, ETag-based optimistic locking for concurrent usage updates, severity-based routing for network alarms, and real-time fraud detection via service invocation. The uniform Dapr API allows telecom services to swap underlying message brokers (Kafka to Pulsar) without code changes.
