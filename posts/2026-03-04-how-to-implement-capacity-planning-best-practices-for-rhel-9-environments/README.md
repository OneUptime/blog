# How to Implement Capacity Planning Best Practices for RHEL 9 Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Best Practices

Description: Step-by-step guide on implement capacity planning best practices for rhel 9 environments with practical examples and commands.

---

Capacity planning ensures your RHEL 9 infrastructure can handle growth without performance degradation.

## Collect Baseline Metrics

```bash
# Install sysstat for historical data
sudo dnf install -y sysstat
sudo systemctl enable --now sysstat

# Record baseline metrics
sar -u 1 60 > /var/log/capacity/cpu-baseline.txt
sar -r 1 60 > /var/log/capacity/memory-baseline.txt
sar -d 1 60 > /var/log/capacity/disk-baseline.txt
sar -n DEV 1 60 > /var/log/capacity/network-baseline.txt
```

## CPU Capacity Planning

```bash
# Current CPU usage trends
sar -u -f /var/log/sa/sa$(date +%d) | tail -20

# Per-core utilization
mpstat -P ALL 1 10

# Planning threshold: Sustained usage above 70% requires scaling
```

## Memory Capacity Planning

```bash
# Current memory usage
free -m
sar -r -f /var/log/sa/sa$(date +%d) | tail -20

# Check for swap usage trends
sar -S -f /var/log/sa/sa$(date +%d) | tail -20

# Planning threshold: Memory usage above 80% needs attention
```

## Disk Capacity Planning

```bash
# Current usage and growth rate
df -h
sar -d -f /var/log/sa/sa$(date +%d) | tail -20

# Calculate growth rate
# Compare disk usage over 30 days
# Forecast when you will reach 80% capacity
```

## Network Capacity Planning

```bash
# Interface utilization
sar -n DEV -f /var/log/sa/sa$(date +%d) | tail -20

# Check for packet errors and drops
ip -s link show eth0
```

## Growth Projections

Create a simple growth forecast:

```bash
# Collect monthly data points
echo "Month,CPU%,Memory%,Disk%,Network_Mbps" >> /var/log/capacity/growth.csv
echo "$(date +%Y-%m),$(sar -u 1 1 | tail -1 | awk '{print 100-$NF}'),$(free | awk '/Mem:/{printf("%.0f", $3/$2*100)}'),$(df / | tail -1 | awk '{print $5}'),$(sar -n DEV 1 1 | grep eth0 | tail -1 | awk '{print $5}')" >> /var/log/capacity/growth.csv
```

## Resource Right-Sizing

```bash
# Identify over-provisioned systems
# CPU: Consistently below 20% usage
# Memory: Consistently below 40% usage
# Disk: Less than 30% utilized
```

## Capacity Alerts

```bash
# Configure alerts for approaching limits
sudo tee /etc/cron.d/capacity-check <<EOF
0 8 * * 1 root /opt/scripts/capacity-check.sh | mail -s "Weekly Capacity Report" admin@example.com
EOF
```

## Conclusion

Capacity planning for RHEL 9 requires collecting baseline metrics, tracking growth trends, and setting thresholds for action. Use sysstat for historical data collection and plan scaling actions before resources reach critical levels.

