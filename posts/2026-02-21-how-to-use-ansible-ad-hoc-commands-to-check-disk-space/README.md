# How to Use Ansible Ad Hoc Commands to Check Disk Space

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ad Hoc Commands, Disk Space, Monitoring

Description: Learn how to check disk space across your entire server fleet using Ansible ad hoc commands with practical examples for monitoring and alerting.

---

Running out of disk space is one of the most common causes of application outages. Logs fill up, databases grow, temp files accumulate, and suddenly your service is down at 3 AM because /var/log hit 100%. Checking disk space across all your servers regularly is basic hygiene, and Ansible ad hoc commands make it trivial to do.

## Quick Disk Space Check

The fastest way to check disk space across all hosts:

```bash
# Check disk usage on all servers
ansible all -a "df -h"
```

This runs `df -h` on every host in your inventory and returns human-readable output showing all mounted filesystems, their sizes, and usage percentages.

Output looks like:

```
web1 | CHANGED | rc=0 >>
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        50G   32G   16G  67% /
/dev/sdb1       200G  145G   45G  77% /var
tmpfs           7.8G     0  7.8G   0% /dev/shm

web2 | CHANGED | rc=0 >>
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        50G   48G  512M  99% /
/dev/sdb1       200G   89G  101G  47% /var
tmpfs           7.8G     0  7.8G   0% /dev/shm
```

## Checking Specific Partitions

When you only care about certain mount points:

```bash
# Check only the root partition
ansible all -m shell -a "df -h / | tail -1"

# Check the /var partition (where logs usually live)
ansible all -m shell -a "df -h /var | tail -1"

# Check multiple specific partitions
ansible all -m shell -a "df -h / /var /tmp 2>/dev/null | tail -n +2"

# Get only the percentage used (useful for alerting)
ansible all -m shell -a "df -h / | awk 'NR==2 {print \$5}'" --one-line
```

The `--one-line` flag gives compact output that is easy to scan:

```
web1 | CHANGED | rc=0 | (stdout) 67%
web2 | CHANGED | rc=0 | (stdout) 99%
db1 | CHANGED | rc=0 | (stdout) 45%
```

## Finding Servers with Low Disk Space

The real value is in quickly identifying which servers need attention:

```bash
# Show only servers where root partition is more than 80% full
ansible all -m shell -a "USAGE=\$(df / | awk 'NR==2 {gsub(/%/,\"\"); print \$5}'); if [ \$USAGE -gt 80 ]; then echo \"WARNING: \$(hostname) root is \${USAGE}% full\"; fi" --one-line

# A cleaner version using a simple script
ansible all -m shell -a "df -h / /var /tmp 2>/dev/null | awk 'NR>1 {gsub(/%/,\"\",\$5); if (\$5+0 > 80) print \$6, \$5\"%\", \"of\", \$2}'"
```

## Using Ansible Facts for Disk Information

The `setup` module provides structured disk data that is easier to parse than command output:

```bash
# Get mount information from Ansible facts
ansible all -m setup -a "filter=ansible_mounts"

# Get just device and mount facts
ansible all -m setup -a "filter=ansible_device*"
```

The `ansible_mounts` fact returns a list of dictionaries with fields like `mount`, `device`, `size_total`, `size_available`, and `fstype`. This is much more structured than parsing `df` output.

## Inode Usage

Disk space is not the only thing that can run out. Inodes can be exhausted even when there is free space:

```bash
# Check inode usage
ansible all -a "df -i"

# Check inode usage on root only
ansible all -m shell -a "df -i / | tail -1"

# Find partitions with high inode usage
ansible all -m shell -a "df -i | awk 'NR>1 {gsub(/%/,\"\",\$5); if (\$5+0 > 80) print \$6, \$5\"%\", \"inodes used\"}'"
```

## Finding What Is Using Disk Space

Once you identify servers with low space, find out what is consuming it:

```bash
# Find the largest directories under /var
ansible web2.example.com -m shell -a "du -sh /var/*/ 2>/dev/null | sort -rh | head -10" --become

# Find the largest files on the system
ansible web2.example.com -m shell -a "find / -type f -size +100M -exec ls -lh {} \\; 2>/dev/null | sort -k5 -rh | head -10" --become

# Check log file sizes
ansible all -m shell -a "du -sh /var/log/ 2>/dev/null"

# Find old log files that can be cleaned up
ansible all -m shell -a "find /var/log -name '*.gz' -mtime +30 | wc -l" --become

# Check Docker disk usage (if applicable)
ansible all -m shell -a "docker system df 2>/dev/null || echo 'Docker not running'"

# Check temp directory usage
ansible all -m shell -a "du -sh /tmp/ /var/tmp/ 2>/dev/null"
```

## Automated Disk Space Report

Here is a script that generates a clean disk space report across your fleet:

```bash
#!/bin/bash
# disk_report.sh - Generate a disk space report for all servers
# Usage: ./disk_report.sh [inventory_file]

INVENTORY="${1:-inventory/production.ini}"
THRESHOLD=80

echo "============================================"
echo "Disk Space Report - $(date '+%Y-%m-%d %H:%M')"
echo "============================================"
echo ""

# Get disk usage for root partition from all hosts
echo "Server                     Usage  Available  Mount"
echo "--------------------------------------------"

ansible all -i "$INVENTORY" -m shell -a "df -h / | awk 'NR==2 {printf \"%-25s %5s  %9s  %s\n\", \"$(hostname)\", \$5, \$4, \$6}'" --one-line 2>/dev/null | \
    grep "CHANGED" | \
    sed 's/.*| (stdout) //' | \
    sort

echo ""
echo "============================================"
echo "ALERTS (above ${THRESHOLD}% usage):"
echo "============================================"

ansible all -i "$INVENTORY" -m shell -a "USAGE=\$(df / | awk 'NR==2 {gsub(/%/,\"\"); print \$5}'); if [ \$USAGE -gt $THRESHOLD ]; then hostname; fi" --one-line 2>/dev/null | \
    grep "CHANGED" | \
    sed 's/ .*//'
```

## Cleaning Up Disk Space

Once you find the problem, fix it with ad hoc commands:

```bash
# Rotate logs immediately
ansible web2.example.com -m shell -a "logrotate -f /etc/logrotate.conf" --become

# Remove old compressed logs
ansible all -m shell -a "find /var/log -name '*.gz' -mtime +30 -delete" --become

# Clean apt cache (Debian/Ubuntu)
ansible all -m apt -a "autoclean=yes" --become

# Remove old kernels (Ubuntu)
ansible all -m shell -a "apt-get autoremove -y" --become

# Clean Docker resources
ansible all -m shell -a "docker system prune -af 2>/dev/null" --become

# Truncate large log files without deleting them (preserves file handles)
ansible web2.example.com -m shell -a "truncate -s 0 /var/log/nginx/access.log" --become

# Remove temp files older than 7 days
ansible all -m shell -a "find /tmp -type f -mtime +7 -delete 2>/dev/null" --become
```

## Setting Up Disk Space Monitoring

You can create a cron job via ad hoc commands to monitor disk space regularly:

```bash
# Add a cron job that checks disk space every hour and logs warnings
ansible all -m cron -a "name='disk space check' minute=0 job='USAGE=\$(df / | awk \"NR==2 {gsub(/%/,\\\"\\\"); print \\\$5}\"); [ \$USAGE -gt 90 ] && echo \"\$(date): WARNING root partition at \${USAGE}%%\" >> /var/log/disk_warning.log'" --become
```

## Checking Disk I/O

While checking space, you might also want to look at disk performance:

```bash
# Check current disk I/O
ansible all -m shell -a "iostat -xh 1 2 | tail -n +7" --become

# Check which processes are doing the most I/O
ansible all -m shell -a "iotop -b -n 1 | head -15" --become

# Check if any disk is showing errors
ansible all -m shell -a "dmesg | grep -i 'error\|fail' | grep -i 'sd\|nvme\|disk' | tail -5" --become
```

## LVM and Volume Information

If your servers use LVM, check volume group and logical volume space:

```bash
# Check volume group free space
ansible all -m shell -a "vgs 2>/dev/null" --become

# Check logical volume sizes
ansible all -m shell -a "lvs 2>/dev/null" --become

# Check physical volumes
ansible all -m shell -a "pvs 2>/dev/null" --become
```

## Summary

Checking disk space with Ansible ad hoc commands gives you fleet-wide visibility in seconds. Use `df -h` for quick checks, the `setup` module for structured data, and shell commands with `awk` for filtered alerting. When you find servers running low, drill down with `du` and `find` to identify the culprits, then clean up with targeted commands. Set up automated monitoring with cron jobs to catch space issues before they cause outages. This is one of those tasks where spending five minutes setting up Ansible saves you from hours of firefighting later.
