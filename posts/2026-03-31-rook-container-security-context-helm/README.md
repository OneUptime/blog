# How to Configure Container Security Context in Rook Helm Chart

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Helm, Security, Container

Description: Set pod and container security contexts for the Rook-Ceph operator via Helm to comply with Pod Security Standards and cluster security policies.

---

## Overview

Kubernetes Pod Security Standards and organizational policies often require explicit security contexts on containers. The Rook-Ceph operator Helm chart exposes a `containerSecurityContext` value for the operator container. Note that the chart does not include a `podSecurityContext` Helm value; pod-level security settings must be applied separately if needed.

## Operator Pod Security Context

The Rook operator Helm chart does not include a `podSecurityContext` value. Setting it in a values file will have no effect. If you need pod-level settings such as `fsGroup`, patch the operator deployment after installation:

```bash
kubectl patch deployment rook-ceph-operator -n rook-ceph --type merge \
  -p '{"spec":{"template":{"spec":{"securityContext":{"runAsNonRoot":true,"runAsUser":2016,"runAsGroup":2016,"fsGroup":2016}}}}}'
```

## Operator Container Security Context

Set security capabilities and privilege settings on the operator container itself:

```yaml
containerSecurityContext:
  runAsNonRoot: true
  runAsUser: 2016
  runAsGroup: 2016
  capabilities:
    drop:
      - ALL
  readOnlyRootFilesystem: false
  allowPrivilegeEscalation: false
  seccompProfile:
    type: RuntimeDefault
```

Note that Rook does not require a read-only root filesystem by default because the operator needs to write configuration files during initialization. The `seccompProfile` setting is required for clusters enforcing the `restricted` Pod Security Standard.

## Applying the Configuration

Include these sections in your operator values file:

```yaml
# rook-operator-security.yaml
containerSecurityContext:
  runAsNonRoot: true
  runAsUser: 2016
  runAsGroup: 2016
  capabilities:
    drop:
      - ALL
  allowPrivilegeEscalation: false
  seccompProfile:
    type: RuntimeDefault
```

Then apply:

```bash
helm upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  -f rook-operator-security.yaml
```

## Restricted Pod Security Standards

For clusters enforcing the `restricted` Pod Security Standard, ensure the namespace has the correct label:

```bash
kubectl label namespace rook-ceph \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/warn=restricted
```

With the `restricted` standard, the above security context configuration (including `seccompProfile`) aligns with all requirements. Verify the container security context after upgrade:

```bash
kubectl get pod -n rook-ceph -l app=rook-ceph-operator \
  -o jsonpath='{.items[0].spec.containers[0].securityContext}'
```

## OSD Security Context Considerations

OSDs often need elevated privileges for disk access. Rook handles this internally based on the storage configuration. If using `hostPath` volumes on platforms with SELinux (such as OpenShift), set the `hostpathRequiresPrivileged` Helm value on the operator chart:

```yaml
hostpathRequiresPrivileged: true
```

For OSD pods that need `privileged: true`, Rook enables this automatically. Do not attempt to restrict OSD pod security contexts through the operator `containerSecurityContext` value.

## Summary

Configuring security contexts for the Rook-Ceph operator via Helm ensures compliance with Pod Security Standards while keeping the operator functional. Apply `runAsNonRoot`, drop all capabilities, and prevent privilege escalation on the operator container while being careful not to apply the same restrictions to OSD daemons that legitimately need elevated disk access.
