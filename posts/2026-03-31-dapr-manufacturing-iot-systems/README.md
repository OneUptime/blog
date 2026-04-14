# How to Use Dapr for Manufacturing IoT Systems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, IoT, Manufacturing, Kubernetes, Binding

Description: Learn how to use Dapr to process manufacturing IoT telemetry, trigger alerts, manage device state, and integrate with SCADA systems at scale.

---

## Manufacturing IoT and Dapr

Smart factories generate millions of sensor readings per hour from PLCs, CNC machines, conveyor belts, and environmental monitors. Dapr's bindings and pub/sub building blocks bridge the gap between OT (operational technology) and IT, processing events without tightly coupling device firmware to cloud APIs.

## Ingesting Sensor Data with Input Bindings

Use Dapr's MQTT binding to subscribe to machine telemetry:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: factory-mqtt
  namespace: manufacturing
spec:
  type: bindings.mqtt3
  version: v1
  metadata:
  - name: url
    value: "mqtt://factory-broker:1883"
  - name: topic
    value: "factory/+/telemetry"
  - name: retain
    value: "false"
```

Your telemetry processor receives POST requests for each message:

```python
from flask import Flask, request
import json

app = Flask(__name__)

@app.route("/factory-mqtt", methods=["POST"])
def process_telemetry():
    payload = request.get_json()
    machine_id = payload.get("machineId")
    temperature = payload.get("temperature")
    vibration = payload.get("vibration")

    if temperature > 85.0:
        trigger_overheat_alert(machine_id, temperature)

    store_reading(machine_id, temperature, vibration)
    return "", 200
```

## Device State with Dapr State Store

Track last-known state for each machine:

```python
from dapr.clients import DaprClient
import json

def update_machine_state(machine_id: str, reading: dict):
    with DaprClient() as client:
        current = client.get_state(
            store_name="factory-state",
            key=f"machine:{machine_id}"
        )
        state = json.loads(current.data) if current.data else {}
        state.update({
            "lastReading": reading,
            "updatedAt": "2026-03-31T08:00:00Z",
            "status": "running"
        })
        client.save_state(
            store_name="factory-state",
            key=f"machine:{machine_id}",
            value=json.dumps(state)
        )
```

## Alert Fan-Out with Pub/Sub

Publish machine fault events so multiple systems can react:

```python
def trigger_overheat_alert(machine_id: str, temperature: float):
    with DaprClient() as client:
        alert = {
            "machineId": machine_id,
            "alertType": "OVERHEAT",
            "temperature": temperature,
            "threshold": 85.0,
            "timestamp": "2026-03-31T08:00:00Z"
        }
        client.publish_event(
            pubsub_name="factory-pubsub",
            topic_name="machine-alerts",
            data=json.dumps(alert),
            data_content_type="application/json"
        )
```

Subscribe the maintenance ticketing system and SCADA dashboard to the same topic.

## Sending Commands to Machines via Output Bindings

Use a Kafka output binding to queue commands back to edge controllers:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: machine-commands
spec:
  type: bindings.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka-broker:9092"
  - name: publishTopic
    value: "machine-commands"
```

```bash
curl -X POST http://localhost:3500/v1.0/bindings/machine-commands \
  -H "Content-Type: application/json" \
  -d '{"data": {"machineId": "cnc-007", "command": "EMERGENCY_STOP"}, "operation": "create"}'
```

## Summary

Dapr simplifies manufacturing IoT architectures by providing MQTT input bindings for sensor ingestion, state management for device tracking, and pub/sub for multi-consumer alert distribution. Output bindings enable safe command dispatch back to edge controllers. The sidecar model keeps edge services lightweight and protocol-agnostic.
