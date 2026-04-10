# How to Configure Common Settings in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Configuration, Setting, Storage, Tuning

Description: Learn how to configure commonly needed Ceph settings for pool defaults, OSD behavior, recovery throttling, and client performance through ceph.conf and runtime commands.

---

## Runtime vs File-Based Configuration

Modern Ceph (Mimic+) supports two ways to configure settings:
- **Runtime**: `ceph config set` - changes take effect immediately and persist in the monitor config database
- **File-based**: `ceph.conf` - settings applied at daemon startup

Prefer runtime configuration for operational changes. Use `ceph.conf` only for settings that must be present before the daemon can connect to monitors.

```bash
# Set a runtime config
ceph config set osd osd_recovery_max_active 3

# View all runtime config settings
ceph config dump

# View settings for a specific daemon
ceph config show osd.0
```

## Pool Default Settings

Control defaults for newly created pools:

```bash
# Default replica count
ceph config set global osd_pool_default_size 3

# Minimum replicas to allow I/O
ceph config set global osd_pool_default_min_size 2

# Default PG count (autoscaler overrides this when enabled)
ceph config set global osd_pool_default_pg_num 128

# Enable PG autoscaling for new pools
ceph config set global osd_pool_default_pg_autoscale_mode on
```

## OSD Memory Settings

BlueStore OSDs auto-tune memory usage. Set a target:

```bash
# Target memory per OSD (default 4GB)
ceph config set osd osd_memory_target 4294967296

# Auto-tune based on available system memory
ceph config set osd osd_memory_target_autotune true

# Set autotune ratio (fraction of available memory for all OSDs)
ceph config set mgr mgr/cephadm/autotune_memory_target_ratio 0.7
```

## Recovery and Backfill Throttling

Limit recovery speed to protect production I/O:

```bash
# Max concurrent recovery operations per OSD
ceph config set osd osd_recovery_max_active 3

# Max backfill operations (rebalancing new OSDs)
ceph config set osd osd_max_backfills 2

# Recovery sleep between operations (seconds, float)
ceph config set osd osd_recovery_sleep 0

# Priority for client I/O vs recovery
ceph config set osd osd_client_op_priority 63
ceph config set osd osd_recovery_op_priority 3
```

## Scrubbing Settings

```bash
# Time window for scrubbing
ceph config set osd osd_scrub_begin_hour 23
ceph config set osd osd_scrub_end_hour 6

# Deep scrub interval in seconds (default 7 days)
ceph config set osd osd_deep_scrub_interval 604800

# Load limit - skip scrub if load is above this
ceph config set osd osd_scrub_load_threshold 0.5
```

## Heartbeat and Failure Detection

```bash
# Time before marking OSD down (default 20s)
ceph config set osd osd_heartbeat_grace 20

# Heartbeat interval (default 6s)
ceph config set osd osd_heartbeat_interval 6

# Minimum number of peer OSDs to heartbeat with (default 10)
ceph config set osd osd_heartbeat_min_peers 10
```

## Logging Configuration

```bash
# Enable file logging
ceph config set global log_to_file true
ceph config set global log_file /var/log/ceph/ceph.log

# Set log level (0-20, higher = more verbose)
ceph config set global debug_ms 0
ceph config set global debug_osd 0
ceph config set global debug_mon 0

# Temporarily increase verbosity for debugging
ceph tell osd.5 config set debug_osd 10
```

## Checking Effective Configuration

```bash
# View all non-default settings
ceph config dump

# View the effective config for a running daemon
ceph daemon osd.0 config show

# Get a specific setting value
ceph config get osd osd_recovery_max_active
```

## Summary

Common Ceph settings for pool defaults, OSD memory targets, recovery throttling, scrub scheduling, and heartbeat tuning are best managed through `ceph config set` for immediate effect and persistence in the monitor config database. Understanding these settings and their impact helps you balance recovery speed against production I/O, prevent uncontrolled memory consumption, and maintain cluster health through appropriate scrub scheduling. Use `ceph config dump` and `ceph daemon ... config show` to audit what is actually running on each daemon.
