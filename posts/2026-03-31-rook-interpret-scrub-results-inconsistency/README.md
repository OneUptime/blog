# How to Interpret Scrub Results and Inconsistency Reports

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Scrubbing, Data Integrity, Inconsistency, Troubleshooting, Kubernetes

Description: Learn how to read and interpret Ceph scrub results and inconsistency reports to understand data integrity issues and determine the appropriate remediation steps.

---

## Understanding Ceph Scrub Output

When Ceph finds inconsistencies during scrubbing, it reports them through health checks and detailed logs. Understanding how to interpret these reports is essential for determining whether you have data corruption or a benign metadata mismatch.

## Checking for Scrub Inconsistencies

```bash
# Check overall health for scrub issues
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph health detail

# Sample output indicating inconsistency:
# HEALTH_ERR 1 scrub errors
# OSD_SCRUB_ERRORS 1 scrub errors
# pg 3.1a is inconsistent (shallow scrub)
```

## Getting Detailed Scrub Error Information

```bash
# Query the specific PG for detailed inconsistency information
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg 3.1a query | python3 -m json.tool | grep -A 20 "inconsistent"

# List all inconsistent PGs
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump | grep inconsistent
```

## Reading the OSD Log for Scrub Details

The OSD log contains the most detailed scrub error information:

```bash
# Get the OSD that encountered the error
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg 3.1a query | python3 -m json.tool | grep "primary"

# Read the OSD log
kubectl -n rook-ceph logs rook-ceph-osd-0-xxxx | grep -A 5 "inconsistent"
```

## Types of Inconsistencies

Ceph scrub reports different types of problems:

| Error Type | Meaning | Severity |
|---|---|---|
| `shard missing` | An object copy is missing from a replica | High - data at risk |
| `shard has extra object` | An unexpected object exists on a replica | Medium |
| `size mismatch` | Object size differs between replicas | High - potential corruption |
| `attr value mismatch` | Extended attributes differ | Medium |
| `data digest mismatch` | Actual data content differs | Critical - corruption |
| `omap digest mismatch` | Object map data differs | Medium |

## Parsing the Scrub Report Structure

```bash
# List inconsistent PGs in a pool
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rados list-inconsistent-pg mypool --format=json-pretty

# List inconsistent objects in a specific PG
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rados list-inconsistent-obj 3.1a --format=json-pretty

# Save PG query output for state inspection
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg 3.1a query > /tmp/pg-report.json
```

## Identifying Authoritative vs. Inconsistent Copies

When Ceph finds inconsistencies, it selects an "authoritative" copy. Understand which copy Ceph trusts:

```bash
# The primary OSD is usually considered authoritative
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg 3.1a query | python3 -m json.tool | grep -E "primary|up|acting"
```

## Acting on Scrub Results

```bash
# For shallow scrub inconsistencies - trigger a deep scrub to confirm
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg deep-scrub 3.1a

# For confirmed deep scrub inconsistencies - attempt repair
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg repair 3.1a
```

## Summary

Interpreting Ceph scrub results requires understanding the different inconsistency types and their severity. Shallow scrub inconsistencies involving size or attribute mismatches should be confirmed with a deep scrub before taking action. Data digest mismatches from deep scrubs indicate actual corruption and require careful investigation before repair. Use `rados list-inconsistent-obj` for detailed per-object inconsistency reports and OSD logs for the most granular error information. Exercise caution with `ceph pg repair` - it copies the primary's data to other replicas, which can propagate corruption if the primary holds the wrong data. For digest mismatch errors, inspect the inconsistency details and consider backing up affected objects before running repair.
