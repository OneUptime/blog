# How to Configure SQL Server Always On with Dapr State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, SQL Server, Always On, State Store, High Availability, Database

Description: Configure Microsoft SQL Server Always On Availability Groups with Dapr state store for high-availability stateful microservices on Windows workloads.

---

## Overview

SQL Server Always On Availability Groups provide synchronous or asynchronous replication across SQL Server instances for high availability and read scale-out. Dapr's SQL Server state store component connects to Always On listener endpoints, automatically routing reads and writes through the AG topology.

## SQL Server Always On Setup

Configure an Availability Group listener in SQL Server:

```sql
-- Create the Availability Group
CREATE AVAILABILITY GROUP [DaprStateAG]
WITH (
  AUTOMATED_BACKUP_PREFERENCE = SECONDARY,
  DB_FAILOVER = ON,
  FAILURE_CONDITION_LEVEL = 3
)
FOR DATABASE [dapr_state]
REPLICA ON
  N'sql-primary' WITH (
    ENDPOINT_URL = N'TCP://sql-primary:5022',
    FAILOVER_MODE = AUTOMATIC,
    AVAILABILITY_MODE = SYNCHRONOUS_COMMIT,
    SEEDING_MODE = AUTOMATIC,
    SECONDARY_ROLE (ALLOW_CONNECTIONS = ALL)
  ),
  N'sql-secondary' WITH (
    ENDPOINT_URL = N'TCP://sql-secondary:5022',
    FAILOVER_MODE = AUTOMATIC,
    AVAILABILITY_MODE = SYNCHRONOUS_COMMIT,
    SEEDING_MODE = AUTOMATIC,
    SECONDARY_ROLE (ALLOW_CONNECTIONS = ALL)
  );

-- Create Listener
ALTER AVAILABILITY GROUP [DaprStateAG]
  ADD LISTENER N'dapr-state-listener' (
    WITH IP ((N'10.0.1.100', N'255.255.255.0')),
    PORT = 1433
  );
```

## Dapr Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sqlserver-state
  namespace: default
spec:
  type: state.sqlserver
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: sqlserver-secret
      key: connectionString
  - name: tableName
    value: "DaprState"
  - name: schema
    value: "dbo"
  - name: keyType
    value: "string"
  - name: keyLength
    value: "200"
  - name: indexedProperties
    value: '[{"column": "OrderId", "property": "orderId", "type": "nvarchar(50)"}]'
  - name: cleanupIntervalInSeconds
    value: "3600"
```

Create the connection string pointing to the AG listener:

```bash
kubectl create secret generic sqlserver-secret \
  --from-literal=connectionString="Server=dapr-state-listener,1433;Database=dapr_state;User Id=dapr;Password=Secret123!;MultiSubnetFailover=True;ApplicationIntent=ReadWrite;ConnectRetryCount=3;ConnectRetryInterval=5;"
```

## Read-Only Replica for Reads

Configure a separate Dapr component for read-only operations:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sqlserver-state-readonly
  namespace: default
spec:
  type: state.sqlserver
  version: v1
  metadata:
  - name: connectionString
    value: "Server=dapr-state-listener,1433;Database=dapr_state;ApplicationIntent=ReadOnly;MultiSubnetFailover=True;"
```

## Custom Indexed Properties for JSON State

SQL Server stores state as JSON. Index frequently queried properties:

```sql
-- Add a computed column for indexed JSON property
ALTER TABLE dbo.DaprState
  ADD OrderId AS JSON_VALUE(Data, '$.orderId');

CREATE INDEX IX_DaprState_OrderId
  ON dbo.DaprState (OrderId)
  WHERE OrderId IS NOT NULL;

-- Query state by indexed property (bypass Dapr)
SELECT [Key], Data
FROM dbo.DaprState
WHERE OrderId = 'ord-12345';
```

## State Management in .NET

```csharp
using Dapr.Client;

public class OrderStateService
{
    private readonly DaprClient _dapr;

    public OrderStateService(DaprClient dapr)
    {
        _dapr = dapr;
    }

    public async Task SaveOrderAsync(Order order)
    {
        var options = new StateOptions
        {
            Consistency = ConsistencyMode.Strong,
            Concurrency = ConcurrencyMode.LastWrite
        };

        await _dapr.SaveStateAsync(
            "sqlserver-state",
            $"order:{order.Id}",
            order,
            options
        );
    }

    public async Task<Order> GetOrderAsync(string orderId)
    {
        return await _dapr.GetStateAsync<Order>(
            "sqlserver-state",
            $"order:{orderId}"
        );
    }
}
```

## Summary

SQL Server Always On with Dapr provides enterprise-grade high availability for Windows-based microservices workloads. The AG listener abstracts failover from Dapr, automatically routing connections to the primary replica. Using `MultiSubnetFailover=True` in the connection string enables fast failover detection. Indexed JSON properties enable efficient querying of state data without bypassing the Dapr abstraction for simple key lookups.
