# Validation Summary: How to Configure Ceph Logging and Debugging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl CLI)
- logrotate (Linux log rotation)

## Sources Consulted
- Ceph official documentation: Logging and Debugging — https://docs.ceph.com/en/latest/rados/troubleshooting/log-and-debug/
- Ceph official documentation: Ceph Configuration Reference (Logging) — https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/#logging-and-debugging
- Ceph source code: `src/logrotate.conf` and `src/mon/MonCommands.h` on GitHub (ceph/ceph main branch)
- Ceph official documentation: BlueStore Migration — https://docs.ceph.com/en/latest/rados/operations/bluestore-migration/

## Issues Found

1. **Log level format was reversed**: The post described the format as `<memory_level>/<disk_level>` but the correct Ceph format is `<log_level>/<memory_level>` (on-disk log level first, in-memory level second). Fixed the format description and the accompanying explanation of what `0/5` means.

2. **In-memory buffer flush condition was imprecise**: The post said the in-memory buffer "is written to disk when an error occurs." Per official docs, it is specifically flushed on fatal signals or assertion failures within Ceph code, not on generic errors. Fixed the description.

3. **`debug_filestore` and `debug_journal` are deprecated subsystems**: FileStore has been deprecated since the Reef release. Modern Ceph deployments use BlueStore. Replaced `debug_filestore` with `debug_bluestore` and `debug_journal` with `debug_bluefs` in the common subsystems example.

4. **`pkill` syntax in logrotate postrotate was incorrect**: `pkill` does not accept multiple process names as separate arguments. The command `pkill -HUP ceph-osd ceph-mon ceph-mds` would only match the first argument. Replaced with `killall -q -1 ceph-mon ceph-mgr ceph-mds ceph-osd radosgw || true`, which matches the pattern used in Ceph's official `src/logrotate.conf`. Also added the missing `ceph-mgr` and `radosgw` daemons.

## Review Notes
- The post uses `ceph tell ... injectargs` for dynamic log changes, which still works but is considered the legacy approach. The modern preferred method per current Ceph docs is `ceph tell <daemon> config set <key> <value>`. This was not changed since `injectargs` remains functional, but a future update could modernize the examples.
- The `ceph log last 100 cluster` command was verified as correct. Valid channels are `*`, `cluster`, `audit`, and `cephadm`.
- The `--debug-osd` (dashes) syntax in `injectargs` is functionally equivalent to `--debug_osd` (underscores) due to automatic normalization in Ceph's argument parser. Both forms work correctly.
