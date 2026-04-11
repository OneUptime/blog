# How to Use MySQL Shell with X DevAPI in JavaScript

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, MySQL Shell, JavaScript, X DevAPI, Interactive

Description: Learn how to use MySQL Shell in JavaScript mode to interact with MySQL databases and document collections using the X DevAPI interactively.

---

## What is MySQL Shell?

MySQL Shell is an advanced command-line client for MySQL that supports three interactive modes: SQL, JavaScript, and Python. In JavaScript mode, it exposes the full X DevAPI through a built-in `session` object, making it ideal for exploring databases, running scripts, and testing X DevAPI operations interactively.

## Installing MySQL Shell

```bash
# Ubuntu/Debian
sudo apt-get install mysql-shell

# macOS
brew install --cask mysql-shell

# Check version
mysqlsh --version
```

## Connecting in X Protocol Mode

```bash
mysqlsh --uri mysqlx://root@127.0.0.1:33060
```

Switch to JavaScript mode if not already active:

```javascript
\js
```

## Exploring the Session Object

```javascript
// List databases
session.getSchemas().forEach(s => print(s.getName()));

// Get a schema
var db = session.getSchema('mydb');

// List collections and tables
db.getCollections().forEach(c => print('Collection: ' + c.getName()));
db.getTables().forEach(t => print('Table: ' + t.getName()));
```

## Working with Collections in JavaScript Mode

```javascript
var col = db.getCollection('products');

// Add documents
col.add({ name: 'Widget', price: 9.99, inStock: true }).execute();

// Find and display
var result = col.find('inStock = true').sort(['price ASC']).execute();
result.fetchAll().forEach(doc => print(JSON.stringify(doc)));

// Modify
col.modify('name = "Widget"').set('price', 12.99).execute();

// Remove
col.remove('inStock = false').execute();
```

## Running SQL from JavaScript Mode

You can execute raw SQL from within JavaScript mode using `session.sql()`:

```javascript
var result = session.sql('SELECT VERSION()').execute();
print(result.fetchOne()[0]);

// Use a specific database
session.sql('USE mydb').execute();

// Run a query and iterate rows
var rows = session.sql('SELECT id, name FROM customers LIMIT 5').execute();
rows.fetchAll().forEach(row => print(row[0] + ' ' + row[1]));
```

## Switching Between Modes

```javascript
\sql
-- Now in SQL mode
SHOW TABLES;

\js
// Back in JavaScript mode
db.getName()
```

## Running a JavaScript Script File

Create a file `setup.js`:

```javascript
var schema = session.getSchema('mydb');
var orders = schema.getCollection('orders');
orders.add({ orderId: 1001, total: 55.00, status: 'new' }).execute();
print('Order inserted');
```

Run it from the shell:

```bash
mysqlsh --uri mysqlx://root:secret@127.0.0.1:33060 --file setup.js
```

## Using X DevAPI from a Script with Output

```javascript
// Script: report.js
var db = session.getSchema('mydb');
var result = db.getCollection('orders').find('status = "pending"').execute();
var pending = result.fetchAll();
print('Pending orders: ' + pending.length);
```

```bash
mysqlsh --uri mysqlx://root:secret@127.0.0.1:33060 --file report.js
```

## Summary

MySQL Shell in JavaScript mode provides a powerful interactive environment for the X DevAPI. Use it to prototype collection operations, run ad-hoc queries, and automate administrative scripts. The combination of JavaScript X DevAPI methods and inline SQL via `session.sql()` gives you access to both document and relational interfaces in a single shell session.
