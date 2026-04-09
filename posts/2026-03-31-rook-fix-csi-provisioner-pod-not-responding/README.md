# How to Fix CSI Provisioner Pod Not Responding in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, CSI, Troubleshooting, Provisioner

Description: Diagnose and resolve CSI provisioner pod unresponsiveness in Rook-Ceph that blocks PVC creation and causes workloads to remain in Pending state.

---

## Overview

When the CSI provisioner pod is not responding, all new PVC requests in the cluster will hang in `Pending` state. This affects both RBD block volumes and CephFS shared filesystems. Identifying the root cause quickly is essential to restore storage provisioning.

## Initial Diagnosis

First, check if provisioner pods are running:

```bash
kubectl get pods -n rook-ceph | grep provisioner
```

Common states that indicate a problem:

```text
csi-rbdplugin-provisioner-xxx    2/4    Running    3    45m
csi-rbdplugin-provisioner-xxx    0/4    CrashLoopBackOff  5    12m
csi-rbdplugin-provisioner-xxx    4/4    Running    0    3m  (but not responding)
```

Check the provisioner logs for errors:

```bash
kubectl logs -n rook-ceph \
  -l app=csi-rbdplugin-provisioner \
  -c csi-provisioner \
  --tail=100
```

## Common Causes and Fixes

### Cause 1: Leader Election Deadlock

Multiple provisioner replicas may fail to elect a leader. Symptoms include provisioner pods running but all reporting "waiting for leadership":

```bash
kubectl logs -n rook-ceph \
  -l app=csi-rbdplugin-provisioner \
  -c csi-provisioner | grep -i leader
```

Fix by deleting all provisioner pods to force fresh leader election:

```bash
kubectl delete pod -n rook-ceph \
  -l app=csi-rbdplugin-provisioner
```

### Cause 2: Ceph Monitor Connectivity Loss

If the provisioner cannot reach Ceph monitors, CreateVolume calls time out:

```bash
kubectl logs -n rook-ceph \
  -l app=csi-rbdplugin-provisioner \
  -c csi-rbdplugin | grep -i "connection\|timeout\|monitor"
```

Verify monitor connectivity:

```bash
kubectl exec -n rook-ceph -it \
  deploy/rook-ceph-tools -- \
  ceph -s
```

### Cause 3: Resource Exhaustion (OOMKilled)

Check for OOMKilled containers:

```bash
kubectl get pod -n rook-ceph \
  -l app=csi-rbdplugin-provisioner \
  -o jsonpath='{range .items[*]}{.metadata.name}: {range .status.containerStatuses[*]}{.name}={.lastState.terminated.reason} {end}{"\n"}{end}'
```

If OOMKilled, increase memory limits in Helm values:

```yaml
csi:
  csiRBDProvisionerResource: |
    - name: csi-rbdplugin
      resource:
        limits:
          memory: 2Gi
```

### Cause 4: Stale Leader Election Lease

A stale Lease object used for leader election can block the provisioner. Delete the lease:

```bash
kubectl delete lease -n rook-ceph \
  rook-ceph.rbd.csi.ceph.com
```

## Forcing a Full Restart

When the cause is unclear, a full provisioner restart often resolves transient issues:

```bash
kubectl rollout restart deployment \
  -n rook-ceph \
  csi-rbdplugin-provisioner \
  csi-cephfsplugin-provisioner
```

Monitor the rollout:

```bash
kubectl rollout status deployment \
  -n rook-ceph \
  csi-rbdplugin-provisioner
```

## Verifying Recovery

After the fix, check that pending PVCs start binding:

```bash
kubectl get pvc -A | grep Pending
```

## Summary

CSI provisioner unresponsiveness in Rook is most commonly caused by leader election issues, monitor connectivity loss, or resource exhaustion. Restart provisioner pods to clear transient deadlocks, check monitor connectivity for network-related failures, and increase memory limits when OOMKill is the culprit.
