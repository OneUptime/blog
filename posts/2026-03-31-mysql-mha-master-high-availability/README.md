# What Is MHA (Master High Availability) for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, MHA, High Availability, Failover, Replication, Database, Operation

Description: MHA (Master High Availability) is an open-source tool for automating MySQL master failover and slave promotion with minimal data loss and downtime.

---

## Overview

MHA (Master High Availability Manager and Tools for MySQL) is an open-source Perl-based toolkit developed by Yoshinori Matsunobu at DeNA. It automates master failover and slave promotion for MySQL replication topologies. When a master server fails, MHA identifies the most up-to-date slave, applies any missing relay logs to bring other slaves in sync, and promotes the best candidate as the new master.

MHA aims to achieve failover in 10-30 seconds with zero or minimal data loss, making it a practical choice for MySQL high availability before newer solutions like InnoDB Cluster became widely available.

## MHA Architecture

MHA consists of two main components:

- **MHA Manager**: Runs on a separate management node. Monitors the master, detects failures, and orchestrates failover. There is typically one manager per replication cluster.
- **MHA Node**: Installed on every MySQL server in the replication topology (master and all slaves). Provides helper scripts used by the manager to copy relay logs and apply missing events during failover.

```text
   ┌───────────────────┐
   │   MHA Manager     │
   │  (monitoring node)│
   └────────┬──────────┘
            │ monitors + orchestrates
   ┌────────┴──────────────────────────┐
   │                                   │
   v                                   v
┌──────────┐      replication    ┌──────────┐
│  Master  │ ──────────────────> │ Slave 1  │
└──────────┘                     └──────────┘
                                 ┌──────────┐
                                 │ Slave 2  │
                                 └──────────┘
```

## How MHA Failover Works

When the MHA Manager detects that the master is unreachable, it performs the following steps:

1. Confirms the master is truly down (SSH and MySQL checks)
2. Identifies all reachable slaves
3. Determines which slave has the most recent relay log position
4. Copies missing relay log events from the most advanced slave to lagging slaves using SSH
5. Applies the relay log diffs to bring all slaves to the same point
6. Promotes the most advanced slave as the new master
7. Points all other slaves to replicate from the new master

This relay log diffing is the key feature that minimizes data loss compared to naive failover approaches.

## Installation Overview

MHA requires Perl and several CPAN modules. On RHEL/CentOS:

```bash
# Install MHA node on all MySQL servers
yum install mha4mysql-node

# Install MHA manager on the management server
yum install mha4mysql-manager
```

SSH key-based access must be configured between the manager and all MySQL nodes, and between all MySQL nodes (for relay log copy):

```bash
# Generate SSH keys on manager
ssh-keygen -t rsa -b 4096 -N '' -f ~/.ssh/id_rsa

# Copy to all MySQL nodes
ssh-copy-id mysql-master
ssh-copy-id mysql-slave1
ssh-copy-id mysql-slave2
```

## MHA Configuration File

The manager uses a configuration file to describe the replication topology:

```ini
[server default]
manager_workdir=/var/log/mha/app1
manager_log=/var/log/mha/app1/manager.log
master_binlog_dir=/var/lib/mysql
remote_workdir=/tmp/mha
ssh_user=mha
repl_user=replicator
repl_password=securepassword
ping_interval=3
master_ip_failover_script=/usr/local/bin/master_ip_failover
shutdown_script=/usr/local/bin/power_manager

[server1]
hostname=mysql-master
candidate_master=1

[server2]
hostname=mysql-slave1
candidate_master=1

[server3]
hostname=mysql-slave2
no_master=1
```

## Checking and Starting the Manager

```bash
# Check SSH connectivity between all nodes
masterha_check_ssh --conf=/etc/mha/app1.conf

# Check replication health
masterha_check_repl --conf=/etc/mha/app1.conf

# Start the manager (runs in background, monitoring for failure)
masterha_manager --conf=/etc/mha/app1.conf \
  --remove_dead_master_conf \
  --ignore_last_failover &
```

## VIP Failover Script

MHA supports custom scripts for managing a virtual IP (VIP) during failover. The `master_ip_failover` script handles moving the VIP from the failed master to the new master:

```bash
#!/bin/bash
# Simplified VIP failover script
VIP="192.168.1.100/24"
INTERFACE="eth0"

# Parse --command argument from MHA
COMMAND=""
for arg in "$@"; do
  case "$arg" in
    --command=*) COMMAND="${arg#--command=}" ;;
  esac
done

case "$COMMAND" in
  stop|stopssh)
    ip addr del $VIP dev $INTERFACE 2>/dev/null
    ;;
  start)
    ip addr add $VIP dev $INTERFACE
    arping -c 3 -A -I $INTERFACE ${VIP%/*}
    ;;
  status)
    ip addr show dev $INTERFACE | grep -q "${VIP%/*}" && exit 0 || exit 1
    ;;
esac
```

## Limitations

MHA has several known limitations:

- **No automatic re-monitoring**: After a failover, the manager exits and must be restarted manually or via a script
- **GTID support**: Limited GTID support in older versions; newer forks address this
- **Single master**: Works only with standard master-slave topologies, not multi-master
- **Maintenance burden**: Relies on SSH and Perl, which some teams find complex to maintain

For teams running MySQL 8.0+, InnoDB Cluster with MySQL Router and Group Replication provides a more integrated alternative.

## Summary

MHA (Master High Availability) is a proven open-source tool that automates MySQL master failover by copying and applying missing relay log events across slaves before promoting a new master. It achieves fast failover with minimal data loss for traditional master-slave replication topologies. While modern MySQL deployments increasingly use InnoDB Cluster or ProxySQL-based HA, MHA remains widely deployed and is useful to understand for operations teams managing legacy MySQL infrastructure.
