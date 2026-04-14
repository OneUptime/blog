# How to Use Dapr with Python Logging Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Python, Logging, Observability, Microservice

Description: Configure Python's built-in logging module with Dapr to emit structured JSON logs with trace context from service invocations and pub/sub subscribers.

---

## Python Logging with Dapr SDK

The Python `logging` module is flexible enough for production Dapr services when combined with a JSON formatter and proper trace context propagation. The Dapr Python SDK works with FastAPI or Flask, both of which can integrate Python logging cleanly.

```bash
# Install dependencies
pip install dapr dapr-ext-fastapi fastapi uvicorn python-json-logger
```

## JSON Logger Setup

```python
# logger.py
import logging
import os
import sys
from pythonjsonlogger.json import JsonFormatter

def setup_logger(name: str = __name__) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(os.getenv("LOG_LEVEL", "INFO").upper())

    handler = logging.StreamHandler(sys.stdout)
    formatter = JsonFormatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
        rename_fields={"levelname": "level", "asctime": "timestamp"}
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.propagate = False
    return logger
```

## FastAPI App with Dapr and Logging

```python
# main.py
import json
import logging
import contextvars
from fastapi import FastAPI, Request
from dapr.clients import DaprClient
from logger import setup_logger

logger = setup_logger("order-service")
request_context: contextvars.ContextVar[dict] = contextvars.ContextVar(
    "request_context", default={}
)

app = FastAPI()

class DaprContextFilter(logging.Filter):
    """Inject Dapr context into every log record."""

    def filter(self, record):
        ctx = request_context.get({})
        record.traceId = ctx.get("trace_id", "")
        record.daprAppId = ctx.get("dapr_app_id", "")
        record.callerAppId = ctx.get("caller_app_id", "")
        return True

logger.addFilter(DaprContextFilter())

@app.middleware("http")
async def extract_dapr_context(request: Request, call_next):
    trace_parent = request.headers.get("traceparent", "")
    trace_id = trace_parent.split("-")[1] if len(trace_parent.split("-")) > 1 else ""

    token = request_context.set({
        "trace_id": trace_id,
        "dapr_app_id": request.headers.get("dapr-app-id", ""),
        "caller_app_id": request.headers.get("dapr-caller-app-id", "")
    })

    try:
        response = await call_next(request)
        return response
    finally:
        request_context.reset(token)

@app.post("/api/orders")
async def create_order(order: dict):
    order_id = order.get("orderId")
    customer_id = order.get("customerId")

    logger.info("Creating order", extra={"orderId": order_id, "customerId": customer_id})

    try:
        with DaprClient() as client:
            client.save_state("statestore", f"order-{order_id}", json.dumps(order))
            logger.info("Order saved to state store", extra={"orderId": order_id})

            client.publish_event("pubsub", "order-created", json.dumps(order), data_content_type="application/json")
            logger.info("Order event published", extra={"orderId": order_id})

        return {"orderId": order_id, "status": "created"}

    except Exception as e:
        logger.error("Order creation failed",
                     extra={"orderId": order_id, "error": str(e)},
                     exc_info=True)
        raise
```

## Pub/Sub Subscriber with Python Logging

```python
# subscriber.py
from fastapi import FastAPI
from dapr.ext.fastapi import DaprApp
from logger import setup_logger

logger = setup_logger("notification-service")
app = FastAPI()
dapr_app = DaprApp(app)

@dapr_app.subscribe(pubsub="pubsub", topic="order-created")
async def handle_order_created(event: dict):
    order_id = event.get("data", {}).get("orderId")
    event_id = event.get("id")

    logger.info(
        "Processing order-created event",
        extra={"eventId": event_id, "orderId": order_id}
    )

    try:
        await send_confirmation_email(order_id)
        logger.info("Confirmation email sent", extra={"orderId": order_id})
    except Exception as e:
        logger.error(
            "Failed to send confirmation email",
            extra={"orderId": order_id, "error": str(e)},
            exc_info=True
        )
        raise
```

## Summary

Python's built-in logging module integrates well with Dapr through context variables and logging filters. The `request_context` ContextVar pattern allows trace information extracted from Dapr headers to flow automatically into every log record within a request, without passing context explicitly through function calls. Use `python-json-logger` to emit structured JSON logs compatible with centralized log aggregation platforms.
