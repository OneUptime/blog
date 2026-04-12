# How to Use MongoDB Shell (mongosh) Effectively

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongosh, Shell, Tool, Development, Administration

Description: A comprehensive guide to mongosh - connection options, CRUD operations, aggregation, scripting, configuration, and productivity tips for daily MongoDB administration.

---

## What is mongosh

`mongosh` (MongoDB Shell) is the modern JavaScript-based interactive shell for MongoDB, replacing the legacy `mongo` shell. It provides a full JavaScript runtime, improved syntax highlighting, autocomplete, multi-line editing, and built-in help.

```mermaid
flowchart LR
    mongosh -->|CRUD| MongoDB
    mongosh -->|Admin commands| MongoDB
    mongosh -->|JavaScript| Runtime[Node.js-compatible JS]
    mongosh --> Config[~/.mongodb/mongosh/]
    mongosh --> History[Command history]
    mongosh --> Scripts[.js script files]
```

## Installing mongosh

On Ubuntu/Debian:

```bash
wget -qO- https://www.mongodb.org/static/pgp/server-7.0.asc | sudo tee /etc/apt/trusted.gpg.d/server-7.0.asc
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update && sudo apt-get install -y mongodb-mongosh
```

On macOS:

```bash
brew install mongosh
```

Check the version:

```bash
mongosh --version
```

## Connecting to MongoDB

Connect to a local instance:

```bash
mongosh
```

Connect with a connection string:

```bash
mongosh "mongodb://admin:password@127.0.0.1:27017/?authSource=admin"
```

Connect to a replica set:

```bash
mongosh "mongodb://admin:password@host1:27017,host2:27017,host3:27017/?replicaSet=rs0&authSource=admin"
```

Connect to MongoDB Atlas:

```bash
mongosh "mongodb+srv://user:password@cluster0.abcde.mongodb.net/mydb"
```

Connect with TLS:

```bash
mongosh "mongodb://admin:password@host:27017/?tls=true&tlsCAFile=/etc/ssl/mongodb/ca.crt&authSource=admin"
```

## Basic Navigation

List databases:

```javascript
show dbs
```

Switch to a database (created on first use):

```javascript
use myapp
```

List collections in the current database:

```javascript
show collections
```

Display help:

```javascript
help
db.help()
db.collection.help()
```

## CRUD Operations

Insert documents:

```javascript
db.orders.insertOne({ customerId: "c1", amount: 149.99, status: "pending" })

db.orders.insertMany([
  { customerId: "c2", amount: 59.99, status: "pending" },
  { customerId: "c3", amount: 299.00, status: "paid" }
])
```

Find documents:

```javascript
// All documents
db.orders.find()

// With filter
db.orders.find({ status: "pending" })

// With projection
db.orders.find({ status: "pending" }, { customerId: 1, amount: 1, _id: 0 })

// First matching document
db.orders.findOne({ customerId: "c1" })

// Chain sort, skip, limit
db.orders.find({ status: "paid" }).sort({ amount: -1 }).limit(10)

// Count matching documents
db.orders.countDocuments({ status: "pending" })
```

Update documents:

```javascript
db.orders.updateOne(
  { _id: ObjectId("...") },
  { $set: { status: "shipped" }, $currentDate: { updatedAt: true } }
)

db.orders.updateMany(
  { status: "pending" },
  { $set: { flagged: true } }
)

// Upsert - insert if not found
db.customers.updateOne(
  { email: "user@example.com" },
  { $setOnInsert: { createdAt: new Date() }, $set: { name: "Alice" } },
  { upsert: true }
)
```

Delete documents:

```javascript
db.orders.deleteOne({ _id: ObjectId("...") })
db.orders.deleteMany({ status: "cancelled", createdAt: { $lt: new Date("2025-01-01") } })
```

## Aggregation Pipeline

```javascript
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $group: {
    _id: "$customerId",
    total: { $sum: "$amount" },
    count: { $sum: 1 }
  }},
  { $sort: { total: -1 } },
  { $limit: 5 }
])
```

## Index Management

```javascript
// List indexes
db.orders.getIndexes()

// Create an index
db.orders.createIndex({ customerId: 1, createdAt: -1 })

// Create a unique index
db.users.createIndex({ email: 1 }, { unique: true })

// Create a TTL index (auto-delete after 24 hours)
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 })

// Drop an index
db.orders.dropIndex("customerId_1_createdAt_-1")
```

## Explain Plans

```javascript
db.orders.find({ status: "pending" }).explain("executionStats")

// Or as a method chain
db.orders.explain("allPlansExecution").find({ status: "pending" }).sort({ amount: -1 })
```

## Running Scripts

Execute a JavaScript file:

```bash
mongosh "mongodb://admin:password@127.0.0.1:27017/?authSource=admin" \
  --file /path/to/script.js
```

Example script `migrate.js`:

```javascript
db = db.getSiblingDB("myapp");

db.orders.find({ status: "old_pending" }).forEach(doc => {
  db.orders.updateOne(
    { _id: doc._id },
    { $set: { status: "pending" } }
  );
});

print("Migration complete: " + db.orders.countDocuments({ status: "pending" }) + " documents");
```

Run inline JavaScript:

```bash
mongosh "mongodb://127.0.0.1:27017" --eval "db.adminCommand({ ping: 1 })"
```

## Using Variables and Loops

mongosh is a full JavaScript runtime:

```javascript
// Use variables
const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const count = db.sessions.countDocuments({ createdAt: { $lt: cutoff } });
print(`Old sessions to delete: ${count}`);

// Loop with forEach
db.users.find({ role: "legacy" }).forEach(user => {
  db.users.updateOne(
    { _id: user._id },
    { $set: { role: "standard", migratedAt: new Date() } }
  );
});

// Async/await (mongosh supports it)
const results = await db.orders.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
]).toArray();
results.forEach(r => print(r._id + ": " + r.count));
```

## Configuring mongosh

Display current configuration:

```javascript
config
```

Disable telemetry:

```javascript
disableTelemetry()
```

Change the editor used for multi-line editing:

```javascript
config.set("editor", "vim")
```

Change the number of documents displayed per cursor iteration (default is 20):

```javascript
config.set("displayBatchSize", 50)
```

## Useful Admin Commands

```javascript
// Server status summary
db.serverStatus()

// Replica set status
rs.status()

// Current operations
db.currentOp()

// Kill a long-running operation
db.killOp(12345)

// List all users
db.getUsers()

// Validate a collection
db.orders.validate()

// Collection statistics
db.orders.stats()

// Compact a collection (reclaims disk space)
db.runCommand({ compact: "orders" })
```

## Best Practices

- Use `passwordPrompt()` instead of hardcoding passwords in commands or scripts.
- Use `--eval` for one-off commands in automation scripts to avoid opening an interactive shell.
- Use `--file` to run complex multi-step scripts instead of typing them interactively.
- Keep a library of useful mongosh scripts in version control for tasks like migrations and maintenance.
- Use `.explain("executionStats")` on slow queries during investigation.
- Use `db.currentOp()` to identify and kill runaway queries during incidents.

## Summary

mongosh is a powerful JavaScript shell for all MongoDB administration and development tasks. It supports full JavaScript including async/await, making it suitable for complex maintenance scripts. Use `--file` and `--eval` flags for automation, chain `.explain()` for query analysis, and manage indexes and users directly from the shell. Configuring a persistent editor and disabling telemetry improves the interactive experience for daily use.
