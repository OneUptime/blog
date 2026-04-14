# How to Build IoT Telemetry Storage with Dapr State Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, IoT, State Management, Telemetry, Time Series

Description: Learn how to store and query IoT telemetry using Dapr state management for current device readings and output bindings for historical data.

---

IoT telemetry storage has two distinct access patterns: fast lookup of the current device reading (device shadow), and historical time-series queries for analytics and trend analysis. Dapr state management serves the hot path while output bindings write to time-series databases for the cold path.

## Two-Tier Storage Architecture

```text
Device Telemetry -> Dapr Pub/Sub -> Telemetry Handler
                                      -> Dapr State (latest readings - hot path)
                                      -> InfluxDB Binding (historical - cold path)
                                      -> Anomaly Checker
```

## Store Latest Readings in Dapr State

```python
from flask import Flask, request
from dapr.clients import DaprClient
import json
import time

app = Flask(__name__)

@app.route('/iot-telemetry', methods=['POST'])
def handle_telemetry():
    event = request.json
    telemetry = event['data']

    with DaprClient() as client:
        # Store latest reading per device per sensor type
        key = f"latest:{telemetry['deviceId']}:{telemetry['sensorType']}"
        reading = {
            "value": telemetry['value'],
            "unit": telemetry.get('unit', ''),
            "timestamp": telemetry['timestamp'],
            "storedAt": int(time.time() * 1000)
        }

        client.save_state(
            store_name='statestore',
            key=key,
            value=json.dumps(reading),
            state_metadata={"ttlInSeconds": "86400"}  # 24 hour TTL
        )

        # Store device summary (all sensors)
        update_device_summary(client, telemetry)

        # Write to time-series database
        store_historical(client, telemetry)

    return '', 200
```

## Update Device Summary

Store a single key with all recent sensor readings per device:

```python
def update_device_summary(client, telemetry: dict):
    device_key = f"device-summary:{telemetry['deviceId']}"

    # Get existing summary
    existing = client.get_state('statestore', device_key).data
    summary = json.loads(existing or '{"sensors": {}}')

    summary['sensors'][telemetry['sensorType']] = {
        "value": telemetry['value'],
        "unit": telemetry.get('unit', ''),
        "timestamp": telemetry['timestamp']
    }
    summary['lastSeen'] = telemetry['timestamp']
    summary['deviceId'] = telemetry['deviceId']

    client.save_state(
        store_name='statestore',
        key=device_key,
        value=json.dumps(summary),
        state_metadata={"ttlInSeconds": "3600"}
    )
```

## Write to InfluxDB via Output Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: influxdb-sink
spec:
  type: bindings.influx
  version: v1
  metadata:
  - name: url
    value: http://influxdb:8086
  - name: token
    secretKeyRef:
      name: influx-secrets
      key: token
  - name: org
    value: iot-org
  - name: bucket
    value: telemetry
```

```python
def store_historical(client, telemetry: dict):
    point = {
        "measurement": telemetry['sensorType'],
        "tags": {
            "deviceId": telemetry['deviceId'],
            "location": telemetry.get('location', {}).get('zone', 'unknown')
        },
        "fields": {
            "value": float(telemetry['value'])
        },
        "timestamp": telemetry['timestamp']
    }

    client.invoke_binding(
        binding_name='influxdb-sink',
        operation='create',
        data=json.dumps(point)
    )
```

## Query Current Device State

```python
@app.route('/devices/<device_id>/readings', methods=['GET'])
def get_device_readings(device_id: str):
    with DaprClient() as client:
        summary = client.get_state('statestore', f'device-summary:{device_id}').data

    if not summary:
        return {'error': 'Device not found or no readings'}, 404

    return json.loads(summary), 200

@app.route('/devices/<device_id>/sensors/<sensor_type>', methods=['GET'])
def get_sensor_reading(device_id: str, sensor_type: str):
    with DaprClient() as client:
        reading = client.get_state('statestore', f'latest:{device_id}:{sensor_type}').data

    if not reading:
        return {'error': 'No reading found'}, 404

    return json.loads(reading), 200
```

## Bulk Device Query

Retrieve readings for a fleet of devices:

```python
@app.route('/fleet/summaries', methods=['POST'])
def get_fleet_summaries():
    device_ids = request.json.get('deviceIds', [])

    with DaprClient() as client:
        results = {}
        for device_id in device_ids:
            data = client.get_state('statestore', f'device-summary:{device_id}').data
            if data:
                results[device_id] = json.loads(data)

    return results, 200
```

## Summary

Dapr state management serves as a fast device shadow store for the latest sensor readings, with TTL-based expiry for stale devices. Output bindings write the same telemetry events to InfluxDB or other time-series databases for historical analytics without SDK dependencies in the telemetry handler. This two-tier pattern gives low-latency current-state lookups alongside full historical retention for trend analysis and alerting.
