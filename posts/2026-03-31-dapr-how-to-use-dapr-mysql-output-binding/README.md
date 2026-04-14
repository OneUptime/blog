# How to Use Dapr MySQL Output Binding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, MySQL, Binding, Database, Microservice

Description: Learn how to use the Dapr MySQL output binding to execute SQL queries and statements against a MySQL database from your microservices.

---

## What Is the Dapr MySQL Output Binding

The Dapr MySQL output binding allows your application to interact with a MySQL (or MariaDB) database through the Dapr sidecar without directly embedding a MySQL client library. You configure the connection in a component YAML, and your application sends SQL operations via the Dapr API.

## Prerequisites

- Dapr CLI installed and initialized
- A running MySQL or MariaDB instance
- Basic knowledge of SQL and Dapr components

## Define the MySQL Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mysql-db
  namespace: default
spec:
  type: bindings.mysql
  version: v1
  metadata:
  - name: url
    value: "user:password@tcp(localhost:3306)/mydb"
  - name: pemPath
    value: ""
  - name: maxIdleConns
    value: "10"
  - name: maxOpenConns
    value: "100"
  - name: connMaxLifetime
    value: "0"
  - name: connMaxIdleTime
    value: "0"
```

For production, use a secret for the connection URL:

```yaml
  - name: url
    secretKeyRef:
      name: mysql-secret
      key: url
```

The URL format follows the Go MySQL driver DSN pattern: `user:password@tcp(host:port)/dbname`.

## Supported Operations

```text
exec    - run a statement that doesn't return rows (INSERT, UPDATE, DELETE, DDL)
query   - run a SELECT statement and return rows
close   - close the database connection
```

## Execute an INSERT Statement

```bash
curl -X POST http://localhost:3500/v1.0/bindings/mysql-db \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "exec",
    "metadata": {
      "sql": "INSERT INTO users (id, name, email) VALUES (?, ?, ?)",
      "params": "[\"u001\", \"Alice\", \"alice@example.com\"]"
    }
  }'
```

Note: MySQL uses `?` as a placeholder (not `$1` like PostgreSQL).

## Execute a SELECT Query

```bash
curl -X POST http://localhost:3500/v1.0/bindings/mysql-db \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "query",
    "metadata": {
      "sql": "SELECT id, name, email FROM users WHERE active = ?",
      "params": "[1]"
    }
  }'
```

Response:

```json
[
  {"id": "u001", "name": "Alice", "email": "alice@example.com"},
  {"id": "u002", "name": "Bob", "email": "bob@example.com"}
]
```

## Use in a Node.js Application

```javascript
const { DaprClient } = require('@dapr/dapr');

const client = new DaprClient();
const BINDING = 'mysql-db';

async function createUser(user) {
  await client.binding.send(BINDING, 'exec', '', {
    sql: 'INSERT INTO users (id, name, email, created_at) VALUES (?, ?, ?, NOW())',
    params: JSON.stringify([user.id, user.name, user.email]),
  });
  console.log('User created:', user.id);
}

async function getUserById(userId) {
  const resp = await client.binding.send(BINDING, 'query', '', {
    sql: 'SELECT id, name, email, created_at FROM users WHERE id = ? LIMIT 1',
    params: JSON.stringify([userId]),
  });
  if (!resp || resp.length === 0) return null;
  const { id, name, email, created_at: createdAt } = resp[0];
  return { id, name, email, createdAt };
}

async function updateUserEmail(userId, newEmail) {
  await client.binding.send(BINDING, 'exec', '', {
    sql: 'UPDATE users SET email = ?, updated_at = NOW() WHERE id = ?',
    params: JSON.stringify([newEmail, userId]),
  });
}

async function deleteInactiveUsers(daysSinceActive) {
  await client.binding.send(BINDING, 'exec', '', {
    sql: 'DELETE FROM users WHERE last_login < DATE_SUB(NOW(), INTERVAL ? DAY)',
    params: JSON.stringify([daysSinceActive]),
  });
}
```

## Use in a Python Application

```python
from dapr.clients import DaprClient
import json

BINDING = 'mysql-db'

def exec_sql(sql: str, params: list = None):
    with DaprClient() as client:
        client.invoke_binding(
            binding_name=BINDING,
            operation='exec',
            data='',
            binding_metadata={'sql': sql, 'params': json.dumps(params or [])}
        )

def query_sql(sql: str, params: list = None):
    with DaprClient() as client:
        resp = client.invoke_binding(
            binding_name=BINDING,
            operation='query',
            data='',
            binding_metadata={'sql': sql, 'params': json.dumps(params or [])}
        )
        return json.loads(resp.text())

# Insert a record
exec_sql(
    'INSERT INTO products (id, name, price) VALUES (?, ?, ?)',
    ['p001', 'Widget', 9.99]
)

# Query records
rows = query_sql(
    'SELECT id, name, price FROM products WHERE price < ?',
    [50.0]
)
for row in rows:
    print(f"Product: {row['name']}, Price: ${row['price']}")
```

## Handle Transactions via Multiple Exec Calls

The MySQL binding does not natively support multi-statement transactions in a single call. For transactional workflows, use Dapr workflows or coordinate through your application:

```javascript
async function transferFunds(fromAccount, toAccount, amount) {
  // Step 1: Debit
  await client.binding.send(BINDING, 'exec', '', {
    sql: 'UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance >= ?',
    params: JSON.stringify([amount, fromAccount, amount]),
  });

  // Step 2: Credit
  await client.binding.send(BINDING, 'exec', '', {
    sql: 'UPDATE accounts SET balance = balance + ? WHERE id = ?',
    params: JSON.stringify([amount, toAccount]),
  });

  console.log(`Transferred $${amount} from ${fromAccount} to ${toAccount}`);
}
```

## Summary

The Dapr MySQL output binding lets microservices execute SQL queries and statements against MySQL without embedding MySQL drivers. Connection details live in a Dapr component YAML, and parameterized queries via `?` placeholders protect against SQL injection. The binding supports exec for write operations and query for reads, making it suitable for common CRUD workflows in production microservice architectures.
