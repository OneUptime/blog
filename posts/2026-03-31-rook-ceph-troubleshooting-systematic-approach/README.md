# How to Approach Ceph Troubleshooting Systematically

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Troubleshooting, Debugging, Operation

Description: Apply a structured, step-by-step troubleshooting methodology to Ceph clusters to isolate root causes faster and avoid chasing symptoms.

---

Ceph issues can stem from networking, hardware, configuration, or software bugs. Without a systematic approach, you risk fixing symptoms while the real cause persists. This guide outlines a repeatable methodology.

## Step 1 - Establish a Baseline

Before diving into errors, understand what "normal" looks like for your cluster:

```bash
# Capture baseline during healthy operation
ceph status
ceph osd perf
ceph pg stat
rados bench -p rbd 10 write --no-cleanup
```

Store this output so you can compare against it when problems arise.

## Step 2 - Identify the Scope

Determine whether the issue is cluster-wide or isolated:

```bash
# Check which OSDs are affected
ceph osd tree
ceph osd dump | grep -i "down\|out"

# Check which PGs are in a bad state
ceph pg dump_stuck inactive
ceph pg dump_stuck unclean
```

Isolating scope tells you whether to look at a single host, a failure domain, or the whole cluster.

## Step 3 - Examine Recent Changes

Most Ceph incidents are triggered by a change. Check recent events:

```bash
# View cluster log for recent events
ceph log last 100

# Check OSD journal for specific OSD
ceph daemon osd.0 log flush
journalctl -u ceph-osd@0 --since "1 hour ago"
```

Ask: Was there a hardware swap, OS update, network change, or configuration push in the past 24 hours?

## Step 4 - Collect and Correlate Metrics

Use the Ceph dashboard or Prometheus to overlay metrics at the time of the incident:

```bash
# OSD latency
ceph osd perf

# Pool-level statistics
ceph osd pool stats

# Network counters per OSD
ceph daemon osd.0 perf dump | python3 -m json.tool | grep -E "op_latency|op_process_latency"
```

## Step 5 - Form and Test a Hypothesis

Write down your hypothesis before making changes. For example: "OSD 4 is slow because of a failing disk causing PG backfill to stall."

Test it:

```bash
smartctl -a /dev/sdb
ceph osd metadata 4 | grep -i "hostname\|device"
ceph pg map 1.4
```

If the hypothesis holds, proceed with a targeted fix. If not, revise and repeat.

## Step 6 - Apply the Fix and Verify

After making a change, verify the cluster recovers:

```bash
watch -n 5 ceph status
ceph health detail
```

Do not apply multiple fixes simultaneously - this makes it impossible to know which change resolved the issue.

## Summary

Systematic Ceph troubleshooting follows a clear sequence: establish a baseline, identify scope, examine recent changes, correlate metrics, hypothesize, and verify. This process prevents random trial-and-error and produces documented evidence of what went wrong and why. Keeping notes at each step also generates material for post-mortem reports.
