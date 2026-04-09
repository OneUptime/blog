# Validation Summary: How to Configure Logging and Debugging in Ceph

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Kubernetes / kubectl
- systemd / journald

## Sources Consulted
- Ceph official documentation: Logging and Debugging section (https://docs.ceph.com/en/latest/rados/troubleshooting/log-and-debug/)
- Ceph source code: `src/common/subsys.h` (subsystem definitions)
- Ceph source code: `src/common/options/global.yaml.in` (config option definitions)
- Ceph source code: `src/common/ceph_context.cc` (admin socket command registrations)
- Rook documentation: Toolbox usage (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)

## Issues Found

### 1. `log_level` is not a valid Ceph config option (multiple locations)
**What was wrong:** The post used `log_level` as a Ceph configuration option throughout (e.g., `ceph config set osd log_level 5`). There is no `log_level` option in Ceph. Debug verbosity is controlled per-subsystem using `debug_<subsystem>` options (e.g., `debug_osd`, `debug_mon`, `debug_rgw`).
**What was changed:** Replaced all `log_level` references with the correct `debug_<subsystem>` options:
- `ceph config get osd log_level` → `ceph config get osd debug_osd`
- `ceph config set global log_level 1` → `ceph config set global debug_ms 1`
- `ceph config set osd log_level 5` → `ceph config set osd debug_osd 5`
- `ceph config set mon log_level 2` → `ceph config set mon debug_mon 2`
- `ceph config set client.rgw log_level 5` → `ceph config set client.rgw debug_rgw 5`
- `ceph config set osd.3 log_level 10` → `ceph config set osd.3 debug_osd 10`
- Rook toolbox example and Summary section also updated.
**Why:** Commands using `log_level` would fail with an unrecognized option error, making the tutorial non-functional.

### 2. Invalid admin socket commands `log get-level` and `log set-level`
**What was wrong:** The post used `ceph daemon osd.0 log get-level` and `ceph daemon osd.0 log set-level 10`. These are not valid Ceph admin socket commands. The valid `log` subcommands are `log flush`, `log dump`, and `log reopen`.
**What was changed:** Replaced with the correct admin socket commands:
- `ceph daemon osd.0 log get-level` → `ceph daemon osd.0 config get debug_osd`
- `ceph daemon osd.0 log set-level 10` → `ceph daemon osd.0 config set debug_osd 10`
- `ceph daemon osd.0 log set-level 1` → `ceph daemon osd.0 config set debug_osd 1`
**Why:** The invalid commands would return an error from the admin socket, leaving users unable to check or change runtime log levels.

### 3. Incorrect comments for `log_max_new` and `log_max_recent` options
**What was wrong:** The Log File Configuration section described `log_max_new` and `log_max_recent` as controlling log file rotation and file size limits. In reality, these options control in-memory log buffers. `log_max_new` sets the maximum number of new log entries buffered in memory (default: 1000). `log_max_recent` sets the maximum recent entries kept in memory for crash dumps (default: 500). Ceph does not have built-in log file rotation — this is handled by logrotate at the system level. The section also set `log_max_new` twice with contradictory values and comments.
**What was changed:** Replaced the misleading comments with accurate descriptions of what these options control and used correct default values.
**Why:** The incorrect comments would mislead users into thinking they were configuring file rotation when they were actually changing in-memory buffer sizes.

### 4. `debug_pg` is not a valid Ceph subsystem
**What was wrong:** The post listed `debug-pg` (Placement group operations) as a valid debug subsystem and used `--debug-pg 10` in a command example. There is no `debug_pg` subsystem in Ceph — PG-related debug output is controlled through `debug_osd` since PG handling is part of the OSD code.
**What was changed:** Removed `debug-pg` from the subsystem list, replaced with `debug-optracker` (Operation tracker). Changed the combined debug example from `--debug-osd 10 --debug-pg 10` to `--debug-osd 10 --debug-ms 5`.
**Why:** Using `--debug-pg` with `injectargs` would produce a warning about an unrecognized option and have no effect.

## Review Notes
- The post does not mention Ceph's dual-level debug format (`debug_<subsystem> = <log-level>/<memory-level>`), where the first number controls what goes to the log file and the second controls what's kept in memory for crash dumps. This is a useful feature worth mentioning in a future update.
- The `ceph log last 50 cluster` syntax for filtering by channel may not work as shown in all Ceph versions — the positional argument order for `ceph log last` is `[num] [level] [channel]`, so `cluster` might be interpreted as a level rather than a channel.
- The `injectargs` method, while still functional, is considered a legacy approach. Modern Ceph (Nautilus+) prefers `ceph config set <daemon> debug_<subsystem> <level>` which is also applied at runtime.
- `log_to_journald` was confirmed as a valid Ceph config option.
