# How to Configure Azure Web PubSub for Real-Time WebSocket Communication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Web PubSub, WebSocket, Real-Time, Cloud, Messaging, Tutorial

Description: Learn how to configure Azure Web PubSub to enable real-time WebSocket communication between your server and connected clients.

---

Real-time communication is at the core of modern applications. Whether you are building a chat application, a live collaboration tool, or a monitoring dashboard, you need a reliable way to push data to clients instantly. Azure Web PubSub is a fully managed service that makes it straightforward to add real-time WebSocket functionality to your applications without managing the underlying infrastructure yourself.

In this post, I will walk through the entire process of setting up Azure Web PubSub from scratch, connecting clients via WebSocket, and sending messages between the server and connected clients.

## What Is Azure Web PubSub?

Azure Web PubSub is a managed service that handles WebSocket connections at scale. Instead of maintaining your own WebSocket servers, dealing with connection pooling, and worrying about load balancing sticky sessions, you hand all of that off to Azure. Your application server communicates with the Web PubSub service via a REST API or server SDK, and the service manages all the WebSocket connections to your clients.

The key components are:

- **Hub**: A logical unit that represents a set of client connections. Think of it as a namespace or channel group.
- **Group**: A subset of connections within a hub. You can broadcast messages to a group rather than all connections.
- **Event handlers**: Server-side endpoints that receive events when clients connect, disconnect, or send messages.

## Prerequisites

Before you start, make sure you have the following ready:

- An Azure subscription
- Azure CLI installed and configured
- Node.js 18 or later (for the examples in this post)
- A basic understanding of WebSocket concepts

## Step 1: Create the Azure Web PubSub Resource

You can create the resource through the Azure portal, but using the CLI keeps things reproducible. Here is the command to create a Web PubSub instance in the East US region.

```bash
# Create a resource group if you don't have one already
az group create --name rg-pubsub-demo --location eastus

# Create the Web PubSub resource with the Free tier for testing
az webpubsub create \
  --name my-pubsub-demo \
  --resource-group rg-pubsub-demo \
  --location eastus \
  --sku Free_F1
```

Once the resource is created, grab the connection string. You will need it for both the server SDK and for generating client access tokens.

```bash
# Retrieve the connection string
az webpubsub key show \
  --name my-pubsub-demo \
  --resource-group rg-pubsub-demo \
  --query primaryConnectionString \
  --output tsv
```

Store this connection string somewhere safe. Do not commit it to version control.

## Step 2: Set Up the Server Application

Install the Azure Web PubSub server SDK for Node.js.

```bash
# Install the server SDK
npm install @azure/web-pubsub
```

Now create a simple server script that generates client access URLs and sends messages to connected clients.

```javascript
// server.js - Server-side application for Azure Web PubSub
const { WebPubSubServiceClient } = require('@azure/web-pubsub');

// Replace with your actual connection string
const connectionString = process.env.WEBPUBSUB_CONNECTION_STRING;
const hubName = 'demo-hub';

// Create the service client
const serviceClient = new WebPubSubServiceClient(connectionString, hubName);

async function main() {
  // Generate a client access URL with a specific user ID
  const token = await serviceClient.getClientAccessUrl({
    userId: 'user-123',
    roles: ['webpubsub.joinLeaveGroup', 'webpubsub.sendToGroup']
  });

  console.log('Client access URL:', token.url);

  // Send a message to all connected clients in the hub
  await serviceClient.sendToAll('Hello from the server!', {
    contentType: 'text/plain'
  });

  console.log('Message sent to all clients');
}

main().catch(console.error);
```

The `getClientAccessUrl` method generates a URL that includes an access token. Clients use this URL to establish a WebSocket connection directly to the Azure Web PubSub service. The roles parameter controls what the client is allowed to do once connected.

## Step 3: Connect a Client via WebSocket

On the client side, you just need a standard WebSocket connection. The URL you got from the server already contains the authentication token.

```javascript
// client.js - Browser or Node.js WebSocket client
const WebSocket = require('ws');

// This URL comes from the server's getClientAccessUrl call
const url = process.argv[2];

if (!url) {
  console.error('Please provide the WebSocket URL as a command line argument');
  process.exit(1);
}

// Open a WebSocket connection to Azure Web PubSub
const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('Connected to Azure Web PubSub');
});

ws.on('message', (data) => {
  // Handle incoming messages from the server or other clients
  console.log('Received:', data.toString());
});

ws.on('close', () => {
  console.log('Disconnected');
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err.message);
});
```

Run the server first to get the client access URL, then pass it to the client script. You should see the client connect and receive any messages sent from the server.

## Step 4: Configure Hub Settings

Hub settings control how your Web PubSub instance behaves. You can configure event handlers, anonymous connect policies, and more through the Azure portal or CLI.

Here is how to configure an event handler that forwards client events to your server endpoint.

```bash
# Configure an event handler for the demo-hub
az webpubsub hub create \
  --name my-pubsub-demo \
  --resource-group rg-pubsub-demo \
  --hub-name demo-hub \
  --event-handler \
    url-template="https://your-server.com/api/pubsub" \
    user-event-pattern="*" \
    system-event="connect,connected,disconnected"
```

This tells Azure Web PubSub to forward all user events and the connect, connected, and disconnected system events to your server endpoint. Your server can then process these events and respond accordingly.

## Step 5: Working with Groups

Groups are useful when you want to send messages to a subset of connected clients. For example, in a chat application, each chat room could be a group.

```javascript
// group-example.js - Working with groups in Azure Web PubSub
const { WebPubSubServiceClient } = require('@azure/web-pubsub');

const connectionString = process.env.WEBPUBSUB_CONNECTION_STRING;
const serviceClient = new WebPubSubServiceClient(connectionString, 'demo-hub');

async function groupOperations() {
  // Add a specific user to a group
  await serviceClient.group('room-1').addUser('user-123');

  // Send a message only to clients in room-1
  await serviceClient.group('room-1').sendToAll('Welcome to room 1!', {
    contentType: 'text/plain'
  });

  // Check if a user is in a group
  const exists = await serviceClient.group('room-1').hasUser('user-123');
  console.log('User in group:', exists);

  // Remove a user from a group
  await serviceClient.group('room-1').removeUser('user-123');
}

groupOperations().catch(console.error);
```

## Step 6: Monitor Connections

Azure Web PubSub integrates with Azure Monitor, so you can track connection counts, message throughput, and errors. Enable diagnostic logs to get detailed information about what is happening with your connections.

```bash
# Enable diagnostic logging for the Web PubSub resource
az monitor diagnostic-settings create \
  --name pubsub-diagnostics \
  --resource "/subscriptions/<sub-id>/resourceGroups/rg-pubsub-demo/providers/Microsoft.SignalRService/WebPubSub/my-pubsub-demo" \
  --workspace <log-analytics-workspace-id> \
  --logs '[{"category":"ConnectivityLogs","enabled":true},{"category":"MessagingLogs","enabled":true}]'
```

## Scaling Considerations

The Free tier supports up to 20 concurrent connections, which is fine for development. For production, you will want to use the Standard tier, which supports up to 100,000 concurrent connections per unit. You can scale up to 100 units per resource, giving you up to 10 million concurrent connections.

Key things to keep in mind when scaling:

- Messages larger than 1 MB are not supported. If you need to send large payloads, consider using a reference pattern where you send a URL to the actual data.
- The service has a rate limit on the number of messages per second per connection. For high-throughput scenarios, batch your messages.
- Use groups wisely. Broadcasting to all connections is expensive at scale. Target specific groups instead.

## Common Pitfalls

One thing that catches people off guard is the difference between the `connect` and `connected` events. The `connect` event fires before the connection is established, giving your server a chance to reject or modify the connection. The `connected` event fires after the connection is fully established. If you are doing authentication or authorization checks, handle them in the `connect` event handler.

Another common issue is forgetting to configure CORS. If your client is a browser application, make sure your event handler endpoint accepts requests from the Web PubSub service's origin.

## Wrapping Up

Azure Web PubSub takes the heavy lifting out of real-time WebSocket communication. You get managed connection handling, built-in scaling, and straightforward SDKs for both server and client. The setup process is simple: create the resource, generate client access URLs on your server, and connect clients using standard WebSocket APIs. From there, you can build on top of groups, event handlers, and monitoring to create a production-ready real-time application.

If you are building anything that needs instant data delivery to connected clients, Azure Web PubSub is worth evaluating. It is particularly good when you need to scale beyond what a single WebSocket server can handle, and you do not want to deal with the operational complexity of managing a cluster of WebSocket servers yourself.
