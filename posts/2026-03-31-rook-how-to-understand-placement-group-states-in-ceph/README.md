# How to Understand Placement Group States in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Storage, Placement Group, Distributed Storage

Description: Learn what each Ceph placement group state means, how to interpret PG state combinations, and how to respond when PGs are in degraded or blocked states.

---

## What Are Placement Group States

Placement Groups (PGs) are internal shards that Ceph uses to distribute object data across OSDs. Every pool has a configured number of PGs, and each PG can be in one or more states at any given time. Understanding these states is critical for diagnosing cluster health issues.

You can list all PG states with:

```bash
ceph pg stat
```

Or get a detailed breakdown:

```bash
ceph pg dump --format json-pretty | jq '.pg_stats[] | {pgid: .pgid, state: .state}'
```

## Common PG States Explained

### active+clean

This is the ideal state. The PG is active (can serve I/O) and clean (all replicas are in sync). A healthy cluster should show all PGs in this state.

```bash
ceph -s
# Look for: x pgs active+clean
```

### degraded

One or more object replicas are missing. The cluster is still operational but resilience is reduced. This typically happens when an OSD goes down.

```bash
ceph pg dump_stuck degraded
```

### recovering

Ceph is actively copying data to restore missing replicas. This is a transient state following an OSD failure or addition.

### backfilling

Similar to recovering, but happens when a new OSD is added and PGs are being rebalanced. Backfill is lower priority than normal I/O.

```bash
ceph pg dump pgs_brief | grep backfill
```

### peering

OSDs hosting a PG are negotiating to establish an authoritative history of the PG contents. PGs cannot serve I/O while peering.

```bash
ceph pg dump_stuck unclean
```

### stale

The primary OSD of a PG has not reported status recently. This may indicate a crashed or hung OSD.

```bash
ceph pg dump_stuck stale
```

### undersized

The PG has fewer acting OSDs than the pool's configured size. This is a warning that data protection is below the desired level.

### inconsistent

Scrubbing found differences between replicas. Immediate attention is required.

```bash
ceph health detail | grep inconsistent
```

### repair

Ceph is attempting to fix inconsistencies found during scrubbing.

## State Combinations

PGs often have compound states. Here are common combinations and what they mean:

```text
active+clean                  - Normal, healthy
active+degraded               - One replica missing, still serving I/O
active+recovering+degraded    - Recovering a lost replica while degraded
active+backfilling+degraded   - Backfilling while undersized
active+undersized+degraded    - Lost replicas, needs more OSDs
peering                       - Negotiating PG history (blocks I/O)
active+clean+scrubbing        - Routine data validation in progress
active+clean+scrubbing+deep   - Deep scrub running (slower)
stale+active+clean            - Primary OSD not reporting (investigate)
```

## Investigating Stuck PGs

```bash
# List all stuck PGs
ceph pg dump_stuck

# List stuck inactive PGs
ceph pg dump_stuck inactive

# List stuck unclean PGs
ceph pg dump_stuck unclean

# Get detailed info for a specific PG
ceph pg <pgid> query
```

## Forcing Recovery

If PGs are stuck peering due to missing OSDs, you can temporarily lower the min_size:

```bash
ceph osd pool set <pool-name> min_size 1
# WARNING: Only use this as a last resort - data loss risk is increased
```

To prioritize recovery of a specific PG:

```bash
ceph pg force-recovery <pgid>
```

To repair a PG with inconsistencies found by scrubbing:

```bash
ceph pg repair <pgid>
```

## Monitoring PG State Transitions

Use the Ceph dashboard or Prometheus metrics to track state transitions over time:

```bash
# Watch PG states in real time
watch -n 5 ceph -s

# Check total PG counts by state
ceph pg dump summary 2>/dev/null | head -20
```

## Summary

Placement group states in Ceph reflect the health and activity of data shards distributed across OSDs. The normal state is `active+clean`, while states like `degraded`, `peering`, `stale`, and `inconsistent` all require investigation. Using commands like `ceph pg dump_stuck` and `ceph pg <pgid> query` helps pinpoint which PGs need attention and why.
