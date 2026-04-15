# How to Implement Actor Timers and Reminders in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Python, Timer, Reminder

Description: Learn how to register and handle Dapr actor timers and reminders in Python, with practical examples for session management and recurring task scheduling.

---

## Understanding Timers and Reminders

Dapr provides two scheduling mechanisms for actors:

- **Timers** are in-memory callbacks that fire while the actor is active. They reset if the actor is deactivated or the process restarts.
- **Reminders** are durable and stored in the Dapr state store. They survive actor deactivation and application restarts, making them suitable for long-term scheduling.

## Setup

```bash
pip install dapr dapr-ext-fastapi fastapi uvicorn
```

## Defining the Actor

```python
import datetime
from dapr.actor import Actor, Remindable
from dapr.actor.runtime.context import ActorRuntimeContext
from dapr.actor import ActorInterface, actormethod


class SubscriptionActorInterface(ActorInterface):

    @actormethod(name="activate_subscription")
    async def activate_subscription(self, plan: str) -> dict:
        ...

    @actormethod(name="get_status")
    async def get_status(self) -> dict:
        ...

    @actormethod(name="cancel")
    async def cancel(self) -> None:
        ...
```

## Implementing Timers and Reminders

```python
class SubscriptionActor(Actor, Remindable, SubscriptionActorInterface):

    def __init__(self, ctx: ActorRuntimeContext, actor_id):
        super().__init__(ctx, actor_id)

    async def _on_activate(self) -> None:
        exists, _ = await self._state_manager.try_get_state("plan")
        if not exists:
            await self._state_manager.set_state("status", "inactive")

    async def activate_subscription(self, plan: str) -> dict:
        await self._state_manager.set_state("plan", plan)
        await self._state_manager.set_state("status", "active")
        await self._state_manager.save_state()

        # Register timer - fires every 60 seconds for usage tracking
        # Not durable - clears on deactivation
        await self.register_timer(
            "usage-timer",
            self.track_usage,           # callback method
            None,                       # state passed to callback
            datetime.timedelta(seconds=10),    # initial delay
            datetime.timedelta(seconds=60),    # interval
        )

        # Register reminder - fires after 30 days for renewal
        # Durable - survives restarts and deactivation
        await self.register_reminder(
            "renewal-reminder",
            b"renew",                           # data payload
            datetime.timedelta(days=30),        # due time
            datetime.timedelta(days=30),        # period (repeating)
        )

        return {"status": "active", "plan": plan}

    async def track_usage(self, state) -> None:
        """Timer callback - called every 60 seconds while active."""
        count, usage = await self._state_manager.try_get_state("usage_count")
        current = usage if count else 0
        await self._state_manager.set_state("usage_count", current + 1)
        await self._state_manager.save_state()
        print(f"Usage tracked for actor {self.id.id}: count={current + 1}")

    async def receive_reminder(
        self,
        name: str,
        state: bytes,
        due_time: datetime.timedelta,
        period: datetime.timedelta,
    ) -> None:
        """Reminder callback - durable, survives restarts."""
        if name == "renewal-reminder":
            print(f"Renewal reminder fired for actor {self.id.id}")
            # Send renewal notification or auto-renew
            await self._state_manager.set_state("renewal_due", True)
            await self._state_manager.save_state()

    async def get_status(self) -> dict:
        _, status = await self._state_manager.try_get_state("status")
        _, plan = await self._state_manager.try_get_state("plan")
        _, usage = await self._state_manager.try_get_state("usage_count")
        return {
            "status": status or "inactive",
            "plan": plan or "none",
            "usage_count": usage or 0,
        }

    async def cancel(self) -> None:
        await self.unregister_timer("usage-timer")
        await self.unregister_reminder("renewal-reminder")
        await self._state_manager.set_state("status", "cancelled")
        await self._state_manager.save_state()
```

## Hosting the Actor

```python
from fastapi import FastAPI
from dapr.ext.fastapi import DaprActor

app = FastAPI()
actor = DaprActor(app)

@app.on_event("startup")
async def startup():
    await actor.register_actor(SubscriptionActor)
```

```bash
dapr run --app-id subscription-service --app-port 8000 -- uvicorn main:app --port 8000
```

## Summary

Python Dapr actors use `register_timer` for transient in-session callbacks and `register_reminder` for durable recurring tasks. The `Remindable` mixin enables the `receive_reminder` callback. Always unregister timers and reminders in your cleanup logic (such as a cancel method) to prevent orphaned callbacks from firing after the actor's purpose is complete.
