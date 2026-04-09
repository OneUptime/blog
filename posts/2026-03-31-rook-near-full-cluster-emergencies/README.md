# How to Handle Near-Full Cluster Emergencies in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Emergency, Capacity, Near-Full, Recovery, Operation

Description: Respond to near-full and full Ceph cluster emergencies with step-by-step procedures to restore write access, free capacity, and stabilize the cluster without data loss.

---

## Overview

A full Ceph cluster stops accepting writes, causing application failures across all services using Ceph storage. This is a critical incident requiring immediate, systematic response. This guide provides an emergency runbook for near-full and full cluster scenarios.

## Understanding the Symptoms

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph status
```

Near-full (85%+):
```text
HEALTH_WARN 2 nearfull osd(s)
```

Full (95%+):
```text
HEALTH_ERR 1 full osd(s); writing blocked
```

## Step 1 - Assess the Situation

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- bash

# Cluster overview
ceph df

# Which OSDs are full?
ceph osd df | sort -k9 -rn | head -10

# How much free space remains?
ceph df --format json | jq -r '.stats | {
  avail_tb: (.total_avail_bytes / 1099511627776),
  used_pct: (.total_used_raw_ratio * 100)
}'
```

## Step 2 - Immediate Triage - Stop Growth

Stop any non-critical workloads writing to Ceph immediately:

```bash
# Scale down non-critical deployments
kubectl scale deployment --all --replicas=0 -n staging

# Suspend backup CronJobs that write to Ceph
kubectl patch cronjob backup-job -n rook-ceph -p '{"spec":{"suspend":true}}'
```

## Step 3 - Raise Full Ratio (Emergency Only)

Buy time by temporarily raising the full ratio:

```bash
# CAUTION: This is a temporary emergency measure only
# Raises full from 0.95 to 0.97 - 2% more space
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph osd set-full-ratio 0.97

# Verify writes are now working
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph health
```

## Step 4 - Free Space Immediately

Identify and remove large unnecessary objects:

```bash
# Find pools with most data
ceph df detail | sort -k3 -rn | head -5

# List snapshots that can be deleted
rbd snap ls replicapool/myimage --all

# Delete old snapshots
rbd snap purge replicapool/old-image

# Delete completed jobs and their PVCs
kubectl get pvc -A | grep -v Bound
kubectl delete pvc old-completed-job-pvc -n jobs
```

Check for orphaned RBD images:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd ls replicapool | head -20

# Check image sizes
rbd ls replicapool | xargs -I{} rbd du replicapool/{} | sort -k2 -rn | head -10
```

## Step 5 - Reweight Heavy OSDs

If certain OSDs are much fuller than others, reweight them:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- bash

# Check OSD weight distribution
ceph osd df | awk '{print $1, $7, $9}' | sort -k3 -rn | head -10

# Reduce weight of nearly-full OSD to push data off it
ceph osd reweight 5 0.9  # OSD 5, reduce weight by 10%

# Watch data migrate
watch -n5 "ceph status"
```

## Step 6 - Add Emergency Capacity

If you have spare hardware available:

```bash
# Add temporary OSD nodes to the Rook CephCluster
kubectl edit cephcluster rook-ceph -n rook-ceph

# Add the new node to the storage spec
# The new OSDs will start receiving data automatically
```

Or add empty drives to existing nodes:

```yaml
spec:
  storage:
    nodes:
      - name: existing-node
        devices:
          - name: sda  # existing
          - name: sdb  # NEW empty drive
```

## Step 7 - Monitor Recovery

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- bash

# Watch cluster return to healthy state
watch -n10 "ceph status; echo '---'; ceph df | head -5"

# Check that nearfull OSDs are draining
ceph osd df | sort -k9 -rn | head -5
```

## Step 8 - Post-Emergency Actions

After stabilizing:

```bash
# Return full ratio to default setting
ceph osd set-full-ratio 0.95
ceph osd set-nearfull-ratio 0.85

# Conduct post-mortem
ceph log last 50 | grep -E "full|nearfull|HEALTH_ERR"

# Update capacity monitoring thresholds
# Schedule hardware procurement immediately
```

## Prevention Checklist

```bash
# Monthly capacity review
ceph df
ceph osd df | sort -k9 -rn | head -5

# Verify alerts are configured and firing
kubectl get prometheusrule -n monitoring | grep ceph

# Verify nearfull threshold is set conservatively
ceph osd dump | grep nearfull
```

## Summary

Near-full Ceph cluster emergencies require immediate, systematic action: stop unnecessary writes, temporarily raise the full ratio to restore writes, free space through snapshot deletion and orphaned PVC cleanup, and reweight overloaded OSDs to distribute data. The real fix is always adding capacity - the emergency steps only buy time. Post-incident, tighten capacity monitoring thresholds and establish a 90-day procurement trigger to prevent recurrence.
