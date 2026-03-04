# How to Monitor and Troubleshoot Multipath Paths on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DM-Multipath, Monitoring, Troubleshooting, Storage, Linux

Description: Monitor multipath path health on RHEL, diagnose failed paths, and troubleshoot common multipath issues using multipathd and system tools.

---

Monitoring multipath paths is essential for catching storage connectivity problems before they cause outages. A single failed path may not interrupt I/O, but if left unaddressed, subsequent failures can cause a complete storage outage.

## Checking Path Status

### Quick Overview

```bash
sudo multipath -ll
```

Path states to watch for:

- `active ready running` - Path is healthy and available
- `active ghost running` - Path is available but not preferred (ALUA)
- `failed faulty running` - Path has failed
- `active faulty offline` - Path is offline

### Detailed Path Information

```bash
sudo multipathd show paths
```

More formatted output:

```bash
sudo multipathd show paths format "%d %t %T %s %o %w"
```

Format specifiers:
- `%d` - Device name
- `%t` - DM state
- `%T` - Path checker state
- `%s` - Vendor/product
- `%o` - Offline state
- `%w` - WWID

### Per-Map Details

```bash
sudo multipathd show maps format "%n %w %s %t"
```

## Monitoring with Watch

For real-time monitoring:

```bash
watch -n 5 'sudo multipath -ll'
```

Or monitor the journal:

```bash
sudo journalctl -u multipathd -f
```

## Diagnosing Failed Paths

When a path shows as failed:

### Step 1: Identify the Failed Path

```bash
sudo multipath -ll | grep -A 5 "failed\|faulty\|offline"
```

### Step 2: Check the Physical Layer

For Fibre Channel:

```bash
# Check HBA port status
sudo cat /sys/class/fc_host/host*/port_state

# Check link speed
sudo cat /sys/class/fc_host/host*/speed

# Check SCSI hosts
ls /sys/class/scsi_host/
```

For iSCSI:

```bash
# Check session status
sudo iscsiadm -m session -P 3

# Check network connectivity
ping <target_ip>
```

### Step 3: Check Kernel Messages

```bash
sudo dmesg | grep -i "multipath\|scsi\|fc\|iscsi" | tail -30
```

### Step 4: Check the SCSI Device

```bash
# Check device state
cat /sys/block/sdb/device/state

# Check for SCSI errors
sudo dmesg | grep sdb
```

## Recovering Failed Paths

### Automatic Recovery

multipathd periodically checks paths (controlled by `polling_interval`). Failed paths that come back are automatically restored.

### Manual Recovery

```bash
# Rescan SCSI hosts
for host in /sys/class/scsi_host/host*; do
    echo "- - -" | sudo tee "$host/scan"
done

# Reinstate a specific path
sudo multipathd reinstate path sdb

# Reconfigure multipathd
sudo multipathd reconfigure
```

### Force a Path Check

```bash
# Check all paths now
sudo multipathd show paths

# Force a path recheck
sudo multipathd reconfigure
```

## Common Issues and Fixes

### Paths Showing as "Orphan"

Paths not associated with any multipath map:

```bash
sudo multipathd show paths format "%d %w %t"
```

Fix: The device may be blacklisted or the WWID is not recognized:

```bash
sudo multipath -v3 /dev/sdb 2>&1 | head -30
```

### Multipath Device Not Created

```bash
# Check if the device is blacklisted
sudo multipathd show blacklist

# Force multipath to pick up the device
sudo multipath -a /dev/sdb
sudo multipathd add path sdb
```

### Path Flapping

If a path repeatedly fails and recovers:

```bash
# Check journal for pattern
sudo journalctl -u multipathd --since "1 hour ago" | grep -c "failed\|reinstated"

# Possible causes:
# - Marginal cable/SFP
# - Overloaded FC switch port
# - Storage controller issues
```

Adjust the `marginal_path_*` settings to handle flapping:

```
defaults {
    marginal_path_double_failed_time 10
    marginal_path_err_sample_time 30
    marginal_path_err_rate_threshold 5
}
```

## Health Check Script

```bash
#!/bin/bash
echo "=== Multipath Maps ==="
sudo multipath -ll

echo ""
echo "=== Failed Paths ==="
FAILED=$(sudo multipathd show paths format "%d %t %T" | grep -i "fail\|fault\|offline")
if [ -z "$FAILED" ]; then
    echo "No failed paths"
else
    echo "$FAILED"
fi

echo ""
echo "=== Path Count per Map ==="
sudo multipathd show maps format "%n %0"
```

## Conclusion

Regular monitoring of multipath paths catches problems early. Use `multipath -ll` for quick health checks and `multipathd show paths` for detailed diagnostics. Set up automated monitoring to alert when paths fail so you can address connectivity issues before they affect application availability.
