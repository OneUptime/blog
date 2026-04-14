# How to Build IoT Event Processing with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, IoT, Pub/Sub, Event Processing, Stream Processing

Description: Learn how to build scalable IoT event processing pipelines using Dapr pub/sub for reliable sensor data ingestion and downstream routing.

---

IoT deployments generate millions of events per day from sensors, actuators, and connected devices. Dapr pub/sub provides the reliable event pipeline that ingests this data, routes it to the right processors, and fans out to analytics, storage, and alerting systems.

## IoT Event Processing Architecture

```text
Device -> MQTT/HTTP Gateway -> Dapr Pub/Sub
                                -> Raw Storage (all events)
                                -> Anomaly Detector
                                -> Aggregator (rolling stats)
                                -> Alert Engine (threshold checks)
```

## Ingest IoT Events

A thin ingestion service receives device payloads and publishes to Dapr:

```python
from flask import Flask, request, jsonify
from dapr.clients import DaprClient
import json
import time

app = Flask(__name__)

@app.route('/ingest', methods=['POST'])
def ingest_event():
    raw = request.json

    event = {
        "deviceId": raw["device_id"],
        "sensorType": raw["sensor"],
        "value": raw["value"],
        "unit": raw.get("unit", ""),
        "location": raw.get("location", {}),
        "timestamp": raw.get("ts", int(time.time() * 1000)),
        "ingestionTime": int(time.time() * 1000)
    }

    with DaprClient() as client:
        client.publish_event(
            pubsub_name='pubsub',
            topic_name='iot-events',
            data=json.dumps(event),
            publish_metadata={"partitionKey": event["deviceId"]}
        )

    return jsonify({"status": "accepted"}), 202

app.run(port=5000)
```

## Fan-Out with Topic Routing

Use Dapr topic routing to route different event types to specialized processors:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: iot-event-router
spec:
  pubsubname: pubsub
  topic: iot-events
  routes:
    rules:
      - match: event.data.sensorType == "temperature"
        path: /process-temperature
      - match: event.data.sensorType == "motion"
        path: /process-motion
      - match: event.data.sensorType == "power"
        path: /process-power
    default: /process-generic
```

## Temperature Anomaly Detection

```python
@app.route('/process-temperature', methods=['POST'])
def process_temperature():
    event = request.json['data']
    device_id = event['deviceId']
    temp = event['value']

    # Get historical average from Dapr state
    with DaprClient() as client:
        history_data = client.get_state('statestore', f'temp-avg:{device_id}').data
        history = json.loads(history_data or '{"avg": 20, "count": 0}')

        # Update rolling average
        count = history['count']
        new_avg = (history['avg'] * count + temp) / (count + 1)
        history = {'avg': new_avg, 'count': count + 1}
        client.save_state('statestore', f'temp-avg:{device_id}', json.dumps(history))

        # Anomaly: temperature > 2 standard deviations from average
        if abs(temp - new_avg) > 2 * 5:  # Simplified std dev check
            client.publish_event('pubsub', 'iot-anomalies', json.dumps({
                "deviceId": device_id,
                "sensorType": "temperature",
                "value": temp,
                "expectedAvg": new_avg,
                "severity": "high" if abs(temp - new_avg) > 20 else "medium"
            }))

    return '', 200
```

## Aggregate Events for Analytics

Compute per-device per-minute aggregates:

```python
@app.route('/process-generic', methods=['POST'])
def process_generic():
    event = request.json['data']
    device_id = event['deviceId']
    minute_bucket = event['timestamp'] // 60000 * 60000  # Round to minute

    agg_key = f"agg:{device_id}:{minute_bucket}"

    with DaprClient() as client:
        agg_data = client.get_state('statestore', agg_key).data
        agg = json.loads(agg_data or '{"count": 0, "sum": 0, "min": null, "max": null}')

        agg['count'] += 1
        agg['sum'] += event['value']
        agg['min'] = min(agg['min'], event['value']) if agg['min'] is not None else event['value']
        agg['max'] = max(agg['max'], event['value']) if agg['max'] is not None else event['value']

        client.save_state('statestore', agg_key, json.dumps(agg),
                         state_metadata={"ttlInSeconds": "3600"})

    return '', 200
```

## Forward to Time-Series Database

For persistent storage, use a Dapr output binding:

```python
with DaprClient() as client:
    client.invoke_binding(
        binding_name='influxdb-sink',
        operation='create',
        data=json.dumps({
            "measurement": event['sensorType'],
            "tags": {"deviceId": event['deviceId'], "location": event['location'].get('zone', 'unknown')},
            "fields": {"value": event['value']},
            "timestamp": event['timestamp']
        })
    )
```

## Summary

Dapr pub/sub creates a scalable IoT event processing pipeline by decoupling ingestion from processing. Partition keys ensure ordered delivery per device. Topic routing rules fan events to specialized processors based on sensor type. Dapr state maintains per-device rolling aggregates and anomaly baselines without separate database connections. Output bindings write to time-series databases for long-term storage without SDK dependencies.
