# How to Use MySQL Shell in JavaScript Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, MySQL Shell, JavaScript, DevAPI, Scripting

Description: Learn to use MySQL Shell JavaScript mode to run X DevAPI queries, manage InnoDB Cluster, and automate database operations with the session object.

---

MySQL Shell's JavaScript mode gives you a full JavaScript runtime with access to the X DevAPI, AdminAPI, and the classic SQL session. It is the default mode when MySQL Shell starts and is ideal for scripting, InnoDB Cluster management, and document store operations.

## Start MySQL Shell in JavaScript Mode

```bash
# JavaScript mode is the default
mysqlsh root@localhost

# Explicitly specify JavaScript mode
mysqlsh root@localhost --js
```

The prompt shows `JS >`:

```text
MySQL  localhost:3306 ssl  JS >
```

## Run SQL Queries from JavaScript Mode

Use the `session` object to execute SQL:

```javascript
// Run a SQL query and fetch results
var result = session.runSql("SELECT * FROM mydb.users LIMIT 5");
result.fetchAll().forEach(row => print(row));

// Get a single row
var row = session.runSql("SELECT COUNT(*) AS cnt FROM mydb.orders").fetchOne();
print("Order count:", row.cnt);
```

## Use the X DevAPI for Document Store

MySQL Shell's JavaScript mode supports the X DevAPI for JSON document storage:

```javascript
// Get a schema
var db = session.getSchema('mydb');

// Get a collection
var users = db.getCollection('user_profiles');

// Insert a document
users.add({
  name: "Alice",
  email: "alice@example.com",
  roles: ["admin", "user"]
}).execute();

// Find documents
var result = users.find("name = 'Alice'").execute();
result.fetchAll().forEach(doc => print(JSON.stringify(doc)));
```

## Work with Relational Tables via DevAPI

```javascript
// Get a table object
var ordersTable = session.getSchema('mydb').getTable('orders');

// Select with filters
var rows = ordersTable.select(['id', 'customer_id', 'total'])
  .where('total > 100')
  .orderBy(['total DESC'])
  .limit(10)
  .execute();

rows.fetchAll().forEach(row => print(row.id, row.total));
```

## InnoDB Cluster Management

JavaScript mode is used for all AdminAPI operations:

```javascript
// Check InnoDB Cluster status
var cluster = dba.getCluster();
cluster.status();

// Add an instance to the cluster
cluster.addInstance('root@new-node:3306');

// Check which instance is the primary
cluster.status().defaultReplicaSet.primary;
```

## Write and Run JavaScript Scripts

```javascript
// Save to a file: setup_db.js
var session = mysqlx.getSession('root@localhost:33060');
var db = session.getSchema('myapp');

// Create a collection if it does not exist
var collections = db.getCollections();
var names = collections.map(c => c.getName());
if (!names.includes('events')) {
  db.createCollection('events');
  print("Created events collection");
}
session.close();
```

Run the script:

```bash
mysqlsh --js --file setup_db.js
```

## Useful Built-in Variables

```javascript
// Current session
print(session);

// Server version
print(session.runSql("SELECT VERSION()").fetchOne()[0]);

// Switch to a different schema
session.setCurrentSchema('mydb');

// List stored credentials
shell.listCredentials();

// List all schemas
session.getSchemas().forEach(s => print(s.getName()));
```

## Switch from JavaScript to SQL Mode

```text
\sql
-- Now in SQL mode
SELECT * FROM users LIMIT 5;
\js
// Back to JavaScript
```

## Summary

MySQL Shell JavaScript mode provides the `session` object for SQL queries, the X DevAPI for document store and table operations, and the AdminAPI (`dba`) for InnoDB Cluster management. Use `session.runSql()` for standard SQL, the DevAPI for schema/table/collection access, and `--file` to run automated scripts. The ability to switch between `\sql`, `\js`, and `\py` in the same session makes it a versatile tool for both interactive and automated MySQL administration.
