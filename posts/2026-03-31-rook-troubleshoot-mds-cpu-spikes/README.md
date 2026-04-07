# How to Troubleshoot MDS CPU Usage Spikes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, MDS, CephFS, Troubleshooting, CPU, Kubernetes

Description: Learn how to diagnose and resolve MDS CPU usage spikes in CephFS, covering cache pressure, directory traversal storms, client reconnections, and journal replay issues.

---

## Common Causes of MDS CPU Spikes

MDS CPU spikes typically have one of these root causes:
- Cache trimming under memory pressure
- Directory tree traversal by backup tools or crawlers
- Mass client reconnection storms after network partitions
- Journal replay when recovering from an active MDS failure
- Capability revocation storms during client disconnections

## Diagnosing Current CPU Usage

Start by checking MDS pod CPU consumption in Kubernetes:

```bash
kubectl -n rook-ceph top pods -l app=rook-ceph-mds

# Detailed resource metrics
kubectl -n rook-ceph describe pod -l app=rook-ceph-mds | grep -A 10 "Limits\|Requests"
```

## Checking MDS Internal Activity

Look at what the MDS is actually doing during the spike:

```bash
# Get active MDS name
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs status myfs

# Dump current operation queue
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.myfs.a dump_ops_in_flight

# Check connected client count
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.myfs.a session ls | jq length
```

## Diagnosing Cache Pressure

High CPU during cache trimming often correlates with cache being too small:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.myfs.a cache status
```

If `cache_size` is near `mds_cache_memory_limit`, the MDS is constantly trimming. Increase the cache limit:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_cache_memory_limit 8589934592
```

## Identifying Directory Crawl Traffic

Backup agents, indexers, and monitoring tools that traverse entire directory trees can overwhelm the MDS:

```bash
# Check which clients are generating the most requests
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.myfs.a session ls | \
  python3 -c "import json,sys; sessions=json.load(sys.stdin); \
  [print(s['client_metadata'].get('hostname','?'), s.get('num_leases',0)) for s in sessions]"
```

If a specific host is responsible, rate-limit its metadata operations or schedule the crawl during off-peak hours.

## Handling Client Reconnection Storms

After a network partition, many clients reconnect simultaneously, flooding the MDS:

```bash
# Increase the reconnection timeout to spread reconnects
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_reconnect_timeout 60
```

## Adjusting MDS CPU Limits

If spikes are expected and acceptable, adjust the Kubernetes CPU limits:

```yaml
metadataServer:
  resources:
    requests:
      cpu: "2"
    limits:
      cpu: "8"
```

## Tuning Session Management

Reduce CPU from capability management:

```bash
# Reduce capability revocation delay
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_recall_state_timeout 60

# Limit max caps per client session
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_max_caps_per_client 65536
```

## Summary

MDS CPU spikes are most often caused by cache pressure from insufficient memory limits, directory crawl traffic from backup tools, or mass client reconnection events. Start diagnosis by checking cache status and connected client activity. For persistent spikes, increase the MDS cache memory limit and adjust Kubernetes CPU limits to give the MDS headroom to handle peak loads. Rate-limiting aggressive crawling clients eliminates a common and often overlooked source of MDS load.
