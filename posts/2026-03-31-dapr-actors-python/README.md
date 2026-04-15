# How to Use Dapr Actors with Python SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Python, Stateful, Microservice

Description: Learn how to implement the Virtual Actor pattern in Python using the Dapr Python SDK for managing stateful, concurrent microservice entities.

---

## Introduction

The Dapr Actor model lets you build stateful, concurrent applications by modeling each entity as an actor with its own state and behavior. Dapr manages actor placement, activation, deactivation, and garbage collection, so Python developers can focus on business logic.

## Installation

```bash
pip install dapr dapr-ext-fastapi uvicorn
```

## Defining an Actor Interface

```python
# interfaces.py
from dapr.actor import ActorInterface, actormethod

class CartActorInterface(ActorInterface):

    @actormethod(name="AddItem")
    async def add_item(self, item: dict) -> None:
        ...

    @actormethod(name="RemoveItem")
    async def remove_item(self, item_id: str) -> None:
        ...

    @actormethod(name="GetItems")
    async def get_items(self) -> list:
        ...

    @actormethod(name="Checkout")
    async def checkout(self) -> dict:
        ...
```

## Implementing the Actor

```python
# cart_actor.py
from dapr.actor import Actor
from interfaces import CartActorInterface

CART_STATE_KEY = "cart-items"

class CartActor(Actor, CartActorInterface):

    async def _on_activate(self) -> None:
        print(f"CartActor activated: {self.id.id}")

    async def _on_deactivate(self) -> None:
        print(f"CartActor deactivated: {self.id.id}")

    async def add_item(self, item: dict) -> None:
        items = await self._state_manager.try_get_state(CART_STATE_KEY)
        current = items[1] if items[0] else []
        current.append(item)
        await self._state_manager.set_state(CART_STATE_KEY, current)
        await self._state_manager.save_state()

    async def remove_item(self, item_id: str) -> None:
        items = await self._state_manager.try_get_state(CART_STATE_KEY)
        current = items[1] if items[0] else []
        filtered = [i for i in current if i.get("id") != item_id]
        await self._state_manager.set_state(CART_STATE_KEY, filtered)
        await self._state_manager.save_state()

    async def get_items(self) -> list:
        items = await self._state_manager.try_get_state(CART_STATE_KEY)
        return items[1] if items[0] else []

    async def checkout(self) -> dict:
        current_items = await self.get_items()
        total = sum(i.get("price", 0) * i.get("qty", 1) for i in current_items)
        await self._state_manager.set_state(CART_STATE_KEY, [])
        await self._state_manager.save_state()
        return {"orderId": f"order-{self.id.id}", "total": total, "items": current_items}
```

## Registering the Actor Service

```python
# main.py
from fastapi import FastAPI
from dapr.ext.fastapi import DaprActor
from dapr.actor.runtime.runtime import ActorRuntime
from dapr.actor.runtime.config import ActorRuntimeConfig, ActorTypeConfig
from datetime import timedelta

from cart_actor import CartActor

config = ActorRuntimeConfig()
config.update_actor_type_configs([
    ActorTypeConfig(
        actor_idle_timeout=timedelta(hours=1),
        actor_scan_interval=timedelta(seconds=30),
        drain_ongoing_call_timeout=timedelta(seconds=60),
        drain_rebalanced_actors=True,
    )
])

ActorRuntime.set_actor_config(config)

app = FastAPI()
actor = DaprActor(app)

@app.on_event("startup")
async def startup():
    await actor.register_actor(CartActor)
```

Run the actor service with:

```bash
dapr run --app-id cart-actor --app-port 8000 -- uvicorn main:app --port 8000
```

## Calling an Actor

```python
# client.py
import asyncio
from dapr.actor import ActorProxy, ActorId
from interfaces import CartActorInterface

async def main():
    proxy = ActorProxy.create(
        "CartActor",
        ActorId("user-42"),
        CartActorInterface
    )

    await proxy.AddItem({"id": "prod-1", "name": "Widget", "price": 9.99, "qty": 2})
    await proxy.AddItem({"id": "prod-2", "name": "Gadget", "price": 29.99, "qty": 1})

    items = await proxy.GetItems()
    print("Cart:", items)

    result = await proxy.Checkout()
    print("Total:", result["total"])

asyncio.run(main())
```

## Summary

Dapr Actors in the Python SDK provide a clean way to implement the Virtual Actor pattern using Python classes and async methods. By defining actor interfaces and implementing them as actor classes, you get built-in state persistence, turn-based concurrency, and automatic lifecycle management for stateful entities in your microservices.
