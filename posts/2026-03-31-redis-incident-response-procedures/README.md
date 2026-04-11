# How to Set Up Redis Incident Response Procedures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Incident Response, Operation

Description: Learn how to set up Redis incident response procedures with runbooks for common failure scenarios, escalation paths, and post-incident review processes.

---

Well-defined Redis incident response procedures enable your team to resolve outages quickly and consistently. This guide covers the incident lifecycle from detection to post-incident review.

## Incident Severity Levels

```text
P1 - Critical (page immediately):
  - Redis primary down with no automatic failover
  - 100% of write operations failing
  - Full data loss risk

P2 - High (alert within 15 min):
  - High latency (P99 > 100ms)
  - Memory > 90% with no eviction
  - Replication lag > 60 seconds

P3 - Medium (business hours):
  - Single replica down
  - Cache hit rate < 50%
  - Slowlog showing frequent slow queries

P4 - Low (next sprint):
  - Configuration drift detected
  - Backup validation failures
  - Minor performance degradation
```

## P1 Runbook: Primary Down

```bash
#!/bin/bash
# incident-redis-primary-down.sh

echo "=== Redis P1 Incident: Primary Down ==="
echo "Started: $(date)"

# Step 1: Verify the failure
echo "1. Verifying primary is down..."
redis-cli -h "$REDIS_PRIMARY" PING 2>&1 || echo "Confirmed: Primary not responding"

# Step 2: Check Sentinel status
echo "2. Checking Sentinel status..."
redis-cli -h sentinel-1 -p 26379 SENTINEL masters
redis-cli -h sentinel-1 -p 26379 SENTINEL master mymaster | grep -A 1 -E "ip|flags|num-slaves"

# Step 3: Check if Sentinel already failed over
echo "3. Checking for auto-failover..."
NEW_PRIMARY=$(redis-cli -h sentinel-1 -p 26379 SENTINEL get-master-addr-by-name mymaster | head -1)
echo "Current primary: $NEW_PRIMARY"

# Step 4: If no auto-failover, trigger manually
if [ "$NEW_PRIMARY" = "$REDIS_PRIMARY" ]; then
  echo "4. Auto-failover did not occur. Triggering manual failover..."
  redis-cli -h sentinel-1 -p 26379 SENTINEL failover mymaster
  sleep 15
  NEW_PRIMARY=$(redis-cli -h sentinel-1 -p 26379 SENTINEL get-master-addr-by-name mymaster | head -1)
  echo "New primary after failover: $NEW_PRIMARY"
fi

# Step 5: Validate new primary
redis-cli -h "$NEW_PRIMARY" PING && echo "5. New primary is responding"
redis-cli -h "$NEW_PRIMARY" SET incident-test "$(date)" && echo "6. Writes succeeding on new primary"
```

## P2 Runbook: High Memory

```bash
#!/bin/bash
# incident-redis-high-memory.sh

echo "=== Redis P2 Incident: High Memory ==="

# Step 1: Get memory details
redis-cli INFO memory | grep -E "used_memory_human:|maxmemory_human:|maxmemory_policy:"

# Step 2: Enable eviction if policy is noeviction
POLICY=$(redis-cli CONFIG GET maxmemory-policy | tail -1)
if [ "$POLICY" = "noeviction" ]; then
  echo "Switching from noeviction to allkeys-lru"
  redis-cli CONFIG SET maxmemory-policy allkeys-lru
fi

# Step 3: Find and optionally delete large keys
echo "Top large keys:"
redis-cli --bigkeys 2>&1 | tail -20

# Step 4: Check for memory-wasting patterns
echo "Key count by pattern:"
redis-cli --scan --count 500 | sed 's/:[^:]*$//' | sort | uniq -c | sort -rn | head -10

# Step 5: Log findings
echo "$(date) P2 memory incident - policy changed to allkeys-lru, memory usage checked" >> /var/log/redis-incidents.log
```

## Incident Communication Templates

```text
Initial Alert (within 5 min):
  Subject: [P1] Redis Primary Down - Production
  We are investigating a Redis primary failure in production.
  Impact: Write operations failing for [service names]
  ETA for update: 15 minutes

Update (every 15 min):
  Subject: [UPDATE] Redis P1 Incident
  Status: Failover in progress
  New primary: 10.0.1.11
  Applications reconnecting via Sentinel
  Resolution ETA: 10 minutes

Resolution:
  Subject: [RESOLVED] Redis P1 Incident - 47 min duration
  Root cause: OOM killer terminated Redis process
  Fix applied: Sentinel failover completed
  Post-incident review: scheduled for tomorrow 10am
```

## Post-Incident Review Template

```text
Post-Incident Review: Redis P1 - 2026-03-31
Duration: 47 minutes
Impact: All write operations failed for checkout service

Timeline:
  02:14 - Monitoring alert triggered
  02:18 - On-call engineer paged
  02:23 - Primary failure confirmed
  02:31 - Manual failover initiated (Sentinel quorum issue)
  02:47 - Write operations restored
  03:01 - All systems stable

Root Cause:
  OOM killer terminated Redis process due to memory pressure
  Sentinel quorum was not met (1 of 3 sentinels was down for maintenance)

Action Items:
  1. Fix Sentinel quorum (ensure all 3 always running) - P1 - by 2026-04-07
  2. Add OOM killer protection for Redis process - P2 - by 2026-04-14
  3. Reduce maxmemory to 80% to prevent OOM conditions - P1 - by 2026-04-03
```

## Summary

Redis incident response requires clearly defined severity levels, pre-written runbook scripts for each failure scenario, fast communication templates, and thorough post-incident reviews. Store runbooks as executable scripts in your repository, practice them in staging environments quarterly, and use post-incident reviews to systematically eliminate recurrence of each failure type.
