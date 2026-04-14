# How to Implement Message Correlation with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Message Correlation, Pub/Sub, Tracing, Microservice

Description: Learn how to implement message correlation with Dapr to link related messages across services using correlation IDs and Dapr's distributed tracing integration.

---

## What is Message Correlation?

Message correlation connects related messages that belong to the same logical operation across multiple services. When a user places an order, the order service, payment service, inventory service, and notification service all handle messages related to that same order. A correlation ID ties all these messages together for debugging, auditing, and workflow tracking.

## Establishing a Correlation ID

Assign a correlation ID when a request enters the system. Propagate it through all subsequent events:

```python
import uuid
import httpx
from fastapi import FastAPI, Request, Header
from typing import Optional

app = FastAPI()
DAPR_HTTP_PORT = 3500

def get_or_create_correlation_id(correlation_id: Optional[str]) -> str:
    return correlation_id or str(uuid.uuid4())

@app.post("/orders")
async def create_order(
    order: dict,
    x_correlation_id: Optional[str] = Header(None)
):
    correlation_id = get_or_create_correlation_id(x_correlation_id)

    # Include correlation ID in the event payload
    event = {
        "orderId": str(uuid.uuid4()),
        "correlationId": correlation_id,
        "customerId": order.get("customerId"),
        "items": order.get("items", []),
        "totalAmount": order.get("totalAmount")
    }

    # Publish with correlation ID in metadata
    async with httpx.AsyncClient() as client:
        await client.post(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/publish/pubsub/order-created",
            json=event,
            headers={
                "Content-Type": "application/json",
                "X-Correlation-ID": correlation_id
            }
        )

    return {"orderId": event["orderId"], "correlationId": correlation_id}
```

## Propagating Correlation IDs Through Services

Each downstream service extracts the correlation ID from the event and includes it in any events it publishes:

```python
from fastapi import FastAPI, Request

app = FastAPI()

@app.post("/process-payment")
async def process_payment(request: Request):
    body = await request.json()
    event = body.get("data", {})
    correlation_id = event.get("correlationId")

    # Process payment logic
    payment_result = await charge_customer(event["customerId"], event["totalAmount"])

    # Propagate correlation ID to the next event
    async with httpx.AsyncClient() as client:
        await client.post(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/publish/pubsub/payment-processed",
            json={
                "orderId": event["orderId"],
                "correlationId": correlation_id,  # Propagated
                "paymentId": payment_result["paymentId"],
                "status": "succeeded"
            }
        )

    return {"status": "SUCCESS"}
```

## Using Dapr Distributed Tracing for Correlation

Dapr automatically propagates W3C trace context headers (`traceparent`, `tracestate`) between services via service invocation. Use the trace ID as your correlation ID for unified tracing:

```python
from opentelemetry import trace
from opentelemetry.propagate import inject, extract

tracer = trace.get_tracer("order-service")

@app.post("/orders")
async def create_order(request: Request, order: dict):
    # Extract trace context from incoming request
    carrier = dict(request.headers)
    ctx = extract(carrier)

    with tracer.start_as_current_span("create-order", context=ctx) as span:
        correlation_id = format(span.get_span_context().trace_id, '032x')

        # The trace ID serves as the correlation ID
        event = {
            "orderId": str(uuid.uuid4()),
            "correlationId": correlation_id,
            **order
        }

        # Dapr propagates trace context automatically on service invocation
        async with httpx.AsyncClient() as client:
            headers = {}
            inject(headers)  # Inject W3C trace context
            await client.post(
                f"http://localhost:{DAPR_HTTP_PORT}/v1.0/publish/pubsub/order-created",
                json=event,
                headers={**headers, "Content-Type": "application/json"}
            )

    return {"orderId": event["orderId"], "correlationId": correlation_id}
```

## Querying Correlated Messages in Logs

With correlation IDs in all log messages, you can trace a full request flow:

```python
import logging
import structlog

log = structlog.get_logger()

@app.post("/process-payment")
async def process_payment(request: Request):
    body = await request.json()
    event = body.get("data", {})
    correlation_id = event.get("correlationId")

    log.info("processing_payment",
             orderId=event["orderId"],
             correlationId=correlation_id,
             amount=event["totalAmount"])

    # Use correlation ID in all log statements throughout this handler
```

Query all log entries for a specific correlation ID:

```bash
# In Grafana Loki (LogQL)
{app="payment-service"} | json | correlationId="abc-123-..."
```

## Summary

Message correlation with Dapr involves assigning a correlation ID at the request entry point, embedding it in every event payload, and propagating it through all downstream services. Dapr's built-in W3C trace context propagation via Zipkin or OpenTelemetry provides correlation at the infrastructure level, while explicit `correlationId` fields in event payloads make it accessible at the application level for business-level tracing and auditing.
