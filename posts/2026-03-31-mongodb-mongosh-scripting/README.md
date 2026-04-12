# How to Write Scripts with mongosh for Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongosh, Scripting, Automation, DevOps

Description: Learn how to write reusable mongosh JavaScript scripts for automating MongoDB tasks like migrations, maintenance, reporting, and user provisioning.

---

## Why Use mongosh Scripts

Interactive mongosh sessions are useful for one-off queries, but production automation requires repeatable scripts that can be version-controlled, reviewed, and scheduled. mongosh supports full JavaScript including ES6+ syntax, `async/await`, and shell helpers like `print()` and `quit()`, making it a capable scripting environment for MongoDB administration.

```mermaid
flowchart LR
    Script[.js script file] -->|mongosh --file| Execution[Script execution]
    Script -->|mongosh --eval| InlineExec[Inline execution]
    Execution --> Connection[Connect to MongoDB]
    Connection --> DBOps[Run DB operations]
    DBOps --> Output[Print results]
    DBOps --> Exit[quit with exit code]
```

## Running a Script File

```bash
mongosh "mongodb://admin:password@localhost:27017/?authSource=admin" \
  --file /path/to/script.js
```

To avoid putting credentials on the command line, use an environment variable:

```bash
export MONGODB_URI="mongodb://admin:password@localhost:27017/?authSource=admin"
mongosh "$MONGODB_URI" --file /path/to/script.js
```

## Script Structure and Database Context

Use `db.getSiblingDB()` inside scripts to switch databases without relying on `use <db>` (which is an interactive-only convenience):

```javascript
// migration.js
db = db.getSiblingDB("myapp");

const result = db.orders.updateMany(
  { status: "in_progress" },
  { $set: { status: "processing" } }
);

print(`Updated ${result.modifiedCount} documents`);
```

## Handling Errors Gracefully

Use try/catch to handle errors and exit with a non-zero code for CI pipelines:

```javascript
// safe-migration.js
db = db.getSiblingDB("myapp");

try {
  const session = db.getMongo().startSession();
  session.startTransaction();

  const ordersDb = session.getDatabase("myapp");

  ordersDb.orders.updateMany(
    { status: "pending", createdAt: { $lt: new Date("2024-01-01") } },
    { $set: { status: "archived" } }
  );

  session.commitTransaction();
  print("Migration committed successfully");
} catch (err) {
  print(`Migration failed: ${err.message}`);
  quit(1);
}
```

## Data Migration Script

A script to rename a field across all documents:

```javascript
// rename-field-migration.js
db = db.getSiblingDB("myapp");

const collection = "users";
const oldField = "fullname";
const newField = "fullName";

const total = db[collection].countDocuments({ [oldField]: { $exists: true } });
print(`Found ${total} documents to migrate`);

let migrated = 0;
let errors = 0;

db[collection].find({ [oldField]: { $exists: true } }).forEach(doc => {
  try {
    db[collection].updateOne(
      { _id: doc._id },
      {
        $rename: { [oldField]: newField }
      }
    );
    migrated++;
    if (migrated % 1000 === 0) {
      print(`Progress: ${migrated}/${total}`);
    }
  } catch (err) {
    print(`Error on _id ${doc._id}: ${err.message}`);
    errors++;
  }
});

print(`Migration complete. Migrated: ${migrated}, Errors: ${errors}`);
if (errors > 0) quit(1);
```

## Reporting Script

Generate a daily report from aggregation:

```javascript
// daily-report.js
db = db.getSiblingDB("ecommerce");

const today = new Date();
today.setHours(0, 0, 0, 0);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const results = db.orders.aggregate([
  { $match: { createdAt: { $gte: today, $lt: tomorrow } } },
  {
    $group: {
      _id: "$status",
      count: { $sum: 1 },
      revenue: { $sum: "$amount" }
    }
  },
  { $sort: { revenue: -1 } }
]).toArray();

print("=== Daily Order Report ===");
print(`Date: ${today.toISOString().split("T")[0]}`);
print("");

results.forEach(row => {
  print(`Status: ${row._id}`);
  print(`  Orders: ${row.count}`);
  print(`  Revenue: $${row.revenue.toFixed(2)}`);
  print("");
});

const totals = results.reduce(
  (acc, r) => ({ count: acc.count + r.count, revenue: acc.revenue + r.revenue }),
  { count: 0, revenue: 0 }
);
print(`Total orders: ${totals.count}`);
print(`Total revenue: $${totals.revenue.toFixed(2)}`);
```

## User Provisioning Script

Automate creating application users with specific roles:

```javascript
// create-app-user.js
const adminDb = db.getSiblingDB("admin");
const appDb = db.getSiblingDB("myapp");

const username = "app_readonly";
const password = process.env.APP_READONLY_PASSWORD || "changeme";

const existing = adminDb.system.users.findOne({ user: username });
if (existing) {
  print(`User ${username} already exists, skipping`);
  quit(0);
}

adminDb.createUser({
  user: username,
  pwd: password,
  roles: [
    { role: "read", db: "myapp" }
  ]
});

print(`User ${username} created with read access to myapp`);
```

## Index Management Script

Create indexes as part of a deployment:

```javascript
// create-indexes.js
db = db.getSiblingDB("myapp");

const indexes = [
  {
    collection: "orders",
    keys: { customerId: 1, status: 1 },
    options: { name: "idx_orders_customer_status" }
  },
  {
    collection: "orders",
    keys: { createdAt: 1 },
    options: {
      name: "idx_orders_ttl",
      expireAfterSeconds: 60 * 60 * 24 * 365
    }
  },
  {
    collection: "users",
    keys: { email: 1 },
    options: { name: "idx_users_email", unique: true }
  }
];

indexes.forEach(idx => {
  try {
    db[idx.collection].createIndex(idx.keys, idx.options);
    print(`Created index ${idx.options.name} on ${idx.collection}`);
  } catch (err) {
    if (err.code === 85 || err.code === 86) {
      print(`Index ${idx.options.name} already exists with same keys, skipping`);
    } else {
      print(`Error creating ${idx.options.name}: ${err.message}`);
      quit(1);
    }
  }
});

print("Index creation complete");
```

## Scheduling Scripts with cron

Run a script on a schedule using cron:

```bash
# Run daily report every day at 6am UTC
0 6 * * * mongosh "mongodb://admin:secret@localhost:27017/?authSource=admin" \
  --file /opt/scripts/daily-report.js >> /var/log/mongodb-daily-report.log 2>&1
```

## Passing Variables with --eval and Environment Variables

Read environment variables inside scripts using the global `process.env`:

```javascript
// env-aware-script.js
const dbName = process.env.DB_NAME || "myapp";

db = db.getSiblingDB(dbName);
print(`Connected to database: ${dbName}`);
```

Run with:

```bash
DB_NAME="production" \
mongosh "mongodb://admin:pass@prod.example.com:27017/?authSource=admin" \
  --file /opt/scripts/env-aware-script.js
```

## Summary

mongosh scripts use full JavaScript syntax and run database operations via `db.getSiblingDB()`. Use `try/catch` and `quit(1)` to signal failures to CI pipelines. Structure migration scripts with progress reporting and error counts. Use `process.env` to pass connection strings and configuration without hardcoding credentials. Schedule recurring scripts with cron and redirect output to log files for auditing.
