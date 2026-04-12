# How to Configure MySQL Router for InnoDB Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, MySQL Router, InnoDB Cluster, High Availability

Description: Learn how to bootstrap and configure MySQL Router to provide transparent routing and automatic failover for a MySQL InnoDB Cluster.

---

## What Is MySQL Router

MySQL Router is a lightweight middleware that sits between your application and the InnoDB Cluster. It:

- Routes read/write queries to the primary automatically
- Distributes read-only queries across replicas
- Detects failover and updates routing within seconds
- Requires no application code changes

## Installing MySQL Router

On Debian/Ubuntu:

```bash
sudo apt-get install mysql-router
```

On RHEL/CentOS:

```bash
sudo yum install mysql-router
```

## Bootstrapping Router Against the Cluster

Bootstrap is the recommended way to configure Router. It queries the cluster metadata and generates the configuration automatically.

```bash
sudo mysqlrouter --bootstrap clusteradmin@node1:3306 \
  --directory /etc/mysqlrouter/myapp \
  --user=mysqlrouter \
  --conf-use-sockets
```

Enter the `clusteradmin` password when prompted. Router will create:

- `mysqlrouter.conf` - main configuration
- `start.sh` / `stop.sh` - helper scripts
- Socket files if `--conf-use-sockets` is set

## Understanding the Generated Configuration

```ini
# /etc/mysqlrouter/myapp/mysqlrouter.conf
[DEFAULT]
user=mysqlrouter
logging_folder=/var/log/mysqlrouter
runtime_folder=/var/run/mysqlrouter
data_folder=/var/lib/mysqlrouter

[routing:myCluster_rw]
bind_address=0.0.0.0
bind_port=6446
destinations=metadata-cache://myCluster/?role=PRIMARY
routing_strategy=first-available
protocol=classic

[routing:myCluster_ro]
bind_address=0.0.0.0
bind_port=6447
destinations=metadata-cache://myCluster/?role=SECONDARY
routing_strategy=round-robin-with-fallback
protocol=classic
```

Key ports:
- `6446` - read/write (primary only)
- `6447` - read-only (secondaries, round-robin)
- `6448` - read/write with X Protocol
- `6449` - read-only with X Protocol

## Starting MySQL Router

```bash
# Start using the bootstrap directory
/etc/mysqlrouter/myapp/start.sh

# Or as a system service
sudo systemctl start mysqlrouter
sudo systemctl enable mysqlrouter
```

## Connecting Applications Through Router

Update your application's connection string to point to Router instead of the primary directly:

```python
import mysql.connector

conn = mysql.connector.connect(
    host='router-host',
    port=6446,          # use 6447 for read-only
    user='appuser',
    password='apppass',
    database='production'
)
```

## Checking Router Status

```bash
# View Router logs
tail -f /var/log/mysqlrouter/mysqlrouter.log

# Check listening ports
ss -tlnp | grep mysqlrouter
```

In the logs, look for topology updates:

```text
[INFO] Updating cluster topology
[INFO] Primary: node1:3306
[INFO] Secondaries: node2:3306, node3:3306
```

## Re-Bootstrapping After Cluster Changes

MySQL Router automatically detects topology changes (such as added or removed nodes) through its metadata cache, so re-bootstrapping is not needed for routine cluster membership changes. Re-bootstrap when the Router configuration itself needs to change, such as after a cluster name change, credential rotation, or metadata server update:

```bash
sudo mysqlrouter --bootstrap clusteradmin@node1:3306 \
  --directory /etc/mysqlrouter/myapp \
  --user=mysqlrouter \
  --force
```

## Summary

MySQL Router is bootstrapped against the cluster using `--bootstrap`, which auto-generates routing configuration for read/write (port 6446) and read-only (port 6447) traffic. Applications connect to Router ports instead of MySQL nodes directly, gaining transparent failover without code changes.
