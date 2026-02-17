# How to Implement Group Messaging with Azure SignalR Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, SignalR, Group Messaging, Real-Time, WebSockets, ASP.NET Core

Description: A comprehensive guide to implementing group messaging with Azure SignalR Service for targeted real-time communication in multi-tenant and collaboration scenarios.

---

Groups in Azure SignalR Service let you organize connected clients into logical segments and send messages to specific segments rather than broadcasting to everyone. This is essential for almost every real-time application - chat rooms, collaborative editing, multi-tenant dashboards, live sports updates per game, or stock price feeds per portfolio. Without groups, you would either broadcast everything to everyone (wasteful and insecure) or manage individual connections yourself (complex and error-prone).

In this post, I will cover group management, messaging patterns, authorization, and the architectural considerations that matter when groups get large or numerous.

## How Groups Work

A group in SignalR is simply a named collection of connections. You add connections to groups and remove them from groups. When you send a message to a group, every connection in that group receives it. That is the entire API surface.

Groups have some important characteristics:
- Groups are created implicitly when you add the first connection. You do not need to create them ahead of time.
- Groups are destroyed implicitly when the last connection leaves.
- A connection can belong to multiple groups simultaneously.
- Group membership is not persisted. When a connection disconnects, it is automatically removed from all groups.
- Groups work across server instances because Azure SignalR Service manages them centrally.

## Basic Group Operations in Default Mode

Here is how to manage groups and send messages in an ASP.NET Core hub:

```csharp
// Hub with group management for a multi-room messaging application
public class MessagingHub : Hub
{
    private readonly ILogger<MessagingHub> _logger;

    public MessagingHub(ILogger<MessagingHub> logger)
    {
        _logger = logger;
    }

    // Add the current connection to a group
    public async Task JoinGroup(string groupName)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

        _logger.LogInformation("Connection {ConnectionId} joined group {Group}",
            Context.ConnectionId, groupName);

        // Notify the group that someone joined
        await Clients.Group(groupName).SendAsync("memberJoined", new
        {
            userId = Context.UserIdentifier,
            group = groupName,
            timestamp = DateTime.UtcNow
        });

        // Send a confirmation to the joining client
        await Clients.Caller.SendAsync("joinedGroup", groupName);
    }

    // Remove the current connection from a group
    public async Task LeaveGroup(string groupName)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);

        _logger.LogInformation("Connection {ConnectionId} left group {Group}",
            Context.ConnectionId, groupName);

        // Notify the group
        await Clients.Group(groupName).SendAsync("memberLeft", new
        {
            userId = Context.UserIdentifier,
            group = groupName,
            timestamp = DateTime.UtcNow
        });
    }

    // Send a message to a specific group
    public async Task SendToGroup(string groupName, string message)
    {
        await Clients.Group(groupName).SendAsync("groupMessage", new
        {
            sender = Context.UserIdentifier,
            group = groupName,
            content = message,
            timestamp = DateTime.UtcNow
        });
    }

    // Send a message to a group but exclude the sender
    public async Task SendToOthersInGroup(string groupName, string message)
    {
        await Clients.OthersInGroup(groupName).SendAsync("groupMessage", new
        {
            sender = Context.UserIdentifier,
            group = groupName,
            content = message,
            timestamp = DateTime.UtcNow
        });
    }

    // Clean up when a connection drops
    public override async Task OnDisconnectedAsync(Exception exception)
    {
        // SignalR automatically removes the connection from all groups
        // But you might want to notify those groups
        _logger.LogInformation("Connection {ConnectionId} disconnected",
            Context.ConnectionId);

        await base.OnDisconnectedAsync(exception);
    }
}
```

## Automatic Group Assignment on Connection

A common pattern is to automatically add users to groups based on their identity or claims when they connect:

```csharp
// Automatically assign users to groups based on their JWT claims
public override async Task OnConnectedAsync()
{
    var userId = Context.UserIdentifier;
    var claims = Context.User?.Claims;

    // Add to a personal group (for user-targeted messaging via groups)
    await Groups.AddToGroupAsync(Context.ConnectionId, $"user-{userId}");

    // Add to role-based groups
    var roles = claims?.Where(c => c.Type == "role").Select(c => c.Value) ?? Array.Empty<string>();
    foreach (var role in roles)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"role-{role}");
        _logger.LogInformation("User {UserId} added to role group {Role}", userId, role);
    }

    // Add to tenant group (multi-tenant applications)
    var tenantId = claims?.FirstOrDefault(c => c.Type == "tenant_id")?.Value;
    if (!string.IsNullOrEmpty(tenantId))
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"tenant-{tenantId}");
    }

    // Add to region-based group
    var region = Context.GetHttpContext()?.Request.Headers["X-Client-Region"].ToString();
    if (!string.IsNullOrEmpty(region))
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"region-{region}");
    }

    await base.OnConnectedAsync();
}
```

## Group Operations in Serverless Mode

In Serverless mode with Azure Functions, group management uses output bindings:

```typescript
// Azure Functions for group management in Serverless mode
import { app, output, InvocationContext, HttpRequest } from "@azure/functions";

const signalROutput = output.generic({
    type: "signalR",
    name: "signalRMessages",
    hubName: "messaging"
});

// Add a user to a group
app.http("joinGroup", {
    methods: ["POST"],
    extraOutputs: [signalROutput],
    handler: async (request: HttpRequest, context: InvocationContext) => {
        const body = await request.json() as any;

        context.extraOutputs.set(signalROutput, [{
            // The 'add' action adds a user to a group
            actionName: "add",
            userId: body.userId,
            groupName: body.groupName
        }]);

        return { status: 200, jsonBody: { joined: body.groupName } };
    }
});

// Remove a user from a group
app.http("leaveGroup", {
    methods: ["POST"],
    extraOutputs: [signalROutput],
    handler: async (request: HttpRequest, context: InvocationContext) => {
        const body = await request.json() as any;

        context.extraOutputs.set(signalROutput, [{
            // The 'remove' action removes a user from a group
            actionName: "remove",
            userId: body.userId,
            groupName: body.groupName
        }]);

        return { status: 200, jsonBody: { left: body.groupName } };
    }
});

// Send a message to a group
app.http("messageGroup", {
    methods: ["POST"],
    extraOutputs: [signalROutput],
    handler: async (request: HttpRequest, context: InvocationContext) => {
        const body = await request.json() as any;

        context.extraOutputs.set(signalROutput, [{
            target: "groupMessage",
            groupName: body.groupName,
            arguments: [{
                sender: body.senderId,
                content: body.message,
                timestamp: new Date().toISOString()
            }]
        }]);

        return { status: 200 };
    }
});
```

## Multi-Tenant Messaging Pattern

Multi-tenant applications need strict isolation between tenants. Groups are perfect for this:

```csharp
// Multi-tenant hub that ensures tenant isolation
// Messages sent in one tenant's context never leak to another tenant
public class TenantHub : Hub
{
    // Override to enforce tenant group membership
    public override async Task OnConnectedAsync()
    {
        var tenantId = GetTenantId();
        if (string.IsNullOrEmpty(tenantId))
        {
            Context.Abort(); // Reject connections without a tenant
            return;
        }

        // Every connection is in exactly one tenant group
        await Groups.AddToGroupAsync(Context.ConnectionId, $"tenant-{tenantId}");
        await base.OnConnectedAsync();
    }

    // Broadcast within the caller's tenant only
    public async Task BroadcastInTenant(string eventType, object data)
    {
        var tenantId = GetTenantId();
        await Clients.Group($"tenant-{tenantId}").SendAsync(eventType, data);
    }

    // Send to a specific department within the tenant
    public async Task SendToDepartment(string department, string message)
    {
        var tenantId = GetTenantId();
        var groupName = $"tenant-{tenantId}-dept-{department}";
        await Clients.Group(groupName).SendAsync("departmentMessage", new
        {
            department,
            content = message,
            sender = Context.UserIdentifier
        });
    }

    public async Task JoinDepartment(string department)
    {
        var tenantId = GetTenantId();
        await Groups.AddToGroupAsync(Context.ConnectionId, $"tenant-{tenantId}-dept-{department}");
    }

    private string GetTenantId()
    {
        return Context.User?.FindFirst("tenant_id")?.Value;
    }
}
```

The group naming convention `tenant-{id}-dept-{name}` naturally scopes departments within tenants. A message sent to `tenant-A-dept-engineering` will never reach users in `tenant-B-dept-engineering`.

## Group Authorization

Not every user should be able to join every group. Implement authorization checks before allowing group joins:

```csharp
// Group membership authorization
public async Task JoinGroup(string groupName)
{
    var userId = Context.UserIdentifier;

    // Check if the user is authorized to join this group
    var isAuthorized = await _authorizationService.CanJoinGroup(userId, groupName);
    if (!isAuthorized)
    {
        // Send an error back to the caller
        await Clients.Caller.SendAsync("error", new
        {
            code = "UNAUTHORIZED",
            message = $"You are not authorized to join group '{groupName}'"
        });
        return;
    }

    // Check if the group has a member limit
    var memberCount = await _groupService.GetMemberCount(groupName);
    if (memberCount >= MAX_GROUP_MEMBERS)
    {
        await Clients.Caller.SendAsync("error", new
        {
            code = "GROUP_FULL",
            message = $"Group '{groupName}' has reached its member limit"
        });
        return;
    }

    await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
    await _groupService.TrackMembership(userId, groupName);
    await Clients.Caller.SendAsync("joinedGroup", groupName);
}
```

## Tracking Group Membership

SignalR does not provide a way to list members of a group or check the group's size. You need to track this yourself if your application needs it:

```csharp
// Group membership tracking service
// SignalR manages the actual routing; this service tracks metadata
public class GroupMembershipService
{
    // In production, use Redis or a database
    private static readonly ConcurrentDictionary<string, HashSet<string>> _groupMembers = new();
    private static readonly object _lock = new();

    public void AddToGroup(string groupName, string userId)
    {
        lock (_lock)
        {
            if (!_groupMembers.ContainsKey(groupName))
            {
                _groupMembers[groupName] = new HashSet<string>();
            }
            _groupMembers[groupName].Add(userId);
        }
    }

    public void RemoveFromGroup(string groupName, string userId)
    {
        lock (_lock)
        {
            if (_groupMembers.ContainsKey(groupName))
            {
                _groupMembers[groupName].Remove(userId);
                if (_groupMembers[groupName].Count == 0)
                {
                    _groupMembers.TryRemove(groupName, out _);
                }
            }
        }
    }

    public List<string> GetGroupMembers(string groupName)
    {
        lock (_lock)
        {
            return _groupMembers.TryGetValue(groupName, out var members)
                ? members.ToList()
                : new List<string>();
        }
    }

    public int GetMemberCount(string groupName)
    {
        lock (_lock)
        {
            return _groupMembers.TryGetValue(groupName, out var members)
                ? members.Count
                : 0;
        }
    }
}
```

## Sending from Outside the Hub

Use `IHubContext` to send group messages from controllers, background services, or event handlers:

```csharp
// Background service that sends targeted group updates
public class InventoryUpdateService : BackgroundService
{
    private readonly IHubContext<MessagingHub> _hubContext;

    public InventoryUpdateService(IHubContext<MessagingHub> hubContext)
    {
        _hubContext = hubContext;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            // Check for inventory changes
            var changes = await GetInventoryChanges();

            foreach (var change in changes)
            {
                // Notify only the tenants affected by this inventory change
                await _hubContext.Clients
                    .Group($"tenant-{change.TenantId}")
                    .SendAsync("inventoryUpdate", new
                    {
                        productId = change.ProductId,
                        newQuantity = change.Quantity,
                        warehouse = change.Warehouse
                    }, stoppingToken);
            }

            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
        }
    }
}
```

## Client-Side Group Handling

On the client, handle group-specific events and manage group membership through hub method calls:

```javascript
// Client-side group messaging implementation
const connection = new signalR.HubConnectionBuilder()
    .withUrl("/hub/messaging")
    .withAutomaticReconnect()
    .build();

// Track which groups we've joined (for reconnection)
const joinedGroups = new Set();

// Join a group
async function joinGroup(groupName) {
    try {
        await connection.invoke("JoinGroup", groupName);
        joinedGroups.add(groupName);
        console.log("Joined group:", groupName);
    } catch (err) {
        console.error("Failed to join group:", err);
    }
}

// Leave a group
async function leaveGroup(groupName) {
    try {
        await connection.invoke("LeaveGroup", groupName);
        joinedGroups.delete(groupName);
    } catch (err) {
        console.error("Failed to leave group:", err);
    }
}

// Handle group messages
connection.on("groupMessage", (data) => {
    console.log(`[${data.group}] ${data.sender}: ${data.content}`);
    displayGroupMessage(data);
});

// Rejoin all groups after reconnection
// This is critical because group membership is lost on disconnect
connection.onreconnected(async () => {
    console.log("Reconnected. Rejoining groups...");
    for (const group of joinedGroups) {
        try {
            await connection.invoke("JoinGroup", group);
            console.log("Rejoined group:", group);
        } catch (err) {
            console.error("Failed to rejoin group:", group, err);
        }
    }
});
```

The reconnection handler is critical. When a connection drops and reconnects, all group memberships are lost because the connection ID changes. The client must rejoin all its groups.

## Performance Considerations for Large Groups

Groups with thousands of members work fine in Azure SignalR Service because the service handles the fan-out internally. However, there are things to keep in mind:

- Sending to a group with 10,000 members generates 10,000 individual messages. This counts toward your message quota and bandwidth.
- Very frequent messages to large groups can saturate the service. Consider batching updates or reducing frequency.
- If a group gets extremely large (approaching your total connection count), there is no performance benefit over broadcasting to all clients.

For very large audiences, consider using a tiered approach: broadcast a summary to the large group, and let clients request details on demand through an HTTP endpoint.

## Summary

Group messaging in Azure SignalR Service is the primary mechanism for targeted real-time communication. Add connections to groups based on user identity, roles, tenants, or application state. Send messages to groups instead of broadcasting to all clients. Track group membership separately if you need member lists or counts. Handle reconnection on the client by rejoining groups. And authorize group joins to prevent unauthorized access. Groups are simple in concept but enable sophisticated messaging patterns that form the backbone of any non-trivial real-time application.
