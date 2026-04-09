# Validation Summary: How to Monitor Ceph Log Messages

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (cluster logging, daemon debug levels, admin sockets)
- Rook-Ceph (Kubernetes operator for Ceph)
- Kubernetes (kubectl logs, pod label selectors, ConfigMaps)
- Loki (LogQL query example)

## Sources Consulted
- Ceph MonCommands.h (command signatures for `ceph log last`): https://github.com/ceph/ceph/blob/main/src/mon/MonCommands.h
- Ceph log-and-debug documentation: https://docs.ceph.com/en/latest/rados/troubleshooting/log-and-debug/
- Ceph BlueStore migration docs: https://docs.ceph.com/en/reef/rados/operations/bluestore-migration/
- Ceph storage devices documentation: https://docs.ceph.com/en/latest/rados/configuration/storage-devices/
- Rook Advanced Ceph Configuration: https://rook.io/docs/rook/v1.12/Storage-Configuration/Advanced/ceph-configuration/
- Rook Common Issues / Troubleshooting: https://rook.io/docs/rook/latest-release/Troubleshooting/ceph-common-issues/

## Issues Found

1. **`debug_filestore` is deprecated (line 76)**: The blog used `ceph tell osd.0 config set debug_filestore 10`. FileStore was deprecated starting with Ceph Reef and is no longer supported in current releases. Rook has used BlueStore exclusively as the default OSD backend since Ceph Luminous (12.2.x). Changed to `debug_bluestore` which is the correct subsystem for modern Ceph/Rook deployments.

2. **Debug level range incorrect (line 74)**: The comment stated "(1-20, higher = more verbose)" but Ceph debug levels range from 0 to 20, where 0 means minimal/no logging and is the default for many subsystems. Changed to "(0-20, higher = more verbose)".

3. **`log_to_stderr = false` in ConfigMap (line 104)**: The ConfigMap example had both `log_to_stderr = false` and `log_to_file = false`, which would disable all daemon log output entirely. In Rook-Ceph, daemons log to stderr by default so that Kubernetes captures the output as pod logs. Changed `log_to_stderr` to `true` to preserve proper log collection in Rook environments.

## Review Notes
- The `ceph log last N channel` syntax (e.g., `ceph log last 100 cluster`) works because the Ceph CLI parser disambiguates between the optional `level` and `channel` positional arguments via their allowed value sets, even though the formal signature defines `level` before `channel`.
- The reset command `ceph tell osd.0 config set debug_osd 1` sets the level to 1/1, while the full default is 1/5 (log level 1, memory level 5). This is a minor simplification that is acceptable for a blog post context.
- Container names `-c osd`, `-c mon`, `-c mgr` follow Rook-Ceph naming conventions but could not be confirmed from official documentation alone; they would need verification against a running cluster.
- The Loki query uses `| logfmt` which may not parse Ceph log lines into structured fields since Ceph doesn't use logfmt format, but the query will still correctly filter for lines containing "ERR".
