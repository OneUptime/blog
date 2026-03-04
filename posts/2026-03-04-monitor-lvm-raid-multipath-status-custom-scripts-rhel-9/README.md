# How to Monitor LVM, RAID, and Multipath Status with Custom Scripts on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, LVM, RAID, Multipath, Monitoring, Scripting, Linux

Description: Learn how to create custom monitoring scripts on RHEL to check the health status of LVM, software RAID, and multipath storage configurations.

---

Complex storage configurations using LVM, RAID, and multipath need continuous monitoring. A degraded RAID array, a missing multipath path, or an LVM volume group running low on space can lead to data loss or outages if not caught early. Custom monitoring scripts give you visibility into these storage subsystems and integrate with your alerting infrastructure.

## Monitoring LVM Status

### Checking Volume Group Health

```bash
#!/bin/bash
# Check LVM volume group space usage

THRESHOLD=85

vgs --noheadings --nosuffix --units g -o vg_name,vg_size,vg_free,vg_free/vg_size 2>/dev/null | while read VG SIZE FREE PCT; do
    USED_PCT=$(echo "scale=0; (1 - $PCT) * 100" | bc)
    if [ "$USED_PCT" -ge "$THRESHOLD" ]; then
        logger -p local0.warning "LVM WARNING: Volume group $VG is ${USED_PCT}% full (${FREE}G free of ${SIZE}G)"
    fi
done
```

### Checking Logical Volume Status

```bash
#!/bin/bash
# Check for inactive or degraded LVM logical volumes

lvs --noheadings -o lv_name,vg_name,lv_attr 2>/dev/null | while read LV VG ATTR; do
    # Check volume state (5th character of attributes)
    STATE=$(echo "$ATTR" | cut -c5)
    if [ "$STATE" != "a" ]; then
        logger -p local0.crit "LVM CRITICAL: Logical volume $VG/$LV is not active (attr: $ATTR)"
    fi
done
```

### Checking Physical Volume Health

```bash
#!/bin/bash
# Check for missing or damaged physical volumes

pvs --noheadings -o pv_name,vg_name,pv_attr,pv_missing 2>/dev/null | while read PV VG ATTR MISSING; do
    if [ "$MISSING" = "missing" ]; then
        logger -p local0.crit "LVM CRITICAL: Physical volume $PV in volume group $VG is MISSING"
    fi
done
```

## Monitoring Software RAID (mdadm)

### Checking RAID Array Status

```bash
#!/bin/bash
# Monitor mdadm RAID array health

if [ ! -f /proc/mdstat ]; then
    exit 0
fi

while read -r line; do
    if echo "$line" | grep -q "^md"; then
        ARRAY=$(echo "$line" | awk '{print $1}')
    fi
    if echo "$line" | grep -q "\[.*_.*\]"; then
        logger -p local0.crit "RAID CRITICAL: Array $ARRAY has a degraded member"
    fi
done < /proc/mdstat
```

### Detailed RAID Check Script

```bash
#!/bin/bash
# Comprehensive RAID monitoring

for ARRAY in /dev/md*; do
    [ -b "$ARRAY" ] || continue

    STATUS=$(mdadm --detail "$ARRAY" 2>/dev/null)
    STATE=$(echo "$STATUS" | grep "State :" | awk -F: '{print $2}' | xargs)
    LEVEL=$(echo "$STATUS" | grep "Raid Level" | awk -F: '{print $2}' | xargs)
    DEGRADED=$(echo "$STATUS" | grep "Degraded" | awk -F: '{print $2}' | xargs)

    case "$STATE" in
        *degraded*|*FAILED*)
            logger -p local0.crit "RAID CRITICAL: $ARRAY ($LEVEL) state is $STATE"
            ;;
        *recovering*|*resyncing*)
            logger -p local0.warning "RAID WARNING: $ARRAY ($LEVEL) is rebuilding: $STATE"
            ;;
        clean|active)
            # Array is healthy
            ;;
        *)
            logger -p local0.warning "RAID WARNING: $ARRAY ($LEVEL) unexpected state: $STATE"
            ;;
    esac
done
```

## Monitoring Multipath

### Checking Multipath Path Status

```bash
#!/bin/bash
# Monitor multipath path health

if ! command -v multipathd &>/dev/null; then
    exit 0
fi

multipathd show paths format "%d %s %t %T" 2>/dev/null | while read DEV STATE DM_STATE PATH_STATE; do
    if [ "$STATE" != "running" ] || [ "$PATH_STATE" != "ready" ]; then
        logger -p local0.warning "MULTIPATH WARNING: Path $DEV state=$STATE path_state=$PATH_STATE"
    fi
done
```

### Checking for Degraded Multipath Devices

```bash
#!/bin/bash
# Check for multipath devices with fewer paths than expected

multipath -ll 2>/dev/null | grep -E "^[a-z]" | while read MPATH REST; do
    ACTIVE=$(multipath -ll "$MPATH" 2>/dev/null | grep -c "active ready")
    TOTAL=$(multipath -ll "$MPATH" 2>/dev/null | grep -cE "running|faulty")

    if [ "$ACTIVE" -lt "$TOTAL" ]; then
        FAULTY=$((TOTAL - ACTIVE))
        logger -p local0.warning "MULTIPATH WARNING: $MPATH has $FAULTY faulty path(s) out of $TOTAL total"
    fi
done
```

## Comprehensive Storage Monitor Script

Combine all checks into a single script:

```bash
#!/bin/bash
# /usr/local/bin/storage-monitor.sh
# Comprehensive storage health monitoring

LOG_TAG="storage-monitor"

# LVM checks
check_lvm() {
    if ! command -v vgs &>/dev/null; then return; fi

    # Check for missing PVs
    pvs --noheadings -o pv_name,vg_name 2>/dev/null | grep -q "unknown" && \
        logger -t "$LOG_TAG" -p local0.crit "LVM: Missing physical volumes detected"

    # Check VG space
    vgs --noheadings --nosuffix --units g -o vg_name,vg_free 2>/dev/null | while read VG FREE; do
        FREE_INT=$(echo "$FREE" | cut -d. -f1)
        if [ "$FREE_INT" -lt 5 ]; then
            logger -t "$LOG_TAG" -p local0.warning "LVM: VG $VG has only ${FREE}G free"
        fi
    done
}

# RAID checks
check_raid() {
    [ -f /proc/mdstat ] || return
    if grep -q "_" /proc/mdstat; then
        logger -t "$LOG_TAG" -p local0.crit "RAID: Degraded array detected"
        grep "^md" /proc/mdstat | while read line; do
            logger -t "$LOG_TAG" -p local0.crit "RAID: $line"
        done
    fi
}

# Multipath checks
check_multipath() {
    command -v multipathd &>/dev/null || return
    FAULTY=$(multipathd show paths format "%s" 2>/dev/null | grep -c "faulty")
    if [ "$FAULTY" -gt 0 ]; then
        logger -t "$LOG_TAG" -p local0.warning "MULTIPATH: $FAULTY faulty path(s) detected"
    fi
}

check_lvm
check_raid
check_multipath
```

## Deploying with systemd Timer

Create a systemd service:

```bash
sudo vi /etc/systemd/system/storage-monitor.service
```

```ini
[Unit]
Description=Storage Health Monitor

[Service]
Type=oneshot
ExecStart=/usr/local/bin/storage-monitor.sh
```

Create a timer:

```bash
sudo vi /etc/systemd/system/storage-monitor.timer
```

```ini
[Unit]
Description=Run storage health monitor every 5 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
```

Enable:

```bash
sudo chmod +x /usr/local/bin/storage-monitor.sh
sudo systemctl daemon-reload
sudo systemctl enable --now storage-monitor.timer
```

## Viewing Alerts

```bash
journalctl -t storage-monitor --since "1 hour ago"
```

## Summary

Custom monitoring scripts for LVM, RAID, and multipath on RHEL give you early warning of storage problems. Check LVM for missing physical volumes and low space, RAID for degraded arrays, and multipath for faulty paths. Deploy these checks with systemd timers and route alerts through syslog for integration with your monitoring infrastructure.
