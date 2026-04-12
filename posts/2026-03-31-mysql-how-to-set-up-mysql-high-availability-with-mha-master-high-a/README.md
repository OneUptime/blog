# How to Set Up MySQL High Availability with MHA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, MHA, High Availability, Failover, Replication

Description: Set up MySQL Master High Availability (MHA) to automate primary failover and minimize downtime in MySQL replication topologies.

---

## What is MHA?

MHA (Master High Availability) is an open-source tool for automating MySQL primary server failover. When the primary fails, MHA identifies the most up-to-date replica, applies any missing relay log events, and promotes it to the new primary - typically in 10-30 seconds.

MHA consists of two components:
- `mha4mysql-manager` - Runs on a dedicated management server
- `mha4mysql-node` - Runs on all MySQL servers (primary and replicas)

## Architecture Overview

```text
[MHA Manager]
      |
      +-- monitors --> [Primary MySQL]
      |                      |
      +-- monitors --> [Replica 1] (candidate for promotion)
      |
      +-- monitors --> [Replica 2]
```

## Installation

Install `mha4mysql-node` on all MySQL servers:

```bash
# Install dependencies
yum install perl perl-DBD-MySQL

# Install node package
rpm -ivh mha4mysql-node-0.58-0.el7.centos.noarch.rpm
```

Install `mha4mysql-node` and `mha4mysql-manager` on the management server:

```bash
# Install dependencies (manager requires additional Perl modules)
yum install perl perl-DBD-MySQL perl-Config-Tiny perl-Log-Dispatch perl-Parallel-ForkManager

# Install node package (required on manager host as well)
rpm -ivh mha4mysql-node-0.58-0.el7.centos.noarch.rpm

# Install manager package
rpm -ivh mha4mysql-manager-0.58-0.el7.centos.noarch.rpm
```

## SSH Key Setup

MHA requires passwordless SSH between all servers. Generate and distribute SSH keys:

```bash
# On manager server
ssh-keygen -t rsa -N "" -f ~/.ssh/id_rsa

# Copy to each MySQL server
ssh-copy-id root@192.168.1.101
ssh-copy-id root@192.168.1.102
ssh-copy-id root@192.168.1.103
```

Also set up passwordless SSH between all MySQL servers:

```bash
# On each MySQL server
ssh-keygen -t rsa -N "" -f ~/.ssh/id_rsa
ssh-copy-id root@192.168.1.101
ssh-copy-id root@192.168.1.102
ssh-copy-id root@192.168.1.103
```

## MySQL Replication Setup

MHA requires standard MySQL replication. Create a replication user:

```sql
CREATE USER 'replicator'@'%' IDENTIFIED BY 'ReplPass123!';
GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'%';
```

```sql
-- On replicas (get MASTER_LOG_FILE and MASTER_LOG_POS from SHOW MASTER STATUS on the primary)
CHANGE MASTER TO
  MASTER_HOST='192.168.1.101',
  MASTER_USER='replicator',
  MASTER_PASSWORD='ReplPass123!',
  MASTER_LOG_FILE='mysql-bin.000001',
  MASTER_LOG_POS=154;

START SLAVE;
```

## MHA Manager Configuration

Create the configuration directory and file:

```bash
mkdir -p /etc/mha
```

```ini
# /etc/mha/app1.cnf
[server default]
manager_workdir=/var/log/mha/app1
manager_log=/var/log/mha/app1/manager.log
master_binlog_dir=/var/lib/mysql
user=mha_user
password=MHAPass123!
ssh_user=root
repl_user=replicator
repl_password=ReplPass123!
ping_interval=1
remote_workdir=/tmp
secondary_check_script=masterha_secondary_check -s 192.168.1.104 -s 192.168.1.105

[server1]
hostname=192.168.1.101
master_binlog_dir=/var/lib/mysql

[server2]
hostname=192.168.1.102
candidate_master=1
check_repl_delay=0

[server3]
hostname=192.168.1.103
no_master=1
```

## Creating the MHA MySQL User

```sql
CREATE USER 'mha_user'@'%' IDENTIFIED BY 'MHAPass123!';
GRANT ALL PRIVILEGES ON *.* TO 'mha_user'@'%' WITH GRANT OPTION;
```

## Verifying the Setup

```bash
# Check SSH connectivity
masterha_check_ssh --conf=/etc/mha/app1.cnf

# Check replication status
masterha_check_repl --conf=/etc/mha/app1.cnf
```

## Starting MHA Manager

```bash
# Start in daemon mode
nohup masterha_manager --conf=/etc/mha/app1.cnf \
  --remove_dead_master_conf \
  --ignore_last_failover \
  > /var/log/mha/app1/manager.log 2>&1 &

# Check status
masterha_check_status --conf=/etc/mha/app1.cnf
```

## Performing a Manual Failover

For planned maintenance, use a graceful primary switch:

```bash
masterha_master_switch --conf=/etc/mha/app1.cnf \
  --master_state=alive \
  --new_master_host=192.168.1.102 \
  --new_master_port=3306 \
  --orig_master_is_new_slave
```

## Summary

MHA automates MySQL failover by monitoring the primary server and promoting the most up-to-date replica when a failure occurs. It requires passwordless SSH between all servers, a dedicated monitoring user, and a configuration file listing all servers. The manager runs on a separate host and completes failover in under 30 seconds, making it suitable for production high-availability setups.
