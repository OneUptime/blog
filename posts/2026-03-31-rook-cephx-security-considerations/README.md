# How to Understand CephX Security Considerations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Security

Description: Learn the key security considerations for CephX authentication including key management, capability hardening, and network security in Rook clusters.

---

## What Is CephX

CephX is Ceph's built-in authentication system, based on a shared-secret cryptographic protocol similar to Kerberos. Every entity in the cluster - monitors, OSDs, MDS daemons, and clients - must authenticate using CephX before it can send or receive data. Understanding CephX's security model is essential for hardening Ceph deployments.

## Key Security Risks in CephX

CephX is strong when configured correctly, but several risks can undermine it:

1. **Overprivileged users** - users with `allow *` on all subsystems have full cluster admin access
2. **Key exposure** - keys stored in world-readable files or Kubernetes Secrets without RBAC
3. **Stale keys** - old keys from decommissioned applications that were never revoked
4. **No network encryption** - CephX provides authentication but not confidentiality by default
5. **Shared admin keys** - multiple people or systems using `client.admin` instead of individual users

## Principle of Least Privilege

Always create dedicated users with minimal capabilities for each application:

```bash
# Wrong: using admin user for an application
ceph auth get client.admin  # has allow * everywhere

# Correct: scoped user for a specific application
ceph auth get-or-create client.myapp \
  mon 'allow r' \
  osd 'allow rw pool=myapp-data'
```

## Auditing for Overprivileged Users

Run periodic audits to find users with overly broad permissions:

```bash
# Find client users with full OSD access
ceph auth ls --format json | \
  jq -r '.auth_dump[] | select(.entity | startswith("client.")) | select(.caps.osd == "allow *") | .entity'
```

Any client user with `osd: allow *` that is not `client.admin` should be reviewed.

## Securing Keyring Files

Keyring files must be protected:

```bash
# Correct permissions
chmod 600 /etc/ceph/ceph.client.myapp.keyring
chown root:root /etc/ceph/ceph.client.myapp.keyring

# Verify no world-readable keyrings
find /etc/ceph -name "*.keyring" -perm /o+r
```

## Kubernetes RBAC for Ceph Secrets in Rook

In Rook environments, keyring Secrets must be protected with Kubernetes RBAC. Ensure only authorized ServiceAccounts can read Ceph key secrets:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ceph-key-reader
  namespace: myapp-namespace
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["ceph-myapp-key"]
  verbs: ["get"]
```

## Enabling Messenger v2 Encryption

CephX provides authentication but not encryption of data in transit. Enable messenger v2 with encryption using:

```bash
ceph config set global ms_cluster_mode secure
ceph config set global ms_service_mode secure
ceph config set global ms_client_mode secure
```

Or configure it in Rook's `CephCluster`:

```yaml
spec:
  network:
    connections:
      encryption:
        enabled: true
```

## Key Rotation Policy

Establish a key rotation schedule for all client users:

```bash
# Rotate key by deleting and recreating the user
ceph auth del client.myapp
ceph auth get-or-create client.myapp mon 'allow r' osd 'allow rw pool=myapp-data'
NEW_KEY=$(ceph auth get-key client.myapp)
kubectl -n myapp-namespace patch secret ceph-myapp-key \
  --type='json' \
  -p="[{\"op\": \"replace\", \"path\": \"/data/key\", \"value\": \"$(echo -n $NEW_KEY | base64)\"}]"
```

## Removing Stale Users

Regularly audit and remove users that are no longer needed:

```bash
# List all client users
ceph auth ls --format json | jq -r '.auth_dump[] | select(.entity | startswith("client.")) | .entity'

# Remove stale users
ceph auth del client.deprecated-app
```

## Summary

CephX provides strong shared-secret authentication but requires careful management to remain secure. Apply least-privilege capabilities to all client users, protect keyring files with `chmod 600`, use Kubernetes RBAC to restrict Secret access in Rook environments, enable messenger v2 encryption for data-in-transit protection, and maintain a key rotation schedule. Periodic audits for overprivileged users and stale keys are essential for maintaining a secure Ceph cluster.
