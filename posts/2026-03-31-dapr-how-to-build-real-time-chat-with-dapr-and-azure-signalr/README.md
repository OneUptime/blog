# How to Build Real-Time Chat with Dapr and Azure SignalR

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure SignalR, Real-Time, WebSocket, Pub/Sub, Microservice

Description: Learn how to build a scalable real-time chat application using Dapr pub/sub for message routing and Azure SignalR Service for WebSocket delivery to browser clients.

---

Building real-time chat with WebSockets in a multi-instance microservices environment is tricky: a message sent to one server instance must be broadcast to clients connected to other instances. Azure SignalR Service solves the WebSocket scaling problem, and Dapr pub/sub provides the inter-service message bus that routes messages between instances. This guide combines both to build a horizontally scalable real-time chat backend.

## Architecture

```text
Browser A                    Browser B
   |                              |
   | WebSocket                    | WebSocket
   v                              v
Azure SignalR Service (managed WebSocket relay)
   ^                              ^
   |  Send to user/group          |
   |                              |
Chat Server Instance 1    Chat Server Instance 2
   |                              |
   +--- Dapr Pub/Sub (pubsub) ----+
            (Redis or Service Bus)
```

When Browser A sends a message:
1. The message hits Chat Server Instance 1 via REST
2. Instance 1 publishes the message to Dapr pub/sub
3. One chat server instance receives the event (Dapr delivers to one instance in the consumer group)
4. That instance calls Azure SignalR Service, which pushes the message to all clients in the group

## Setting Up Azure SignalR Service

```bash
# Create Azure SignalR Service
RESOURCE_GROUP="chat-demo"
SIGNALR_NAME="dapr-chat-signalr"

az group create --name $RESOURCE_GROUP --location eastus

az signalr create \
  --name $SIGNALR_NAME \
  --resource-group $RESOURCE_GROUP \
  --sku Standard_S1 \
  --unit-count 1 \
  --service-mode Default

SIGNALR_CONNECTION_STRING=$(az signalr key list \
  --name $SIGNALR_NAME \
  --resource-group $RESOURCE_GROUP \
  --query primaryConnectionString -o tsv)

echo "SignalR Connection String: $SIGNALR_CONNECTION_STRING"
```

## The Chat Server Application

```csharp
// Program.cs
using Microsoft.AspNetCore.SignalR;

var builder = WebApplication.CreateBuilder(args);

// Add Azure SignalR
builder.Services.AddSignalR()
    .AddAzureSignalR(builder.Configuration["SignalR:ConnectionString"]);

// Add Dapr
builder.Services.AddControllers().AddDapr();

var app = builder.Build();

app.UseRouting();
app.MapHub<ChatHub>("/chat");
app.MapControllers();
app.MapSubscribeHandler();

app.Run();
```

Define the SignalR hub:

```csharp
// Hubs/ChatHub.cs
using Microsoft.AspNetCore.SignalR;

public class ChatHub : Hub
{
    public async Task JoinRoom(string roomId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"room-{roomId}");
        await Clients.Group($"room-{roomId}")
            .SendAsync("UserJoined", Context.ConnectionId, roomId);
    }

    public async Task LeaveRoom(string roomId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"room-{roomId}");
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // SignalR handles cleanup automatically for groups
        await base.OnDisconnectedAsync(exception);
    }
}
```

Create the message API controller:

```csharp
// Controllers/ChatController.cs
using Dapr;
using Dapr.Client;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

[ApiController]
[Route("api/chat")]
public class ChatController : ControllerBase
{
    private readonly DaprClient _daprClient;
    private readonly IHubContext<ChatHub> _hubContext;

    public ChatController(DaprClient daprClient, IHubContext<ChatHub> hubContext)
    {
        _daprClient = daprClient;
        _hubContext = hubContext;
    }

    // Client sends message to this endpoint
    [HttpPost("rooms/{roomId}/messages")]
    public async Task<IActionResult> SendMessage(
        string roomId,
        [FromBody] SendMessageRequest req)
    {
        var message = new ChatMessage
        {
            Id = Guid.NewGuid().ToString(),
            RoomId = roomId,
            UserId = req.UserId,
            Username = req.Username,
            Content = req.Content,
            Timestamp = DateTime.UtcNow
        };

        // Publish to Dapr pub/sub so one server instance processes it
        await _daprClient.PublishEventAsync(
            "pubsub",
            "chat-messages",
            message);

        return Accepted(new { messageId = message.Id });
    }

    // Dapr pub/sub subscription handler
    [Topic("pubsub", "chat-messages")]
    [HttpPost("internal/room-message")]
    public async Task<IActionResult> HandleRoomMessage([FromBody] ChatMessage message)
    {
        // Push to all clients in the room via Azure SignalR
        await _hubContext.Clients
            .Group($"room-{message.RoomId}")
            .SendAsync("ReceiveMessage", message);

        return Ok();
    }
}

public record SendMessageRequest(string UserId, string Username, string Content);
public record ChatMessage
{
    public string Id { get; init; } = "";
    public string RoomId { get; init; } = "";
    public string UserId { get; init; } = "";
    public string Username { get; init; } = "";
    public string Content { get; init; } = "";
    public DateTime Timestamp { get; init; }
}
```

## Dapr Components Configuration

```yaml
# components/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
```

For production, use Azure Service Bus or Azure Event Hubs for better durability:

```yaml
# components/pubsub-servicebus.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.azure.servicebus.topics
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: servicebus-secret
      key: connectionString
  - name: maxConcurrentHandlers
    value: "10"
```

## The Browser Client

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Dapr + SignalR Chat</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/microsoft-signalr/7.0.0/signalr.min.js"></script>
</head>
<body>
    <input id="username" placeholder="Your name" />
    <input id="roomId" placeholder="Room ID" value="general" />
    <button onclick="joinRoom()">Join Room</button>
    <div id="messages"></div>
    <input id="messageInput" placeholder="Type a message..." />
    <button onclick="sendMessage()">Send</button>

    <script>
        const connection = new signalR.HubConnectionBuilder()
            .withUrl("/chat")
            .withAutomaticReconnect()
            .build();

        connection.on("ReceiveMessage", (msg) => {
            const div = document.getElementById("messages");
            div.innerHTML += `<p><b>${msg.username}</b>: ${msg.content}</p>`;
        });

        connection.on("UserJoined", (connectionId, roomId) => {
            console.log(`User ${connectionId} joined ${roomId}`);
        });

        async function joinRoom() {
            await connection.start();
            const roomId = document.getElementById("roomId").value;
            await connection.invoke("JoinRoom", roomId);
            console.log(`Joined room: ${roomId}`);
        }

        async function sendMessage() {
            const roomId = document.getElementById("roomId").value;
            const username = document.getElementById("username").value;
            const content = document.getElementById("messageInput").value;

            await fetch(`/api/chat/rooms/${roomId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: "user1", username, content })
            });

            document.getElementById("messageInput").value = "";
        }
    </script>
</body>
</html>
```

## Deploying to Kubernetes

```bash
# Apply the deployment with Dapr annotations
kubectl apply -f - << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chat-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: chat-service
  template:
    metadata:
      labels:
        app: chat-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "chat-service"
        dapr.io/app-port: "8080"
    spec:
      containers:
      - name: chat-service
        image: myregistry/chat-service:latest
        ports:
        - containerPort: 8080
        env:
        - name: SignalR__ConnectionString
          valueFrom:
            secretKeyRef:
              name: signalr-secret
              key: connectionString
EOF
```

## Summary

Combining Dapr pub/sub with Azure SignalR Service creates a scalable real-time chat architecture where the WebSocket connection management is fully delegated to the managed SignalR service, and message routing across server instances is handled by Dapr's pub/sub API. Each chat server instance subscribes to the chat messages topic, and when an instance receives a message, it pushes it to the correct SignalR group via Azure SignalR Service, which delivers it to all connected clients. This pattern scales horizontally without any sticky sessions or custom connection tracking code.
