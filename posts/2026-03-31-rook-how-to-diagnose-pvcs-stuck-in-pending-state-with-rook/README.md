# How to Diagnose PVCs Stuck in Pending State with Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Troubleshooting, PVC, Kubernetes, Storage

Description: Diagnose and fix PersistentVolumeClaims stuck in Pending state in Rook-Ceph by checking provisioner logs, CSI pods, and pool health.

---

## Overview

A PVC stuck in `Pending` state is one of the most common issues in Rook deployments. The root causes range from a missing or misconfigured StorageClass to CSI driver errors, pool health issues, or capacity problems. This guide provides a systematic approach to diagnosing and resolving this issue.

## Step 1 - Describe the PVC

The first step is always to describe the PVC for events:

```bash
kubectl describe pvc <pvc-name> -n <namespace>
```

Look at the `Events` section at the bottom. Common messages include:

```text
Events:
  Type     Reason                Age   From                                                               Message
  ----     ------                ----  ----                                                               -------
  Normal   ExternalProvisioning  30s   persistentvolume-controller                                        waiting for a volume to be created, either by external provisioner "rook-ceph.rbd.csi.ceph.com" or manually created by system administrator
  Warning  ProvisioningFailed    15s   rook-ceph.rbd.csi.ceph.com_csi-rbdplugin-provisioner-xxx-yyy      failed to provision volume with StorageClass "rook-ceph-block": rpc error: code = Internal
```

## Step 2 - Check the CSI Provisioner Logs

The CSI provisioner pod contains detailed error logs:

```bash
kubectl -n rook-ceph logs deploy/csi-rbdplugin-provisioner \
  -c csi-provisioner --tail=50
```

For CephFS provisioner:

```bash
kubectl -n rook-ceph logs deploy/csi-cephfsplugin-provisioner \
  -c csi-provisioner --tail=50
```

Also check the main CSI plugin container:

```bash
kubectl -n rook-ceph logs deploy/csi-rbdplugin-provisioner \
  -c csi-rbdplugin --tail=50
```

## Step 3 - Verify the StorageClass

Confirm the StorageClass exists and references the correct pool:

```bash
kubectl get storageclass rook-ceph-block -o yaml
```

Check that `clusterID` matches the Rook namespace and `pool` exists:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool ls | grep replicapool
```

## Step 4 - Check CSI Secrets

The StorageClass references provisioner and node secrets. Verify they exist:

```bash
kubectl -n rook-ceph get secret rook-csi-rbd-provisioner
kubectl -n rook-ceph get secret rook-csi-rbd-node
```

If missing, restart the Rook operator to recreate them automatically:

```bash
kubectl -n rook-ceph rollout restart deploy/rook-ceph-operator
```

You can also verify the underlying Ceph auth entity exists:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get client.csi-rbd-provisioner
```

## Step 5 - Check Ceph Cluster Health

An unhealthy pool prevents provisioning:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
```

If you see `HEALTH_ERR` with `1 pool(s) have no replicas configured`, the pool is not properly replicated. Check the pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool get replicapool size
```

## Step 6 - Check CSI Driver Registration

Verify the CSI driver is registered in Kubernetes:

```bash
kubectl get csidrivers | grep rook
```

Expected output should include both Rook CSI drivers:

```text
rook-ceph.cephfs.csi.ceph.com    true             false            false             <unset>         false               Persistent   10d
rook-ceph.rbd.csi.ceph.com       true             false            false             <unset>         false               Persistent   10d
```

If missing, restart the Rook operator:

```bash
kubectl -n rook-ceph rollout restart deploy/rook-ceph-operator
```

## Step 7 - Check Node Plugin DaemonSet

The node plugin must be running on the node where the pod is scheduled:

```bash
kubectl -n rook-ceph get pods -l app=csi-rbdplugin -o wide
```

If a node plugin pod is not running on the target node, check for taints or node selectors.

## Step 8 - Check Capacity

Insufficient capacity also causes provisioning failures:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph df
```

If the pool is near or at capacity, add OSDs or increase storage.

## Summary

Diagnosing pending PVCs in Rook follows a systematic path: check PVC events first, then CSI provisioner logs, verify StorageClass and secrets, and finally check Ceph cluster health and capacity. The most common root causes are misconfigured StorageClass parameters, missing CSI secrets, unhealthy Ceph pools, or cluster capacity issues. Addressing these in order resolves most provisioning failures.
