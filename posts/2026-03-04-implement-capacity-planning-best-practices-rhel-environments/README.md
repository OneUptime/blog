# How to Implement Capacity Planning Best Practices for RHEL Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Capacity Planning, Performance, Monitoring, Linux

Description: Use RHEL tools to collect performance data, analyze trends, and plan capacity for CPU, memory, disk, and network resources.

---

Capacity planning prevents outages caused by resource exhaustion. By collecting historical data and projecting trends, you can scale infrastructure before bottlenecks hit. RHEL includes all the tools you need.

## Collecting Historical Data with sysstat

The sysstat package collects system performance data every 10 minutes by default:

```bash
# Install and enable sysstat
sudo dnf install sysstat
sudo systemctl enable --now sysstat

# Data is stored in /var/log/sa/
ls /var/log/sa/
```

## CPU Capacity Analysis

```bash
# View CPU utilization for the past week
for i in $(seq 1 7); do
    DAY=$(date -d "-${i} days" +%d)
    echo "=== Day $DAY ==="
    sar -u -f /var/log/sa/sa${DAY} | tail -1
done

# Look at peak CPU usage times
sar -u -f /var/log/sa/sa$(date +%d) | sort -k3 -rn | head -5
```

If `%idle` regularly drops below 20% during business hours, you need more CPU capacity.

## Memory Capacity Analysis

```bash
# View memory usage trends
sar -r -f /var/log/sa/sa$(date +%d)

# Check swap usage trends (swap usage indicates memory pressure)
sar -S -f /var/log/sa/sa$(date +%d)

# Monitor for OOM killer events
journalctl -k | grep -c "Out of memory"
```

## Disk Capacity Analysis

```bash
# Check current usage and project when disks will fill
df -h

# Estimate daily growth rate
# Record disk usage daily and calculate the delta
du -sb /var/lib/pgsql/data/ > /tmp/disk-size-today.txt

# Simple growth projection script
#!/bin/bash
CURRENT_USED=$(df / | awk 'NR==2{print $3}')
TOTAL=$(df / | awk 'NR==2{print $2}')
FREE=$(df / | awk 'NR==2{print $4}')
# Assuming 1GB/day growth rate (adjust based on your data)
DAILY_GROWTH=1048576  # 1GB in KB
DAYS_LEFT=$((FREE / DAILY_GROWTH))
echo "At current growth rate, / will be full in approximately $DAYS_LEFT days"
```

## Disk I/O Analysis

```bash
# Check I/O wait percentage (high iowait means disk is a bottleneck)
sar -d -f /var/log/sa/sa$(date +%d) | tail -5

# Identify which disks are saturated
iostat -xz 1 5
# Look for %util > 80% and high await values
```

## Network Capacity Analysis

```bash
# View network throughput trends
sar -n DEV -f /var/log/sa/sa$(date +%d) | grep eth0

# Check for dropped packets (indicates saturation)
sar -n EDEV -f /var/log/sa/sa$(date +%d) | grep eth0
```

## Creating a Capacity Report

```bash
#!/bin/bash
# capacity-report.sh - Run monthly
echo "=== Capacity Report for $(hostname) ==="
echo "Date: $(date)"
echo ""
echo "CPU cores: $(nproc)"
echo "Average CPU idle: $(sar -u | tail -1 | awk '{print $NF}')%"
echo ""
echo "Total RAM: $(free -h | awk '/Mem:/{print $2}')"
echo "Used RAM: $(free -h | awk '/Mem:/{print $3}')"
echo ""
echo "Filesystem usage:"
df -h --output=target,pcent | grep -v tmpfs
echo ""
echo "Network throughput (avg):"
sar -n DEV | tail -1
```

Review capacity reports monthly and plan procurement or scaling 3-6 months ahead of projected exhaustion.
