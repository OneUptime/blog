# How to Use Actor Timers in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Timer, Scheduled Task, Microservice

Description: Learn how to use actor timers in Dapr to schedule one-time or recurring callbacks within an actor's lifetime for in-process scheduled work.

---

## What Are Actor Timers in Dapr

Actor timers in Dapr allow a virtual actor to schedule callbacks that fire after a delay or on a recurring interval - but only while the actor is active. Unlike reminders, timers are not persisted; if the actor is deactivated, the timer is cancelled and does not survive a restart.

Use timers for transient, in-session scheduled work like rate limiting, cooldown periods, or periodic cleanup during an active session.

## Prerequisites

- Dapr CLI installed and initialized
- A service using a Dapr actor SDK (Node.js, Python, .NET, Java)
- Basic understanding of Dapr virtual actors

## Register a Timer in a .NET Actor

```csharp
using Dapr.Actors.Runtime;

[Actor(TypeName = "SessionActor")]
public class SessionActor : Actor, ISessionActor
{
    public SessionActor(ActorHost host) : base(host) { }

    public async Task StartSessionAsync()
    {
        // Register a timer that fires every 60 seconds, starting after 5 seconds
        await RegisterTimerAsync(
            timerName: "session-refresh",
            callback: nameof(RefreshSessionCallback),
            callbackParams: null,
            dueTime: TimeSpan.FromSeconds(5),
            period: TimeSpan.FromSeconds(60)
        );

        Console.WriteLine("Session timer registered");
    }

    public async Task RefreshSessionCallback(byte[] state)
    {
        Console.WriteLine($"[{Id}] Session refresh triggered at {DateTime.UtcNow}");
        await RefreshSessionData();
    }

    public async Task StopSessionAsync()
    {
        await UnregisterTimerAsync("session-refresh");
        Console.WriteLine("Session timer unregistered");
    }

    private async Task RefreshSessionData()
    {
        // Perform session refresh logic
        await StateManager.SetStateAsync("lastRefresh", DateTime.UtcNow);
    }
}
```

## Register a Timer in Python

```python
from dapr.actor import Actor, ActorRuntime
import asyncio
from datetime import timedelta

class SessionActor(Actor):
    def __init__(self, ctx, actor_id):
        super().__init__(ctx, actor_id)

    async def _on_activate(self):
        print(f"Actor {self.id.id} activated")

    async def start_session(self):
        # Register timer: fires after 5s, repeats every 60s
        await self.register_timer(
            name="session-refresh",
            callback=self.refresh_callback,
            state=b"",
            due_time=timedelta(seconds=5),
            period=timedelta(seconds=60)
        )
        print(f"Timer registered for actor {self.id.id}")

    async def refresh_callback(self, data: bytes):
        print(f"[{self.id.id}] Timer callback fired")
        await self._state_manager.set_state("lastRefresh", str(asyncio.get_event_loop().time()))

    async def stop_session(self):
        await self.unregister_timer("session-refresh")
        print(f"Timer unregistered for actor {self.id.id}")
```

## Register a Timer via the HTTP API

You can also register timers directly via the Dapr sidecar API:

```bash
curl -X POST \
  http://localhost:3500/v1.0/actors/SessionActor/my-actor-id/timers/session-refresh \
  -H "Content-Type: application/json" \
  -d '{
    "callback": "RefreshSessionCallback",
    "dueTime": "0h0m5s0ms",
    "period": "0h1m0s0ms",
    "data": null
  }'
```

Delete a timer:

```bash
curl -X DELETE \
  http://localhost:3500/v1.0/actors/SessionActor/my-actor-id/timers/session-refresh
```

## Use Case: Rate Limiting with a Timer

An actor can use a timer to reset a rate limit counter at intervals:

```csharp
public class RateLimitActor : Actor, IRateLimitActor
{
    private const string RequestCountKey = "requestCount";

    public async Task<bool> AllowRequestAsync()
    {
        int count = await StateManager.GetOrAddStateAsync(RequestCountKey, 0);
        if (count >= 100)
        {
            return false; // rate limit exceeded
        }

        await StateManager.SetStateAsync(RequestCountKey, count + 1);
        return true;
    }

    protected override async Task OnActivateAsync()
    {
        // Reset rate limit counter every minute
        await RegisterTimerAsync(
            "reset-counter",
            nameof(ResetCounter),
            null,
            TimeSpan.FromMinutes(1),
            TimeSpan.FromMinutes(1)
        );
    }

    public async Task ResetCounter(byte[] state)
    {
        await StateManager.SetStateAsync(RequestCountKey, 0);
        Console.WriteLine($"[{Id}] Rate limit counter reset");
    }
}
```

## Timer vs. Reminder - When to Use Each

```text
Timer:
- Fires while actor is active only
- Not persisted across actor deactivation
- No guarantee of delivery after restart
- Use for: in-session periodic work, cooldowns, rate limiting

Reminder:
- Persisted in the state store
- Survives actor deactivation and host restarts
- Guarantees at-least-once delivery
- Use for: long-term scheduled tasks, billing cycles, SLA monitoring
```

## Summary

Dapr actor timers provide a lightweight way to schedule recurring or one-shot callbacks within the lifetime of an active actor. They are ideal for ephemeral scheduled work like session management, rate limiting, and in-process periodic operations. For tasks that must survive restarts and deactivation, use actor reminders instead - timers are intentionally transient and reset when an actor is deactivated.
