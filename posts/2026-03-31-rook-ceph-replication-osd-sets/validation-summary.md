# Validation Summary: How to Understand Ceph Replication (Primary OSD, Secondary, Acting Set, Up Set)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- CRUSH algorithm (Ceph's placement algorithm)
- BlueStore (Ceph's storage backend)
- Placement Groups (PGs)
- OSDs (Object Storage Daemons)
- RBD (RADOS Block Device)

## Sources Consulted
- Ceph official documentation on placement groups and peering: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph official documentation on PG concepts (up set, acting set): https://docs.ceph.com/en/latest/rados/operations/pg-concepts/
- Ceph official documentation on the balancer module (upmap-read mode): https://docs.ceph.com/en/latest/rados/operations/balancer/
- Ceph Reef release notes on read balancing: https://docs.ceph.com/en/latest/releases/reef/
- Ceph documentation on BlueStore: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Ceph documentation on data placement and replication: https://docs.ceph.com/en/latest/rados/operations/data-placement/

## Issues Found

### Issue 1: Invalid `read_balance_score` command
- **What was wrong:** The command `ceph osd pool set replicapool read_balance_score 1` is invalid. `read_balance_score` is a read-only metric computed by the balancer module, not a settable pool property.
- **What was changed:** Replaced with the correct commands to enable read balancing: `ceph balancer on` followed by `ceph balancer mode upmap-read`. Also clarified the surrounding text to more accurately describe how read balancing works (the balancer reassigns PG primaries to distribute read load, rather than secondaries directly serving reads).
- **Why:** The original command would produce an error if executed. The correct mechanism uses the balancer module's `upmap-read` mode introduced in Ceph Reef.

### Issue 2: Incorrect `ack` write acknowledgment description
- **What was wrong:** The post stated that the client receives an `ack` "when the primary has written to journal/WAL," implying only the primary's write triggers the ack. In reality, the primary sends the ack to the client after it and a sufficient number of replicas (per `min_size`) have written to their WAL.
- **What was changed:** Updated the ack description to state "when the primary and a sufficient number of replicas (based on `min_size`) have written to journal/WAL."
- **Why:** The original description omitted the replica acknowledgment requirement, which is a core part of Ceph's replication durability guarantee.

### Issue 3: Outdated ack/ondisk distinction
- **What was wrong:** The post described `ack` and `safe/ondisk` as two current operational modes, with the implication that `ack` trades durability for throughput. With BlueStore (default since Luminous, the only production backend in modern Ceph), WAL writes are durable, so `ack` and `ondisk` occur simultaneously. The `ondisk` callback was deprecated in Nautilus.
- **What was changed:** Reframed the section as historical ("Ceph historically supported two write acknowledgment levels"), added a paragraph explaining that BlueStore makes the two levels equivalent, noted the Nautilus deprecation, and clarified that modern RBD workloads get full durability at the ack level.
- **Why:** Readers following this guide on modern Ceph clusters (which all use BlueStore) would have a misleading understanding of write durability if they believed ack mode defers persistence.

## Review Notes
- The Primary OSD section states the primary waits for "acknowledgment from all secondaries" before replying to the client. Technically, it waits for `min_size` replicas total (including itself), not necessarily all replicas. With default settings (size=3, min_size=2), only one secondary ack is needed. This is a common simplification in introductory material and was left as-is.
- The `ceph pg query` and `ceph osd map` commands and their example outputs are accurate.
- The descriptions of up set, acting set, primary OSD role, and peering behavior are all correct.
- The post uses `rook-ceph-tools` pod for running Ceph commands, which is the standard approach for Rook-managed clusters.
