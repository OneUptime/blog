# How to Use Azure SignalR Service Hubs for Message Broadcasting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, SignalR, Message Broadcasting, Hubs, Real-Time, ASP.NET Core

Description: Learn how to use Azure SignalR Service hubs for broadcasting messages to all connected clients, specific groups, and individual users.

---

Broadcasting is the fundamental operation in SignalR. A hub receives a message and sends it to one or more connected clients. But "broadcasting" covers a wide spectrum - from sending to every connected client, to sending to specific groups, to targeting individual users or even individual connections. Understanding the different broadcasting options and when to use each one is key to building efficient real-time applications.

In this post, I will walk through all the broadcasting patterns available in Azure SignalR Service hubs, with code examples for both ASP.NET Core (Default mode) and Azure Functions (Serverless mode).

## Hub Basics

A hub is a server-side class that acts as the communication pipeline between your server and connected clients. In ASP.NET Core, it extends the `Hub` class:

```csharp
// A basic SignalR hub with different broadcasting methods
// Each method demonstrates a different way to send messages to clients
public class NotificationHub : Hub
{
    // Clients can call this method to broadcast to everyone
    public async Task BroadcastMessage(string message)
    {
        // Send to ALL connected clients, including the sender
        await Clients.All.SendAsync("receiveMessage", new
        {
            text = message,
            sender = Context.UserIdentifier,
            timestamp = DateTime.UtcNow
        });
    }
}
```

The hub is registered in your application pipeline:

```csharp
// Register the hub endpoint in Program.cs
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSignalR().AddAzureSignalR();

var app = builder.Build();
app.MapHub<NotificationHub>("/hub/notifications");
app.Run();
```

## Broadcasting to All Clients

The simplest pattern: send a message to every connected client.

```csharp
// Send to every connected client
public async Task SendToAll(string message)
{
    await Clients.All.SendAsync("notification", message);
}
```

Use this for system-wide announcements, global status updates, or any event that every user needs to know about. Be mindful of the volume, though. If you have 10,000 connected clients, a broadcast means 10,000 individual messages. At high frequency, this adds up quickly.

## Broadcasting to All Except the Sender

When a user sends a message, they often do not need to receive it back (they already know what they sent). Use `Clients.Others` to exclude the calling client:

```csharp
// Send to everyone except the client who called this method
public async Task SendToOthers(string message)
{
    await Clients.Others.SendAsync("notification", new
    {
        text = message,
        sender = Context.UserIdentifier
    });
}
```

This is the standard pattern for chat messages. The sender updates their own UI immediately (for responsiveness), and `Clients.Others` notifies everyone else.

## Sending to Specific Clients

If you know the connection ID of a specific client, you can send directly to them:

```csharp
// Send to a specific client by connection ID
public async Task SendToConnection(string connectionId, string message)
{
    await Clients.Client(connectionId).SendAsync("directMessage", message);
}

// Send to multiple specific connections
public async Task SendToConnections(List<string> connectionIds, string message)
{
    await Clients.Clients(connectionIds).SendAsync("directMessage", message);
}
```

Connection IDs change on every reconnection, so they are not suitable for persistent addressing. Use user IDs instead for user-targeted messages.

## Sending to a Specific User

Azure SignalR Service supports user-targeted messaging. If a user has multiple connections (multiple browser tabs, phone and desktop), the message goes to all of them:

```csharp
// Send to a specific user (all their connections)
// The user ID is set during authentication
public async Task SendToUser(string userId, string message)
{
    await Clients.User(userId).SendAsync("personalNotification", message);
}

// Send to multiple users
public async Task SendToUsers(List<string> userIds, string message)
{
    await Clients.Users(userIds).SendAsync("personalNotification", message);
}
```

The user identifier is determined by the `IUserIdProvider` implementation. By default, it uses the `NameIdentifier` claim from the JWT token.

## Group Broadcasting

Groups are the most versatile broadcasting mechanism. A group is a named set of connections that you can send messages to collectively. Groups are dynamic - connections join and leave at runtime.

```csharp
// Group management and broadcasting
public class CollaborationHub : Hub
{
    // Add the current connection to a group
    public async Task JoinGroup(string groupName)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

        // Notify the group about the new member
        await Clients.Group(groupName).SendAsync("memberJoined", new
        {
            userId = Context.UserIdentifier,
            groupName
        });
    }

    // Remove the current connection from a group
    public async Task LeaveGroup(string groupName)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);

        await Clients.Group(groupName).SendAsync("memberLeft", new
        {
            userId = Context.UserIdentifier,
            groupName
        });
    }

    // Send a message to everyone in a specific group
    public async Task SendToGroup(string groupName, string message)
    {
        await Clients.Group(groupName).SendAsync("groupMessage", new
        {
            text = message,
            sender = Context.UserIdentifier,
            group = groupName,
            timestamp = DateTime.UtcNow
        });
    }

    // Send to a group but exclude the sender
    public async Task SendToOthersInGroup(string groupName, string message)
    {
        await Clients.OthersInGroup(groupName).SendAsync("groupMessage", new
        {
            text = message,
            sender = Context.UserIdentifier,
            group = groupName,
            timestamp = DateTime.UtcNow
        });
    }

    // Send to multiple groups at once
    public async Task SendToMultipleGroups(List<string> groups, string message)
    {
        foreach (var group in groups)
        {
            await Clients.Group(group).SendAsync("groupMessage", new
            {
                text = message,
                sender = Context.UserIdentifier,
                group
            });
        }
    }
}
```

Common use cases for groups:
- Chat rooms
- Document collaboration sessions
- Tenant-scoped notifications in multi-tenant apps
- Role-based notifications (admin group, support group, etc.)
- Geographic regions for location-based updates

## Broadcasting from Outside the Hub

You do not always want to send messages from inside a hub method. Often, a background service, a controller, or another part of your application needs to broadcast. Use `IHubContext` for this:

```csharp
// Controller that broadcasts through the hub
// Uses IHubContext to send messages without being inside a hub method
[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly IHubContext<NotificationHub> _hubContext;

    public OrdersController(IHubContext<NotificationHub> hubContext)
    {
        _hubContext = hubContext;
    }

    [HttpPost]
    public async Task<IActionResult> CreateOrder(Order order)
    {
        // Process the order...
        var savedOrder = await _orderService.Create(order);

        // Notify all connected clients about the new order
        await _hubContext.Clients.All.SendAsync("orderCreated", new
        {
            orderId = savedOrder.Id,
            status = savedOrder.Status,
            createdAt = savedOrder.CreatedAt
        });

        // Notify the specific user who placed the order
        await _hubContext.Clients.User(order.UserId).SendAsync("yourOrderConfirmed", new
        {
            orderId = savedOrder.Id,
            estimatedDelivery = savedOrder.EstimatedDelivery
        });

        return Ok(savedOrder);
    }
}
```

You can also use `IHubContext` in background services:

```csharp
// Background service that broadcasts periodic updates
public class PriceUpdateService : BackgroundService
{
    private readonly IHubContext<NotificationHub> _hubContext;

    public PriceUpdateService(IHubContext<NotificationHub> hubContext)
    {
        _hubContext = hubContext;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var prices = await FetchLatestPrices();

            // Broadcast price updates to the "traders" group
            await _hubContext.Clients.Group("traders").SendAsync("priceUpdate", prices);

            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
    }
}
```

## Serverless Mode Broadcasting

In Serverless mode with Azure Functions, broadcasting works through output bindings:

```typescript
// Broadcast to all clients from an Azure Function
import { app, output, InvocationContext } from "@azure/functions";

const signalROutput = output.generic({
    type: "signalR",
    name: "signalRMessages",
    hubName: "notifications"
});

// Broadcast to all connected clients
app.http("broadcastAll", {
    methods: ["POST"],
    extraOutputs: [signalROutput],
    handler: async (request, context) => {
        const body = await request.json();

        context.extraOutputs.set(signalROutput, [{
            target: "notification",
            arguments: [body]
        }]);

        return { status: 200 };
    }
});

// Send to a specific user
app.http("sendToUser", {
    methods: ["POST"],
    extraOutputs: [signalROutput],
    handler: async (request, context) => {
        const body = await request.json();

        context.extraOutputs.set(signalROutput, [{
            target: "personalNotification",
            userId: body.userId,
            arguments: [body.message]
        }]);

        return { status: 200 };
    }
});

// Send to a group
app.http("sendToGroup", {
    methods: ["POST"],
    extraOutputs: [signalROutput],
    handler: async (request, context) => {
        const body = await request.json();

        context.extraOutputs.set(signalROutput, [{
            target: "groupMessage",
            groupName: body.groupName,
            arguments: [body.message]
        }]);

        return { status: 200 };
    }
});
```

## Managing Groups in Serverless Mode

In Serverless mode, group management also happens through output bindings:

```typescript
// Add a user to a group in Serverless mode
app.http("addToGroup", {
    methods: ["POST"],
    extraOutputs: [signalROutput],
    handler: async (request, context) => {
        const body = await request.json();

        context.extraOutputs.set(signalROutput, [{
            actionName: "add",
            userId: body.userId,
            groupName: body.groupName
        }]);

        return { status: 200 };
    }
});

// Remove a user from a group
app.http("removeFromGroup", {
    methods: ["POST"],
    extraOutputs: [signalROutput],
    handler: async (request, context) => {
        const body = await request.json();

        context.extraOutputs.set(signalROutput, [{
            actionName: "remove",
            userId: body.userId,
            groupName: body.groupName
        }]);

        return { status: 200 };
    }
});
```

## Broadcasting Performance Tips

When broadcasting at scale, keep these things in mind:

**Batch messages when possible.** If you are sending updates for multiple items, combine them into a single message with an array payload rather than sending individual messages for each item.

**Use groups to narrow the audience.** Broadcasting to all clients when only 10% of them care about the message wastes bandwidth. Use groups to segment your audience.

**Keep payloads small.** Every byte you add to a message gets multiplied by the number of recipients. Send IDs and let clients fetch full details if needed.

**Consider message ordering.** SignalR does not guarantee message ordering across groups or users. If ordering matters, include a sequence number or timestamp in your messages.

**Monitor broadcasting latency.** Track the time between sending a message and clients receiving it. If latency increases, you might need to scale up your SignalR Service units or optimize your hub methods.

## Summary

Azure SignalR Service hubs provide a complete set of broadcasting primitives: all clients, all except sender, specific connections, specific users, and groups. In Default mode, these are available as methods on the `Clients` property. In Serverless mode, they map to output binding properties. Use `IHubContext` to broadcast from outside the hub. Keep your audiences targeted with groups, your payloads small, and your hub methods fast. The broadcasting model is simple but powerful, and choosing the right targeting method for each message type is what makes a real-time application feel responsive and efficient.
