# How to Configure Dapr with Solace AMQP Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Solace, AMQP, Pub/Sub, Messaging, Enterprise, Microservice

Description: Set up Dapr pub/sub using Solace PubSub+ as the AMQP broker, including component configuration, authentication, and reliable message delivery.

---

## Overview

Solace PubSub+ is an enterprise-grade event broker that supports AMQP 1.0, MQTT, REST, and proprietary protocols. Dapr integrates with Solace via AMQP 1.0, making it a strong choice for organizations that already rely on Solace infrastructure. This guide covers configuring the Dapr AMQP pub/sub component to connect to Solace PubSub+.

## Prerequisites

- Solace PubSub+ broker accessible via AMQP (port 5672 by default)
- Dapr CLI installed and initialized
- Valid Solace credentials and a configured Message VPN

## Solace Configuration

Before connecting Dapr, ensure your Solace broker has:

1. AMQP service enabled on the Message VPN
2. A client username and password configured
3. Topic subscriptions allowed for the client profile

You can verify AMQP connectivity:

```bash
telnet your-solace-host 5672
```

## Dapr Component Definition

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: solace-pubsub
  namespace: default
spec:
  type: pubsub.solace.amqp
  version: v1
  metadata:
    - name: url
      value: "amqp://your-solace-host:5672"
    - name: username
      secretKeyRef:
        name: solace-credentials
        key: username
    - name: password
      secretKeyRef:
        name: solace-credentials
        key: password
```

Create the Kubernetes secret:

```bash
kubectl create secret generic solace-credentials \
  --from-literal=username=dapr-client \
  --from-literal=password=your-password
```

## Using TLS/AMQPS

For production, always use AMQPS (AMQP over TLS):

```yaml
spec:
  type: pubsub.solace.amqp
  version: v1
  metadata:
    - name: url
      value: "amqps://your-solace-host:5671"
    - name: username
      secretKeyRef:
        name: solace-credentials
        key: username
    - name: password
      secretKeyRef:
        name: solace-credentials
        key: password
    - name: caCert
      secretKeyRef:
        name: solace-tls
        key: ca.crt
```

## Publishing Messages

```bash
curl -X POST http://localhost:3500/v1.0/publish/solace-pubsub/trade-events \
  -H "Content-Type: application/json" \
  -d '{"tradeId": "T-9001", "symbol": "AAPL", "price": 185.50}'
```

## Subscribing in Python

```python
from flask import Flask, request

app = Flask(__name__)

@app.route('/trade-events', methods=['POST'])
def handle_trade():
    event = request.json
    data = event.get('data', {})
    print(f"Trade: {data['tradeId']} - {data['symbol']} at {data['price']}")
    return '', 200
```

Declarative subscription:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: trade-sub
spec:
  pubsubname: solace-pubsub
  topic: trade-events
  routes:
    default: /trade-events
```

## Running the Service

```bash
dapr run --app-id trade-processor \
  --app-port 5000 \
  --components-path ./components \
  python app.py
```

## Summary

Dapr's AMQP pub/sub component connects to Solace PubSub+ using the standard AMQP 1.0 protocol, abstracting broker-specific details from your application code. Configure the component with your Solace VPN address and credentials, use AMQPS in production for secure transport, and subscribe to topics using Dapr's standard declarative subscription model. This lets teams migrate to or from Solace without changing application logic.
