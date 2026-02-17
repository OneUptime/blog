# How to Configure Cross-Region Disaster Recovery for Azure SQL Database with Azure Site Recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL Database, Disaster Recovery, Azure Site Recovery, Geo-Replication, Failover, Business Continuity, High Availability

Description: Learn how to set up cross-region disaster recovery for Azure SQL Database using geo-replication and failover groups for business continuity.

---

When your Azure SQL Database serves a critical workload, a single-region deployment is a single point of failure. Regional outages are rare but they do happen - natural disasters, datacenter issues, or network problems can take an entire Azure region offline. Cross-region disaster recovery ensures your database remains available even when an entire region goes down. This guide covers the two main approaches: active geo-replication and auto-failover groups, and walks through setting both up.

## Understanding the Options

Azure SQL Database offers two built-in disaster recovery mechanisms:

**Active Geo-Replication** creates read-only replicas of your database in different Azure regions. You can have up to four secondary replicas. Failover is manual - you decide when to promote a secondary to primary. This gives you maximum control but requires human intervention during an outage.

**Auto-Failover Groups** build on geo-replication but add automatic failover. You define a failover group with a primary and secondary region, and Azure automatically fails over if the primary becomes unavailable. Failover groups also provide a listener endpoint that automatically redirects connections to the current primary, so your application does not need connection string changes.

For most production scenarios, I recommend auto-failover groups. Manual failover (active geo-replication) is useful when you want to avoid accidental failovers or need fine-grained control over the timing.

## Prerequisites

- Two Azure SQL Database logical servers in different regions
- An Azure SQL Database on the primary server
- Azure CLI installed
- Network connectivity between the two regions (handled by Azure backbone)

## Option 1: Setting Up Active Geo-Replication

### Step 1: Create the Primary Database

```bash
# Variables
RESOURCE_GROUP="rg-sql-production"
PRIMARY_SERVER="sql-primary-eastus"
SECONDARY_SERVER="sql-secondary-westus"
DB_NAME="appdb"
ADMIN_USER="sqladmin"
ADMIN_PASSWORD="$(openssl rand -base64 24)"

# Create the resource group
az group create --name $RESOURCE_GROUP --location eastus

# Create the primary SQL server
az sql server create \
    --name $PRIMARY_SERVER \
    --resource-group $RESOURCE_GROUP \
    --location eastus \
    --admin-user $ADMIN_USER \
    --admin-password "$ADMIN_PASSWORD"

# Create the database on the primary server
az sql db create \
    --name $DB_NAME \
    --server $PRIMARY_SERVER \
    --resource-group $RESOURCE_GROUP \
    --edition GeneralPurpose \
    --compute-model Provisioned \
    --family Gen5 \
    --capacity 4 \
    --max-size 100GB \
    --zone-redundant true
```

### Step 2: Create the Secondary Server

```bash
# Create the secondary SQL server in a different region
az sql server create \
    --name $SECONDARY_SERVER \
    --resource-group $RESOURCE_GROUP \
    --location westus \
    --admin-user $ADMIN_USER \
    --admin-password "$ADMIN_PASSWORD"
```

### Step 3: Create the Geo-Replication Link

```bash
# Create a geo-replication link from primary to secondary
# This starts replicating the database to the secondary region
az sql db replica create \
    --name $DB_NAME \
    --server $PRIMARY_SERVER \
    --resource-group $RESOURCE_GROUP \
    --partner-server $SECONDARY_SERVER \
    --partner-resource-group $RESOURCE_GROUP \
    --secondary-type Geo
```

The initial seeding copies the entire database to the secondary region. For a 100 GB database, this can take 30 minutes to a few hours depending on the database activity level. After the initial seed, ongoing replication is asynchronous with a typical lag of a few seconds.

### Step 4: Monitor Replication Status

```bash
# Check replication status and lag
az sql db replica list-links \
    --name $DB_NAME \
    --server $PRIMARY_SERVER \
    --resource-group $RESOURCE_GROUP \
    -o table
```

The output shows the replication state, role (primary or secondary), and the replication lag percentage.

### Step 5: Perform Manual Failover

When you need to fail over (either for a disaster or planned maintenance):

```bash
# Failover to the secondary (this promotes the secondary to primary)
# The old primary becomes the new secondary
az sql db replica set-primary \
    --name $DB_NAME \
    --server $SECONDARY_SERVER \
    --resource-group $RESOURCE_GROUP
```

After failover, your application needs to update its connection string to point to the new primary server. This is the main drawback of active geo-replication compared to failover groups.

## Option 2: Setting Up Auto-Failover Groups (Recommended)

### Step 1: Create the Failover Group

Assuming you already have the primary and secondary servers from above:

```bash
# Create a failover group
FAILOVER_GROUP="fog-appdb"

az sql failover-group create \
    --name $FAILOVER_GROUP \
    --server $PRIMARY_SERVER \
    --resource-group $RESOURCE_GROUP \
    --partner-server $SECONDARY_SERVER \
    --partner-resource-group $RESOURCE_GROUP \
    --failover-policy Automatic \
    --grace-period 1
```

The `grace-period` is the number of hours Azure waits before triggering an automatic failover. Setting it to 1 hour means Azure will automatically fail over if the primary is unavailable for more than 1 hour. You can set it as low as 1 hour or disable automatic failover entirely with `--failover-policy Manual`.

### Step 2: Add Databases to the Failover Group

```bash
# Add your database to the failover group
az sql failover-group update \
    --name $FAILOVER_GROUP \
    --server $PRIMARY_SERVER \
    --resource-group $RESOURCE_GROUP \
    --add-db $DB_NAME
```

You can add multiple databases to the same failover group. They will all fail over together, which is important for applications that use multiple databases and need them to be consistent.

### Step 3: Configure Your Application Connection String

This is the key advantage of failover groups. Instead of connecting to a specific server, your application connects to the failover group listener:

```
# Read-write listener (always points to the current primary)
Server=tcp:<failover-group-name>.database.windows.net,1433;Database=appdb;...

# Read-only listener (points to the secondary for read-only workloads)
Server=tcp:<failover-group-name>.secondary.database.windows.net,1433;Database=appdb;...
```

Here is a connection string example for a .NET application:

```csharp
// appsettings.json - Connection string using failover group listener
// The listener automatically routes to the current primary
{
    "ConnectionStrings": {
        "DefaultConnection": "Server=tcp:fog-appdb.database.windows.net,1433;Database=appdb;User ID=sqladmin;Password=<password>;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
    }
}
```

When a failover occurs, the DNS for the listener endpoint updates automatically. Your application reconnects to the new primary without any configuration changes. There will be a brief interruption (typically 30 to 60 seconds for automatic failover), but no manual intervention is needed.

### Step 4: Test the Failover

Always test your failover before relying on it in production:

```bash
# Trigger a manual failover to test the process
az sql failover-group set-primary \
    --name $FAILOVER_GROUP \
    --server $SECONDARY_SERVER \
    --resource-group $RESOURCE_GROUP

# Verify which server is now the primary
az sql failover-group show \
    --name $FAILOVER_GROUP \
    --server $SECONDARY_SERVER \
    --resource-group $RESOURCE_GROUP \
    --query "replicationRole" -o tsv
```

During the test, monitor your application's behavior:
- How long does the connection drop last?
- Does the application reconnect automatically?
- Are there any data consistency issues?
- Do retry policies in your application handle the temporary errors?

### Step 5: Implement Retry Logic in Your Application

During a failover, your application will see transient errors. Implement retry logic to handle these gracefully:

```java
// RetryableDataSource.java - Retry logic for SQL connections during failover
import java.sql.Connection;
import java.sql.SQLException;

public class RetryableDataSource {

    private static final int MAX_RETRIES = 5;
    private static final int INITIAL_DELAY_MS = 1000;

    public Connection getConnectionWithRetry(DataSource dataSource) throws SQLException {
        int attempt = 0;
        while (true) {
            try {
                // Attempt to get a connection
                return dataSource.getConnection();
            } catch (SQLException e) {
                attempt++;
                if (attempt >= MAX_RETRIES || !isTransientError(e)) {
                    throw e;
                }

                // Exponential backoff with jitter
                int delay = INITIAL_DELAY_MS * (int) Math.pow(2, attempt - 1);
                delay += (int) (Math.random() * delay * 0.1);

                System.out.printf("Transient SQL error (attempt %d/%d), retrying in %dms: %s%n",
                    attempt, MAX_RETRIES, delay, e.getMessage());

                try {
                    Thread.sleep(delay);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new SQLException("Interrupted during retry", ie);
                }
            }
        }
    }

    // Check if the error is transient (failover-related)
    private boolean isTransientError(SQLException e) {
        int errorCode = e.getErrorCode();
        return errorCode == 40613  // Database not available
            || errorCode == 40197  // Service error
            || errorCode == 40501  // Service busy
            || errorCode == 49918  // Cannot process request
            || errorCode == 40540; // Database is in transition
    }
}
```

## Monitoring and Alerting

Set up Azure Monitor alerts to notify you when failover events occur:

```bash
# Create an alert for failover events
az monitor activity-log alert create \
    --name "SQL-Failover-Alert" \
    --resource-group $RESOURCE_GROUP \
    --condition category=Administrative and operationName=Microsoft.Sql/servers/failoverGroups/failover/action \
    --action-group ops-team-ag
```

Also monitor replication lag to catch issues before they become critical:

```bash
# Query replication lag through Azure Monitor metrics
az monitor metrics list \
    --resource "/subscriptions/<sub-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Sql/servers/$PRIMARY_SERVER/databases/$DB_NAME" \
    --metric "geo_replication_lag_seconds" \
    --interval PT5M \
    --aggregation Average
```

## Summary

Cross-region disaster recovery for Azure SQL Database comes down to choosing between active geo-replication (manual failover, more control) and auto-failover groups (automatic failover, simpler application configuration). For most production workloads, failover groups are the better choice because they provide automatic failover and listener endpoints that eliminate the need for connection string changes. Test your failover regularly, implement retry logic in your application to handle transient errors during failover, and monitor replication lag to catch problems early.
