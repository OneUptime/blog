# How to Configure CephX for Monitor Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephX, Monitor, Authentication, Security

Description: Configure CephX authentication settings for Ceph monitors in Rook to secure inter-monitor communication and control client access to monitor operations.

---

Ceph monitors are the authoritative source of cluster state. Securing monitor access with CephX prevents unauthorized clients from reading or modifying cluster topology and configuration.

## Monitor CephX Settings

Three configuration options control monitor authentication:

- `auth_cluster_required` - authentication between cluster daemons
- `auth_service_required` - authentication between clients and daemons
- `auth_client_required` - what the client requires from the cluster

Enable all three (the secure default):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global auth_cluster_required cephx

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global auth_service_required cephx

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global auth_client_required cephx
```

## Configure in CephCluster Spec

Set authentication requirements in the Rook CephCluster resource:

```yaml
spec:
  cephConfig:
    global:
      auth_cluster_required: cephx
      auth_service_required: cephx
      auth_client_required: cephx
```

## Monitor-Specific Capabilities

Grant a client the ability to read monitor state:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.monitoring \
  mon 'allow r' \
  mgr 'allow r'
```

Grant a backup tool read access to monitor commands:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.backup \
  mon 'allow r, allow command "osd dump", allow command "pg dump"' \
  osd 'allow r'
```

## Verify Monitor Authentication

Confirm CephX is enforced for monitor connections:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get mon auth_cluster_required
```

Test that an unauthenticated connection is rejected:

```bash
# This should fail
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph --id anonymous mon stat 2>&1
```

## View Monitor Key

Inspect the automatically created monitor bootstrap key:

```bash
kubectl -n rook-ceph get secret rook-ceph-mon -o yaml
```

The monitor keyring is stored in:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get mon.
```

## Restrict Monitor Commands

Limit which commands a client can run against monitors:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth caps client.readonly \
  mon 'allow r, allow command "status", allow command "health", allow command "osd stat"' \
  osd 'allow r'
```

## Summary

CephX monitor authentication is controlled by three configuration settings - `auth_cluster_required`, `auth_service_required`, and `auth_client_required` - all of which should be set to `cephx` in production. Fine-grained command-level access control through capability strings allows you to grant monitoring tools read access to the monitor without exposing administrative operations.
