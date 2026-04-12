# How to Monitor Redis with Checkmk

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Checkmk, Monitoring

Description: Learn how to configure Checkmk to monitor Redis instances using the built-in Redis check plugin, set thresholds, and build dashboards for Redis health and performance.

---

Checkmk is an enterprise monitoring platform that includes a built-in Redis check plugin. It auto-discovers Redis instances on monitored hosts, tracks memory usage, hit rates, connected clients, and replication status, and triggers alerts based on configurable thresholds.

## Install Checkmk

```bash
# Download Checkmk Raw Edition (free/open-source)
wget https://download.checkmk.com/checkmk/2.2.0p15/check-mk-raw-2.2.0p15_0.jammy_amd64.deb

sudo apt install ./check-mk-raw-2.2.0p15_0.jammy_amd64.deb

# Create a monitoring site
omd create mysite
omd start mysite

# Access UI at http://localhost/mysite
# Login as cmkadmin with the password shown during site creation
```

## Install Checkmk Agent on Redis Host

```bash
# Download agent from Checkmk UI or CLI
wget http://checkmk-server/mysite/check_mk/agents/check_mk_agent.linux \
  -O /usr/bin/check_mk_agent
chmod +x /usr/bin/check_mk_agent

# Install xinetd for agent communication
sudo apt install xinetd -y

# Configure xinetd
cat <<EOF | sudo tee /etc/xinetd.d/check_mk
service check_mk
{
    type           = UNLISTED
    port           = 6556
    socket_type    = stream
    protocol       = tcp
    wait           = no
    user           = root
    server         = /usr/bin/check_mk_agent
    only_from      = <checkmk-server-ip>
    disable        = no
}
EOF

sudo systemctl restart xinetd
```

## Enable the Redis Check Plugin

Checkmk includes a Redis check plugin in the agent plugins directory:

```bash
# On the monitored Redis host
ls /usr/lib/check_mk_agent/plugins/ | grep redis
# mk_redis

# Activate the plugin
chmod +x /usr/lib/check_mk_agent/plugins/mk_redis
```

The `mk_redis` plugin collects data from `redis-cli info` and passes it to the Checkmk agent.

## Discover Services in Checkmk

```bash
# In the Checkmk UI or via CLI
cmk -vI redis-server-01

# Or use the web UI:
# Setup > Hosts > Service discovery > redis-server-01 > Run discovery
```

Auto-discovered Redis checks include:

```text
Redis Memory Usage      - used_memory vs maxmemory
Redis Connected Clients - connected_clients count
Redis Keyspace          - key counts per database
Redis Replication       - slave offset, lag
Redis Uptime            - process uptime
```

## Set Thresholds via WATO (Web Admin Tool)

Navigate to: Setup > Services > Parameters for checks > Redis

```text
Redis Memory
  Warning level:  75% of maxmemory
  Critical level: 90% of maxmemory

Redis Connected Clients
  Warning level:  500
  Critical level: 900

Redis Replication Lag (seconds)
  Warning level:  5
  Critical level: 30
```

## Monitor Multiple Redis Instances

The mk_redis plugin supports multiple instances via configuration:

```bash
# /etc/check_mk/mk_redis.cfg
REDIS_INSTANCES=(
  "127.0.0.1:6379:"
  "127.0.0.1:6380:mypassword"
)
```

## Create a Checkmk Dashboard

```bash
# Via CLI - set up a view for Redis services
cmk --list-checks | grep redis

# In UI:
# Monitor > Create view > Filter: Service description contains "Redis"
```

## Configure Alert Notifications

```bash
# In UI: Setup > Events > Notifications
# Rule: Notify via email when Redis Memory enters CRITICAL state
# Contact group: oncall-team
```

```text
Notification rule:
  Triggering events:  State changes, Recoveries
  Services filter:    Redis.*
  Contact selection:  oncall-team
  Notification method: HTML Email
```

## Verify Agent Output

```bash
# Test the agent output directly on Redis host
/usr/bin/check_mk_agent | grep -A 20 "<<<redis"
```

## Summary

Checkmk auto-discovers Redis services via the mk_redis agent plugin, which collects INFO metrics and exposes them as individual check items. Set warning and critical thresholds in WATO for memory, connections, and replication lag. Checkmk's dashboard and notification system provide a complete monitoring solution for Redis with minimal configuration compared to building a custom stack.
