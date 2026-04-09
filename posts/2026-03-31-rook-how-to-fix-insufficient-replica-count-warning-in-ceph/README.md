# How to Fix 'insufficient replica count' Warning in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Replication, Troubleshooting, Storage

Description: Resolve insufficient replica count warnings in Ceph by verifying pool size settings, OSD availability, and CRUSH map configuration for proper data redundancy.

---

## What "insufficient replica count" Means

This warning appears when Ceph cannot maintain the desired number of replicas for one or more placement groups. If a pool is configured with `size: 3` (3 replicas) but only 2 OSDs are available, Ceph cannot achieve the configured redundancy and reports:

```text
HEALTH_WARN Degraded data redundancy: 32/96 objects degraded (33.333%), 32 pgs degraded, 32 pgs undersized
```

You may also see messages like:

```text
Degraded data redundancy: x/y objects degraded
x pgs undersized
```

## Step 1 - Check Current Health Detail

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
```

Look for messages about pools, replica counts, or degraded PGs:

```text
HEALTH_WARN Degraded data redundancy
PG_DEGRADED Degraded data redundancy: 1/100 objects degraded (1.00%), 8 pgs degraded
PG_UNDERSIZED 8 undersized pgs
```

## Step 2 - Check Pool Configuration

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool ls detail
```

Example output showing a misconfigured pool:

```text
pool 2 'rbd' replicated size 3 min_size 2 crush_rule 0 object_hash rjenkins pg_num 8 pgp_num 8
```

Verify `size` and `min_size` are appropriate for your OSD count.

## Step 3 - Check Available OSD Count

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd stat
```

Output:

```text
3 osds: 2 up (since 5m), 3 in
```

If `size: 3` but only 2 OSDs are `up`, some PGs cannot achieve full replication.

## Step 4 - Fix Pool Replica Count

If you have fewer OSDs than the configured replica count, reduce the pool size:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool set <pool-name> size 2
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool set <pool-name> min_size 1
```

Or, bring more OSDs online. Update the `CephCluster` spec to add more storage nodes/devices.

## Step 5 - Fix Pool Size in Rook CRD

Update the `CephBlockPool` to match your available hardware:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  replicated:
    size: 2          # Match your OSD count
    requireSafeReplicaSize: true
```

Apply:

```bash
kubectl apply -f pool.yaml
```

With `requireSafeReplicaSize: true`, Rook will refuse to set `size` to 1 to protect against accidental data loss.

## Step 6 - Check CRUSH Map Failure Domains

Even with enough OSDs, the CRUSH map may not be able to place replicas correctly if:
- OSDs are on the same host and the CRUSH rule requires `host`-level failure domains
- All hosts are in the same rack and the rule requires `rack`-level separation

Check the CRUSH rule:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd crush rule dump replicated_rule
```

Output:

```json
{
    "rule_id": 0,
    "rule_name": "replicated_rule",
    "type": 1,
    "steps": [
        {"op": "take", "item": -1, "item_name": "default"},
        {"op": "chooseleaf_firstn", "num": 0, "type": "host"},
        {"op": "emit"}
    ]
}
```

If `type: host` but you only have one host, change it:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd crush rule create-simple myrule default osd firstn
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool set <pool-name> crush_rule myrule
```

## Step 7 - Monitor PG Recovery

After fixing the configuration, watch PG recovery:

```bash
watch "kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status"
```

PGs will transition from `degraded` to `active+clean` as replicas are created:

```text
pgs: 64/192 objects degraded (33.33%)
      64 active+undersized+degraded
      64 active+clean
recovery: 10.0 MiB/s, 5 objects/s
```

## Step 8 - Verify Resolution

Once recovery completes:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health
```

Expected:

```text
HEALTH_OK
```

## Summary

Insufficient replica count warnings in Ceph occur when the number of available OSDs is less than the configured pool size, or when CRUSH map failure domain rules cannot be satisfied. Fix the issue by either reducing the pool's `size` parameter to match available OSDs, adding more OSDs to the cluster, or adjusting the CRUSH rule failure domain type. Rook's `CephBlockPool` and `CephFilesystem` CRDs allow you to manage these settings declaratively.
