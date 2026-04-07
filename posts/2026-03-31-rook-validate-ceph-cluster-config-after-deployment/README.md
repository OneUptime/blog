# How to Validate Ceph Cluster Configuration After Deployment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Validation, Configuration, Deployment

Description: Validate a newly deployed Ceph cluster configuration by checking CRUSH topology, replication settings, network bindings, MON quorum, and storage class functionality.

---

After deploying a Ceph cluster, a systematic validation pass confirms the cluster is correctly configured before it handles production workloads. Catching misconfiguration early is far less disruptive than finding it under load.

## Check 1 - Cluster Health

```bash
ceph status
ceph health detail
```

Expected result: `HEALTH_OK`. Investigate any warnings before proceeding.

## Check 2 - MON Quorum

```bash
ceph quorum_status --format json-pretty | python3 -c "
import sys, json
q = json.load(sys.stdin)
print('Leader:', q['quorum_leader_name'])
print('Members:', q['quorum_names'])
"
```

Verify all expected MONs are in quorum.

## Check 3 - OSD Count and Distribution

```bash
ceph osd tree
```

Verify:
- Correct number of OSDs are `up` and `in`
- OSDs are distributed across the expected hosts and failure domains
- Weights reflect the disk sizes

```bash
ceph osd df tree
```

## Check 4 - CRUSH Map Topology

```bash
ceph osd crush tree
```

Confirm the CRUSH topology matches your intended failure domains (host, rack, datacenter).

## Check 5 - Pool Replication Settings

```bash
ceph osd pool ls detail | grep -E "size|min_size|pg_num"
```

For each pool, verify:
- `size` = intended replication factor (e.g., 3)
- `min_size` = at least 2 for production
- `pg_num` appropriate for pool size and OSD count

## Check 6 - Network Configuration

```bash
ceph config get mon public_network
ceph config get osd cluster_network
ceph quorum_status --format json-pretty | python3 -c "
import sys, json
q = json.load(sys.stdin)
for mon in q['monmap']['mons']:
    print(mon['name'], 'addr=', mon['addr'], 'public_addr=', mon['public_addr'])
"
```

Verify bindings are on the expected networks and not on 0.0.0.0 unless intended.

## Check 7 - StorageClass Provisioning Test

```bash
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: validation-pvc
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 1Gi
  storageClassName: rook-ceph-block
EOF

kubectl wait --for=jsonpath='{.status.phase}'=Bound pvc/validation-pvc --timeout=60s
kubectl delete pvc validation-pvc
```

## Check 8 - Read/Write Performance Baseline

```bash
TOOLBOX=$(kubectl get pod -n rook-ceph -l app=rook-ceph-tools -o name | head -1)
POOL=$(kubectl get storageclass rook-ceph-block -o jsonpath='{.parameters.pool}')
kubectl exec -n rook-ceph "$TOOLBOX" -- rados bench -p "$POOL" 30 write --no-cleanup
kubectl exec -n rook-ceph "$TOOLBOX" -- rados bench -p "$POOL" 30 seq
kubectl exec -n rook-ceph "$TOOLBOX" -- rados cleanup -p "$POOL"
```

Record this baseline for future comparison.

## Summary

Validating a Ceph cluster after deployment requires checking cluster health, MON quorum, OSD topology, CRUSH map, pool settings, network bindings, PVC provisioning, and establishing a performance baseline. Running all eight checks takes about 15 minutes and catches the most common deployment errors before they affect production workloads.
