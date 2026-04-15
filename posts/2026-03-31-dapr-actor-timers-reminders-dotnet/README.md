# How to Implement Actor Timers and Reminders in .NET

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, .NET, Timer, Reminder

Description: Learn how to use Dapr actor timers and reminders in .NET, including the difference between timers and reminders, and how to register them in C# actors.

---

## Timers vs Reminders

Dapr actors support two types of scheduled callbacks:

- **Timers** are transient. They are cleared if the actor is deactivated or the application restarts. Use timers for in-session callbacks that do not need to survive restarts.
- **Reminders** are durable. They are stored in the Dapr state store and will fire even after an actor is deactivated and reactivated. Use reminders for persistent, long-term scheduling.

## Project Setup

```bash
dotnet new web -n TimerReminderDemo
dotnet add package Dapr.Actors.AspNetCore
```

## Defining the Actor Interface

```csharp
using Dapr.Actors;

public interface ISessionActor : IActor
{
    Task StartSession(string userId);
    Task<string> GetSessionInfo();
    Task CancelSession();
}
```

## Implementing Timers

Register a timer inside an actor method using `RegisterTimerAsync`. The callback must be a method on the actor class:

```csharp
using System.Text;
using Dapr.Actors.Runtime;

[Actor(TypeName = "SessionActor")]
public class SessionActor : Actor, ISessionActor, IRemindable
{
    public SessionActor(ActorHost host) : base(host) { }

    public async Task StartSession(string userId)
    {
        await StateManager.SetStateAsync("userId", userId);
        await StateManager.SetStateAsync("startTime", DateTime.UtcNow);
        await StateManager.SaveStateAsync();

        // Register a timer to send a heartbeat every 30 seconds
        // Timer fires after 5s initial delay, then every 30s
        await RegisterTimerAsync(
            "heartbeat-timer",
            nameof(HeartbeatCallback),
            Encoding.UTF8.GetBytes(userId),
            TimeSpan.FromSeconds(5),
            TimeSpan.FromSeconds(30)
        );

        // Register a durable reminder to expire session after 1 hour
        await RegisterReminderAsync(
            "session-expiry",
            Encoding.UTF8.GetBytes("expire"),
            TimeSpan.FromHours(1),
            TimeSpan.Zero   // fire once, not periodically
        );
    }

    private async Task HeartbeatCallback(byte[] state)
    {
        string userId = Encoding.UTF8.GetString(state);
        Console.WriteLine($"[{DateTime.UtcNow}] Heartbeat for session user: {userId}");
        await StateManager.SetStateAsync("lastHeartbeat", DateTime.UtcNow);
        await StateManager.SaveStateAsync();
    }

    public async Task ReceiveReminderAsync(
        string reminderName,
        byte[] state,
        TimeSpan dueTime,
        TimeSpan period)
    {
        if (reminderName == "session-expiry")
        {
            Console.WriteLine($"Session expired for actor {Id}");
            await StateManager.SetStateAsync("status", "expired");
            await StateManager.SaveStateAsync();
            await UnregisterTimerAsync("heartbeat-timer");
        }
    }

    public async Task<string> GetSessionInfo()
    {
        var userId = await StateManager.GetOrAddStateAsync("userId", "unknown");
        var startTime = await StateManager.GetOrAddStateAsync("startTime", DateTime.UtcNow);
        var status = await StateManager.GetOrAddStateAsync("status", "active");
        return $"User: {userId}, Started: {startTime}, Status: {status}";
    }

    public async Task CancelSession()
    {
        await UnregisterTimerAsync("heartbeat-timer");
        await UnregisterReminderAsync("session-expiry");
        await StateManager.SetStateAsync("status", "cancelled");
        await StateManager.SaveStateAsync();
    }
}
```

## Registering in Program.cs

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddActors(options =>
{
    options.Actors.RegisterActor<SessionActor>();
    options.ActorIdleTimeout = TimeSpan.FromMinutes(10);
    options.RemindersStoragePartitions = 7;
});

var app = builder.Build();
app.MapActorsHandlers();
app.Run();
```

## Invoking from a Client

```csharp
var proxy = ActorProxy.Create<ISessionActor>(new ActorId("user-42"), "SessionActor");
await proxy.StartSession("user-42");

// Later...
string info = await proxy.GetSessionInfo();
Console.WriteLine(info);
```

## Key Differences Summary

| Feature | Timer | Reminder |
|---|---|---|
| Durable | No | Yes |
| Survives restart | No | Yes |
| Survives deactivation | No | Yes |
| Stored in state store | No | Yes |
| Use case | In-session callbacks | Long-term scheduling |

## Summary

In .NET, Dapr actor timers are registered with `RegisterTimerAsync` and cleared on deactivation, while reminders registered with `RegisterReminderAsync` persist across restarts and deactivations. Implement `IRemindable` to receive reminder callbacks. Always unregister timers and reminders when they are no longer needed to avoid unexpected callbacks.
