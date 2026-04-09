# How to Map PGs to OSDs with ceph pg map

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Placement Group, CRUSH, Diagnostic

Description: Learn how to use ceph pg map to find which OSDs host a specific Placement Group, enabling targeted diagnostics in Rook-managed Ceph clusters.

---

## What Is ceph pg map?

`ceph pg map` is a diagnostic command that shows which OSDs are currently responsible for a specific Placement Group. It returns both the "up set" (where CRUSH says the PG should be) and the "acting set" (where the PG is actually being served from). When these sets differ, it indicates the PG is in the process of migrating.

## Basic pg map Usage

Map a specific PG to its OSDs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg map 13.2a
```

Sample output:

```text
osdmap e123 pg 13.2a (13.2a) -> up [3,7,1] acting [3,7,1]
```

This shows PG `13.2a` has:
- **up set**: `[3,7,1]` - OSDs that CRUSH maps this PG to (OSD 3 is primary)
- **acting set**: `[3,7,1]` - OSDs currently serving the PG

When up and acting sets match, the PG is optimally placed.

## Finding the PG ID for a Specific Object

If you know an object name and need its PG, use `ceph osd map`:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd map mypool myobjectname
```

Output:

```text
osdmap e123 pool 'mypool' (1) object 'myobjectname' -> pg 1.2a (1.2a) -> up ([3,7,1], p3) acting ([3,7,1], p3)
```

## Mapping All PGs for a Pool

List all PG-to-OSD mappings for a pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump 2>/dev/null | \
  awk '/^[0-9]+\.[0-9a-f]+/ {print $1, "acting:", $19}'
```

## Checking Primary OSD for a PG

Identify which OSD is the primary for PG reads and writes:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg map 13.2a | grep -oP 'acting \[\K[0-9]+'
```

The first OSD in the acting set is the primary.

## Using pg map for Performance Diagnostics

If a specific client operation is slow, identify the PG and then the OSD:

```bash
# Step 1: Find the pool ID
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd lspools | grep mypool

# Step 2: Map object to PG to OSD
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd map mypool myobject

# Step 3: Check that OSD's performance
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd perf | grep "^<osd-id>"
```

## Simulating CRUSH Mapping

Calculate where a PG would land if you changed OSDs or weights:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  crushtool -i /tmp/crushmap --test --show-mappings \
  --rule 0 --num-rep 3 --min-x 0 --max-x 127
```

This shows the CRUSH mapping without affecting the live cluster.

## Summary

`ceph pg map <pgid>` reveals exactly which OSDs host a Placement Group and whether its acting set matches the CRUSH-computed up set. Use it to trace slow operations to specific OSDs, verify PG migration progress, or debug data placement issues. Combine with `ceph osd map` to start from an object name and trace all the way to the responsible physical OSD.
