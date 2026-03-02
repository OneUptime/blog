# How to Set Up MaxScale for MySQL Proxy and Load Balancing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, MySQL, MaxScale, Database, Load Balancing

Description: Configure MariaDB MaxScale as a MySQL proxy and load balancer on Ubuntu, covering installation, routing services, read/write splitting, and high availability setup.

---

MaxScale is an open-source database proxy developed by MariaDB. It sits between your application and MySQL/MariaDB servers, providing read/write splitting, connection pooling, load balancing, and failover. For applications that have outgrown a single database server but aren't ready for full sharding, MaxScale is a practical solution that requires no application code changes.

## Architecture Overview

A typical MaxScale deployment looks like:

```
Application -> MaxScale -> Primary (writes)
                       -> Replica 1 (reads)
                       -> Replica 2 (reads)
```

MaxScale parses SQL queries, routes writes to the primary, and distributes reads across replicas. Failover can be automatic.

## Prerequisites

You need a working MySQL or MariaDB replication setup with:
- One primary server
- One or more replicas

For this guide, we'll use:
- Primary: 192.168.1.10
- Replica 1: 192.168.1.11
- Replica 2: 192.168.1.12
- MaxScale: 192.168.1.20

## Installing MaxScale on Ubuntu

```bash
# Add MariaDB repository (MaxScale is distributed by MariaDB)
curl -LsS https://r.mariadb.com/downloads/mariadb_repo_setup | sudo bash

# Install MaxScale
sudo apt update
sudo apt install maxscale -y

# Verify installation
maxscale --version

# Check the service
sudo systemctl status maxscale
```

## Creating the MaxScale Database User

MaxScale needs a user on each MySQL server to monitor replication and route queries:

```sql
-- Run on the PRIMARY MySQL server (replicates to replicas)

-- Create monitoring user
CREATE USER 'maxscale_monitor'@'192.168.1.20' IDENTIFIED BY 'MonitorPass123!';
GRANT REPLICATION CLIENT ON *.* TO 'maxscale_monitor'@'192.168.1.20';

-- Create routing user
CREATE USER 'maxscale_router'@'192.168.1.20' IDENTIFIED BY 'RouterPass123!';
GRANT SELECT ON mysql.user TO 'maxscale_router'@'192.168.1.20';
GRANT SELECT ON mysql.db TO 'maxscale_router'@'192.168.1.20';
GRANT SELECT ON mysql.tables_priv TO 'maxscale_router'@'192.168.1.20';
GRANT SELECT ON mysql.columns_priv TO 'maxscale_router'@'192.168.1.20';
GRANT SELECT ON mysql.procs_priv TO 'maxscale_router'@'192.168.1.20';
GRANT SELECT ON mysql.proxies_priv TO 'maxscale_router'@'192.168.1.20';
GRANT SHOW DATABASES ON *.* TO 'maxscale_router'@'192.168.1.20';
GRANT SELECT ON mysql.global_priv TO 'maxscale_router'@'192.168.1.20';

FLUSH PRIVILEGES;
```

## Configuring MaxScale

The main configuration file is `/etc/maxscale.cnf`:

```bash
sudo nano /etc/maxscale.cnf
```

```ini
# /etc/maxscale.cnf - MaxScale configuration

[maxscale]
threads=auto
log_info=false
log_warning=true
log_error=true
logdir=/var/log/maxscale
datadir=/var/lib/maxscale
piddir=/var/run/maxscale

##############################################
# Server definitions
##############################################

[primary]
type=server
address=192.168.1.10
port=3306
protocol=MariaDBBackend

[replica1]
type=server
address=192.168.1.11
port=3306
protocol=MariaDBBackend

[replica2]
type=server
address=192.168.1.12
port=3306
protocol=MariaDBBackend

##############################################
# Monitor - detects replication topology
##############################################

[MariaDB-Monitor]
type=monitor
module=mariadbmon
servers=primary,replica1,replica2
user=maxscale_monitor
password=MonitorPass123!
monitor_interval=2000ms
auto_failover=true
auto_rejoin=true
enforce_read_only_slaves=true

##############################################
# Router service - read/write split
##############################################

[Read-Write-Service]
type=service
router=readwritesplit
servers=primary,replica1,replica2
user=maxscale_router
password=RouterPass123!
max_slave_connections=100%
slave_selection_criteria=LEAST_CURRENT_OPERATIONS

##############################################
# Listener - where applications connect
##############################################

[Read-Write-Listener]
type=listener
service=Read-Write-Service
protocol=MariaDBClient
port=3306
address=0.0.0.0
```

## Starting MaxScale

```bash
# Validate the configuration
sudo maxscale --configtest

# Start MaxScale
sudo systemctl enable maxscale
sudo systemctl start maxscale

# Check status
sudo systemctl status maxscale

# Watch the logs
sudo tail -f /var/log/maxscale/maxscale.log
```

## Verifying the Setup

Use the MaxScale administrative interface to check server states:

```bash
# MaxScale admin CLI
sudo maxctrl list servers

# Expected output shows server roles:
# +----------+---------------+------+-------------+-----------------+
# | Server   | Address       | Port | Connections | State           |
# +----------+---------------+------+-------------+-----------------+
# | primary  | 192.168.1.10  | 3306 | 0           | Master, Running |
# | replica1 | 192.168.1.11  | 3306 | 0           | Slave, Running  |
# | replica2 | 192.168.1.12  | 3306 | 0           | Slave, Running  |
# +----------+---------------+------+-------------+-----------------+

# Show service details
sudo maxctrl show service Read-Write-Service

# List active sessions
sudo maxctrl list sessions
```

## Testing Read/Write Splitting

Connect through MaxScale and verify routing:

```bash
# Connect to MaxScale (port 3306)
mysql -h 192.168.1.20 -u appuser -p

-- Inside MySQL, check which server handled the query
-- Writes go to primary
INSERT INTO test_table (data) VALUES ('test');
SELECT @@hostname;  -- Should show primary hostname

-- Reads go to replicas
SELECT * FROM test_table;  -- May show different @@hostname

-- Force a read on primary
SET @master_read=1;
SELECT @@hostname;  -- Shows primary
```

## Connection Pooling Configuration

Add connection pooling to reduce overhead on backend servers:

```ini
[Read-Write-Service]
type=service
router=readwritesplit
servers=primary,replica1,replica2
user=maxscale_router
password=RouterPass123!

# Connection pool settings
connection_keepalive=300s
max_connections=1000
connection_timeout=10s

# Multiplex connections to backends
transaction_replay=true
transaction_replay_max_size=1Mi
```

## Adding a Read-Only Listener

Expose a separate port for read-only queries:

```ini
[Read-Only-Service]
type=service
router=readconnroute
servers=replica1,replica2
user=maxscale_router
password=RouterPass123!
router_options=slave

[Read-Only-Listener]
type=listener
service=Read-Only-Service
protocol=MariaDBClient
port=3307
address=0.0.0.0
```

Applications can send read-heavy operations to port 3307, ensuring they never hit the primary.

## Automatic Failover

MaxScale can automatically promote a replica to primary if the primary fails:

```ini
[MariaDB-Monitor]
type=monitor
module=mariadbmon
servers=primary,replica1,replica2
user=maxscale_monitor
password=MonitorPass123!
monitor_interval=2000ms

# Automatic failover settings
auto_failover=true
auto_rejoin=true
failcount=3                  # Fail this many times before acting
enforce_read_only_slaves=true
switchover_timeout=90s
```

Test failover:

```bash
# Simulate primary failure
sudo systemctl stop mysql  # On the primary server

# Watch MaxScale detect and react
sudo tail -f /var/log/maxscale/maxscale.log

# Check new topology
sudo maxctrl list servers
# replica1 or replica2 should now show as Master
```

## SSL Configuration

Secure connections between MaxScale and backend servers:

```ini
[primary]
type=server
address=192.168.1.10
port=3306
protocol=MariaDBBackend
ssl=true
ssl_ca=/etc/maxscale/ssl/ca.pem
ssl_cert=/etc/maxscale/ssl/maxscale-cert.pem
ssl_key=/etc/maxscale/ssl/maxscale-key.pem

[Read-Write-Listener]
type=listener
service=Read-Write-Service
protocol=MariaDBClient
port=3306
ssl=true
ssl_ca=/etc/maxscale/ssl/ca.pem
ssl_cert=/etc/maxscale/ssl/maxscale-cert.pem
ssl_key=/etc/maxscale/ssl/maxscale-key.pem
```

## Monitoring MaxScale

```bash
# Show MaxScale statistics
sudo maxctrl show maxscale

# Monitor current connections
sudo maxctrl list sessions

# Check filter statistics
sudo maxctrl show filters

# Show server statistics
sudo maxctrl show server primary

# Disable a server temporarily (for maintenance)
sudo maxctrl set server replica2 maintenance

# Re-enable
sudo maxctrl clear server replica2 maintenance
```

## Troubleshooting

```bash
# Increase log verbosity temporarily
sudo maxctrl alter maxscale log_info true

# Check MaxScale can reach database servers
mysql -h 192.168.1.10 -u maxscale_monitor -pMonitorPass123! -e "SHOW SLAVE STATUS\G"

# Verify user permissions
mysql -h 192.168.1.10 -u maxscale_router -pRouterPass123! -e "SHOW DATABASES;"

# Check for authentication errors in logs
sudo grep -i "error\|warning\|auth" /var/log/maxscale/maxscale.log | tail -20
```

MaxScale is a robust solution for scaling MySQL read traffic and providing high availability. The key to getting the most from it is understanding your application's read/write patterns and tuning the connection pool settings accordingly.
