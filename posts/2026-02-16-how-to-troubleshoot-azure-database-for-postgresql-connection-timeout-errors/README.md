# How to Troubleshoot Azure Database for PostgreSQL Connection Timeout Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, PostgreSQL, Database, Connection Timeout, Troubleshooting, Networking

Description: Diagnose and fix connection timeout errors when connecting to Azure Database for PostgreSQL including firewall rules, SSL settings, and connection pool issues.

---

You deploy an application that connects to Azure Database for PostgreSQL, and it times out. Or it works for a while and then starts throwing connection errors intermittently. Connection timeouts with Azure PostgreSQL are frustrating because there are many possible causes spanning networking, authentication, server configuration, and client settings.

This post walks through a systematic approach to finding and fixing the root cause.

## Understanding the Connection Path

When your application connects to Azure Database for PostgreSQL, the connection passes through several layers:

1. Application connection pool
2. Client machine or Azure service networking
3. DNS resolution
4. Azure networking (VNet, NSGs, firewall rules)
5. PostgreSQL server firewall
6. PostgreSQL authentication
7. PostgreSQL connection handling

A timeout can occur at any of these layers. Let us check each one.

## Step 1: Verify Server Availability

First, confirm the server is actually running and accessible from the Azure portal.

```bash
# Check the server status
az postgres flexible-server show \
  --resource-group my-rg \
  --name my-postgres-server \
  --query "{State:state, FullyQualifiedDomainName:fullyQualifiedDomainName, PublicAccess:network.publicNetworkAccess}" \
  --output json
```

The state should be "Ready." If it shows "Stopped" or "Starting," wait for it to become ready. If it shows "Degraded" or "Failed," check the Azure Service Health dashboard for incidents.

## Step 2: Check Firewall Rules

The most common cause of connection timeouts is missing firewall rules. Azure PostgreSQL Flexible Server blocks all connections by default.

```bash
# List current firewall rules
az postgres flexible-server firewall-rule list \
  --resource-group my-rg \
  --name my-postgres-server \
  --output table
```

### For Development/Testing

If you are connecting from a development machine, add your IP:

```bash
# Add your current IP to the firewall
MY_IP=$(curl -s https://api.ipify.org)

az postgres flexible-server firewall-rule create \
  --resource-group my-rg \
  --name my-postgres-server \
  --rule-name allow-my-ip \
  --start-ip-address "$MY_IP" \
  --end-ip-address "$MY_IP"
```

### For Azure Services

If your application runs in Azure (App Service, AKS, Functions), there are two approaches:

**Public access with Azure services allowed:**

```bash
# Allow all Azure services to connect
az postgres flexible-server firewall-rule create \
  --resource-group my-rg \
  --name my-postgres-server \
  --rule-name allow-azure-services \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

**Private access through VNet integration (recommended for production):**

When using private access, the server has a private IP address within your VNet. Your application must be in the same VNet or a peered VNet to connect.

```bash
# Check if the server uses private access
az postgres flexible-server show \
  --resource-group my-rg \
  --name my-postgres-server \
  --query "network" \
  --output json
```

## Step 3: Test Basic Connectivity

Before debugging the application, test the connection directly.

```bash
# Test TCP connectivity to the PostgreSQL port
# From your local machine or an Azure VM in the same network
nc -zv my-postgres-server.postgres.database.azure.com 5432

# Or use psql to test a full connection
psql "host=my-postgres-server.postgres.database.azure.com port=5432 dbname=postgres user=myadmin password=MyPassword123 sslmode=require" -c "SELECT 1;"
```

If `nc` succeeds (connection established) but `psql` fails, the issue is at the authentication or SSL layer, not networking.

If `nc` times out, the issue is at the network/firewall layer.

## Step 4: Check SSL/TLS Configuration

Azure PostgreSQL requires SSL by default. If your client does not support SSL or is configured incorrectly, the connection will fail.

```bash
# Check if SSL is enforced
az postgres flexible-server parameter show \
  --resource-group my-rg \
  --server-name my-postgres-server \
  --name require_secure_transport \
  --query "value" \
  --output tsv
```

If SSL is required (it should be), make sure your connection string includes the SSL parameter:

```python
# Python with psycopg2
import psycopg2

# Include sslmode in the connection string
conn = psycopg2.connect(
    host="my-postgres-server.postgres.database.azure.com",
    database="mydb",
    user="myadmin",
    password="MyPassword123",
    sslmode="require",    # This is required for Azure PostgreSQL
    connect_timeout=10     # Set a reasonable timeout
)
```

```csharp
// .NET connection string
var connectionString = "Host=my-postgres-server.postgres.database.azure.com;" +
    "Database=mydb;" +
    "Username=myadmin;" +
    "Password=MyPassword123;" +
    "SSL Mode=Require;" +
    "Trust Server Certificate=true;" +
    "Timeout=10;" +
    "Command Timeout=30;";
```

## Step 5: Check Connection Limits

Azure PostgreSQL has a maximum number of connections that depends on the server tier.

```bash
# Check the max connections setting
az postgres flexible-server parameter show \
  --resource-group my-rg \
  --server-name my-postgres-server \
  --name max_connections \
  --query "value" \
  --output tsv
```

Typical limits:

- Burstable (B1ms): 50 connections
- General Purpose (D2s_v3): 859 connections
- Memory Optimized (E2s_v3): 859 connections

If your application opens more connections than the limit, new connections are rejected. Check the current connection count:

```sql
-- Run this query on the PostgreSQL server
SELECT count(*) FROM pg_stat_activity;

-- See connection details
SELECT datname, usename, client_addr, state, query_start
FROM pg_stat_activity
ORDER BY query_start DESC;
```

### Fix: Use Connection Pooling

Connection pooling is essential for any production application connecting to Azure PostgreSQL. Without pooling, each request opens a new database connection, which is expensive.

```python
# Python with psycopg2 connection pool
from psycopg2 import pool

# Create a connection pool with min 2, max 10 connections
connection_pool = pool.ThreadedConnectionPool(
    minconn=2,
    maxconn=10,
    host="my-postgres-server.postgres.database.azure.com",
    database="mydb",
    user="myadmin",
    password="MyPassword123",
    sslmode="require"
)

# Get a connection from the pool
conn = connection_pool.getconn()
try:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users")
    results = cursor.fetchall()
finally:
    # Return the connection to the pool (do not close it)
    connection_pool.putconn(conn)
```

For even better connection management, use PgBouncer, which Azure PostgreSQL Flexible Server includes as a built-in option:

```bash
# Enable built-in PgBouncer
az postgres flexible-server parameter set \
  --resource-group my-rg \
  --server-name my-postgres-server \
  --name pgbouncer.enabled \
  --value true

# Configure PgBouncer pool mode
az postgres flexible-server parameter set \
  --resource-group my-rg \
  --server-name my-postgres-server \
  --name pgbouncer.default_pool_size \
  --value 50
```

When PgBouncer is enabled, connect to port 6432 instead of 5432.

## Step 6: Check DNS Resolution

If your application uses private access, DNS resolution must resolve the server hostname to the private IP address.

```bash
# Check DNS resolution
nslookup my-postgres-server.postgres.database.azure.com

# From inside an Azure VM or AKS pod
kubectl exec <pod-name> -- nslookup my-postgres-server.postgres.database.azure.com
```

If it resolves to a public IP when you expect a private IP, the private DNS zone is not configured correctly or not linked to your VNet.

## Step 7: Check Server Parameters

Some server parameters affect connection handling:

```bash
# Check idle connection timeout
az postgres flexible-server parameter show \
  --resource-group my-rg \
  --server-name my-postgres-server \
  --name idle_in_transaction_session_timeout \
  --query "value" \
  --output tsv

# Check statement timeout
az postgres flexible-server parameter show \
  --resource-group my-rg \
  --server-name my-postgres-server \
  --name statement_timeout \
  --query "value" \
  --output tsv
```

If `idle_in_transaction_session_timeout` is set too low, idle connections in a transaction will be terminated. If `statement_timeout` is set too low, long-running queries will be killed.

## Step 8: Check Application-Level Issues

### Connection String Errors

Verify every part of the connection string:

- Host: `my-postgres-server.postgres.database.azure.com` (not just the server name)
- Port: 5432 (or 6432 for PgBouncer)
- Database: The actual database name
- Username: For Flexible Server, it is just the username (e.g., `myadmin`), not `myadmin@servername`
- Password: Correct and not URL-encoded when it should not be

### Connection Pool Exhaustion

If your application uses a connection pool and all connections are in use, new requests wait for a connection and eventually time out.

Monitor pool utilization and increase the pool size if needed. Also check for connection leaks - code paths that get a connection but never return it to the pool.

### Retry Logic

Transient connection failures happen in cloud environments. Implement retry logic with exponential backoff.

```python
import time
import psycopg2

def connect_with_retry(max_retries=5):
    """Connect to PostgreSQL with exponential backoff retry."""
    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect(
                host="my-postgres-server.postgres.database.azure.com",
                database="mydb",
                user="myadmin",
                password="MyPassword123",
                sslmode="require",
                connect_timeout=10
            )
            return conn
        except psycopg2.OperationalError as e:
            if attempt == max_retries - 1:
                raise
            wait_time = (2 ** attempt) + 1  # Exponential backoff
            print(f"Connection failed, retrying in {wait_time}s: {e}")
            time.sleep(wait_time)
```

## Monitoring Connections

Set up Azure Monitor alerts for connection-related metrics:

```bash
# Alert when active connections approach the limit
az monitor metrics alert create \
  --resource-group monitoring-rg \
  --name postgres-connections-alert \
  --scopes "/subscriptions/<sub-id>/resourceGroups/my-rg/providers/Microsoft.DBforPostgreSQL/flexibleServers/my-postgres-server" \
  --condition "avg active_connections > 400" \
  --window-size PT5M \
  --evaluation-frequency PT1M \
  --action "/subscriptions/<sub-id>/resourceGroups/monitoring-rg/providers/Microsoft.Insights/actionGroups/ops-team"

# Alert when connection failures occur
az monitor metrics alert create \
  --resource-group monitoring-rg \
  --name postgres-failed-connections-alert \
  --scopes "/subscriptions/<sub-id>/resourceGroups/my-rg/providers/Microsoft.DBforPostgreSQL/flexibleServers/my-postgres-server" \
  --condition "total connections_failed > 10" \
  --window-size PT5M \
  --evaluation-frequency PT1M \
  --action "/subscriptions/<sub-id>/resourceGroups/monitoring-rg/providers/Microsoft.Insights/actionGroups/ops-team"
```

Connection timeouts with Azure PostgreSQL are almost always one of three things: firewall rules blocking the connection, SSL configuration mismatch, or connection pool exhaustion. Start with the firewall, test with psql, and if the direct connection works, focus on your application's connection management.
