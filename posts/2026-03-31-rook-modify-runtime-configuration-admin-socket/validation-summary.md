# Validation Summary: How to Modify Runtime Configuration via Admin Socket

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (admin socket, runtime configuration)
- Rook (Ceph orchestration on Kubernetes)
- Ceph OSD configuration (recovery tuning, debug logging)
- Ceph RGW (RADOS Gateway) configuration
- Bash scripting (batch daemon configuration)

## Sources Consulted
- Ceph official documentation: Admin Socket interface and `ceph daemon` command (https://docs.ceph.com/en/latest/rados/operations/admin-socket/)
- Ceph configuration reference for OSD options: `osd_max_backfills`, `osd_recovery_max_active`, `osd_recovery_op_priority` (https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/)
- Ceph debug logging documentation (https://docs.ceph.com/en/latest/rados/troubleshooting/log-and-debug/)
- Ceph RGW configuration reference: `rgw_thread_pool_size` (https://docs.ceph.com/en/latest/radosgw/config-ref/)
- Ceph `ceph config set` documentation for persistent config via the monitor store (https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/)

## Issues Found

### 1. Incorrect RGW daemon name format for admin socket
- **What was wrong:** The post used `rgw.myzone` as the daemon name in `ceph daemon` commands (e.g., `ceph daemon rgw.myzone config set ...`). The RGW admin socket file is named `ceph-client.rgw.<instance>.asok`, so `ceph daemon` resolves `rgw.myzone` to the non-existent path `ceph-rgw.myzone.asok`.
- **What was changed:** All three occurrences of `rgw.myzone` were changed to `client.rgw.myzone`, which correctly resolves to the actual socket path `ceph-client.rgw.myzone.asok`.
- **Why:** The `ceph daemon` command constructs the admin socket path as `/var/run/ceph/{cluster}-{name}.asok`. RGW daemons use the `client.rgw.` type prefix in their socket filenames, so the full daemon name including `client.` is required.

## Review Notes
- The `ceph daemon` command communicates via a local Unix domain socket, meaning it only works for daemons running on the same host. The loop using `ceph osd ls` lists all cluster OSDs, but only local ones are reachable via admin socket. The first loop example handles this with `2>/dev/null`, but the batch script does not suppress errors for unreachable remote OSDs. For cluster-wide runtime changes, `ceph tell osd.* config set <key> <value>` is the recommended approach.
- Setting `debug_osd 0` to "disable verbose logging" sets the log level below the default of `1/5`. A more precise restore would be `debug_osd 1/5`, though setting to 0 is a common practice and not harmful.
- In Ceph Pacific (16.x) and later, `osd_recovery_max_active` was supplemented by `osd_recovery_max_active_hdd` and `osd_recovery_max_active_ssd` for device-type-specific tuning. The original option still works but readers using newer Ceph versions may want to use the device-specific variants.
- The "restore" values in the recovery throttling examples (e.g., `osd_max_backfills 4`, `osd_recovery_max_active 5`) are higher than typical defaults (1 and 3 respectively). This is not incorrect, but readers should be aware these are example values for aggressive recovery, not the Ceph defaults.
- In Rook deployments, accessing the admin socket requires `kubectl exec` into the specific daemon pod. The `journalctl` command shown for monitoring logs would not work inside Rook containers; `kubectl logs` is the standard approach in that context.
