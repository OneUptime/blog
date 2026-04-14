# How to Build IoT Data Ingestion with Dapr MQTT Binding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, MQTT, IoT, Input Binding, Edge Computing, Microservice

Description: Learn how to ingest IoT telemetry data from MQTT brokers into your microservices architecture using Dapr's MQTT input binding for scalable, cloud-native IoT data pipelines.

---

MQTT is the de-facto protocol for IoT devices: it is lightweight, works over unreliable networks, and supports millions of concurrent connections through brokers like Mosquitto, EMQX, and HiveMQ. Dapr's MQTT input binding lets your microservices subscribe to MQTT topics without embedding an MQTT client library - the Dapr sidecar handles the broker connection, message deserialization, and delivers events to your app via HTTP. This guide builds a complete IoT telemetry ingestion pipeline using Dapr's MQTT binding.

## Architecture Overview

```text
IoT Devices          MQTT Broker         Dapr Sidecar        App Service
  +--------+          +---------+         +-----------+       +----------+
  | Sensor | -MQTT--> | EMQX /  | <------ | MQTT      | HTTP  | Telemetry|
  | Device |          | Mosquitto|        | Binding   | ----> | Processor|
  +--------+          +---------+         +-----------+       +----------+
                                                                    |
                                                              Dapr State/
                                                              Pub/Sub/DB
```

The Dapr sidecar acts as the MQTT subscriber. When a message arrives on the subscribed topic, Dapr delivers it to your app over HTTP POST. Your app responds with a status to acknowledge or reject the message.

## Setting Up the MQTT Broker

For local development, use Eclipse Mosquitto:

```bash
# docker-compose.yaml (local MQTT broker)
version: "3.9"
services:
  mosquitto:
    image: eclipse-mosquitto:2.0
    ports:
      - "1883:1883"
      - "9001:9001"
    volumes:
      - ./mosquitto.conf:/mosquitto/config/mosquitto.conf
```

```text
# mosquitto.conf
listener 1883
allow_anonymous true
listener 9001
protocol websockets
```

For production, consider EMQX or HiveMQ Cloud. Start the broker:

```bash
docker compose up -d mosquitto
```

## Configuring the Dapr MQTT Input Binding

```yaml
# components/mqtt-binding.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: iot-telemetry
spec:
  type: bindings.mqtt3
  version: v1
  metadata:
  - name: url
    value: "tcp://mosquitto:1883"
  - name: topic
    value: "devices/+/telemetry"   # Wildcard: subscribe to all device telemetry topics
  - name: qos
    value: "1"                      # At-least-once delivery
  - name: retain
    value: "false"
  - name: cleanSession
    value: "true"
  - name: consumerID
    value: "dapr-iot-ingestion"
  - name: backOffMaxRetries
    value: "10"
```

For TLS-secured MQTT brokers:

```yaml
# components/mqtt-tls-binding.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: iot-telemetry-secure
spec:
  type: bindings.mqtt3
  version: v1
  metadata:
  - name: url
    value: "ssl://broker.hivemq.cloud:8883"
  - name: topic
    value: "factory/+/+/telemetry"
  - name: qos
    value: "1"
  - name: username
    secretKeyRef:
      name: mqtt-credentials
      key: username
  - name: password
    secretKeyRef:
      name: mqtt-credentials
      key: password
  - name: caCert
    secretKeyRef:
      name: mqtt-credentials
      key: caCert
```

## Implementing the Telemetry Processor

The Dapr MQTT binding calls `POST /<binding-name>` on your app with the MQTT message payload:

```python
# telemetry_processor.py
import json
import os
import time
from dataclasses import dataclass
from typing import Optional
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

DAPR_PORT = int(os.environ.get("DAPR_HTTP_PORT", 3500))
DAPR_URL = f"http://localhost:{DAPR_PORT}/v1.0"

@dataclass
class DeviceTelemetry:
    device_id: str
    temperature: float
    humidity: float
    battery: float
    timestamp: int

def parse_mqtt_topic(topic: str) -> Optional[str]:
    """Extract device ID from MQTT topic: devices/<device_id>/telemetry"""
    parts = topic.split("/")
    if len(parts) >= 2:
        return parts[1]
    return None

def save_telemetry(device_id: str, telemetry: DeviceTelemetry):
    """Save latest device state via Dapr state store."""
    requests.post(
        f"{DAPR_URL}/state/statestore",
        json=[{
            "key": f"device-{device_id}-latest",
            "value": {
                "deviceId": device_id,
                "temperature": telemetry.temperature,
                "humidity": telemetry.humidity,
                "battery": telemetry.battery,
                "timestamp": telemetry.timestamp,
                "updatedAt": int(time.time())
            },
            "metadata": {
                "ttlInSeconds": "3600"  # Expire stale device state after 1 hour
            }
        }]
    )

def publish_alert(device_id: str, alert_type: str, value: float):
    """Publish an alert event for anomalous readings."""
    requests.post(
        f"{DAPR_URL}/publish/pubsub/device-alerts",
        json={
            "deviceId": device_id,
            "alertType": alert_type,
            "value": value,
            "timestamp": int(time.time())
        }
    )

@app.route("/iot-telemetry", methods=["POST"])
def handle_telemetry():
    """Dapr MQTT binding delivers messages to this endpoint."""
    data = request.json
    
    # Dapr binding delivers: {"data": "<payload>", "metadata": {"topic": "..."}}
    payload_str = data.get("data", "{}")
    metadata = data.get("metadata", {})
    topic = metadata.get("topic", "")
    
    try:
        payload = json.loads(payload_str) if isinstance(payload_str, str) else payload_str
    except json.JSONDecodeError:
        print(f"Invalid JSON payload: {payload_str}")
        return jsonify({"status": "DROP"}), 200  # Drop malformed messages

    device_id = parse_mqtt_topic(topic) or payload.get("deviceId", "unknown")
    
    telemetry = DeviceTelemetry(
        device_id=device_id,
        temperature=float(payload.get("temperature", 0)),
        humidity=float(payload.get("humidity", 0)),
        battery=float(payload.get("battery", 100)),
        timestamp=int(payload.get("timestamp", time.time()))
    )
    
    # Save latest state
    save_telemetry(device_id, telemetry)
    
    # Check thresholds and publish alerts
    if telemetry.temperature > 80.0:
        publish_alert(device_id, "HIGH_TEMPERATURE", telemetry.temperature)
        print(f"ALERT: Device {device_id} temperature {telemetry.temperature}C exceeds 80C")
    
    if telemetry.battery < 10.0:
        publish_alert(device_id, "LOW_BATTERY", telemetry.battery)
        print(f"ALERT: Device {device_id} battery at {telemetry.battery}%")
    
    print(f"Telemetry ingested: device={device_id} temp={telemetry.temperature} hum={telemetry.humidity}")
    
    return jsonify({"status": "SUCCESS"}), 200

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
```

## Publishing Test Messages

Simulate IoT device telemetry for testing:

```bash
# Install mosquitto client
brew install mosquitto  # macOS
# apt install mosquitto-clients  # Ubuntu

# Publish a test telemetry message
mosquitto_pub \
  -h localhost \
  -p 1883 \
  -t "devices/sensor-001/telemetry" \
  -m '{"deviceId":"sensor-001","temperature":72.5,"humidity":45.2,"battery":87.0,"timestamp":1710000000}'

# Simulate a high-temperature alert
mosquitto_pub \
  -h localhost \
  -p 1883 \
  -t "devices/furnace-01/telemetry" \
  -m '{"deviceId":"furnace-01","temperature":95.0,"humidity":10.0,"battery":100.0,"timestamp":1710000001}'

# Publish 100 test messages
for i in $(seq 1 100); do
  mosquitto_pub \
    -h localhost \
    -p 1883 \
    -t "devices/sensor-$(printf "%03d" $i)/telemetry" \
    -m "{\"deviceId\":\"sensor-$(printf "%03d" $i)\",\"temperature\":$(echo "20 + $RANDOM % 60" | bc),\"humidity\":$(echo "30 + $RANDOM % 40" | bc),\"battery\":$(echo "20 + $RANDOM % 80" | bc),\"timestamp\":$(date +%s)}"
done
```

## Running with Dapr

```bash
dapr run \
  --app-id iot-ingestion \
  --app-port 5000 \
  --dapr-http-port 3500 \
  --resources-path ./components \
  -- python telemetry_processor.py
```

## Summary

Dapr's MQTT input binding provides a clean integration layer between MQTT-based IoT devices and cloud-native microservices. The Dapr sidecar manages the broker connection, topic subscription, and at-least-once delivery semantics, delivering messages to your app via a simple HTTP POST. Your application code remains free of MQTT client dependencies, making it easy to switch brokers or protocols by changing the component manifest. Combine the MQTT binding with Dapr's state store for device twin state and pub/sub for alert routing to build a complete, scalable IoT ingestion pipeline.
