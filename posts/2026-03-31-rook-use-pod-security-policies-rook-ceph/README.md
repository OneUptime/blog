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
- MON uses ports 6789 and 3300, MGR uses ports starting at 6800 (all above 1024)

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
  runAsNonRoot: true
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
```

## OSD Pod Security Context

OSD pods require privileged access for device management. The Rook operator automatically sets the appropriate security context for OSD pods. You can verify OSD pods are running with privileged access:

```bash
kubectl get pod -n rook-ceph -l app=rook-ceph-osd \
  -o jsonpath='{.items[0].spec.containers[0].securityContext}'
```

## Audit PSA Violations

Check if any Rook pods would violate a stricter policy by using `warn` mode, which prints warnings to the client when pods are created:

```bash
kubectl label namespace rook-ceph \
  pod-security.kubernetes.io/warn=baseline \
  --overwrite
```

Then recreate or rollout restart a pod to see warnings in the kubectl output. You can also use `dry-run` to test without actually creating pods:

```bash
kubectl get pod -n rook-ceph -l app=rook-ceph-osd -o yaml | \
  kubectl apply --dry-run=server -f -
```

Revert to privileged after auditing:

```bash
kubectl label namespace rook-ceph \
  pod-security.kubernetes.io/warn=privileged \
  --overwrite
```

## Summary

Pod Security Admission and Pod Security Standards replace PodSecurityPolicy in modern Kubernetes. Rook-Ceph requires the `privileged` enforcement level on its own namespace due to OSD device access requirements. Application namespaces should use `restricted` mode since they only interact with Ceph through the CSI driver and never need host-level access.
