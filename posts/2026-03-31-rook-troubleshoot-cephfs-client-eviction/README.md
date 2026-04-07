# How to Troubleshoot CephFS Client Eviction

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, MDS, Troubleshooting

Description: Learn how to identify, investigate, and prevent CephFS client eviction events in Rook-Ceph Kubernetes clusters.

---

## What Is CephFS Client Eviction

CephFS client eviction occurs when the MDS forcibly disconnects a client from the filesystem. Evicted clients lose their capabilities (caps) and must remount or reconnect. In Kubernetes, this typically manifests as filesystem errors or pod crashes with I/O errors.

Common causes of client eviction include:

- Client becomes unresponsive (network partition, host crash)
- Client fails to release capabilities within the timeout window
- MDS needs to reclaim memory and the client holds too many caps
- MDS restart or failover

## Step 1 - Identify Eviction Events

Check the MDS logs for eviction messages:

```bash
kubectl logs -n rook-ceph deploy/rook-ceph-mds-myfs-a | grep -i evict
```

Use the Rook toolbox to check which clients are connected:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph tell mds.myfs:0 client ls
```

Look for clients with large numbers of held caps or those flagged as laggy:

```text
{ "id": 4295, "entity": "client.4295", "caps": 2048, "laggy_since": "2026-03-31T10:00:00" }
```

## Step 2 - Check Client Health from the Cluster Side

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- ceph health detail
```

A warning like this signals an eviction is imminent:

```text
HEALTH_WARN 1 clients are laggy
mds0: 1 client(s) failing to respond
```

## Step 3 - Investigate the Evicted Client

On the Kubernetes node where the client runs, check for filesystem errors:

```bash
dmesg | grep -i ceph
journalctl -u kubelet | grep -i cephfs
```

If the pod holding the CephFS volume is stuck in `Terminating`, force delete it:

```bash
kubectl delete pod <pod-name> -n <namespace> --grace-period=0 --force
```

## Step 4 - Tune the Client Eviction Timeout

Increase the timeout before MDS evicts a laggy client. Use the config to allow more recovery time:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph config set mds mds_session_blocklist_on_timeout false

kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph config set mds mds_session_timeout 120
```

## Step 5 - Limit Caps Per Client

When MDS cache is under pressure, it can evict clients to reclaim caps. Reduce the per-client cap limit:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph config set mds mds_max_caps_per_client 16384
```

## Step 6 - Configure the CephFilesystem for Resilience

Use the `CephFilesystem` resource to enable standby-replay MDS daemons, reducing the window during which clients can be evicted due to MDS failover:

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
    config:
      mds_session_timeout: "120"
      mds_max_caps_per_client: "16384"
```

## Step 7 - Monitor with Prometheus Alerts

Create an alert to notify when clients are being evicted:

```yaml
groups:
- name: cephfs-client
  rules:
  - alert: CephFSClientEviction
    expr: increase(ceph_mds_evict_clients_total[5m]) > 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "CephFS client eviction detected"
```

## Summary

CephFS client eviction in Rook-Ceph typically results from network issues, MDS cache pressure, or capability deadlocks. The key mitigations are increasing the eviction timeout, capping the number of client caps, enabling standby-replay MDS daemons, and alerting proactively on eviction events. When eviction occurs, force-delete stuck pods and verify the client remounts cleanly.
