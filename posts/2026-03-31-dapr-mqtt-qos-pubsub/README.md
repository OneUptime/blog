# How to Configure MQTT QoS Levels for Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, MQTT, QoS, Pub/Sub, IoT

Description: Configure MQTT Quality of Service levels for Dapr pub/sub connections to MQTT brokers, covering QoS 0, 1, and 2 trade-offs for IoT and event-driven applications.

---

## MQTT QoS Levels Overview

MQTT defines three Quality of Service levels for message delivery:

- **QoS 0** - At most once: fire and forget, no acknowledgment
- **QoS 1** - At least once: acknowledged delivery, duplicates possible
- **QoS 2** - Exactly once: four-way handshake, highest overhead

Choosing the right level involves balancing throughput, latency, and delivery guarantees.

## Dapr MQTT Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mqtt-pubsub
  namespace: default
spec:
  type: pubsub.mqtt3
  version: v1
  metadata:
    - name: url
      value: "tcp://mosquitto:1883"
    - name: qos
      value: "1"
    - name: retain
      value: "false"
    - name: cleanSession
      value: "true"
    - name: consumerID
      value: "dapr-{podName}"
```

## QoS 0 - High-Throughput Telemetry

Use QoS 0 for high-volume sensor data where occasional loss is acceptable:

```yaml
metadata:
  - name: qos
    value: "0"
  - name: cleanSession
    value: "true"
```

```python
from dapr.clients import DaprClient
import json
import time

# Temperature sensor - send thousands per second, some loss is fine
with DaprClient() as client:
    while True:
        client.publish_event(
            pubsub_name="mqtt-pubsub",
            topic_name="sensors/temperature",
            data=json.dumps({"value": 23.5, "ts": time.time()}),
            data_content_type="application/json"
        )
        time.sleep(0.1)
```

## QoS 1 - Reliable Event Delivery

Use QoS 1 for events that must be delivered but can tolerate deduplication in the consumer:

```yaml
metadata:
  - name: qos
    value: "1"
  - name: cleanSession
    value: "false"
  - name: retain
    value: "false"
```

Make your subscriber idempotent to handle potential duplicates:

```python
processed_ids = set()

def handle_event(event_data):
    event_id = event_data.get("eventId")
    if event_id in processed_ids:
        return  # Duplicate - skip
    processed_ids.add(event_id)
    # process...
```

## QoS 2 - Exactly-Once Critical Events

Use QoS 2 for financial transactions or control commands:

```yaml
metadata:
  - name: qos
    value: "2"
  - name: cleanSession
    value: "false"
```

Note: QoS 2 adds 2x round-trips per message. Reserve it for truly critical, low-volume commands.

## TLS with MQTT

```yaml
metadata:
  - name: url
    value: "ssl://mosquitto:8883"
  - name: caCert
    secretKeyRef:
      name: mqtt-tls-secret
      key: ca.crt
  - name: clientCert
    secretKeyRef:
      name: mqtt-tls-secret
      key: tls.crt
  - name: clientKey
    secretKeyRef:
      name: mqtt-tls-secret
      key: tls.key
```

## Authentication with Username/Password

Credentials are embedded directly in the broker URL:

```yaml
metadata:
  - name: url
    value: "tcp://myuser:mypassword@mosquitto:1883"
```

## Subscription Example

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: temperature-sub
spec:
  pubsubname: mqtt-pubsub
  topic: sensors/temperature
  routes:
    default: /temperature
```

MQTT wildcard topics can be used with `+` (single level) and `#` (multi-level):

```yaml
topic: sensors/+/temperature  # Any single-level between sensors/ and /temperature
```

## Summary

Dapr MQTT pub/sub QoS is configured via the `qos` metadata field and applies to both publish and subscribe operations. Use QoS 0 for high-frequency telemetry to maximize throughput, QoS 1 for reliable event delivery with idempotent consumers, and QoS 2 only for low-volume critical commands where exactly-once delivery justifies the overhead. Set `cleanSession: "false"` with QoS 1 or 2 so the broker retains subscription state across reconnects.
