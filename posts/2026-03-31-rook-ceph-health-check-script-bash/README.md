# How to Write a Ceph Health Check Script in Bash

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Bash, Scripting, Monitoring, Health Check

Description: Write a comprehensive Bash script to check Ceph cluster health, covering OSD status, PG states, pool usage, and alerting via email or Slack.

---

A reliable Ceph health check script gives you immediate visibility into cluster status without relying solely on a monitoring dashboard. This guide walks through building a production-ready health check script in Bash.

## Basic Health Check Structure

Start with a simple script that wraps the most important Ceph commands:

```bash
#!/bin/bash
# ceph-health-check.sh

set -euo pipefail

NAMESPACE="${CEPH_NAMESPACE:-rook-ceph}"
TOOLS_POD="deploy/rook-ceph-tools"
ALERT_EMAIL="${ALERT_EMAIL:-ops@example.com}"
EXIT_CODE=0

ceph_cmd() {
  kubectl -n "$NAMESPACE" exec "$TOOLS_POD" -- ceph "$@"
}

echo "=== Ceph Health Check: $(date) ==="
```

## Checking Overall Cluster Health

```bash
check_cluster_health() {
  local status
  status=$(ceph_cmd health --format json 2>/dev/null)
  local overall
  overall=$(echo "$status" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")

  echo "[Cluster] Overall status: $overall"

  if [[ "$overall" == "HEALTH_WARN" ]]; then
    echo "WARNING: Cluster in HEALTH_WARN state"
    EXIT_CODE=1
  elif [[ "$overall" == "HEALTH_ERR" ]]; then
    echo "CRITICAL: Cluster in HEALTH_ERR state"
    EXIT_CODE=2
  fi

  # Print detailed messages
  ceph_cmd health detail 2>/dev/null | head -20
}
```

## Checking OSD Status

```bash
check_osds() {
  local osd_stat
  osd_stat=$(ceph_cmd osd stat --format json 2>/dev/null)
  local total in up
  total=$(echo "$osd_stat" | python3 -c "import sys,json; print(json.load(sys.stdin)['num_osds'])")
  in=$(echo "$osd_stat" | python3 -c "import sys,json; print(json.load(sys.stdin)['num_in_osds'])")
  up=$(echo "$osd_stat" | python3 -c "import sys,json; print(json.load(sys.stdin)['num_up_osds'])")

  echo "[OSDs] Total: $total | Up: $up | In: $in"

  if [[ "$up" -lt "$total" ]]; then
    echo "WARNING: $((total - up)) OSD(s) are down"
    EXIT_CODE=1
  fi
}
```

## Checking PG States

```bash
check_pgs() {
  local pg_summary
  pg_summary=$(ceph_cmd pg stat --format json 2>/dev/null)
  local num_pgs
  num_pgs=$(echo "$pg_summary" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('num_pgs',0))")

  echo "[PGs] Total PGs: $num_pgs"

  # Check for degraded or inconsistent PGs
  local pg_detail
  pg_detail=$(ceph_cmd pg dump_stuck --format json 2>/dev/null)
  local stuck_count
  stuck_count=$(echo "$pg_detail" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('stuck_pg_stats',[])))")

  if [[ "$stuck_count" -gt 0 ]]; then
    echo "WARNING: $stuck_count PG(s) are stuck"
    EXIT_CODE=1
  fi
}
```

## Checking Pool Usage

```bash
check_pool_usage() {
  echo "[Pools] Usage summary:"
  ceph_cmd df detail 2>/dev/null | grep -E "POOL|DATA|USED" | head -20

  # Alert on pools over 80% capacity
  ceph_cmd df detail --format json 2>/dev/null | python3 - << 'PYEOF'
import sys, json
data = json.load(sys.stdin)
for pool in data.get("pools", []):
    name = pool["name"]
    pct = pool["stats"]["percent_used"] * 100
    if pct > 80:
        print(f"WARNING: Pool '{name}' is {pct:.1f}% full")
PYEOF
}
```

## Sending Alerts

```bash
send_alert() {
  local message="$1"
  # Slack webhook
  if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
    curl -s -X POST "$SLACK_WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "{\"text\": \"*Ceph Alert*: $message\"}" > /dev/null
  fi
  # Email
  echo "$message" | mail -s "Ceph Health Alert" "$ALERT_EMAIL" 2>/dev/null || true
}

# Run all checks
check_cluster_health
check_osds
check_pgs
check_pool_usage

if [[ "$EXIT_CODE" -gt 0 ]]; then
  send_alert "Ceph cluster requires attention. Exit code: $EXIT_CODE"
fi

exit "$EXIT_CODE"
```

## Summary

A well-structured Ceph health check script wraps cluster status, OSD state, PG status, and pool capacity into a single executable that can run via cron or a CI pipeline. By parsing JSON output and using structured exit codes, the script integrates cleanly with monitoring systems and alert channels.
