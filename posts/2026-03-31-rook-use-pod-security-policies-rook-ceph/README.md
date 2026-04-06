# How to Secure Rook-Ceph with Pod Security Admission

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Security, Pod Security, Kubernetes

Description: Secure Rook-Ceph pods using Kubernetes Pod Security Standards and Pod Security Admission to enforce privilege controls for OSD, MON, MGR, and operator pods in modern Kubernetes clusters.

---

## Pod Security in Modern Kubernetes

PodSecurityPolicy (PSP) was deprecated in Kubernetes 1.21 and removed in Kubernetes 1.25. For modern clusters, use Pod Security Admission (PSA) with Pod Security Standards (PSS). Rook-Ceph requires certain privileges that must be explicitly permitted at the namespace level.

## Understanding Rook's Privilege Requirements

Ceph OSD pods need:
- `privileged: true` to access block devices
- `hostNetwork` in some configurations
- `hostPID` is not required

Ceph MON and MGR pods need:
- No special host privileges in most deployments
- Capability to bind to ports below 1024

## Configuring Pod Security Admission

Apply privileged PSS to the rook-ceph namespace:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: rook-ceph
  labels:
    pod-security.kubernetes.io/enforce: privileged
    pod-security.kubernetes.io/enforce-version: latest
    pod-security.kubernetes.io/audit: privileged
    pod-security.kubernetes.io/warn: privileged
```

For tighter control, use `restricted` at the cluster level and only allow `privileged` in the rook-ceph namespace:

```bash
kubectl label namespace rook-ceph \
  pod-security.kubernetes.io/enforce=privileged \
  pod-security.kubernetes.io/enforce-version=latest
```

## Restricting Application Namespaces

Application namespaces that only use Ceph storage through CSI should use `restricted` mode:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

## Security Context for Rook Operator

Set security context on the Rook operator deployment (in Helm values or direct manifest edit):

```yaml
securityContext:
  runAsNonRoot: false
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
    add:
      - NET_BIND_SERVICE
```

## OSD Pod Security Context

OSD pods require privileged access for device management. Verify in the Rook operator configuration:

```yaml
csi:
  provisionerTolerations:
    - operator: Exists
  pluginTolerations:
    - operator: Exists
  cephFSAttachRequired: true
```

## Audit PSA Violations

Check if any Rook pods would violate a stricter policy:

```bash
kubectl label namespace rook-ceph \
  pod-security.kubernetes.io/audit=baseline \
  --overwrite

# Check audit logs
kubectl get events -n rook-ceph | grep FailedCreate
```

Revert to privileged after auditing:

```bash
kubectl label namespace rook-ceph \
  pod-security.kubernetes.io/audit=privileged \
  --overwrite
```

## Summary

Pod Security Admission and Pod Security Standards replace PodSecurityPolicy in modern Kubernetes. Rook-Ceph requires the `privileged` enforcement level on its own namespace due to OSD device access requirements. Application namespaces should use `restricted` mode since they only interact with Ceph through the CSI driver and never need host-level access.
