# Validation Summary: How to Configure Ceph Daemon Log Levels

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (logging subsystem, daemon configuration)
- Rook (CephCluster CRD, rook-ceph-tools deployment)
- Kubernetes (kubectl, pod logs)

## Sources Consulted
- Ceph official documentation: Logging and Debugging — https://docs.ceph.com/en/latest/rados/troubleshooting/log-and-debug/
- Ceph source: `doc/rados/troubleshooting/log-and-debug.rst` on GitHub — https://github.com/ceph/ceph/blob/main/doc/rados/troubleshooting/log-and-debug.rst
- Ceph source: `src/common/dout.h` for log level mechanics — https://github.com/ceph/ceph/blob/main/src/common/dout.h
- Rook CephCluster CRD documentation and source (`pkg/apis/ceph.rook.io/v1/types.go`)
- Ceph Object Gateway Config Reference — https://docs.ceph.com/en/latest/radosgw/config-ref/

## Issues Found

### 1. Log level `x/y` format description was reversed (line 46)
- **What was wrong:** The post stated "The format `x/y` sets in-memory level to `x` and disk log level to `y`." This is backwards.
- **What was changed:** Corrected to "The format `x/y` sets the log-to-disk level to `x` and the in-memory level to `y`."
- **Why:** Per official Ceph documentation, the first value is the log level (written to log files on disk) and the second value is the memory level (buffered in memory, dumped on crash or manual trigger).

### 2. Level 0 inaccurately described as "silent" (line 15)
- **What was wrong:** The post described log levels as "from 0 (silent) to 20 (maximum verbosity)." Level 0 is not truly silent — error-level messages (via `derr` at internal level -1) are still logged even at level 0.
- **What was changed:** Corrected to "debug levels from 0 (no debug output, errors still logged) to 20 (maximum verbosity)."
- **Why:** The official Ceph documentation describes the scale as 1 (terse) to 20 (verbose). Level 0 disables debug output for a subsystem but does not suppress error/fatal messages.

### 3. Invalid `rgw:` config target in CephCluster YAML (line 65)
- **What was wrong:** The CephCluster `cephConfig` section used `rgw:` as a config target key. In Ceph's config system, RGW daemons are classified as clients, so the correct target is `client.rgw`, not bare `rgw`.
- **What was changed:** Changed `rgw:` to `"client.rgw":` in the YAML example.
- **Why:** RGW daemons use `client.rgw` as their config section in Ceph. Using bare `rgw` would not correctly target RGW daemons. This is consistent with the `ceph config set client.rgw debug_rgw 20` command shown later in the same post.

## Review Notes
- The `ceph config set` commands and kubectl log viewing commands are all correct.
- The subsystem names listed (ms, osd, filestore, bluestore, mon, mds, rgw) are all valid Ceph log subsystems.
- The Rook `spec.cephConfig` field is confirmed valid in the CephCluster CRD. The official Rook docs show glob-pattern targets like `"osd.*"` rather than bare `osd`, though bare daemon type names are also valid Ceph config targets for non-client daemon types. Only the `rgw` target was incorrect since RGW uses the `client.rgw` namespace.
