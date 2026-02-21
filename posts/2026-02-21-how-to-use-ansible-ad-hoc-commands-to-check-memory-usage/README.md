# How to Use Ansible Ad Hoc Commands to Check Memory Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ad Hoc Commands, Memory Monitoring, System Administration

Description: Learn how to check memory usage and identify memory-hungry processes across your server fleet using Ansible ad hoc commands.

---

Memory issues are sneaky. An application slowly leaks memory over days, a cache grows unbounded, or a deployment brings a version with higher memory requirements. By the time the OOM killer starts terminating processes, it is already an incident. Regularly checking memory usage across your fleet with Ansible ad hoc commands helps you catch these problems early.

## Quick Memory Check

The fastest way to see memory usage across all your servers:

```bash
# Check memory on all hosts
ansible all -a "free -m"
```

Output:

```
web1 | CHANGED | rc=0 >>
              total        used        free      shared  buff/cache   available
Mem:           7963        3421         512         128        4030        4120
Swap:          2047           0        2047

web2 | CHANGED | rc=0 >>
              total        used        free      shared  buff/cache   available
Mem:           7963        7102          64          45         797         543
Swap:          2047        1024        1023
```

Looking at web2, memory is nearly exhausted and swap is being used. That server needs attention.

## Getting Just the Numbers

When scanning a large fleet, you want compact output:

```bash
# Show memory usage percentage for each host
ansible all -m shell -a "free | awk '/^Mem:/ {printf \"%.1f%% used, %.1f%% available\n\", \$3/\$2*100, \$7/\$2*100}'" --one-line

# Show total, used, and available in MB
ansible all -m shell -a "free -m | awk '/^Mem:/ {print \"Total:\", \$2, \"MB  Used:\", \$3, \"MB  Available:\", \$7, \"MB\"}'" --one-line

# Just the percentage used
ansible all -m shell -a "free | awk '/^Mem:/ {printf \"%.0f%%\n\", \$3/\$2*100}'" --one-line
```

The `--one-line` output makes it easy to spot problems:

```
web1 | CHANGED | rc=0 | (stdout) 43% used, 52% available
web2 | CHANGED | rc=0 | (stdout) 89% used, 7% available
db1 | CHANGED | rc=0 | (stdout) 62% used, 35% available
```

## Using Ansible Facts for Memory Info

The `setup` module provides structured memory data:

```bash
# Get total memory
ansible all -m setup -a "filter=ansible_memtotal_mb"

# Get free memory
ansible all -m setup -a "filter=ansible_memfree_mb"

# Get all memory-related facts
ansible all -m setup -a "filter=ansible_mem*"

# Get swap information
ansible all -m setup -a "filter=ansible_swap*"
```

Facts give you cleaner data for scripting:

```bash
# Quick script to identify low-memory hosts using facts
ansible all -m setup -a "filter=ansible_mem*" --tree /tmp/memfacts/ > /dev/null 2>&1

for file in /tmp/memfacts/*; do
    host=$(basename "$file")
    python3 -c "
import json
with open('$file') as f:
    data = json.load(f)
facts = data.get('ansible_facts', {})
total = facts.get('ansible_memtotal_mb', 0)
free = facts.get('ansible_memfree_mb', 0)
if total > 0:
    pct_used = (total - free) / total * 100
    if pct_used > 80:
        print(f'WARNING: $host - {pct_used:.0f}% memory used ({total}MB total, {free}MB free)')
"
done
```

## Finding Memory-Hungry Processes

Once you know which servers are low on memory, find out what is consuming it:

```bash
# Top 10 memory-consuming processes
ansible web2.example.com -m shell -a "ps aux --sort=-%mem | head -11"

# More detailed view with RSS (actual memory usage)
ansible web2.example.com -m shell -a "ps -eo pid,user,rss,vsz,comm --sort=-rss | head -15"

# Sum memory usage by process name
ansible web2.example.com -m shell -a "ps -eo comm,rss --sort=-rss | awk 'NR>1 {a[\$1]+=\$2} END {for (p in a) printf \"%-20s %d MB\n\", p, a[p]/1024}' | sort -k2 -rn | head -10"

# Check specific application memory usage
ansible appservers -m shell -a "ps -C java -o pid,rss,vsz,args --sort=-rss"

# Check if OOM killer has been active
ansible all -m shell -a "dmesg | grep -i 'out of memory' | tail -5" --become
```

## Checking Swap Usage

Swap usage is a warning sign. If your servers are using swap, they are likely under memory pressure:

```bash
# Check swap usage across all hosts
ansible all -m shell -a "free -m | awk '/^Swap:/ {if (\$2 > 0) printf \"Swap: %d/%d MB used (%.0f%%)\n\", \$3, \$2, \$3/\$2*100; else print \"No swap configured\"}'" --one-line

# Find processes using swap
ansible web2.example.com -m shell -a "for pid in /proc/[0-9]*; do swap=\$(awk '/VmSwap/{print \$2}' \$pid/status 2>/dev/null); name=\$(awk '/Name/{print \$2}' \$pid/status 2>/dev/null); if [ -n \"\$swap\" ] && [ \"\$swap\" -gt 0 ] 2>/dev/null; then echo \"\$swap kB - \$name (pid \$(basename \$pid))\"; fi; done | sort -rn | head -10" --become

# Check swappiness setting
ansible all -m shell -a "cat /proc/sys/vm/swappiness"
```

## Monitoring Memory Over Time

For trending, capture memory snapshots periodically:

```bash
# Capture a memory snapshot with timestamp
ansible all -m shell -a "echo \"\$(date '+%Y-%m-%d %H:%M') \$(hostname) \$(free -m | awk '/^Mem:/ {print \$3\"/\"\$2\"MB\"}')\" >> /var/log/memory_usage.log" --become

# Set up a cron job to log memory usage every 5 minutes
ansible all -m cron -a "name='memory logging' minute='*/5' job='echo \"\$(date +\\%Y-\\%m-\\%d\\ \\%H:\\%M) \$(free -m | awk \"/^Mem:/ {print \\\$3\\\"/\\\"\\\$2\\\"MB\\\"}\")\" >> /var/log/memory_usage.log'" --become

# View the memory log
ansible web2.example.com -m shell -a "tail -20 /var/log/memory_usage.log"
```

## Cache and Buffer Analysis

Linux uses free memory for disk caching, which is normal and efficient. The "available" column in `free` output shows how much memory is actually available for applications (free memory plus reclaimable cache).

```bash
# Show the breakdown of memory usage including cache
ansible all -m shell -a "free -m | head -2"

# Check the page cache size
ansible all -m shell -a "cat /proc/meminfo | grep -E 'Cached|Buffers|SReclaimable'"

# Drop caches if needed (emergency measure, not routine)
# This frees page cache, dentries, and inodes
ansible web2.example.com -m shell -a "sync && echo 3 > /proc/sys/vm/drop_caches" --become
```

## Checking Specific Application Memory

For application-specific memory checks:

```bash
# Check memory usage of all nginx workers
ansible webservers -m shell -a "ps -C nginx -o pid,rss,%mem,args | awk '{sum+=\$2} END {printf \"Total RSS: %d MB across %d processes\n\", sum/1024, NR-1}'"

# Check Java heap usage
ansible appservers -m shell -a "jstat -gc \$(pgrep -f 'myapp.jar') 2>/dev/null | tail -1"

# Check PostgreSQL shared buffers usage
ansible databases -m shell -a "psql -c 'SHOW shared_buffers;'" --become --become-user=postgres

# Check Redis memory usage
ansible cacheservers -m shell -a "redis-cli info memory | grep used_memory_human"

# Check Docker container memory usage
ansible all -m shell -a "docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}' 2>/dev/null"
```

## Memory Alert Script

Here is a practical script that alerts on high memory usage:

```bash
#!/bin/bash
# check_memory.sh - Alert on high memory usage across fleet
# Usage: ./check_memory.sh [inventory] [threshold_percent]

INVENTORY="${1:-inventory/production.ini}"
THRESHOLD="${2:-85}"

echo "Checking memory usage across fleet (threshold: ${THRESHOLD}%)"
echo "================================================="

# Get memory percentage from each host
RESULTS=$(ansible all -i "$INVENTORY" -m shell -a "
TOTAL=\$(awk '/MemTotal/ {print \$2}' /proc/meminfo)
AVAIL=\$(awk '/MemAvailable/ {print \$2}' /proc/meminfo)
USED=\$((TOTAL - AVAIL))
PCT=\$((USED * 100 / TOTAL))
echo \"\$PCT \$TOTAL \$AVAIL\"
" --one-line 2>/dev/null)

ALERT_COUNT=0

echo "$RESULTS" | grep "CHANGED" | while read line; do
    HOST=$(echo "$line" | awk '{print $1}')
    PCT=$(echo "$line" | awk -F'stdout) ' '{print $2}' | awk '{print $1}')

    if [ -n "$PCT" ] && [ "$PCT" -gt "$THRESHOLD" ] 2>/dev/null; then
        echo "ALERT: $HOST at ${PCT}% memory usage"
        ALERT_COUNT=$((ALERT_COUNT + 1))
    fi
done

echo ""
echo "Check complete."
```

## Handling Out-of-Memory Situations

When a server is critically low on memory:

```bash
# Find and kill the top memory consumer (use with extreme caution)
ansible web2.example.com -m shell -a "ps -eo pid,rss,comm --sort=-rss | awk 'NR==2 {print \$1}'" --become
# Review the output, then kill if appropriate:
ansible web2.example.com -m shell -a "kill -15 <PID>" --become

# Restart a known memory-leaking service
ansible web2.example.com -m service -a "name=myapp state=restarted" --become

# Check OOM score for processes (higher score = more likely to be killed by OOM)
ansible all -m shell -a "for pid in \$(ps -eo pid --no-headers); do echo \"\$(cat /proc/\$pid/oom_score 2>/dev/null) \$(cat /proc/\$pid/comm 2>/dev/null)\"; done | sort -rn | head -10" --become
```

## Summary

Monitoring memory usage with Ansible ad hoc commands gives you instant fleet-wide visibility. Use `free -m` for quick checks, `ansible_mem*` facts for structured data, and `ps` with sorting for process-level analysis. Watch for swap usage as an early warning sign, track memory trends over time with logging cron jobs, and have scripts ready for when you need to investigate and respond to memory pressure. Regular memory checks catch leaks and capacity issues before they become outages.
