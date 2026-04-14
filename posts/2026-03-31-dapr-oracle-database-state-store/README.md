# How to Configure Dapr with Oracle Database State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Oracle, State Store, Relational Database, Microservice

Description: Learn how to configure Dapr to use Oracle Database as a state store, enabling enterprise microservices to leverage existing Oracle infrastructure for state persistence.

---

## Overview

Oracle Database is a widely used enterprise relational database with robust support for ACID transactions, high availability, and advanced security. Dapr's Oracle state store component allows microservices to persist state in Oracle, making it straightforward to integrate Dapr into environments where Oracle is already the standard database platform.

## Prerequisites

- Oracle Database 19c or later (or Oracle XE for development)
- Dapr CLI and runtime installed
- Oracle JDBC driver or SQL*Plus for verification

## Setting Up Oracle Database

For development, use Oracle XE via Docker:

```bash
docker run -d \
  --name oracle-xe \
  -p 1521:1521 \
  -p 5500:5500 \
  -e ORACLE_PWD=OracleSecret123 \
  container-registry.oracle.com/database/express:21.3.0-xe
```

Connect to Oracle and create a dedicated schema for Dapr:

```sql
-- Connect as SYSTEM or DBA
CREATE USER dapr_state IDENTIFIED BY DaprPass123;
GRANT CONNECT, RESOURCE TO dapr_state;
GRANT CREATE TABLE TO dapr_state;
GRANT UNLIMITED TABLESPACE TO dapr_state;
```

## Configuring the Dapr Component

Create a Kubernetes secret for the Oracle password:

```bash
kubectl create secret generic oracle-secret \
  --from-literal=password=DaprPass123
```

Create the Dapr state store component manifest:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oracle-statestore
  namespace: default
spec:
  type: state.oracledatabase
  version: v1
  metadata:
  - name: connectionString
    value: "oracle://dapr_state:DaprPass123@localhost:1521/XEPDB1"
  - name: oracleWalletLocation
    value: ""
  - name: tableName
    value: "DAPR_STATE"
```

For Oracle Autonomous Database or Wallet-based connections:

```yaml
  - name: oracleWalletLocation
    value: "/wallet/Wallet_DAPRDB"
```

Apply the component:

```bash
kubectl apply -f oracle-statestore.yaml
```

## Using the Oracle State Store

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

// Save business entity state
await client.state.save("oracle-statestore", [
  {
    key: "customer-10001",
    value: {
      name: "Acme Corp",
      creditLimit: 50000,
      accountStatus: "active",
      region: "EMEA"
    }
  }
]);

const customer = await client.state.get("oracle-statestore", "customer-10001");
console.log("Customer:", customer);
```

## Transactional Operations

Oracle's ACID transactions are fully supported:

```bash
curl -X POST http://localhost:3500/v1.0/state/oracle-statestore/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "operations": [
      {"operation": "upsert", "request": {"key": "account-balance-101", "value": 4500.00}},
      {"operation": "upsert", "request": {"key": "account-balance-202", "value": 8200.00}}
    ]
  }'
```

## Verifying State in Oracle

```sql
-- Connect as dapr_state user
SELECT key, value, update_time FROM DAPR_STATE FETCH FIRST 10 ROWS ONLY;
```

## Summary

Dapr's Oracle Database state store component enables enterprises to integrate Dapr-based microservices into existing Oracle environments without standing up new databases. Its support for ACID transactions, Oracle Wallet authentication, and standard SQL introspection makes it a natural fit for regulated industries and enterprises with existing Oracle investments.
