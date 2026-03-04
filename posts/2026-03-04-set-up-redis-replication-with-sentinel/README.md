# How to Set Up Redis Replication with Sentinel on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Redis, Caching, High Availability, Linux

Description: Learn how to set Up Redis Replication with Sentinel on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

Redis Sentinel provides high availability for Redis by monitoring master instances, automatically failing over to replicas when the master goes down, and notifying clients of topology changes.

## Prerequisites

- Three RHEL 9 servers (one master, two replicas, three sentinels)
- Redis installed on all nodes

## Step 1: Configure the Master

```bash
sudo vi /etc/redis/redis.conf
```

```ini
bind 0.0.0.0
port 6379
requirepass master_password
masterauth master_password
```

## Step 2: Configure Replicas

On each replica server:

```ini
bind 0.0.0.0
port 6379
requirepass master_password
masterauth master_password
replicaof 10.0.1.10 6379
```

## Step 3: Start Redis on All Nodes

```bash
sudo systemctl enable --now redis
```

## Step 4: Verify Replication

On the master:

```bash
redis-cli -a master_password INFO replication
```

You should see `connected_slaves:2`.

## Step 5: Configure Sentinel

Create sentinel configuration on each node:

```bash
sudo vi /etc/redis/sentinel.conf
```

```ini
port 26379
sentinel monitor mymaster 10.0.1.10 6379 2
sentinel auth-pass mymaster master_password
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1
```

The `2` means two sentinels must agree that the master is down before failover.

## Step 6: Start Sentinel

```bash
sudo redis-sentinel /etc/redis/sentinel.conf &
```

Or create a systemd service for sentinel.

## Step 7: Test Failover

Stop the master:

```bash
sudo systemctl stop redis
```

Watch sentinel logs:

```bash
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
```

One of the replicas should be promoted to master.

## Step 8: Client Connection

Clients should connect through Sentinel to discover the current master:

```python
from redis.sentinel import Sentinel

sentinel = Sentinel([
    ('10.0.1.10', 26379),
    ('10.0.1.11', 26379),
    ('10.0.1.12', 26379)
], socket_timeout=0.5)

master = sentinel.master_for('mymaster', password='master_password')
master.set('key', 'value')
```

## Conclusion

Redis Sentinel on RHEL 9 provides automatic failover and high availability for Redis deployments. With three sentinel instances monitoring the master, the system can tolerate one sentinel failure while still achieving consensus for failover decisions.
