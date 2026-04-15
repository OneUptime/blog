# How to Use Dapr RethinkDB Input Binding for Change Feeds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, RethinkDB, Change Feed, Real-Time

Description: Learn how to use the Dapr RethinkDB input binding to react to real-time database changes and trigger application logic on document updates.

---

## RethinkDB Change Feeds with Dapr

RethinkDB's change feed feature pushes real-time notifications when documents are inserted, updated, or deleted. The Dapr RethinkDB input binding subscribes to these changes and triggers your application endpoint automatically.

## Start RethinkDB Locally

```bash
docker run -d \
  --name rethinkdb \
  -p 8080:8080 \
  -p 28015:28015 \
  rethinkdb:latest
```

Access the admin console at `http://localhost:8080`.

## Configure the RethinkDB Input Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: rethinkdb-feed
spec:
  type: bindings.rethinkdb.statechange
  version: v1
  metadata:
  - name: address
    value: localhost:28015
  - name: database
    value: production
  - name: username
    value: admin
  - name: password
    secretKeyRef:
      name: rethinkdb-secret
      key: password
```

## Handle Change Events in Your Application

Dapr calls your endpoint at `/rethinkdb-feed` when a document change occurs:

```javascript
const express = require("express");
const app = express();
app.use(express.json());

app.post("/rethinkdb-feed", async (req, res) => {
  const change = req.body;

  // change.new_val contains the new document state
  // change.old_val contains the previous state (null for inserts)
  const { new_val, old_val } = change;

  if (!old_val && new_val) {
    console.log("Document inserted:", new_val.id);
    await handleInsert(new_val);
  } else if (old_val && new_val) {
    console.log("Document updated:", new_val.id);
    await handleUpdate(old_val, new_val);
  } else if (old_val && !new_val) {
    console.log("Document deleted:", old_val.id);
    await handleDelete(old_val);
  }

  res.sendStatus(200);
});

app.listen(3000);
```

## Detecting Specific Field Changes

```python
@app.route("/rethinkdb-feed", methods=["POST"])
def handle_change():
    change = request.json
    new_val = change.get("new_val") or {}
    old_val = change.get("old_val") or {}

    # React only to status field changes
    if new_val.get("status") != old_val.get("status"):
        old_status = old_val.get("status", "none")
        new_status = new_val.get("status")
        print(f"Order {new_val['id']} status: {old_status} -> {new_status}")
        notify_customer(new_val["customerId"], new_status)

    return "", 200
```

## Use Cases for RethinkDB Change Feeds

```javascript
// Cache invalidation - clear cache when document changes
app.post("/rethinkdb-feed", async (req, res) => {
  const { new_val } = req.body;
  if (new_val?.id) {
    await redis.del(`user:${new_val.id}`);
  }
  res.sendStatus(200);
});
```

```javascript
// Real-time dashboard updates via WebSocket
app.post("/rethinkdb-feed", async (req, res) => {
  const change = req.body;
  wsServer.clients.forEach((client) => {
    client.send(JSON.stringify({ type: "db-change", data: change }));
  });
  res.sendStatus(200);
});
```

## Running the Application

```bash
dapr run \
  --app-id change-feed-processor \
  --app-port 3000 \
  --resources-path ./components \
  -- node app.js
```

Dapr automatically starts the RethinkDB change feed subscription and forwards events to your app.

## Summary

The Dapr RethinkDB input binding turns RethinkDB change feeds into application triggers. When documents are inserted, updated, or deleted, Dapr calls your configured endpoint with the change payload containing old and new document states. This pattern is useful for cache invalidation, real-time notifications, and event-sourcing pipelines.
