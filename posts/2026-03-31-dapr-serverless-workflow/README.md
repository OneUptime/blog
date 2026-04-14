# How to Implement Serverless Workflow with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Serverless, Orchestration, Event-Driven

Description: Build serverless-style long-running workflows with Dapr Workflow that scale to zero, handling multi-step business processes with built-in durability.

---

## Dapr Workflow for Serverless Orchestration

Dapr Workflow provides durable, stateful orchestration for multi-step business processes. Combined with KEDA or Knative for scale-to-zero, you can build workflows that start on demand, execute potentially long-running processes, and cost nothing when idle - the core value proposition of serverless.

## Why Dapr Workflow over Traditional Orchestrators

- **No external orchestration service needed**: Dapr Workflow runs within your application container
- **Portable**: Works the same locally and in Kubernetes
- **Durable**: Survives restarts; workflow state is persisted to the state store
- **Scale-to-zero compatible**: Workflows are rehydrated from state when the pod restarts

## Defining a Serverless Order Workflow

```python
import dapr.ext.workflow as wf

wfr = wf.WorkflowRuntime()

@wfr.workflow(name='order-fulfillment')
def order_fulfillment_workflow(ctx: wf.DaprWorkflowContext, order: dict):
    # Step 1: Validate the order
    validation_result = yield ctx.call_activity(
        validate_order,
        input=order
    )

    if not validation_result['valid']:
        return {'status': 'rejected', 'reason': validation_result['reason']}

    # Step 2: Reserve inventory (parallel)
    inventory_task = ctx.call_activity(reserve_inventory, input=order)
    payment_task = ctx.call_activity(authorize_payment, input=order)

    # Wait for both
    results = yield wf.when_all([inventory_task, payment_task])

    if not all(r['success'] for r in results):
        yield ctx.call_activity(cancel_order, input=order)
        return {'status': 'failed'}

    # Step 3: Ship the order
    tracking = yield ctx.call_activity(ship_order, input=order)

    return {
        'status': 'fulfilled',
        'trackingNumber': tracking['trackingNumber']
    }
```

## Defining Activities

```python
import time

@wfr.activity(name='validate_order')
def validate_order(ctx: wf.WorkflowActivityContext, order: dict) -> dict:
    if not order.get('items'):
        return {'valid': False, 'reason': 'No items in order'}
    if order.get('total', 0) <= 0:
        return {'valid': False, 'reason': 'Invalid order total'}
    return {'valid': True}

@wfr.activity(name='reserve_inventory')
def reserve_inventory(ctx: wf.WorkflowActivityContext, order: dict) -> dict:
    # Call inventory service via Dapr service invocation
    import requests
    response = requests.post(
        f"http://localhost:3500/v1.0/invoke/inventory-service/method/reserve",
        json={'items': order['items']}
    )
    return response.json()

@wfr.activity(name='ship_order')
def ship_order(ctx: wf.WorkflowActivityContext, order: dict) -> dict:
    return {'trackingNumber': f"TRK-{order['orderId']}-{int(time.time())}"}
```

## Starting the Workflow Server

```python
from flask import Flask, request
import dapr.ext.workflow as wf

app = Flask(__name__)
wfr.start()

@app.route('/start-order', methods=['POST'])
def start_order():
    order = request.json

    # Start the workflow
    client = wf.DaprWorkflowClient()
    instance_id = client.schedule_new_workflow(
        workflow=order_fulfillment_workflow,
        input=order,
        instance_id=f"order-{order['orderId']}"
    )

    return {'instanceId': instance_id}, 202

@app.route('/order-status/<instance_id>', methods=['GET'])
def get_order_status(instance_id):
    client = wf.DaprWorkflowClient()
    state = client.get_workflow_state(instance_id)
    return {
        'status': state.runtime_status.name,
        'result': state.serialized_output
    }

app.run(port=8080)
```

## KEDA Scaling for Workflow Workers

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: workflow-worker
spec:
  scaleTargetRef:
    name: order-workflow-deployment
  minReplicaCount: 0
  maxReplicaCount: 10
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://prometheus:9090
        metricName: dapr_workflow_execution_work_items_total
        threshold: "5"
        query: |
          dapr_workflow_execution_work_items_total{app_id="order-service"}
```

## Summary

Dapr Workflow enables serverless-style orchestration by providing durable, stateful workflow execution within your microservice containers. Paired with KEDA for scale-to-zero behavior, workflows start on demand, persist their state through restarts, and scale workers proportionally to the backlog of pending workflow steps - combining the economics of serverless with the power of long-running stateful orchestration.
