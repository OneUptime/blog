# How to Manage Session Keys and Tickets in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephX, Session Management, Security, Kubernetes

Description: Learn how Ceph session keys and tickets work, how to configure their lifetimes, and how to manage them in a Rook-operated cluster for optimal security.

---

Session keys and tickets are the runtime credentials that CephX issues to authenticated clients. Understanding how to manage their lifetimes and rotation is critical for balancing security and performance in a Ceph cluster.

## What Are Session Keys and Tickets?

After a client authenticates with the Ceph Monitor, it receives two types of credentials:

- **Session key** - A temporary symmetric key shared between the client and a specific daemon (OSD, MDS)
- **Service ticket** - A token that proves to the daemon that the Monitor has authorized this client

These credentials are time-limited. When they expire, the client must re-authenticate with the Monitor to obtain fresh credentials.

## Viewing Current Authentication State

Check what keys and capabilities exist:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph auth list

# Get detailed info on a specific key
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get client.admin
```

## Configuring Ticket Lifetimes

The default ticket validity periods can be adjusted in the cluster configuration:

```bash
# Check current ticket timeout settings
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get mon auth_mon_ticket_ttl

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get mon auth_service_ticket_ttl
```

Set via Rook ConfigMap to control how long session tickets remain valid:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [global]
    # Monitor ticket lifetime in seconds (default: 259200 = 72 hours)
    auth_mon_ticket_ttl = 259200
    # Service ticket lifetime in seconds (default: 3600 = 1 hour)
    auth_service_ticket_ttl = 3600
```

## Rotating Keys Manually

For emergency key rotation (e.g., after a breach):

```bash
# Delete and recreate with a new key
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth del client.compromised

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.compromised \
    mon 'allow r' \
    osd 'allow rw pool=mypool'
```

## Updating Kubernetes Secrets After Key Rotation

After rotating a key, update the Kubernetes Secret:

```bash
# Get the new key value
NEW_KEY=$(kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph auth print-key client.myapp)

# Update the secret
kubectl -n myapp create secret generic ceph-keyring \
  --from-literal=key="$NEW_KEY" \
  --dry-run=client -o yaml | kubectl apply -f -
```

Then trigger a rolling restart of affected pods:

```bash
kubectl -n myapp rollout restart deployment/my-application
```

## Monitoring Authentication Events

Watch for authentication errors in Monitor logs:

```bash
kubectl -n rook-ceph logs -l app=rook-ceph-mon --tail=100 | \
  grep -i "auth\|ticket\|expire\|EACCES"
```

You can also check the cluster health status for auth-related warnings:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph health detail
```

## Summary

Ceph session keys and tickets are short-lived credentials issued by the Monitor to authenticated clients. Their lifetimes are configurable via the `auth_mon_ticket_ttl` and `auth_service_ticket_ttl` settings, which can be applied persistently in Rook via a ConfigMap override. Key rotation procedures must be paired with updates to Kubernetes Secrets to ensure applications continue functioning without interruption.
