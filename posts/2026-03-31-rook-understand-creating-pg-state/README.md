# How to Understand the creating PG State in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Placement Group, Storage, Troubleshooting

Description: Learn what the creating PG state means in Ceph, why placement groups get stuck in it, and how to diagnose and resolve it in Rook-managed clusters.

---

## What is the creating PG State

When Ceph creates a new pool or increases the PG count of an existing pool, placement groups (PGs) go through a `creating` state. This is a transient phase where Ceph allocates PGs to OSDs and begins distributing data. In most cases it resolves in seconds. When it lingers, you have a problem worth diagnosing.

Check PG states with:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg stat
```

You may see output like:

```text
128 pgs: 16 creating, 112 active+clean; 500 GiB data
```

## Common Causes of Stuck creating PGs

**Not enough OSDs:** Ceph requires a minimum number of OSDs to satisfy the pool's replication rule. If a pool has `size=3` but only two OSDs are available, PGs cannot be created.

**Broken CRUSH map:** If the CRUSH rule references a bucket type that no longer exists or has no OSDs mapped, PG creation stalls.

**OSD down during creation:** If an OSD was added and immediately failed, in-flight PG creation can pause.

## Diagnosing the Issue

Check the overall cluster health:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
```

List all PGs in creating state:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg dump | grep creating
```

Check OSD count and status:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd stat
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
```

Inspect the pool's CRUSH rule:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool get <pool-name> all
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd crush rule dump
```

## Resolving Stuck creating PGs

**Add more OSDs:** If the cluster is undersized, add OSD nodes via your Rook CephCluster spec:

```yaml
storage:
  storageClassDeviceSets:
    - name: set1
      count: 3
      volumeClaimTemplates:
        - metadata:
            name: data
          spec:
            resources:
              requests:
                storage: 1Ti
            storageClassName: local-storage
            volumeMode: Block
            accessModes:
              - ReadWriteOnce
```

**Fix CRUSH rules:** If the CRUSH map is broken, recompile it:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c '\
  ceph osd getcrushmap -o /tmp/crushmap && \
  crushtool -d /tmp/crushmap -o /tmp/crushmap.txt && \
  # Edit /tmp/crushmap.txt as needed, then recompile
  crushtool -c /tmp/crushmap.txt -o /tmp/crushmap.new && \
  ceph osd setcrushmap -i /tmp/crushmap.new'
```

**Restart stuck OSDs:** If an OSD is down and blocking creation, identify and restart it:

```bash
kubectl -n rook-ceph get pods | grep osd
kubectl -n rook-ceph delete pod <stuck-osd-pod>
```

## Monitoring PG Recovery

After applying fixes, watch PG states converge:

```bash
watch kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg stat
```

PGs should exit `creating` and move to `active+clean` within a few minutes once all OSDs are available and CRUSH rules are satisfied.

## Summary

The `creating` PG state is normal during cluster initialization and pool creation but should be transient. Persistent `creating` states usually indicate insufficient OSDs, a misconfigured CRUSH rule, or a failed OSD during the creation window. Use `ceph health detail` and `ceph osd tree` to pinpoint the cause and restore cluster health quickly.
