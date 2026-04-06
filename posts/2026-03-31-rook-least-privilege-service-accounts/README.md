# How to Implement Least Privilege for Rook-Ceph Service Accounts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Security, Service Account, RBAC

Description: Learn how to apply least-privilege principles to Rook-Ceph service accounts using Kubernetes RBAC to reduce attack surface and meet compliance requirements.

---

## Why Least Privilege Matters for Rook-Ceph

Rook-Ceph operators and daemons require access to the Kubernetes API to manage cluster state. By default, the operator may have broader permissions than strictly necessary. Applying least-privilege principles limits the blast radius of a compromised component and satisfies security audits.

## Audit Existing Permissions

Start by reviewing what the Rook operator service account currently has:

```bash
kubectl get clusterrolebinding -n rook-ceph | grep rook
kubectl describe clusterrole rook-ceph-global
```

List all service accounts in the namespace:

```bash
kubectl get serviceaccounts -n rook-ceph
```

## Define Minimal ClusterRoles

Create a scoped role for the Rook operator that only covers resources it genuinely needs:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: rook-ceph-operator-minimal
rules:
  - apiGroups: ["ceph.rook.io"]
    resources: ["cephclusters", "cephblockpools", "cephfilesystems", "cephobjectstores"]
    verbs: ["get", "list", "watch", "update", "patch"]
  - apiGroups: [""]
    resources: ["pods", "services", "configmaps", "secrets"]
    verbs: ["get", "list", "watch", "create", "update", "delete"]
  - apiGroups: ["apps"]
    resources: ["deployments", "daemonsets"]
    verbs: ["get", "list", "watch", "create", "update", "delete"]
```

## Bind the Role to the Service Account

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: rook-ceph-operator-minimal-binding
subjects:
  - kind: ServiceAccount
    name: rook-ceph-operator
    namespace: rook-ceph
roleRef:
  kind: ClusterRole
  name: rook-ceph-operator-minimal
  apiGroup: rbac.authorization.k8s.io
```

Apply both resources:

```bash
kubectl apply -f minimal-role.yaml
kubectl apply -f minimal-binding.yaml
```

## Restrict OSD and MGR Service Accounts

Each daemon type should have its own service account with tailored permissions. For OSDs, which only need to report status:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: rook-ceph-osd
  namespace: rook-ceph
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list"]
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["create"]
```

## Validate with kubectl auth can-i

Test that the restricted service account cannot perform actions outside its scope:

```bash
kubectl auth can-i delete nodes \
  --as=system:serviceaccount:rook-ceph:rook-ceph-operator

kubectl auth can-i get secrets \
  --as=system:serviceaccount:rook-ceph:rook-ceph-osd \
  -n kube-system
```

Both should return `no`.

## Use Pod Security Admission

Complement RBAC with Pod Security Standards to prevent privilege escalation:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: rook-ceph
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/warn: restricted
```

## Summary

Implementing least privilege for Rook-Ceph service accounts involves auditing existing RBAC bindings, creating minimal ClusterRoles scoped to actual needs, and validating restrictions with `kubectl auth can-i`. Combining RBAC limits with Pod Security Admission provides defense-in-depth for your storage layer.
