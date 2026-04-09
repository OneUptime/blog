# How to Fix AUTH_INSECURE_GLOBAL_ID_RECLAIM Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Authentication, Security, Monitor

Description: Learn how to resolve the AUTH_INSECURE_GLOBAL_ID_RECLAIM health warning in Ceph by enforcing secure global ID reclaim to prevent authentication vulnerabilities.

---

## Understanding AUTH_INSECURE_GLOBAL_ID_RECLAIM

This health check was introduced in Ceph Pacific (16.2.1) and Octopus (15.2.11) as a response to CVE-2021-20288. The vulnerability allowed clients to reclaim their global ID without re-authenticating, potentially allowing an attacker to impersonate another client.

The health check fires in two forms:
- `AUTH_INSECURE_GLOBAL_ID_RECLAIM` - some clients are still using insecure reclaim
- `AUTH_INSECURE_GLOBAL_ID_RECLAIM_ALLOWED` - the cluster is configured to allow insecure reclaim

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN auth insecure global id reclaim
[WRN] AUTH_INSECURE_GLOBAL_ID_RECLAIM: 3 clients are reclaiming a global_id insecurely
    client.libcephfs1 at 10.0.0.5: insecure global_id reclaim
```

## Understanding the Two Phases

Ceph introduced a two-phase mitigation:

1. Phase 1: Allow insecure reclaim but warn (default after patching)
2. Phase 2: Disallow insecure reclaim entirely

The cluster config key `auth_allow_insecure_global_id_reclaim` controls whether insecure reclaim is allowed.

## Checking Current Config

```bash
ceph config get mon auth_allow_insecure_global_id_reclaim
```

If it returns `true`, the cluster is still permissive.

## Identifying Affected Clients

Find all clients using insecure reclaim:

```bash
ceph auth ls | grep client
ceph tell mon.* sessions
```

Also check which Ceph client library versions are in use across your application pods:

```bash
kubectl -n <app-namespace> exec <pod> -- python3 -c "import rados; print(rados.version())"
```

## Updating Ceph Client Libraries

The root fix is to update client-side Ceph libraries to versions that support secure global ID reclaim:

```bash
# On application nodes using librbd or libcephfs
apt update && apt install -y python3-rbd python3-cephfs libcephfs2 librbd1

# Verify versions
dpkg -l | grep -E "librbd|libcephfs|ceph"
```

For containerized applications, update the base image to include patched Ceph client libraries.

## Disabling Insecure Reclaim

Once all clients are updated, disable insecure reclaim:

```bash
ceph config set mon auth_allow_insecure_global_id_reclaim false
```

Verify no clients are still using insecure reclaim:

```bash
ceph health detail
```

## Handling Rook Operator Clients

In Rook deployments, the operator itself uses Ceph client libraries. Ensure the Rook operator image includes updated libraries:

```bash
kubectl -n rook-ceph get deployment rook-ceph-operator -o jsonpath='{.spec.template.spec.containers[0].image}'
```

Update Rook to the latest version that bundles patched client libraries:

```bash
helm -n rook-ceph upgrade rook-ceph rook-release/rook-ceph --version <latest>
```

## Temporarily Suppressing the Warning

If you cannot immediately update all clients, acknowledge the warning:

```bash
ceph health mute AUTH_INSECURE_GLOBAL_ID_RECLAIM 1w
```

This mutes the warning for one week, giving time to update clients.

## Summary

`AUTH_INSECURE_GLOBAL_ID_RECLAIM` warns that clients are using an insecure authentication reclaim path (CVE-2021-20288). Fix this by updating all Ceph client libraries on application nodes to patched versions, then set `auth_allow_insecure_global_id_reclaim` to `false` on the cluster. In Rook environments, ensure the operator image is also running updated libraries.
