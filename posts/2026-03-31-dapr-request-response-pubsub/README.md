# How to Implement Request-Response over Pub/Sub with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Messaging, Request-Response, Microservice

Description: Learn how to implement a request-response pattern over Dapr Pub/Sub using correlation IDs and reply topics for asynchronous bidirectional communication.

---

The request-response pattern over Pub/Sub combines asynchronous messaging with the expectation of a reply. Unlike direct service invocation, this approach decouples the requester from the responder and can handle temporary unavailability of either party.

## Architecture Overview

The pattern works by:
1. The requester publishes to a request topic with a correlation ID and a reply-to topic.
2. The responder processes the request and publishes back to the reply-to topic.
3. The requester correlates the response using the correlation ID.

## Pub/Sub Component

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
```

## Requester Service

```python
import requests
import uuid
import time
from flask import Flask, request, jsonify

app = Flask(__name__)
DAPR_HTTP_PORT = 3500
pending_requests = {}

def send_request(payload: dict) -> str:
    correlation_id = str(uuid.uuid4())
    pending_requests[correlation_id] = None

    message = {
        "correlationId": correlation_id,
        "replyTo": "responses",
        "payload": payload
    }
    requests.post(
        f"http://localhost:{DAPR_HTTP_PORT}/v1.0/publish/pubsub/requests",
        json=message
    )
    return correlation_id

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([{"pubsubname": "pubsub", "topic": "responses", "route": "/responses"}])

@app.route('/responses', methods=['POST'])
def handle_response():
    event = request.json
    data = event.get('data', {})
    correlation_id = data.get('correlationId')
    result = data.get('result')
    if correlation_id in pending_requests:
        pending_requests[correlation_id] = result
        print(f"Received response for {correlation_id}: {result}")
    return jsonify({"status": "SUCCESS"})
```

## Responder Service

```python
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)
DAPR_HTTP_PORT = 3501

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([{"pubsubname": "pubsub", "topic": "requests", "route": "/requests"}])

@app.route('/requests', methods=['POST'])
def handle_request():
    event = request.json
    data = event.get('data', {})
    correlation_id = data.get('correlationId')
    reply_to = data.get('replyTo')
    payload = data.get('payload')

    # Process the request
    result = {"processed": True, "input": payload, "computedValue": 42}

    # Publish the response back
    response_message = {
        "correlationId": correlation_id,
        "result": result
    }
    requests.post(
        f"http://localhost:{DAPR_HTTP_PORT}/v1.0/publish/pubsub/{reply_to}",
        json=response_message
    )
    return jsonify({"status": "SUCCESS"})
```

## Running the Services

```bash
# Start the responder
dapr run --app-id responder --app-port 5002 --dapr-http-port 3501 -- python responder.py

# Start the requester
dapr run --app-id requester --app-port 5001 --dapr-http-port 3500 -- python requester.py
```

## Adding a Timeout

Implement a timeout mechanism on the requester side to avoid waiting indefinitely:

```python
def wait_for_response(correlation_id: str, timeout: int = 30) -> dict:
    start = time.time()
    while time.time() - start < timeout:
        if pending_requests.get(correlation_id) is not None:
            return pending_requests.pop(correlation_id)
        time.sleep(0.1)
    pending_requests.pop(correlation_id, None)
    raise TimeoutError(f"No response received for {correlation_id} within {timeout}s")
```

## Summary

Implementing request-response over Dapr Pub/Sub enables asynchronous bidirectional communication between microservices. The correlation ID ties requests to their responses, and the reply-to topic pattern keeps services decoupled. Always implement timeouts and consider using dead-letter topics to handle undeliverable replies.
