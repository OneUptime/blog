# How to Use Actor Reminders in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Reminder, Scheduled Task, Microservice

Description: Learn how to use actor reminders in Dapr to schedule durable, persisted callbacks that survive actor deactivation and application restarts.

---

## What Are Actor Reminders in Dapr

Actor reminders are durable, persisted scheduled callbacks attached to a Dapr virtual actor. Unlike timers, reminders survive actor deactivation and process restarts - Dapr persists them via the Scheduler service (default since Dapr v1.15; older versions used the actor state store) and re-activates the actor to deliver them at the scheduled time.

Use reminders for critical scheduled tasks like billing cycles, SLA deadline checks, subscription renewals, and any work that must not be lost if the service restarts.

## Prerequisites

- Dapr CLI installed and initialized
- A state store configured (Redis is default)
- A service using a Dapr actor SDK

## Register a Reminder in .NET

```csharp
using Dapr.Actors.Runtime;
using System.Text.Json;

[Actor(TypeName = "SubscriptionActor")]
public class SubscriptionActor : Actor, ISubscriptionActor, IRemindable
{
    public SubscriptionActor(ActorHost host) : base(host) { }

    public async Task StartSubscriptionAsync(SubscriptionData data)
    {
        // Store subscription data
        await StateManager.SetStateAsync("subscription", data);

        // Register a reminder to check renewal 7 days before expiry
        var daysUntilReminder = (data.ExpiryDate - DateTime.UtcNow).Days - 7;
        await RegisterReminderAsync(
            reminderName: "renewal-reminder",
            state: JsonSerializer.SerializeToUtf8Bytes(data),
            dueTime: TimeSpan.FromDays(Math.Max(daysUntilReminder, 0)),
            period: TimeSpan.FromDays(1) // repeat daily after first fire
        );

        Console.WriteLine($"[{Id}] Renewal reminder registered");
    }

    public async Task ReceiveReminderAsync(
        string reminderName,
        byte[] state,
        TimeSpan dueTime,
        TimeSpan period)
    {
        if (reminderName == "renewal-reminder")
        {
            var data = JsonSerializer.Deserialize<SubscriptionData>(state);
            Console.WriteLine($"[{Id}] Renewal reminder for {data.CustomerId}");
            await SendRenewalNotification(data);
        }
    }

    public async Task CancelReminderAsync()
    {
        await UnregisterReminderAsync("renewal-reminder");
        Console.WriteLine($"[{Id}] Reminder unregistered");
    }

    private async Task SendRenewalNotification(SubscriptionData data)
    {
        // Send email, trigger notification service, etc.
        Console.WriteLine($"Sending renewal notice to {data.CustomerEmail}");
    }
}
```

## Register a Reminder in Python

```python
from dapr.actor import Actor, Remindable
from datetime import timedelta
import json

class OrderActor(Actor, Remindable):
    async def schedule_sla_check(self, order_data: dict):
        # Save state
        await self._state_manager.set_state("order", order_data)

        # Remind in 2 hours to check SLA compliance
        await self.register_reminder(
            name="sla-check",
            state=json.dumps(order_data).encode(),
            due_time=timedelta(hours=2),
            period=timedelta(hours=1)  # check every hour after first fire
        )
        print(f"SLA reminder registered for order {order_data['orderId']}")

    async def receive_reminder(self, name: str, state: bytes,
                               due_time: timedelta, period: timedelta):
        if name == "sla-check":
            order = json.loads(state.decode())
            await self.check_sla(order)

    async def check_sla(self, order: dict):
        print(f"Checking SLA for order {order['orderId']}")
        # evaluate order status and SLA breach

    async def complete_order(self):
        await self.unregister_reminder("sla-check")
        print(f"Reminder unregistered for actor {self.id.id}")
```

## Register a Reminder via the HTTP API

```bash
curl -X POST \
  http://localhost:3500/v1.0/actors/SubscriptionActor/sub-001/reminders/renewal-reminder \
  -H "Content-Type: application/json" \
  -d '{
    "dueTime": "168h0m0s0ms",
    "period": "24h0m0s0ms",
    "data": "eyJjdXN0b21lcklkIjoiYWJjMTIzIn0="
  }'
```

The `data` field is a string (base64-encoding is one option for binary payloads). `dueTime` and `period` support Go duration format (e.g. `"24h"`) as well as ISO 8601 durations (e.g. `"PT24H"`).

Get a reminder:

```bash
curl http://localhost:3500/v1.0/actors/SubscriptionActor/sub-001/reminders/renewal-reminder
```

Delete a reminder:

```bash
curl -X DELETE \
  http://localhost:3500/v1.0/actors/SubscriptionActor/sub-001/reminders/renewal-reminder
```

## Use Case: Billing Reminder Actor

```csharp
[Actor(TypeName = "BillingActor")]
public class BillingActor : Actor, IBillingActor, IRemindable
{
    private const string BillingReminderName = "billing-cycle";

    public async Task InitializeBillingAsync(BillingConfig config)
    {
        await StateManager.SetStateAsync("config", config);

        // Register monthly billing reminder
        await RegisterReminderAsync(
            BillingReminderName,
            System.Text.Encoding.UTF8.GetBytes(config.CustomerId),
            TimeSpan.FromDays(30),  // first fire in 30 days
            TimeSpan.FromDays(30)   // repeat monthly
        );
    }

    public async Task ReceiveReminderAsync(
        string reminderName,
        byte[] state,
        TimeSpan dueTime,
        TimeSpan period)
    {
        if (reminderName == BillingReminderName)
        {
            var customerId = System.Text.Encoding.UTF8.GetString(state);
            var config = await StateManager.GetStateAsync<BillingConfig>("config");

            Console.WriteLine($"Processing monthly billing for {customerId}");
            await ProcessMonthlyBilling(config);
        }
    }

    private async Task ProcessMonthlyBilling(BillingConfig config)
    {
        // Charge customer, generate invoice, send receipt
        Console.WriteLine($"Billing ${config.MonthlyAmount} for {config.CustomerId}");
    }
}
```

## Summary

Dapr actor reminders provide durable, persisted scheduling that survives actor deactivation and restarts - guaranteed at-least-once delivery backed by the Scheduler service (or state store in older Dapr versions). They are the right choice for business-critical recurring tasks like billing, SLA monitoring, subscription renewal notifications, and any scheduled work that cannot be lost. For lightweight, ephemeral scheduling within an active session, use actor timers instead.
