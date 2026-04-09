# How to Set and Get Pool Values in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pool, Configuration, Kubernetes

Description: Learn how to use ceph osd pool set and ceph osd pool get to configure and inspect pool parameters in a Rook-Ceph cluster.

---

Ceph pools have dozens of configurable parameters that affect replication, performance, safety, and maintenance behavior. The `ceph osd pool set` and `ceph osd pool get` commands are the primary tools for managing these values at runtime.

## Basic Syntax

```bash
# Set a pool parameter
ceph osd pool set <pool-name> <key> <value>

# Get a specific pool parameter
ceph osd pool get <pool-name> <key>

# Get all pool parameters
ceph osd pool get <pool-name> all
```

Access these from the Rook toolbox:

```bash
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- bash
```

## Common Pool Parameters

### Replication Size

```bash
# Set number of replicas
ceph osd pool set replicapool size 3

# Set minimum replicas for I/O acceptance
ceph osd pool set replicapool min_size 2

# Verify
ceph osd pool get replicapool size
ceph osd pool get replicapool min_size
```

### Placement Group Count

```bash
# Set PG count (use powers of 2)
ceph osd pool set replicapool pg_num 128
ceph osd pool set replicapool pgp_num 128

# Check autoscale mode
ceph osd pool get replicapool pg_autoscale_mode
```

## Read All Parameters at Once

```bash
ceph osd pool get replicapool all
```

Sample output:

```text
size: 3
min_size: 2
pg_num: 128
pgp_num: 128
crush_rule: replicated_rule
hashpspool: true
nodelete: false
nopgchange: false
nosizechange: false
write_fadvise_dontneed: false
noscrub: false
nodeep-scrub: false
use_gmt_hitset: 1
pg_autoscale_mode: on
```

## Quota Parameters

```bash
# Limit maximum number of objects
ceph osd pool set replicapool max_objects 1000000

# Limit maximum bytes (10 GiB)
ceph osd pool set replicapool max_bytes 10737418240

# Check quotas
ceph osd pool get replicapool max_objects
ceph osd pool get replicapool max_bytes
```

## Autoscaling Parameters

```bash
# Enable autoscaling
ceph osd pool set replicapool pg_autoscale_mode on

# Set target size ratio for autoscaler hint
ceph osd pool set replicapool target_size_ratio 0.2

# Check autoscaler status
ceph osd pool autoscale-status
```

## Scrubbing Parameters

```bash
# Minimum and maximum scrub intervals (in seconds)
ceph osd pool set replicapool scrub_min_interval 86400
ceph osd pool set replicapool scrub_max_interval 604800
ceph osd pool set replicapool deep_scrub_interval 604800
```

## View Pool Parameters Across All Pools

```bash
ceph osd dump | grep -A 30 "pool '"
```

Or use JSON output for scripting:

```bash
ceph osd pool ls detail --format json | python3 -m json.tool
```

## Summary

`ceph osd pool set` and `ceph osd pool get` provide direct runtime control over pool parameters in Ceph. Key parameters include `size`, `min_size`, `pg_num`, quotas, scrub intervals, and autoscaling settings. In Rook-managed clusters, prefer managing these through the `CephBlockPool` CRD `spec.parameters` field so changes survive reconciliation cycles.
