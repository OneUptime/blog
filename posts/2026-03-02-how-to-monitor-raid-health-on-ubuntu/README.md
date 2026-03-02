# How to Monitor RAID Health on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, RAID, mdadm, Storage, Monitoring

Description: Set up comprehensive RAID health monitoring on Ubuntu using mdadm, SMART monitoring, email alerts, and automated checks to detect failures before data loss occurs.

---

A RAID array is only useful if you know when it's degraded. Many sysadmins discover a failed RAID disk when a second disk fails and the array goes offline - by then it's too late. Proactive monitoring catches degraded arrays immediately, giving you time to replace the failed disk while the remaining disks still protect your data.

## Checking RAID Status Manually

The most direct way to check array health:

```bash
# Quick overview of all arrays
cat /proc/mdstat

# Detailed status of a specific array
sudo mdadm --detail /dev/md0

# All arrays at once
sudo mdadm --detail --scan

# One-line status for scripting
cat /proc/mdstat | grep -E 'md[0-9]'
```

A healthy RAID-5 array with 4 disks shows:

```
md0 : active raid5 sdd1[3] sdc1[2] sdb1[1] sda1[0]
      2929893888 blocks super 1.2 level 5, 512k chunk, algorithm 2 [4/4] [UUUU]
```

`[4/4]` means 4 of 4 devices active. `[UUUU]` shows all disks healthy. A degraded array shows `[3/4] [UUU_]`.

## Setting Up mdadm Email Alerts

The mdadm monitor daemon watches arrays and sends alerts when events occur:

```bash
# Install mailutils for sending email (if not present)
sudo apt install mailutils -y

# Configure the recipient in mdadm.conf
sudo nano /etc/mdadm/mdadm.conf
```

Add or modify these lines:

```
# Send alerts to this address
MAILADDR admin@example.com

# Optional: identify this host in alert subjects
MAILFROM mdadm@server01.example.com

# Monitor these arrays (or use ARRAY <ignore> to monitor all)
ARRAY /dev/md0 UUID=xxxxxxxx:xxxx:xxxx:xxxx
```

Enable and start the monitoring daemon:

```bash
sudo systemctl enable --now mdmonitor

# Test that email delivery works
sudo mdadm --monitor --test --oneshot /dev/md0

# Check the service status
systemctl status mdmonitor
```

The monitor daemon generates alerts for events including:
- `Fail` - a device has failed
- `FailSpare` - a spare device failed
- `SpareActive` - a spare has been promoted
- `DegradedArray` - the array is running degraded
- `RebuildStarted` / `RebuildFinished`
- `MoveSpare` - a spare is being moved

## Monitoring with a Custom Script

For more control over alerting (Slack, PagerDuty, custom thresholds), write your own check:

```bash
cat << 'SCRIPT' | sudo tee /usr/local/bin/check-raid.sh
#!/bin/bash
# check-raid.sh - RAID health checker with multi-channel alerting

ALERT_EMAIL="admin@example.com"
LOG_FILE="/var/log/raid-monitor.log"
HOSTNAME=$(hostname -f)
ISSUES_FOUND=0
REPORT=""

# Check all MD arrays
for ARRAY in $(ls /dev/md* 2>/dev/null | grep -E '/dev/md[0-9]+$'); do
    # Skip if not a block device
    [ -b "$ARRAY" ] || continue

    STATUS=$(sudo mdadm --detail "$ARRAY" 2>/dev/null)

    if [ -z "$STATUS" ]; then
        continue
    fi

    STATE=$(echo "$STATUS" | grep "State :" | awk '{print $3}')
    ACTIVE=$(echo "$STATUS" | grep "Active Devices" | awk '{print $4}')
    TOTAL=$(echo "$STATUS" | grep "Raid Devices" | awk '{print $4}')
    FAILED=$(echo "$STATUS" | grep "Failed Devices" | awk '{print $4}')

    if [ "$STATE" != "clean" ] && [ "$STATE" != "active" ]; then
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        REPORT+="CRITICAL: $ARRAY state=$STATE active=$ACTIVE/$TOTAL failed=$FAILED\n"
    elif [ "$FAILED" != "0" ]; then
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        REPORT+="WARNING: $ARRAY has $FAILED failed device(s)\n"
    elif [ "$ACTIVE" != "$TOTAL" ]; then
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        REPORT+="WARNING: $ARRAY degraded - $ACTIVE of $TOTAL devices active\n"
    else
        REPORT+="OK: $ARRAY - state=$STATE $ACTIVE/$TOTAL devices active\n"
    fi
done

# Log results
echo "$(date): RAID check - $ISSUES_FOUND issue(s) found" >> "$LOG_FILE"
echo -e "$REPORT" >> "$LOG_FILE"

# Send alert if issues found
if [ "$ISSUES_FOUND" -gt 0 ]; then
    echo -e "RAID Alert on $HOSTNAME:\n\n$REPORT" | mail -s "RAID Alert: $HOSTNAME" "$ALERT_EMAIL"
    exit 1
fi

exit 0
SCRIPT

sudo chmod +x /usr/local/bin/check-raid.sh

# Add to cron - check every 5 minutes
echo "*/5 * * * * root /usr/local/bin/check-raid.sh" | sudo tee /etc/cron.d/raid-monitor
```

## Monitoring Disk Health with SMART

RAID protects against disk failure but doesn't prevent data corruption from slowly dying disks. SMART monitoring catches disks before they fail catastrophically:

```bash
# Install smartmontools
sudo apt install smartmontools -y

# Enable the smartd daemon
sudo systemctl enable --now smartd
```

Configure `/etc/smartd.conf`:

```bash
sudo nano /etc/smartd.conf
```

```
# Monitor all disks, check hourly, email on failures
# -a: enable all checks
# -o on: enable offline testing
# -S on: enable attribute autosave
# -n standby: don't wake sleeping drives
# -s: schedule short test weekly, long test monthly
# -m: send email to admin
# -M exec: run custom script on alert

DEVICESCAN -a -o on -S on -n standby,q \
  -s (S/../.././02|L/../../6/03) \
  -m admin@example.com \
  -M exec /usr/local/bin/smart-alert.sh
```

```bash
# Restart smartd to apply config
sudo systemctl restart smartd

# Manually check SMART status of a disk
sudo smartctl -a /dev/sda

# Run a short test (takes a few minutes)
sudo smartctl -t short /dev/sda

# Run a long test (takes hours for large disks)
sudo smartctl -t long /dev/sda

# Check test results
sudo smartctl -l selftest /dev/sda
```

Key SMART attributes to watch:

```bash
# Check critical attributes
sudo smartctl -A /dev/sda | grep -E "Reallocated_Sector|Pending_Sector|Offline_Uncorrectable|UDMA_CRC_Error"
```

- **Reallocated_Sector_Ct** - Sectors the drive has remapped due to errors. Any non-zero value is a warning sign.
- **Current_Pending_Sector** - Sectors waiting to be remapped. Non-zero means imminent failure risk.
- **Offline_Uncorrectable** - Sectors that can't be read. Serious issue.
- **UDMA_CRC_Error_Count** - Cable or connection errors.

## Running RAID Consistency Checks

Regular consistency checks verify that the redundancy data is intact:

```bash
# Start a manual check
echo check | sudo tee /sys/block/md0/md/sync_action

# Watch progress
cat /proc/mdstat

# Check for mismatches when done
cat /sys/block/md0/md/mismatch_cnt

# Ubuntu runs automatic checks weekly via a cron job
cat /etc/cron.d/mdadm
```

The mismatch count should be 0 for RAID-1 and RAID-10. For RAID-5/6, a small number of mismatches can be normal (from unclean shutdowns). A large count indicates potential data corruption.

Configure the check schedule in `/etc/cron.d/mdadm`:

```bash
# Run checks at 01:00 on Sunday - avoid peak hours
# 0 1 * * 0 root /usr/share/mdadm/checkarray --cron --all --quiet --idle-limit=5
```

## Integrating with Monitoring Systems

### Prometheus with node_exporter

The node_exporter exposes RAID metrics for Prometheus:

```bash
# Install node_exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xzf node_exporter-1.7.0.linux-amd64.tar.gz
sudo cp node_exporter-1.7.0.linux-amd64/node_exporter /usr/local/bin/

# node_exporter exposes md_* metrics automatically
# Key metrics:
# node_md_disks{state="active"} - active disks per array
# node_md_disks{state="failed"} - failed disks per array
# node_md_state{state="active"} - array is active (1) or not (0)
# node_md_blocks_synced - blocks synced during rebuild
```

Prometheus alerting rules:

```yaml
# /etc/prometheus/rules/raid.yaml
groups:
  - name: raid
    rules:
      - alert: RaidArrayDegraded
        expr: node_md_disks{state="active"} < node_md_disks_total
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "RAID array {{ $labels.device }} is degraded"
          description: "{{ $value }} active disks, expected {{ $labels.total }}"

      - alert: RaidDiskFailed
        expr: node_md_disks{state="failed"} > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "RAID disk failed in {{ $labels.device }}"
```

## Creating a RAID Health Dashboard

A quick daily report script:

```bash
#!/bin/bash
# daily-raid-report.sh

echo "=== RAID Health Report: $(date) ==="
echo ""

echo "--- Array Status ---"
cat /proc/mdstat
echo ""

echo "--- Array Details ---"
for arr in $(ls /dev/md* 2>/dev/null | grep -E '/dev/md[0-9]+$'); do
    echo "Array: $arr"
    sudo mdadm --detail "$arr" | grep -E 'State|Active Dev|Working Dev|Failed Dev|Spare Dev|UUID'
    echo ""
done

echo "--- SMART Summary ---"
for disk in $(lsblk -d -o NAME | grep -E '^sd|^nvme' | awk '{print "/dev/"$1}'); do
    echo -n "$disk: "
    sudo smartctl -H "$disk" 2>/dev/null | grep "overall-health"
done

echo ""
echo "--- Recent RAID Events ---"
sudo journalctl -u mdmonitor --since "24 hours ago" --no-pager | tail -20
```

Run this daily via cron and send it to operations email for a morning health check.

Consistent monitoring means RAID failures become routine maintenance events rather than emergency recoveries. The combination of mdadm monitoring, SMART alerts, and periodic consistency checks gives complete coverage of your storage stack.
