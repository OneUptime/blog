# How to Use Dapr Workflow for Saga Pattern Implementation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Saga, Microservice, Distributed Transaction, Orchestration

Description: Learn how to implement the Saga pattern using Dapr Workflow to manage distributed transactions across multiple microservices with rollback support.

---

## What Is the Saga Pattern?

The Saga pattern breaks a distributed transaction into a sequence of local transactions. Each step publishes an event or calls the next service. If a step fails, compensating transactions undo prior steps. Dapr Workflow provides a durable, fault-tolerant runtime for orchestrating these sagas.

## Designing the Saga

Consider an order placement saga with three steps:
1. Reserve inventory
2. Charge payment
3. Confirm shipment

If payment fails, inventory must be released.

## Workflow Implementation in Python

```python
import dapr.ext.workflow as wf

wfr = wf.WorkflowRuntime()

@wfr.workflow(name='order_saga_workflow')
def order_saga_workflow(ctx: wf.DaprWorkflowContext, order: dict):
    # Step 1 - reserve inventory
    reserved = yield ctx.call_activity(reserve_inventory, input=order)
    if not reserved:
        return {"status": "failed", "reason": "inventory unavailable"}

    # Step 2 - charge payment
    charged = yield ctx.call_activity(charge_payment, input=order)
    if not charged:
        # Compensate: release inventory
        yield ctx.call_activity(release_inventory, input=order)
        return {"status": "failed", "reason": "payment declined"}

    # Step 3 - confirm shipment
    shipped = yield ctx.call_activity(confirm_shipment, input=order)
    if not shipped:
        yield ctx.call_activity(refund_payment, input=order)
        yield ctx.call_activity(release_inventory, input=order)
        return {"status": "failed", "reason": "shipment error"}

    return {"status": "success", "orderId": order["id"]}
```

## Defining Activities

```python
@wfr.activity(name='reserve_inventory')
def reserve_inventory(ctx: wf.WorkflowActivityContext, order: dict) -> bool:
    # Call inventory service
    resp = requests.post("http://inventory/reserve", json=order)
    return resp.status_code == 200

@wfr.activity(name='release_inventory')
def release_inventory(ctx: wf.WorkflowActivityContext, order: dict) -> bool:
    resp = requests.post("http://inventory/release", json=order)
    return resp.status_code == 200

@wfr.activity(name='charge_payment')
def charge_payment(ctx: wf.WorkflowActivityContext, order: dict) -> bool:
    resp = requests.post("http://payment/charge", json=order)
    return resp.status_code == 200

@wfr.activity(name='refund_payment')
def refund_payment(ctx: wf.WorkflowActivityContext, order: dict) -> bool:
    resp = requests.post("http://payment/refund", json=order)
    return resp.status_code == 200

@wfr.activity(name='confirm_shipment')
def confirm_shipment(ctx: wf.WorkflowActivityContext, order: dict) -> bool:
    resp = requests.post("http://shipment/confirm", json=order)
    return resp.status_code == 200
```

## Starting the Workflow

```python
from dapr.clients import DaprClient

with DaprClient() as d:
    instance_id = d.start_workflow(
        workflow_component="dapr",
        workflow_name="order_saga_workflow",
        input={"id": "ORD-123", "items": ["item-1"], "total": 49.99}
    ).instance_id
    print(f"Saga started: {instance_id}")
```

## Checking Saga Status

```bash
curl http://localhost:3500/v1.0/workflows/dapr/<instance_id>
```

## Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: dapr
spec:
  type: workflow.dapr
  version: v1
```

## Key Benefits Over Manual Sagas

- Workflow state is persisted automatically - no manual checkpointing
- Activities are retried on transient failures
- Compensation logic is written as plain code, not event handlers
- Visibility into each step via workflow status API

## Summary

Dapr Workflow simplifies Saga pattern implementation by providing durable, resumable orchestration with built-in retry and compensation support. By encoding saga steps as workflow activities, you get transparent rollback logic and observable distributed transactions without managing state manually.
