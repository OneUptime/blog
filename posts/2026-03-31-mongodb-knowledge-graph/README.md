# How to Build a Knowledge Graph with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Knowledge Graph, Graph Query, Aggregation, Data Modeling

Description: Learn how to model and query a knowledge graph in MongoDB using node and edge collections with $graphLookup for multi-hop relationship traversal.

---

## Overview

A knowledge graph represents entities (nodes) and their relationships (edges) in a structured way. MongoDB supports graph-style queries using `$graphLookup` for multi-hop traversal. While not a dedicated graph database, MongoDB handles many knowledge graph use cases effectively using two collections: nodes and edges.

## Data Model Design

### Nodes Collection

```javascript
// Each entity in the knowledge graph
{
  "_id": "entity:mongodb",
  "type": "Technology",
  "name": "MongoDB",
  "properties": {
    "category": "Database",
    "founded": 2007,
    "language": "C++",
    "license": "SSPL"
  }
}
```

### Edges Collection

```javascript
// Each relationship between entities
{
  "_id": ObjectId("..."),
  "from": "entity:mongodb",
  "to": "entity:atlas",
  "relation": "HAS_SERVICE",
  "properties": {
    "since": 2016
  }
}
```

## Creating the Collections and Indexes

```javascript
db.nodes.createIndex({ type: 1 })
db.nodes.createIndex({ name: "text" })

db.edges.createIndex({ from: 1, relation: 1 })
db.edges.createIndex({ to: 1, relation: 1 })
```

## Inserting Knowledge Graph Data

```python
from pymongo import MongoClient

client = MongoClient(MONGODB_URI)
db = client["knowledge_graph"]

nodes = db["nodes"]
edges = db["edges"]

nodes.insert_many([
    {"_id": "entity:mongodb", "type": "Technology", "name": "MongoDB",
     "properties": {"category": "Database"}},
    {"_id": "entity:atlas", "type": "Product", "name": "MongoDB Atlas",
     "properties": {"category": "Cloud Database"}},
    {"_id": "entity:vector-search", "type": "Feature", "name": "Atlas Vector Search",
     "properties": {"category": "Search"}},
    {"_id": "entity:langchain", "type": "Framework", "name": "LangChain",
     "properties": {"category": "AI Framework"}},
])

edges.insert_many([
    {"from": "entity:mongodb", "to": "entity:atlas", "relation": "HAS_SERVICE"},
    {"from": "entity:atlas", "to": "entity:vector-search", "relation": "INCLUDES_FEATURE"},
    {"from": "entity:langchain", "to": "entity:vector-search", "relation": "INTEGRATES_WITH"},
])
```

## Querying Direct Relationships

```javascript
// Find all entities MongoDB has a relationship to
db.edges.aggregate([
  { $match: { from: "entity:mongodb" } },
  {
    $lookup: {
      from: "nodes",
      localField: "to",
      foreignField: "_id",
      as: "targetNode"
    }
  },
  { $unwind: "$targetNode" },
  {
    $project: {
      relation: 1,
      targetName: "$targetNode.name",
      targetType: "$targetNode.type"
    }
  }
])
```

## Multi-Hop Traversal with $graphLookup

```javascript
// Find all entities reachable from MongoDB within 3 hops
db.nodes.aggregate([
  { $match: { _id: "entity:mongodb" } },
  {
    $graphLookup: {
      from: "edges",
      startWith: "$_id",
      connectFromField: "to",
      connectToField: "from",
      as: "paths",
      maxDepth: 2,
      depthField: "depth"
    }
  },
  {
    $project: {
      name: 1,
      paths: {
        $map: {
          input: "$paths",
          as: "p",
          in: { to: "$$p.to", relation: "$$p.relation", depth: "$$p.depth" }
        }
      }
    }
  }
])
```

## Finding Common Relationships (Co-occurrence)

```javascript
// Find entities that share a common "INTEGRATES_WITH" relationship
db.edges.aggregate([
  { $match: { relation: "INTEGRATES_WITH" } },
  {
    $group: {
      _id: "$to",
      integratedBy: { $push: "$from" },
      count: { $sum: 1 }
    }
  },
  { $match: { count: { $gt: 1 } } },
  { $sort: { count: -1 } }
])
```

## Best Practices

- Use stable string IDs for node `_id` fields (like `entity:mongodb`) rather than ObjectIds so you can reference them in edges without lookups.
- Index both `from` and `to` fields in the edges collection with compound indexes including `relation` for directional traversal queries.
- Keep `$graphLookup` `maxDepth` below 5 hops - deeper traversals perform poorly without a native graph engine.
- For very large graphs (millions of nodes), consider adding a dedicated graph database (Neo4j, Neptune) and using MongoDB for document storage alongside it.

## Summary

MongoDB's two-collection node-edge model with `$graphLookup` provides effective knowledge graph capabilities for moderate-scale graphs. Use string entity IDs for clear references, index edge fields for traversal performance, and limit hop depth to keep queries fast.
