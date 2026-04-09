# How to Check Monitor Status and Quorum in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitor, Quorum, Health

Description: Check Ceph monitor quorum status, identify leader and quorum members, and troubleshoot monitor failures in a Rook-managed cluster.

---

Ceph monitors (MONs) maintain the authoritative cluster map and require a quorum (majority) to function. Understanding monitor status and quorum health is essential for maintaining a healthy Ceph cluster, since losing quorum makes the entire cluster unavailable.

## Check Monitor Status

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph mon stat
```

Sample output:

```text
e3: 3 mons at {a=[v2:10.0.0.1:3300/0,v1:10.0.0.1:6789/0],b=[v2:10.0.0.2:3300/0,v1:10.0.0.2:6789/0],c=[v2:10.0.0.3:3300/0,v1:10.0.0.3:6789/0]}, election epoch 6, leader a, quorum a,b,c
```

This shows 3 monitors, all in quorum, with `a` as the leader.

## Check Quorum Status in Detail

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph quorum_status
```

Sample JSON output:

```json
{
  "election_epoch": 6,
  "quorum": [0, 1, 2],
  "quorum_names": ["a", "b", "c"],
  "quorum_leader_name": "a",
  "monmap": {
    "fsid": "a3f8e12d-...",
    "mons": [
      {"name": "a", "addr": "10.0.0.1:6789"},
      {"name": "b", "addr": "10.0.0.2:6789"},
      {"name": "c", "addr": "10.0.0.3:6789"}
    ]
  }
}
```

## Check Monitor Pods in Kubernetes

```bash
kubectl get pods -n rook-ceph -l app=rook-ceph-mon
```

Expected output for a healthy 3-monitor cluster:

```text
NAME                  READY   STATUS    RESTARTS   AGE
rook-ceph-mon-a-...   2/2     Running   0          5d
rook-ceph-mon-b-...   2/2     Running   0          5d
rook-ceph-mon-c-...   2/2     Running   0          5d
```

## Identify the Monitor Leader

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph quorum_status --format json | python3 -c "
import json, sys
data = json.load(sys.stdin)
print('Leader:', data['quorum_leader_name'])
print('Quorum members:', data['quorum_names'])
print('Total mons:', len(data['monmap']['mons']))
"
```

## View Monitor Map

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph mon dump
```

## Check Monitor Clock Skew

Monitors require tight clock synchronization (within 0.05s by default):

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph time-sync-status
```

Or check the health detail:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health detail | grep -i clock
```

## Troubleshoot a Monitor Not in Quorum

If a monitor is missing from quorum:

```bash
# Check which monitor is out of quorum
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph mon stat

# Check that monitor's pod logs
kubectl logs -n rook-ceph \
  $(kubectl get pod -n rook-ceph -l ceph_daemon_id=b -o name) \
  -c mon | tail -50
```

## Monitor Count Requirements

Ceph requires an odd number of monitors:

| Monitor Count | Tolerance | Quorum Needed |
|---|---|---|
| 1 | 0 failures | 1 |
| 3 | 1 failure | 2 |
| 5 | 2 failures | 3 |

Configure the number of monitors in the Rook `CephCluster` CRD:

```yaml
spec:
  mon:
    count: 3
    allowMultiplePerNode: false
```

## Summary

Ceph monitor quorum is checked with `ceph mon stat` (summary) and `ceph quorum_status` (full JSON detail including leader election state). A healthy cluster requires an odd number of monitors with a majority in quorum. In Rook, monitor count is configured in the `CephCluster` CRD, and monitor pods run in the `rook-ceph` namespace. Watch for `MON_CLOCK_SKEW` health warnings and ensure NTP synchronization across all monitor nodes.
