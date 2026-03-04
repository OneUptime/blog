# How to Configure a Highly Available MariaDB/PostgreSQL Database with Pacemaker on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Pacemaker, MariaDB, PostgreSQL, High Availability, Database, Corosync

Description: Use Pacemaker to manage MariaDB or PostgreSQL as a cluster resource on RHEL, providing automatic failover and a virtual IP for uninterrupted database access.

---

Pacemaker can manage database services as cluster resources. When the node running your database fails, Pacemaker starts the database on another node and moves the virtual IP, keeping your application connected.

This guide shows both MariaDB and PostgreSQL configurations.

## Cluster Prerequisites

Ensure you have a working two-node Pacemaker/Corosync cluster with fencing configured.

```bash
# Verify cluster is healthy
sudo pcs status

# Confirm fencing is active
sudo pcs property show stonith-enabled
# Should return: stonith-enabled: true
```

## Option A: MariaDB with Pacemaker

```bash
# Install MariaDB on both nodes
sudo dnf install -y mariadb-server

# Initialize MariaDB on both nodes
sudo mysql_install_db --user=mysql

# Do NOT enable MariaDB with systemd -- Pacemaker manages it
# sudo systemctl disable mariadb

# Create the MariaDB resource
sudo pcs resource create mariadb_svc ocf:heartbeat:mysql \
    binary="/usr/bin/mysqld_safe" \
    config="/etc/my.cnf" \
    datadir="/var/lib/mysql" \
    pid="/var/run/mariadb/mariadb.pid" \
    op start timeout=120s \
    op stop timeout=120s \
    op monitor interval=20s timeout=30s

# Create a VIP for database connections
sudo pcs resource create db_vip ocf:heartbeat:IPaddr2 \
    ip=192.168.1.200 cidr_netmask=24 \
    op monitor interval=10s

# Group the resources so they run on the same node
sudo pcs resource group add db_group mariadb_svc db_vip
```

## Option B: PostgreSQL with Pacemaker

```bash
# Install PostgreSQL on both nodes
sudo dnf install -y postgresql-server

# Initialize the database on both nodes
sudo postgresql-setup --initdb

# Do NOT enable PostgreSQL with systemd
# sudo systemctl disable postgresql

# Create the PostgreSQL resource
sudo pcs resource create pgsql_svc ocf:heartbeat:pgsql \
    pgctl="/usr/bin/pg_ctl" \
    pgdata="/var/lib/pgsql/data" \
    op start timeout=120s \
    op stop timeout=120s \
    op monitor interval=20s timeout=30s

# Create a VIP
sudo pcs resource create db_vip ocf:heartbeat:IPaddr2 \
    ip=192.168.1.200 cidr_netmask=24 \
    op monitor interval=10s

# Group them together
sudo pcs resource group add db_group pgsql_svc db_vip
```

## Shared Storage with GFS2 or DRBD

For active-passive setups, you need the database data directory on shared storage. Options include:

```bash
# If using DRBD, ensure only one node mounts at a time
# Pacemaker handles this with resource ordering

# If using shared SAN/NAS, mount it as a Filesystem resource
sudo pcs resource create db_fs ocf:heartbeat:Filesystem \
    device="/dev/sdb1" \
    directory="/var/lib/pgsql/data" \
    fstype="xfs" \
    op monitor interval=20s

# Add it to the group before the database resource
sudo pcs resource group add db_group db_fs pgsql_svc db_vip
```

## Verify Failover

```bash
# Check current resource locations
sudo pcs status

# Simulate failover
sudo pcs resource move db_group node2

# Clear the constraint after testing
sudo pcs resource clear db_group
```

Your applications should point to the VIP address. During failover, there will be a brief connection drop while Pacemaker starts the database on the other node, but no manual intervention is needed.
