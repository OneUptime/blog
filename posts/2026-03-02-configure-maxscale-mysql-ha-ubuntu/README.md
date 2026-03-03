# How to Configure MaxScale for MySQL HA on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, MaxScale, MySQL, High Availability, MariaDB

Description: Configure MariaDB MaxScale on Ubuntu to provide MySQL high availability with automatic failover, read/write splitting, and connection routing for MySQL and MariaDB clusters.

---

MaxScale is a database proxy and connection router developed by MariaDB. It sits between your application and MySQL/MariaDB servers, providing read/write splitting, load balancing, automatic failover, and connection pooling. When a primary database server fails, MaxScale detects the failure and routes traffic to a promoted replica - often within seconds, without any application changes.

This guide covers installing MaxScale on Ubuntu and configuring it for a typical primary-replica setup with read/write splitting.

## Architecture

A MaxScale deployment looks like:

```text
Applications -> MaxScale -> Primary (writes)
                        \-> Replica 1 (reads)
                         -> Replica 2 (reads)
```

MaxScale monitors all database servers continuously, detects failures, and adjusts routing automatically. Applications connect to MaxScale on standard MySQL ports - they don't need to know about the underlying topology.

## Prerequisites

- Ubuntu 20.04 or newer
- A MySQL or MariaDB primary-replica replication setup
- At least one primary server and one or more replicas
- A MaxScale monitoring user on the databases

This guide assumes:
- Primary: `192.168.1.10:3306`
- Replica 1: `192.168.1.11:3306`
- Replica 2: `192.168.1.12:3306`

## Installing MaxScale

Add the MariaDB repository (MaxScale is distributed by MariaDB):

```bash
# Download and add the MariaDB repository key
curl -sS https://downloads.mariadb.com/MariaDB/mariadb_repo_setup | \
    sudo bash

# Install MaxScale
sudo apt update
sudo apt install maxscale

# Verify
maxscale --version
```

## Creating the Monitoring User

MaxScale needs a database user to monitor server health. Run these on the **primary** database (replicated to replicas automatically):

```sql
-- Connect to primary MySQL/MariaDB
-- Create the MaxScale monitoring user
CREATE USER 'maxscale_monitor'@'192.168.1.100' IDENTIFIED BY 'strong-monitor-password';
GRANT REPLICATION CLIENT, REPLICATION SLAVE ON *.* TO 'maxscale_monitor'@'192.168.1.100';

-- Create the MaxScale routing user (used for connection authentication)
CREATE USER 'maxscale_router'@'192.168.1.100' IDENTIFIED BY 'strong-router-password';
GRANT SELECT ON mysql.user TO 'maxscale_router'@'192.168.1.100';
GRANT SELECT ON mysql.db TO 'maxscale_router'@'192.168.1.100';
GRANT SELECT ON mysql.tables_priv TO 'maxscale_router'@'192.168.1.100';
GRANT SELECT ON mysql.columns_priv TO 'maxscale_router'@'192.168.1.100';
GRANT SELECT ON mysql.proxies_priv TO 'maxscale_router'@'192.168.1.100';
GRANT SHOW DATABASES ON *.* TO 'maxscale_router'@'192.168.1.100';

FLUSH PRIVILEGES;
```

Replace `192.168.1.100` with the IP address of your MaxScale server.

## Configuring MaxScale

The main configuration file is `/etc/maxscale.cnf`:

```bash
sudo nano /etc/maxscale.cnf
```

```ini
# /etc/maxscale.cnf
# MaxScale configuration for MySQL primary-replica HA

[maxscale]
# Number of MaxScale worker threads
threads = auto
# Log file location
logdir = /var/log/maxscale/
# Data directory for MaxScale state
datadir = /var/lib/maxscale/
# PID file location
piddir = /var/run/maxscale/

# Admin interface for management
[MaxAdmin]
type = service
router = cli

[MaxAdmin Listener]
type = listener
service = MaxAdmin
protocol = maxscaled
socket = default


## Database Server Definitions

[primary-server]
type = server
address = 192.168.1.10
port = 3306
protocol = MariaDBBackend

[replica-1]
type = server
address = 192.168.1.11
port = 3306
protocol = MariaDBBackend

[replica-2]
type = server
address = 192.168.1.12
port = 3306
protocol = MariaDBBackend


## Monitor: Tracks server health and replication topology

[MariaDB-Monitor]
type = monitor
module = mariadbmon
servers = primary-server, replica-1, replica-2
user = maxscale_monitor
password = strong-monitor-password

# Check servers every 2 seconds
monitor_interval = 2000ms

# Automatic failover settings
auto_failover = true
auto_rejoin = true
failcount = 3  # Fail 3 consecutive checks before marking as down

# Replication settings for failover
replication_user = replicator
replication_password = replication-password


## Read/Write Splitting Service

[ReadWrite-Service]
type = service
router = readwritesplit
servers = primary-server, replica-1, replica-2
user = maxscale_router
password = strong-router-password

# Send reads to replicas, writes to primary
use_sql_variables_in = master

# If all replicas are down, allow reads from primary
master_failure_mode = error_on_write

# Connection pool settings
connection_keepalive = 300s
max_slave_connections = 100%

# Retry failed transactions on failover
transaction_replay = true
transaction_replay_max_size = 1Mi


## Read Connection Load Balancer (optional - for pure read workloads)

[Read-Service]
type = service
router = readconnroute
servers = replica-1, replica-2
user = maxscale_router
password = strong-router-password
router_options = slave


## Listeners: Ports that applications connect to

[ReadWrite-Listener]
type = listener
service = ReadWrite-Service
protocol = MariaDBClient
port = 3306  # Applications connect here for read/write splitting

[Read-Listener]
type = listener
service = Read-Service
protocol = MariaDBClient
port = 3307  # Applications connect here for read-only queries
```

## Starting MaxScale

```bash
# Start and enable MaxScale
sudo systemctl enable --now maxscale

# Check status
sudo systemctl status maxscale

# Verify MaxScale started correctly
sudo maxctrl list servers
```

Expected output:

```text
┌──────────────────┬──────────────┬──────┬─────────────┬────────────────┬───────────┐
│ Server           │ Address      │ Port │ Connections │ State          │ GTID      │
├──────────────────┼──────────────┼──────┼─────────────┼────────────────┼───────────┤
│ primary-server   │ 192.168.1.10 │ 3306 │ 0           │ Master, Running│ 0-1-12345 │
│ replica-1        │ 192.168.1.11 │ 3306 │ 0           │ Slave, Running │ 0-1-12345 │
│ replica-2        │ 192.168.1.12 │ 3306 │ 0           │ Slave, Running │ 0-1-12345 │
└──────────────────┴──────────────┴──────┴─────────────┴────────────────┴───────────┘
```

## Testing the Configuration

### Connect Through MaxScale

```bash
# Connect as an application user through MaxScale
mysql -h 127.0.0.1 -P 3306 -u appuser -p

# Verify you hit the primary for writes
SELECT @@hostname;
INSERT INTO test (val) VALUES ('write test');

# For the read port, you should hit replicas
mysql -h 127.0.0.1 -P 3307 -u appuser -p
SELECT @@hostname;  # Should show a replica hostname
```

### Test Read/Write Splitting

```bash
# Connect to port 3306 and check where queries land
mysql -h 127.0.0.1 -P 3306 -u appuser -p -e "SELECT @@hostname"

# Write goes to primary
mysql -h 127.0.0.1 -P 3306 -u appuser -p -e "UPDATE test SET val='test'"

# Check MaxScale statistics
sudo maxctrl show service ReadWrite-Service
```

## Managing MaxScale with maxctrl

`maxctrl` is the command-line management tool:

```bash
# List all servers and their states
sudo maxctrl list servers

# List all services
sudo maxctrl list services

# List all monitors
sudo maxctrl list monitors

# Show detailed service info
sudo maxctrl show service ReadWrite-Service

# Show connection counts
sudo maxctrl show server primary-server

# Drain a server (stop new connections, let existing finish)
sudo maxctrl drain server replica-1

# Set a server to maintenance mode
sudo maxctrl set server primary-server maintenance

# Clear maintenance mode
sudo maxctrl clear server primary-server maintenance
```

## Simulating Failover

Test automatic failover by stopping the primary:

```bash
# On the primary database server
sudo systemctl stop mysql

# On the MaxScale server, watch the monitor
sudo maxctrl list servers
```

MaxScale should detect the failure within `failcount * monitor_interval` seconds (6 seconds with the above config) and promote a replica to primary.

Watch it happen:

```bash
watch -n 1 "sudo maxctrl list servers"
```

After failover:
- One replica is promoted to Master status
- MaxScale starts routing writes to the promoted server
- Applications reconnect to the new primary transparently

## Configuring MaxScale REST API

The REST API is useful for monitoring and automation:

```bash
sudo nano /etc/maxscale.cnf
```

Add:

```ini
[REST API]
type = listener
service = MaxAdmin
protocol = HTTPD
port = 8989
```

Or configure via the newer `[maxscale]` section:

```ini
[maxscale]
threads = auto
admin_host = 127.0.0.1
admin_port = 8989
admin_secure_gui = false
```

Query the API:

```bash
# Get server status
curl -u admin:mariadb http://localhost:8989/v1/servers | python3 -m json.tool

# Get service statistics
curl -u admin:mariadb http://localhost:8989/v1/services/ReadWrite-Service
```

## Logging and Troubleshooting

```bash
# View MaxScale logs
sudo tail -f /var/log/maxscale/maxscale.log

# Enable debug logging (temporarily)
sudo maxctrl alter maxscale log_debug true

# Disable after troubleshooting
sudo maxctrl alter maxscale log_debug false

# Check for configuration errors
sudo maxscale --config-check /etc/maxscale.cnf
```

Common issues:

**"Access denied" for monitor user:**
Verify the monitoring user has the right privileges and the host matches the MaxScale server IP.

**Servers in "Down" state:**
Check network connectivity and verify MySQL is running on the backend servers:

```bash
mysql -h 192.168.1.10 -u maxscale_monitor -p -e "SHOW SLAVE HOSTS"
```

**Failover not triggering:**
Check that `auto_failover = true` is set and `failcount` is appropriate for your monitoring interval.

## Summary

MaxScale provides transparent MySQL high availability for Ubuntu-based database environments. The read/write splitting reduces load on the primary server, automatic failover minimizes downtime during failures, and the proxy layer means applications connect to a single endpoint without needing to know the underlying topology. For teams running MySQL or MariaDB replication, MaxScale is one of the more practical tools for adding HA without application-level changes.
