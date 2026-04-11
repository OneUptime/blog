# What Is MySQL Router

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, MySQL Router, InnoDB Cluster, Load Balancer, High Availability

Description: MySQL Router is a lightweight middleware that provides transparent routing between applications and MySQL servers, enabling automatic failover and read/write splitting.

---

## Overview

MySQL Router is a lightweight proxy that sits between your application and a MySQL deployment. Applications connect to MySQL Router instead of connecting directly to individual MySQL servers. Router reads the topology metadata from InnoDB Cluster, InnoDB ClusterSet, or InnoDB ReplicaSet and automatically routes connections to the appropriate server based on whether the connection is a read or write operation.

When the MySQL primary changes due to failover or switchover, Router detects the topology change through metadata updates and reroutes incoming connections to the new primary - without requiring any application-level changes.

## Key Features

- **Automatic failover routing** - detects topology changes and redirects connections to the current primary
- **Read/write splitting** - write connections go to primary, read connections distribute across replicas
- **Connection multiplexing** - multiple application connections share a smaller pool of backend connections
- **No single point of failure** - Router is stateless and can be run in multiple instances

## How MySQL Router Fits in the Architecture

```text
Application Servers
       |
   MySQL Router   (runs on app servers or dedicated hosts)
       |
  +---------+---------+
  |         |         |
Primary  Replica1  Replica2
  (RW)     (RO)     (RO)

InnoDB Cluster / ReplicaSet / ClusterSet
```

## Bootstrapping MySQL Router

Router must be bootstrapped against a MySQL InnoDB Cluster, ReplicaSet, or ClusterSet. Bootstrapping generates the router configuration automatically:

```bash
# Bootstrap against an InnoDB Cluster
mysqlrouter --bootstrap admin@cluster-primary-host:3306 \
  --user=mysqlrouter \
  --directory /etc/mysqlrouter

# Start MySQL Router
mysqlrouter --config /etc/mysqlrouter/mysqlrouter.conf
```

After bootstrapping, Router creates a configuration file and a dedicated database account for reading topology metadata.

## Default Routing Ports

```text
Port 6446  - Read/write (classic MySQL protocol) - routes to primary
Port 6447  - Read-only  (classic MySQL protocol) - routes to replicas (round-robin)
Port 6448  - Read/write (X Protocol)
Port 6449  - Read-only  (X Protocol)
```

Applications connect to these ports on the Router host instead of directly to MySQL:

```python
import mysql.connector

# Connect through Router - writes go to primary automatically
write_conn = mysql.connector.connect(
    host='router-host',
    port=6446,
    user='app_user',
    password='secret',
    database='myapp'
)

# Connect through Router - reads distribute across replicas
read_conn = mysql.connector.connect(
    host='router-host',
    port=6447,
    user='app_user',
    password='secret',
    database='myapp'
)
```

## Configuration File Structure

```ini
[DEFAULT]
logging_folder = /var/log/mysqlrouter
runtime_folder = /var/run/mysqlrouter

[metadata_cache:myCluster]
cluster_type = gr
router_id = 1
user = mysql_router1_abc123
metadata_cluster = myCluster
ttl = 0.5
auth_cache_ttl = -1

[routing:myCluster_rw]
bind_address = 0.0.0.0
bind_port = 6446
destinations = metadata-cache://myCluster/?role=PRIMARY
routing_strategy = first-available
protocol = classic

[routing:myCluster_ro]
bind_address = 0.0.0.0
bind_port = 6447
destinations = metadata-cache://myCluster/?role=SECONDARY
routing_strategy = round-robin-with-fallback
protocol = classic
```

## Monitoring Router Status

```bash
# Check Router process status
systemctl status mysqlrouter

# View Router logs
tail -f /var/log/mysqlrouter/mysqlrouter.log

# Check Router's view of cluster topology via the REST API (if enabled)
curl -k https://router-host:8443/api/20190715/routes
```

```sql
-- Check Router metadata accounts in MySQL
SELECT user, host FROM mysql.user WHERE user LIKE 'mysql_router%';
```

## High Availability for Router Itself

MySQL Router is stateless - it reads metadata from the MySQL cluster and holds no persistent state. You can run multiple Router instances in parallel. Use DNS round-robin, a load balancer, or virtual IP to distribute application connections across multiple Router instances:

```text
App --> VIP (HAProxy/keepalived) --> Router1, Router2, Router3 --> MySQL Cluster
```

## Summary

MySQL Router is a lightweight middleware proxy that routes application connections to the appropriate MySQL server based on current cluster topology. It provides automatic failover routing (applications reconnect through Router and are transparently directed to the new primary), read/write splitting across separate ports, and connection routing for InnoDB Cluster, ClusterSet, and ReplicaSet deployments. Router is bootstrapped against the cluster to generate its configuration and is typically co-located on application servers to minimize latency. Running multiple Router instances eliminates it as a single point of failure.
