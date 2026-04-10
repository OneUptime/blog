# How to Create a Redis Runbook for Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Runbook, Operation

Description: Learn how to create a comprehensive Redis operations runbook with procedures for common tasks, incident response, and maintenance that any engineer can follow.

---

A Redis runbook is a collection of documented procedures that enable any engineer on your team to operate and troubleshoot Redis confidently. This guide provides a template and key sections every runbook should contain.

## Runbook Structure

```text
redis-runbook/
  01-overview.md          - Architecture, connections, responsibilities
  02-daily-checks.md      - Health check commands
  03-common-tasks.md      - Restart, backup, flush procedures
  04-incident-response.md - Alerts and how to respond
  05-scaling.md           - Adding capacity, resharding
  06-disaster-recovery.md - Restore procedures
```

## Daily Health Check Procedure

```bash
#!/bin/bash
# daily-redis-check.sh

echo "=== Redis Daily Health Check: $(date) ==="

echo ""
echo "1. Connectivity"
redis-cli PING || echo "FAIL: Redis not responding"

echo ""
echo "2. Replication Status"
redis-cli INFO replication | grep -E "role:|connected_slaves:|master_link_status:"

echo ""
echo "3. Memory"
redis-cli INFO memory | grep -E "used_memory_human:|maxmemory_human:|mem_fragmentation_ratio:"

echo ""
echo "4. Persistence"
redis-cli INFO persistence | grep -E "rdb_last_bgsave_status:|aof_last_rewrite_status:|rdb_last_save_time:"

echo ""
echo "5. Slow Queries (last 10)"
redis-cli SLOWLOG GET 10

echo ""
echo "6. Connected Clients"
redis-cli INFO clients | grep connected_clients:
```

## Common Task: Graceful Restart

```bash
# Procedure: Graceful Redis Restart
# Risk: Minimal (< 1 second unavailability)
# Rollback: N/A

# Step 1: Ensure AOF/RDB save is current
redis-cli BGSAVE
sleep 5
redis-cli LASTSAVE

# Step 2: Graceful shutdown (saves AOF if enabled)
redis-cli SHUTDOWN SAVE
# or via systemd:
systemctl restart redis

# Step 3: Verify recovery
sleep 2
redis-cli PING
redis-cli DBSIZE
redis-cli INFO server | grep redis_version:
```

## Alert Response Procedures

High memory alert (>80%):

```bash
# Check top keys by memory
redis-cli --scan | head -100 | while read key; do
  echo "$(redis-cli MEMORY USAGE "$key") $key"
done | sort -n | tail -20

# Check for large keys
redis-cli --bigkeys

# Emergency: if near OOM
redis-cli CONFIG SET maxmemory-policy allkeys-lru  # enable eviction
```

Replication lag alert:

```bash
# Check lag
redis-cli INFO replication | grep master_repl_offset
redis-cli -h replica-ip INFO replication | grep slave_repl_offset

# Check replica connection
redis-cli -h replica-ip INFO replication | grep master_link_status:

# Force resync if needed (replica side)
redis-cli -h replica-ip REPLICAOF master-ip 6379
```

## Configuration Change Procedure

```bash
# Procedure: Redis Configuration Change
# Pre-check: backup current config

# Step 1: Document current value
redis-cli CONFIG GET maxmemory

# Step 2: Apply change
redis-cli CONFIG SET maxmemory 8gb

# Step 3: Persist to config file
redis-cli CONFIG REWRITE

# Step 4: Verify
redis-cli CONFIG GET maxmemory

# Step 5: Log the change
echo "$(date) - maxmemory changed to 8gb by $(whoami)" >> /var/log/redis-changes.log
```

## Key Contact Information Template

```text
Redis Runbook - Contacts

Primary DBA/DevOps: team@company.com
On-call rotation:   PagerDuty - redis-oncall
Escalation:         engineering-leads@company.com

Redis instances:
  Primary:   redis-primary.internal:6379
  Replica:   redis-replica.internal:6379
  Sentinels: sentinel-1:26379, sentinel-2:26379, sentinel-3:26379

Cloud Console: https://console.cloud.provider/redis
Grafana:       https://grafana.internal/d/redis-overview
```

## Summary

A good Redis runbook combines architecture documentation, executable health check scripts, step-by-step procedures for common tasks, and clear incident response playbooks. Store it in version control alongside your infrastructure code, review it quarterly, and test your procedures regularly to ensure they remain accurate as your environment evolves.
