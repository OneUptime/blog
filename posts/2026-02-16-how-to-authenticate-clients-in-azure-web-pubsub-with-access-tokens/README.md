# How to Authenticate Clients in Azure Web PubSub with Access Tokens

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Web PubSub, Authentication, Access Tokens, Security, WebSocket, Identity

Description: Understand how to authenticate WebSocket clients in Azure Web PubSub using access tokens, custom claims, and role-based permissions.

---

When you expose WebSocket connections to clients, authentication is not optional. Without proper authentication, anyone who discovers your Web PubSub endpoint can connect and potentially receive sensitive data or send malicious messages. Azure Web PubSub handles authentication through access tokens that are embedded in the WebSocket connection URL. Your server generates these tokens, and the Web PubSub service validates them when clients connect.

In this post, I will cover how the token-based authentication works in Azure Web PubSub, how to generate tokens with different permission levels, and how to integrate this with your existing authentication system.

## How Web PubSub Authentication Works

The authentication flow follows a straightforward pattern:

1. The client authenticates with your application server using your existing auth mechanism (session cookies, JWT tokens, OAuth, whatever you already use).
2. Your server calls the Web PubSub SDK to generate a client access URL, which includes an embedded JWT token.
3. The client uses this URL to open a WebSocket connection to Azure Web PubSub.
4. The Web PubSub service validates the token and establishes the connection.

```mermaid
sequenceDiagram
    participant Client
    participant AppServer
    participant WebPubSub

    Client->>AppServer: Authenticate (existing auth)
    AppServer->>AppServer: Validate user credentials
    AppServer->>WebPubSub: Generate client access URL
    WebPubSub-->>AppServer: Return URL with token
    AppServer-->>Client: Return WebSocket URL
    Client->>WebPubSub: Connect via WebSocket
    WebPubSub->>WebPubSub: Validate token
    WebPubSub-->>Client: Connection established
```

The token itself is a JWT that contains claims about the user, their permissions, and an expiration time. Your application server signs these tokens using the SDK, and the Web PubSub service verifies them when clients connect, so clients cannot forge them.

## Generating Access Tokens

The simplest way to generate tokens is through the server SDK. Here is a basic example.

```javascript
// token-server.js - Express server that issues Web PubSub access tokens
const express = require('express');
const { WebPubSubServiceClient } = require('@azure/web-pubsub');

const app = express();
const connectionString = process.env.WEBPUBSUB_CONNECTION_STRING;
const hubName = 'chat';
const serviceClient = new WebPubSubServiceClient(connectionString, hubName);

// Middleware that validates your application's own auth (simplified here)
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  // In production, verify the JWT or session token here
  req.userId = 'user-from-your-auth-system';
  next();
}

// Endpoint to get a WebSocket access URL
app.get('/api/ws-token', requireAuth, async (req, res) => {
  try {
    // Generate a token tied to the authenticated user
    const tokenResponse = await serviceClient.getClientAccessToken({
      userId: req.userId,
      expirationTimeInMinutes: 60 // Token valid for 1 hour
    });

    res.json({ url: tokenResponse.url });
  } catch (err) {
    console.error('Failed to generate token:', err);
    res.status(500).json({ error: 'Failed to generate WebSocket token' });
  }
});

app.listen(3000, () => console.log('Token server running on port 3000'));
```

The `userId` parameter is important. It ties the WebSocket connection to a specific user in your system. When your server wants to send a message to a particular user later, it can reference this user ID.

## Token Permissions with Roles

Not every client should have the same permissions. A read-only dashboard should not be able to send messages. A moderator should be able to join any group. Web PubSub uses roles to control what a client can do after connecting.

Here are the available roles:

- `webpubsub.joinLeaveGroup` - Client can join and leave groups
- `webpubsub.sendToGroup` - Client can send messages to groups
- `webpubsub.joinLeaveGroup.<group-name>` - Client can join/leave a specific group only
- `webpubsub.sendToGroup.<group-name>` - Client can send to a specific group only
- `webpubsub.joinLeaveGroups.<pattern>` - Client can join/leave groups that match a wildcard pattern
- `webpubsub.sendToGroups.<pattern>` - Client can send to groups that match a wildcard pattern

```javascript
// Generate tokens with different permission levels based on user role
async function generateToken(userId, userRole) {
  let roles = [];

  if (userRole === 'viewer') {
    // Viewers can only receive messages, no send or group permissions
    roles = [];
  } else if (userRole === 'participant') {
    // Participants can join groups and send messages within them
    roles = ['webpubsub.joinLeaveGroup', 'webpubsub.sendToGroup'];
  } else if (userRole === 'moderator') {
    // Moderators get full group access
    roles = ['webpubsub.joinLeaveGroup', 'webpubsub.sendToGroup'];
  }

  const tokenResponse = await serviceClient.getClientAccessToken({
    userId: userId,
    roles: roles,
    expirationTimeInMinutes: 60
  });

  return tokenResponse.url;
}
```

For finer control, you can scope permissions to specific groups. This is useful when a user should only participate in certain channels.

```javascript
// Restrict a user to only join and send to their team's group
async function generateTeamToken(userId, teamId) {
  const groupName = `team-${teamId}`;

  const tokenResponse = await serviceClient.getClientAccessToken({
    userId: userId,
    roles: [
      `webpubsub.joinLeaveGroup.${groupName}`,
      `webpubsub.sendToGroup.${groupName}`
    ],
    expirationTimeInMinutes: 60
  });

  return tokenResponse.url;
}
```

## Token Expiration and Renewal

Tokens expire. The `expirationTimeInMinutes` option controls the token lifetime, and the service will not accept an expired token when a client tries to connect. If a connection drops after its original token has expired, the client needs to fetch a fresh access URL before reconnecting.

```javascript
// client-with-renewal.js - Client that handles token expiration and reconnection
class PubSubClient {
  constructor(tokenEndpoint) {
    this.tokenEndpoint = tokenEndpoint;
    this.ws = null;
    this.onMessage = null;
  }

  async connect() {
    // Fetch a fresh token from your server
    const res = await fetch(this.tokenEndpoint, {
      headers: { 'Authorization': `Bearer ${getAppToken()}` }
    });
    const { url } = await res.json();

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('Connected');
    };

    this.ws.onmessage = (event) => {
      if (this.onMessage) {
        this.onMessage(JSON.parse(event.data));
      }
    };

    this.ws.onclose = (event) => {
      console.log('Connection closed, code:', event.code);
      // Reconnect with a fresh token after a short delay
      setTimeout(() => this.connect(), 2000);
    };
  }
}
```

If your application intentionally limits session length to match the access token lifetime, you can schedule a reconnect before the token expires. For example, with a 60-minute token lifetime, start the reconnect process at about the 50-minute mark.

```javascript
// Schedule a reconnect before expiration
function scheduleReconnect(client, expirationMinutes) {
  // Reconnect at 80% of the token lifetime
  const reconnectDelay = expirationMinutes * 60 * 1000 * 0.8;

  setTimeout(async () => {
    console.log('Reconnecting with a fresh token...');
    if (client.ws) {
      client.ws.close();
    }
    await client.connect();
  }, reconnectDelay);
}
```

## Using the Connect Event Handler for Server-Side Validation

For additional security, you can use the `connect` event handler to perform server-side validation when a client connects. This gives you a chance to inspect the connection request and reject it if needed.

```javascript
// connect-handler.js - Express handler for the connect event
const express = require('express');
const { WebPubSubEventHandler } = require('@azure/web-pubsub-express');

const app = express();

const handler = new WebPubSubEventHandler('chat', {
  path: '/api/pubsub',
  handleConnect: (req, res) => {
    // The userId from the token is available on the connection context
    const userId = req.context.userId;
    const connectionId = req.context.connectionId;

    console.log(`User ${userId} attempting to connect (${connectionId})`);

    // Perform additional validation
    if (isUserBanned(userId)) {
      return res.fail(401, 'User is banned');
    }

    // Accept the connection and optionally assign groups or roles
    return res.success({
      userId: userId,
      groups: ['general'], // Auto-join the user to the general group
      roles: ['webpubsub.sendToGroup.general']
    });
  }
});

app.use(handler.getMiddleware());
```

This two-layer approach - token-based authentication plus server-side connect validation - gives you defense in depth. Even if a token is valid, you can still reject the connection based on real-time business logic.

## Integrating with Microsoft Entra ID

If your application uses Microsoft Entra ID (formerly Azure Active Directory) for authentication, you can pass the user's Entra identity through to Web PubSub.

```javascript
// entra-integration.js - Using Microsoft Entra identity with Web PubSub tokens
app.get('/api/ws-token', requireEntraAuth, async (req, res) => {
  // req.user comes from your Microsoft Entra authentication middleware
  const entraUser = req.user;

  const tokenResponse = await serviceClient.getClientAccessToken({
    userId: entraUser.oid, // Use the Entra object ID as the user ID
    expirationTimeInMinutes: 60,
    roles: getRolesForUser(entraUser) // Map Entra roles to Web PubSub roles
  });

  res.json({ url: tokenResponse.url });
});

// Map Entra group memberships to Web PubSub permissions
function getRolesForUser(user) {
  const roles = [];

  if (user.groups.includes('admins')) {
    roles.push('webpubsub.joinLeaveGroup', 'webpubsub.sendToGroup');
  } else {
    // Regular users can only join and send to their department group
    const dept = user.department.toLowerCase();
    roles.push(
      `webpubsub.joinLeaveGroup.${dept}`,
      `webpubsub.sendToGroup.${dept}`
    );
  }

  return roles;
}
```

## Security Best Practices

Here are some things to keep in mind when implementing authentication for Web PubSub:

- **Keep token lifetimes short.** Use the shortest lifetime that makes sense for your use case. One hour is reasonable for most applications.
- **Always use HTTPS** for your token endpoint. The access URL contains a bearer token, and transmitting it over HTTP exposes it to interception.
- **Validate on both sides.** Use token authentication for the initial connection and the connect event handler for additional server-side checks.
- **Scope permissions tightly.** Give clients the minimum set of roles they need. Do not give `sendToGroup` to clients that only need to receive messages.
- **Rotate your connection strings** periodically. If a connection string is compromised, regenerate it immediately in the Azure portal.

## Wrapping Up

Authentication in Azure Web PubSub is built around JWT access tokens that your server generates using the SDK. The tokens carry user identity, permissions, and expiration information. Combined with the connect event handler for server-side validation, you get a flexible authentication system that integrates with whatever identity provider you already use. Keep your tokens short-lived, scope your permissions tightly, and handle reconnection gracefully, and your real-time application will be both secure and reliable.
