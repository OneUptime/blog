# Validation Summary: How to Set Up Drive LED Identification for Ceph Maintenance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (device management, OSD metadata)
- Rook (Kubernetes Ceph operator)
- ledctl / ledmon (Intel LED control utility)
- sg_ses / sg3-utils (SCSI enclosure management)
- ipmitool (IPMI chassis management)
- kubectl (Kubernetes CLI, debug pods)

## Sources Consulted
- Ceph Device Management documentation: https://docs.ceph.com/en/reef/rados/operations/devices/
- Ceph source (device command reference): https://github.com/ceph/ceph/blob/main/doc/rados/operations/devices.rst
- Rook Ceph OSD Management documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-osd-mgmt/
- Rook OSD pod labels (GitHub source): https://github.com/rook/rook/blob/master/Documentation/Storage-Configuration/Advanced/ceph-osd-mgmt.md
- ledctl man page (ledmon project)
- sg_ses man page (sg3-utils)
- ipmitool documentation

## Issues Found

1. **`ceph device light` used invalid light type `locate`**: The post used `ceph device light on <device-id> locate` in multiple places (Step 2 and the automation script). The valid light types for `ceph device light` are `ident` and `fault` — there is no `locate` type. Changed all occurrences of `locate` to `ident` in `ceph device light` commands. Note: the `ledctl` commands correctly use `locate`/`locate_off` — that is ledctl-specific syntax and is correct.

2. **Incorrect Rook OSD pod label selector**: The post used `-l osd=<osd-id>` to select OSD pods. In Rook, OSD pods use the label `ceph-osd-id`, not `osd`. Changed to `-l ceph-osd-id=<osd-id>`.

3. **Automation script used wrong metadata field**: The script extracted the device identifier with `jq -r '.devices'`, which returns the short device name (e.g., `sdb`). The `ceph device light` command requires the full device ID (e.g., `VENDOR_MODEL_SERIAL`), which is available in the `.device_ids` field of `ceph osd metadata` output. Changed `.devices` to `.device_ids`.

## Review Notes
- The `sg_ses` example (`sg_ses --index=0 --set=ident /dev/sg0`) is simplified. In practice, users may need to determine the correct element index for their specific enclosure topology using `sg_ses --page=es /dev/sg0` first.
- The `kubectl debug` approach for running host commands is correct but requires that the debug profile has sufficient privileges (typically `--profile=sysadmin` or similar may be needed depending on cluster security policies).
- The `ipmitool chassis identify` command controls the server chassis LED, not individual drive LEDs — the post correctly distinguishes this as server-level identification, which is accurate.
