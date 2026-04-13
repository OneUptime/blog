# How to Implement Compensation Logic with Dapr Workflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Saga, Compensation, Distributed Transaction

Description: Learn how to implement saga compensation logic with Dapr Workflow to roll back distributed transactions when partial failures occur in microservices.

---

## Compensation in Distributed Systems

When a multi-step distributed transaction fails partway through, you cannot use a database rollback across services. Instead, you run compensation activities - semantically reversed operations that undo the work already done. Dapr Workflow's durable execution model is ideal for this pattern because it survives restarts and tracks execution state automatically.

## Defining a Workflow with Compensation

Use Dapr Workflow SDK for Python to build a travel booking saga:

```python
import dapr.ext.workflow as wf

def travel_booking_workflow(ctx: wf.DaprWorkflowContext, order: dict):
    # Track completed steps for compensation
    completed = []

    try:
        # Step 1: Reserve flight
        flight = yield ctx.call_activity(reserve_flight, input=order)
        completed.append({"step": "flight", "reservationId": flight["reservationId"]})

        # Step 2: Reserve hotel
        hotel = yield ctx.call_activity(reserve_hotel, input=order)
        completed.append({"step": "hotel", "reservationId": hotel["reservationId"]})

        # Step 3: Charge payment
        yield ctx.call_activity(charge_payment, input={
            "orderId": order["orderId"],
            "amount": flight["price"] + hotel["price"]
        })
        completed.append({"step": "payment"})

        return {"status": "confirmed", "reservations": completed}

    except Exception as e:
        # Run compensations in reverse order
        yield ctx.call_activity(compensate_steps, input={
            "completed": list(reversed(completed)),
            "reason": str(e)
        })
        return {"status": "compensated", "error": str(e)}
```

## Defining Compensation Activities

Each activity has a corresponding compensation:

```python
def reserve_flight(ctx: wf.WorkflowActivityContext, order: dict) -> dict:
    # Call flight service
    response = call_flight_service("reserve", order)
    return {"reservationId": response["id"], "price": response["price"]}

def cancel_flight(ctx: wf.WorkflowActivityContext, data: dict):
    call_flight_service("cancel", {"reservationId": data["reservationId"]})

def compensate_steps(ctx: wf.WorkflowActivityContext, input: dict):
    for step in input["completed"]:
        if step["step"] == "flight":
            cancel_flight(ctx, step)
        elif step["step"] == "hotel":
            cancel_hotel(ctx, step)
        elif step["step"] == "payment":
            refund_payment(ctx, step)
```

## Registering and Starting the Workflow

```python
from dapr.ext.workflow import WorkflowRuntime

runtime = WorkflowRuntime()
runtime.register_workflow(travel_booking_workflow)
runtime.register_activity(reserve_flight)
runtime.register_activity(reserve_hotel)
runtime.register_activity(charge_payment)
runtime.register_activity(compensate_steps)

runtime.start()
```

Start a new workflow instance:

```bash
curl -X POST http://localhost:3500/v1.0/workflows/dapr/travel_booking_workflow/start \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ord-999", "destination": "Paris", "nights": 3}'
```

## Checking Workflow Status

```bash
curl http://localhost:3500/v1.0/workflows/dapr/INSTANCE_ID
```

Response:

```json
{
  "instanceID": "abc-123",
  "workflowName": "travel_booking_workflow",
  "createdAt": "2024-01-15T10:30:00Z",
  "lastUpdatedAt": "2024-01-15T10:30:05Z",
  "runtimeStatus": "COMPLETED",
  "properties": {
    "dapr.workflow.custom_status": "",
    "dapr.workflow.input": "{\"orderId\": \"ord-999\", \"destination\": \"Paris\", \"nights\": 3}",
    "dapr.workflow.output": "{\"status\": \"compensated\", \"error\": \"hotel unavailable\"}"
  }
}
```

## Summary

Dapr Workflow's durable activity execution makes saga compensation straightforward - track completed steps and reverse them when an activity fails. The workflow engine handles restarts, timeouts, and activity retries automatically, so compensation logic runs reliably even across pod restarts. This pattern replaces complex manual rollback code with a clean, declarative workflow definition.
