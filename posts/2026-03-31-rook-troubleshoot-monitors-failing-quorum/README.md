# How to Troubleshoot Monitors Failing to Form Quorum

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitor, Troubleshooting, Quorum

Description: Diagnose and fix Ceph monitors that fail to form quorum in Rook clusters, covering network, clock, and configuration issues.

---

## Why Monitors Fail to Form Quorum

Monitor quorum failure in Ceph has several common causes:

1. Network connectivity issues preventing monitors from reaching each other
2. Clock skew exceeding the Ceph tolerance (default 0.05 seconds)
3. Corrupted monitor data directory
4. Mismatched monitor addresses in the monmap
5. Insufficient disk space on the monitor's data volume

Understanding which cause applies requires a systematic approach.

## Step 1 - Check MON Pod Status

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-mon -o wide
kubectl -n rook-ceph describe pod rook-ceph-mon-a-<suffix>
```

Look for container restart counts, resource limits exceeded, or node assignment issues.

## Step 2 - Check MON Logs

```bash
kubectl -n rook-ceph logs rook-ceph-mon-a-<suffix> --previous | tail -100
kubectl -n rook-ceph logs rook-ceph-mon-b-<suffix> | grep -E "error|warn|quorum|clock"
```

Look for messages about:
- `clock skew` - indicates NTP desynchronization
- `connection refused` - indicates network issues
- `no such file or directory` - indicates missing data directory

## Step 3 - Test Monitor Network Connectivity

Check that monitor pods can reach each other on port 6789 (v1) and 3300 (v2):

```bash
# From inside one MON pod
kubectl -n rook-ceph exec -it rook-ceph-mon-a-<suffix> -- \
  bash -c "timeout 5 bash -c '</dev/tcp/rook-ceph-mon-b/3300' && echo OK || echo FAIL"
```

## Step 4 - Check Clock Synchronization

Verify NTP is running on all nodes:

```bash
for node in $(kubectl get nodes -o name); do
  echo "=== $node ==="
  kubectl debug node/${node#node/} -it --image=busybox -- chroot /host timedatectl 2>/dev/null | head -5
done
```

Monitor logs will show `clock skew too great` if this is the issue.

## Step 5 - Check Monitor Data Directory

Verify the monitor data volume is mounted and has available space:

```bash
kubectl -n rook-ceph exec -it rook-ceph-mon-a-<suffix> -- \
  df -h /var/lib/ceph/mon
```

If disk is full, you must increase PVC size or clean up old data.

## Step 6 - Verify Monmap Consistency

Check the monmap for address mismatches:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mon dump
```

Compare the addresses in the monmap against the actual pod IPs and service endpoints:

```bash
kubectl -n rook-ceph get svc -l app=rook-ceph-mon
```

## Force Rebuild of Monitor ConfigMap

> **Warning**: This is a destructive operation. Back up your Rook cluster state before proceeding. Only use this as a last resort when monitors cannot recover through normal means.

If the Rook ConfigMap has stale endpoints:

```bash
kubectl -n rook-ceph delete configmap rook-ceph-mon-endpoints
kubectl -n rook-ceph delete deploy rook-ceph-mon-a rook-ceph-mon-b rook-ceph-mon-c
```

The Rook operator will detect the missing resources and recreate the monitor deployments, reattaching the existing PVCs. If the underlying monitor data is intact, the monitors should rejoin and form quorum.

## Summary

Monitor quorum failures trace to network isolation, clock skew, disk exhaustion, or stale monmap addresses. Systematically check pod status, logs, network connectivity, NTP sync, and disk space to identify the root cause. Most issues resolve by fixing the underlying infrastructure problem and restarting the affected MON pods.
