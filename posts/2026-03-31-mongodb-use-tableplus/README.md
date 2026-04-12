# How to Use TablePlus for MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, TablePlus, Developer Tool, GUI, Database

Description: Learn how to use TablePlus to connect to MongoDB, browse and edit documents, run queries, and manage multiple database connections with a native macOS and Windows client.

---

## What Is TablePlus?

TablePlus is a native macOS, Windows, and Linux database GUI that supports multiple database systems including MongoDB, PostgreSQL, MySQL, Redis, SQLite, MariaDB, and Microsoft SQL Server. Its clean, tab-based interface and native performance make it popular with developers who work across multiple database types and want a single tool for all of them.

## Connecting to MongoDB

1. Open TablePlus and press Cmd+N (macOS) or Ctrl+N (Windows) to create a new connection
2. Select "MongoDB" from the connection type list
3. Fill in the connection details:

```text
Name:     Local MongoDB
Host:     localhost
Port:     27017
Database: shop
```

For MongoDB Atlas with SRV:

```text
Name:     Atlas Production
URL:      mongodb+srv://username:password@cluster.mongodb.net/shop
```

4. Click "Test" to verify the connection
5. Click "Connect"

## Browsing Collections

The left sidebar lists all databases and collections. Click a collection to open its documents in the main panel. TablePlus displays documents in a spreadsheet-style table view with top-level fields as columns.

For nested documents and arrays, click the cell to expand the value in an overlay panel.

## Filtering Documents

Use the filter bar at the top of the table:

```javascript
{ "status": "pending", "total": { "$gte": 100 } }
```

Or use TablePlus's filter UI which lets you add conditions without writing JSON.

## Running Queries

Open the query editor (Cmd+E or from the menu):

```javascript
db.orders.find(
  { status: "paid" },
  { customerId: 1, total: 1, createdAt: 1 }
).sort({ createdAt: -1 }).limit(50)
```

Aggregation pipelines:

```javascript
db.orders.aggregate([
  { $match: { status: "paid" } },
  { $group: { _id: "$customerId", spend: { $sum: "$total" } } },
  { $sort: { spend: -1 } },
  { $limit: 10 }
])
```

Execute with Cmd+Enter (macOS) or Ctrl+Enter (Windows).

## Editing Documents

TablePlus supports in-place editing in the table view:
- Double-click a cell to edit the value
- Press Escape to cancel
- Press Cmd+S to commit all pending changes (TablePlus batches changes and sends them on save)

To add a new document, click the + button in the toolbar and fill in the JSON editor.

## Working with Multiple Connections

TablePlus uses a tab-per-connection model. Open multiple tabs to work with local dev, staging, and production simultaneously:

```text
Tab 1: Local MongoDB - shop (development)
Tab 2: Atlas Staging - shop (staging)
Tab 3: PostgreSQL - analytics (production)
```

Switch between tabs with Cmd+1/2/3 or the tab bar.

## Exporting Data

Right-click any collection or query result to export:

```text
Export as: JSON, CSV
Scope:     All documents or current filter result
```

## Keyboard Shortcuts

```text
Cmd+N         - New connection
Cmd+E         - Open query editor
Cmd+Enter     - Run query
Cmd+S         - Commit pending changes
Cmd+Z         - Undo pending changes
Cmd+R         - Refresh current view
Cmd+F         - Search in current view
```

## Summary

TablePlus is a native, multi-database GUI client that provides a clean spreadsheet-style interface for browsing and editing MongoDB documents, a query tab for running shell queries and aggregation pipelines, and tab-based multi-connection management for working with dev, staging, and production simultaneously. It is an excellent choice for developers who need one tool to manage MongoDB alongside PostgreSQL, MySQL, and Redis.
