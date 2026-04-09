# How to List Pools with ceph osd pool ls and ceph osd lspools in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Pool, Operation, Storage

Description: Learn how to list and inspect Ceph pools using ceph osd pool ls, ceph osd lspools, and ceph df commands, including filtering by application type and viewing pool details.

---

Listing and inspecting pools is a fundamental Ceph administration task. Ceph provides several commands for pool discovery with different levels of detail. Knowing which command to use in each context makes cluster management faster and more efficient.

## Basic Pool Listing Commands

The two primary commands for listing pools are:

```bash
# Modern command - preferred (outputs pool names only)
ceph osd pool ls

# Legacy command (outputs pool IDs and names)
ceph osd lspools
```

`ceph osd pool ls` outputs pool names only, one per line:

```text
.mgr
device_health_metrics
rbd-metadata
rbd-ec-data
.rgw.root
default.rgw.buckets.data
```

`ceph osd lspools` includes the pool ID alongside each name:

```text
1 .mgr,2 device_health_metrics,3 rbd-metadata,4 rbd-ec-data,5 .rgw.root,6 default.rgw.buckets.data,
```

## Listing Pools with Details

For more information about pool type and configuration:

```bash
ceph osd pool ls detail
```

Output:

```text
pool 1 '.mgr' replicated size 3 min_size 2 pg_num 1 pgp_num 1 autoscale_mode on ...
pool 2 'rbd-metadata' replicated size 3 min_size 2 pg_num 32 pgp_num 32 ...
pool 4 'rbd-ec-data' erasure size 6 min_size 5 pg_num 64 pgp_num 64 ...
```

This shows pool type (replicated vs erasure), size, min_size, and PG count at a glance.

## Filtering Pools by Application

List only pools tagged for a specific application:

```bash
# List only RBD pools
ceph osd pool ls | while read pool; do
  ceph osd pool application get "$pool" 2>/dev/null | grep -q '"rbd"' && echo "$pool"
done
```

Or use the dump format to filter:

```bash
ceph osd pool ls detail --format json | python3 -c "
import json, sys
pools = json.load(sys.stdin)
for p in pools:
    apps = p.get('application_metadata', {})
    if 'rbd' in apps:
        print(f\"rbd: {p['pool_name']} (id={p['pool_id']})\")"
```

## Viewing Pool Capacity and Usage

For capacity planning, combine pool listing with usage stats:

```bash
ceph df
```

```text
--- RAW STORAGE ---
CLASS     SIZE    AVAIL    USED     RAW USED  %RAW USED
hdd       80 TiB  60 TiB   20 TiB   20 TiB     25.00%
ssd       20 TiB  18 TiB    2 TiB    2 TiB     10.00%

--- POOLS ---
POOL                  ID  PGS  STORED   OBJECTS  USED    %USED
rbd-metadata           3   32    10 GiB    5000   30 GiB   0.5%
rbd-ec-data            4   64   500 GiB  100000  750 GiB   4.2%
.rgw.buckets.data      6  128   2.0 TiB  500000    3 TiB  15.0%
```

## Listing Pool Specific Settings

For a single pool, list all configurable parameters:

```bash
ceph osd pool get rbd-ec-data all
```

```text
size: 6
min_size: 5
pg_num: 64
pgp_num: 64
crush_rule: ec-rule
erasure_code_profile: rbd-ec-profile
allow_ec_overwrites: true
compression_mode: none
```

## Pool Listing in Rook Toolbox

When running inside a Rook-managed cluster, use the Ceph toolbox pod:

```bash
# Enter the toolbox
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- bash

# Inside the toolbox
ceph osd pool ls
ceph df
ceph osd pool ls detail
```

## Scripting Pool Inventory

For automation or monitoring, export pool inventory as JSON:

```bash
ceph osd pool ls detail --format json > /tmp/pool-inventory.json

# Count pools by type
python3 - <<'EOF'
import json
with open('/tmp/pool-inventory.json') as f:
    pools = json.load(f)
replicated = sum(1 for p in pools if p.get('type') == 1)
erasure = sum(1 for p in pools if p.get('type') == 3)
print(f"Replicated pools: {replicated}")
print(f"Erasure coded pools: {erasure}")
print(f"Total pools: {len(pools)}")
EOF
```

## Checking Pool Counts

For a quick count of all pools:

```bash
ceph osd pool ls | wc -l
```

For RGW-specific pools:

```bash
ceph osd pool ls | grep "^default.rgw\|^\.rgw"
```

## Summary

Use `ceph osd pool ls` for a quick pool name listing and `ceph osd pool ls detail` for configuration details. `ceph df` adds capacity and utilization data. For single-pool inspection, `ceph osd pool get <pool> all` shows every configurable parameter. In Rook environments, these commands run inside the toolbox pod via `kubectl exec`. JSON output (`--format json`) enables scripting and automated pool inventory management.
