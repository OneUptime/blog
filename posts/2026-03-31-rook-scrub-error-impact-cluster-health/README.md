# How to Understand Scrub Error Impact on Cluster Health

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Scrubbing, Cluster Health, Storage

Description: Learn how scrub errors affect Ceph cluster health, what warning states they trigger, and how to interpret and respond to scrub error messages in Rook-Ceph.

---

## What Are Scrub Errors?

Ceph scrubbing is a background process that verifies data integrity by comparing object replicas or erasure-coded chunks. When inconsistencies are found, Ceph records scrub errors and reflects them in the cluster health output.

Scrub errors can indicate:
- Bit rot or silent data corruption on disk
- Incomplete writes due to power loss
- Bugs in OSD or filesystem code
- Hardware failures (bad sectors, faulty HBAs)

## How Scrub Errors Appear in Cluster Health

Check cluster health to see scrub error status:

```bash
ceph health detail
```

Example output when scrub errors exist:

```text
HEALTH_ERR 1 scrub errors
OSD_SCRUB_ERRORS 1 scrub errors
    pg 2.5 is inconsistent
```

The cluster transitions through these states based on scrub findings:
- `HEALTH_OK` - no scrub issues
- `HEALTH_WARN` - potential issues flagged
- `HEALTH_ERR` - confirmed inconsistencies found

## Inspecting Inconsistent Placement Groups

List all inconsistent PGs:

```bash
ceph health detail | grep inconsistent
```

Get detailed information about a specific PG:

```bash
ceph pg 2.5 query | python3 -m json.tool | grep -A 20 "inconsistent"
```

Trigger a scrub on a specific OSD and then list inconsistent PGs:

```bash
ceph osd scrub <osd-id>
ceph pg dump | grep inconsistent
```

## Responding to Scrub Errors

Repair inconsistent PGs using:

```bash
ceph pg repair 2.5
```

Verify the repair completed:

```bash
ceph health detail
ceph pg 2.5 query | grep state
```

For Rook-managed clusters, you can trigger repairs via the toolbox pod:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg repair 2.5
```

## Impact on Cluster Operations

Scrub errors have the following cluster-wide effects:

- Cluster enters `HEALTH_ERR` state if inconsistencies are confirmed
- Client I/O continues normally even when scrub errors are present
- Replication may pause for affected PGs during repair
- Alerts are triggered in Prometheus/Alertmanager if configured

Monitor scrub error counts over time:

```bash
ceph pg dump_stuck inconsistent
ceph status --format json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['pgmap'])"
```

## Preventing Scrub Errors

Keep firmware updated, use enterprise SSDs or HDDs with power-loss protection, and schedule regular deep scrubs:

```bash
ceph osd pool set <pool-name> deep_scrub_interval 604800
```

Enable SMART monitoring to catch disk failures early:

```bash
ceph device monitoring on
```

## Summary

Scrub errors signal data inconsistencies in Ceph and cause the cluster to enter a degraded health state. Prompt inspection using `ceph health detail` and `ceph pg repair` resolves most issues. Monitoring scrub error trends proactively helps catch hardware failures before data is lost.
