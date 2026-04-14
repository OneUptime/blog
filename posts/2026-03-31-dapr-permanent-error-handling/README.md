# How to Handle Permanent Errors in Dapr Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Error Handling, Resiliency, Dead Letter, Microservice

Description: Learn strategies for detecting and handling permanent errors in Dapr applications, including dead letter routing, alerting, and graceful degradation.

---

## Permanent vs Transient Errors

Permanent errors represent failures that will not resolve with retries - invalid input, missing records, authorization failures, or schema mismatches. Retrying these errors wastes resources and delays detection. Dapr applications must distinguish permanent errors early and route them to appropriate handling paths.

## Detecting Permanent Errors in Subscribers

Return a specific status in the response body to signal that a message should not be retried:

```python
from flask import Flask, request, jsonify
import json

app = Flask(__name__)

@app.route("/dapr/subscribe", methods=["GET"])
def subscribe():
    return jsonify([
        {
            "pubsubname": "orders-pubsub",
            "topic": "new-orders",
            "route": "/process-order",
            "deadLetterTopic": "failed-orders"
        }
    ])

@app.route("/process-order", methods=["POST"])
def process_order():
    order = request.get_json()

    validation_error = validate_order(order)
    if validation_error:
        # Return DROP status to signal permanent failure - route to dead letter
        return jsonify({"status": "DROP"}), 200

    try:
        fulfill_order(order)
        return jsonify({"status": "SUCCESS"}), 200
    except Exception as e:
        # Return RETRY status for transient errors - Dapr will retry
        return jsonify({"status": "RETRY"}), 200
```

## Routing Permanent Failures to Dead Letter Topics

Configure the dead letter topic in your subscription:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: order-subscription
spec:
  pubsubname: orders-pubsub
  topic: new-orders
  deadLetterTopic: failed-orders
  routes:
    default: /process-order
```

## Handling Dead Letter Messages

Subscribe to the dead letter topic for human review and alerting:

```python
@app.route("/failed-orders", methods=["POST"])
def handle_failed_order():
    data = request.get_json()
    order = data.get("data", {})

    # Log for investigation
    print(f"Permanent failure for order {order.get('orderId')}: {order}")

    # Store in error table
    store_failed_order(order, reason="permanent-error")

    # Alert on-call team
    notify_ops_team(order)

    return "", 200
```

## Graceful Degradation in Service Invocation

When calling downstream services, handle permanent errors without crashing:

```python
from dapr.clients import DaprClient
from dapr.clients.exceptions import DaprInternalError
import json

def get_customer_profile(customer_id: str) -> dict:
    with DaprClient() as client:
        try:
            response = client.invoke_method(
                app_id="customer-service",
                method_name=f"customers/{customer_id}",
                http_verb="GET"
            )
            return json.loads(response.data)
        except DaprInternalError as e:
            if "404" in str(e):
                # Permanent: customer does not exist, return default
                return {"customerId": customer_id, "tier": "standard"}
            raise  # Re-raise transient errors for retry
```

## Idempotency Keys for Safe Reprocessing

Mark messages with idempotency keys so dead letter reprocessing is safe:

```python
import hashlib
import json

def publish_order(order: dict):
    with DaprClient() as client:
        idempotency_key = hashlib.sha256(
            json.dumps(order, sort_keys=True).encode()
        ).hexdigest()

        client.publish_event(
            pubsub_name="orders-pubsub",
            topic_name="new-orders",
            data=json.dumps(order),
            publish_metadata={"cloudevent.id": idempotency_key}
        )
```

## Summary

Permanent errors in Dapr applications should be surfaced immediately by returning a `DROP` status and routing messages to dead letter topics. Separate dead letter subscribers handle investigation, alerting, and manual reprocessing workflows. Distinguishing permanent from transient failures early prevents retry storms and accelerates incident detection.
