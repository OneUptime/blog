# Validation Summary: How to Set DmClock Reservations for Ceph Clients

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (mClock/DmClock QoS scheduler)
- Rook (Ceph operator for Kubernetes)
- RBD (RADOS Block Device) QoS
- CephFS
- RADOS bench

## Sources Consulted
- Ceph official documentation on mClock QoS: https://docs.ceph.com/en/latest/rados/configuration/mclock-config-ref/
- Ceph RBD QoS documentation: https://docs.ceph.com/en/latest/rbd/rbd-config-ref/
- Ceph MDS configuration reference: https://docs.ceph.com/en/latest/cephfs/client-config-ref/
- Ceph `osd perf` command reference: https://docs.ceph.com/en/latest/man/8/ceph/

## Issues Found

1. **RBD QoS section conflated rate limits with DmClock reservations**: The original section titled "Setting Per-Client Reservations via RBD QoS" presented `rbd_qos_read_iops_limit` and `rbd_qos_write_iops_limit` as DmClock reservations. These are actually client-side rate **limits** (caps), not minimum guarantees. Renamed the section to "Setting Per-Image Rate Limits via RBD QoS" and clarified that these complement DmClock by controlling noisy neighbors. Also replaced `rbd_qos_iops_burst_seconds` with `rbd_qos_iops_limit` which is more relevant.

2. **`rbd config image get` incorrect command**: Changed to `rbd config image list`, which is the correct subcommand for listing image configuration.

3. **Per-client config DB section was misleading**: The original suggested setting `osd_mclock_scheduler_client_res` on a `client.*` entity (e.g., `client.db-server`). This parameter is an OSD-level scheduler setting and is not honored when set on client entities. Rewrote the section as "Per-OSD Reservation via Ceph Config DB" showing how to set it on individual OSDs or globally.

4. **CephFS section used unrelated MDS settings**: The original used `mds_max_caps_per_client` and `client_caps_release_delay` as DmClock QoS examples. These are MDS capability management settings with no relation to DmClock I/O scheduling. Rewrote to explain that CephFS data I/O traverses OSDs and is therefore subject to OSD-level mClock reservations.

5. **`ceph osd perf` description inaccurate**: The original claimed this shows per-client IOPS throttling. `ceph osd perf` reports OSD commit/apply latency, not per-client IOPS. Changed the description to "Monitor per-OSD latency to identify OSDs under heavy load."

6. **Summary paragraph updated**: Removed the claim about "RBD image metadata" for setting reservations and clarified the distinction between OSD-level DmClock reservations and RBD client-side rate limiting.

## Review Notes
- The mClock scheduler (`osd_op_queue = mclock_scheduler`) must be enabled for DmClock reservations to take effect. The post does not mention this prerequisite. In Ceph Quincy and later, mClock is the default OSD scheduler, but earlier versions default to the WeightedPriorityQueue.
- The 70-80% capacity guideline for total reservations is reasonable practical advice but is not an official Ceph recommendation. It is presented appropriately as guidance rather than a hard rule.
- DmClock in Ceph does not currently support true per-client differentiated reservations at the OSD level — the `client_res` parameter applies uniformly to all client I/O on a given OSD. Per-client differentiation would require changes to the mClock scheduler. The post could benefit from clarifying this limitation in a future update.
