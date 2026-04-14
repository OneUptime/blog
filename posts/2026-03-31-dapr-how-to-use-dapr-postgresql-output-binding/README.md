# How to Use Dapr PostgreSQL Output Binding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, PostgreSQL, Binding, Database, Microservice

Description: Learn how to use the Dapr PostgreSQL output binding to execute SQL queries and commands against a PostgreSQL database from your microservices.

---

## What Is the Dapr PostgreSQL Output Binding

The Dapr PostgreSQL output binding enables your application to run SQL statements against a PostgreSQL database through the Dapr sidecar. This provides a consistent, configuration-driven way to interact with PostgreSQL without embedding a database driver or connection pool in each service.

## Prerequisites

- Dapr CLI installed and initialized
- A running PostgreSQL instance
- Basic knowledge of SQL

## Define the PostgreSQL Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: postgres-db
  namespace: default
spec:
  type: bindings.postgresql
  version: v1
  metadata:
  - name: connectionString
    value: "host=localhost user=myuser password=mypassword dbname=mydb port=5432 sslmode=disable"
```

For production, reference the connection string from a secret store:

```yaml
  - name: connectionString
    secretKeyRef:
      name: postgres-secret
      key: connectionString
```

## Supported Operations

The PostgreSQL binding supports the following operations:

```text
exec    - execute a statement without returning rows (INSERT, UPDATE, DELETE)
query   - execute a SELECT statement and return rows
close   - close the database connection
```

## Execute an INSERT Statement

```bash
curl -X POST http://localhost:3500/v1.0/bindings/postgres-db \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "sql": "INSERT INTO orders (id, customer, amount) VALUES ($1, $2, $3)",
      "params": "[\"order-001\", \"Alice\", 149.99]"
    },
    "operation": "exec"
  }'
```

## Execute a SELECT Query

```bash
curl -X POST http://localhost:3500/v1.0/bindings/postgres-db \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "sql": "SELECT id, customer, amount FROM orders WHERE customer = $1",
      "params": "[\"Alice\"]"
    },
    "operation": "query"
  }'
```

Response:

```json
{
  "metadata": {
    "operation": "query",
    "sql": "SELECT id, customer, amount FROM orders WHERE customer = $1"
  },
  "data": "[[\"order-001\",\"Alice\",149.99],[\"order-005\",\"Alice\",75.00]]"
}
```

## Use in a Node.js Application

```javascript
const { DaprClient } = require('@dapr/dapr');

const client = new DaprClient();
const BINDING = 'postgres-db';

async function insertOrder(order) {
  await client.binding.send(BINDING, 'exec', '', {
    sql: 'INSERT INTO orders (id, customer, amount, status) VALUES ($1, $2, $3, $4)',
    params: JSON.stringify([order.id, order.customer, order.amount, 'pending']),
  });
  console.log('Order inserted:', order.id);
}

async function getOrdersByCustomer(customer) {
  const result = await client.binding.send(BINDING, 'query', '', {
    sql: 'SELECT id, customer, amount, status FROM orders WHERE customer = $1 ORDER BY created_at DESC',
    params: JSON.stringify([customer]),
  });
  return result;
}

async function updateOrderStatus(orderId, status) {
  await client.binding.send(BINDING, 'exec', '', {
    sql: 'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
    params: JSON.stringify([status, orderId]),
  });
}

async function deleteOldOrders(daysOld) {
  await client.binding.send(BINDING, 'exec', '', {
    sql: 'DELETE FROM orders WHERE created_at < NOW() - INTERVAL \'1 day\' * $1',
    params: JSON.stringify([daysOld]),
  });
}
```

## Use in a Python Application

```python
from dapr.clients import DaprClient
import json

BINDING = 'postgres-db'

def insert_record(table: str, data: dict):
    columns = ', '.join(data.keys())
    placeholders = ', '.join(f'${i+1}' for i in range(len(data)))
    sql = f'INSERT INTO {table} ({columns}) VALUES ({placeholders})'

    with DaprClient() as client:
        client.invoke_binding(
            binding_name=BINDING,
            operation='exec',
            binding_metadata={
                'sql': sql,
                'params': json.dumps(list(data.values()))
            }
        )

def query_records(sql: str, params: list = None):
    with DaprClient() as client:
        resp = client.invoke_binding(
            binding_name=BINDING,
            operation='query',
            binding_metadata={
                'sql': sql,
                'params': json.dumps(params or [])
            }
        )
        return json.loads(resp.text())
```

## Use Parameterized Queries to Prevent SQL Injection

Always use parameterized queries with placeholders instead of string concatenation:

```javascript
// WRONG - vulnerable to SQL injection
const sql = `SELECT * FROM users WHERE email = '${email}'`;

// CORRECT - use parameterized query
const result = await client.binding.send(BINDING, 'query', '', {
  sql: 'SELECT * FROM users WHERE email = $1',
  params: JSON.stringify([email]),
});
```

## Summary

The Dapr PostgreSQL output binding provides a lightweight, configuration-driven interface for running SQL queries and commands against PostgreSQL from your microservices. By externalizing connection strings to Dapr secret stores and using the binding API, you decouple your services from database driver management while supporting parameterized queries for safe data access.
