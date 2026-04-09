# How to Handle Multiple Simultaneous OSD Failures in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Troubleshooting, OSD, Recovery, Operation

Description: Respond to multiple simultaneous OSD failures in Ceph by assessing data availability, preventing cascading failures with noout flags, and prioritizing recovery operations.

---

## Risk Tiers for Multiple OSD Failures

The danger of multiple simultaneous failures depends on your replication factor and whether failed OSDs share the same failure domain:

- **Replication 3, 2 failures on different hosts**: Data is degraded but accessible (min_size=2 satisfied)
- **Replication 3, 2 failures on same host**: Same risk - still accessible if third copy exists
- **Replication 3, 3+ failures covering all replicas**: Objects become unavailable (PGs go inactive)
- **Erasure k=4,m=2, 3+ failures**: Data loss if more than m=2 shards are gone

## Immediate Response Checklist

When multiple OSDs fail simultaneously:

```bash
# 1. Assess cluster health immediately
ceph health detail
ceph -s

# 2. Count down and out OSDs
ceph osd tree | grep -E "down|out"
ceph osd stat

# 3. Set noout to prevent premature rebalancing
ceph osd set noout

# 4. Check if any PGs are unavailable (no active primary)
ceph pg ls inactive
ceph pg ls unclean

# 5. Count affected PGs
ceph pg stat
```

## Why Set noout Immediately

By default, Ceph marks OSDs "out" after 10 minutes (`mon_osd_down_out_interval = 600s`) once they are reported as down. When out, Ceph starts copying data to remaining OSDs. With multiple failures, this can overload surviving OSDs.

```bash
# Prevent auto-out during investigation
ceph osd set noout
ceph osd set norebalance

# Check noout is set
ceph osd dump | grep flags
```

## Diagnosing the Root Cause

Identify WHY multiple OSDs failed before recovering:

```bash
# Check OSD logs on the affected node
journalctl -u ceph-osd@0 --since "1 hour ago" | tail -100
journalctl -u ceph-osd@1 --since "1 hour ago" | tail -100

# Look for common failure patterns
dmesg | grep -i "I/O error\|ata\|error" | tail -50
smartctl -a /dev/sda | grep -i "failed\|error"

# Check for network split-brain
ceph mon stat
ceph quorum_status --format json-pretty | grep -E "quorum|leader"
```

Common causes of multiple simultaneous failures:
- Node reboot/power failure (all OSDs on that node go down)
- Network partition (OSDs unreachable, not actually failed)
- RAID controller failure
- Storage backplane failure

## Recovering After Hardware Fix

Once the underlying cause is resolved:

```bash
# Start OSDs that can recover
systemctl start ceph-osd@0
systemctl start ceph-osd@1

# Watch them come back
watch -n 10 'ceph osd tree | grep -E "down|in|out"'

# Once OSDs are back in, remove the noout flag
ceph osd unset noout
ceph osd unset norebalance
```

## Handling Permanently Failed OSDs

If some drives cannot be recovered:

```bash
# Mark failed OSDs out manually
ceph osd out osd.0 osd.1

# Wait for recovery to begin
ceph -s | grep degraded

# Once data is recovered to surviving OSDs, purge the dead OSDs
ceph osd purge osd.0 --yes-i-really-mean-it
ceph osd purge osd.1 --yes-i-really-mean-it
```

## Rook-Specific Recovery Steps

In Rook environments, force OSD restart via pod deletion:

```bash
# Delete failed OSD pods to trigger restart
kubectl delete pod -n rook-ceph -l app=rook-ceph-osd,ceph-osd-id=0
kubectl delete pod -n rook-ceph -l app=rook-ceph-osd,ceph-osd-id=1

# Watch pods recover
kubectl get pods -n rook-ceph -w | grep osd
```

If pods won't recover, investigate the OSD job:

```bash
kubectl get jobs -n rook-ceph | grep osd
kubectl describe job -n rook-ceph rook-ceph-osd-prepare-node1
kubectl logs -n rook-ceph $(kubectl get pod -n rook-ceph -l job-name=rook-ceph-osd-prepare-node1 -o name)
```

## Summary

Multiple simultaneous OSD failures require immediate triage: set `noout` to freeze automatic data migration, assess which PGs are affected, diagnose the root cause before recovering, and then systematically bring OSDs back online or purge permanently failed ones. In Rook environments, pod deletion triggers automatic OSD restart for transient failures. The key principle is to understand the failure scope completely before initiating recovery to avoid making the situation worse.
