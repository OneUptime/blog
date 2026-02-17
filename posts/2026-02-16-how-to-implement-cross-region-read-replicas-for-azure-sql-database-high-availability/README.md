# How to Implement Cross-Region Read Replicas for Azure SQL Database High Availability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, SQL Database, High Availability, Read Replicas, Geo-Replication, Disaster Recovery, Database

Description: Step-by-step guide to implementing cross-region read replicas for Azure SQL Database using active geo-replication and auto-failover groups.

---

When your primary Azure SQL Database goes down, or the region it runs in has an outage, how long can your application afford to be offline? If the answer is "not long," you need cross-region read replicas. Azure SQL Database offers two mechanisms for this: active geo-replication and auto-failover groups. Both keep synchronized copies of your database in a different Azure region, ready to take over if disaster strikes.

I have implemented both patterns for applications ranging from internal tools to high-traffic customer-facing platforms. The right choice depends on your recovery time requirements, application architecture, and how much complexity you want to manage.

## Active Geo-Replication vs Auto-Failover Groups

Active geo-replication creates readable secondary databases in up to four different regions. You manage failover manually or through your own automation. The secondary databases have their own connection strings, so your application needs to handle the switch.

Auto-failover groups build on top of geo-replication but add a listener endpoint that automatically redirects connections after failover. Your application connects to the listener endpoint, and Azure handles the failover transparently.

For most production workloads, I recommend auto-failover groups because they reduce operational burden and application complexity. Active geo-replication is better when you need more than one secondary or want fine-grained control over the failover process.

## Setting Up Active Geo-Replication

Let me start with active geo-replication since it is the foundation for both approaches.

```bash
# Create a secondary database in a different region
# The secondary is a readable copy of the primary
az sql db replica create \
  --resource-group rg-primary \
  --server sql-primary-eastus \
  --name myDatabase \
  --partner-resource-group rg-secondary \
  --partner-server sql-secondary-westus \
  --secondary-type Geo
```

This command creates a continuous copy of `myDatabase` from the East US server to the West US server. The initial seeding can take minutes to hours depending on database size.

Monitor replication status to ensure the secondary is in sync.

```bash
# Check replication state and lag
az sql db replica list-links \
  --resource-group rg-primary \
  --server sql-primary-eastus \
  --name myDatabase \
  --query "[].{role:role, partnerServer:partnerServer, replicationState:replicationState, percentComplete:percentComplete}" \
  -o table
```

The `replicationState` should be `CATCH_UP` during initial seeding and `SEEDING` or `SYNCHRONIZED` once caught up.

## Setting Up Auto-Failover Groups

Auto-failover groups are the recommended approach for most scenarios. They provide a single endpoint that follows the primary database automatically.

```bash
# Create a failover group between two servers
az sql failover-group create \
  --resource-group rg-primary \
  --server sql-primary-eastus \
  --name myfailovergroup \
  --partner-resource-group rg-secondary \
  --partner-server sql-secondary-westus \
  --add-db myDatabase \
  --failover-policy Automatic \
  --grace-period 1
```

The `grace-period` is the number of hours Azure waits before triggering automatic failover during a region outage. Setting it to 1 hour means Azure waits 1 hour to see if the primary region recovers before initiating failover. Shorter grace periods mean faster recovery but higher risk of unnecessary failovers.

After creating the failover group, you get two endpoints:

- **Read-write listener**: `myfailovergroup.database.windows.net` (always points to primary)
- **Read-only listener**: `myfailovergroup.secondary.database.windows.net` (always points to secondary)

Update your application connection string to use the failover group endpoint instead of the server-specific endpoint.

```
// Before: Direct connection to primary server (does not survive failover)
Server=sql-primary-eastus.database.windows.net;Database=myDatabase;

// After: Failover group endpoint (follows primary automatically)
Server=myfailovergroup.database.windows.net;Database=myDatabase;
```

## Offloading Read Traffic to Replicas

One of the biggest benefits of read replicas is offloading read-heavy queries from the primary. Reporting queries, analytics dashboards, and search functionality can all point to the secondary without impacting the primary's write performance.

To connect to the read-only replica, use the `ApplicationIntent=ReadOnly` connection string parameter.

```csharp
// C# connection string that routes to the read-only secondary
// This offloads read traffic from the primary database
string connectionString =
    "Server=myfailovergroup.database.windows.net;" +
    "Database=myDatabase;" +
    "Authentication=Active Directory Default;" +
    "ApplicationIntent=ReadOnly;";

using var connection = new SqlConnection(connectionString);
await connection.OpenAsync();

// This query runs on the secondary - no impact on primary performance
using var command = new SqlCommand(
    "SELECT * FROM Orders WHERE OrderDate > @date", connection);
command.Parameters.AddWithValue("@date", DateTime.UtcNow.AddDays(-30));
```

Be aware that the secondary has a small replication lag, typically under 5 seconds but potentially longer during heavy write periods. Applications reading from the secondary should be designed to tolerate this lag. Do not use the secondary for reads that must reflect the absolute latest writes.

## Monitoring Replication Health

Continuous monitoring of replication health is essential. If replication lag grows too large, your secondary is not a reliable failover target.

```sql
-- Run this on the secondary to check replication lag
-- Shows the time difference between primary and secondary
SELECT
    partner_server,
    partner_database,
    replication_state_desc,
    last_replication,
    -- Replication lag in seconds
    DATEDIFF(SECOND, last_replication, GETUTCDATE()) AS lag_seconds
FROM sys.dm_geo_replication_link_status;
```

Set up Azure Monitor alerts for replication lag exceeding your threshold. For critical databases, alert if lag exceeds 30 seconds.

```bash
# Create an alert for high replication lag
az monitor metrics alert create \
  --name "high-replication-lag" \
  --resource-group rg-primary \
  --scopes "/subscriptions/{sub-id}/resourceGroups/rg-primary/providers/Microsoft.Sql/servers/sql-primary-eastus/databases/myDatabase" \
  --condition "avg replication_lag_seconds > 30" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 2 \
  --action "/subscriptions/{sub-id}/resourceGroups/rg-monitoring/providers/microsoft.insights/actionGroups/ag-oncall"
```

## Testing Failover

Never wait for a real outage to find out if failover works. Test it regularly in a controlled manner.

```bash
# Initiate a planned failover (no data loss)
# The secondary becomes the new primary and vice versa
az sql failover-group set-primary \
  --resource-group rg-secondary \
  --server sql-secondary-westus \
  --name myfailovergroup
```

During planned failover, Azure waits for all pending transactions on the primary to replicate to the secondary before completing the switch. This ensures zero data loss. The failover typically completes in under 30 seconds.

After testing, fail back to the original primary when ready.

```bash
# Fail back to the original primary
az sql failover-group set-primary \
  --resource-group rg-primary \
  --server sql-primary-eastus \
  --name myfailovergroup
```

## Handling Failover in Application Code

Even with auto-failover groups, your application needs to handle the brief connection interruption during failover. Implement retry logic for transient errors.

```csharp
// C# example: Retry policy for SQL connections during failover
// Handles the transient errors that occur during failover switch
var retryPolicy = Policy
    .Handle<SqlException>(ex => IsTransient(ex))
    .WaitAndRetryAsync(
        retryCount: 5,
        sleepDurationProvider: attempt =>
            TimeSpan.FromSeconds(Math.Pow(2, attempt)),
        onRetry: (exception, timespan, retryCount, context) =>
        {
            Console.WriteLine($"Retry {retryCount} after {timespan.TotalSeconds}s: {exception.Message}");
        });

bool IsTransient(SqlException ex)
{
    // Error numbers that indicate transient failures
    int[] transientErrors = { 40613, 40197, 40501, 49918, 40549, 40550 };
    return transientErrors.Contains(ex.Number);
}
```

## Cost Considerations

Geo-replicated secondaries are billed at the same rate as the primary database. If your primary is an S3 database, the secondary costs the same. For cost optimization, you can use a lower service tier for the secondary if it is only used for disaster recovery and not for offloading read traffic.

However, using a lower tier means the secondary may not handle the full production load after failover. This is a tradeoff between cost and recovery performance.

## Multi-Database Applications

If your application uses multiple databases on the same server, add all of them to the same failover group. This ensures they all fail over together and remain consistent.

```bash
# Add additional databases to an existing failover group
az sql failover-group update \
  --resource-group rg-primary \
  --server sql-primary-eastus \
  --name myfailovergroup \
  --add-db database2 database3
```

Cross-region read replicas are one of the most important availability features for Azure SQL Database. Set them up before you need them, test failover regularly, and make sure your application connection strings use the failover group endpoints. When a region outage happens, you will be glad the preparation was done.
