# How to Use grep and awk Patterns for Log Mining on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Log Analysis, Grep, Awk

Description: A comprehensive guide to using grep and awk for log mining on Ubuntu, with practical patterns for extracting, filtering, and summarizing data from system and application logs.

---

When production issues hit, the ability to quickly pull meaningful information out of logs is essential. `grep` and `awk` are available on every Linux system, require no setup, and handle gigabyte-scale log files efficiently. Learning their patterns well turns raw log files into actionable data in seconds.

This guide covers practical patterns for common log mining tasks.

## grep Fundamentals for Logs

`grep` filters lines. Its real power comes from knowing which options change its behavior.

### Essential grep Options

```bash
# -i: case-insensitive
grep -i "error" /var/log/syslog

# -n: show line numbers
grep -n "FATAL" /var/log/myapp.log

# -c: count matching lines
grep -c "404" /var/log/nginx/access.log

# -l: list only filenames that match (useful for searching multiple files)
grep -l "Out of memory" /var/log/*.log

# -r: recursive search through directories
grep -r "database connection" /var/log/

# -v: invert match (show lines that do NOT match)
grep -v "^#" /etc/ssh/sshd_config  # show non-comment lines

# -A: show lines after the match
grep -A 5 "Segmentation fault" /var/log/syslog  # 5 lines after each match

# -B: show lines before the match
grep -B 3 "FATAL" /var/log/app.log   # 3 lines before

# -C: context (lines before and after)
grep -C 5 "error" /var/log/app.log

# -E: extended regex (same as egrep)
grep -E "error|warning|critical" /var/log/syslog
```

### Pattern Matching

```bash
# Exact word match (not substring)
grep -w "fail" /var/log/auth.log
# Matches "fail" but not "failure" or "failsafe"

# Anchor to line start
grep "^Mar 02" /var/log/syslog

# Anchor to line end
grep "Connection refused$" /var/log/app.log

# Match specific HTTP status codes
grep '"5[0-9][0-9] ' /var/log/nginx/access.log  # 5xx errors
grep '"4[0-9][0-9] ' /var/log/nginx/access.log  # 4xx errors

# Match IPv4 addresses
grep -E '[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}' /var/log/auth.log

# Match timestamps in bracket notation
grep '\[2026-03-02' /var/log/app.log
```

### Searching Compressed Logs

```bash
# Search compressed log files without decompressing
zgrep "error" /var/log/syslog.*.gz

# Search all syslog files (compressed and uncompressed)
zcat /var/log/syslog.*.gz | grep "Out of memory"
# Or:
grep -r "Out of memory" /var/log/ --include="syslog*"
```

## awk for Log Data Extraction

`awk` processes each line as a record with fields separated by a delimiter. Fields are referenced as `$1`, `$2`, etc. (`$0` is the entire line).

### Field Extraction

Nginx access log format: `IP - - [datetime] "METHOD /path HTTP/1.1" STATUS BYTES "referer" "user-agent"`

```bash
# Print only IP addresses from nginx logs
awk '{print $1}' /var/log/nginx/access.log

# Print IP and status code (field 9 in combined format)
awk '{print $1, $9}' /var/log/nginx/access.log

# Print the request URL (inside the quoted string in field 7)
awk '{print $7}' /var/log/nginx/access.log

# Print just the HTTP method
awk '{print $6}' /var/log/nginx/access.log | tr -d '"'
```

### Filtering with awk

```bash
# Show only 500 errors (field 9 is the status code)
awk '$9 == 500' /var/log/nginx/access.log

# Show requests to /api/ endpoints
awk '$7 ~ /^\/api\//' /var/log/nginx/access.log

# Show only POST requests
awk '$6 == "\"POST"' /var/log/nginx/access.log

# Lines where response size is over 1 MB
awk '$10 > 1048576' /var/log/nginx/access.log
```

### Counting and Summarizing

```bash
# Count requests per IP address (top 20)
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20

# Count requests per status code
awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn

# Count requests per URL
awk '{print $7}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20

# Total bytes transferred per IP
awk '{bytes[$1] += $10} END {for (ip in bytes) print bytes[ip], ip}' \
  /var/log/nginx/access.log | sort -rn | head -10

# Average response time (if field 11 has request time in seconds)
awk '{sum += $11; count++} END {print "Average:", sum/count, "seconds"}' \
  /var/log/nginx/access.log
```

### Time-Based Filtering

```bash
# Show all requests in a specific hour
awk '/\[02\/Mar\/2026:14/' /var/log/nginx/access.log

# Show requests between two times (using string comparison on timestamp)
awk '$4 >= "[02/Mar/2026:10:00" && $4 <= "[02/Mar/2026:11:00"' \
  /var/log/nginx/access.log

# Count requests per hour (extract hour from timestamp)
awk '{print substr($4, 14, 2)}' /var/log/nginx/access.log | \
  sort | uniq -c
```

### Custom Field Separators

```bash
# Parse CSV logs (-F sets the field separator)
awk -F',' '{print $3}' /var/log/app/events.csv

# Parse key=value log format
# 2026-03-02 10:15:30 level=ERROR service=api message="connection failed"
awk '{for(i=1;i<=NF;i++) if($i ~ /level=/) print $i}' /var/log/app.log

# Parse JSON log lines (basic approach - use jq for complex JSON)
awk -F'"status":' '{print $2}' /var/log/app.log | awk -F',' '{print $1}'
```

## Combining grep and awk

```bash
# Find 500 errors and extract the URLs
grep '"500 ' /var/log/nginx/access.log | awk '{print $7}'

# Find failed SSH logins and extract the IP addresses
grep "Failed password" /var/log/auth.log | \
  awk '{print $11}' | sort | uniq -c | sort -rn | head -20

# Find slow database queries (> 1 second) and print with timestamps
grep "Query_time" /var/log/mysql/slow.log | \
  awk -F'Query_time: ' '{print $2}' | \
  awk '{if ($1 > 1.0) print $0}'
```

## Practical Log Mining Patterns

### Finding DDoS / Brute Force Attempts

```bash
# IPs with more than 100 failed SSH login attempts
grep "Failed password" /var/log/auth.log | \
  awk '{print $11}' | \
  sort | uniq -c | sort -rn | \
  awk '$1 > 100 {print $0}'

# HTTP clients making more than 1000 requests in the log
awk '{print $1}' /var/log/nginx/access.log | \
  sort | uniq -c | sort -rn | \
  awk '$1 > 1000 {print $2, $1, "requests"}'
```

### Finding the Most Error-Prone Endpoints

```bash
# Top 10 URLs returning 5xx errors
awk '$9 ~ /^5/ {print $7}' /var/log/nginx/access.log | \
  sort | uniq -c | sort -rn | head -10
```

### Monitoring Error Rates Over Time

```bash
# Count 5xx errors per minute
grep '" 5[0-9][0-9] ' /var/log/nginx/access.log | \
  awk '{print substr($4, 2, 17)}' | \
  sed 's/:[0-9][0-9]$//' | \
  sort | uniq -c
```

### Extracting Application Errors

```bash
# Get unique error messages from application logs (strip timestamps/request IDs)
grep -i "ERROR\|FATAL\|Exception" /var/log/app/application.log | \
  awk '{$1=$2=$3=""; print $0}' | \
  sort -u | head -20

# Count occurrences of each error type
grep "ERROR" /var/log/app/application.log | \
  awk '{print $5}' | sort | uniq -c | sort -rn
```

### Memory and OOM Analysis

```bash
# Find Out of Memory killer events
grep "Out of memory\|oom_kill" /var/log/syslog | \
  awk '{print $1, $2, $3, $0}' | tail -20

# Which processes got OOM killed
grep "Killed process" /var/log/kern.log | \
  awk '{print $NF}' | sort | uniq -c | sort -rn
```

## Building Reusable Log Analysis Scripts

Encapsulate common patterns in scripts:

```bash
#!/bin/bash
# nginx-summary.sh - quick nginx log summary

LOGFILE="${1:-/var/log/nginx/access.log}"

echo "=== Traffic Summary for $LOGFILE ==="
echo ""

echo "--- Total Requests ---"
wc -l < "$LOGFILE"

echo ""
echo "--- Status Code Distribution ---"
awk '{print $9}' "$LOGFILE" | sort | uniq -c | sort -rn

echo ""
echo "--- Top 10 IPs ---"
awk '{print $1}' "$LOGFILE" | sort | uniq -c | sort -rn | head -10

echo ""
echo "--- Top 10 URLs ---"
awk '{print $7}' "$LOGFILE" | sort | uniq -c | sort -rn | head -10

echo ""
echo "--- Top 10 User Agents ---"
awk -F'"' '{print $6}' "$LOGFILE" | sort | uniq -c | sort -rn | head -10
```

```bash
chmod +x nginx-summary.sh
./nginx-summary.sh /var/log/nginx/access.log
```

## Performance Tips for Large Log Files

```bash
# Use LC_ALL=C for faster grep on large files (disables Unicode processing)
LC_ALL=C grep "error" /var/log/nginx/access.log

# Parallel processing with xargs
ls /var/log/nginx/access.log*.gz | \
  xargs -P 4 -I{} zgrep "5[0-9][0-9]" {} | \
  wc -l

# Process only the last N lines
tail -100000 /var/log/nginx/access.log | \
  awk '{print $9}' | sort | uniq -c | sort -rn
```

Mastering these patterns means you can answer questions like "what was the error rate during the outage?", "which IP is hammering the API?", or "what were the slowest endpoints today?" without needing to load data into a log aggregation system first. The answer is usually a few piped commands away.
