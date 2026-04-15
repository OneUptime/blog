# How to Implement Event-Carried State Transfer with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Event, Pub/Sub, State Transfer, Microservice

Description: Learn how to implement Event-Carried State Transfer with Dapr pub/sub so subscribers receive full entity state in the event and avoid calling back to the publisher.

---

## Event-Carried State Transfer vs Event Notification

In Event Notification, events carry only identifiers (order ID, customer ID) and subscribers fetch details from the publishing service. In Event-Carried State Transfer (ECST), the event carries the full current state of the changed entity. Subscribers become self-sufficient - they have everything they need without making a synchronous call back.

ECST is ideal when subscribers need to maintain their own local copy of data for fast queries, and when calling back to the publisher for every event would create unacceptable coupling or latency.

## Publishing an Event with Full State

In the customer service, embed the complete customer entity in the event:

```python
from fastapi import FastAPI
from pydantic import BaseModel
import httpx
import uuid
from datetime import datetime, timezone

app = FastAPI()
DAPR_HTTP_PORT = 3500

class Customer(BaseModel):
    customer_id: str
    name: str
    email: str
    tier: str
    credit_limit: float

class CustomerUpdatedEvent(BaseModel):
    event_type: str = "CustomerUpdated"
    event_id: str
    occurred_at: str
    customer: Customer  # Full state embedded in event

@app.put("/customers/{customer_id}")
async def update_customer(customer_id: str, customer: Customer):
    await db.customers.save(customer_id, customer.dict())

    event = CustomerUpdatedEvent(
        event_id=str(uuid.uuid4()),
        occurred_at=datetime.now(timezone.utc).isoformat(),
        customer=customer
    )

    async with httpx.AsyncClient() as client:
        await client.post(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/publish/pubsub/customer-events",
            json=event.dict()
        )

    return {"status": "updated"}
```

## Subscriber Maintaining a Local Read Model

The order service subscribes and maintains its own local copy of customer data:

```python
from fastapi import FastAPI, Request
import httpx

app = FastAPI()
DAPR_HTTP_PORT = 3500

@app.get("/dapr/subscribe")
def subscribe():
    return [{"pubsubname": "pubsub", "topic": "customer-events", "route": "/sync-customer"}]

@app.post("/sync-customer")
async def sync_customer(request: Request):
    body = await request.json()
    event = body.get("data", {})

    if event.get("event_type") != "CustomerUpdated":
        return {"status": "DROP"}

    customer = event["customer"]

    # Store the customer snapshot in the order service's own state store
    async with httpx.AsyncClient() as client:
        await client.post(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/state/statestore",
            json=[{
                "key": f"customer-snapshot:{customer['customer_id']}",
                "value": {
                    **customer,
                    "syncedAt": event["occurred_at"]
                }
            }]
        )

    return {"status": "SUCCESS"}
```

The order service can now read customer details from its own state store without ever calling the customer service:

```python
@app.get("/orders/{order_id}")
async def get_order(order_id: str):
    order = await get_order_from_db(order_id)

    async with httpx.AsyncClient() as client:
        customer_resp = await client.get(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/state/statestore/customer-snapshot:{order['customer_id']}"
        )
    customer = customer_resp.json() if customer_resp.status_code == 200 else None

    return {**order, "customer": customer}
```

## Handling Schema Changes

When the event schema changes, old events may not match the new structure. Version your events:

```python
class CustomerUpdatedEventV2(BaseModel):
    event_type: str = "CustomerUpdated"
    schema_version: str = "2.0"
    event_id: str
    occurred_at: str
    customer: Customer
```

Subscribers check `schema_version` and handle each version appropriately, or use a schema registry.

## When to Use ECST

Use Event-Carried State Transfer when:
- Subscribers need low-latency access to reference data
- You want to reduce runtime coupling between services
- The entity fits comfortably in a message payload (avoid for very large entities)

Avoid ECST when entities are large, frequently updated, or when subscribers need only a fraction of the entity state.

## Summary

Event-Carried State Transfer with Dapr embeds full entity state in pub/sub events so subscribers can maintain their own read models without calling back to the publishing service. Dapr handles event delivery, retries, and dead lettering while your subscribers store received state in their own Dapr state stores. The result is a highly decoupled system where each service can answer queries using only its local data.
