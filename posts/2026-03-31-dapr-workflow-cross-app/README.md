# How to Execute Workflows Across Multiple Dapr Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Cross-Application, Microservice, Orchestration

Description: Coordinate workflows across multiple Dapr applications using child workflows, service invocation, and pub/sub to orchestrate complex multi-service processes.

---

Real-world workflows often span multiple microservices. Dapr supports cross-application workflow patterns through child workflows, service invocation from activities, and pub/sub coordination. This guide covers the approaches and trade-offs for each.

## Approach 1: Child Workflows Across Services

A parent workflow in Service A can call a child workflow registered in Service B. Both services must be running and connected to the same Dapr workflow backend.

```python
# In order-service: parent workflow
from dapr.ext.workflow import DaprWorkflowContext

def order_fulfillment_workflow(ctx: DaprWorkflowContext, order: dict):
    # Call child workflow in payment-service using app_id
    payment_result = yield ctx.call_child_workflow(
        workflow="payment_workflow",
        input={"order_id": order["id"], "amount": order["total"]},
        instance_id=f"payment-{order['id']}",
        app_id="payment-service"
    )
    if not payment_result.get("success"):
        return {"status": "payment_failed"}

    shipping_result = yield ctx.call_child_workflow(
        workflow="shipping_workflow",
        input={"order_id": order["id"], "address": order["address"]},
        instance_id=f"shipping-{order['id']}",
        app_id="shipping-service"
    )

    return {"status": "fulfilled", "tracking": shipping_result.get("tracking_number")}
```

## Approach 2: Activities Call Other Services

The recommended pattern is to use activities as the boundary for cross-service calls:

```python
# Activity in order-service calls payment-service via Dapr service invocation
import json
from dapr.clients import DaprClient
from dapr.ext.workflow import WorkflowActivityContext

def charge_payment_activity(ctx: WorkflowActivityContext, order: dict) -> dict:
    with DaprClient() as client:
        response = client.invoke_method(
            app_id="payment-service",
            method_name="charge",
            data=json.dumps({"order_id": order["id"], "amount": order["total"]}),
            content_type="application/json"
        )
        return response.json()
```

This activity is part of the `order-service` workflow but delegates the actual payment logic to `payment-service`.

## Approach 3: Pub/Sub Coordination

Services publish events when their portion of work completes. Another service's workflow subscribes and continues:

```python
# payment-service publishes completion event
import json
from dapr.clients import DaprClient

def complete_payment(order_id: str, result: dict):
    with DaprClient() as client:
        client.publish_event(
            pubsub_name="pubsub",
            topic_name="payment-completed",
            data=json.dumps({"order_id": order_id, **result})
        )
```

```python
# order-service workflow waits for the event
def order_workflow_with_pubsub(ctx: DaprWorkflowContext, order: dict):
    yield ctx.call_activity(trigger_payment, input=order)

    # Wait for async payment completion event
    payment_result = yield ctx.wait_for_external_event("payment-result")

    if payment_result.get("success"):
        yield ctx.call_activity(ship_order, input={**order, "payment": payment_result})

    return payment_result
```

The pub/sub subscriber raises the event to the workflow:

```python
from dapr.ext.grpc import App
from dapr.ext.workflow import DaprWorkflowClient

app = App()
workflow_client = DaprWorkflowClient()

@app.subscribe(pubsub_name="pubsub", topic="payment-completed")
def on_payment_completed(event) -> None:
    data = event.data
    instance_id = f"order-{data['order_id']}"
    workflow_client.raise_workflow_event(instance_id, "payment-result", data=data)
```

## Cross-Namespace Workflow Coordination in Kubernetes

When services span different Kubernetes namespaces, configure Dapr app IDs with namespace:

```python
# In the calling activity
app_id = "payment-service.production"  # namespace-qualified
```

```yaml
# Ensure the namespace is allowed in Dapr access control
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  accessControl:
    defaultAction: deny
    trustDomain: cluster.local
    policies:
    - appId: order-service
      defaultAction: deny
      namespace: production
      operations:
      - name: /charge
        httpVerb: ["POST"]
        action: allow
```

## Choosing the Right Pattern

| Pattern | Best For |
|---|---|
| Activity with service invocation | Strong coupling, synchronous cross-service calls |
| Child workflow | Reusable sub-workflows with their own state |
| Pub/Sub coordination | Loose coupling, async completion, event-driven |

## Summary

Cross-application workflow coordination in Dapr is best achieved by keeping the orchestrator in one service and using activities as the mechanism for calling other services. Service invocation from activities provides synchronous cross-service calls, while pub/sub with external events enables fully asynchronous coordination. Choose the pattern based on your coupling requirements and the desired failure isolation between services.
