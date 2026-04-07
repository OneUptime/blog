# How to Secure Rook-Ceph with Kubernetes RBAC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Security, RBAC, Kubernetes

Description: Secure Rook-Ceph by reviewing and hardening Kubernetes RBAC roles, binding minimum privilege service accounts, and preventing unauthorized access to Ceph resources.

---

## Rook-Ceph RBAC Overview

Rook installs several service accounts, ClusterRoles, and ClusterRoleBindings during deployment. Understanding and auditing these is essential for cluster security. The key service accounts are:

- `rook-ceph-operator`: manages all Ceph resources
- `rook-ceph-osd`: runs OSD pods
- `rook-ceph-mgr`: runs manager pods
- `rook-ceph-rgw`: runs object gateway pods

## Auditing Existing RBAC

List all Rook-related ClusterRoles:

```bash
kubectl get clusterrole | grep rook
```

Inspect the operator's permissions:

```bash
kubectl describe clusterrole rook-ceph-global
```

Check which service accounts have access to Ceph secrets:

```bash
kubectl -n rook-ceph get rolebinding -o yaml | \
  grep -A5 "subjects:"
```

## Restricting Operator Permissions

Review the `rook-ceph-global` ClusterRole and remove permissions your deployment does not use. For example, if you do not use RGW, remove S3 object store rules:

```bash
kubectl get clusterrole rook-ceph-global -o yaml > /tmp/rook-rbac.yaml
# Edit to remove unused verbs/resources
kubectl apply -f /tmp/rook-rbac.yaml
```

## Application RBAC for Ceph Access

Applications accessing Ceph via CSI do not need direct access to Rook resources. Create a dedicated ServiceAccount for each application namespace:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-storage-sa
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pvc-access
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["persistentvolumeclaims"]
    verbs: ["get", "list", "create", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: app-pvc-binding
  namespace: production
subjects:
  - kind: ServiceAccount
    name: app-storage-sa
    namespace: production
roleRef:
  kind: Role
  name: pvc-access
  apiGroup: rbac.authorization.k8s.io
```

## Preventing Access to Rook Secrets

Ceph admin keys are stored as Kubernetes Secrets. Restrict which service accounts can read them by creating a Role that only grants secret access to the Rook operator:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: rook-ceph-secret-reader
  namespace: rook-ceph
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: rook-ceph-secret-reader-binding
  namespace: rook-ceph
subjects:
  - kind: ServiceAccount
    name: rook-ceph-system
    namespace: rook-ceph
roleRef:
  kind: Role
  name: rook-ceph-secret-reader
  apiGroup: rbac.authorization.k8s.io
```

You can further limit network access to the rook-ceph namespace with a NetworkPolicy:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-rook-namespace
  namespace: rook-ceph
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: rook-ceph
```

Prevent non-Rook pods from reading the admin secret:

```bash
# Verify no unexpected service accounts have secret access
kubectl -n rook-ceph get rolebinding -o json | \
  jq '.items[] | select(.roleRef.name | contains("secret")) | .subjects'
```

## User-Facing RBAC for CephCluster Management

Grant read-only access to Ceph cluster status for operations teams:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: ceph-viewer
rules:
  - apiGroups: ["ceph.rook.io"]
    resources: ["cephclusters", "cephpools", "cephfilesystems", "cephobjectstores"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: ceph-viewer-binding
subjects:
  - kind: Group
    name: ops-team
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: ceph-viewer
  apiGroup: rbac.authorization.k8s.io
```

## Summary

Securing Rook-Ceph with RBAC involves auditing the installed ClusterRoles, removing unused permissions from the operator role, restricting access to Ceph Secrets, and creating per-namespace roles for application storage access. Following least-privilege principles for each Rook service account significantly reduces the blast radius of a compromised pod.
