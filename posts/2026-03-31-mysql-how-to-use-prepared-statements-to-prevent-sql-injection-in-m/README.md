# How to Use Prepared Statements to Prevent SQL Injection in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, SQL Injection, Prepared Statement, Best Practice

Description: Learn how to use MySQL prepared statements and parameterized queries to prevent SQL injection attacks in your applications.

---

## What Is SQL Injection?

SQL injection occurs when user-supplied input is directly concatenated into a SQL string, allowing an attacker to alter the query's logic. For example:

```sql
-- Vulnerable query built by string concatenation
query = "SELECT * FROM users WHERE username = '" + user_input + "'";
```

If `user_input` is `' OR '1'='1`, the query becomes:

```sql
SELECT * FROM users WHERE username = '' OR '1'='1';
```

This returns all users. More dangerous payloads can drop tables, extract data, or bypass authentication.

## What Are Prepared Statements?

Prepared statements separate SQL code from data. The query structure is sent to the server first (with placeholders `?`), and the data values are sent separately. MySQL treats parameters as pure data, never as SQL code, eliminating injection.

## Prepared Statements in MySQL SQL (Server-Side)

```sql
-- Prepare the statement
PREPARE stmt FROM 'SELECT * FROM users WHERE username = ? AND password_hash = ?';

-- Bind parameters and execute
SET @username = 'alice';
SET @password_hash = SHA2('MyPassword', 256);
EXECUTE stmt USING @username, @password_hash;

-- Deallocate when done
DEALLOCATE PREPARE stmt;
```

The `?` placeholders are never interpreted as SQL - they are always bound as literal string values.

## Prepared Statements in PHP (PDO)

```php
<?php
$pdo = new PDO('mysql:host=localhost;dbname=shop', 'user', 'pass');
$pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);

// Safe parameterized query
$stmt = $pdo->prepare('SELECT id, name FROM users WHERE email = :email');
$stmt->execute([':email' => $_POST['email']]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
```

Setting `ATTR_EMULATE_PREPARES = false` ensures MySQL uses real server-side prepared statements rather than client-side emulation.

## Prepared Statements in Python (mysql-connector-python)

```python
import mysql.connector

conn = mysql.connector.connect(
    host='localhost', user='app', password='secret', database='shop'
)
cursor = conn.cursor(prepared=True)

query = "SELECT id, name FROM customers WHERE email = %s AND active = %s"
cursor.execute(query, ('user@example.com', 1))
results = cursor.fetchall()

for row in results:
    print(row)

cursor.close()
conn.close()
```

## Prepared Statements in Node.js (mysql2)

```javascript
const mysql = require('mysql2/promise');

const conn = await mysql.createConnection({
  host: 'localhost',
  user: 'app',
  password: 'secret',
  database: 'shop'
});

const [rows] = await conn.execute(
  'SELECT id, name FROM products WHERE category_id = ? AND price < ?',
  [req.query.category, req.query.max_price]
);
```

`connection.execute()` in mysql2 always uses prepared statements. `connection.query()` does not.

## Prepared Statements in Java (JDBC)

```java
String sql = "SELECT * FROM orders WHERE customer_id = ? AND status = ?";

try (PreparedStatement ps = conn.prepareStatement(sql)) {
    ps.setInt(1, customerId);
    ps.setString(2, status);

    try (ResultSet rs = ps.executeQuery()) {
        while (rs.next()) {
            System.out.println(rs.getInt("id"));
        }
    }
}
```

## What Prepared Statements Do NOT Protect Against

Prepared statements cannot parameterize:
- Table names or column names (identifiers)
- SQL keywords like `ORDER BY` direction

For dynamic identifiers, use a whitelist:

```python
# Safe approach for dynamic ORDER BY column
allowed_columns = {'name', 'email', 'created_at'}
order_by = request.args.get('sort', 'name')

if order_by not in allowed_columns:
    order_by = 'name'

query = f"SELECT * FROM users ORDER BY {order_by}"
cursor.execute(query)
```

## Checking Prepared Statement Usage

```sql
SELECT * FROM performance_schema.prepared_statements_instances
ORDER BY COUNT_EXECUTE DESC
LIMIT 10;
```

## Summary

Prepared statements prevent SQL injection by separating SQL structure from user-supplied data. Use `?` or named placeholders in your queries and pass values through the parameterized execution API of your MySQL driver. Always use `PDO::ATTR_EMULATE_PREPARES = false` in PHP and `connection.execute()` in mysql2 to ensure true server-side preparation. For dynamic identifiers like column names, use a whitelist instead of parameters.
