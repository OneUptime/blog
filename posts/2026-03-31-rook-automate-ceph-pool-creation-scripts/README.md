# How to Automate Ceph Pool Creation with Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Scripting, Pool, Automation, Bash

Description: Automate Ceph pool creation with configurable replication, erasure coding, quotas, and application tagging using reusable Bash scripts.

---

Creating Ceph pools consistently across environments requires automating the full workflow: pool creation, replication configuration, quota assignment, and application tagging. Scripts eliminate configuration drift between development and production.

## Pool Creation Script

```bash
#!/bin/bash
# create-ceph-pool.sh
# Usage: ./create-ceph-pool.sh <pool_name> <type> <pg_count> [options]

set -euo pipefail

NAMESPACE="${CEPH_NAMESPACE:-rook-ceph}"
TOOLS="deploy/rook-ceph-tools"

POOL_NAME="${1:?Pool name required}"
POOL_TYPE="${2:-replicated}"  # replicated or erasure
PG_COUNT="${3:-32}"
REPLICA_SIZE="${REPLICA_SIZE:-3}"
MIN_REPLICA_SIZE="${MIN_REPLICA_SIZE:-2}"
APP_TAG="${APP_TAG:-rbd}"

ceph_cmd() {
  kubectl -n "$NAMESPACE" exec "$TOOLS" -- ceph "$@"
}

echo "Creating pool: $POOL_NAME (type=$POOL_TYPE, pgs=$PG_COUNT)"
```

## Creating Replicated Pools

```bash
create_replicated_pool() {
  # Create pool
  ceph_cmd osd pool create "$POOL_NAME" "$PG_COUNT" "$PG_COUNT"

  # Set replication
  ceph_cmd osd pool set "$POOL_NAME" size "$REPLICA_SIZE"
  ceph_cmd osd pool set "$POOL_NAME" min_size "$MIN_REPLICA_SIZE"

  # Enable autoscaler
  ceph_cmd osd pool set "$POOL_NAME" pg_autoscale_mode on

  # Tag with application
  ceph_cmd osd pool application enable "$POOL_NAME" "$APP_TAG"

  echo "Replicated pool '$POOL_NAME' created with size=$REPLICA_SIZE"
}
```

## Creating Erasure Coded Pools

```bash
create_erasure_pool() {
  local ec_profile="${POOL_NAME}-ec-profile"
  local k="${EC_K:-4}"
  local m="${EC_M:-2}"

  # Create erasure code profile
  ceph_cmd osd erasure-code-profile set "$ec_profile" \
    "k=$k" "m=$m" \
    "crush-failure-domain=host" \
    "plugin=jerasure"

  # Create the erasure coded pool
  ceph_cmd osd pool create "$POOL_NAME" "$PG_COUNT" "$PG_COUNT" \
    erasure "$ec_profile"

  # Enable compression (optional)
  if [[ "${ENABLE_COMPRESSION:-false}" == "true" ]]; then
    ceph_cmd osd pool set "$POOL_NAME" compression_mode aggressive
    ceph_cmd osd pool set "$POOL_NAME" compression_algorithm snappy
  fi

  ceph_cmd osd pool application enable "$POOL_NAME" "$APP_TAG"

  echo "Erasure pool '$POOL_NAME' created with k=$k m=$m"
}
```

## Setting Pool Quotas

```bash
set_pool_quota() {
  local max_bytes="${QUOTA_MAX_BYTES:-0}"
  local max_objects="${QUOTA_MAX_OBJECTS:-0}"

  if [[ "$max_bytes" -gt 0 ]]; then
    ceph_cmd osd pool set-quota "$POOL_NAME" max_bytes "$max_bytes"
    echo "Set byte quota: $max_bytes bytes"
  fi

  if [[ "$max_objects" -gt 0 ]]; then
    ceph_cmd osd pool set-quota "$POOL_NAME" max_objects "$max_objects"
    echo "Set object quota: $max_objects objects"
  fi
}
```

## Bulk Pool Creation from YAML

Define pools in a YAML config and create them all at once:

```yaml
# pools.yaml
pools:
  - name: ssd-data
    type: replicated
    pgs: 64
    size: 3
    app: rbd
    quota_bytes: 107374182400  # 100GB
  - name: hdd-archive
    type: erasure
    pgs: 32
    ec_k: 4
    ec_m: 2
    app: rgw
  - name: cephfs-meta
    type: replicated
    pgs: 16
    size: 3
    app: cephfs
```

```python
#!/usr/bin/env python3
"""Create Ceph pools from YAML config."""

import os
import subprocess
import yaml
import sys

def create_pools(config_file: str) -> None:
    with open(config_file) as f:
        config = yaml.safe_load(f)

    for pool in config.get("pools", []):
        name = pool["name"]
        print(f"Creating pool: {name}")
        env = os.environ.copy()
        env.update({
            "REPLICA_SIZE": str(pool.get("size", 3)),
            "APP_TAG": pool.get("app", "rbd"),
            "QUOTA_MAX_BYTES": str(pool.get("quota_bytes", 0)),
            "EC_K": str(pool.get("ec_k", 4)),
            "EC_M": str(pool.get("ec_m", 2)),
        })
        subprocess.run([
            "./create-ceph-pool.sh", name,
            pool.get("type", "replicated"),
            str(pool.get("pgs", 32))
        ], env=env, check=True)

if __name__ == "__main__":
    create_pools(sys.argv[1] if len(sys.argv) > 1 else "pools.yaml")
```

## Main Script Logic

```bash
# Continue the main script
case "$POOL_TYPE" in
  replicated)
    create_replicated_pool
    ;;
  erasure)
    create_erasure_pool
    ;;
  *)
    echo "Unknown pool type: $POOL_TYPE"
    exit 1
    ;;
esac

set_pool_quota
ceph_cmd osd pool ls detail | grep "$POOL_NAME"
echo "Pool '$POOL_NAME' ready."
```

## Summary

Automating Ceph pool creation through parameterized scripts ensures consistent configuration across environments. By supporting both replicated and erasure coded pools through the same interface and adding a YAML-driven bulk creation workflow, you can provision dozens of pools quickly with the correct settings every time.
