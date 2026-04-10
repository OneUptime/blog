# How to Configure Ceph for Intermittent Connectivity at Edge

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Edge Computing, Network, Resilience

Description: Learn how to configure Ceph to tolerate intermittent WAN connectivity at edge sites, keeping local operations running during disconnections.

---

Edge sites frequently experience intermittent WAN connectivity. Ceph must continue serving local workloads during disconnections and reconcile any changes when connectivity is restored. Proper configuration prevents cluster degradation from temporary network outages.

## Understanding Ceph's Connectivity Dependencies

Ceph daemons have varying sensitivity to network interruptions:

- **OSD-to-OSD** (cluster network) - must stay up for replication and health
- **OSD-to-Mon** - must stay up for cluster state; tolerates brief interruptions
- **RGW sync** - can tolerate long disconnections; catches up when reconnected
- **CephFS MDS** - requires active connection to mons

## Tuning Heartbeat Timeouts

Increase heartbeat and OSD timeouts to tolerate flapping links:

```bash
# Grace period for OSD heartbeats
ceph config set osd osd_heartbeat_grace 60

# Interval between OSD heartbeat messages
ceph config set osd osd_heartbeat_interval 10

# Mon election timeout
ceph config set mon mon_lease 30
ceph config set mon mon_lease_renew_interval_factor 0.6
```

## Preventing OSD Mark-Out on Short Outages

By default, OSDs are marked out after 10 minutes (600 seconds). For edge sites with unreliable power, increase this significantly:

```bash
ceph config set mon mon_osd_down_out_interval 1800
```

Disable automatic OSD removal entirely for single-site edge:

```bash
ceph config set mon mon_osd_down_out_subtree_limit host
```

## Configuring RGW for Offline Resilience

RGW sync tolerates long outages and automatically catches up:

```bash
radosgw-admin sync status

# Resync after extended outage
radosgw-admin data sync init --source-zone=core-zone
radosgw-admin data sync run --source-zone=core-zone
```

## Handling Mon Quorum on Edge Clusters

Three-node edge clusters can lose quorum with two simultaneous failures. For single-node edge:

```yaml
spec:
  mon:
    count: 1
    allowMultiplePerNode: true
```

This sacrifices HA but allows operation with a single node during connectivity issues.

## Configuring CRUSH Rules for Local Preference

Ensure data is replicated locally first:

```bash
ceph osd crush rule create-replicated local-rule default host
ceph osd pool set mypool crush_rule local-rule
```

## Graceful Reconnection After Outage

When connectivity is restored, check cluster state:

```bash
ceph health detail
ceph -s
```

If OSDs were marked out, bring them back:

```bash
ceph osd in osd.0 osd.1 osd.2
```

Force a fast recovery:

```bash
ceph config set osd osd_max_backfills 3
ceph config set osd osd_recovery_max_active 3
```

## Summary

Configuring Ceph for intermittent edge connectivity requires extending heartbeat and OSD timeout values to tolerate short outages, setting appropriate thresholds for when OSDs are marked down, and trusting RGW sync to catch up automatically after reconnection. With these settings, local applications continue operating normally during WAN interruptions.
