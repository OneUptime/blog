# How to Use mongosh (MongoDB Shell) for Database Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongosh, Shell, Database Operations, CLI

Description: Learn how to use mongosh, the modern MongoDB Shell, to connect, query, and manage MongoDB databases from the command line.

---

## What is mongosh

mongosh is the official MongoDB Shell, replacing the legacy `mongo` shell. It provides a modern JavaScript REPL environment with improved autocompletion, syntax highlighting, and better support for async operations. It ships as a standalone tool and is included with MongoDB 6.0+.

## Installing mongosh

```bash
# On Ubuntu/Debian
wget -qO- https://www.mongodb.org/static/pgp/server-7.0.asc | sudo tee /etc/apt/trusted.gpg.d/server-7.0.asc
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update && sudo apt-get install -y mongodb-mongosh

# On macOS with Homebrew
brew install mongosh

# Verify installation
mongosh --version
```

## Connecting to MongoDB

```bash
# Connect to local MongoDB
mongosh

# Connect with a specific URI
mongosh "mongodb://localhost:27017/mydb"

# Connect to Atlas
mongosh "mongodb+srv://user:password@cluster0.example.mongodb.net/mydb"

# Connect with username and password
mongosh --host localhost --port 27017 --username admin --password secret --authenticationDatabase admin
```

## Basic Database Operations

```javascript
// Show all databases
show dbs

// Switch to a database (creates if not exists)
use myapp

// Show current database
db

// Show collections
show collections

// Get database stats
db.stats()
```

## CRUD Operations

### Insert Documents

```javascript
// Insert one document
db.users.insertOne({
  name: "Alice Johnson",
  email: "alice@example.com",
  age: 28,
  createdAt: new Date()
})

// Insert multiple documents
db.users.insertMany([
  { name: "Bob Smith", email: "bob@example.com", age: 32 },
  { name: "Carol White", email: "carol@example.com", age: 25 }
])
```

### Query Documents

```javascript
// Find all documents
db.users.find()

// Find with filter
db.users.find({ age: { $gte: 25 } })

// Find one document
db.users.findOne({ email: "alice@example.com" })

// mongosh pretty-prints output by default, unlike the legacy mongo shell
// Use .toArray() to get results as a plain array
db.users.find().toArray()

// Count documents
db.users.countDocuments({ age: { $gte: 25 } })
```

### Update Documents

```javascript
// Update one document
db.users.updateOne(
  { email: "alice@example.com" },
  { $set: { age: 29, updatedAt: new Date() } }
)

// Update many documents
db.users.updateMany(
  { age: { $lt: 30 } },
  { $set: { tier: "junior" } }
)

// Upsert - insert if not found
db.users.updateOne(
  { email: "dave@example.com" },
  { $set: { name: "Dave Brown", age: 35 } },
  { upsert: true }
)
```

### Delete Documents

```javascript
// Delete one document
db.users.deleteOne({ email: "bob@example.com" })

// Delete many documents
db.users.deleteMany({ age: { $lt: 20 } })

// Drop an entire collection
db.users.drop()
```

## Working with Indexes

```javascript
// Create an index
db.users.createIndex({ email: 1 }, { unique: true })

// Create a compound index
db.users.createIndex({ age: -1, name: 1 })

// List all indexes on a collection
db.users.getIndexes()

// Drop an index
db.users.dropIndex("email_1")

// Explain a query (shows index usage)
db.users.find({ email: "alice@example.com" }).explain("executionStats")
```

## Running Aggregation Pipelines

```javascript
// Group users by age bracket
db.users.aggregate([
  {
    $bucket: {
      groupBy: "$age",
      boundaries: [0, 20, 30, 40, 50, 100],
      default: "Other",
      output: { count: { $sum: 1 }, names: { $push: "$name" } }
    }
  }
])

// Calculate average age per tier
db.users.aggregate([
  { $group: { _id: "$tier", avgAge: { $avg: "$age" }, total: { $sum: 1 } } },
  { $sort: { avgAge: -1 } }
])
```

## Useful mongosh Features

```javascript
// Tab autocomplete - press Tab after typing
db.users.fi<Tab>  // shows findOne, find, etc.

// Multi-line input - press Enter on incomplete expression
db.users.find({
  age: { $gte: 25 }
})

// View command history
// Press Up arrow to navigate history

// Clear screen
cls

// Exit mongosh
exit
// or press Ctrl+D
```

## Configuring mongosh

```javascript
// Set result batch size (default: 20)
config.set("displayBatchSize", 50)

// Disable telemetry
config.set("enableTelemetry", false)

// Show current configuration
config.get("displayBatchSize")
```

## Summary

mongosh is the modern, feature-rich MongoDB Shell that replaces the legacy `mongo` shell. It supports full JavaScript syntax, async/await, and provides excellent autocompletion for all MongoDB commands. From basic CRUD operations to complex aggregation pipelines, mongosh is the primary tool for interactive MongoDB database administration and exploration.
