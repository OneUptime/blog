# How to Use Ceph with Kubernetes Pod Security Standards

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Pod Security, Security, PSS

Description: Configure Rook-Ceph to run correctly under Kubernetes Pod Security Standards including restricted and baseline policies.

---

## Introduction

Kubernetes Pod Security Standards (PSS) replaced PodSecurityPolicy in Kubernetes 1.25. Rook-Ceph's system daemons require certain privileges. This guide explains how to configure namespaces and Rook to work correctly under PSS enforcement modes.

## Understanding PSS Levels

Kubernetes defines three PSS levels:

- `privileged` - No restrictions
- `baseline` - Minimal restrictions, blocks known privilege escalations
- `restricted` - Heavily restricted, requires non-root, drops all capabilities

Rook-Ceph OSD pods run as root and require privileged access. They must operate in a namespace with `privileged` enforcement, as even `baseline` blocks privileged containers.

## Labeling the Rook-Ceph Namespace

Apply the appropriate PSS label to the `rook-ceph` namespace:

```bash
kubectl label namespace rook-ceph \
  pod-security.kubernetes.io/enforce=privileged \
  pod-security.kubernetes.io/warn=privileged \
  pod-security.kubernetes.io/audit=privileged
```

Verify the labels:

```bash
kubectl get namespace rook-ceph --show-labels
```

## Configuring Workload Namespaces

For application namespaces that only consume Rook-Ceph PVCs (not run Ceph daemons), you can use `restricted` mode since regular pods using PVCs do not need special privileges:

```bash
kubectl label namespace my-app \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/warn=restricted
```

Application pods using Ceph-backed PVCs typically look like:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  namespace: my-app
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: myapp:latest
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop: ["ALL"]
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: myapp-pvc
```

## Handling the Toolbox Pod

The Rook toolbox pod requires elevated privileges. Keep it in the `rook-ceph` namespace:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: rook-ceph-tools
  namespace: rook-ceph
spec:
  containers:
  - name: rook-ceph-tools
    image: rook/ceph:v1.13.0
    command: ["/bin/bash"]
    args: ["-m", "-c", "/usr/local/bin/toolbox.sh"]
    securityContext:
      privileged: true
```

## Auditing for Violations

Enable warn mode first to detect violations before enforcing. Warnings are returned directly in kubectl output when pods are created:

```bash
kubectl label namespace rook-ceph \
  pod-security.kubernetes.io/warn=privileged \
  pod-security.kubernetes.io/audit=privileged \
  --overwrite
```

Warnings from the `warn` mode appear in kubectl output when creating or updating pods. Violations from `audit` mode are recorded in the API server audit log (configured via `--audit-log-path` or an audit webhook), not in Kubernetes Events.

## Summary

Rook-Ceph system pods require privileged access and must run in namespaces labeled with `privileged` Pod Security Standards enforcement. Application namespaces that only use Ceph-backed PVCs can safely use `restricted` mode. Separating Ceph operator namespaces from application namespaces provides the best balance of security and functionality.
