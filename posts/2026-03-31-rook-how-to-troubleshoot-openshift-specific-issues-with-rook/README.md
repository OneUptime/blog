# How to Troubleshoot OpenShift-Specific Issues with Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OpenShift, Troubleshooting, Kubernetes, Storage

Description: Troubleshoot common OpenShift-specific issues with Rook-Ceph, including SCC permissions, SCCs for CSI pods, and OCP-specific networking constraints.

---

## Overview

Running Rook-Ceph on OpenShift Container Platform (OCP) introduces additional constraints compared to vanilla Kubernetes. OpenShift's Security Context Constraints (SCCs), default namespace restrictions, and network policies can cause Rook deployments to fail in ways that don't occur on standard Kubernetes. This guide covers the most common OpenShift-specific issues.

## Issue 1 - CSI Pods Failing Due to SCC Violations

OpenShift SCCs restrict what security capabilities pods can use. Rook CSI pods need privileged access.

### Symptoms

CSI pods crash with errors like:

```text
Error: container has runAsNonRoot and image has non-numeric user (nobody), cannot verify user is non-root
```

Or pods are stuck in `Pending` with:

```text
0/3 nodes are available: 3 node(s) had taint that the pod didn't tolerate
```

### Fix - Apply Privileged SCC

Grant the required SCCs to Rook service accounts:

```bash
oc adm policy add-scc-to-user privileged \
  system:serviceaccount:rook-ceph:rook-ceph-system

oc adm policy add-scc-to-user privileged \
  system:serviceaccount:rook-ceph:rook-csi-rbd-plugin-sa

oc adm policy add-scc-to-user privileged \
  system:serviceaccount:rook-ceph:rook-csi-cephfs-plugin-sa
```

## Issue 2 - Operator Pod Cannot Access Host Network

### Symptoms

The Rook operator fails to discover OSDs or monitors:

```text
failed to connect to mon: dial tcp: lookup rook-ceph-mon-a: no such host
```

### Fix - Use HostNetwork for Rook Operator

Enable host network in the CephCluster spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  network:
    provider: host
```

Or add the `hostaccess` SCC:

```bash
oc adm policy add-scc-to-user hostaccess \
  system:serviceaccount:rook-ceph:rook-ceph-system
```

## Issue 3 - OSD Pods Cannot Mount Devices

### Symptoms

OSD pods fail with device access errors:

```text
failed to stat /dev/sdb: no such file or directory
```

### Fix - Apply SCC for Device Access

```bash
oc adm policy add-scc-to-user privileged \
  system:serviceaccount:rook-ceph:rook-ceph-osd
```

Also ensure the `ROOK_HOSTPATH_REQUIRES_PRIVILEGED` environment variable is set to `"true"` in the operator deployment, which causes OSD pods to run with a privileged security context.

## Issue 4 - Namespace Network Policy Blocking CSI

### Symptoms

PVC provisioning fails with network-related errors from the CSI provisioner.

### Fix - Allow Traffic Between Namespaces

Create a NetworkPolicy that allows the CSI pods to communicate:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-csi-traffic
  namespace: rook-ceph
spec:
  podSelector: {}
  ingress:
    - from:
        - namespaceSelector: {}
  egress:
    - to:
        - namespaceSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

## Issue 5 - OCP 4.x CephFS Mount Failures

### Symptoms

Pods using CephFS PVCs fail to start with:

```text
mount error: ceph filesystem not supported by the system
```

Or kernel module loading errors like `modprobe: FATAL: Module ceph not found`.

### Fix - Enable FUSE Mounts

If kernel CephFS module is unavailable, switch to FUSE mounts in the CSI config:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-ceph-operator-config
  namespace: rook-ceph
data:
  ROOK_CSI_ENABLE_CEPHFS: "true"
  CSI_FORCE_CEPHFS_KERNEL_CLIENT: "false"
```

## Issue 6 - Monitoring Integration with OCP Prometheus

OpenShift uses its own Prometheus instance. Configure Rook metrics for OCP monitoring:

```bash
oc label namespace rook-ceph openshift.io/cluster-monitoring=true
```

Then create a ServiceMonitor:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rook-ceph-mgr
  namespace: rook-ceph
  labels:
    team: rook
spec:
  namespaceSelector:
    matchNames:
      - rook-ceph
  selector:
    matchLabels:
      app: rook-ceph-mgr
  endpoints:
    - port: http-metrics
      interval: 5s
```

## Summary

OpenShift-specific Rook issues most commonly stem from SCC restrictions preventing privileged operations needed by CSI pods and OSD pods. Grant the `privileged` SCC to the relevant service accounts, ensure host network access for the operator if needed, and handle network policies that block CSI-to-cluster communication. For monitoring, label the `rook-ceph` namespace for OCP cluster monitoring and deploy ServiceMonitor resources.
