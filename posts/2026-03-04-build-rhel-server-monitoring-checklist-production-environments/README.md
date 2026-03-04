# How to Build a RHEL Server Monitoring Checklist for Production Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Monitoring, Checklist, Production, Linux

Description: Create a comprehensive monitoring checklist for RHEL production servers covering CPU, memory, disk, network, and service health.

---

Production RHEL servers need continuous monitoring to catch problems before they affect users. Here is a practical checklist of what to monitor and how to set up each check.

## CPU and Load Monitoring

```bash
# Check current load average (1, 5, 15 minutes)
uptime

# Monitor CPU usage with sar (requires sysstat)
sudo dnf install sysstat
sudo systemctl enable --now sysstat

# View CPU utilization for the past hour
sar -u -f /var/log/sa/sa$(date +%d)
```

Set alerts when load average exceeds the number of CPU cores:

```bash
# Get CPU count for threshold calculation
nproc
# If nproc returns 4, alert when load > 4.0
```

## Memory Monitoring

```bash
# Check current memory usage
free -h

# Monitor memory trends over time
sar -r -f /var/log/sa/sa$(date +%d)

# Check for OOM killer activity
journalctl -k | grep -i "out of memory"
```

## Disk Space and I/O

```bash
# Check filesystem usage (alert at 80% and 90%)
df -h

# Monitor inode usage (often missed)
df -i

# Check disk I/O performance
iostat -xz 1 5

# Monitor for disk errors
journalctl -k | grep -iE "error|fault|fail" | grep -i sd
```

## Network Monitoring

```bash
# Check interface errors and drops
ip -s link show

# Monitor active connections
ss -tuanp | head -20

# Check for network interface errors over time
sar -n DEV -f /var/log/sa/sa$(date +%d)
```

## Service Health Checks

```bash
# List critical services and their status
for svc in sshd firewalld chronyd auditd; do
    echo "$svc: $(systemctl is-active $svc)"
done

# Check for failed systemd units
systemctl --failed
```

## Log Monitoring

```bash
# Watch for critical log entries
journalctl -p err --since "1 hour ago" --no-pager

# Monitor authentication failures
journalctl -u sshd | grep -i "failed" | tail -10
```

## Automated Monitoring Script

Create a simple health check script that runs via cron:

```bash
#!/bin/bash
# /usr/local/bin/health-check.sh
# Run via cron every 5 minutes

HOSTNAME=$(hostname)
LOAD=$(awk '{print $1}' /proc/loadavg)
MEM_USED=$(free | awk '/Mem:/{printf "%.0f", $3/$2 * 100}')
DISK_USED=$(df / | awk 'NR==2{print $5}' | tr -d '%')
FAILED_UNITS=$(systemctl --failed --no-legend | wc -l)

# Log to syslog
logger -t health-check "load=$LOAD mem=${MEM_USED}% disk=${DISK_USED}% failed_units=$FAILED_UNITS"

# Alert conditions
if [ "$DISK_USED" -gt 90 ]; then
    logger -p user.crit -t health-check "CRITICAL: Disk usage at ${DISK_USED}%"
fi
```

```bash
# Add to cron
echo "*/5 * * * * /usr/local/bin/health-check.sh" | sudo tee /etc/cron.d/health-check
```

Review this checklist quarterly and adjust thresholds based on your workload patterns.
