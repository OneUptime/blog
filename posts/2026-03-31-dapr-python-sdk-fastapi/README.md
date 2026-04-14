# How to Use Dapr Python SDK with FastAPI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Python, FastAPI, Microservice, Pub/Sub

Description: Learn how to integrate the Dapr Python SDK with FastAPI to build microservices with state management, pub/sub, and service invocation.

---

## Introduction

FastAPI is a high-performance Python web framework that pairs naturally with Dapr for building cloud-native microservices. The `dapr-ext-fastapi` extension provides decorators and helpers to handle pub/sub subscriptions, and the `dapr` package handles state and service invocation.

## Prerequisites

```bash
pip install dapr dapr-ext-fastapi fastapi uvicorn
dapr init
```

## Setting Up the FastAPI App

```python
# app.py
from fastapi import FastAPI
from dapr.ext.fastapi import DaprApp
from dapr.clients import DaprClient
from pydantic import BaseModel

app = FastAPI(title="Order Service")
dapr_app = DaprApp(app)

class Order(BaseModel):
    order_id: str
    item: str
    quantity: int
```

## Subscribing to Pub/Sub Topics

Use the `@dapr_app.subscribe` decorator to register a topic handler:

```python
@dapr_app.subscribe(pubsub="pubsub", topic="orders")
async def handle_order(event: Order):
    print(f"Received order: {event.order_id} - {event.item} x{event.quantity}")
    return {"status": "SUCCESS"}
```

## Saving State with DaprClient

```python
@app.post("/orders")
async def create_order(order: Order):
    with DaprClient() as client:
        client.save_state(
            store_name="statestore",
            key=order.order_id,
            value=order.model_dump_json()
        )
    return {"message": f"Order {order.order_id} saved"}
```

## Reading State

```python
@app.get("/orders/{order_id}")
async def get_order(order_id: str):
    with DaprClient() as client:
        result = client.get_state(
            store_name="statestore",
            key=order_id
        )
        if result.data:
            return {"order": result.data.decode("utf-8")}
        from fastapi.responses import JSONResponse
        return JSONResponse(content={"error": "Order not found"}, status_code=404)
```

## Invoking Another Service

```python
@app.post("/orders/{order_id}/ship")
async def ship_order(order_id: str):
    with DaprClient() as client:
        response = client.invoke_method(
            app_id="shipping-service",
            method_name=f"ship/{order_id}",
            http_verb="POST",
            data=b""
        )
        return {"shipping_result": response.text()}
```

## Running the App with Dapr

```bash
dapr run \
  --app-id order-service \
  --app-port 8000 \
  --dapr-http-port 3500 \
  -- uvicorn app:app --host 0.0.0.0 --port 8000
```

## Publishing a Message for Testing

```bash
dapr publish --publish-app-id order-service \
  --pubsub pubsub \
  --topic orders \
  --data '{"order_id":"001","item":"widget","quantity":5}'
```

## Summary

Combining Dapr with FastAPI gives you a production-ready microservice pattern with minimal boilerplate. The `dapr-ext-fastapi` extension handles subscription routing automatically, while `DaprClient` provides access to state stores and service invocation. This setup scales well from local development to Kubernetes.
