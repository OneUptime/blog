# How to Build Real-Time Collaboration Features with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Collaboration, Real-Time, Pub/Sub, Actor

Description: Learn how to implement real-time collaborative editing and presence features using Dapr pub/sub and actors for state management.

---

Real-time collaboration features - like Google Docs-style concurrent editing, live cursors, and presence indicators - require low-latency state synchronization across multiple users. Dapr's pub/sub handles event broadcasting while Dapr Actors manage per-document state with built-in concurrency safety.

## Architecture

```text
User Actions -> WebSocket Server -> Dapr Actor (document state) -> Pub/Sub broadcast -> All users
```

Each document is represented as a Dapr Actor that processes operations sequentially and broadcasts changes to all collaborators.

## Define the Document Actor

```csharp
public interface IDocumentActor : IActor
{
    Task ApplyOperation(DocumentOperation operation);
    Task<string> GetContent();
    Task AddCollaborator(string userId);
    Task RemoveCollaborator(string userId);
}

[Actor(TypeName = "DocumentActor")]
public class DocumentActor : Actor, IDocumentActor
{
    private readonly DaprClient _daprClient;

    public DocumentActor(ActorHost host, DaprClient daprClient) : base(host)
    {
        _daprClient = daprClient;
    }

    public async Task ApplyOperation(DocumentOperation op)
    {
        // Get current document state
        var content = await StateManager.GetOrAddStateAsync("content", "");

        // Apply operational transform
        var newContent = ApplyOT(content, op);
        await StateManager.SetStateAsync("content", newContent);

        // Broadcast change to all collaborators
        await _daprClient.PublishEventAsync("pubsub",
            "doc-changes",
            new { documentId = op.DocumentId, change = new DocumentChange { Operation = op, NewContent = newContent } });
    }

    public async Task<string> GetContent()
    {
        return await StateManager.GetOrAddStateAsync("content", "");
    }
}
```

## WebSocket Gateway Service

The gateway routes user actions to the appropriate document actor:

```javascript
const { DaprClient, DaprServer } = require('@dapr/dapr');
const WebSocket = require('ws');

const daprClient = new DaprClient();
const wss = new WebSocket.Server({ port: 8080 });

// Map documentId -> Set of WebSocket connections
const documentRooms = new Map();

wss.on('connection', (ws, req) => {
  const documentId = req.url.split('/')[2];

  if (!documentRooms.has(documentId)) {
    documentRooms.set(documentId, new Set());
  }
  documentRooms.get(documentId).add(ws);

  ws.on('message', async (data) => {
    const operation = JSON.parse(data);
    // Route operation to the document actor
    await daprClient.actor.invoke('DocumentActor', documentId, 'ApplyOperation', operation);
  });

  ws.on('close', () => {
    documentRooms.get(documentId)?.delete(ws);
  });
});
```

## Subscribe to Document Changes

```javascript
const daprServer = new DaprServer({ serverPort: 3001 });

daprServer.pubsub.subscribe('pubsub', 'doc-changes', async (data) => {
  const { documentId, change } = data;
  const room = documentRooms.get(documentId);

  if (room) {
    const message = JSON.stringify(change);
    room.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
});
```

## Implement Presence with Dapr State

Track who is currently in each document:

```python
from dapr.clients import DaprClient
import json

def update_presence(document_id: str, user_id: str, is_active: bool):
    with DaprClient() as client:
        key = f"presence:{document_id}"
        result = client.get_state('statestore', key)
        presence = json.loads(result.data or '{}')

        if is_active:
            presence[user_id] = {"lastSeen": "2026-03-31T10:00:00Z"}
        else:
            presence.pop(user_id, None)

        client.save_state('statestore', key, json.dumps(presence))

        # Broadcast presence update
        client.publish_event('pubsub', f'doc-{document_id}-presence', json.dumps(presence))
```

## Handle Conflicts with Operational Transforms

```javascript
function applyOT(content, operation) {
  if (operation.type === 'insert') {
    return content.slice(0, operation.position) +
           operation.text +
           content.slice(operation.position);
  }
  if (operation.type === 'delete') {
    return content.slice(0, operation.position) +
           content.slice(operation.position + operation.length);
  }
  return content;
}
```

## Summary

Real-time collaboration with Dapr leverages Actors for per-document state management with built-in concurrency safety, and pub/sub for broadcasting changes to all collaborators. Document actors process operations sequentially and publish changes to document-specific topics. A WebSocket gateway routes user actions to actors and subscribes to change broadcasts, forwarding updates to connected browser clients.
