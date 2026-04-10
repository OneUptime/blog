# Validation Summary: How to Configure Ceph for Low-Bandwidth Edge Sites

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Ceph OSD recovery and backfill tuning
- Ceph erasure coding
- Ceph mclock QoS scheduler
- Ceph scrub scheduling
- Ceph RGW (RADOS Gateway) multi-site and compression
- Ceph Dashboard / Grafana integration

## Sources Consulted
- Ceph official documentation: Cloud Sync Module (https://docs.ceph.com/en/latest/radosgw/cloud-sync-module/)
- Ceph official documentation: RGW Compression (https://docs.ceph.com/en/latest/radosgw/compression/)
- Ceph official documentation: Pool Placement and Storage Classes (https://docs.ceph.com/en/latest/radosgw/placement/)
- Ceph bug tracker: #21895 - multisite destination zone does not compress synced objects (https://tracker.ceph.com/issues/21895)
- Ceph official documentation: radosgw-admin man page (https://docs.ceph.com/en/latest/man/8/radosgw-admin/)
- Ceph official documentation: OSD configuration reference for recovery, heartbeat, and scrub settings
- Ceph official documentation: mclock QoS scheduler profiles

## Issues Found

### Issue 1: Incorrect RGW sync compression command (lines 76-79)
**What was wrong:** The original command used `radosgw-admin zone modify --tier-config=connection.host=...,compression=snappy` to enable compression for RGW multi-site sync. The `--tier-config` option is for the Cloud Sync Module (syncing to external S3-compatible stores like AWS S3), not for standard zone-to-zone multi-site replication. The `compression=snappy` key does not exist as a valid `--tier-config` parameter for either use case.

**What was changed:** Replaced the command with `radosgw-admin zone placement modify --rgw-zone=edge-zone --placement-id=default-placement --storage-class=STANDARD --compression=snappy`, which is the correct way to enable compression for RGW data at rest. Updated the section title from "Compressing RGW Sync Traffic" to "Compressing RGW Data at Edge Sites" and added a note clarifying that this compresses data at rest, not sync traffic on the wire.

**Why:** The original command would fail or have no effect. The correct approach uses placement-level compression, which is the RGW-native method for enabling data compression.

### Issue 2: Irrelevant `mon_compact_on_trim` setting (line 102)
**What was wrong:** The `mon_compact_on_trim` setting controls whether the Ceph monitor compacts its local RocksDB store after trimming old Paxos data. This is a local disk I/O operation with zero impact on network bandwidth or beacon frequency, despite being listed in a section claiming to "reduce beacon frequency."

**What was changed:** Replaced `ceph config set global mon_compact_on_trim false` with two settings that actually reduce network traffic: `ceph config set osd osd_heartbeat_interval 10` (increases inter-OSD heartbeat interval from default 6s to 10s) and `ceph config set osd mon_osd_beacon_interval 120` (increases OSD-to-monitor beacon interval from default 60s to 120s). Updated the section description to say "reduce heartbeat and beacon frequency."

**Why:** The original setting had no effect on network bandwidth. The replacement settings directly reduce heartbeat and beacon traffic, which is the stated goal of the section.

## Review Notes
- The `osd_recovery_op_priority` is set to 3, which is the default value in most Ceph versions. While the command is syntactically correct and valid, it doesn't actually lower recovery priority below default. Authors may want to set this lower (e.g., 1) if the intent is to further deprioritize recovery.
- The erasure coding profile uses `plugin=jerasure` and `technique=reed_sol_van`, which are correct but note that the `isa` plugin (Intel ISA-L) provides better performance on x86 hardware if available.
- The mclock scheduler (`osd_op_queue mclock_scheduler`) became the default in Ceph Quincy (17.2.x). For older versions (Pacific and earlier), this must be explicitly set.
- Increasing `osd_heartbeat_interval` and `mon_osd_beacon_interval` as recommended reduces network traffic but slows failure detection. This is an acceptable trade-off for edge sites but should be understood.
- The `mon_osd_min_up_ratio 0.5` setting is legitimate for edge sites with flaky connectivity — it prevents the cluster from marking OSDs as down too aggressively, which would trigger bandwidth-consuming recovery operations.
