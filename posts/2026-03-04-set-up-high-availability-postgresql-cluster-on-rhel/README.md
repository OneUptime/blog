# How to Set Up a High-Availability PostgreSQL Cluster on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PostgreSQL, High Availability, Pacemaker, Corosync, Clustering

Description: Learn how to build a high-availability PostgreSQL cluster on RHEL using Pacemaker, Corosync, and streaming replication to ensure automatic failover and minimal downtime.

---

Running a single PostgreSQL instance in production is risky. If that server goes down, your application goes with it. A high-availability (HA) cluster solves this by automatically failing over to a standby node when the primary fails.

This guide walks through setting up a two-node PostgreSQL HA cluster on RHEL using Pacemaker and Corosync.

## Prerequisites

You need at least two RHEL 9 servers with the High Availability add-on subscription and PostgreSQL installed on both nodes.

```bash
# On both nodes, enable the HA repository

sudo subscription-manager repos --enable=rhel-9-for-x86_64-highavailability-rpms

# Install Pacemaker, Corosync, and PCS
sudo dnf install -y pcs pacemaker fence-agents-all

# Install PostgreSQL
sudo dnf install -y postgresql-server postgresql-contrib

# On the primary node, initialize PostgreSQL
sudo postgresql-setup --initdb
```

## Configure Corosync and PCS

```bash
# Set a password for the hacluster user on both nodes
sudo passwd hacluster

# Start and enable pcsd on both nodes
sudo systemctl enable --now pcsd

# If firewalld is running, allow cluster traffic on both nodes
sudo firewall-cmd --permanent --add-service=high-availability
sudo firewall-cmd --reload

# Authenticate nodes from node1
sudo pcs host auth node1 node2 -u hacluster -p yourpassword

# Create the cluster
sudo pcs cluster setup ha_postgres node1 node2

# Start the cluster
sudo pcs cluster start --all
sudo pcs cluster enable --all
```

## Set Up PostgreSQL Streaming Replication

On the primary node, configure `postgresql.conf`:

```bash
# /var/lib/pgsql/data/postgresql.conf
listen_addresses = '*'
wal_level = replica
max_wal_senders = 5
wal_keep_size = 64
```

Create a replication user and configure `pg_hba.conf`:

```bash
# Connect to PostgreSQL on the primary
sudo -u postgres psql -c "CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'replpass';"

# Add to pg_hba.conf on the primary
# host replication replicator 192.168.1.0/24 md5
```

Restart PostgreSQL on the primary, then clone the primary data directory on the standby:

```bash
# On the primary
sudo systemctl restart postgresql

# On the standby
sudo systemctl stop postgresql
sudo rm -rf /var/lib/pgsql/data/*
sudo -u postgres pg_basebackup -h node1 -U replicator \
    -D /var/lib/pgsql/data -X stream -P

# On both nodes
sudo -u postgres mkdir -p /var/lib/pgsql/pg_archive

# Stop PostgreSQL on both nodes before Pacemaker starts managing it
sudo systemctl stop postgresql
sudo systemctl disable postgresql
```

## Configure the Pacemaker Resource

```bash
# Add the PostgreSQL resource using the pgsql resource agent
sudo pcs resource create pgsql ocf:heartbeat:pgsql \
    pgctl="/usr/bin/pg_ctl" \
    psql="/usr/bin/psql" \
    pgdata="/var/lib/pgsql/data" \
    rep_mode="sync" \
    node_list="node1 node2" \
    restore_command="cp /var/lib/pgsql/pg_archive/%f %p" \
    repuser="replicator" \
    master_ip="192.168.1.100" \
    op start timeout=60s \
    op stop timeout=60s \
    op monitor interval=10s timeout=30s \
    op monitor interval=9s timeout=30s role=Promoted \
    op promote timeout=60s \
    op demote timeout=60s \
    op notify timeout=60s \
    promotable promoted-max=1 promoted-node-max=1 notify=true

# Create a virtual IP resource
sudo pcs resource create vip ocf:heartbeat:IPaddr2 \
    ip=192.168.1.100 cidr_netmask=24 \
    op monitor interval=10s

# Ensure the VIP runs on the same node as the primary
sudo pcs constraint colocation add vip with promoted pgsql-clone INFINITY
sudo pcs constraint order promote pgsql-clone then start vip
```

## Verify the Cluster

```bash
# Check cluster status
sudo pcs status

# Verify PostgreSQL replication on the primary
sudo -u postgres psql -c "SELECT * FROM pg_stat_replication;"
```

If the primary node fails, Pacemaker promotes the standby to primary and moves the virtual IP automatically. Your applications connect to the VIP address and experience only a brief interruption during failover.
