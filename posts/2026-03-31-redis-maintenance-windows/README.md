# How to Handle Redis Maintenance Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Maintenance, Operation

Description: Learn how to plan and execute Redis maintenance windows with minimal downtime, including pre-maintenance checks, client drain procedures, and post-maintenance validation.

---

Maintenance windows for Redis require careful planning to minimize impact on applications. Whether you are upgrading Redis, changing configuration, or rotating TLS certificates, a structured approach prevents unexpected outages.

## Pre-Maintenance Checklist

Run these checks before any maintenance window begins:

```bash
#!/bin/bash
echo "=== Pre-Maintenance Checks ==="

# 1. Current state snapshot
redis-cli INFO server | grep redis_version
redis-cli DBSIZE
redis-cli INFO memory | grep used_memory_human
redis-cli INFO clients | grep connected_clients

# 2. Verify replication is healthy (for Sentinel/Cluster)
redis-cli INFO replication | grep -E "role:|connected_slaves:|master_link_status:"

# 3. Check no large operations are running
redis-cli CLIENT LIST | grep -v "cmd=ping\|cmd=info" | head -20

# 4. Note slowlog baseline
redis-cli SLOWLOG LEN
```

## Draining Client Connections

For zero-downtime maintenance, pause new writes before starting:

```bash
# Pause client writes for 30 seconds (Redis 6.2+)
redis-cli CLIENT PAUSE 30000 WRITE

# Verify connections are paused
redis-cli CLIENT INFO | grep flags

# For older Redis versions, pause all clients (available since Redis 3.0)
redis-cli CLIENT PAUSE 30000
```

## Configuration Change Maintenance

```bash
#!/bin/bash
# maintenance-config-change.sh
CHANGE_LOG="/var/log/redis-maintenance.log"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" | tee -a "$CHANGE_LOG"; }

log "Maintenance start: ${MAINTENANCE_DESCRIPTION:-configuration change}"

# Pre-change snapshot
log "BEFORE: $(redis-cli CONFIG GET "$CONFIG_KEY")"

# Apply change
redis-cli CONFIG SET "$CONFIG_KEY" "$CONFIG_VALUE"
redis-cli CONFIG REWRITE

# Verify
log "AFTER: $(redis-cli CONFIG GET "$CONFIG_KEY")"
log "Maintenance complete"
```

## Redis Version Upgrade Procedure

```bash
# Step 1: Upgrade replica first (rolling)
# On the replica server:
sudo apt-get install redis-server=7.2.0

# Step 2: Verify replica is running new version
redis-cli -h replica-ip INFO server | grep redis_version

# Step 3: Trigger failover (Sentinel)
redis-cli -h sentinel-ip -p 26379 SENTINEL FAILOVER mymaster

# Wait for promotion
redis-cli -h sentinel-ip -p 26379 SENTINEL master mymaster | grep ip

# Step 4: Upgrade old primary (now replica)
sudo apt-get install redis-server=7.2.0

# Step 5: Verify both nodes are on new version
redis-cli -h primary-ip INFO server | grep redis_version
redis-cli -h replica-ip INFO server | grep redis_version
```

## Scheduled Maintenance Window Template

```text
Maintenance Plan
----------------
Date/Time:    2026-04-15 02:00 - 04:00 UTC
Type:         Redis version upgrade (7.0 -> 7.2)
Impact:       < 30 seconds (Sentinel failover)
Owner:        devops@company.com
Rollback:     Downgrade package and restart

Timeline:
  02:00 - Pre-maintenance checks
  02:15 - Notify application teams
  02:30 - Upgrade replica
  02:45 - Trigger Sentinel failover
  03:00 - Upgrade old primary
  03:30 - Validation and smoke tests
  04:00 - Maintenance complete, post-notification
```

## Post-Maintenance Validation

```bash
#!/bin/bash
echo "=== Post-Maintenance Validation ==="

# 1. Basic connectivity
redis-cli PING || { echo "FAIL: Redis not responding"; exit 1; }

# 2. Data integrity check
redis-cli DBSIZE
redis-cli RANDOMKEY  # spot-check a random key

# 3. Replication health
redis-cli INFO replication | grep -E "role:|connected_slaves:"

# 4. Performance baseline
redis-benchmark -n 10000 -q -t get,set 2>/dev/null | head -5

echo "Post-maintenance validation passed"
```

## Summary

Successful Redis maintenance windows rely on thorough pre-checks, controlled connection draining, scripted change procedures with logging, and post-maintenance validation. For version upgrades, use rolling restarts through Sentinel failover to achieve near-zero downtime. Always document every maintenance action in a change log for audit and rollback purposes.
