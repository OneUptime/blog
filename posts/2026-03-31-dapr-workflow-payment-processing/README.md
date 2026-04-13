# How to Use Dapr Workflow for Payment Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Payment, Transaction, Saga, Financial, Microservice

Description: Learn how to build reliable payment processing workflows using Dapr Workflow, with idempotency, compensation logic, and retry handling for financial transactions.

---

## Payment Processing Needs Reliability

Payment workflows have strict requirements: idempotency (never charge twice), atomicity (charge and reserve together), and compensation (refund if fulfillment fails). Dapr Workflow provides all three through durable execution, idempotent workflow instances, and explicit compensation activities.

## Payment Workflow Steps

A typical e-commerce payment flow:
1. Validate order and payment method
2. Reserve funds (authorization hold)
3. Confirm inventory reservation
4. Capture payment
5. Trigger fulfillment
6. Send confirmation email

## Workflow Implementation

```python
import dapr.ext.workflow as wf
from datetime import timedelta

wfr = wf.WorkflowRuntime()

@wfr.workflow(name='payment_processing_workflow')
def payment_processing_workflow(ctx: wf.DaprWorkflowContext, order: dict):
    # Use order ID as instance ID for idempotency - duplicate starts are safe
    ctx.set_custom_status("Validating order")

    # Step 1 - validate
    validation = yield ctx.call_activity(validate_order, input=order)
    if not validation["valid"]:
        return {"status": "invalid", "reason": validation["reason"]}

    # Step 2 - authorize payment (reserve funds)
    ctx.set_custom_status("Authorizing payment")
    auth_result = yield ctx.call_activity(authorize_payment, input={
        "orderId": order["id"],
        "amount": order["total"],
        "paymentMethod": order["paymentMethod"]
    })

    if not auth_result["authorized"]:
        return {"status": "payment_declined", "code": auth_result["code"]}

    authorization_id = auth_result["authorizationId"]

    # Step 3 - reserve inventory
    ctx.set_custom_status("Reserving inventory")
    inventory_reserved = yield ctx.call_activity(reserve_inventory, input=order)
    if not inventory_reserved:
        # Void the authorization
        yield ctx.call_activity(void_authorization, input={"authorizationId": authorization_id})
        return {"status": "out_of_stock"}

    # Step 4 - capture payment
    ctx.set_custom_status("Capturing payment")
    capture_result = yield ctx.call_activity(capture_payment, input={
        "authorizationId": authorization_id,
        "amount": order["total"]
    })

    if not capture_result["captured"]:
        yield ctx.call_activity(release_inventory, input=order)
        yield ctx.call_activity(void_authorization, input={"authorizationId": authorization_id})
        return {"status": "capture_failed"}

    # Step 5 - trigger fulfillment
    ctx.set_custom_status("Triggering fulfillment")
    yield ctx.call_activity(trigger_fulfillment, input={
        "orderId": order["id"],
        "paymentId": capture_result["paymentId"]
    })

    # Step 6 - send confirmation
    yield ctx.call_activity(send_confirmation_email, input=order)

    ctx.set_custom_status("Complete")
    return {"status": "success", "paymentId": capture_result["paymentId"]}
```

## Idempotent Payment Authorization

```python
@wfr.activity(name='authorize_payment')
def authorize_payment(ctx: wf.WorkflowActivityContext, payment: dict) -> dict:
    # Use orderId as idempotency key
    resp = requests.post(
        "https://api.stripe.com/v1/payment_intents",
        headers={
            "Authorization": f"Bearer {os.environ['STRIPE_SECRET_KEY']}",
            "Idempotency-Key": f"auth-{payment['orderId']}"
        },
        data={
            "amount": int(payment["amount"] * 100),  # cents
            "currency": "usd",
            "payment_method": payment["paymentMethod"],
            "confirm": False,
            "capture_method": "manual"
        }
    )
    data = resp.json()
    return {
        "authorized": data["status"] in ("requires_capture", "succeeded"),
        "authorizationId": data.get("id"),
        "code": data.get("last_payment_error", {}).get("code")
    }
```

## Starting the Workflow with Idempotency

```python
from dapr.ext.workflow import DaprWorkflowClient

with DaprWorkflowClient() as client:
    # Use order ID as the workflow instance ID for idempotency
    instance_id = client.schedule_new_workflow(
        workflow=payment_processing_workflow,
        instance_id=f"order-{order['id']}",  # prevents double-processing
        input=order
    )
```

## Checking Payment Status

```bash
curl http://localhost:3500/v1.0/workflows/dapr/order-ORD-123
```

## Retry Policy for Payment Capture

Configure retries for the capture step to handle transient network issues by passing a retry policy to `call_activity`:

```python
capture_result = yield ctx.call_activity(
    capture_payment,
    input={
        "authorizationId": authorization_id,
        "amount": order["total"]
    },
    retry_policy=wf.RetryPolicy(
        max_number_of_attempts=3,
        first_retry_interval=timedelta(seconds=5),
        backoff_coefficient=2.0
    )
)
```

## Summary

Dapr Workflow provides the reliability guarantees that payment processing demands: idempotent workflow instances prevent double-charges, explicit compensation activities handle refunds and voids, and automatic retry policies handle transient failures in payment gateway calls without complex custom error handling code.
