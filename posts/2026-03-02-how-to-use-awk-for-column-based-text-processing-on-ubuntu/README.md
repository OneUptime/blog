# How to Use awk for Column-Based Text Processing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Bash, awk, Text Processing, Linux

Description: Learn how to use awk for column extraction, filtering, arithmetic, and report generation from structured text data on Ubuntu with practical examples.

---

`awk` is a programming language built specifically for processing structured text data - files where each line has fields separated by a delimiter. It's named after its creators (Aho, Weinberger, and Kernighan) and is one of the oldest and most useful tools in Unix. On Ubuntu, the installed version is `gawk` (GNU awk), which adds several useful extensions over the POSIX standard.

Where `sed` is best for line-by-line text transformation, `awk` shines when your data has columns. Think CSV files, `ps` output, log entries with consistent fields, `/etc/passwd`, or anything with a regular structure.

## Basic Structure

An awk program consists of pattern-action pairs:

```text
awk 'pattern { action }' input_file
```

If a line matches the pattern, the action executes. If you omit the pattern, the action runs on every line. If you omit the action, matching lines get printed.

```bash
# Print every line (default action is print)
awk '{ print }' /etc/passwd

# Print only lines containing "bash"
awk '/bash/' /etc/passwd

# Print field 1 of every line (space/tab delimited by default)
awk '{ print $1 }' /etc/passwd
```

## Field Variables

awk automatically splits each line into fields:

- `$0` - the entire line
- `$1` - first field
- `$2` - second field
- `$NF` - last field (NF = number of fields)
- `$(NF-1)` - second to last field
- `NF` - number of fields in the current line
- `NR` - current line number (record number)
- `FNR` - line number in current file (when processing multiple files)

```bash
# Print columns 1 and 3 from /etc/passwd (colon-delimited)
awk -F: '{ print $1, $3 }' /etc/passwd

# Print last field of each line
awk '{ print $NF }' file.txt

# Print the number of fields on each line
awk '{ print NR": "$0" (fields: "NF")" }' /etc/hosts
```

## Setting the Field Separator

By default, awk splits on whitespace. Change it with `-F`:

```bash
# Colon separator (for /etc/passwd, /etc/fstab)
awk -F: '{ print $1 }' /etc/passwd

# Comma separator (for CSV files)
awk -F',' '{ print $1 }' data.csv

# Pipe separator
awk -F'|' '{ print $2 }' file.txt

# Tab separator
awk -F'\t' '{ print $1 }' tab-delimited.tsv

# Multiple character separator (regex)
awk -F'[,;]' '{ print $1 }' file.txt
```

Set it inside the program with `FS`:
```bash
awk 'BEGIN { FS=":" } { print $1 }' /etc/passwd
```

## BEGIN and END Blocks

Special patterns that run before processing starts and after it ends:

```bash
#!/bin/bash

# Print a header, process data, print a summary
awk -F: '
BEGIN {
    print "Username\tUID\tHome Directory"
    print "--------\t---\t--------------"
    count = 0
}
$3 >= 1000 {
    print $1"\t"$3"\t"$6
    count++
}
END {
    print "\nTotal regular users: " count
}
' /etc/passwd
```

## Pattern Matching

```bash
# Print lines where field 3 is greater than 1000
awk -F: '$3 >= 1000 { print $1 }' /etc/passwd

# Print lines where the first field matches a pattern
awk -F: '$1 ~ /^sys/' /etc/passwd

# Print lines where the first field does NOT match
awk -F: '$1 !~ /^sys/' /etc/passwd

# Print lines between two patterns
awk '/START/,/END/ { print }' file.txt

# Multiple conditions
awk -F: '$3 >= 1000 && $7 == "/bin/bash" { print $1 }' /etc/passwd
```

## Arithmetic Operations

awk performs floating-point arithmetic natively:

```bash
#!/bin/bash

# Sum a column of numbers
echo "Values: 10 20 30 40 50"
seq 5 | awk '{ sum += $1 } END { print "Sum:", sum }'

# Calculate average
seq 10 | awk '{ sum += $1; count++ } END { print "Average:", sum/count }'

# Process disk usage - find total used space
df -h | awk 'NR > 1 { sum += $3 } END { print "Total used: " sum "G" }'

# Process /proc/meminfo - memory in MB
awk '/MemTotal|MemFree|MemAvailable/ {
    val = $2 / 1024
    printf "%s: %.1f MB\n", $1, val
}' /proc/meminfo
```

## Printf for Formatted Output

awk's `printf` works like C's printf for formatted output:

```bash
#!/bin/bash

# Formatted table from /etc/passwd
awk -F: '$3 >= 1000 {
    printf "%-15s %5d  %-25s  %s\n", $1, $3, $6, $7
}' /etc/passwd

# Column headers
awk -F: '
BEGIN {
    printf "%-15s %5s  %-25s  %s\n", "USERNAME", "UID", "HOME", "SHELL"
    printf "%-15s %5s  %-25s  %s\n", "--------", "---", "----", "-----"
}
$3 >= 1000 {
    printf "%-15s %5d  %-25s  %s\n", $1, $3, $6, $7
}
' /etc/passwd
```

## Associative Arrays (Hash Maps)

awk has built-in hash maps using arrays with string keys:

```bash
#!/bin/bash

# Count occurrences of each value
# Count HTTP status codes in nginx log
awk '{ count[$9]++ } END {
    for (code in count)
        print code, count[code]
}' /var/log/nginx/access.log | sort -n

# Count requests by IP address
awk '{ ip_count[$1]++ }
END {
    for (ip in ip_count)
        printf "%7d  %s\n", ip_count[ip], ip
}' /var/log/nginx/access.log | sort -rn | head -10

# Group disk usage by filesystem type
df -T | awk 'NR>1 {
    type[$2] += $4
}
END {
    for (t in type)
        printf "%-15s %d KB\n", t, type[t]
}'
```

## String Functions

awk has built-in string manipulation functions:

```bash
# length(string) - string length
echo "hello world" | awk '{ print length($1) }'  # 5

# substr(string, start, length) - substring
echo "hello world" | awk '{ print substr($0, 7) }'    # world
echo "hello world" | awk '{ print substr($0, 1, 5) }'  # hello

# index(string, target) - find position of substring
echo "hello world" | awk '{ print index($0, "world") }'  # 7

# split(string, array, separator) - split string into array
echo "a:b:c:d" | awk '{ n = split($0, parts, ":"); for (i=1;i<=n;i++) print parts[i] }'

# sub(pattern, replacement) - replace first match
echo "foo bar foo" | awk '{ sub(/foo/, "baz"); print }'  # baz bar foo

# gsub(pattern, replacement) - replace all matches
echo "foo bar foo" | awk '{ gsub(/foo/, "baz"); print }'  # baz bar baz

# toupper / tolower
echo "Hello World" | awk '{ print toupper($0) }'  # HELLO WORLD
```

## Practical Examples

### Parsing ps Output to Find High-CPU Processes

```bash
#!/bin/bash

# Find processes using more than 10% CPU
ps aux | awk '
NR == 1 { next }  # Skip header
$3 > 10.0 {
    printf "%-20s %s%%  PID:%s\n", $11, $3, $2
}' | sort -k2 -rn
```

### Processing Apache/nginx Access Logs

```bash
#!/bin/bash

# Analyze access log for a specific date
analyze_log() {
    local log_file="$1"
    local date_pattern="${2:-$(date +%d/%b/%Y)}"

    awk -v date="$date_pattern" '
    $0 ~ date {
        # Extract status code and bytes
        status = $9
        bytes = $10

        # Count by status
        status_count[status]++

        # Sum bytes transferred
        total_bytes += (bytes ~ /^[0-9]+$/) ? bytes : 0

        # Count requests
        total++
    }
    END {
        print "Date:", date
        print "Total requests:", total
        printf "Total data: %.2f MB\n", total_bytes/1024/1024
        print "\nStatus codes:"
        for (s in status_count)
            printf "  %s: %d\n", s, status_count[s]
    }
    ' "$log_file"
}

analyze_log /var/log/nginx/access.log
```

### Generating a System Resource Report

```bash
#!/bin/bash

# Create a report of processes consuming resources
echo "=== Top Processes by Memory ==="
ps aux --sort=-%mem | awk '
NR == 1 { print }  # Keep header
NR > 1 && NR <= 11 { print }  # Print top 10
'

echo ""
echo "=== Disk Space by Partition ==="
df -h | awk '
NR == 1 { print }
NR > 1 {
    # Extract percentage as a number
    pct = $5
    gsub(/%/, "", pct)

    if (pct >= 90)
        status = "CRITICAL"
    else if (pct >= 75)
        status = "WARNING"
    else
        status = "OK"

    printf "%-20s %4s used  [%s]\n", $6, $5, status
}'
```

### Calculating File Statistics

```bash
#!/bin/bash

# Summarize file sizes by extension in a directory
find /var/www -type f | awk -F. '{
    ext = $NF
    cmd = "stat -c %s " FILENAME
    # Better approach: use ls output
}'

# Better way - process find output piped through stat
find /var/www -type f -printf "%s %f\n" | awk '{
    size = $1
    file = $2
    # Get extension
    n = split(file, parts, ".")
    ext = parts[n]

    ext_count[ext]++
    ext_size[ext] += size
}
END {
    printf "%-10s %8s %15s\n", "Extension", "Files", "Total Size"
    for (ext in ext_count)
        printf "%-10s %8d %15.1f KB\n", ext, ext_count[ext], ext_size[ext]/1024
}' | sort -k3 -rn
```

awk is one of those tools where knowing a handful of patterns - field extraction, pattern matching, arrays, arithmetic, and formatted output - covers 90% of real-world use cases. The investment in learning it pays off every time you need to process structured text without writing a Python script.
