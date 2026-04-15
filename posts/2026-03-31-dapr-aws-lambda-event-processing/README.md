# How to Use Dapr with AWS Lambda for Event Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS Lambda, Serverless, Event Processing, AWS

Description: Integrate Dapr sidecars with AWS Lambda on Kubernetes (via Knative or EKS) to combine Lambda-style event processing with Dapr's microservices building blocks.

---

## Dapr and AWS Lambda Integration Patterns

AWS Lambda functions don't natively run Dapr sidecars (Lambda uses a single-container model). However, there are two primary integration patterns:

1. **Dapr on EKS/Knative**: Run Lambda-compatible workloads on Kubernetes with Dapr sidecars
2. **Dapr as Lambda trigger proxy**: Use a Dapr-enabled service to receive events and forward to Lambda via the AWS Lambda invoke API

## Pattern 1: Lambda-Style Functions on Kubernetes with Dapr

Deploy event-handler containers on EKS with Dapr and Knative for scale-to-zero behavior:

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: order-processor
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-processor"
        dapr.io/app-port: "8080"
        autoscaling.knative.dev/minScale: "0"
        autoscaling.knative.dev/maxScale: "100"
    spec:
      containers:
        - image: myorg/order-processor:latest
          ports:
            - containerPort: 8080
```

## Pattern 2: Dapr Proxy Forwarding to Lambda

Deploy a Dapr-enabled proxy service that subscribes to events and invokes Lambda:

```python
# proxy_service.py - receives Dapr pub/sub and calls Lambda
import boto3
import json
from flask import Flask, request

app = Flask(__name__)
lambda_client = boto3.client('lambda', region_name='us-east-1')

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return json.dumps([{
        'pubsubname': 'pubsub',
        'topic': 'orders',
        'route': '/orders'
    }])

@app.route('/orders', methods=['POST'])
def handle_order():
    event_data = request.json

    # Forward to AWS Lambda
    response = lambda_client.invoke(
        FunctionName='order-processor',
        InvocationType='RequestResponse',
        Payload=json.dumps(event_data)
    )

    result = json.loads(response['Payload'].read())
    print(f"Lambda response: {result}")

    return json.dumps({'status': 'SUCCESS'}), 200
```

## Lambda Function Handler

```python
# lambda_function.py
import json

def lambda_handler(event, context):
    order = event.get('data', {})
    order_id = order.get('orderId')

    print(f"Processing order {order_id}")

    # Store result back via Dapr (via HTTP to proxy)
    import urllib.request
    state_url = f"http://dapr-proxy.default:3500/v1.0/state/statestore"
    payload = json.dumps([{
        'key': f'order-{order_id}',
        'value': {'status': 'processed', 'orderId': order_id}
    }]).encode()

    req = urllib.request.Request(
        state_url,
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    urllib.request.urlopen(req)

    return {'statusCode': 200, 'body': f'Order {order_id} processed'}
```

## Dapr Binding to Trigger Lambda

Use Dapr's AWS Lambda output binding directly:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: lambda-trigger
spec:
  type: bindings.aws.lambda
  version: v1
  metadata:
    - name: functionName
      value: "order-processor"
    - name: region
      value: "us-east-1"
    - name: accessKey
      secretKeyRef:
        name: aws-secret
        key: accessKey
    - name: secretKey
      secretKeyRef:
        name: aws-secret
        key: secretKey
```

Invoke Lambda from any Dapr-enabled service:

```bash
curl -X POST http://localhost:3500/v1.0/bindings/lambda-trigger \
  -H "Content-Type: application/json" \
  -d '{"data": {"orderId": "123", "item": "widget"}, "operation": "invoke"}'
```

## Async Lambda Processing Pattern

```javascript
// Node.js - async event processing via Dapr pub/sub
const express = require('express');
const app = express();
app.use(express.json());

app.get('/dapr/subscribe', (req, res) => {
  res.json([{ pubsubname: 'pubsub', topic: 'orders', route: '/orders' }]);
});

app.post('/orders', async (req, res) => {
  const { data } = req.body;

  // Invoke Lambda async
  const response = await fetch(
    `http://localhost:3500/v1.0/bindings/lambda-trigger`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, operation: 'invoke' })
    }
  );

  res.json({ status: 'SUCCESS' });
});
```

## Summary

Integrating Dapr with AWS Lambda uses either the Dapr AWS Lambda binding for direct invocation or a proxy pattern where a Dapr-enabled Kubernetes service receives pub/sub events and forwards them to Lambda. The binding approach is simpler for outbound triggering, while the proxy pattern gives you the full Dapr building block set (state, tracing, resiliency) for more complex event-driven workflows.
