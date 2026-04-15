# How to Use Dapr with Azure Database for PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, PostgreSQL, State Management, Managed Database

Description: Configure Dapr state management with Azure Database for PostgreSQL Flexible Server, including SSL setup, Entra ID authentication, and connection pooling via PgBouncer.

---

## Overview

Azure Database for PostgreSQL Flexible Server is a fully managed PostgreSQL service on Azure. Dapr integrates with it through the PostgreSQL state store component, providing reliable, managed relational storage for Dapr-enabled microservices running on AKS.

## Creating the Dapr State Store Component

Configure Dapr to connect to Azure Database for PostgreSQL:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.postgresql
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: azure-pg-secret
      key: connectionString
  - name: tableName
    value: dapr_state
  - name: cleanupInterval
    value: "1h"
```

Create the Kubernetes secret with the connection string:

```bash
kubectl create secret generic azure-pg-secret \
  --from-literal=connectionString="host=my-server.postgres.database.azure.com \
    port=5432 \
    user=dapr_user \
    password=mypassword \
    dbname=mydb \
    sslmode=require"
```

## Entra ID Authentication

Use Azure Managed Identity for passwordless authentication:

```bash
# Assign the "PostgreSQL Flexible Server AD Admin" role to the managed identity
az ad sp show --id $(az identity show -n aks-identity -g my-rg --query clientId -o tsv) \
  --query id -o tsv

az postgres flexible-server ad-admin create \
  --server-name my-server \
  --resource-group my-rg \
  --display-name "aks-identity" \
  --object-id <identity-object-id>
```

Update the connection string to use Entra ID authentication:

```yaml
metadata:
- name: connectionString
  value: "host=my-server.postgres.database.azure.com port=5432 user=aks-identity dbname=mydb sslmode=require"
- name: useAzureAD
  value: "true"
```

## Connection Pooling with PgBouncer

Azure Database for PostgreSQL Flexible Server has built-in PgBouncer. Enable it and update the connection string:

```bash
# Enable PgBouncer on the Flexible Server
az postgres flexible-server parameter set \
  --server-name my-server \
  --resource-group my-rg \
  --name pgbouncer.enabled \
  --value true
```

Use port 6432 for PgBouncer connections:

```yaml
metadata:
- name: connectionString
  value: "host=my-server.postgres.database.azure.com port=6432 user=dapr_user password=mypassword dbname=mydb sslmode=require"
```

## Creating the Dapr State Table

Dapr automatically creates the state table, but you can pre-create it for custom schema setup:

```sql
CREATE TABLE dapr_state (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL,
  isbinary BOOLEAN NOT NULL,
  insertdate TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updatedate TIMESTAMP WITH TIME ZONE NULL,
  expiredate TIMESTAMP WITH TIME ZONE
);
```

## Verifying State Store Connectivity

Test the connection and state operations:

```bash
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key":"pg-test","value":{"message":"connected to Azure PostgreSQL"}}]'

curl http://localhost:3500/v1.0/state/statestore/pg-test
```

## Summary

Azure Database for PostgreSQL Flexible Server is an excellent Dapr state store backend for AKS workloads that need relational semantics, strong consistency, and JSONB querying. Enable PgBouncer for connection pooling to handle the many short-lived Dapr sidecar connections efficiently, and use Entra ID Managed Identity authentication to eliminate long-lived credentials from your Kubernetes secrets.
