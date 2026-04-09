# How to Handle Network Partitions in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Networking, Troubleshooting, High Availability, Operation

Description: Respond to and recover from network partition events in Ceph clusters, including MON quorum loss, split-brain OSD scenarios, and safe recovery procedures after reconnection.

---

## Network Partitions in Distributed Storage

A network partition splits a Ceph cluster into isolated segments that cannot communicate. Ceph's response depends on which components are partitioned:

- **MON partition**: Quorum loss if majority of MONs are isolated
- **OSD partition**: OSDs mark each other down, PGs go degraded
- **Client partition**: Clients get I/O errors, mounts may freeze

## Detecting a Network Partition

Signs of a partition vs. normal failure:

```bash
# Check MON quorum
ceph quorum_status --format json-pretty

# Are MONs seeing each other?
ceph mon stat

# Check OSD connectivity status
ceph osd stat
ceph osd tree | grep down

# Look for split-brain indicators
ceph health detail | grep -E "quorum|partition|split"

# Network-level diagnosis
for node in mon1 mon2 mon3; do
  echo -n "$node reachable from here: "
  ping -c 1 -W 1 $node &>/dev/null && echo "YES" || echo "NO"
done
```

## MON Quorum Loss Response

If less than half the MONs are reachable, clients cannot perform operations (Ceph requires majority quorum for all writes):

```bash
# Check quorum status
ceph quorum_status

# If quorum is lost, verify which MONs are actually up
systemctl status ceph-mon@mon1
systemctl status ceph-mon@mon2
systemctl status ceph-mon@mon3

# Check MON logs for connectivity issues
journalctl -u ceph-mon@mon1 | grep -E "timeout|partition|disconnect" | tail -20
```

If a minority partition has isolated MONs, restart them to force rejoin:

```bash
# On the isolated MON node
systemctl restart ceph-mon@mon1

# Verify it rejoined quorum
ceph quorum_status --format json | grep quorum_names
```

## OSD Down/Out After Partition

During a partition, OSDs mark each other down. After reconnection, they need to re-peer:

```bash
# Check which OSDs went down during partition
ceph osd tree | grep down

# If OSDs didn't automatically recover, restart them
systemctl restart ceph-osd@3
systemctl restart ceph-osd@4

# Watch recovery
watch -n 10 'ceph osd stat; ceph -s | tail -5'
```

## Using noout During Suspected Transient Partitions

If you suspect a brief network outage (not a permanent failure):

```bash
# Prevent Ceph from marking OSDs "out" and starting recovery
# Do this BEFORE the partition happens if planned maintenance
ceph osd set noout

# The partition recovers, OSDs come back up
# Remove the noout flag
ceph osd unset noout
```

## Handling Extended Partitions

For partitions lasting more than the `mon_osd_down_out_interval` (default 600 seconds):

```bash
# Check if OSDs were auto-marked out
ceph osd dump | grep " out "

# If they were auto-marked out during partition:
# 1. Bring them back in after connectivity restores
ceph osd in osd.3 osd.4

# 2. Watch for re-peering
watch -n 10 'ceph pg stat'
```

## Preventing False Failures with noout Flag Scheduling

Set `noout` automatically during network maintenance:

```bash
#!/bin/bash
# network-maintenance.sh

echo "Starting network maintenance..."
ceph osd set noout
ceph osd set norebalance

# Wait for human to signal completion or timeout after 2 hours
echo "Network maintenance in progress. Press CTRL+C when done or wait 7200s..."
sleep 7200 &
SLEEP_PID=$!
trap 'kill $SLEEP_PID 2>/dev/null' INT TERM

wait $SLEEP_PID
echo "Maintenance window ended, re-enabling recovery..."
ceph osd unset noout
ceph osd unset norebalance
ceph health
```

## Ceph Messenger and Network Tuning for Partition Resilience

Tune timeouts to be more tolerant of transient network issues:

```bash
# Prevent automatic mark-out when an entire rack goes down
# (default is rack; set to host to auto-mark-out at host level)
ceph config set mon mon_osd_downout_subtree_limit rack

# Tune OSD heartbeat timeouts (more tolerant of high-latency links)
# Defaults are grace=20, interval=6; increase for flaky networks
ceph config set osd osd_heartbeat_grace 40
ceph config set osd osd_heartbeat_interval 10
```

## Rook/Kubernetes Network Partition Recovery

In Kubernetes, partition recovery involves node conditions:

```bash
# Check if nodes are Ready
kubectl get nodes
kubectl describe node <isolated-node> | grep -E "Ready|Condition"

# After connectivity restores, verify OSD pods restart
kubectl get pods -n rook-ceph | grep osd

# Force pod restart if needed
kubectl delete pod -n rook-ceph -l app=rook-ceph-osd
```

## Summary

Ceph handles network partitions by marking unreachable OSDs down and, after a timeout, as out. Setting `noout` before known network maintenance prevents premature data rebalancing. After partitions resolve, OSDs automatically re-peer and recover data consistency. MON quorum loss is the most critical scenario - losing the majority of MONs prevents administrative operations, new client authentication, and OSD map updates, making the cluster effectively unavailable. Design MON placement across fault domains (racks, AZs) to prevent quorum loss from any single network partition.
