# How to Use Dapr Azure Cosmos DB Gremlin Output Binding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Cosmos DB, Gremlin, Graph Database

Description: Learn how to configure and use the Dapr Azure Cosmos DB Gremlin output binding to execute graph traversals and mutations against a Cosmos DB graph database from microservices.

---

## What Is the Dapr Cosmos DB Gremlin Binding?

Azure Cosmos DB supports the Apache Gremlin graph traversal language via its Graph API. The Dapr Cosmos DB Gremlin output binding lets your microservices execute Gremlin queries and mutations against a Cosmos DB graph database without managing the Gremlin client or WebSocket connections directly.

## Setting Up a Cosmos DB Gremlin Account

```bash
# Create a Cosmos DB account with Gremlin API
az cosmosdb create \
  --name my-graph-db \
  --resource-group my-rg \
  --kind GlobalDocumentDB \
  --capabilities EnableGremlin \
  --default-consistency-level Session

# Create database and graph
az cosmosdb gremlin database create \
  --account-name my-graph-db \
  --resource-group my-rg \
  --name SocialGraph

az cosmosdb gremlin graph create \
  --account-name my-graph-db \
  --resource-group my-rg \
  --database-name SocialGraph \
  --name Users \
  --partition-key-path "/userId"
```

## Configuring the Gremlin Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: social-graph
  namespace: default
spec:
  type: bindings.azure.cosmosdb.gremlinapi
  version: v1
  metadata:
    - name: url
      value: "wss://my-graph-db.gremlin.cosmos.azure.com:443/"
    - name: masterKey
      secretKeyRef:
        name: cosmos-secrets
        key: masterKey
    - name: username
      value: "/dbs/SocialGraph/colls/Users"
```

```bash
kubectl create secret generic cosmos-secrets \
  --from-literal=masterKey=<your-cosmos-primary-key>
```

## Adding Vertices and Edges

Use the `query` operation to execute Gremlin traversal statements:

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

async function addUser(userId, name, email) {
  await client.binding.send(
    "social-graph",
    "query",
    {
      gremlin: `g.addV('user')
        .property('id', '${userId}')
        .property('userId', '${userId}')
        .property('name', '${name}')
        .property('email', '${email}')
        .property('createdAt', '${new Date().toISOString()}')`,
    }
  );
  console.log(`Added user vertex: ${userId}`);
}

async function addFriendship(userId1, userId2) {
  await client.binding.send(
    "social-graph",
    "query",
    {
      gremlin: `g.V('${userId1}').addE('friends').to(g.V('${userId2}'))
               .property('since', '${new Date().toISOString()}')`,
    }
  );
}
```

## Querying the Graph

```javascript
async function getFriends(userId) {
  const result = await client.binding.send(
    "social-graph",
    "query",
    {
      gremlin: `g.V('${userId}').out('friends').valueMap('id', 'name', 'email')`,
    }
  );
  return result;
}

async function getFriendsOfFriends(userId) {
  const result = await client.binding.send(
    "social-graph",
    "query",
    {
      gremlin: `g.V('${userId}').out('friends').out('friends')
               .where(__.not(__.in('friends').hasId('${userId}')))
               .dedup()
               .valueMap('id', 'name')
               .limit(20)`,
    }
  );
  return result;
}
```

## Checking Relationships

```javascript
async function areFriends(userId1, userId2) {
  const result = await client.binding.send(
    "social-graph",
    "query",
    {
      gremlin: `g.V('${userId1}').out('friends').hasId('${userId2}').count()`,
    }
  );
  return result[0] > 0;
}

async function shortestPath(fromUserId, toUserId) {
  const result = await client.binding.send(
    "social-graph",
    "query",
    {
      gremlin: `g.V('${fromUserId}').repeat(out('friends').simplePath())
               .until(hasId('${toUserId}'))
               .path()
               .by('name')
               .limit(1)`,
    }
  );
  return result;
}
```

## Removing Vertices and Edges

```javascript
async function removeFriendship(userId1, userId2) {
  await client.binding.send(
    "social-graph",
    "query",
    {
      gremlin: `g.V('${userId1}').outE('friends').where(__.inV().hasId('${userId2}')).drop()`,
    }
  );
}

async function deleteUser(userId) {
  await client.binding.send(
    "social-graph",
    "query",
    {
      gremlin: `g.V('${userId}').drop()`,
    }
  );
}
```

## Summary

The Dapr Azure Cosmos DB Gremlin binding provides a clean interface for executing graph traversals without managing Gremlin WebSocket connections. Use the `query` operation with any valid Gremlin statement to add vertices, create edges, traverse relationships, and perform graph analytics. Combined with Dapr's secret references and resiliency policies, you get a maintainable graph integration layer for social graphs, recommendation engines, and knowledge graphs.
