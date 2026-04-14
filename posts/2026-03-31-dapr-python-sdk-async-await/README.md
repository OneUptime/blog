# How to Use Dapr Python SDK with Async/Await

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Python, Async, Asyncio, Microservice

Description: Learn how to use the Dapr Python SDK with async/await patterns in asyncio-based applications, including async state management and pub/sub handling.

---

## Introduction

Modern Python applications often use `asyncio` for concurrency. The Dapr Python SDK supports async usage through `aiohttp`-based HTTP calls and by wrapping synchronous `DaprClient` operations in thread executors. This guide shows practical patterns for using Dapr in async Python applications.

## Prerequisites

```bash
pip install dapr fastapi uvicorn aiohttp
dapr init
```

## Using DaprClient in Async Handlers

`DaprClient` is synchronous, so use `asyncio.get_running_loop().run_in_executor` to avoid blocking the event loop:

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor
from dapr.clients import DaprClient
import json

executor = ThreadPoolExecutor(max_workers=10)

async def async_get_state(key: str) -> str | None:
    loop = asyncio.get_running_loop()
    def _get():
        with DaprClient() as client:
            result = client.get_state(store_name="statestore", key=key)
            return result.data.decode("utf-8") if result.data else None
    return await loop.run_in_executor(executor, _get)

async def async_save_state(key: str, value: str):
    loop = asyncio.get_running_loop()
    def _save():
        with DaprClient() as client:
            client.save_state(store_name="statestore", key=key, value=value)
    await loop.run_in_executor(executor, _save)
```

## FastAPI with Async Dapr Operations

```python
from fastapi import FastAPI
import asyncio
import json

app = FastAPI()

@app.post("/orders/{order_id}")
async def create_order(order_id: str, item: str, quantity: int):
    order = {"id": order_id, "item": item, "quantity": quantity}
    await async_save_state(order_id, json.dumps(order))
    return {"order_id": order_id, "status": "saved"}

@app.get("/orders/{order_id}")
async def get_order(order_id: str):
    data = await async_get_state(order_id)
    if data:
        return json.loads(data)
    return {"error": "not found"}
```

## Async Pub/Sub Publishing

```python
async def async_publish(topic: str, data: dict):
    loop = asyncio.get_running_loop()
    def _publish():
        with DaprClient() as client:
            client.publish_event(
                pubsub_name="pubsub",
                topic_name=topic,
                data=json.dumps(data),
                data_content_type="application/json"
            )
    await loop.run_in_executor(executor, _publish)

@app.post("/events")
async def fire_event(message: str):
    await async_publish("notifications", {"message": message})
    return {"published": True}
```

## Concurrent Dapr Calls with asyncio.gather

```python
async def load_order_context(order_id: str):
    order_data, user_data, inventory_data = await asyncio.gather(
        async_get_state(f"order-{order_id}"),
        async_get_state(f"user-{order_id}"),
        async_get_state(f"inventory-{order_id}")
    )
    return {
        "order": json.loads(order_data) if order_data else None,
        "user": json.loads(user_data) if user_data else None,
        "inventory": json.loads(inventory_data) if inventory_data else None
    }
```

## Using aiohttp for Direct Dapr HTTP API

For pure async HTTP calls to the Dapr sidecar:

```python
import aiohttp
import os

DAPR_PORT = os.getenv("DAPR_HTTP_PORT", "3500")

async def get_state_async(store: str, key: str) -> dict:
    url = f"http://localhost:{DAPR_PORT}/v1.0/state/{store}/{key}"
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status == 200:
                return await response.json()
            return {}
```

## Running the Async App

```bash
dapr run \
  --app-id async-service \
  --app-port 8000 \
  -- uvicorn app:app --host 0.0.0.0 --port 8000
```

## Summary

The Dapr Python SDK is synchronous by design, but integrates well with `asyncio` using thread executor wrappers. For maximum performance, use `asyncio.gather` to run concurrent Dapr operations, and consider direct `aiohttp` calls to the Dapr HTTP API when you need fully non-blocking I/O. This approach keeps your async application responsive without blocking the event loop.
