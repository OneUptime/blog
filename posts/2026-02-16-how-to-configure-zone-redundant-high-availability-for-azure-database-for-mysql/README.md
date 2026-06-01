# How to Configure Zone-Redundant High Availability for Azure Database for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, MySQL, High Availability, Zone Redundant, Flexible Server, Disaster Recovery, Cloud Database

Description: Learn how to configure zone-redundant high availability for Azure Database for MySQL Flexible Server to protect against zone-level failures.

---

When you are running MySQL in production on Azure, you need to think about what happens when things go wrong. Hardware fails, racks lose power, and sometimes entire availability zones go offline. Zone-redundant high availability (HA) for Azure Database for MySQL Flexible Server gives you automatic failover protection against these scenarios. The standby replica lives in a different availability zone, so even a full zone outage will not take your database offline.

In this post, I will explain how zone-redundant HA works, walk through the setup, and share some operational lessons that might save you headaches down the road.

## How Zone-Redundant HA Works

When you enable zone-redundant HA, Azure deploys two copies of your MySQL server in different availability zones within the same region. One is the primary and the other is the standby. Here is what the architecture looks like at a high level:

```mermaid
graph LR
    A[Application] --> B[Primary Server - Zone 1]
    B --> C[Zone-Redundant Storage]
    D[Standby Server - Zone 2] -->|Reads and replays logs| C
```

The key points:

- Data and log files are hosted in zone-redundant storage, and the standby continuously reads and replays the primary server logs.
- The standby server is not accessible for reads or connections. It sits idle, waiting for a failover.
- Failover is automatic. Azure detects the failure and promotes the standby.
- After failover, Azure brings the old primary back as the standby when possible.

This design means no data loss during failover - your committed transactions are safe. The trade-off is slightly higher write latency because commits and writes are acknowledged after the log files are flushed to the primary server's zone-redundant storage.

## Same-Zone HA vs. Zone-Redundant HA

Azure offers two flavors of HA for Flexible Server:

| Feature | Same-Zone HA | Zone-Redundant HA |
|---------|-------------|-------------------|
| Standby location | Same availability zone | Different availability zone |
| Protects against | Server/hardware failure | Server, hardware, and zone failure |
| Failover time | 60-120 seconds | 60-120 seconds |
| Write latency impact | Minimal | Slightly higher (cross-zone) |
| Cost | ~2x compute and provisioned storage | ~2x compute and provisioned storage |

If your region supports availability zones and your workload is business-critical, zone-redundant HA is the better choice. Same-zone HA is a reasonable option when zone-level protection is not required or the region does not support zones.

## Prerequisites

Before enabling zone-redundant HA:

- Your server must be on General Purpose or Memory Optimized tier. Burstable tier does not support HA.
- The region must support availability zones.
- You need at least two availability zones in the region.
- Your application should use retry logic for connections, since failover takes 60-120 seconds.

## Enabling HA During Server Creation

The easiest way to set up HA is during server creation. If you are using the Azure CLI:

```bash
# Create a MySQL Flexible Server with zone-redundant HA

az mysql flexible-server create \
  --resource-group myResourceGroup \
  --name my-ha-mysql-server \
  --location eastus \
  --admin-user myadmin \
  --admin-password 'StrongPassword123!' \
  --sku-name Standard_D4ds_v4 \
  --tier GeneralPurpose \
  --version 8.0.21 \
  --storage-size 128 \
  --high-availability ZoneRedundant \
  --zone 1 \
  --standby-zone 3
```

The `--zone` flag specifies where the primary runs, and `--standby-zone` specifies where the standby lives. Pick zones that make sense for your region.

In the Azure portal, you configure HA on the "High Availability" tab during creation. Select "Zone redundant" and choose your preferred zones.

## Enabling HA on an Existing Server

If you already have a Flexible Server running without HA, you can enable local-redundant HA on that server. You cannot enable zone-redundant HA in place on an existing non-HA server. For zone-redundant HA, create a new server with zone-redundant HA enabled and migrate your workload to it.

```bash
# Enable same-zone HA on an existing server
az mysql flexible-server update \
  --resource-group myResourceGroup \
  --name my-existing-mysql-server \
  --high-availability SameZone \
  --standby-zone 2
```

This operation takes several minutes. Azure provisions the standby server and sets up HA replication. During this process, there may be a brief interruption, so plan accordingly.

In the portal, go to your server, click "High availability" in the left menu under Settings, enable high availability, select a same-zone standby, and click Save. For zone-redundant HA, create a replacement server with zone-redundant HA enabled and migrate to it.

## Monitoring HA Status

After enabling HA, you should verify everything is healthy. Use the CLI:

```bash
# Check the HA state and zone information
az mysql flexible-server show \
  --resource-group myResourceGroup \
  --name my-ha-mysql-server \
  --query "{haState:highAvailability.state, haMode:highAvailability.mode, zone:availabilityZone, standbyZone:highAvailability.standbyAvailabilityZone}"
```

You should see the state as "Healthy" and the mode as "ZoneRedundant." If the state shows "NotEnabled" or "ReplicatingData," give it more time.

In Azure Monitor, you can set up alerts on the HA health metric:

```bash
# Create an alert rule for HA replication health
az monitor metrics alert create \
  --name mysql-ha-failover-alert \
  --resource-group myResourceGroup \
  --scopes "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.DBforMySQL/flexibleServers/my-ha-mysql-server" \
  --condition "max HA_IO_status < 1" \
  --description "Alert when HA IO replication health degrades" \
  --action "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Insights/actionGroups/myActionGroup"
```

Create a similar alert for `HA_SQL_status` so you are notified if the SQL replication thread stops running.

## What Happens During Failover

When the primary server fails, here is the sequence of events:

1. Azure detects the failure (typically within seconds).
2. The standby server is promoted to primary.
3. Depending on the server's networking architecture, DNS records might be updated to point to the new primary, or traffic might be redirected by Azure's HA load-balancing path.
4. Your application connections using the server FQDN automatically route to the new primary.
5. Azure brings the old primary back as the standby when possible.

The total failover time is usually 60-120 seconds. During this window, connections will fail. Your application needs to handle this gracefully.

## Application-Side Considerations

HA at the database layer is only half the story. Your application needs to be ready for failovers too.

### Connection Retry Logic

Implement exponential backoff retry logic in your application. Here is a Python example:

```python
import mysql.connector
import time

def get_connection(max_retries=5):
    """
    Attempt to connect to MySQL with exponential backoff.
    This handles brief outages during HA failover events.
    """
    retries = 0
    while retries < max_retries:
        try:
            conn = mysql.connector.connect(
                host="my-ha-mysql-server.mysql.database.azure.com",
                user="myadmin",
                password="StrongPassword123!",
                database="myapp",
                ssl_ca="/path/to/DigiCertGlobalRootCA.crt.pem",
                connection_timeout=10
            )
            return conn
        except mysql.connector.Error as err:
            retries += 1
            wait_time = min(2 ** retries, 30)  # Cap at 30 seconds
            print(f"Connection failed: {err}. Retrying in {wait_time}s...")
            time.sleep(wait_time)
    raise Exception("Failed to connect after maximum retries")
```

### Connection Pooling

Use a connection pool that can detect and replace dead connections:

```python
from mysql.connector import pooling

# Create a connection pool that handles stale connections
pool = pooling.MySQLConnectionPool(
    pool_name="myapp_pool",
    pool_size=10,
    pool_reset_session=True,  # Reset session state on reuse
    host="my-ha-mysql-server.mysql.database.azure.com",
    user="appuser",
    password="AppPassword456!",
    database="myapp",
    ssl_ca="/path/to/DigiCertGlobalRootCA.crt.pem"
)
```

### DNS Caching

Make sure your application does not cache DNS results aggressively. During failover, the DNS A record for some HA server networking configurations can change. If your app caches the old IP, it can keep trying to connect to the failed primary. Always use the server FQDN rather than an IP address in your connection string.

In Java, set the DNS TTL to a low value:

```java
// Set DNS cache TTL to 30 seconds in your application startup
java.security.Security.setProperty("networkaddress.cache.ttl", "30");
```

## Testing Failover

You should test failover before you need it in production. Azure lets you trigger a user-initiated forced failover:

```bash
# Trigger a forced failover for testing
az mysql flexible-server restart \
  --resource-group myResourceGroup \
  --name my-ha-mysql-server \
  --failover Forced
```

During a forced failover, the standby takes over and the old primary restarts and becomes the new standby. Time the failover and observe how your application handles it. Ideally, run this test in staging first, then during a maintenance window in production.

## Cost Implications

Zone-redundant HA roughly doubles your compute and provisioned storage cost because Azure bills for both the primary and secondary replicas.

For a Standard_D4ds_v4 server (4 vCores, 16 GB RAM) with 128 GB of provisioned storage:

- Without HA: billed for 4 vCores and 128 GB of provisioned storage
- With zone-redundant HA: billed for 8 vCores and 256 GB of provisioned storage

If the doubling feels steep, consider whether your business can absorb 60+ minutes of downtime during a zone failure. For most production workloads, the answer is no, and the HA cost is justified.

## Common Issues and Troubleshooting

**HA state stuck in "ReplicatingData"**: This usually resolves on its own within 30 minutes. If it persists, check the Azure service health dashboard for regional issues.

**Frequent unplanned failovers**: This can indicate resource pressure on the primary. Check CPU and memory utilization. You might need to scale up.

**Application downtime longer than expected**: Check your DNS caching settings and connection retry logic. The database failover itself is fast, but application recovery depends on how quickly your code reconnects.

**Cannot enable HA**: Make sure you are on General Purpose or Memory Optimized tier. Burstable tier does not support HA.

## Summary

Zone-redundant HA for Azure Database for MySQL Flexible Server is a straightforward way to protect your database against zone-level failures. The setup is simple - a few clicks in the portal or a CLI flag during server creation. The real work is on the application side: retry logic, connection pooling, and DNS handling. Test your failover before you need it, and monitor the HA health metrics so you are never caught off guard.
