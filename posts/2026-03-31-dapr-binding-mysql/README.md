# How to Configure Dapr Binding with MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, MySQL, Database, SQL

Description: Configure the Dapr MySQL output binding to execute SQL queries and stored procedures from microservices without embedding a MySQL driver or connection pool.

---

## Overview

The Dapr MySQL binding is an output-only binding that executes SQL queries against a MySQL or MariaDB database. It supports `exec` (INSERT, UPDATE, DELETE) and `query` (SELECT) operations with parameterized queries.

```mermaid
flowchart LR
    App[Microservice] -->|POST /v1.0/bindings/mysql| Sidecar[Dapr Sidecar]
    Sidecar -->|SQL Query| MySQL[MySQL / MariaDB]
    MySQL -->|Result Set| Sidecar
    Sidecar -->|JSON Response| App
```

## Prerequisites

- MySQL or MariaDB running locally or on Kubernetes
- Dapr CLI installed and initialized

## Deploy MySQL

```bash
# Docker
docker run -d \
  --name mysql \
  -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=rootpassword \
  -e MYSQL_DATABASE=ordersdb \
  -e MYSQL_USER=dapr \
  -e MYSQL_PASSWORD=daprpassword \
  mysql:8.0

# Create a table
docker exec -i mysql mysql -u dapr -pdaprpassword ordersdb << 'SQL'
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(50) UNIQUE NOT NULL,
  customer_id VARCHAR(50) NOT NULL,
  item VARCHAR(100) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
SQL
```

## Kubernetes Deployment

```yaml
# mysql.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-secret
              key: rootPassword
        - name: MYSQL_DATABASE
          value: ordersdb
        - name: MYSQL_USER
          value: dapr
        - name: MYSQL_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-secret
              key: password
        ports:
        - containerPort: 3306
---
apiVersion: v1
kind: Service
metadata:
  name: mysql
  namespace: default
spec:
  selector:
    app: mysql
  ports:
  - port: 3306
    targetPort: 3306
```

```bash
kubectl create secret generic mysql-secret \
  --from-literal=rootPassword=rootpassword \
  --from-literal=password=daprpassword \
  --namespace default

kubectl apply -f mysql.yaml
```

## Component Configuration

```yaml
# binding-mysql.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mysql
  namespace: default
spec:
  type: bindings.mysql
  version: v1
  metadata:
  - name: url
    secretKeyRef:
      name: mysql-secret
      key: url
  - name: pemPath
    value: ""
  - name: maxIdleConns
    value: "10"
  - name: maxOpenConns
    value: "10"
  - name: connMaxLifetime
    value: "12m"
  - name: connMaxIdleTime
    value: "12m"
```

Store the connection URL as a secret:

```bash
kubectl create secret generic mysql-secret \
  --from-literal=url="dapr:daprpassword@tcp(mysql:3306)/ordersdb?allowNativePasswords=true" \
  --namespace default

kubectl apply -f binding-mysql.yaml
```

## Insert a Row (exec)

```bash
curl -X POST http://localhost:3500/v1.0/bindings/mysql \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "exec",
    "metadata": {
      "sql": "INSERT INTO orders (order_id, customer_id, item, quantity, total) VALUES (?, ?, ?, ?, ?)",
      "params": "[\"ORD-001\", \"CUST-100\", \"laptop\", 1, 999.99]"
    }
  }'
```

Response:

```json
{
  "metadata": {
    "operation": "exec",
    "duration": "320us",
    "start-time": "2026-03-31T10:00:00Z",
    "end-time": "2026-03-31T10:00:00Z",
    "rows-affected": "1",
    "sql": "INSERT INTO orders (order_id, customer_id, item, quantity, total) VALUES (?, ?, ?, ?, ?)"
  }
}
```

## Query Rows (query)

```bash
curl -X POST http://localhost:3500/v1.0/bindings/mysql \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "query",
    "metadata": {
      "sql": "SELECT order_id, item, total, status FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 10",
      "params": "[\"CUST-100\"]"
    }
  }'
```

Response:

```json
[
  {"order_id": "ORD-001", "item": "laptop", "total": "999.99", "status": "pending"}
]
```

## Update a Row

```bash
curl -X POST http://localhost:3500/v1.0/bindings/mysql \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "exec",
    "metadata": {
      "sql": "UPDATE orders SET status = ? WHERE order_id = ?",
      "params": "[\"shipped\", \"ORD-001\"]"
    }
  }'
```

## Python Application: Order Repository

```python
# order_repository.py
import json
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)
DAPR_HTTP_PORT = 3500
BINDING_NAME = "mysql"

def mysql_query(sql: str, params: list = None) -> list:
    url = f"http://localhost:{DAPR_HTTP_PORT}/v1.0/bindings/{BINDING_NAME}"
    payload = {
        "operation": "query",
        "metadata": {"sql": sql, "params": json.dumps(params or [])}
    }
    response = requests.post(url, json=payload)
    response.raise_for_status()
    return response.json()

def mysql_exec(sql: str, params: list = None) -> dict:
    url = f"http://localhost:{DAPR_HTTP_PORT}/v1.0/bindings/{BINDING_NAME}"
    payload = {
        "operation": "exec",
        "metadata": {"sql": sql, "params": json.dumps(params or [])}
    }
    response = requests.post(url, json=payload)
    response.raise_for_status()
    return response.json()

@app.route('/orders', methods=['POST'])
def create_order():
    data = request.get_json()
    result = mysql_exec(
        "INSERT INTO orders (order_id, customer_id, item, quantity, total) VALUES (?, ?, ?, ?, ?)",
        [data['orderId'], data['customerId'], data['item'], data['quantity'], data['total']]
    )
    rows_affected = int(result.get('metadata', {}).get('rows-affected', 0))
    return jsonify({"orderId": data['orderId'], "inserted": rows_affected})

@app.route('/orders/<customer_id>', methods=['GET'])
def get_customer_orders(customer_id):
    rows = mysql_query(
        "SELECT order_id, item, quantity, total, status, created_at FROM orders WHERE customer_id = ? ORDER BY created_at DESC",
        [customer_id]
    )
    orders = [
        {"orderId": r["order_id"], "item": r["item"], "quantity": r["quantity"], "total": float(r["total"]), "status": r["status"], "createdAt": str(r["created_at"])}
        for r in rows
    ]
    return jsonify(orders)

@app.route('/orders/<order_id>/status', methods=['PATCH'])
def update_order_status(order_id):
    data = request.get_json()
    result = mysql_exec(
        "UPDATE orders SET status = ? WHERE order_id = ?",
        [data['status'], order_id]
    )
    rows_affected = int(result.get('metadata', {}).get('rows-affected', 0))
    return jsonify({"updated": rows_affected})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
```

## Summary

The Dapr MySQL binding uses `exec` for INSERT/UPDATE/DELETE and `query` for SELECT operations with parameterized SQL to prevent injection. Configure the binding with a MySQL DSN URL stored in a Kubernetes secret. The response for `query` returns rows as an array of JSON objects keyed by column name, and `exec` returns metadata including `rows-affected`. SQL and params are passed via the request `metadata` field, with params as a JSON-encoded string. This binding removes the MySQL driver and connection pool management from your application code.
