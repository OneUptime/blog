# How to Set Up HA MariaDB/PostgreSQL with Pacemaker on RHEL 9

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

The database directory must be on shared storage. Mount it on one node and initialize it once:

```bash
sudo mariadb-install-db --user=mysql --datadir=/var/lib/mysql
```

Then unmount it before Pacemaker manages the filesystem resource. Do not start MariaDB outside the cluster after this point.

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
sudo pcs resource group add DB-Group DB-FS MariaDB DB-VIP
```

### Step 4: Start and Secure the Database

Start the group:

```bash
sudo pcs resource enable DB-Group
```

On the active node:

```bash
mariadb-secure-installation
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

Configure for replication (see the PostgreSQL HA guide for detailed steps), verify replication, and then stop PostgreSQL on all nodes before Pacemaker starts managing it:

```bash
sudo systemctl stop postgresql
```

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
    master_ip="192.168.1.100" \
    repuser="replicator" \
    restore_command='cp /var/lib/pgsql/pg_archive/%f "%p"' \
    restart_on_promote=true \
    op monitor interval=15s role=Promoted \
    op monitor interval=30s role=Unpromoted

sudo pcs resource promotable PostgreSQL \
    promoted-max=1 promoted-node-max=1 \
    clone-max=2 clone-node-max=1 \
    notify=true

# Constraints
sudo pcs constraint colocation add PG-VIP with Promoted PostgreSQL-clone INFINITY
sudo pcs constraint order promote PostgreSQL-clone then start PG-VIP symmetrical=false score=INFINITY
sudo pcs constraint order demote PostgreSQL-clone then stop PG-VIP symmetrical=false score=0
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

```bash
connect_timeout=10
reconnect=true
```

### For PostgreSQL Clients

Use a connection string that targets the VIP:

```bash
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

Both MariaDB and PostgreSQL can be made highly available on RHEL 9 with Pacemaker. Use shared storage with MariaDB for simple active-passive setups, or synchronous streaming replication with PostgreSQL to minimize data loss when fencing and replication are configured correctly. Test failover regularly and configure applications for reconnection.
