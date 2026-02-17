# How to Fix 'Commands Out of Sync' Errors in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Database, Troubleshooting, PHP, Python, NodeJS, Connection Pooling

Description: Learn how to diagnose and fix the MySQL 'Commands out of sync; you can't run this command now' error across different programming languages.

---

The "Commands out of sync; you can't run this command now" error is one of the most frustrating MySQL errors to debug. It occurs when you try to execute a new query before fully consuming the results of the previous one. This guide explains why this happens and how to fix it in PHP, Python, Node.js, and other languages.

## Understanding the Error

MySQL uses a request-response protocol. When you execute a query that returns results, those results sit in a buffer waiting to be read. Attempting to execute another query before reading all results or closing the cursor causes this error.

```mermaid
sequenceDiagram
    participant App as Application
    participant MySQL as MySQL Server

    App->>MySQL: SELECT * FROM users
    MySQL-->>App: Result Set (buffered)
    Note over App: Results not fully consumed
    App->>MySQL: SELECT * FROM orders
    MySQL-->>App: ERROR: Commands out of sync
```

## Common Causes

The error typically occurs in these scenarios:

1. **Unbuffered queries**: Results stream from the server and must be fully read
2. **Multiple result sets**: Stored procedures or multi-statement queries
3. **Forgotten result sets**: Query executed but results never fetched
4. **Connection reuse**: Returning connections to a pool with pending results

## PHP Solutions

PHP's mysqli extension is particularly prone to this issue. Here are the fixes.

### Using mysqli

```php
<?php
// Problem: Not consuming results
$mysqli = new mysqli("localhost", "user", "password", "database");

$result = $mysqli->query("SELECT * FROM users");
// Bug: Results never consumed or freed

// This will fail with "Commands out of sync"
$result2 = $mysqli->query("SELECT * FROM orders");

// Solution 1: Consume all results
$result = $mysqli->query("SELECT * FROM users");
while ($row = $result->fetch_assoc()) {
    // Process each row
}
$result->free();  // Free the result set

// Now you can run another query
$result2 = $mysqli->query("SELECT * FROM orders");

// Solution 2: Use store_result for unbuffered queries
$mysqli->real_query("SELECT * FROM users");
$result = $mysqli->store_result();  // Buffer all results
// Process or skip results
$result->free();

// Solution 3: Use free_result if you don't need the data
$result = $mysqli->query("SELECT * FROM users");
$result->free();  // Discard results immediately
```

### Handling Multi-Statement Results

```php
<?php
// Multi-statement queries return multiple result sets
$mysqli = new mysqli("localhost", "user", "password", "database");
$mysqli->multi_query("SELECT 1; SELECT 2; SELECT 3;");

// Must process ALL result sets
do {
    if ($result = $mysqli->store_result()) {
        while ($row = $result->fetch_row()) {
            print_r($row);
        }
        $result->free();
    }
} while ($mysqli->next_result());

// Check for errors
if ($mysqli->errno) {
    echo "Error: " . $mysqli->error;
}

// Now safe to run new queries
$mysqli->query("SELECT * FROM users");
```

### Stored Procedure Results

```php
<?php
// Stored procedures often return multiple result sets
// Even if they only SELECT once, they return an extra empty result

$mysqli = new mysqli("localhost", "user", "password", "database");

// Create a stored procedure
$mysqli->query("
    CREATE PROCEDURE GetUserOrders(IN userId INT)
    BEGIN
        SELECT * FROM users WHERE id = userId;
        SELECT * FROM orders WHERE user_id = userId;
    END
");

// Call the procedure
$mysqli->multi_query("CALL GetUserOrders(1)");

// Process first result set (users)
$result = $mysqli->store_result();
$user = $result->fetch_assoc();
$result->free();

// Move to next result set
$mysqli->next_result();

// Process second result set (orders)
$result = $mysqli->store_result();
while ($order = $result->fetch_assoc()) {
    // Process orders
}
$result->free();

// Move past any remaining result sets
while ($mysqli->next_result()) {
    if ($result = $mysqli->store_result()) {
        $result->free();
    }
}
```

## Python Solutions

Python's mysql-connector and MySQLdb have similar issues with cursors.

```python
import mysql.connector

# Problem: Unbuffered cursor not consumed
conn = mysql.connector.connect(
    host="localhost",
    user="user",
    password="password",
    database="database"
)

cursor = conn.cursor()
cursor.execute("SELECT * FROM users")

# Bug: Results not fetched
# This will fail
cursor.execute("SELECT * FROM orders")

# Solution 1: Fetch all results
cursor.execute("SELECT * FROM users")
results = cursor.fetchall()  # Fetch everything
# Now safe to run another query
cursor.execute("SELECT * FROM orders")

# Solution 2: Use buffered cursor
cursor = conn.cursor(buffered=True)
cursor.execute("SELECT * FROM users")
# Results are automatically buffered
cursor.execute("SELECT * FROM orders")  # Works fine

# Solution 3: Consume results with fetchall or iteration
cursor = conn.cursor()
cursor.execute("SELECT * FROM users")
for row in cursor:  # Iterating consumes results
    pass  # Skip if you don't need them
cursor.execute("SELECT * FROM orders")  # Works now

# Solution 4: Close cursor and create new one
cursor.execute("SELECT * FROM users")
cursor.close()
cursor = conn.cursor()
cursor.execute("SELECT * FROM orders")
```

### Handling Multiple Result Sets in Python

```python
import mysql.connector

conn = mysql.connector.connect(
    host="localhost",
    user="user",
    password="password",
    database="database"
)

cursor = conn.cursor()

# Execute stored procedure with multiple results
cursor.callproc('GetUserOrders', [1])

# Process all result sets
for result in cursor.stored_results():
    rows = result.fetchall()
    print(f"Got {len(rows)} rows")

# Alternative: manual iteration
cursor.execute("CALL GetUserOrders(1)")

# First result set
for row in cursor:
    print(row)

# Check for more result sets
while cursor.nextset():
    for row in cursor:
        print(row)
```

## Node.js Solutions

Node.js MySQL libraries handle this differently depending on whether you use callbacks or promises.

### Using mysql2

```javascript
const mysql = require('mysql2/promise');

async function main() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'user',
        password: 'password',
        database: 'database'
    });

    // mysql2 buffers results by default, so this works
    const [users] = await connection.execute('SELECT * FROM users');
    const [orders] = await connection.execute('SELECT * FROM orders');

    // For streaming large results, you must consume the stream
    const stream = connection.connection.query('SELECT * FROM large_table').stream();

    for await (const row of stream) {
        // Process each row
    }

    // Now safe to query again
    const [moreData] = await connection.execute('SELECT 1');

    await connection.end();
}

main();
```

### Handling Stored Procedures in Node.js

```javascript
const mysql = require('mysql2/promise');

async function callProcedure() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'user',
        password: 'password',
        database: 'database',
        multipleStatements: true  // Required for procedures
    });

    // Stored procedures return arrays of result sets
    const [results] = await connection.execute('CALL GetUserOrders(?)', [1]);

    // results[0] = first SELECT result
    // results[1] = second SELECT result
    // Last element is procedure metadata (OkPacket)

    const users = results[0];
    const orders = results[1];

    console.log('Users:', users);
    console.log('Orders:', orders);

    await connection.end();
}
```

## Connection Pool Considerations

Connection pools require extra care because connections are reused across requests.

```mermaid
flowchart TD
    A[Request 1] --> B[Get Connection from Pool]
    B --> C[Execute Query]
    C --> D{Results Consumed?}
    D -->|No| E[Return Dirty Connection]
    D -->|Yes| F[Return Clean Connection]
    E --> G[Pool]
    F --> G
    G --> H[Request 2]
    H --> I[Get Connection]
    I --> J{Clean Connection?}
    J -->|No| K[Commands Out of Sync Error]
    J -->|Yes| L[Query Succeeds]
```

### PHP with PDO Pool

```php
<?php
// Always use try-finally to ensure cleanup
function safeQuery($pdo, $sql, $params = []) {
    $stmt = null;
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } finally {
        if ($stmt) {
            $stmt->closeCursor();  // Critical for connection pools
        }
    }
}

// Using a connection pool library
$pool = new ConnectionPool($config);

try {
    $conn = $pool->get();
    $result = safeQuery($conn, "SELECT * FROM users WHERE id = ?", [1]);
    // Process result
} finally {
    $pool->release($conn);  // Connection is clean
}
```

### Python with SQLAlchemy

```python
from sqlalchemy import create_engine, text
from sqlalchemy.pool import QueuePool

# Configure pool with proper cleanup
engine = create_engine(
    'mysql+mysqlconnector://user:password@localhost/database',
    poolclass=QueuePool,
    pool_size=10,
    pool_recycle=3600,
    pool_pre_ping=True  # Validates connections before use
)

# Always use context managers
with engine.connect() as conn:
    result = conn.execute(text("SELECT * FROM users"))
    rows = result.fetchall()  # Consume all results
    # Connection automatically cleaned up on exit
```

### Node.js Pool Cleanup

```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'user',
    password: 'password',
    database: 'database',
    connectionLimit: 10
});

async function safeQuery(sql, params) {
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.execute(sql, params);
        return rows;
    } finally {
        connection.release();  // Always release back to pool
    }
}

// Usage
const users = await safeQuery('SELECT * FROM users WHERE id = ?', [1]);
```

## Debugging Techniques

When tracking down the source of this error, use these approaches.

```sql
-- Check for active result sets
SHOW PROCESSLIST;

-- Look for connections in "Query" state that should be idle
-- State column shows what the connection is doing
```

```python
# Python: Enable logging to see query lifecycle
import logging
logging.basicConfig()
logging.getLogger('mysql.connector').setLevel(logging.DEBUG)

# Now you'll see when results are fetched/not fetched
```

```javascript
// Node.js: Log query events
const connection = await mysql.createConnection({
    // ... config
    debug: ['ComQuery', 'ComPrepare']  // Log query events
});
```

## Prevention Checklist

Follow these practices to avoid "Commands out of sync" errors:

| Practice | Why It Helps |
|----------|--------------|
| Always fetch all results | Clears the result buffer |
| Use buffered mode when available | Automatically reads all results |
| Close cursors/statements | Releases resources properly |
| Use try-finally blocks | Ensures cleanup on errors |
| Enable connection pool validation | Catches dirty connections |
| Test stored procedure calls | Multiple result sets are tricky |

## Summary

The "Commands out of sync" error always comes down to unconsumed results. The fix depends on your language and driver:

- **PHP mysqli**: Call `free()` on results or use `store_result()`
- **PHP PDO**: Call `closeCursor()` on statements
- **Python**: Use buffered cursors or `fetchall()`
- **Node.js**: mysql2 buffers by default; consume streams fully

For stored procedures and multi-statement queries, remember that multiple result sets are returned and each must be processed. In connection pool scenarios, always clean up before returning connections to the pool.
