# How to Configure MariaDB Galera Cluster for High Availability on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MariaDB, Galera, High Availability

Description: Configure a MariaDB Galera Cluster on RHEL 9 for synchronous multi-master replication.

---

## Overview

Configure a MariaDB Galera Cluster on RHEL 9 for synchronous multi-master replication. Proper database setup and management are essential for application reliability and data integrity.

## Prerequisites

- Three RHEL 9 systems with valid subscriptions or configured repositories
- Root or sudo access
- Sufficient disk space for database storage
- Network connectivity between all cluster nodes

## Step 1 - Install the Database Packages

```bash
sudo dnf install -y mariadb-server-galera
```

Install the package on every node. The `mariadb-server-galera` package installs the MariaDB server, Galera replication library, and Galera support files needed for the cluster.

## Step 2 - Perform Initial Configuration

Edit the Galera configuration file on every node:

```bash
sudo vi /etc/my.cnf.d/galera.cnf
```

Set the cluster address and enable the wsrep API. Use the addresses of your own nodes:

```ini
[mariadb]
wsrep_on=1
wsrep_cluster_name="mariadb_cluster"
wsrep_cluster_address="gcomm://10.0.0.10,10.0.0.11,10.0.0.12"
```

For the first node of a new cluster, you can temporarily use an empty cluster address before bootstrapping:

```ini
wsrep_cluster_address="gcomm://"
```

After the cluster is running, configure each node with the cluster member addresses so it can rejoin correctly after a restart.

## Step 3 - Create Users and Databases

Bootstrap the first node of the new cluster:

```bash
sudo galera_new_cluster
```

Then start MariaDB on the remaining nodes:

```bash
sudo systemctl start mariadb.service
sudo systemctl enable mariadb.service
```

Create users and databases after the cluster is online:

```sql
CREATE DATABASE myappdb;
CREATE USER 'myappuser'@'%' IDENTIFIED BY 'secure-password';
GRANT ALL PRIVILEGES ON myappdb.* TO 'myappuser'@'%';
FLUSH PRIVILEGES;
```

## Step 4 - Configure Network Access

If remote connections are needed, update the listen address and authentication rules, then open the firewall for MariaDB client traffic and Galera replication traffic:

```bash
sudo firewall-cmd --permanent --add-port=3306/tcp
sudo firewall-cmd --permanent --add-port=4567/tcp
sudo firewall-cmd --permanent --add-port=4567/udp
sudo firewall-cmd --permanent --add-port=4568/tcp
sudo firewall-cmd --permanent --add-port=4444/tcp
sudo firewall-cmd --reload
```

## Step 5 - Verify the Setup

Connect to MariaDB and check the Galera status variables:

```bash
mysql -u root -p -e 'SHOW STATUS LIKE "wsrep_cluster_size";'
mysql -u root -p -e 'SHOW STATUS LIKE "wsrep_cluster_status";'
mysql -u root -p -e 'SHOW STATUS LIKE "wsrep_local_state_comment";'
mysql -u root -p -e 'SHOW STATUS LIKE "wsrep_ready";'
```

## Summary

You have learned how to configure MariaDB Galera Cluster for high availability. Always secure your database with strong passwords, restricted network access, TLS for cluster traffic, and regular backups.
