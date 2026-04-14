# How to Configure Dapr with Microsoft SQL Server State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, SQL Server, State Store, Microsoft, Relational Database

Description: Learn how to configure Dapr with Microsoft SQL Server as a state store, enabling enterprise microservices to use SQL Server for reliable, ACID-compliant state persistence.

---

## Overview

Microsoft SQL Server is a widely used enterprise relational database with strong ACID guarantees, rich tooling, and deep integration with the Microsoft ecosystem. Dapr's SQL Server state store component allows you to persist microservice state in SQL Server, making it easy to integrate Dapr into environments where SQL Server is already the database standard.

## Prerequisites

- SQL Server 2019 or later (or Azure SQL Database)
- Dapr CLI and runtime installed
- sqlcmd or SSMS for verification

## Setting Up SQL Server

Run SQL Server using Docker for development:

```bash
docker run -d \
  --name sqlserver \
  -e ACCEPT_EULA=Y \
  -e SA_PASSWORD=StrongPass123! \
  -p 1433:1433 \
  mcr.microsoft.com/mssql/server:2022-latest
```

Create a dedicated database and user for Dapr state:

```sql
-- Connect as sa
CREATE DATABASE DaprStateDB;
GO

USE DaprStateDB;
GO

CREATE LOGIN dapr_user WITH PASSWORD = 'DaprPass123!';
CREATE USER dapr_user FOR LOGIN dapr_user;
GRANT CREATE TABLE TO dapr_user;
GRANT ALTER ON SCHEMA::dbo TO dapr_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO dapr_user;
GO
```

## Configuring the Dapr Component

Create a Kubernetes secret with the connection string:

```bash
kubectl create secret generic mssql-secret \
  --from-literal=connectionString="server=sqlserver;user id=dapr_user;password=DaprPass123!;port=1433;database=DaprStateDB;encrypt=true;trustServerCertificate=true"
```

Create the Dapr state store component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mssql-statestore
  namespace: default
spec:
  type: state.sqlserver
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: mssql-secret
      key: connectionString
  - name: tableName
    value: "DaprState"
  - name: keyType
    value: "string"
  - name: indexedProperties
    value: ""
  - name: schema
    value: "dbo"
  - name: cleanupIntervalInSeconds
    value: "3600"
```

Apply the component:

```bash
kubectl apply -f mssql-statestore.yaml
```

## Using the SQL Server State Store

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

// Store workflow state
await client.state.save("mssql-statestore", [
  {
    key: "workflow-invoice-3041",
    value: {
      workflowId: "invoice-3041",
      status: "approval-pending",
      approvers: ["manager@corp.com"],
      amount: 12500.00,
      createdAt: new Date().toISOString()
    }
  }
]);

const workflow = await client.state.get("mssql-statestore", "workflow-invoice-3041");
console.log("Workflow state:", workflow);
```

## Using Azure SQL Database

For Azure SQL Database, update the connection string:

```bash
kubectl create secret generic mssql-secret \
  --from-literal=connectionString="server=myserver.database.windows.net;user id=dapr_user@myserver;password=DaprPass123!;port=1433;database=DaprStateDB;encrypt=true"
```

## Querying State Directly

```sql
-- View all state entries
SELECT TOP 10 [Key], CAST([Data] AS NVARCHAR(MAX)) AS Value,
  [UpdateDate], [RowVersion]
FROM dbo.DaprState
ORDER BY [UpdateDate] DESC;
```

## Summary

Microsoft SQL Server as a Dapr state store provides enterprise-grade reliability, ACID transactions, and seamless integration with existing SQL Server infrastructure and tooling. It is particularly valuable in Microsoft-heavy environments or when compliance requirements mandate a relational database with robust auditing capabilities.
