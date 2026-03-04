# How to Set Up Redis Replication with Sentinel on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Redis, Sentinel, Replication, High Availability

Description: Learn how to set up Redis master-replica replication with Sentinel on RHEL for automatic failover and high availability.

---

Redis Sentinel provides high availability by monitoring Redis instances and performing automatic failover when the master becomes unavailable. A typical setup includes one master, two replicas, and three Sentinel instances.

## Architecture

- **redis-master** (192.168.1.101:6379)
- **redis-replica1** (192.168.1.102:6379)
- **redis-replica2** (192.168.1.103:6379)
- **sentinel** instances on all three nodes (port 26379)

## Configuring the Master

```conf
# /etc/redis/redis.conf on 192.168.1.101
bind 0.0.0.0
port 6379
requirepass master-password
masterauth master-password
```

## Configuring the Replicas

```conf
# /etc/redis/redis.conf on 192.168.1.102 and 192.168.1.103
bind 0.0.0.0
port 6379
requirepass master-password
masterauth master-password

# Set this node as a replica of the master
replicaof 192.168.1.101 6379
```

```bash
# Start Redis on all nodes
sudo systemctl enable --now redis
```

## Verifying Replication

```bash
# On the master
redis-cli -a master-password INFO replication
# Should show: role:master, connected_slaves:2

# On a replica
redis-cli -a master-password INFO replication
# Should show: role:slave, master_host:192.168.1.101
```

## Configuring Sentinel

Create the Sentinel configuration on all three nodes:

```conf
# /etc/redis/sentinel.conf
port 26379
daemonize yes
logfile /var/log/redis/sentinel.log
dir /tmp

# Monitor the master; 2 = quorum (number of Sentinels that must agree)
sentinel monitor mymaster 192.168.1.101 6379 2

# Authentication
sentinel auth-pass mymaster master-password

# Failover timing
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1
```

## Creating a Sentinel systemd Service

```bash
cat << 'SERVICE' | sudo tee /etc/systemd/system/redis-sentinel.service
[Unit]
Description=Redis Sentinel
After=network.target redis.service

[Service]
ExecStart=/usr/bin/redis-sentinel /etc/redis/sentinel.conf
Restart=always
User=redis

[Install]
WantedBy=multi-user.target
SERVICE

# Start Sentinel on all three nodes
sudo systemctl daemon-reload
sudo systemctl enable --now redis-sentinel
```

## Verifying Sentinel

```bash
# Check Sentinel status
redis-cli -p 26379 SENTINEL master mymaster
redis-cli -p 26379 SENTINEL replicas mymaster
redis-cli -p 26379 SENTINEL sentinels mymaster
```

## Firewall Configuration

```bash
# On all nodes
sudo firewall-cmd --add-port=6379/tcp --permanent
sudo firewall-cmd --add-port=26379/tcp --permanent
sudo firewall-cmd --reload
```

## Testing Failover

```bash
# Stop the master to trigger failover
sudo systemctl stop redis

# Watch Sentinel logs
tail -f /var/log/redis/sentinel.log

# Check which node is the new master
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
```

The quorum value (2 in this setup) means at least 2 Sentinels must agree that the master is down before triggering failover. Always use an odd number of Sentinel instances (3 or 5) for reliable consensus.
