# How to Disable CephX for Testing (and Why You Shouldn't in Production)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephX, Testing, Security, Configuration

Description: Understand when and how to disable CephX authentication in a test Ceph cluster and why it is never appropriate to disable authentication in production environments.

---

There are limited scenarios where disabling CephX is useful - primarily in isolated development clusters for simplifying client configuration or reproducing authentication-agnostic bugs. This guide explains the procedure and, more importantly, the security risks.

## When Disabling CephX Might Be Acceptable

- Isolated development clusters with no sensitive data
- Debugging whether an issue is authentication-related or not
- CI/CD ephemeral test clusters not exposed to any network

**Never** disable CephX in:
- Production clusters
- Any cluster accessible from external networks
- Clusters storing real or sensitive data

## How to Disable CephX (Test Clusters Only)

Disabling authentication requires changing three configuration settings and restarting all daemons. In Rook, update the CephCluster spec:

```yaml
spec:
  cephConfig:
    global:
      auth_cluster_required: "none"
      auth_service_required: "none"
      auth_client_required: "none"
```

Apply and wait for the operator to reconcile:

```bash
kubectl apply -f cephcluster.yaml
kubectl -n rook-ceph rollout status deploy/rook-ceph-mon-a
```

Alternatively, set via the config tool (requires daemon restarts to take effect):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global auth_cluster_required none

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global auth_service_required none

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global auth_client_required none
```

Restart all daemon pods to apply:

```bash
kubectl -n rook-ceph rollout restart deploy/rook-ceph-mon-a \
  deploy/rook-ceph-mon-b \
  deploy/rook-ceph-mon-c

kubectl -n rook-ceph rollout restart \
  $(kubectl -n rook-ceph get deploy -o name | grep osd)
```

## Verify CephX is Disabled

After restart, any client should connect without authentication:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph -n client.undefined --keyring /dev/null status
```

## Security Risks of Disabled CephX

With CephX disabled:
- Any process with network access to the monitor port can issue admin commands
- OSDs are vulnerable to impersonation and data injection
- There is no audit trail of which entity performed operations
- RGW still requires S3 credentials, but internal cluster operations are unprotected

## Re-enabling CephX

To re-enable authentication after testing:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global auth_cluster_required cephx

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global auth_service_required cephx

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global auth_client_required cephx
```

Then restart all daemons and verify cluster health.

## Summary

Disabling CephX removes all authentication from Ceph's internal communications, allowing any network-accessible process to control the cluster. This is only justifiable in fully isolated test environments for specific debugging purposes. Re-enable CephX before the cluster touches any real workload. In production, CephX should always be set to `cephx` for all three `auth_*_required` settings.
