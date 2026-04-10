# How to Configure Ceph for Low-Bandwidth Edge Sites

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Edge Computing, Network, Bandwidth

Description: Learn how to tune Ceph replication and recovery settings to operate reliably over low-bandwidth WAN links between edge sites and the core datacenter.

---

Edge deployments often rely on limited network connections - LTE links, satellite, or constrained leased lines. Ceph can be configured to minimize bandwidth consumption while maintaining data consistency.

## Understanding Bandwidth Sources in Ceph

Ceph generates network traffic from:
1. Client I/O (reads/writes from applications)
2. Replication (writing to secondary OSDs)
3. Recovery and backfill (rebalancing data after failures)
4. Heartbeat and monitoring (mon/mgr communication)
5. Scrubbing (reading data across replicas)

## Tuning Replication Traffic

For low-bandwidth links, use erasure coding instead of 3-way replication to reduce write amplification:

```bash
ceph osd erasure-code-profile set edge-profile \
  k=4 m=2 \
  plugin=jerasure \
  technique=reed_sol_van

ceph osd pool create ec-edge-pool 32 32 erasure edge-profile
```

This stores 4 data chunks + 2 parity chunks instead of 3 full copies, reducing storage overhead from 3x to 1.5x.

## Limiting Recovery Bandwidth

Throttle recovery to leave bandwidth for client I/O:

```bash
ceph config set osd osd_max_backfills 1
ceph config set osd osd_recovery_max_active 1
ceph config set osd osd_recovery_max_single_start 1
ceph config set osd osd_recovery_op_priority 3

# Limit recovery bandwidth per OSD (bytes/sec)
ceph config set osd osd_recovery_sleep 0.1
ceph config set osd osd_backfill_scan_min 4
ceph config set osd osd_backfill_scan_max 16
```

## Configuring QoS for Client I/O vs Recovery

Use the mclock scheduler to prioritize client traffic:

```bash
ceph config set osd osd_op_queue mclock_scheduler
ceph config set osd osd_mclock_profile high_client_ops
```

## Reducing Scrub Traffic Over WAN

Schedule scrubs during off-peak hours when bandwidth is less contested:

```bash
ceph config set osd osd_scrub_begin_hour 2
ceph config set osd osd_scrub_end_hour 5
ceph config set osd osd_scrub_sleep 0.5
```

## Compressing RGW Data at Edge Sites

For RGW deployments at edge sites, enable placement-level compression to reduce the stored data volume:

```bash
radosgw-admin zone placement modify --rgw-zone=edge-zone \
  --placement-id=default-placement \
  --storage-class=STANDARD \
  --compression=snappy
```

Note that this compresses data at rest within the zone, not sync traffic on the wire. To compress inter-site replication traffic, use a WAN optimization layer or reverse proxy with compression in front of your RGW endpoints.

## Monitoring Bandwidth Usage

Track replication and recovery traffic per OSD:

```bash
ceph tell osd.0 perf dump | python3 -m json.tool | grep -E "send_bytes|recv_bytes"
```

Or use the Ceph dashboard network tab:

```bash
ceph mgr module enable dashboard
ceph dashboard set-grafana-api-url http://grafana:3000
```

## Disabling Non-Essential Services

On constrained links, disable telemetry and reduce heartbeat and beacon frequency:

```bash
ceph config set osd osd_heartbeat_interval 10
ceph config set osd mon_osd_beacon_interval 120
ceph mgr module disable telemetry
ceph config set mon mon_osd_min_up_ratio 0.5
```

## Summary

Configuring Ceph for low-bandwidth edge sites involves choosing erasure coding over replication, throttling recovery traffic, using the mclock scheduler to protect client I/O, and scheduling scrubs during off-peak windows. Together these settings allow Ceph to operate reliably on constrained WAN links without starving application traffic.
