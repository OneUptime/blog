# How to Use Azure Web PubSub Subprotocols for Reliable Messaging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Web PubSub, Subprotocols, Reliable Messaging, WebSocket, JSON, Protocol

Description: Explore Azure Web PubSub subprotocols to enable reliable messaging, client-side group management, and acknowledgment-based delivery.

---

When you connect a plain WebSocket client to Azure Web PubSub, you get basic message delivery. The server sends a message, the client receives it, and that is about it. But what if you need to know whether a message was actually delivered? What if you want the client to join and leave groups on its own without going through the server? That is where subprotocols come in.

Azure Web PubSub supports the `json.webpubsub.azure.v1` subprotocol, which adds a structured messaging layer on top of raw WebSocket communication. It gives you features like client-side group management, message acknowledgments, and typed message frames. In this post, I will explain how to use this subprotocol and why it matters for building reliable real-time applications.

## What the Subprotocol Gives You

Without a subprotocol, your client is a passive receiver. It can only get messages pushed from the server. With the `json.webpubsub.azure.v1` subprotocol, your client can:

- Join and leave groups directly from the client side
- Send messages to groups without going through your server
- Receive acknowledgments for sent messages
- Get structured event frames instead of raw text

This means less round-tripping through your server for common operations, and more confidence that messages are being delivered.

## Connecting with the Subprotocol

To use the subprotocol, specify it when opening the WebSocket connection. The client must also have the appropriate roles in its access token.

```javascript
// server-token.js - Generate a token with subprotocol permissions
const { WebPubSubServiceClient } = require('@azure/web-pubsub');

const connectionString = process.env.WEBPUBSUB_CONNECTION_STRING;
const serviceClient = new WebPubSubServiceClient(connectionString, 'chat');

async function getClientUrl(userId) {
  // The client needs joinLeaveGroup and sendToGroup roles
  // to use the subprotocol's group features
  const token = await serviceClient.getClientAccessUrl({
    userId: userId,
    roles: ['webpubsub.joinLeaveGroup', 'webpubsub.sendToGroup']
  });

  return token.url;
}
```

On the client side, pass the subprotocol name when creating the WebSocket.

```javascript
// client-subprotocol.js - Connecting with the subprotocol
const url = 'wss://your-instance.webpubsub.azure.com/client/hubs/chat?access_token=...';

// Specify the subprotocol as the second argument
const ws = new WebSocket(url, 'json.webpubsub.azure.v1');

ws.onopen = () => {
  console.log('Connected with subprotocol:', ws.protocol);
};

ws.onmessage = (event) => {
  // All messages are JSON frames with a "type" field
  const frame = JSON.parse(event.data);
  console.log('Received frame:', frame.type, frame);
};
```

Once connected, the first message you receive is a `system` frame containing your connection ID.

```json
{
  "type": "system",
  "event": "connected",
  "userId": "user-123",
  "connectionId": "abc-def-123"
}
```

## Client-Side Group Management

One of the most useful features of the subprotocol is joining and leaving groups directly from the client. No server round-trip needed.

```javascript
// group-management.js - Joining and leaving groups from the client
function joinGroup(ws, groupName) {
  // Send a joinGroup frame to the service
  ws.send(JSON.stringify({
    type: 'joinGroup',
    group: groupName,
    ackId: 1 // Optional: include an ackId to receive a confirmation
  }));
}

function leaveGroup(ws, groupName) {
  ws.send(JSON.stringify({
    type: 'leaveGroup',
    group: groupName,
    ackId: 2
  }));
}

// Usage
ws.onopen = () => {
  joinGroup(ws, 'room-general');
  joinGroup(ws, 'room-engineering');
};
```

If you include an `ackId` in the frame, the service sends back an acknowledgment.

```json
{
  "type": "ack",
  "ackId": 1,
  "success": true
}
```

If the join fails (for example, because the client does not have the `joinLeaveGroup` role), the ack will include an error.

```json
{
  "type": "ack",
  "ackId": 1,
  "success": false,
  "error": {
    "name": "Forbidden",
    "message": "Client does not have permission to join groups."
  }
}
```

## Sending Messages to Groups

With the subprotocol, clients can send messages directly to groups without your server acting as an intermediary.

```javascript
// send-to-group.js - Sending messages to a group from the client
function sendToGroup(ws, group, data, ackId) {
  ws.send(JSON.stringify({
    type: 'sendToGroup',
    group: group,
    dataType: 'json', // Can be 'json', 'text', or 'binary'
    data: data,
    ackId: ackId // Include for delivery confirmation
  }));
}

// Send a chat message to the room
sendToGroup(ws, 'room-general', {
  from: 'user-123',
  text: 'Hello everyone!',
  timestamp: Date.now()
}, 100);
```

The `dataType` field determines how the data is serialized. Use `json` for structured data, `text` for strings, and `binary` for binary payloads.

## Building a Reliable Message Tracker

The `ackId` mechanism is the foundation of reliable messaging. By tracking acknowledgments, you can know exactly which messages were delivered and retry those that were not.

```javascript
// message-tracker.js - Track message delivery with ackIds
class MessageTracker {
  constructor(ws) {
    this.ws = ws;
    this.ackCounter = 0;
    this.pending = new Map(); // ackId -> { resolve, reject, timer }

    // Listen for ack frames
    ws.addEventListener('message', (event) => {
      const frame = JSON.parse(event.data);
      if (frame.type === 'ack') {
        this.handleAck(frame);
      }
    });
  }

  // Send a message and return a promise that resolves on ack
  send(group, data, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      const ackId = ++this.ackCounter;

      // Set a timeout for the acknowledgment
      const timer = setTimeout(() => {
        this.pending.delete(ackId);
        reject(new Error(`Message ${ackId} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pending.set(ackId, { resolve, reject, timer });

      // Send the message with the ackId
      this.ws.send(JSON.stringify({
        type: 'sendToGroup',
        group: group,
        dataType: 'json',
        data: data,
        ackId: ackId
      }));
    });
  }

  handleAck(frame) {
    const entry = this.pending.get(frame.ackId);
    if (!entry) return;

    clearTimeout(entry.timer);
    this.pending.delete(frame.ackId);

    if (frame.success) {
      entry.resolve(frame);
    } else {
      entry.reject(new Error(frame.error?.message || 'Message delivery failed'));
    }
  }
}
```

You can use the tracker like this:

```javascript
// Using the message tracker for reliable delivery
const tracker = new MessageTracker(ws);

try {
  await tracker.send('room-general', { text: 'Important update' });
  console.log('Message confirmed delivered');
} catch (err) {
  console.error('Message delivery failed:', err.message);
  // Retry logic here
}
```

## Receiving Group Messages

When a message is sent to a group (either from another client or from the server), connected clients in that group receive a message frame.

```json
{
  "type": "message",
  "from": "group",
  "group": "room-general",
  "dataType": "json",
  "data": {
    "from": "user-456",
    "text": "Hello everyone!",
    "timestamp": 1708099200000
  }
}
```

The `from` field tells you the origin: `group` means it came from a group broadcast, `server` means it was sent by your application server.

```javascript
// message-router.js - Route incoming messages by type and origin
ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);

  switch (frame.type) {
    case 'system':
      handleSystemEvent(frame);
      break;

    case 'message':
      if (frame.from === 'group') {
        handleGroupMessage(frame.group, frame.data);
      } else if (frame.from === 'server') {
        handleServerMessage(frame.data);
      }
      break;

    case 'ack':
      // Handled by the MessageTracker
      break;

    default:
      console.warn('Unknown frame type:', frame.type);
  }
};

function handleGroupMessage(group, data) {
  console.log(`[${group}] ${data.from}: ${data.text}`);
}

function handleServerMessage(data) {
  console.log('Server says:', data);
}
```

## Sending Events to the Server

You can also send custom events to your server's event handler from the client.

```javascript
// send-event.js - Send a custom event to the server
function sendEvent(ws, eventName, data, ackId) {
  ws.send(JSON.stringify({
    type: 'event',
    event: eventName,
    dataType: 'json',
    data: data,
    ackId: ackId
  }));
}

// Send a typing indicator event to the server
sendEvent(ws, 'typing', { room: 'room-general' }, 200);
```

Your server's event handler receives this as a user event with the event name you specified.

## When to Use the Subprotocol vs. Raw WebSocket

Use the subprotocol when:
- You want clients to manage their own group memberships
- You need delivery confirmation for messages
- You want peer-to-peer messaging through groups without server involvement
- You need structured message framing

Stick with raw WebSocket when:
- Your server controls all message routing
- Clients are passive receivers (dashboards, live feeds)
- You want minimal protocol overhead
- Your client library does not support subprotocols

## Wrapping Up

The `json.webpubsub.azure.v1` subprotocol transforms Azure Web PubSub from a server-push system into a full real-time messaging platform. Clients can manage their own group memberships, send messages directly to groups, and get delivery confirmations through the ack mechanism. This reduces the load on your server, decreases latency for common operations, and gives you the tools to build reliable messaging patterns. If you are building anything more than a simple broadcast application, the subprotocol is the way to go.
