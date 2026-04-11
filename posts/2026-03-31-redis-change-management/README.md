# How to Set Up Redis Change Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Change Management, Operation

Description: Learn how to implement a Redis change management process with pre-approval checklists, audit logging, rollback plans, and automated configuration drift detection.

---

Uncontrolled changes to Redis configuration are a leading cause of production incidents. A structured change management process ensures every change is reviewed, documented, and reversible.

## Change Categories

Define risk levels for different change types:

```text
Level 1 - Low Risk (no approval required):
  - Slowlog threshold adjustments
  - maxclients tuning
  - Log level changes

Level 2 - Medium Risk (peer review required):
  - maxmemory changes
  - Persistence configuration changes
  - New ACL users

Level 3 - High Risk (manager + peer approval):
  - Redis version upgrades
  - Cluster topology changes
  - Sentinel reconfiguration
  - FLUSHDB/FLUSHALL operations
```

## Change Request Template

```text
Change Request: RC-2026-042
Date:           2026-04-01
Requester:      engineer@company.com
Reviewer:       senior-engineer@company.com

Type: Level 2 - Medium Risk
Description: Increase maxmemory from 4gb to 8gb on redis-prod-1

Current Value:  maxmemory = 4gb
Proposed Value: maxmemory = 8gb
Reason: Dataset grew 40% following feature launch

Pre-change checks:
  [x] Current memory usage confirmed: 3.8gb (95% full)
  [x] 8gb RAM available on host (12gb total, 4gb used by OS)
  [x] No ongoing incidents
  [x] Maintenance window: 2026-04-01 02:00 UTC

Implementation:
  redis-cli CONFIG SET maxmemory 8gb
  redis-cli CONFIG REWRITE

Rollback:
  redis-cli CONFIG SET maxmemory 4gb
  redis-cli CONFIG REWRITE

Success Criteria:
  CONFIG GET maxmemory returns 8589934592
  No errors in redis.log within 5 minutes
```

## Audit Logging Script

```bash
#!/bin/bash
# redis-change.sh - Wrapper for audited Redis changes
AUDIT_LOG="/var/log/redis-changes.log"
CHANGE_DESC="${REDIS_CHANGE_DESC:-unknown change}"
OPERATOR="${USER:-unknown}"

log_change() {
  local cmd="$1"
  local result="$2"
  echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') operator=$OPERATOR change=\"$CHANGE_DESC\" cmd=\"$cmd\" result=\"$result\"" >> "$AUDIT_LOG"
}

# Capture before state
BEFORE=$(redis-cli CONFIG GET "$1")

# Execute change
RESULT=$(redis-cli CONFIG SET "$1" "$2")
redis-cli CONFIG REWRITE > /dev/null

# Capture after state
AFTER=$(redis-cli CONFIG GET "$1")

log_change "CONFIG SET $1 $2" "$RESULT"
echo "Before: $BEFORE"
echo "After:  $AFTER"
echo "Logged to $AUDIT_LOG"
```

Usage:

```bash
REDIS_CHANGE_DESC="RC-2026-042: increase maxmemory" \
  ./redis-change.sh maxmemory 8gb
```

## Configuration Drift Detection

Compare live configuration against your stored baseline:

```bash
#!/bin/bash
# check-redis-drift.sh
BASELINE="/etc/redis/baseline.conf"
TEMP_CURRENT="/tmp/redis-current.conf"

# Dump current configuration
redis-cli CONFIG GET "*" | paste - - | sort > "$TEMP_CURRENT"

# Compare against baseline
if diff "$BASELINE" "$TEMP_CURRENT" > /tmp/redis-drift.diff; then
  echo "No configuration drift detected"
else
  echo "DRIFT DETECTED:"
  cat /tmp/redis-drift.diff
  exit 1
fi
```

Create baseline after a known-good state:

```bash
redis-cli CONFIG GET "*" | paste - - | sort > /etc/redis/baseline.conf
```

## GitOps for Redis Configuration

```bash
# Store redis.conf in git
git add /etc/redis/redis.conf
git commit -m "RC-2026-042: increase maxmemory to 8gb"
git push

# CI/CD can diff and lint changes before apply
diff <(git show HEAD~1:etc/redis/redis.conf) /etc/redis/redis.conf
```

## Summary

Redis change management prevents production incidents by categorizing change risk, requiring appropriate review, logging every change with before/after state, and detecting configuration drift against a known baseline. Store your configuration in version control and use audit logging scripts to maintain a complete change history that satisfies both operational and compliance requirements.
