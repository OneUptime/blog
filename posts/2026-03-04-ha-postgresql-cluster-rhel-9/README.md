# How to Set Up a High-Availability PostgreSQL Cluster on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PostgreSQL, High Availability, Pacemaker, Cluster, Database, Linux

Description: Learn how to set up a high-availability PostgreSQL cluster on RHEL 9 using Pacemaker for automatic failover and streaming replication.

---

A highly available PostgreSQL cluster on RHEL 9 uses Pacemaker to manage PostgreSQL instances with streaming replication. When the primary server fails, Pacemaker promotes a replica to primary and redirects the virtual IP, providing continuous database access.

## Prerequisites

- Two RHEL 9 servers with a running Pacemaker cluster
- STONITH fencing configured
- PostgreSQL installed on both nodes

## Step 1: Install PostgreSQL

On both nodes:

```bash
sudo dnf install postgresql-server postgresql -y
```

## Step 2: Initialize the Primary Database

On node1 (primary):

```bash
sudo postgresql-setup --initdb
sudo systemctl start postgresql
```

## Step 3: Configure PostgreSQL for Replication

On node1, edit the PostgreSQL configuration:

```bash
sudo -u postgres vi /var/lib/pgsql/data/postgresql.conf
```

Set these parameters:

```bash
listen_addresses = '*'
wal_level = replica
max_wal_senders = 5
wal_keep_size = 256
hot_standby = on
```

Configure authentication for replication:

```bash
sudo -u postgres vi /var/lib/pgsql/data/pg_hba.conf
```

Add:

```bash
host    replication     replicator      192.168.1.0/24          scram-sha-256
host    all             all             192.168.1.0/24          scram-sha-256
```

Create the replication user:

```bash
sudo -u postgres psql -c "CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'repl_password';"
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

## Step 4: Set Up the Replica

On node2, create a base backup from the primary:

```bash
sudo systemctl stop postgresql
sudo rm -rf /var/lib/pgsql/data/*
sudo -u postgres pg_basebackup -h node1 -U replicator -D /var/lib/pgsql/data -Fp -Xs -P -R
```

The `-R` flag creates the standby.signal file and sets up recovery configuration.

Start the replica:

```bash
sudo systemctl start postgresql
```

Verify replication on node1:

```bash
sudo -u postgres psql -c "SELECT client_addr, state FROM pg_stat_replication;"
```

## Step 5: Stop PostgreSQL (Pacemaker Will Manage It)

On both nodes:

```bash
sudo systemctl stop postgresql
sudo systemctl disable postgresql
```

## Step 6: Create Pacemaker Resources

Create the PostgreSQL resource:

```bash
sudo pcs resource create PostgreSQL ocf:heartbeat:pgsql \
    pgctl="/usr/bin/pg_ctl" \
    psql="/usr/bin/psql" \
    pgdata="/var/lib/pgsql/data" \
    rep_mode="sync" \
    node_list="node1 node2" \
    restore_command="cp /var/lib/pgsql/archive/%f %p" \
    primary_conninfo_opt="password=repl_password keepalives_idle=60 keepalives_interval=5 keepalives_count=5" \
    master_ip="192.168.1.100" \
    repuser="replicator" \
    op start timeout=60s \
    op stop timeout=60s \
    op promote timeout=60s \
    op demote timeout=60s \
    op monitor interval=15s timeout=10s role=Promoted \
    op monitor interval=30s timeout=10s role=Unpromoted

sudo pcs resource promotable PostgreSQL \
    promoted-max=1 promoted-node-max=1 \
    clone-max=2 clone-node-max=1 \
    notify=true
```

Create a virtual IP:

```bash
sudo pcs resource create PgVIP ocf:heartbeat:IPaddr2 \
    ip=192.168.1.100 cidr_netmask=24 \
    op monitor interval=30s
```

## Step 7: Configure Constraints

The VIP must run on the promoted (primary) node:

```bash
sudo pcs constraint colocation add PgVIP with Promoted PostgreSQL-clone INFINITY
sudo pcs constraint order promote PostgreSQL-clone then start PgVIP symmetrical=false
sudo pcs constraint order demote PostgreSQL-clone then stop PgVIP symmetrical=false
```

## Step 8: Verify the Setup

```bash
sudo pcs status
```

Connect to the database through the VIP:

```bash
psql -h 192.168.1.100 -U postgres -c "SELECT pg_is_in_recovery();"
```

Should return `f` (false), indicating the primary.

## Step 9: Test Failover

Put the primary node in standby:

```bash
sudo pcs node standby node1
```

Verify PostgreSQL promoted on node2:

```bash
sudo pcs status
psql -h 192.168.1.100 -U postgres -c "SELECT pg_is_in_recovery();"
```

Should return `f` (false) on node2.

Bring node1 back:

```bash
sudo pcs node unstandby node1
```

## Conclusion

A high-availability PostgreSQL cluster on RHEL 9 with Pacemaker provides automatic failover with minimal downtime. Streaming replication keeps the replica up to date, and Pacemaker handles promotion and VIP management. Test failover regularly to ensure reliability.
