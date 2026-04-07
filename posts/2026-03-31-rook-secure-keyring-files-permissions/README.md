# How to Secure Keyring Files with Proper Permissions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Security, Keyring, Permission, Kubernetes

Description: Learn how to secure Ceph keyring files using proper Linux permissions, Kubernetes RBAC, and Secret management to prevent unauthorized access to cluster credentials.

---

Ceph keyring files contain the shared secrets that authenticate clients and daemons. A compromised keyring allows unauthorized access to the entire cluster. Securing these files is a fundamental part of Ceph cluster security.

## Why Keyring Security Matters

A keyring file contains a base64-encoded secret key. Anyone with read access to this file can authenticate as that Ceph entity and gain all its granted capabilities. For `client.admin`, this means complete cluster control.

In Rook-managed clusters, keyrings exist in two forms:
- As Kubernetes Secrets within the `rook-ceph` namespace
- As mounted files within daemon and toolbox pods

## Checking Current Keyring Permissions

Inspect permissions on keyring files inside a pod:

```bash
# Check the admin keyring in the toolbox
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ls -la /etc/ceph/

# Verify the keyring file permissions
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  stat /etc/ceph/keyring
```

Keyring files should have permissions `0600` (owner read/write only) and be owned by the `ceph` user or the process user.

## Securing Keyrings on Linux Nodes

If you are running Ceph daemons directly on nodes (external cluster), ensure proper file permissions:

```bash
# Set correct ownership and permissions on keyring files
sudo chown ceph:ceph /etc/ceph/ceph.client.admin.keyring
sudo chmod 0600 /etc/ceph/ceph.client.admin.keyring

# Verify
sudo ls -la /etc/ceph/*.keyring
```

## Locking Down Kubernetes Secrets with RBAC

Restrict which service accounts and users can read Ceph-related Secrets:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ceph-keyring-reader
  namespace: rook-ceph
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    resourceNames: ["rook-ceph-admin-keyring"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ceph-keyring-reader-binding
  namespace: rook-ceph
subjects:
  - kind: ServiceAccount
    name: ceph-client
    namespace: myapp
roleRef:
  kind: Role
  name: ceph-keyring-reader
  apiGroup: rbac.authorization.k8s.io
```

## Mounting Keyrings as Read-Only Volumes

When mounting keyrings into application pods, always mount as read-only:

```yaml
volumes:
  - name: ceph-keyring
    secret:
      secretName: rook-ceph-admin-keyring
      defaultMode: 0400
containers:
  - name: app
    volumeMounts:
      - name: ceph-keyring
        mountPath: /etc/ceph
        readOnly: true
```

The `defaultMode: 0400` ensures the file is readable only by the owner.

## Using Sealed Secrets or External Secret Managers

For production, avoid storing Ceph keyrings as plain Kubernetes Secrets. Use a secrets manager:

```bash
# Example using Vault with External Secrets Operator
kubectl apply -f - <<EOF
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: ceph-admin-keyring
  namespace: myapp
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: ceph-keyring
  data:
    - secretKey: keyring
      remoteRef:
        key: ceph/admin-keyring
EOF
```

## Auditing Access to Keyring Secrets

Enable Kubernetes API server audit logging to track Secret access. This requires an audit policy that captures read operations on Secrets:

```yaml
# Example audit policy snippet to log Secret access
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets"]
    namespaces: ["rook-ceph"]
```

Once audit logging is configured, review the audit log for Secret access events:

```bash
# Search audit logs for access to keyring secrets
grep "rook-ceph-admin-keyring" /var/log/kubernetes/audit/audit.log
```

## Summary

Ceph keyring files must be protected with `0600` permissions and owned by the Ceph user. In Rook deployments, Kubernetes Secrets should be locked down with RBAC to restrict read access, and volumes should be mounted read-only with restrictive `defaultMode` settings. For high-security environments, integrating with an external secrets manager like HashiCorp Vault provides rotation, auditing, and centralized access control.
