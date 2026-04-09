# How to Handle Edge Cluster Failures and Recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Edge Computing, Recovery, Resilience

Description: Learn how to diagnose and recover from common edge Ceph cluster failures including OSD loss, mon quorum failure, and complete site outages.

---

Edge clusters operate with less redundancy and less hands-on management than datacenter deployments. Knowing how to handle failures remotely and systematically is critical for maintaining uptime.

## Common Edge Failure Scenarios

1. Single OSD disk failure
2. Node power loss
3. Mon quorum loss
4. Full site outage with no remote access
5. Kubernetes control plane failure

## Recovering from OSD Failure

Check which OSD is down:

```bash
ceph osd tree | grep down
ceph health detail
```

If the OSD can be restarted:

```bash
kubectl -n rook-ceph delete pod rook-ceph-osd-0-xxxx
```

If the disk is dead, remove the OSD:

```bash
ceph osd out osd.0
ceph osd down osd.0
ceph osd purge 0 --yes-i-really-mean-it
```

Replace the disk and let Rook provision a new OSD automatically:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-osd-prepare
```

## Recovering from Mon Quorum Loss

On a single-mon edge cluster, if the mon crashes:

```bash
kubectl -n rook-ceph delete pod rook-ceph-mon-a-xxxx
```

Kubernetes will restart it. If the mon's data is corrupted:

```bash
# Force single-mon cluster recovery
# First extract the monmap, then inject it back
ceph-mon -i a --extract-monmap /tmp/monmap
ceph-mon -i a --inject-monmap /tmp/monmap
```

## Remote Recovery via SSH

For edge sites with SSH access but no Kubernetes access:

```bash
# Restart all Ceph daemons
systemctl restart ceph.target

# Check cluster state
ceph -s

# Force a mon to rejoin
ceph mon add a <ip>:6789
```

## Recovering After Complete Power Loss

After a site comes back online:

```bash
# Check for unclean PGs
ceph pg stat | grep -v "active+clean"

# Speed up recovery
ceph config set osd osd_max_backfills 3
ceph config set osd osd_recovery_max_active 3

# Watch recovery
watch ceph -s
```

Expected recovery output:

```yaml
io:
  recovery: 125 MiB/s, 32 objects/s
```

## Handling Kubernetes Node NotReady

If the Kubernetes node hosting Ceph pods is NotReady:

```bash
kubectl get nodes
kubectl describe node edge-node-1 | grep -A10 Conditions
```

If the node is recoverable:

```bash
kubectl uncordon edge-node-1
```

If the node must be replaced, let Rook handle OSD migration via the new node's device configuration.

## Pre-staging Recovery Runbooks

Keep a recovery runbook on the site:

```bash
# Save to /root/ceph-recovery.sh on each edge node
cat > /root/ceph-recovery.sh <<'EOF'
#!/bin/bash
echo "Checking cluster health..."
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph health detail
echo "Restarting unhealthy OSDs..."
kubectl -n rook-ceph get pods -l app=rook-ceph-osd --no-headers | grep -v Running | awk '{print $1}' | xargs -I{} kubectl -n rook-ceph delete pod {}
EOF
chmod +x /root/ceph-recovery.sh
```

## Summary

Handling edge cluster failures requires a methodical approach: identify the failing component, use Rook pod restarts for transient issues, and follow the OSD removal and replacement workflow for hardware failures. Pre-staging recovery scripts on edge nodes and documenting site-specific procedures ensures even non-expert staff can execute recovery steps during a critical incident.
