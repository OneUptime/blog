# How to Handle Subcluster Failures in Stretch Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Stretch Mode, Failure, Recovery

Description: Learn how Ceph handles subcluster failures in stretch mode and the steps to recover cleanly after a full site outage.

---

## What is a Subcluster Failure?

In Ceph stretch mode, a subcluster failure refers to the complete loss of one of the two data sites. This could be caused by a power outage, network partition, or hardware failure affecting all hosts in a single datacenter.

## How Ceph Responds

When site A loses connectivity, the surviving site B plus the arbiter monitor form a quorum of three (two site-B monitors plus the arbiter). The cluster automatically:

1. Marks site A's OSDs as down
2. Raises `HEALTH_WARN` with degraded and undersized PG warnings
3. Enters degraded stretch mode, reducing `min_size` on pools to allow continued reads and writes from site B
4. Marks affected PGs as `active+undersized+degraded` until the site recovers

Check the current cluster state after a site failure:

```bash
ceph health detail
ceph osd tree | grep down
ceph pg stat
```

## Preventing Premature OSD Rebalancing

Stretch mode automatically prevents rebalancing when it enters degraded stretch mode. However, as an extra precaution, you can set the `noout` and `norebalance` flags to ensure no unexpected data movement occurs while waiting for the failed site to recover:

```bash
ceph osd set noout
ceph osd set norebalance
```

This prevents unnecessary data movement that would have to be reversed when the site recovers.

## Monitoring the Degraded State

While operating in degraded state, monitor PG status closely:

```bash
watch ceph pg stat
```

Expected output during site failure:

```text
3256 pgs: 3256 active+undersized; 1.5 TiB data, 3.0 TiB used, 10 TiB / 13 TiB avail
```

Check which OSDs are down:

```bash
ceph osd stat
ceph osd df | grep -v "up"
```

## Recovering After the Failed Site Returns

When site A comes back online, its OSDs will reconnect and the cluster will begin synchronizing missed writes. Clear the `noout` and `norebalance` flags:

```bash
ceph osd unset noout
ceph osd unset norebalance
```

Monitor recovery progress:

```bash
ceph -w
ceph pg stat
```

Wait for all PGs to return to `active+clean`:

```bash
watch -n5 "ceph pg stat | grep -v 'active+clean'"
```

## Handling a Permanent Site Loss

If the failed site will not return, you must remove its OSDs and rebuild quorum without stretch mode, or rebuild the second site from scratch:

```bash
# Mark all site-A OSDs out
for osd in $(ceph osd ls); do
  crush_loc=$(ceph osd find $osd | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['crush_location'].get('datacenter',''))")
  if [ "$crush_loc" = "dc1" ]; then
    ceph osd out $osd
  fi
done
```

Wait for rebalancing to complete, then remove the OSDs:

```bash
ceph osd purge osd.X --yes-i-really-mean-it
```

## Summary

Ceph stretch mode gracefully handles single-site failures by maintaining quorum through the arbiter and continuing operations from the surviving site. Setting `noout` and `norebalance` during the outage prevents unnecessary data movement. When the failed site recovers, simply clearing those flags allows automatic resynchronization without manual intervention.
