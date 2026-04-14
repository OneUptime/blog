# How to Use Dapr State Store with Microsoft SQL Server v2 Features

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, SQL Server, State Store, Database, Kubernetes

Description: Configure the Dapr SQL Server v2 state store with ETag concurrency, TTL support, query API, and connection string best practices for production deployments.

---

## SQL Server v2 State Store Overview

The Dapr SQL Server state store v2 (`state.sqlserver` with `version: v2`) supports optimistic concurrency via ROWVERSION-based ETags and TTL-based expiry. It works with SQL Server, Azure SQL Database, and Azure SQL Managed Instance. Note that v2 does not support the Dapr State Query API, and data cannot be migrated between v1 and v2 components.

## Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.sqlserver
  version: v2
  metadata:
    - name: connectionString
      secretKeyRef:
        name: sqlserver-secret
        key: connection-string
    - name: tableName
      value: "DaprState"
    - name: schema
      value: "dbo"
    - name: cleanupIntervalInSeconds
      value: "300"
    - name: indexedProperties
      value: '[{"column": "UserTier", "property": "userTier", "type": "nvarchar(50)"}]'
```

Create the connection string secret:

```bash
kubectl create secret generic sqlserver-secret \
  --from-literal=connection-string="sqlserver://sa:P@ssw0rd@sqlserver:1433?database=DaprState&encrypt=true&trustServerCertificate=false"
```

## V2 Table Schema

Dapr auto-creates the table on startup:

```sql
CREATE TABLE [dbo].[DaprState] (
    [Key]          NVARCHAR(200) NOT NULL PRIMARY KEY,
    [Data]         NVARCHAR(MAX) NULL,
    [BinaryData]   VARBINARY(MAX) NULL,
    [isBinary]     BIT NOT NULL DEFAULT(0),
    [RowVersion]   ROWVERSION NOT NULL,
    [InsertDate]   DATETIME2 NOT NULL DEFAULT(GETDATE()),
    [UpdateDate]   DATETIME2 NULL,
    [ExpireDate]   DATETIME2 NULL
);
```

## Using ETag Concurrency

```csharp
using Dapr.Client;

var client = new DaprClientBuilder().Build();

// Read with ETag
var (data, etag) = await client.GetStateAndETagAsync<UserProfile>(
    "statestore", "user:123");

// Conditional save
bool saved = await client.TrySaveStateAsync(
    "statestore",
    "user:123",
    new UserProfile { Name = "Alice", Score = data.Score + 10 },
    etag);

if (!saved)
{
    Console.WriteLine("Conflict detected - retry with fresh read");
}
```

## Indexed Properties

The v2 component supports `indexedProperties` to create additional computed columns in the state table based on JSON fields:

```yaml
- name: indexedProperties
  value: |
    [
      {"column": "Status", "property": "status", "type": "nvarchar(50)"},
      {"column": "Score", "property": "score", "type": "int"},
      {"column": "Region", "property": "region", "type": "nvarchar(20)"}
    ]
```

**Important:** The v2 SQL Server component does not support the Dapr State Query API. Indexed properties create dedicated SQL columns that can be queried directly via SQL, but the Dapr query API (`/v1.0-alpha1/state/<storeName>/query`) is only available with the v1 component.

## TTL Configuration

```csharp
var metadata = new Dictionary<string, string>
{
    ["ttlInSeconds"] = "3600"
};

await client.SaveStateAsync(
    "statestore",
    "session:xyz",
    sessionData,
    metadata: metadata);
```

## Azure SQL with Managed Identity

For Azure SQL Database, use Microsoft Entra ID (formerly Azure AD) with Managed Identity instead of passwords. Set the `useAzureAD` metadata field to `true` and omit credentials from the connection string:

```yaml
- name: connectionString
  value: "sqlserver://sqlserver.database.windows.net:1433?database=DaprState"
- name: useAzureAD
  value: "true"
```

## Summary

The Dapr SQL Server v2 state store uses ROWVERSION-based ETags for optimistic concurrency and supports TTL cleanup via a background process keyed on the `ExpireDate` column. Define `indexedProperties` in the component spec to create dedicated SQL columns for JSON fields, which can be queried directly via SQL. Note that the v2 component does not support the Dapr State Query API. For Azure deployments, Microsoft Entra ID authentication with Managed Identity eliminates the need for stored credentials.
