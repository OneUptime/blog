# How to Configure Ceph Authentication Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Authentication, CephX, Security, Configuration

Description: Learn how to configure Ceph authentication settings including CephX modes, key management, capability grants, and authentication debugging.

---

## Ceph Authentication Modes

Ceph supports two authentication modes configured per communication path:

- `cephx`: Full mutual authentication (default, required for production)
- `none`: No authentication (only for development/testing)

Three settings control which mode is required:
- `auth_cluster_required`: Authentication between cluster daemons (mon, osd, mds)
- `auth_service_required`: Authentication for clients connecting to daemons
- `auth_client_required`: Authentication required by the client itself

```ini
[global]
auth_cluster_required = cephx
auth_service_required = cephx
auth_client_required = cephx
```

**Never disable authentication in production.** These settings should always be `cephx`.

## Listing Authentication Keys

```bash
kubectl exec -it rook-ceph-tools -n rook-ceph -- bash

# List all keys and capabilities
ceph auth ls

# Show a specific key
ceph auth get client.admin
ceph auth get osd.0
```

## Creating Client Keys with Capabilities

```bash
# Create a key with read-only monitor access and full OSD access to one pool
ceph auth get-or-create client.myapp \
  mon 'allow r' \
  osd 'allow rw pool=mypool'

# Export to keyring file
ceph auth get client.myapp -o /etc/ceph/ceph.client.myapp.keyring
```

Capability syntax:

| Capability | Meaning |
|------------|---------|
| `allow *` | Full access |
| `allow r` | Read-only |
| `allow rw` | Read-write |
| `allow rx` | Read + execute (object classes) |
| `profile rbd` | Standard RBD client permissions |
| `profile rbd-read-only` | Read-only RBD access |

## RBD Profile Capabilities

Use built-in profiles for common use cases:

```bash
# Create RBD provisioner key (for Kubernetes CSI)
ceph auth get-or-create client.csi-rbd-provisioner \
  mon 'profile rbd' \
  mgr 'allow rw' \
  osd 'profile rbd'

# Create RBD node key (for mounting volumes)
ceph auth get-or-create client.csi-rbd-node \
  mon 'profile rbd' \
  osd 'profile rbd'
```

## Managing Keys in Rook

Rook auto-creates CephX keys and stores them as Kubernetes Secrets:

```bash
# List CephX-related secrets
kubectl get secrets -n rook-ceph | grep -E "keyring|rook-csi"

# View the CSI provisioner secret
kubectl get secret rook-csi-rbd-provisioner -n rook-ceph \
  -o jsonpath='{.data.userKey}' | base64 -d
```

## Rotating Compromised Keys

```bash
# Delete the compromised key
ceph auth del client.myapp

# Recreate with a fresh key
ceph auth get-or-create client.myapp \
  mon 'allow r' \
  osd 'allow rw pool=mypool'

# Update the Kubernetes Secret if used with Rook/CSI
kubectl create secret generic ceph-client-myapp \
  --from-literal=userID=myapp \
  --from-literal=userKey="$(ceph auth get-key client.myapp)" \
  -n rook-ceph --dry-run=client -o yaml | kubectl apply -f -
```

## Authentication Debugging

If clients fail to authenticate, increase logging verbosity:

```bash
# Enable authentication debug on monitors
ceph config set mon debug_auth 10
ceph config set mon debug_ms 1

# On a client, set verbose logging
export CEPH_ARGS="--debug-auth 10 --debug-ms 1"
ceph status

# Reset after debugging
ceph config set mon debug_auth 0
ceph config set mon debug_ms 0
```

Common authentication errors:

```text
auth: unable to find a keyring on /etc/ceph/ceph.client.admin.keyring
```

Fix: Ensure keyring file exists with correct permissions (`0600`, owned by the connecting user).

```text
monclient(hunting): authenticate timed out
```

Fix: Verify network connectivity to monitors and that `mon_host` addresses are correct.

## Summary

Ceph authentication settings control which principals are trusted to connect to cluster components. Always keep `auth_cluster_required`, `auth_service_required`, and `auth_client_required` set to `cephx` in production. Use purpose-specific keys with least-privilege capabilities for each service (CSI provisioner, CSI node, monitoring clients). In Rook deployments, keys are automatically managed as Kubernetes Secrets, but understanding CephX capabilities is essential for creating custom clients, debugging authentication failures, and rotating compromised credentials.
