# How to Use Ansible Ad Hoc Commands for Quick Troubleshooting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ad Hoc Commands, Troubleshooting, Incident Response

Description: Learn practical Ansible ad hoc command patterns for rapid troubleshooting during incidents, from network issues to application crashes and performance problems.

---

When production is on fire, you do not have time to write a playbook. You need answers fast. Which servers are affected? Is the service running? Is the disk full? Are connections being dropped? Ansible ad hoc commands let you investigate across your entire fleet in seconds, turning what would be dozens of individual SSH sessions into single commands.

This guide covers the troubleshooting commands I use most during real incidents.

## First Response: Connectivity Check

The first thing to determine in any incident is which servers are reachable:

```bash
# Quick connectivity check across all hosts
ansible all -m ping -f 50 --one-line

# Check a specific group
ansible webservers -m ping --one-line

# Identify unreachable hosts quickly
ansible all -m ping --one-line 2>&1 | grep -E "UNREACHABLE|FAILED"
```

If hosts are unreachable via Ansible, they are likely unreachable by your users too. This immediately narrows the scope of the incident.

## Service Status Checks

Next, check if the relevant services are running:

```bash
# Check if nginx is running on all web servers
ansible webservers -m shell -a "systemctl is-active nginx" --one-line

# Check multiple services at once
ansible appservers -m shell -a "for s in nginx myapp redis postgresql; do echo \"\$s: \$(systemctl is-active \$s 2>/dev/null || echo N/A)\"; done"

# Find servers where a specific service has crashed
ansible all -m shell -a "systemctl is-failed nginx 2>/dev/null && hostname || true" --one-line

# Check process count for a specific application
ansible appservers -m shell -a "pgrep -c myapp || echo 0" --one-line
```

## Log Investigation

Logs tell you what went wrong. Pull relevant log entries from all affected servers at once:

```bash
# Check for recent errors in application logs
ansible appservers -m shell -a "journalctl -u myapp --since '10 minutes ago' -p err --no-pager | tail -20"

# Search for a specific error message across all servers
ansible all -m shell -a "grep -l 'Connection refused' /var/log/app/*.log 2>/dev/null" --one-line

# Check nginx error logs
ansible webservers -m shell -a "tail -20 /var/log/nginx/error.log"

# Check for OOM killer activity
ansible all -m shell -a "dmesg | grep -i 'out of memory' | tail -5" --become

# Check system log for recent critical messages
ansible all -m shell -a "journalctl -p crit --since '30 minutes ago' --no-pager"
```

## Resource Exhaustion Checks

Many incidents are caused by running out of resources. Check all of them at once:

```bash
# Comprehensive resource check
ansible all -m shell -a "
echo '=== $(hostname) ==='
echo 'CPU Load: $(cat /proc/loadavg | awk \"{print \\$1, \\$2, \\$3}\")'
echo 'Memory: $(free -m | awk \"/^Mem:/ {printf \\\"%d/%d MB (%.0f%%)\\\", \\$3, \\$2, \\$3/\\$2*100}\")'
echo 'Disk /: $(df -h / | awk \"NR==2 {print \\$5}\")'
echo 'Open files: $(lsof 2>/dev/null | wc -l)'
echo 'TCP connections: $(ss -s | awk \"/^TCP:/ {print}\")'
"

# Quick disk check
ansible all -m shell -a "df -h / | awk 'NR==2 {print \$5}'" --one-line

# Quick memory check
ansible all -m shell -a "free -m | awk '/^Mem:/ {printf \"%.0f%%\", \$3/\$2*100}'" --one-line

# Quick load check
ansible all -m shell -a "cat /proc/loadavg | awk '{print \$1}'" --one-line
```

## Network Troubleshooting

When network issues are suspected:

```bash
# Check if servers can reach each other
ansible webservers -m shell -a "curl -s --connect-timeout 5 -o /dev/null -w '%{http_code}' http://app1.internal:3000/health || echo 'FAIL'"

# Check DNS resolution
ansible all -m shell -a "dig +short api.example.com"

# Check for connection issues
ansible all -m shell -a "ss -s" --one-line

# Check for TIME_WAIT connection buildup
ansible webservers -m shell -a "ss -tan | awk '{print \$1}' | sort | uniq -c | sort -rn"

# Check if specific ports are open
ansible appservers -m shell -a "ss -tlnp | grep -E ':(80|443|3000|5432)'" --become

# Trace network path to a specific host
ansible webservers -m shell -a "traceroute -n -w 2 -m 15 db.internal 2>/dev/null | tail -5"

# Check for packet loss
ansible webservers -m shell -a "ping -c 5 -W 2 db.internal | tail -2"
```

## Application-Specific Debugging

```bash
# Check database connections
ansible appservers -m shell -a "ss -tnp | grep ':5432' | wc -l"

# Check Redis connectivity
ansible appservers -m shell -a "redis-cli -h redis.internal ping 2>&1"

# Check application health endpoints
ansible webservers -m shell -a "curl -s http://localhost:3000/health | python3 -m json.tool 2>/dev/null || echo 'Health check failed'"

# Check if the application is responding
ansible webservers -m shell -a "curl -s -o /dev/null -w 'HTTP %{http_code} in %{time_total}s' http://localhost/ 2>&1"

# Check application thread/process count
ansible appservers -m shell -a "ps -eo pid,nlwp,comm | grep myapp"

# Check file descriptor usage for a process
ansible appservers -m shell -a "ls /proc/\$(pgrep -f myapp)/fd 2>/dev/null | wc -l"
```

## Comparing Server States

During incidents, comparing a healthy server to an unhealthy one reveals the difference:

```bash
# Compare package versions between two servers
diff <(ansible web1.example.com -m shell -a "dpkg -l | grep nginx" --one-line) \
     <(ansible web2.example.com -m shell -a "dpkg -l | grep nginx" --one-line)

# Compare running processes
ansible 'web1.example.com:web2.example.com' -m shell -a "ps aux --sort=-%mem | head -10"

# Compare configuration files
ansible webservers -m shell -a "md5sum /etc/nginx/nginx.conf" --one-line

# Compare system time (clock skew can cause issues)
ansible all -m shell -a "date '+%Y-%m-%d %H:%M:%S %Z'" --one-line

# Compare kernel versions
ansible all -m shell -a "uname -r" --one-line
```

## Incident Response Workflows

### Workflow 1: Service Outage

```bash
# 1. Identify which servers are affected
ansible webservers -m shell -a "curl -s -o /dev/null -w '%{http_code}' http://localhost/" --one-line

# 2. Check if the service process is running
ansible webservers -m shell -a "systemctl status nginx | head -5" --become

# 3. Check for configuration errors
ansible webservers -m shell -a "nginx -t" --become

# 4. Check recent logs for the root cause
ansible webservers -m shell -a "journalctl -u nginx --since '5 minutes ago' --no-pager"

# 5. Restart the service if needed
ansible webservers -m service -a "name=nginx state=restarted" --become -f 1

# 6. Verify recovery
ansible webservers -m shell -a "curl -s -o /dev/null -w '%{http_code}' http://localhost/" --one-line
```

### Workflow 2: Performance Degradation

```bash
# 1. Check system load
ansible appservers -m shell -a "uptime" --one-line

# 2. Identify top CPU consumers
ansible appservers -m shell -a "ps aux --sort=-%cpu | head -6"

# 3. Identify top memory consumers
ansible appservers -m shell -a "ps aux --sort=-%mem | head -6"

# 4. Check for I/O wait
ansible appservers -m shell -a "iostat -x 1 2 | tail -10" --become

# 5. Check network latency to dependencies
ansible appservers -m shell -a "curl -s -o /dev/null -w '%{time_total}' http://db.internal:5432 || echo 'unreachable'"

# 6. Check if it is a recent change
ansible appservers -m shell -a "ls -lt /opt/app/releases/ | head -5"
```

### Workflow 3: Disk Space Emergency

```bash
# 1. Find which servers are critical
ansible all -m shell -a "df -h / | awk 'NR==2 {pct=\$5; gsub(/%/,\"\",pct); if (pct > 90) print \$5}'" --one-line

# 2. Find what is using space on the affected server
ansible web2.example.com -m shell -a "du -sh /* 2>/dev/null | sort -rh | head -10" --become

# 3. Find large files created recently
ansible web2.example.com -m shell -a "find /var -type f -size +100M -mtime -1 -ls" --become

# 4. Clean up safely
ansible web2.example.com -m shell -a "journalctl --vacuum-size=100M" --become
ansible web2.example.com -m shell -a "apt-get clean" --become

# 5. Verify improvement
ansible web2.example.com -m shell -a "df -h /"
```

## Building a Troubleshooting Toolkit

Create a set of shell aliases for frequent troubleshooting commands:

```bash
# Add to your ~/.bashrc or ~/.zshrc
alias acheck='ansible all -m ping --one-line -f 50'
alias aload='ansible all -m shell -a "cat /proc/loadavg | awk \"{print \\\$1}\"" --one-line -f 50'
alias adisk='ansible all -m shell -a "df -h / | awk \"NR==2 {print \\\$5}\"" --one-line -f 50'
alias amem='ansible all -m shell -a "free -m | awk \"/^Mem:/ {printf \\\"%.0f%%\\\", \\\$3/\\\$2*100}\"" --one-line -f 50'
alias asvc='function _asvc() { ansible all -m shell -a "systemctl is-active $1" --one-line; }; _asvc'
```

```bash
# Now use them during incidents
acheck          # Quick connectivity check
aload           # CPU load across fleet
adisk           # Disk usage across fleet
amem            # Memory usage across fleet
asvc nginx      # Check nginx status everywhere
```

## Summary

Ansible ad hoc commands are your best friend during production incidents. They let you gather information from your entire fleet in seconds rather than minutes. Build a library of go-to troubleshooting commands, create shell aliases for the ones you use most, and practice using them before incidents happen. The speed at which you can diagnose a problem directly correlates with how quickly you can resolve it, and Ansible gives you that speed across any number of servers.
