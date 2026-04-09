# How to Modify Runtime Configuration via Admin Socket

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Admin Socket, Configuration, Runtime, Tuning

Description: Modify Ceph daemon configuration at runtime via the admin socket without restarting daemons, enabling live tuning of log levels, performance parameters, and operational settings.

---

## Overview

The Ceph admin socket allows you to modify configuration values on a running daemon without restarting it. This is invaluable for live performance tuning, temporarily increasing log verbosity for debugging, and adjusting operational parameters during incidents.

## Setting a Configuration Value at Runtime

```bash
# Syntax
ceph daemon <daemon> config set <key> <value>

# Examples
ceph daemon osd.0 config set osd_max_backfills 2
ceph daemon osd.0 config set debug_osd 10
ceph daemon client.rgw.myzone config set debug_rgw 20
```

## Common Use Cases

### Adjusting Log Verbosity for Debugging

```bash
# Enable verbose OSD logging temporarily
ceph daemon osd.0 config set debug_osd 20
ceph daemon osd.0 config set debug_ms 1

# Monitor the log
journalctl -u ceph-osd@0 -f

# Disable verbose logging when done (IMPORTANT - verbose logging impacts performance)
ceph daemon osd.0 config set debug_osd 0
ceph daemon osd.0 config set debug_ms 0
```

### Throttling Recovery During Business Hours

```bash
# Reduce recovery speed during high traffic periods
ceph daemon osd.0 config set osd_recovery_max_active 1
ceph daemon osd.0 config set osd_recovery_op_priority 1
ceph daemon osd.0 config set osd_max_backfills 1

# Restore full recovery speed after business hours
ceph daemon osd.0 config set osd_recovery_max_active 5
ceph daemon osd.0 config set osd_recovery_op_priority 10
ceph daemon osd.0 config set osd_max_backfills 4
```

### Adjusting RGW Thread Pool Size

```bash
# Increase thread pool for high request rate
ceph daemon client.rgw.myzone config set rgw_thread_pool_size 512

# Verify the change
ceph daemon client.rgw.myzone config get rgw_thread_pool_size
```

## Important Caveats

Runtime config changes via admin socket are **not persisted** across daemon restarts. To make changes permanent:

```bash
# Set in the Ceph config database (persists across restarts)
ceph config set osd.0 osd_max_backfills 2

# Or set for all OSDs
ceph config set osd osd_max_backfills 2
```

## Applying to All Instances of a Daemon Type

For changes across all OSDs, loop through the sockets:

```bash
# Apply to all running OSDs
for osd in $(ceph osd ls); do
    ceph daemon osd.$osd config set osd_recovery_max_active 2 2>/dev/null && \
    echo "Updated OSD $osd"
done
```

## Batch Script for Recovery Throttling

```bash
#!/bin/bash
# throttle-recovery.sh - reduce recovery during business hours

ACTION=${1:-throttle}

if [ "$ACTION" = "throttle" ]; then
    MAX_ACTIVE=1
    PRIORITY=1
    BACKFILLS=1
    echo "Throttling Ceph recovery..."
else
    MAX_ACTIVE=5
    PRIORITY=10
    BACKFILLS=4
    echo "Restoring Ceph recovery speed..."
fi

for osd in $(ceph osd ls); do
    ceph daemon osd.$osd config set osd_recovery_max_active $MAX_ACTIVE
    ceph daemon osd.$osd config set osd_recovery_op_priority $PRIORITY
    ceph daemon osd.$osd config set osd_max_backfills $BACKFILLS
done

echo "Done. Applied to $(ceph osd ls | wc -l) OSDs"
```

```bash
chmod +x throttle-recovery.sh
./throttle-recovery.sh throttle    # slow down
./throttle-recovery.sh restore     # speed up
```

## Summary

The admin socket `config set` command enables live configuration changes on running Ceph daemons without restarts. This is especially useful for adjusting log verbosity during debugging and throttling recovery during business hours. Remember that these changes are ephemeral - always persist important changes using `ceph config set` in the Ceph configuration database to survive daemon restarts.
