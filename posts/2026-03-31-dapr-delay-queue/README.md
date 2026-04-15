# How to Implement Delay Queue with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Queue, Scheduling, Microservice

Description: Learn how to implement a delay queue in Dapr to schedule message delivery at a future time using workflows and timers for deferred processing.

---

## What Is a Delay Queue?

A delay queue holds messages until a specified time has elapsed before delivering them to consumers. Common use cases include sending a reminder email 24 hours after signup, retrying a failed operation after a cooling-off period, or scheduling notifications for a future date.

Dapr does not have a native delay queue component, but you can implement one using Dapr Workflows with `CreateTimer`, or by using Dapr actor reminders.

## Approach 1: Delay Queue with Dapr Workflow

The workflow approach uses `ctx.createTimer()` to pause execution until a future time:

```javascript
const { WorkflowRuntime, DaprWorkflowClient } = require('@dapr/dapr');

// The workflow pauses until the delay elapses, then processes the message
async function delayedMessageWorkflow(ctx, input) {
  const { message, delaySeconds } = input;

  console.log(`Scheduling message for delivery in ${delaySeconds}s`);

  // Create a timer - the workflow suspends here
  const fireAt = new Date(ctx.getCurrentUtcDateTime().getTime() + delaySeconds * 1000);
  await ctx.createTimer(fireAt);

  // Deliver the message after the timer fires
  await ctx.callActivity(deliverMessageActivity, message);

  return { delivered: true, deliveredAt: new Date().toISOString() };
}

async function deliverMessageActivity(ctx, message) {
  console.log(`Delivering delayed message: ${JSON.stringify(message)}`);
  // Send notification, trigger webhook, publish event, etc.
  await notificationService.send(message);
  return { success: true };
}
```

## Registering and Starting Delayed Messages

```javascript
const { DaprWorkflowClient } = require('@dapr/dapr');

const client = new DaprWorkflowClient();

async function scheduleDelayedMessage(message, delaySeconds) {
  const instanceId = await client.scheduleNewWorkflow(
    delayedMessageWorkflow,
    { message, delaySeconds }
  );
  console.log(`Scheduled message with workflow ID: ${instanceId}`);
  return instanceId;
}

// Schedule a reminder 1 hour from now
await scheduleDelayedMessage(
  { userId: 'user-42', type: 'cart-abandonment', text: 'You left items in your cart!' },
  3600
);
```

## Approach 2: Delay Queue with Dapr Actor Reminders

For simpler use cases, use Dapr actor reminders to trigger processing at a future time:

```python
import datetime
from dapr.actor import Actor, Remindable
from dapr.actor.runtime.context import ActorRuntimeContext

class DelayQueueActor(Actor, Remindable):

    def __init__(self, ctx: ActorRuntimeContext, actor_id):
        super().__init__(ctx, actor_id)

    async def schedule_message(self, message: dict, delay_seconds: int) -> None:
        """Schedule message delivery after a delay."""
        await self._state_manager.set_state("message", message)
        await self._state_manager.save_state()

        await self.register_reminder(
            "deliver-message",
            str(delay_seconds).encode(),
            datetime.timedelta(seconds=delay_seconds),
        )
        print(f"Message scheduled for delivery in {delay_seconds}s")

    async def receive_reminder(self, name, state, due_time, period):
        if name == "deliver-message":
            exists, message = await self._state_manager.try_get_state("message")
            if exists and message:
                await self._deliver_message(message)
                await self._state_manager.remove_state("message")
                await self._state_manager.save_state()

    async def _deliver_message(self, message: dict) -> None:
        print(f"Delivering delayed message: {message}")
        # Implement actual delivery logic here
```

## Scheduling via the HTTP API

You can also trigger delayed delivery using Dapr's scheduled workflow API:

```bash
# Schedule a workflow to start 1 hour from now
curl -X POST http://localhost:3500/v1.0/workflows/dapr/DelayedWorkflow/start \
  -H "Content-Type: application/json" \
  -d '{
    "message": {"userId": "user-1", "type": "reminder"},
    "delaySeconds": 3600
  }'
```

## Checking Delivery Status

```javascript
const state = await client.getWorkflowState(instanceId, true);
console.log('Status:', state.runtimeStatus);
console.log('Output:', state.serializedOutput);
```

## Summary

Dapr implements delay queues using either Workflow timers or actor reminders. The workflow approach is best for complex multi-step delayed processing, while actor reminders suit simpler fire-once or periodic delayed delivery. Both approaches are durable - they survive application restarts and Kubernetes pod evictions.
