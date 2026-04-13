# How to Write Scripts in mongosh for Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongosh, Scripting, Automation, JavaScript

Description: Learn how to write and execute JavaScript scripts in mongosh to automate MongoDB tasks like bulk inserts, data migrations, and reporting.

---

## Why Script with mongosh

mongosh supports full JavaScript including ES2020+ syntax, async/await, and Node.js-style modules. Scripts let you automate repetitive tasks, run data migrations, generate reports, and perform complex administrative operations without manual intervention.

## Running a Script from the Command Line

```bash
# Run a script file directly
mongosh "mongodb://localhost:27017/myapp" --file /path/to/script.js

# Run an inline expression
mongosh --eval 'db.users.countDocuments()'

# Run a script and suppress connection info
mongosh --quiet "mongodb://localhost:27017/myapp" --file script.js
```

## Basic Script Structure

```javascript
// migrate-users.js
// Connect is handled by the --uri argument, so just use db directly

// Switch to target database
use("myapp");

// Log progress
print("Starting user migration...");

// Run operations
const result = db.users.updateMany(
  { status: { $exists: false } },
  { $set: { status: "active", updatedAt: new Date() } }
);

print(`Updated ${result.modifiedCount} documents`);
print("Migration complete.");
```

```bash
mongosh "mongodb://localhost:27017" --file migrate-users.js
```

## Using async/await in Scripts

```javascript
// async-script.js
use("myapp");

// mongosh supports top-level await
const count = await db.orders.countDocuments({ status: "pending" });
print(`Pending orders: ${count}`);

// Process in batches
async function processBatch(batchSize = 100) {
  let processed = 0;
  const cursor = db.orders.find({ status: "pending" }).batchSize(batchSize);

  while (await cursor.hasNext()) {
    const order = await cursor.next();
    await db.orders.updateOne(
      { _id: order._id },
      { $set: { processedAt: new Date(), status: "processing" } }
    );
    processed++;

    if (processed % batchSize === 0) {
      print(`Processed ${processed} orders...`);
    }
  }

  return processed;
}

const total = await processBatch();
print(`Total processed: ${total}`);
```

## Bulk Operations Script

```javascript
// bulk-insert.js
use("inventory");

const products = [];
const categories = ["electronics", "clothing", "food", "books"];

// Generate 1000 test products
for (let i = 1; i <= 1000; i++) {
  products.push({
    sku: `PROD-${String(i).padStart(5, "0")}`,
    name: `Product ${i}`,
    category: categories[i % categories.length],
    price: Math.round(Math.random() * 1000 * 100) / 100,
    stock: Math.floor(Math.random() * 500),
    createdAt: new Date()
  });
}

// Use bulkWrite for efficient insertion
const ops = products.map(p => ({
  insertOne: { document: p }
}));

const result = db.products.bulkWrite(ops, { ordered: false });
print(`Inserted: ${result.insertedCount}`);
```

## Data Migration Script

```javascript
// schema-migration.js
// Migrate from v1 schema (flat address) to v2 (nested address object)
use("myapp");

print("Starting schema migration v1 -> v2...");

let migrated = 0;
let errors = 0;

// Find all documents with old schema (flat address fields)
const cursor = db.customers.find({
  city: { $exists: true },
  "address.city": { $exists: false }
});

while (cursor.hasNext()) {
  const doc = cursor.next();

  try {
    db.customers.updateOne(
      { _id: doc._id },
      {
        $set: {
          address: {
            street: doc.street || "",
            city: doc.city || "",
            state: doc.state || "",
            zip: doc.zip || "",
            country: doc.country || "US"
          },
          schemaVersion: 2
        },
        $unset: { street: "", city: "", state: "", zip: "", country: "" }
      }
    );
    migrated++;
  } catch (err) {
    print(`Error migrating ${doc._id}: ${err.message}`);
    errors++;
  }
}

print(`Migration complete: ${migrated} migrated, ${errors} errors`);
```

## Report Generation Script

```javascript
// daily-report.js
use("sales");

const today = new Date();
today.setHours(0, 0, 0, 0);
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);

print(`=== Daily Sales Report: ${today.toDateString()} ===`);

// Total orders today
const totalOrders = db.orders.countDocuments({
  createdAt: { $gte: today, $lt: tomorrow }
});
print(`Total Orders: ${totalOrders}`);

// Revenue by category
const revenueByCategory = db.orders.aggregate([
  { $match: { createdAt: { $gte: today, $lt: tomorrow }, status: "completed" } },
  { $unwind: "$items" },
  {
    $group: {
      _id: "$items.category",
      revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
      units: { $sum: "$items.quantity" }
    }
  },
  { $sort: { revenue: -1 } }
]);

print("\nRevenue by Category:");
revenueByCategory.forEach(row => {
  print(`  ${row._id}: $${row.revenue.toFixed(2)} (${row.units} units)`);
});
```

## Running Scripts on a Schedule with cron

```bash
#!/bin/bash
# /opt/scripts/daily-report.sh

MONGO_URI="mongodb+srv://reporter:secret@cluster0.example.mongodb.net"
SCRIPT_DIR="/opt/mongodb-scripts"
LOG_DIR="/var/log/mongodb-scripts"

mkdir -p "$LOG_DIR"

mongosh   --quiet   "$MONGO_URI"   --file "$SCRIPT_DIR/daily-report.js"   >> "$LOG_DIR/daily-report-$(date +%Y%m%d).log" 2>&1
```

```bash
# Add to crontab (runs at 6 AM daily)
crontab -e
# 0 6 * * * /opt/scripts/daily-report.sh
```

## Error Handling in Scripts

```javascript
// error-handling.js
use("myapp");

function safeUpdate(filter, update) {
  try {
    const result = db.records.updateOne(filter, update);
    return { success: true, modified: result.modifiedCount };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Test with a valid update
let res = safeUpdate({ _id: ObjectId("64aabbcc1234567890abcdef") }, { $set: { processed: true } });
print(JSON.stringify(res));

// Wrap entire script in try/catch
try {
  db.adminCommand({ ping: 1 });
  print("Connection OK");
} catch (err) {
  print(`Connection failed: ${err.message}`);
  quit(1);
}
```

## Summary

mongosh scripting enables powerful automation of MongoDB operations using modern JavaScript. You can run scripts directly from the CLI with `--file`, use async/await for asynchronous operations, and handle errors gracefully. Common use cases include data migrations, bulk inserts, scheduled reports, and schema updates - all of which can be integrated into cron jobs or CI/CD pipelines.
