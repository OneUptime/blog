# How to Write and Execute Scripts in mongosh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongosh, Script, Automation, Shell

Description: Learn how to write and execute JavaScript scripts in mongosh to automate repetitive MongoDB tasks and database operations.

---

## Introduction

mongosh is the modern MongoDB shell that supports full JavaScript execution. Writing scripts for mongosh lets you automate migrations, seed data, run audits, and perform batch operations without building a dedicated application. This guide covers how to write, load, and execute scripts effectively.

## Running a Script from the Command Line

Pass a script file directly to mongosh using the `--file` flag:

```bash
mongosh "mongodb://localhost:27017/mydb" --file ./seed.js
```

Or pipe a script via stdin:

```bash
mongosh "mongodb://localhost:27017/mydb" < ./seed.js
```

## Writing a Basic Script

Scripts are plain JavaScript files that use the mongosh API. Here is a simple seed script:

```javascript
// seed.js
db = db.getSiblingDB("mydb");

db.users.drop();

const users = [];
for (let i = 1; i <= 100; i++) {
  users.push({
    username: `user${i}`,
    email: `user${i}@example.com`,
    createdAt: new Date(),
    active: true
  });
}

const result = db.users.insertMany(users);
print(`Inserted ${result.insertedIds.length} users`);
```

## Using Variables and Functions

mongosh scripts support all standard JavaScript patterns:

```javascript
function ensureIndex(collection, keyPattern, options = {}) {
  const existing = collection.getIndexes();
  const keys = JSON.stringify(keyPattern);
  const found = existing.some(idx => JSON.stringify(idx.key) === keys);
  if (!found) {
    collection.createIndex(keyPattern, options);
    print(`Created index on ${JSON.stringify(keyPattern)}`);
  } else {
    print(`Index already exists for ${JSON.stringify(keyPattern)}`);
  }
}

db = db.getSiblingDB("mydb");
ensureIndex(db.orders, { status: 1, createdAt: -1 });
ensureIndex(db.orders, { customerId: 1 });
```

## Handling Errors in Scripts

Wrap operations in try-catch blocks to handle errors gracefully:

```javascript
try {
  db.orders.updateMany(
    { status: "pending", createdAt: { $lt: new Date(Date.now() - 86400000 * 30) } },
    { $set: { status: "expired" } }
  );
  print("Expired old orders successfully");
} catch (err) {
  print(`Error expiring orders: ${err.message}`);
  quit(1);
}
```

## Passing Arguments to Scripts

mongosh does not natively support script arguments, but you can use environment variables:

```bash
BATCH_SIZE=500 mongosh "mongodb://localhost:27017/mydb" --file ./batch.js
```

```javascript
// batch.js
const batchSize = parseInt(process.env.BATCH_SIZE || "100");
print(`Using batch size: ${batchSize}`);
```

## Running Scripts on a Schedule

Combine mongosh scripts with cron for scheduled tasks:

```bash
# Run daily cleanup at 2am
0 2 * * * /usr/bin/mongosh "mongodb://localhost:27017/mydb" --file /opt/scripts/cleanup.js >> /var/log/mongo-cleanup.log 2>&1
```

## Summary

mongosh scripts provide a lightweight way to automate MongoDB operations using JavaScript. By combining the shell API with standard JavaScript patterns like functions, loops, and error handling, you can build reliable scripts for seeding, migrations, and maintenance. Pairing scripts with cron or CI pipelines makes automation straightforward without requiring a dedicated application.
