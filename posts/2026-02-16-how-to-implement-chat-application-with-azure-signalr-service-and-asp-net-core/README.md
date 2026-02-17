# How to Implement Chat Application with Azure SignalR Service and ASP.NET Core

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, SignalR, ASP.NET Core, Chat Application, Real-Time, WebSockets

Description: A step-by-step guide to building a real-time chat application using Azure SignalR Service and ASP.NET Core with rooms, typing indicators, and message history.

---

Building a chat application is the classic use case for SignalR, and it is also the best way to learn how the framework works. In this post, I will build a chat application from scratch using ASP.NET Core and Azure SignalR Service. We will go beyond the basic "hello world" chat and implement features that real chat applications need: chat rooms, typing indicators, user presence, message history, and proper error handling.

## Project Setup

Start by creating a new ASP.NET Core project and adding the SignalR and Azure SignalR Service packages:

```bash
# Create a new ASP.NET Core web application
dotnet new web -n ChatApp
cd ChatApp

# Add the Azure SignalR Service package
dotnet add package Microsoft.Azure.SignalR
```

Configure the application in `Program.cs`:

```csharp
// Program.cs - Configure the chat application with Azure SignalR Service
var builder = WebApplication.CreateBuilder(args);

// Add SignalR with Azure SignalR Service
builder.Services.AddSignalR()
    .AddAzureSignalR(options =>
    {
        options.ConnectionString = builder.Configuration["Azure:SignalR:ConnectionString"];
    });

// Add in-memory storage for message history (use a database in production)
builder.Services.AddSingleton<IChatRepository, InMemoryChatRepository>();

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapHub<ChatHub>("/hub/chat");

app.Run();
```

## The Chat Hub

The hub is where all the real-time logic lives. Here is a complete implementation with rooms, typing indicators, and user presence:

```csharp
// ChatHub.cs - The core SignalR hub for the chat application
// Handles room management, messaging, typing indicators, and user presence
using Microsoft.AspNetCore.SignalR;

public class ChatHub : Hub
{
    private readonly IChatRepository _repository;
    private static readonly Dictionary<string, UserInfo> _connectedUsers = new();
    private static readonly object _lock = new();

    public ChatHub(IChatRepository repository)
    {
        _repository = repository;
    }

    // Called when a user joins a chat room
    public async Task JoinRoom(string roomName, string userName)
    {
        // Add to the SignalR group for this room
        await Groups.AddToGroupAsync(Context.ConnectionId, roomName);

        // Track the user's connection
        lock (_lock)
        {
            _connectedUsers[Context.ConnectionId] = new UserInfo
            {
                UserName = userName,
                Room = roomName,
                ConnectedAt = DateTime.UtcNow
            };
        }

        // Send recent message history to the joining user
        var history = await _repository.GetRecentMessages(roomName, 50);
        await Clients.Caller.SendAsync("messageHistory", history);

        // Notify the room that a new user joined
        await Clients.Group(roomName).SendAsync("userJoined", new
        {
            userName,
            timestamp = DateTime.UtcNow,
            activeUsers = GetUsersInRoom(roomName)
        });
    }

    // Called when a user leaves a chat room
    public async Task LeaveRoom(string roomName)
    {
        string userName;
        lock (_lock)
        {
            if (_connectedUsers.TryGetValue(Context.ConnectionId, out var user))
            {
                userName = user.UserName;
                _connectedUsers.Remove(Context.ConnectionId);
            }
            else
            {
                return;
            }
        }

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomName);
        await Clients.Group(roomName).SendAsync("userLeft", new
        {
            userName,
            timestamp = DateTime.UtcNow,
            activeUsers = GetUsersInRoom(roomName)
        });
    }

    // Send a message to a room
    public async Task SendMessage(string roomName, string content)
    {
        UserInfo sender;
        lock (_lock)
        {
            if (!_connectedUsers.TryGetValue(Context.ConnectionId, out sender))
            {
                return;
            }
        }

        var message = new ChatMessage
        {
            Id = Guid.NewGuid().ToString(),
            Room = roomName,
            Sender = sender.UserName,
            Content = content,
            Timestamp = DateTime.UtcNow
        };

        // Persist the message
        await _repository.SaveMessage(message);

        // Broadcast to everyone in the room
        await Clients.Group(roomName).SendAsync("newMessage", message);
    }

    // Typing indicator - broadcast to others in the room
    public async Task StartTyping(string roomName)
    {
        UserInfo sender;
        lock (_lock)
        {
            if (!_connectedUsers.TryGetValue(Context.ConnectionId, out sender))
            {
                return;
            }
        }

        // Send to everyone in the room except the sender
        await Clients.OthersInGroup(roomName).SendAsync("userTyping", new
        {
            userName = sender.UserName,
            isTyping = true
        });
    }

    public async Task StopTyping(string roomName)
    {
        UserInfo sender;
        lock (_lock)
        {
            if (!_connectedUsers.TryGetValue(Context.ConnectionId, out sender))
            {
                return;
            }
        }

        await Clients.OthersInGroup(roomName).SendAsync("userTyping", new
        {
            userName = sender.UserName,
            isTyping = false
        });
    }

    // Handle disconnection (browser close, network drop, etc.)
    public override async Task OnDisconnectedAsync(Exception exception)
    {
        UserInfo user;
        lock (_lock)
        {
            if (_connectedUsers.TryGetValue(Context.ConnectionId, out user))
            {
                _connectedUsers.Remove(Context.ConnectionId);
            }
            else
            {
                await base.OnDisconnectedAsync(exception);
                return;
            }
        }

        await Clients.Group(user.Room).SendAsync("userLeft", new
        {
            userName = user.UserName,
            timestamp = DateTime.UtcNow,
            activeUsers = GetUsersInRoom(user.Room)
        });

        await base.OnDisconnectedAsync(exception);
    }

    // Helper to get all users in a specific room
    private List<string> GetUsersInRoom(string room)
    {
        lock (_lock)
        {
            return _connectedUsers.Values
                .Where(u => u.Room == room)
                .Select(u => u.UserName)
                .Distinct()
                .ToList();
        }
    }
}
```

## Data Models

Define the models used by the hub:

```csharp
// Models for the chat application
public class UserInfo
{
    public string UserName { get; set; }
    public string Room { get; set; }
    public DateTime ConnectedAt { get; set; }
}

public class ChatMessage
{
    public string Id { get; set; }
    public string Room { get; set; }
    public string Sender { get; set; }
    public string Content { get; set; }
    public DateTime Timestamp { get; set; }
}
```

## Message Repository

For message persistence, here is a simple in-memory implementation. In production, swap this for a database:

```csharp
// Chat repository interface and in-memory implementation
// Replace with a database-backed implementation for production
public interface IChatRepository
{
    Task SaveMessage(ChatMessage message);
    Task<List<ChatMessage>> GetRecentMessages(string room, int count);
}

public class InMemoryChatRepository : IChatRepository
{
    private readonly List<ChatMessage> _messages = new();
    private readonly object _lock = new();

    public Task SaveMessage(ChatMessage message)
    {
        lock (_lock)
        {
            _messages.Add(message);
            // Keep only the last 1000 messages per room to prevent memory issues
            var roomMessages = _messages.Where(m => m.Room == message.Room).ToList();
            if (roomMessages.Count > 1000)
            {
                _messages.RemoveAll(m => m.Room == message.Room);
                _messages.AddRange(roomMessages.Skip(roomMessages.Count - 1000));
            }
        }
        return Task.CompletedTask;
    }

    public Task<List<ChatMessage>> GetRecentMessages(string room, int count)
    {
        lock (_lock)
        {
            return Task.FromResult(
                _messages
                    .Where(m => m.Room == room)
                    .OrderByDescending(m => m.Timestamp)
                    .Take(count)
                    .OrderBy(m => m.Timestamp)
                    .ToList()
            );
        }
    }
}
```

## Client-Side Implementation

Create the HTML and JavaScript for the chat interface. Put this in `wwwroot/index.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Chat App</title>
    <style>
        /* Basic chat UI styling */
        body { font-family: sans-serif; margin: 0; padding: 20px; }
        #chat-container { max-width: 800px; margin: 0 auto; }
        #messages { height: 400px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; }
        .message { margin-bottom: 8px; }
        .message .sender { font-weight: bold; }
        .message .time { color: #888; font-size: 0.8em; }
        .system-message { color: #666; font-style: italic; }
        #typing-indicator { height: 20px; color: #888; font-size: 0.9em; }
        #user-list { float: right; width: 200px; border: 1px solid #ccc; padding: 10px; }
        input[type="text"] { width: 70%; padding: 8px; }
        button { padding: 8px 16px; }
    </style>
</head>
<body>
    <div id="chat-container">
        <div id="login-form">
            <h2>Join Chat</h2>
            <input type="text" id="username" placeholder="Your name" />
            <input type="text" id="roomname" placeholder="Room name" value="general" />
            <button onclick="joinRoom()">Join</button>
        </div>
        <div id="chat-ui" style="display:none;">
            <h2>Room: <span id="room-title"></span></h2>
            <div id="user-list"><strong>Online:</strong><ul id="users"></ul></div>
            <div id="messages"></div>
            <div id="typing-indicator"></div>
            <input type="text" id="message-input" placeholder="Type a message..." onkeyup="handleKeyUp(event)" />
            <button onclick="sendMessage()">Send</button>
        </div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/@microsoft/signalr/dist/browser/signalr.min.js"></script>
    <script src="chat.js"></script>
</body>
</html>
```

And the JavaScript in `wwwroot/chat.js`:

```javascript
// Chat client implementation using SignalR
// Handles connection, messaging, typing indicators, and user presence
let connection = null;
let currentRoom = null;
let currentUser = null;
let typingTimeout = null;

// Build the SignalR connection
connection = new signalR.HubConnectionBuilder()
    .withUrl("/hub/chat")
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.Information)
    .build();

// Handle incoming messages
connection.on("newMessage", (message) => {
    appendMessage(message.sender, message.content, message.timestamp);
});

// Handle message history when joining a room
connection.on("messageHistory", (messages) => {
    const messagesDiv = document.getElementById("messages");
    messagesDiv.innerHTML = "";
    messages.forEach(msg => appendMessage(msg.sender, msg.content, msg.timestamp));
});

// Handle user join/leave notifications
connection.on("userJoined", (data) => {
    appendSystemMessage(data.userName + " joined the room");
    updateUserList(data.activeUsers);
});

connection.on("userLeft", (data) => {
    appendSystemMessage(data.userName + " left the room");
    updateUserList(data.activeUsers);
});

// Handle typing indicators
connection.on("userTyping", (data) => {
    const indicator = document.getElementById("typing-indicator");
    if (data.isTyping) {
        indicator.textContent = data.userName + " is typing...";
    } else {
        indicator.textContent = "";
    }
});

// Connection lifecycle events
connection.onreconnecting(() => {
    appendSystemMessage("Reconnecting...");
});

connection.onreconnected(() => {
    appendSystemMessage("Reconnected!");
    // Rejoin the room after reconnection
    if (currentRoom && currentUser) {
        connection.invoke("JoinRoom", currentRoom, currentUser);
    }
});

connection.onclose(() => {
    appendSystemMessage("Disconnected. Please refresh the page.");
});

// Join a chat room
async function joinRoom() {
    currentUser = document.getElementById("username").value.trim();
    currentRoom = document.getElementById("roomname").value.trim();

    if (!currentUser || !currentRoom) {
        alert("Please enter your name and room name");
        return;
    }

    try {
        await connection.start();
        await connection.invoke("JoinRoom", currentRoom, currentUser);

        document.getElementById("login-form").style.display = "none";
        document.getElementById("chat-ui").style.display = "block";
        document.getElementById("room-title").textContent = currentRoom;
        document.getElementById("message-input").focus();
    } catch (err) {
        console.error("Failed to connect:", err);
        alert("Failed to connect. Please try again.");
    }
}

// Send a message
async function sendMessage() {
    const input = document.getElementById("message-input");
    const content = input.value.trim();
    if (!content) return;

    try {
        await connection.invoke("SendMessage", currentRoom, content);
        input.value = "";
        // Stop typing indicator
        await connection.invoke("StopTyping", currentRoom);
    } catch (err) {
        console.error("Failed to send message:", err);
    }
}

// Handle keyboard input for sending and typing indicators
function handleKeyUp(event) {
    if (event.key === "Enter") {
        sendMessage();
        return;
    }

    // Send typing indicator with debounce
    connection.invoke("StartTyping", currentRoom);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        connection.invoke("StopTyping", currentRoom);
    }, 2000);
}

// UI helper functions
function appendMessage(sender, content, timestamp) {
    const messagesDiv = document.getElementById("messages");
    const time = new Date(timestamp).toLocaleTimeString();
    const div = document.createElement("div");
    div.className = "message";
    div.innerHTML = '<span class="sender">' + sender + '</span> ' +
                    '<span class="time">' + time + '</span><br/>' + content;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function appendSystemMessage(text) {
    const messagesDiv = document.getElementById("messages");
    const div = document.createElement("div");
    div.className = "system-message";
    div.textContent = text;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function updateUserList(users) {
    const usersList = document.getElementById("users");
    usersList.innerHTML = users.map(u => "<li>" + u + "</li>").join("");
}
```

## Running the Application

Set the Azure SignalR connection string in your app settings:

```bash
# Set the connection string (use user secrets for development)
dotnet user-secrets set "Azure:SignalR:ConnectionString" "Endpoint=https://your-signalr.service.signalr.net;AccessKey=your-key;Version=1.0;"

# Run the application
dotnet run
```

Open multiple browser tabs to `http://localhost:5000` and test the chat.

## Production Considerations

The implementation above works for learning and prototyping. For a production chat application, you need to address several things.

**Message persistence**: Replace the in-memory repository with a database. Azure Cosmos DB works well for chat because it handles high write throughput and supports TTL for automatic message expiration.

**User authentication**: Add proper authentication instead of just a username input. Use JWT tokens as described in other posts in this series.

**Message validation**: Sanitize message content to prevent XSS attacks. Never render user-provided HTML directly.

**File sharing**: For sending images or files, upload them to Azure Blob Storage and send the URL through SignalR rather than the file content itself.

**Read receipts**: Track which messages each user has read by storing the last-read message ID per user per room.

**Push notifications**: When a user is offline, store pending messages and send push notifications via Azure Notification Hubs.

## Summary

Building a chat application with Azure SignalR Service and ASP.NET Core follows a clear pattern: define a hub with methods for joining rooms, sending messages, and managing user presence; implement the client-side handlers for each server event; and connect them through Azure SignalR Service. The service handles all the WebSocket connection management and message routing, so you can focus on the application logic. Start with the basic structure shown here and layer on authentication, persistence, and additional features as your application grows.
