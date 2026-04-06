# How to Use Dapr State Store with Microsoft SQL Server v2 Features

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, SQL Server, State Store, Database, Kubernetes

Description: Configure the Dapr SQL Server v2 state store with ETag concurrency, TTL support, query API, and connection string best practices for production deployments.

---

## SQL Server v2 State Store Overview

The Dapr SQL Server state store v2 (`state.sqlserver`) supports optimistic concurrency via row version ETags, TTL-based expiry, and the State Query API through JSON column indexing. It works with SQL Server 2016+, Azure SQL Database, and Azure SQL Managed Instance.

## Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.sqlserver
  version: v1
  metadata:
    - name: connectionString
      secretKeyRef:
        name: sqlserver-secret
        key: connection-string
    - name: tableName
      value: "DaprState"
    - name: schema
      value: "dbo"
    - name: cleanupInterval
      value: "5m"
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
    [Key]          NVARCHAR(900) NOT NULL PRIMARY KEY,
    [Data]         NVARCHAR(MAX) NOT NULL,
    [IsBinary]     BIT NOT NULL,
    [ETag]         INT NOT NULL,
    [ExpireDate]   DATETIME2 NULL,
    [UpdateTime]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE INDEX [IX_DaprState_ExpireDate]
    ON [dbo].[DaprState] ([ExpireDate])
    WHERE [ExpireDate] IS NOT NULL;
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

## State Query API with Indexed Properties

Index JSON properties to enable efficient queries:

```yaml
- name: indexedProperties
  value: |
    [
      {"column": "Status", "property": "status", "type": "nvarchar(50)"},
      {"column": "Score", "property": "score", "type": "int"},
      {"column": "Region", "property": "region", "type": "nvarchar(20)"}
    ]
```

Then query using the State Query API:

```csharp
var query = new StateQueryRequest
{
    Filter = new Dictionary<string, object>
    {
        ["AND"] = new[]
        {
            new { EQ = new { key = "status", value = "active" } },
            new { GT = new { key = "score", value = 50 } }
        }
    },
    Sort = new[] { new { Key = "score", Order = "DESC" } },
    Page = new { Limit = 20 }
};

var result = await client.QueryStateAsync<UserProfile>("statestore", query);
```

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

For Azure SQL Database, use Managed Identity instead of passwords:

```yaml
- name: connectionString
  value: "sqlserver://sqlserver.database.windows.net?database=DaprState&encrypt=true&authentication=ActiveDirectoryMSI"
```

## Summary

The Dapr SQL Server v2 state store uses integer-based ETags (row versions) for optimistic concurrency and supports TTL cleanup via a background process keyed on the `ExpireDate` column. Define `indexedProperties` in the component spec to create dedicated SQL columns for JSON fields you want to filter or sort in the State Query API. For Azure deployments, Managed Identity authentication eliminates the need for stored credentials.
