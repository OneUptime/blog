# How to Write a Ceph Cluster Inventory Script

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Scripting, Inventory, Documentation, Bash

Description: Build a Bash script to generate a complete Ceph cluster inventory including OSDs, monitors, pools, users, and capacity for documentation and auditing.

---

A cluster inventory script captures a point-in-time snapshot of everything in your Ceph deployment - hardware, software versions, pools, users, and capacity. This is invaluable for audits, capacity planning, and incident response.

## Script Structure

```bash
#!/bin/bash
# ceph-inventory.sh
# Generates a complete inventory of a Ceph cluster

set -euo pipefail

NAMESPACE="${CEPH_NAMESPACE:-rook-ceph}"
TOOLS="deploy/rook-ceph-tools"
OUTPUT_DIR="${OUTPUT_DIR:-./ceph-inventory-$(date +%Y%m%d-%H%M%S)}"
FORMAT="${FORMAT:-text}"  # text or json

mkdir -p "$OUTPUT_DIR"

ceph_cmd() {
  kubectl -n "$NAMESPACE" exec "$TOOLS" -- ceph "$@"
}

radosgw_admin() {
  kubectl -n "$NAMESPACE" exec "$TOOLS" -- radosgw-admin "$@"
}

log() { echo "[INVENTORY] $*"; }
```

## Capturing Cluster Version and Status

```bash
collect_cluster_info() {
  log "Collecting cluster info..."
  ceph_cmd version > "$OUTPUT_DIR/version.txt"
  ceph_cmd status --format json > "$OUTPUT_DIR/status.json"
  ceph_cmd status > "$OUTPUT_DIR/status.txt"
  ceph_cmd health detail > "$OUTPUT_DIR/health.txt"
  ceph_cmd quorum_status --format json > "$OUTPUT_DIR/quorum.json"
}
```

## Collecting Monitor Information

```bash
collect_monitors() {
  log "Collecting monitor info..."
  ceph_cmd mon dump --format json > "$OUTPUT_DIR/mon-dump.json"
  ceph_cmd mon stat > "$OUTPUT_DIR/mon-stat.txt"

  # Extract monitor details
  python3 << PYEOF > "$OUTPUT_DIR/monitors.txt"
import json
with open("$OUTPUT_DIR/mon-dump.json") as f:
    data = json.load(f)
print(f"Epoch: {data['epoch']}")
print(f"FSid: {data['fsid']}")
print("Monitors:")
for mon in data.get("mons", []):
    print(f"  - {mon['name']}: {mon['public_addr']}")
PYEOF
}
```

## Collecting OSD Inventory

```bash
collect_osds() {
  log "Collecting OSD inventory..."
  ceph_cmd osd dump --format json > "$OUTPUT_DIR/osd-dump.json"
  ceph_cmd osd tree --format json > "$OUTPUT_DIR/osd-tree.json"
  ceph_cmd osd df --format json > "$OUTPUT_DIR/osd-df.json"
  ceph_cmd osd stat > "$OUTPUT_DIR/osd-stat.txt"

  # Generate human-readable OSD summary
  ceph_cmd osd df tree > "$OUTPUT_DIR/osd-df-tree.txt"
}
```

## Collecting Pool Information

```bash
collect_pools() {
  log "Collecting pool info..."
  ceph_cmd osd pool ls detail --format json > "$OUTPUT_DIR/pools.json"
  ceph_cmd df detail --format json > "$OUTPUT_DIR/df.json"

  # Generate pool summary
  python3 << PYEOF > "$OUTPUT_DIR/pools-summary.txt"
import json
with open("$OUTPUT_DIR/pools.json") as f:
    pools = json.load(f)
print(f"{'Pool Name':<30} {'Type':<12} {'PGs':<6} {'Size':<6} {'Application'}")
print("-" * 70)
for pool in pools:
    name = pool.get("pool_name", "N/A")
    ptype = "erasure" if pool.get("erasure_code_profile") else "replicated"
    pgs = pool.get("pg_num", 0)
    size = pool.get("size", 0)
    app = ",".join(pool.get("application_metadata", {}).keys()) or "none"
    print(f"{name:<30} {ptype:<12} {pgs:<6} {size:<6} {app}")
PYEOF
}
```

## Collecting RGW User Inventory

```bash
collect_rgw_users() {
  log "Collecting RGW user inventory..."
  radosgw_admin user list --format json > "$OUTPUT_DIR/rgw-users.json"

  # Collect detailed info per user
  mkdir -p "$OUTPUT_DIR/rgw-users"
  while IFS= read -r uid; do
    radosgw_admin user info --uid="$uid" --format json \
      > "$OUTPUT_DIR/rgw-users/${uid}.json" 2>/dev/null || true
  done < <(python3 -c "
import json
with open('$OUTPUT_DIR/rgw-users.json') as f:
    for u in json.load(f): print(u)
")
}
```

## Generating the Final Report

```bash
generate_report() {
  local report="$OUTPUT_DIR/INVENTORY-REPORT.txt"
  log "Generating summary report..."

  {
    echo "====================================="
    echo "CEPH CLUSTER INVENTORY REPORT"
    echo "Generated: $(date)"
    echo "====================================="
    echo ""
    echo "--- Cluster Version ---"
    cat "$OUTPUT_DIR/version.txt"
    echo ""
    echo "--- Overall Health ---"
    cat "$OUTPUT_DIR/health.txt" | head -5
    echo ""
    echo "--- OSD Summary ---"
    cat "$OUTPUT_DIR/osd-stat.txt"
    echo ""
    echo "--- Pool Summary ---"
    cat "$OUTPUT_DIR/pools-summary.txt"
  } > "$report"

  log "Report written to: $report"
}

# Run inventory
collect_cluster_info
collect_monitors
collect_osds
collect_pools
collect_rgw_users
generate_report

log "Inventory complete. Output in: $OUTPUT_DIR"
```

## Summary

The Ceph cluster inventory script collects comprehensive information about monitors, OSDs, pools, and RGW users into structured files. Running it before and after major changes, or on a scheduled basis, gives you a searchable history of your cluster's configuration that accelerates troubleshooting and satisfies audit requirements.
