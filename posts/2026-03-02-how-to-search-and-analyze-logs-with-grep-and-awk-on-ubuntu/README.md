# How to Search and Analyze Logs with grep and awk on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Logging, Grep, Awk, System Administration

Description: Use grep and awk to efficiently search, filter, and analyze log files on Ubuntu, extracting meaningful insights from large log datasets with command-line tools.

---

grep and awk are the two most important command-line tools for working with text logs. grep finds patterns; awk processes and transforms them. Together they handle the vast majority of log analysis tasks without requiring specialized tools. This guide focuses on practical patterns for log analysis on Ubuntu systems.

## grep Fundamentals for Log Analysis

grep searches for patterns in text. For log analysis, the key is knowing which flags make it more powerful:

```bash
# Basic search
grep "error" /var/log/syslog

# Case-insensitive search
grep -i "error" /var/log/syslog

# Show line numbers
grep -n "failed" /var/log/auth.log

# Count matching lines
grep -c "Failed password" /var/log/auth.log

# Show non-matching lines (invert match)
grep -v "DEBUG" /var/log/myapp.log

# Search multiple files
grep "error" /var/log/syslog /var/log/kern.log

# Search all files matching a pattern
grep -r "OOM" /var/log/

# Show context around matches
grep -A 5 "kernel panic" /var/log/syslog    # 5 lines after
grep -B 3 "kernel panic" /var/log/syslog    # 3 lines before
grep -C 5 "kernel panic" /var/log/syslog    # 5 lines before and after
```

## Extended Regex with grep -E

Extended regex (`-E` or `egrep`) enables more powerful patterns:

```bash
# Match either of two patterns
grep -E "error|warning" /var/log/syslog

# Match IP addresses (basic pattern)
grep -E "[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}" /var/log/auth.log

# Match lines starting with a timestamp
grep -E "^Mar  2" /var/log/syslog

# Match specific services
grep -E "nginx|apache2|mysql" /var/log/syslog

# Match failure messages (with variations)
grep -E "fail(ed|ure)|error|denied" /var/log/auth.log -i

# Extract lines with HTTP 5xx errors from nginx
grep -E '" 5[0-9]{2} ' /var/log/nginx/access.log
```

## Searching Compressed Logs

Ubuntu's logrotate compresses old logs with gzip. Use `zgrep` for compressed files:

```bash
# Search compressed log files
zgrep "error" /var/log/syslog.2.gz

# Search all syslog files including compressed
zgrep -i "kernel panic" /var/log/syslog*

# Or use zcat and pipe to grep
zcat /var/log/syslog.2.gz | grep "error"

# Search across all compressed and uncompressed logs
find /var/log -name "syslog*" -exec zgrep -l "error" {} \;
```

## Practical grep One-Liners for Common Log Analysis

```bash
# Find SSH brute force attempts
grep "Failed password" /var/log/auth.log | grep -oE "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" | sort | uniq -c | sort -rn | head -20

# Find successful sudo uses
grep "sudo:" /var/log/auth.log | grep "COMMAND"

# Find disk errors
grep -i "I/O error\|read error\|write error" /var/log/kern.log

# Find OOM killer events
grep -i "killed process\|out of memory" /var/log/syslog

# Find service crashes (systemd restarts)
grep "start request repeated too quickly" /var/log/syslog

# Check for login failures
grep "authentication failure" /var/log/auth.log | tail -20

# Find cron job failures
grep -i "failed\|error" /var/log/syslog | grep CRON

# HTTP 404 errors in nginx
grep '" 404 ' /var/log/nginx/access.log | wc -l
```

## awk for Log Analysis

awk processes each line, splitting it into fields. It's ideal for extracting specific columns from structured logs:

```bash
# Basic awk - print specific fields
# awk '{print $1}' prints the first field

# Print the username from auth.log failed logins
# Example line: "Failed password for john from 1.2.3.4 port 54321"
grep "Failed password" /var/log/auth.log | awk '{print $9}'

# Print timestamp and message
awk '{print $1, $2, $3, $NF}' /var/log/syslog | head -10

# Print field count for each line
awk '{print NF}' /var/log/nginx/access.log | sort | uniq -c
```

## Parsing Nginx Access Logs with awk

Nginx access logs have a predictable format:

```text
127.0.0.1 - frank [10/Oct/2023:13:55:36 -0700] "GET /index.html HTTP/1.1" 200 2326
```

```bash
# Count requests by status code
awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn

# Show top 10 IP addresses by request count
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10

# Calculate total bytes transferred
awk '{sum += $10} END {print "Total bytes:", sum}' /var/log/nginx/access.log

# Show average response size by status code
awk '{status[$9] += $10; count[$9]++} END {
    for (s in status) print s, int(status[s]/count[s]), "avg bytes"
}' /var/log/nginx/access.log | sort

# Find the most requested URLs
awk '{print $7}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20

# Show slow requests (those where response_time > 1 second)
# This requires nginx to log $request_time - needs custom log format
awk '{if ($NF > 1.0) print}' /var/log/nginx/access.log
```

## Time-Based Analysis with awk

Extract and analyze by time periods:

```bash
# Count requests per hour in nginx logs
awk '{
    # Extract hour from timestamp like [10/Oct/2023:14:30:00
    match($4, /:([0-9]+):/, arr)
    hour[arr[1]]++
}
END {
    for (h in hour) print h":00", hour[h]
}' /var/log/nginx/access.log | sort

# Count syslog messages by hour
awk '{
    # Syslog format: "Jan 15 14:23:01 hostname ..."
    print $3
}' /var/log/syslog | cut -d: -f1 | sort | uniq -c

# Count log entries per minute
grep "Mar  2" /var/log/syslog | \
    awk '{print $3}' | \
    cut -d: -f1,2 | \
    sort | uniq -c
```

## Combining grep and awk

The real power comes from chaining them together:

```bash
# Find failed SSH logins and count by source IP
grep "Failed password" /var/log/auth.log | \
    awk '{print $11}' | \
    sort | uniq -c | sort -rn | head -20

# Find nginx 5xx errors and show the URLs
grep '".*" 5' /var/log/nginx/access.log | \
    awk '{print $9, $7}' | \
    sort | uniq -c | sort -rn | head -20

# Calculate 404 error rate
total=$(wc -l < /var/log/nginx/access.log)
not_found=$(grep '" 404 ' /var/log/nginx/access.log | wc -l)
echo "404 rate: $(echo "scale=2; $not_found * 100 / $total" | bc)%"

# Find authentication failures in the last hour
# (assuming syslog format with date "Mar  2 14:30:01")
current_hour=$(date +"%b %e %H")
grep "$current_hour" /var/log/auth.log | \
    grep "Failed\|Invalid\|authentication failure" | \
    awk '{print $11}' | \
    sort | uniq -c | sort -rn
```

## Building a Log Analysis Script

For repeated analysis tasks, wrap the logic in a script:

```bash
cat << 'EOF' | sudo tee /usr/local/bin/log-summary
#!/bin/bash
# Daily log summary for Ubuntu systems

echo "=== Log Summary for $(date +%Y-%m-%d) ==="
echo ""

echo "--- Authentication Failures (last 24h) ---"
grep "$(date +%b)" /var/log/auth.log | \
    grep "Failed password\|authentication failure" | \
    awk '{print $11}' | \
    sort | uniq -c | sort -rn | head -10

echo ""
echo "--- System Errors (last 24h) ---"
grep "$(date +%b %e)" /var/log/syslog | \
    grep -i "error\|critical\|panic" | \
    awk '{$1=$2=$3=$4=""; print}' | \
    sort | uniq -c | sort -rn | head -10

echo ""
echo "--- Nginx Status Codes ---"
if [ -f /var/log/nginx/access.log ]; then
    awk '{print $9}' /var/log/nginx/access.log | \
        sort | uniq -c | sort -rn
fi

echo ""
echo "--- Disk Errors ---"
grep -i "I/O error\|read error" /var/log/kern.log | \
    tail -10

echo ""
echo "--- OOM Events ---"
grep -i "oom\|killed process\|out of memory" /var/log/syslog | \
    tail -5
EOF

sudo chmod +x /usr/local/bin/log-summary
sudo /usr/local/bin/log-summary
```

## Using awk for Multi-File Log Correlation

```bash
# Cross-reference auth.log and syslog for an IP
SUSPICIOUS_IP="192.168.1.50"

echo "Auth events from $SUSPICIOUS_IP:"
grep "$SUSPICIOUS_IP" /var/log/auth.log | \
    awk '{$1=$2=$3=$4=""; print}' | \
    sort | uniq -c | sort -rn

echo ""
echo "Syslog events mentioning $SUSPICIOUS_IP:"
grep "$SUSPICIOUS_IP" /var/log/syslog | \
    awk '{$1=$2=$3=$4=""; print}' | \
    sort | uniq -c | sort -rn
```

## Performance Tips for Large Log Files

```bash
# Use head/tail to limit data before piping to grep/awk
tail -n 100000 /var/log/nginx/access.log | grep "error"

# For very large files, use a faster tool like ripgrep
# sudo apt install ripgrep
rg "Failed password" /var/log/auth.log

# Parallel grep for multiple log files
find /var/log -name "*.log" -newer /var/log/syslog | \
    xargs -P 4 grep -l "error"

# Use fixed-string matching when regex isn't needed (faster)
grep -F "192.168.1.50" /var/log/auth.log   # -F = fixed string, no regex
```

## Useful awk Built-in Variables

```bash
# NR = record number (line number)
awk 'NR >= 100 && NR <= 200 {print}' /var/log/syslog  # Lines 100-200

# NF = number of fields
awk 'NF > 10' /var/log/syslog  # Lines with more than 10 fields

# FS = field separator (default: whitespace)
awk -F: '{print $1, $6}' /etc/passwd  # Username and home dir

# Process specific lines
awk '/error/,/resolved/' /var/log/syslog  # From "error" to "resolved"
```

grep and awk together cover the majority of log analysis needs. For more complex analysis involving time-series data or cross-system correlation, tools like ELK (Elasticsearch, Logstash, Kibana) or Grafana Loki become worthwhile. But for daily troubleshooting and operational monitoring on individual servers, mastering these two tools is sufficient for most sysadmins.
