# How to Test Stretch Mode Failover Scenarios

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Stretch Mode, Failover, Testing

Description: Learn how to safely test Ceph stretch mode failover scenarios including site failure simulation and recovery validation without risking data loss.

---

## Why Test Failover Scenarios?

Testing stretch mode failover before a real disaster strikes is essential. Without testing, you cannot be sure that your quorum configuration, CRUSH rules, and application-level reconnect logic all work correctly under stress. Schedule regular failover drills during maintenance windows.

## Preparing for Tests

Enable `noout` and `norebalance` to prevent unnecessary data movement during tests:

```bash
ceph osd set noout
ceph osd set norebalance
```

Take a snapshot of the current cluster state:

```bash
ceph status > /tmp/ceph-status-before.txt
ceph osd dump > /tmp/ceph-osd-dump-before.txt
```

## Scenario 1 - Single OSD Failure

Start by testing a single OSD failure on one site:

```bash
ceph osd down osd.0
ceph health detail
```

Verify the cluster reports degraded PGs but remains accessible:

```bash
ceph pg stat
```

Recover the OSD by restarting its daemon (the OSD will re-report itself as up):

```bash
sudo systemctl restart ceph-osd@0
```

## Scenario 2 - Simulating Full Site Failure

Mark all OSDs on site A as down to simulate a full site outage:

```bash
# Get OSDs on site dc1
SITE_OSDS=$(ceph osd tree --format json | python3 -c "
import sys, json
tree = json.load(sys.stdin)
nodes = {n['id']: n for n in tree['nodes']}
result = []
for n in tree['nodes']:
    if n.get('type') == 'datacenter' and 'dc1' in n['name']:
        for child_id in n.get('children', []):
            host = nodes.get(child_id, {})
            for osd_id in host.get('children', []):
                result.append(str(osd_id))
print(' '.join(result))")

for osd in $SITE_OSDS; do
  ceph osd down $osd
done
```

Verify the cluster continues operating from site B:

```bash
ceph status
dd if=/dev/urandom of=/tmp/testfile bs=4K count=1
rados -p testpool put testobj /tmp/testfile
rados -p testpool get testobj /tmp/testfile-out
```

## Scenario 3 - Network Partition Test

If you can control network routing, use firewall rules to block traffic from site A:

```bash
# On site A hosts - block inter-site traffic
iptables -I INPUT -s 10.0.2.0/24 -j DROP
iptables -I OUTPUT -d 10.0.2.0/24 -j DROP
```

Monitor quorum behavior:

```bash
ceph quorum_status
```

Restore connectivity:

```bash
iptables -D INPUT -s 10.0.2.0/24 -j DROP
iptables -D OUTPUT -d 10.0.2.0/24 -j DROP
```

## Scenario 4 - Arbiter Failure

Test what happens when the arbiter goes down while both sites are healthy:

```bash
ceph orch daemon stop mon.mon-arbiter
ceph quorum_status
```

Both sites retain quorum (4 monitors). Restart the arbiter:

```bash
ceph orch daemon start mon.mon-arbiter
```

## Verifying Recovery

After each test, verify full recovery:

```bash
ceph osd unset noout
ceph osd unset norebalance
watch ceph pg stat
```

Wait for all PGs to return to `active+clean`.

## Summary

Testing Ceph stretch mode failover scenarios in a controlled manner reveals gaps in configuration before they cause production incidents. Starting with single OSD failures and progressing to full site failures and network partitions gives you confidence that your stretch mode deployment behaves as expected. Always use `noout` during tests to prevent unnecessary rebalancing.
