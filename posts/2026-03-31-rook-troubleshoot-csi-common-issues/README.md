# How to Troubleshoot Rook-Ceph CSI Common Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, CSI, Troubleshooting, Storage

Description: A comprehensive guide to resolving the most common Rook-Ceph CSI issues including driver registration failures, volume operation errors, and plugin crashes.

---

## Overview

The Rook-Ceph CSI layer translates Kubernetes volume requests into Ceph operations. Issues can occur at any stage: driver registration, volume provisioning, volume staging, or mounting. This guide covers the most frequent CSI issues and their solutions.

## Issue 1: CSI Driver Not Registered

**Symptom:** PVCs fail with "no plugin available to handle the request"

**Diagnosis:**
```bash
kubectl get csidrivers | grep rook
```

If no Rook CSI drivers appear, the plugin DaemonSet is not running:

```bash
kubectl get daemonset -n rook-ceph | grep csi
kubectl get pod -n rook-ceph | grep csi
```

**Fix:** Ensure the operator Helm chart is installed and CSI is enabled:
```bash
helm upgrade rook-ceph rook-release/rook-ceph \
  --set csi.enableRbdDriver=true
```

## Issue 2: ProvisioningFailed - Error Getting Secret

**Symptom:** PVC events show "error getting secret"

**Diagnosis:**
```bash
kubectl get secret -n rook-ceph | grep rook-csi
```

**Fix:** If secrets are missing, the operator may not have created them. Check operator logs and trigger reconciliation:

```bash
kubectl delete secret -n rook-ceph \
  rook-csi-rbd-provisioner \
  rook-csi-rbd-node 2>/dev/null

kubectl rollout restart deployment rook-ceph-operator -n rook-ceph
```

The operator recreates CSI secrets during its next reconciliation.

## Issue 3: Volume Stuck in Terminating

**Symptom:** PV or PVC in Terminating state that never completes deletion

**Diagnosis:**
```bash
kubectl get pv <pv-name> -o yaml | grep finalizer
```

**Fix:** Remove the volume finalizer:

```bash
kubectl patch pv <pv-name> \
  -p '{"metadata":{"finalizers":null}}'
```

Then manually delete the RBD image:
```bash
kubectl exec -n rook-ceph -it deploy/rook-ceph-tools -- \
  rbd rm replicapool/<image-name>
```

## Issue 4: CephFS Volume Mount Fails - No Key

**Symptom:** Pod events show "mount failed: no key"

**Diagnosis:**
```bash
kubectl get secret -n rook-ceph | grep cephfs
```

Verify the node-stage secret contains a valid Ceph key:

```bash
kubectl get secret rook-csi-cephfs-node -n rook-ceph \
  -o jsonpath='{.data.adminKey}' | base64 -d
```

**Fix:** If empty or wrong, restart the operator to regenerate secrets.

## Issue 5: RBD Image Feature Not Supported

**Symptom:** NodeStageVolume error "image features not supported"

**Diagnosis:**
```bash
kubectl logs -n rook-ceph -l app=csi-rbdplugin \
  -c csi-rbdplugin | grep feature
```

**Fix:** Reduce image features in the StorageClass:

```yaml
parameters:
  imageFeatures: layering
```

Avoid `exclusive-lock`, `journaling`, and `object-map` on older kernel clients.

## Issue 6: CSI Plugin DaemonSet Pods in CrashLoopBackOff

```bash
kubectl describe pod -n rook-ceph <csi-rbdplugin-pod> | \
  grep -A5 "Last State"

kubectl logs -n rook-ceph <csi-rbdplugin-pod> \
  -c csi-rbdplugin --previous | tail -50
```

Common causes: resource limits too low (OOMKilled), socket conflicts, or missing host paths. Increase memory limits:

```yaml
csi:
  csiRBDPluginResource: |
    - name: csi-rbdplugin
      resources:
        limits:
          memory: 2Gi
```

## Summary

Rook-Ceph CSI troubleshooting follows a consistent pattern: check driver registration, verify secrets, inspect provisioner and node plugin logs, and address the specific component failure. The most common issues - missing secrets, unregistered drivers, and insufficient resources - have straightforward fixes that restore normal provisioning quickly.
