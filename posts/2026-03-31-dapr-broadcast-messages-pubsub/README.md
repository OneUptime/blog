# How to Implement Broadcast Messages with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Broadcast, Messaging, Microservice

Description: Learn how to implement broadcast messaging with Dapr Pub/Sub to fan out a single published event to multiple independent subscriber services simultaneously.

---

Broadcast messaging, also known as fan-out, lets a single publisher send one message that is delivered to every subscriber of a topic. Dapr Pub/Sub natively supports this pattern - every service that subscribes to the same topic receives a copy of each message.

## How Broadcast Works in Dapr

When multiple services subscribe to the same topic on the same Pub/Sub component, Dapr delivers the message to each subscriber independently. This is different from competing consumers, where only one subscriber receives each message.

## Pub/Sub Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-master:6379"
  - name: consumerID
    value: "{appID}"
```

The `consumerID` set to `{appID}` ensures each app gets its own consumer group, which guarantees broadcast delivery rather than competing-consumer behavior.

## Publisher

```python
import requests

def broadcast_config_update(config: dict):
    url = "http://localhost:3500/v1.0/publish/pubsub/config-updates"
    requests.post(url, json=config)
    print(f"Broadcasted config update: {config}")

broadcast_config_update({
    "featureFlags": {"darkMode": True, "betaFeatures": False},
    "version": "2.1.0"
})
```

## Subscriber Service A - UI Service

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([{
        "pubsubname": "pubsub",
        "topic": "config-updates",
        "route": "/config-updates"
    }])

@app.route('/config-updates', methods=['POST'])
def handle_config():
    event = request.json
    data = event.get('data', {})
    feature_flags = data.get('featureFlags', {})
    print(f"UI Service: Reloading feature flags - {feature_flags}")
    # Apply new feature flags to the UI service
    return jsonify({"status": "SUCCESS"})
```

## Subscriber Service B - Cache Service

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([{
        "pubsubname": "pubsub",
        "topic": "config-updates",
        "route": "/config-updates"
    }])

@app.route('/config-updates', methods=['POST'])
def handle_config():
    event = request.json
    data = event.get('data', {})
    version = data.get('version')
    print(f"Cache Service: Invalidating cache for version {version}")
    # Flush caches to pick up new configuration
    return jsonify({"status": "SUCCESS"})
```

## Running Multiple Subscribers

```bash
# Start UI service with its own app ID
dapr run --app-id ui-service --app-port 5001 -- python ui_service.py

# Start cache service with its own app ID
dapr run --app-id cache-service --app-port 5002 -- python cache_service.py

# Publish a broadcast message
dapr publish --publish-app-id publisher \
  --pubsub pubsub \
  --topic config-updates \
  --data '{"featureFlags":{"darkMode":true},"version":"2.1.0"}'
```

## Verifying Broadcast Delivery

```bash
# Check logs for both services to confirm delivery
kubectl logs -l app=ui-service | grep "Reloading feature flags"
kubectl logs -l app=cache-service | grep "Invalidating cache"
```

## Summary

Dapr Pub/Sub supports broadcast messaging natively when each subscriber service uses a unique app ID, causing each to receive every published message. This pattern is ideal for configuration updates, cache invalidation, and system-wide notifications where every service must act on the same event.
