# How to Monitor Storage Health with SMART and smartctl on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, SMART, Smartctl, Storage, Monitoring, Disk Health, Linux

Description: Learn how to use SMART monitoring and smartctl on RHEL to detect failing drives early and prevent data loss from hardware failures.

---

Hard drives and SSDs do not fail without warning. Most storage devices support SMART (Self-Monitoring, Analysis, and Reporting Technology), which tracks internal health metrics that can predict failures before they happen. On RHEL, the `smartctl` tool lets you query these metrics and set up automated monitoring.

## Installing smartmontools

```bash
sudo dnf install smartmontools
```

## Checking SMART Support

Verify that a device supports SMART:

```bash
sudo smartctl -i /dev/sda
```

Look for:

```text
SMART support is: Available - device has SMART capability.
SMART support is: Enabled
```

If SMART is available but not enabled:

```bash
sudo smartctl -s on /dev/sda
```

## Viewing SMART Health Summary

Quick health check:

```bash
sudo smartctl -H /dev/sda
```

Output:

```text
SMART overall-health self-assessment test result: PASSED
```

If this shows FAILED, back up your data immediately.

## Viewing All SMART Attributes

```bash
sudo smartctl -A /dev/sda
```

For HDDs, key attributes to watch:

| Attribute | What It Means | Warning Sign |
|-----------|--------------|--------------|
| Reallocated_Sector_Ct | Bad sectors remapped to spare area | Any value above 0 |
| Current_Pending_Sector | Sectors waiting to be remapped | Growing count |
| Offline_Uncorrectable | Sectors that could not be corrected | Any value above 0 |
| UDMA_CRC_Error_Count | Cable or connection errors | Growing count |
| Spin_Retry_Count | Disk spindle start failures | Any value above 0 |

For SSDs, watch:

| Attribute | What It Means | Warning Sign |
|-----------|--------------|--------------|
| Wear_Leveling_Count | SSD wear level | Dropping below 10% |
| Reallocated_Sector_Ct | Bad NAND cells remapped | Growing count |
| Media_Wearout_Indicator | Remaining SSD life | Approaching 0 |

## Viewing Complete SMART Information

```bash
sudo smartctl -a /dev/sda
```

This shows device info, health status, attributes, and error logs all at once.

## Running SMART Self-Tests

### Short Test (2-5 minutes)

```bash
sudo smartctl -t short /dev/sda
```

### Long Test (hours, depending on disk size)

```bash
sudo smartctl -t long /dev/sda
```

### Check Test Results

```bash
sudo smartctl -l selftest /dev/sda
```

## NVMe Drive Monitoring

For NVMe drives, smartctl uses a different format:

```bash
sudo smartctl -a /dev/nvme0n1
```

Key NVMe health metrics:

- **Percentage Used** - How much of the SSD lifetime has been consumed
- **Available Spare** - Remaining spare NAND blocks
- **Media and Data Integrity Errors** - Should be 0
- **Critical Warning** - Active warnings

## Configuring Automated Monitoring with smartd

The smartd daemon monitors drives continuously and sends alerts. Edit the configuration:

```bash
sudo vi /etc/smartmontools/smartd.conf
```

Basic configuration to monitor all drives and send email alerts:

```text
DEVICESCAN -a -o on -S on -n standby,q -s (S/../.././02|L/../../6/03) -W 4,45,55 -m admin@example.com
```

This configuration:

- `-a` - Monitors all SMART attributes
- `-o on` - Enables automatic offline testing
- `-S on` - Enables attribute autosave
- `-n standby,q` - Does not spin up drives in standby
- `-s (S/../.././02|L/../../6/03)` - Short test daily at 2 AM, long test Saturdays at 3 AM
- `-W 4,45,55` - Temperature monitoring (4-degree change, 45 warning, 55 critical)
- `-m admin@example.com` - Email alerts

Enable and start the service:

```bash
sudo systemctl enable --now smartd
```

## Monitoring Specific Drives

For more control, specify individual drives:

```text
/dev/sda -a -o on -S on -s (S/../.././02|L/../../6/03) -W 4,45,55 -m admin@example.com
/dev/sdb -a -o on -S on -s (S/../.././02|L/../../6/03) -W 4,45,55 -m admin@example.com
/dev/nvme0n1 -a -W 4,60,70 -m admin@example.com
```

## Checking smartd Logs

```bash
journalctl -u smartd -f
```

## Creating a SMART Health Report Script

```bash
#!/bin/bash
echo "=== SMART Health Report ==="
echo "Date: $(date)"
echo ""

for disk in /dev/sd? /dev/nvme?n1; do
    [ -b "$disk" ] || continue
    echo "--- $disk ---"
    HEALTH=$(smartctl -H "$disk" 2>/dev/null | grep "result")
    echo "Health: $HEALTH"
    TEMP=$(smartctl -A "$disk" 2>/dev/null | grep -i temperature | head -1)
    echo "Temperature: $TEMP"
    ERRORS=$(smartctl -l error "$disk" 2>/dev/null | grep "No Errors Logged")
    if [ -z "$ERRORS" ]; then
        echo "WARNING: Errors found in log"
    else
        echo "Errors: None"
    fi
    echo ""
done
```

## Summary

SMART monitoring with `smartctl` on RHEL is your first line of defense against unexpected drive failures. Check health regularly with `smartctl -H`, monitor key attributes with `smartctl -A`, run self-tests periodically, and configure `smartd` for automated monitoring with email alerts. Early detection of failing drives gives you time to replace hardware and migrate data before a complete failure occurs.
