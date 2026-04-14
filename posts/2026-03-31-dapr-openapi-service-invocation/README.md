# How to Use OpenAPI with Dapr Service Invocation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, OpenAPI, Service Invocation, Microservice, API

Description: Learn how to integrate OpenAPI specifications with Dapr service invocation to generate clients, document APIs, and enforce contracts between microservices.

---

## Why OpenAPI and Dapr Work Well Together

Dapr service invocation lets microservices call each other using simple HTTP or gRPC. OpenAPI adds a formal contract layer on top, giving you auto-generated clients, interactive documentation, and runtime validation. Together they make inter-service communication predictable and well-documented.

## Exposing an OpenAPI Spec from a Dapr-Enabled Service

Each Dapr service is a regular HTTP application. You can add OpenAPI support using any framework that supports it. Here is an example with FastAPI in Python, which generates an OpenAPI spec automatically:

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Order Service", version="1.0.0")

class Order(BaseModel):
    order_id: str
    product: str
    quantity: int

@app.post("/orders", summary="Create a new order")
async def create_order(order: Order):
    return {"status": "created", "order_id": order.order_id}

@app.get("/orders/{order_id}", summary="Get an order by ID")
async def get_order(order_id: str):
    return {"order_id": order_id, "product": "widget", "quantity": 2}
```

Run this alongside the Dapr sidecar:

```bash
dapr run --app-id order-service --app-port 8000 -- uvicorn main:app --port 8000
```

Your OpenAPI spec is now available at `http://localhost:8000/openapi.json`.

## Calling the Service via Dapr with a Generated Client

Use the OpenAPI spec to generate a typed client. With `openapi-generator-cli`:

```bash
openapi-generator-cli generate \
  -i http://localhost:8000/openapi.json \
  -g python \
  -o ./generated/order-client
```

Then invoke the service through Dapr's service invocation endpoint. Dapr routes the call to the target service's sidecar:

```python
import httpx

DAPR_HTTP_PORT = 3500
TARGET_APP_ID = "order-service"

async def create_order(order_id: str, product: str, quantity: int):
    url = f"http://localhost:{DAPR_HTTP_PORT}/v1.0/invoke/{TARGET_APP_ID}/method/orders"
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json={
            "order_id": order_id,
            "product": product,
            "quantity": quantity
        })
        response.raise_for_status()
        return response.json()
```

## Validating Requests Against the OpenAPI Schema

When using FastAPI, request validation happens automatically at the application level. The Pydantic models that define your OpenAPI schema also validate incoming requests. Any request that does not match the schema returns a 422 error with details about the validation failure:

```python
# The Order model already enforces the schema on every request
class Order(BaseModel):
    order_id: str
    product: str
    quantity: int

@app.post("/orders", summary="Create a new order")
async def create_order(order: Order):
    # FastAPI validates the request body against the Order model
    # before this function is called
    return {"status": "created", "order_id": order.order_id}
```

For additional cross-cutting validation or authorization, Dapr provides the `middleware.http.opa` component, which applies Open Policy Agent policies to incoming requests before they reach your application.

## Documenting Service Dependencies

Include Dapr component dependencies in your OpenAPI spec using custom extensions. This documents which Dapr building blocks your service relies on:

```yaml
x-dapr-dependencies:
  statestore: redis-statestore
  pubsub: rabbitmq-pubsub
  bindings:
    - cron-binding
```

Many internal developer portals can parse these extensions to build service dependency graphs.

## Summary

OpenAPI and Dapr complement each other well - OpenAPI provides contracts and documentation while Dapr handles the transport and reliability. By exposing OpenAPI specs from each service and calling through Dapr's HTTP endpoint, you get both typed clients and the full benefits of Dapr's service invocation features like retries, mTLS, and observability.
