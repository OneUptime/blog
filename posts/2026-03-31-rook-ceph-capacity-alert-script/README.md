# How to Write a Ceph Capacity Alert Script

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Scripting, Capacity, Monitoring, Alert

Description: Write a Bash script to monitor Ceph cluster and pool capacity, sending alerts via email and Slack when usage exceeds configurable thresholds.

---

Running out of storage capacity is one of the most disruptive failures in a Ceph cluster. A proactive capacity alert script gives you advance warning before pools fill up and applications start failing writes.

## Script Overview

The script checks three levels of capacity: overall cluster, per-pool, and per-OSD:

```bash
#!/bin/bash
# ceph-capacity-alert.sh

set -euo pipefail

NAMESPACE="${CEPH_NAMESPACE:-rook-ceph}"
TOOLS="deploy/rook-ceph-tools"
WARN_THRESHOLD="${WARN_THRESHOLD:-75}"
CRIT_THRESHOLD="${CRIT_THRESHOLD:-90}"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
ALERT_EMAIL="${ALERT_EMAIL:-}"
SCRIPT_NAME="$(basename "$0")"
ALERTS=()

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

ceph_cmd() {
  kubectl -n "$NAMESPACE" exec "$TOOLS" -- ceph "$@"
}
```

## Checking Cluster-Level Capacity

```bash
check_cluster_capacity() {
  local df_json
  df_json=$(ceph_cmd df --format json 2>/dev/null)

  local total_bytes used_bytes
  total_bytes=$(echo "$df_json" | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(d['stats']['total_bytes'])")
  used_bytes=$(echo "$df_json" | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(d['stats']['total_used_raw_bytes'])")

  local pct
  pct=$(python3 -c "print(round($used_bytes / $total_bytes * 100, 1))")

  local total_tb used_gb
  total_tb=$(python3 -c "print(round($total_bytes / 1099511627776, 2))")
  used_gb=$(python3 -c "print(round($used_bytes / 1073741824, 1))")

  log "Cluster: ${used_gb}GB used of ${total_tb}TB (${pct}%)"

  if (( $(echo "$pct >= $CRIT_THRESHOLD" | bc -l) )); then
    ALERTS+=("CRITICAL: Cluster capacity at ${pct}% (threshold: ${CRIT_THRESHOLD}%)")
  elif (( $(echo "$pct >= $WARN_THRESHOLD" | bc -l) )); then
    ALERTS+=("WARNING: Cluster capacity at ${pct}% (threshold: ${WARN_THRESHOLD}%)")
  fi
}
```

## Checking Per-Pool Capacity

```bash
check_pool_capacity() {
  local df_json
  df_json=$(ceph_cmd df detail --format json 2>/dev/null)

  while IFS= read -r line; do
    [[ -n "$line" ]] && ALERTS+=("$line")
  done < <(echo "$df_json" | python3 -c '
import sys, json
data = json.load(sys.stdin)
warn = float(sys.argv[1])
crit = float(sys.argv[2])
for pool in data.get("pools", []):
    name = pool["name"]
    used = pool["stats"]["bytes_used"]
    avail = pool["stats"]["max_avail"]
    total = used + avail
    if total > 0:
        pct = used / total * 100
        if pct >= crit:
            print(f"CRITICAL: Pool {name!r} at {pct:.1f}% capacity")
        elif pct >= warn:
            print(f"WARNING: Pool {name!r} at {pct:.1f}% capacity")
' "$WARN_THRESHOLD" "$CRIT_THRESHOLD")
}
```

## Checking Per-OSD Utilization

```bash
check_osd_utilization() {
  local osd_json
  osd_json=$(ceph_cmd osd df --format json 2>/dev/null)

  while IFS= read -r line; do
    [[ -n "$line" ]] && ALERTS+=("$line")
  done < <(echo "$osd_json" | python3 -c '
import sys, json
data = json.load(sys.stdin)
for node in data.get("nodes", []):
    if node.get("type") != "osd":
        continue
    util = node.get("utilization", 0)
    osd_id = node.get("id")
    if util >= 90:
        print(f"CRITICAL: OSD.{osd_id} at {util:.1f}% utilization")
    elif util >= 80:
        print(f"WARNING: OSD.{osd_id} at {util:.1f}% utilization")
')
}
```

## Sending Notifications

```bash
send_notifications() {
  if [[ ${#ALERTS[@]} -eq 0 ]]; then
    log "All capacity checks passed."
    return 0
  fi

  local message
  message=$(printf '%s\n' "${ALERTS[@]}")
  log "Sending alerts: $message"

  # Slack notification
  if [[ -n "$SLACK_WEBHOOK" ]]; then
    local payload
    payload=$(python3 -c "
import json, sys
alerts = sys.argv[1]
print(json.dumps({'text': f'*Ceph Capacity Alert*\n{alerts}'}))
" "$message")
    curl -s -X POST "$SLACK_WEBHOOK" \
      -H "Content-Type: application/json" \
      -d "$payload" > /dev/null
    log "Slack alert sent"
  fi

  # Email notification
  if [[ -n "$ALERT_EMAIL" ]]; then
    echo "$message" | mail -s "Ceph Capacity Alert - $(hostname)" "$ALERT_EMAIL"
    log "Email alert sent to $ALERT_EMAIL"
  fi

  return 1
}

# Main execution
log "Starting capacity check..."
check_cluster_capacity
check_pool_capacity
check_osd_utilization
send_notifications
```

## Summary

This capacity alert script monitors Ceph at three levels - cluster, pool, and OSD - and sends notifications via Slack and email when configurable thresholds are crossed. Deploying it as a Kubernetes CronJob running every 15 minutes provides continuous early warning before capacity issues become critical failures.
