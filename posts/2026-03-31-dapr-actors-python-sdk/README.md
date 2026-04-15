# How to Build Dapr Actors with Python SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Python, Microservice, Distributed System

Description: Learn how to build Dapr virtual actors in Python using the Python SDK, including state management, method invocation, and deploying actors in a FastAPI service.

---

## What Are Dapr Actors?

Dapr's actor model provides a pattern for building stateful, concurrent microservices. Each actor is an isolated unit with its own state, and Dapr guarantees turn-based (single-threaded) access to each actor instance. This eliminates the need for explicit locking in your code.

The Python SDK makes it straightforward to define actors as classes and host them in a web framework like FastAPI or Flask.

## Installing the Python SDK

```bash
pip install dapr dapr-ext-fastapi fastapi uvicorn
```

## Defining an Actor Interface

```python
from dapr.actor import ActorInterface, actormethod

class CounterActorInterface(ActorInterface):

    @actormethod(name="increment")
    async def increment(self, amount: int) -> None:
        ...

    @actormethod(name="get_count")
    async def get_count(self) -> int:
        ...

    @actormethod(name="reset")
    async def reset(self) -> None:
        ...
```

## Implementing the Actor

```python
from dapr.actor import Actor
from dapr.actor.runtime.context import ActorRuntimeContext

class CounterActor(Actor, CounterActorInterface):

    def __init__(self, ctx: ActorRuntimeContext, actor_id):
        super().__init__(ctx, actor_id)

    async def _on_activate(self) -> None:
        """Called when the actor is activated."""
        print(f"Actor {self.id.id} activated")
        exists = await self._state_manager.try_get_state("count")
        if not exists[0]:
            await self._state_manager.set_state("count", 0)

    async def increment(self, amount: int) -> None:
        current = await self._state_manager.get_state("count")
        await self._state_manager.set_state("count", current + amount)
        await self._state_manager.save_state()

    async def get_count(self) -> int:
        return await self._state_manager.get_state("count")

    async def reset(self) -> None:
        await self._state_manager.set_state("count", 0)
        await self._state_manager.save_state()
```

## Hosting the Actor in FastAPI

Use the Dapr FastAPI extension to expose actor endpoints automatically:

```python
from fastapi import FastAPI
from dapr.ext.fastapi import DaprActor
from dapr.actor.runtime.config import ActorRuntimeConfig, ActorTypeConfig
from dapr.actor.runtime.runtime import ActorRuntime
import datetime

app = FastAPI()

# Configure actor runtime
config = ActorRuntimeConfig()
config.update_actor_type_configs([
    ActorTypeConfig(
        actor_type=CounterActor.__name__,
        actor_idle_timeout=datetime.timedelta(hours=1),
        drain_ongoing_call_timeout=datetime.timedelta(seconds=30),
    )
])
ActorRuntime.set_actor_config(config)

actor = DaprActor(app)

@app.on_event("startup")
async def startup():
    await actor.register_actor(CounterActor)

@app.get("/healthz")
async def health():
    return {"status": "ok"}
```

Start the service:

```bash
dapr run --app-id counter-service --app-port 8000 -- uvicorn main:app --port 8000
```

## Invoking the Actor from a Client

```python
from dapr.actor import ActorProxy, ActorId

async def main():
    # Create a proxy for actor "user-123"
    proxy = ActorProxy.create("CounterActor", ActorId("user-123"), CounterActorInterface)

    # Increment the counter
    await proxy.invoke_method("increment", 5)

    # Get the current count
    count = await proxy.invoke_method("get_count")
    print(f"Current count: {count}")
```

## Summary

Building Dapr actors in Python requires defining an interface, implementing the actor class with state management methods, and hosting it in a FastAPI app using the Dapr extension. The turn-based concurrency model means you never need locks, and the Dapr sidecar handles state persistence, placement, and routing automatically.
