# How to Configure a Highly Available MariaDB/PostgreSQL Database with Pacemaker on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MariaDB, PostgreSQL, Database, High Availability, Pacemaker, Cluster, Linux

Description: Learn how to configure a highly available database using either MariaDB or PostgreSQL with Pacemaker on RHEL 9 for automatic failover.

---

A highly available database on RHEL 9 uses Pacemaker to manage the database service, shared storage or replication, and a virtual IP. This guide covers both MariaDB and PostgreSQL configurations for active-passive HA with automatic failover.

## Prerequisites

- Two RHEL 9 servers with a running Pacemaker cluster
- STONITH fencing configured
- Shared storage (for active-passive) or replication configured

## Option A: MariaDB with Shared Storage

### Step 1: Install MariaDB

On both nodes:

```bash
sudo dnf install mariadb-server -y
```

### Step 2: Configure Shared Storage

The database directory must be on shared storage. Do not start MariaDB yet.

### Step 3: Create Pacemaker Resources

```bash
# Virtual IP
sudo pcs resource create DB-VIP ocf:heartbeat:IPaddr2 \
    ip=192.168.1.100 cidr_netmask=24 \
    op monitor interval=30s

# Shared filesystem
sudo pcs resource create DB-FS ocf:heartbeat:Filesystem \
    device=/dev/sdb1 directory=/var/lib/mysql fstype=xfs \
    op monitor interval=20s

# MariaDB service
sudo pcs resource create MariaDB ocf:heartbeat:mysql \
    binary="/usr/bin/mysqld_safe" \
    config="/etc/my.cnf" \
    datadir="/var/lib/mysql" \
    pid="/var/run/mariadb/mariadb.pid" \
    socket="/var/lib/mysql/mysql.sock" \
    op monitor interval=30s timeout=30s \
    op start timeout=120s \
    op stop timeout=120s

# Group resources
sudo pcs resource group add DB-Group DB-VIP DB-FS MariaDB
```

### Step 4: Initialize the Database

Start the group and initialize:

```bash
sudo pcs resource enable DB-Group
```

On the active node:

```bash
mysql_secure_installation
```

## Option B: PostgreSQL with Streaming Replication

### Step 1: Install PostgreSQL

On both nodes:

```bash
sudo dnf install postgresql-server postgresql -y
```

### Step 2: Set Up Replication

Initialize the primary on node1:

```bash
sudo postgresql-setup --initdb
sudo systemctl start postgresql
```

Configure for replication (see the PostgreSQL HA guide for detailed steps).

### Step 3: Create Pacemaker Resources

```bash
# Virtual IP
sudo pcs resource create PG-VIP ocf:heartbeat:IPaddr2 \
    ip=192.168.1.100 cidr_netmask=24 \
    op monitor interval=30s

# PostgreSQL as a promotable resource
sudo pcs resource create PostgreSQL ocf:heartbeat:pgsql \
    pgctl="/usr/bin/pg_ctl" \
    psql="/usr/bin/psql" \
    pgdata="/var/lib/pgsql/data" \
    rep_mode="sync" \
    node_list="node1 node2" \
    repuser="replicator" \
    op monitor interval=15s role=Promoted \
    op monitor interval=30s role=Unpromoted

sudo pcs resource promotable PostgreSQL \
    promoted-max=1 promoted-node-max=1 \
    clone-max=2 clone-node-max=1 \
    notify=true

# Constraints
sudo pcs constraint colocation add PG-VIP with Promoted PostgreSQL-clone INFINITY
sudo pcs constraint order promote PostgreSQL-clone then start PG-VIP
```

## Verifying the Setup

For both options:

```bash
sudo pcs status
```

Test database connectivity through the VIP:

```bash
# MariaDB
mysql -h 192.168.1.100 -u root -p -e "SELECT 1;"

# PostgreSQL
psql -h 192.168.1.100 -U postgres -c "SELECT 1;"
```

## Testing Failover

Put the active node in standby:

```bash
sudo pcs node standby node1
```

Verify:

```bash
sudo pcs status

# Test database access
mysql -h 192.168.1.100 -u root -p -e "SELECT 1;"
# or
psql -h 192.168.1.100 -U postgres -c "SELECT 1;"
```

Bring the node back:

```bash
sudo pcs node unstandby node1
```

## Configuring Application Reconnection

Applications should handle brief disconnections during failover. Configure connection settings:

### For MariaDB/MySQL Clients

```
connect_timeout=10
reconnect=true
```

### For PostgreSQL Clients

Use a connection string with multiple hosts:

```
postgresql://192.168.1.100:5432/mydb?connect_timeout=10&target_session_attrs=read-write
```

## Monitoring Database Health

Set up monitoring operations:

```bash
# MariaDB - check with a query
sudo pcs resource update MariaDB op monitor interval=30s timeout=30s OCF_CHECK_LEVEL=1

# PostgreSQL - check replication status
sudo pcs resource update PostgreSQL op monitor interval=15s timeout=10s role=Promoted
```

## Conclusion

Both MariaDB and PostgreSQL can be made highly available on RHEL 9 with Pacemaker. Use shared storage with MariaDB for simple active-passive setups, or streaming replication with PostgreSQL for zero-data-loss failover. Test failover regularly and configure applications for reconnection.
