# How to Configure Dapr with MySQL State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, MySQL, State Store, Configuration, Microservice

Description: Learn how to configure the Dapr MySQL state store component, connecting to MySQL or MariaDB instances for relational state persistence in microservices.

---

MySQL as a Dapr state store provides relational state persistence suitable for environments where MySQL is already part of your infrastructure. It supports strong consistency, ACID transactions, and integrates naturally with existing MySQL operational practices.

## Prerequisites

- Dapr CLI installed and initialized
- MySQL 5.7+ or MariaDB 10.5+ instance

## Running MySQL Locally

```bash
docker run -d \
  --name mysql \
  -e MYSQL_ROOT_PASSWORD=rootpassword \
  -e MYSQL_DATABASE=daprstate \
  -e MYSQL_USER=dapruser \
  -e MYSQL_PASSWORD=daprpassword \
  -p 3306:3306 \
  mysql:8.0
```

## Creating the MySQL State Store Component

```yaml
# components/mysql-statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.mysql
  version: v1
  metadata:
    - name: connectionString
      secretKeyRef:
        name: mysql-secret
        key: connection-string
    - name: schemaName
      value: "daprstate"
    - name: tableName
      value: "dapr_state"
    - name: actorStateStore
      value: "true"
    - name: pemPath
      value: ""
```

Store the connection string:

```bash
# MySQL DSN format: user:password@tcp(host:port)/database
kubectl create secret generic mysql-secret \
  --from-literal=connection-string="dapruser:daprpassword@tcp(localhost:3306)/daprstate"
```

## Connecting to Amazon RDS MySQL

```bash
kubectl create secret generic mysql-secret \
  --from-literal=connection-string="dapruser:password@tcp(your-db.rds.amazonaws.com:3306)/daprstate?tls=true"
```

For RDS with SSL verification:

```yaml
    - name: connectionString
      secretKeyRef:
        name: mysql-secret
        key: connection-string
    - name: pemPath
      value: "/certs/rds-ca-cert.pem"
```

## Connecting to Azure Database for MySQL

```bash
kubectl create secret generic mysql-secret \
  --from-literal=connection-string="dapruser@myserver:password@tcp(myserver.mysql.database.azure.com:3306)/daprstate?tls=true&allowNativePasswords=true"
```

## What Dapr Creates in MySQL

Dapr creates the following table in your database:

```sql
CREATE TABLE IF NOT EXISTS dapr_state (
  id          VARCHAR(255) NOT NULL PRIMARY KEY,
  value       JSON NOT NULL,
  isbinary    BOOLEAN NOT NULL,
  insertDate  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updateDate  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  eTag        VARCHAR(36) NOT NULL,
  expiredate  TIMESTAMP NULL,
  row_id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  INDEX expiredate_idx (expiredate),
  UNIQUE KEY row_id_uidx (row_id)
);
```

## Basic State Operations

```bash
# Save state
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{
    "key": "session:user123",
    "value": {
      "userId": "user123",
      "loginTime": "2026-03-31T10:00:00Z",
      "permissions": ["read", "write"]
    }
  }]'

# Get state
curl http://localhost:3500/v1.0/state/statestore/session:user123
```

## Using Transactions with MySQL

```bash
curl -X POST http://localhost:3500/v1.0/state/statestore/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "operations": [
      {
        "operation": "upsert",
        "request": {
          "key": "account:alice",
          "value": {"balance": 900}
        }
      },
      {
        "operation": "upsert",
        "request": {
          "key": "account:bob",
          "value": {"balance": 1100}
        }
      }
    ]
  }'
```

## Inspecting State in MySQL

```sql
-- List all state entries
SELECT id, JSON_PRETTY(value), updateDate
FROM daprstate.dapr_state
ORDER BY updateDate DESC
LIMIT 20;

-- Find by JSON field
SELECT id, value->>'$.userId' as user_id
FROM daprstate.dapr_state
WHERE id LIKE 'session:%';

-- Count expired entries
SELECT COUNT(*) FROM daprstate.dapr_state
WHERE expiredate IS NOT NULL AND expiredate < NOW();
```

## Summary

The Dapr MySQL state store is a practical choice for teams already running MySQL or MariaDB infrastructure. Configuring it requires a connection string secret and optional table/schema customization. It supports strong consistency, ACID transactions, and TTL-based expiry, making it suitable for session management and durable state in microservices.
