# How to Set Up MySQL Group Replication on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MySQL, Group Replication, High Availability

Description: Set up MySQL Group Replication on RHEL for fault-tolerant database clustering.

---

## Overview

Set up MySQL Group Replication on RHEL for fault-tolerant database clustering. Proper database setup and management are essential for application reliability and data integrity.

## Prerequisites

- Three RHEL 9 systems with valid subscriptions or configured repositories
- Root or sudo access
- Sufficient disk space for database storage
- Hostnames that resolve correctly between all MySQL servers

## Step 1 - Install the Database Packages

Install MySQL 8.0 on each server:

```bash
sudo dnf install -y mysql-server
sudo systemctl enable --now mysqld.service
sudo mysql_secure_installation
```

Choose one server to bootstrap the group first, such as `db1.example.com`, then add the other members.

## Step 2 - Perform Initial Configuration

Edit a MySQL configuration file such as `/etc/my.cnf.d/group-replication.cnf` on each server:

```ini
[mysqld]
server_id=1
gtid_mode=ON
enforce_gtid_consistency=ON
disabled_storage_engines="MyISAM,BLACKHOLE,FEDERATED,ARCHIVE,MEMORY"

plugin_load_add='group_replication.so'
group_replication_group_name="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
group_replication_start_on_boot=OFF
group_replication_local_address="db1.example.com:33061"
group_replication_group_seeds="db1.example.com:33061,db2.example.com:33061,db3.example.com:33061"
group_replication_bootstrap_group=OFF
report_host=db1.example.com
```

Use a different `server_id`, `group_replication_local_address`, and `report_host` on each member. Generate a real group UUID with `SELECT UUID();` and use the same `group_replication_group_name` value on all members.

Restart MySQL after changing the configuration:

```bash
sudo systemctl restart mysqld.service
```

## Step 3 - Create Users and Databases

Create the distributed recovery user on each member:

```sql
SET SQL_LOG_BIN=0;
CREATE USER 'rpl_user'@'%' IDENTIFIED BY 'secure-password';
GRANT REPLICATION SLAVE ON *.* TO 'rpl_user'@'%';
GRANT CONNECTION_ADMIN ON *.* TO 'rpl_user'@'%';
GRANT BACKUP_ADMIN ON *.* TO 'rpl_user'@'%';
GRANT GROUP_REPLICATION_STREAM ON *.* TO 'rpl_user'@'%';
FLUSH PRIVILEGES;
SET SQL_LOG_BIN=1;
```

Create an application database on the primary member after the group is running:

```sql
CREATE DATABASE myappdb;
CREATE USER 'myappuser'@'%' IDENTIFIED BY 'secure-password';
GRANT ALL PRIVILEGES ON myappdb.* TO 'myappuser'@'%';
FLUSH PRIVILEGES;
```

## Step 4 - Configure Network Access

Open the MySQL client port and the Group Replication communication port on each server:

```bash
sudo firewall-cmd --permanent --add-service=mysql
sudo firewall-cmd --permanent --add-port=33061/tcp
sudo firewall-cmd --reload
```

Bootstrap the group on the first server only:

```sql
SET GLOBAL group_replication_bootstrap_group=ON;
START GROUP_REPLICATION USER='rpl_user', PASSWORD='secure-password';
SET GLOBAL group_replication_bootstrap_group=OFF;
```

Then start Group Replication on the remaining members:

```sql
START GROUP_REPLICATION USER='rpl_user', PASSWORD='secure-password';
```

## Step 5 - Verify the Setup

Connect to MySQL and confirm that each member is online:

```sql
SELECT MEMBER_HOST, MEMBER_PORT, MEMBER_STATE, MEMBER_ROLE
FROM performance_schema.replication_group_members;
```

Run a test query on the primary member:

```bash
mysql -u myappuser -p myappdb -e "SELECT VERSION();"
```

## Summary

You have learned how to set up MySQL Group Replication. Always secure your database with strong passwords, restricted network access, and regular backups.
