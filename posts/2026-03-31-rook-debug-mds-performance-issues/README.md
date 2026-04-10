# How to Debug MDS Performance Issues in CephFS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, MDS, Performance

Description: Learn how to identify and resolve MDS performance bottlenecks in CephFS deployed with Rook-Ceph on Kubernetes.

---

## Understanding MDS Performance Bottlenecks

The CephFS Metadata Server (MDS) handles all filesystem metadata operations - file opens, directory listings, stat calls, and namespace mutations. Performance issues in the MDS manifest as high metadata latency, slow `ls` operations, or application timeouts when opening many files.

Common causes include:

- Undersized MDS memory leading to excessive cache thrashing
- Hot directories generating serialized metadata requests
- Too many open files across too many clients
- Single active MDS handling a workload that needs multiple ranks

## Step 1 - Check MDS Performance Counters

Use the Rook toolbox to inspect live MDS performance metrics:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph tell mds.myfs:0 perf dump | python3 -m json.tool | grep -A5 "mds_server"
```

Key metrics to check:

```text
"req_create_latency": { "avgcount": 1523, "sum": 45.2 }
"req_lookup_latency": { "avgcount": 83421, "sum": 120.1 }
"req_readdir_latency": { "avgcount": 2048, "sum": 88.3 }
```

High average latency (above 10ms) indicates an MDS bottleneck.

## Step 2 - Check MDS CPU and Memory Usage

Inspect pod resource consumption:

```bash
kubectl top pods -n rook-ceph -l app=rook-ceph-mds
```

If the MDS is CPU-bound, check if client requests are queuing:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph tell mds.myfs:0 dump_ops_in_flight
```

## Step 3 - Enable MDS Logging for Slow Requests

Turn on slow request logging to identify which operations are taking too long:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph config set mds mds_op_complaint_time 5

kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph config set mds debug_mds 5
```

Check the MDS logs for slow operation warnings:

```bash
kubectl logs -n rook-ceph deploy/rook-ceph-mds-myfs-a | grep "slow request"
```

## Step 4 - Increase MDS Resources

Update the `CephFilesystem` resource to give the MDS more CPU and memory:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: myfs
  namespace: rook-ceph
spec:
  metadataServer:
    activeCount: 1
    activeStandby: true
    resources:
      limits:
        cpu: "4"
        memory: "16Gi"
      requests:
        cpu: "2"
        memory: "8Gi"
```

Then set the MDS cache memory limit via the Ceph config store:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph config set mds mds_cache_memory_limit 8589934592
```

## Step 5 - Spread Load Across Multiple MDS Ranks

For workloads with many clients accessing different directory trees, scale out to multiple active MDS:

```yaml
spec:
  metadataServer:
    activeCount: 2
    activeStandby: true
```

Then pin hot directories to specific ranks:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph fs subvolumegroup pin myfs <groupname> distributed 1
```

## Step 6 - Monitor with Prometheus

Set up a Grafana alert for high MDS latency:

```yaml
groups:
- name: cephfs-mds-perf
  rules:
  - alert: MDSHighLatency
    expr: ceph_mds_server_req_create_latency_sum / ceph_mds_server_req_create_latency_count > 0.1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "MDS create latency exceeds 100ms"
```

## Summary

Debugging MDS performance in Rook-Ceph requires checking performance counters, slow request logs, and resource utilization. The most effective fixes are increasing MDS memory to reduce cache thrashing, scaling to multiple active MDS ranks for high-concurrency workloads, and using directory pinning to distribute metadata load. Always set Prometheus alerts on latency metrics to catch degradation early.
