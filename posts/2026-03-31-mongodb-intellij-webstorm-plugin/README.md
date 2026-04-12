# How to Use IntelliJ/WebStorm Plugin for MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, IntelliJ, WebStorm, Developer Tool, Plugin

Description: Learn how to connect to MongoDB and query collections from IntelliJ IDEA and WebStorm using the built-in database tools plugin for schema browsing and query execution.

---

## MongoDB Support in IntelliJ IDEs

IntelliJ IDEA Ultimate includes the Database Tools and SQL plugin, which supports MongoDB connections. This allows you to browse collections, run queries, view documents, and inspect indexes without leaving your IDE.

If you use WebStorm or IntelliJ Community Edition, install the Database Tools and SQL plugin from the JetBrains Plugin Marketplace.

## Connecting to MongoDB

1. Open the Database panel (View > Tool Windows > Database)
2. Click the + icon and select "Data Source > MongoDB"
3. Enter connection details:

```text
Host:     localhost
Port:     27017
Database: shop
```

For Atlas with an SRV connection string, paste it directly into the URL field:

```text
mongodb+srv://username:password@cluster.mongodb.net/shop
```

4. Click "Test Connection" - IntelliJ may prompt you to download the MongoDB driver files automatically
5. Click "OK" to save

## Browsing the Schema

Once connected, expand the data source tree:

```text
localhost@27017
  shop
    orders
      _id (ObjectId)
      customerId (ObjectId)
      status (String)
      total (Double)
      createdAt (Date)
    products
    users
```

IntelliJ samples documents to infer the schema. Click a collection to open it in the table editor.

## Running Queries

Open a query console (right-click the database > Open Query Console) and write MongoDB shell-style queries:

```javascript
db.orders.find({ status: "pending" }).sort({ createdAt: -1 }).limit(20)
```

Or use the aggregation pipeline:

```javascript
db.orders.aggregate([
  { $match: { status: "paid", createdAt: { $gte: ISODate("2026-01-01") } } },
  { $group: {
    _id: { $month: "$createdAt" },
    revenue: { $sum: "$total" },
    count: { $sum: 1 }
  }},
  { $sort: { _id: 1 } }
])
```

Results render in the output panel with collapsible JSON tree view.

## Editing Documents

Double-click a document in the table view to open it in the JSON editor. Make changes and press Ctrl+S to save. IntelliJ sends the update to MongoDB using `$set` for changed fields.

## Viewing and Managing Indexes

Expand the `indexes` node under a collection to see all indexes. Right-click to get options:
- Drop index
- View index definition

## Running Explain Plans

In the query console, append `.explain("executionStats")`:

```javascript
db.orders.find({ status: "pending" }).explain("executionStats")
```

IntelliJ renders the explain plan output in the results panel, including stage names, `docsExamined`, and `keysExamined`.

## Code Completion for MongoDB Queries

When editing MongoDB-related code in your Java or JavaScript project, IntelliJ detects MongoDB driver usage and provides code completion for:
- Collection names from your connected data source
- Field names based on sampled schema
- MongoDB operator names (`$match`, `$group`, etc.)

This works automatically when a MongoDB data source is configured in the Database Tools panel.

## Summary

IntelliJ IDEA Ultimate provides first-class MongoDB support through the built-in Database Tools plugin, and WebStorm users can add the same support via the plugin marketplace. Connect via standard connection strings or Atlas SRV URLs, browse collection schemas sampled from live data, run aggregation pipelines in the query console, edit documents in-place with JSON tree view, and use explain plans without leaving your IDE. Enable code completion for MongoDB operators and collection field names in your project's source files.
