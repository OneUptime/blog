# How to Use Robo 3T (Studio 3T Free) for MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Robo 3T, Studio 3T, Developer Tool, GUI

Description: Learn how to use Robo 3T (now Studio 3T Free) to connect to MongoDB, run shell queries, browse documents, and manage collections with a lightweight GUI client.

---

## What Is Robo 3T?

Robo 3T was a popular open-source MongoDB GUI client that was acquired by 3T Software Labs and rebranded as Studio 3T Free. It offers a lightweight, shell-centric interface that is popular with developers who prefer writing MongoDB shell commands in a GUI with syntax highlighting and result tree views.

## Connecting to MongoDB

1. Launch Studio 3T Free and click "Connect"
2. Click "New Connection" and choose "From URI" or fill in manually:

```text
Name:     Local Dev
Address:  localhost
Port:     27017
```

For Atlas:

```text
URI: mongodb+srv://username:password@cluster.mongodb.net/
```

Enable TLS and set authentication in the Auth tab (select "SCRAM-SHA-256").

3. Click "Save & Connect"

## The Shell Tab

Robo 3T's most popular feature is the integrated MongoDB shell. Open a shell tab (right-click the connection > "Open Shell") and run any MongoDB command:

```javascript
use shop;

db.orders.find({ status: "pending" })
  .sort({ createdAt: -1 })
  .limit(20)
  .pretty();
```

Results display in a collapsible tree view to the right. Click any field to expand nested documents and arrays.

## Running Aggregation Pipelines

```javascript
use shop;

db.orders.aggregate([
  { $match: { status: { $in: ["paid", "shipped"] } } },
  { $group: {
    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
    revenue: { $sum: "$total" },
    count: { $sum: 1 }
  }},
  { $sort: { _id: 1 } }
]);
```

## Browsing Collections

In the Collection tab, Robo 3T shows documents in three views:

```text
Tree View   - collapsible JSON tree per document
Table View  - tabular with top-level fields as columns
Text View   - raw JSON text
```

Use the filter bar to query documents without writing shell commands:

```javascript
{ "customerId": ObjectId("..."), "status": "paid" }
```

## Editing Documents

Right-click any document in the tree view to:
- Edit document (opens a JSON editor)
- Delete document
- Copy document as JSON or Extended JSON

## Index Management

Right-click a collection and select "Open Index Manager" to view, create, and drop indexes:

```javascript
// Equivalent shell command Studio 3T runs
db.orders.createIndex({ status: 1, createdAt: -1 });
```

## Keyboard Shortcuts

```text
Ctrl+Enter       - Run query
Ctrl+T           - New shell tab
Ctrl+Shift+F     - Format JSON in editor
F5               - Refresh collection view
Alt+Up/Down      - Navigate query history
```

## Exporting Results

Right-click any query result set and select Export to:
- JSON (array or one document per line)
- CSV
- Copy to clipboard

## Summary

Robo 3T (Studio 3T Free) is a lightweight, shell-centric MongoDB GUI that pairs a MongoDB shell with a visual document tree viewer. It is ideal for developers who are comfortable writing MongoDB shell commands but want syntax highlighting, result formatting, and a document browser alongside their queries. Use it for quick data exploration, pipeline prototyping, and index management without the overhead of a full IDE.
