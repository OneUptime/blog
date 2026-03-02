# How to Create Loops (for, while, until) in Bash on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Bash, Scripting, Shell, Linux

Description: Learn how to use for, while, and until loops in Bash on Ubuntu with practical examples for iterating over files, arrays, command output, and controlling loop flow.

---

Loops are the mechanism that makes scripts scale. Instead of writing the same command 100 times for 100 files, you write it once in a loop and let Bash handle the repetition. Ubuntu's Bash shell supports three loop types: `for`, `while`, and `until`, each suited for different iteration patterns.

## The for Loop

The `for` loop iterates over a list of items. It's the most common loop type in shell scripting.

### Basic for Loop

```bash
#!/bin/bash

# Iterate over a simple list
for fruit in apple banana cherry mango; do
    echo "Processing: $fruit"
done
```

The `do` and `done` keywords mark the loop body. Everything between them runs once per item.

### for Loop with a Range

```bash
#!/bin/bash

# Loop from 1 to 10
for i in $(seq 1 10); do
    echo "Count: $i"
done

# Using brace expansion (no external command needed)
for i in {1..10}; do
    echo "Count: $i"
done

# With step value (every 2)
for i in {0..20..2}; do
    echo "Even: $i"
done
```

### C-Style for Loop

Bash supports a C-style loop with an initializer, condition, and increment:

```bash
#!/bin/bash

# Traditional C-style for loop
for (( i=0; i<5; i++ )); do
    echo "Index: $i"
done

# Count down
for (( i=10; i>0; i-- )); do
    echo "Countdown: $i"
done
```

### Iterating Over Files

```bash
#!/bin/bash

# Loop over all .log files in /var/log
for logfile in /var/log/*.log; do
    # Check if file actually exists (glob might not match anything)
    [ -f "$logfile" ] || continue

    size=$(du -sh "$logfile" | cut -f1)
    echo "$logfile: $size"
done
```

### Iterating Over an Array

```bash
#!/bin/bash

servers=("web01" "web02" "db01" "cache01")

for server in "${servers[@]}"; do
    echo "Checking server: $server"
    # ping -c 1 "$server" > /dev/null && echo "  UP" || echo "  DOWN"
done

# Iterate with index
for i in "${!servers[@]}"; do
    echo "[$i] ${servers[$i]}"
done
```

### Iterating Over Command Output

```bash
#!/bin/bash

# Loop over the output of a command
for user in $(cut -d: -f1 /etc/passwd); do
    echo "User: $user"
done

# Better for filenames with spaces - use while read instead
# (covered in the while section)
```

## The while Loop

The `while` loop runs as long as a condition is true. Good for waiting on conditions, reading files line by line, or processing streams of data.

### Basic while Loop

```bash
#!/bin/bash

# Count from 1 to 5
count=1
while [ $count -le 5 ]; do
    echo "Count: $count"
    (( count++ ))
done
```

### Reading a File Line by Line

This is the right way to process file contents in a loop - it handles spaces, tabs, and special characters properly:

```bash
#!/bin/bash

# Process each line of a file
while IFS= read -r line; do
    # $line contains the full line including spaces
    echo "Line: $line"
done < /etc/hosts

# With a variable file path
input_file="/var/log/syslog"
while IFS= read -r line; do
    # Process only lines containing ERROR
    if [[ "$line" == *"ERROR"* ]]; then
        echo "Found error: $line"
    fi
done < "$input_file"
```

The `IFS=` clears the Internal Field Separator temporarily, and `-r` prevents backslash interpretation - both are needed for robust line reading.

### Reading from Command Output

```bash
#!/bin/bash

# Read lines from command output
while IFS= read -r process; do
    echo "High-CPU process: $process"
done < <(ps aux --sort=-%cpu | head -6 | tail -5)

# The < <(...) syntax is process substitution
# It works like a pipe but preserves the loop's variable scope
```

### Waiting for a Condition

```bash
#!/bin/bash

# Wait for a service to become available
max_attempts=30
attempt=0

while ! curl -s http://localhost:8080/health > /dev/null; do
    attempt=$(( attempt + 1 ))

    if [ $attempt -ge $max_attempts ]; then
        echo "Service did not start after $max_attempts attempts"
        exit 1
    fi

    echo "Waiting for service... (attempt $attempt/$max_attempts)"
    sleep 2
done

echo "Service is up!"
```

### Infinite Loops with break

```bash
#!/bin/bash

# Monitor disk space - check every minute
while true; do
    usage=$(df / | awk 'NR==2 {print $5}' | tr -d '%')

    if [ "$usage" -gt 90 ]; then
        echo "ALERT: Disk usage at ${usage}%"
        # Could send a notification here
    fi

    echo "$(date): Disk usage: ${usage}%"
    sleep 60
done
```

## The until Loop

`until` is the inverse of `while` - it runs until a condition becomes true (keeps running while the condition is false):

```bash
#!/bin/bash

# Keep trying until success
attempt=0

until ping -c 1 8.8.8.8 > /dev/null 2>&1; do
    attempt=$(( attempt + 1 ))
    echo "Network not available, attempt $attempt"
    sleep 5
done

echo "Network is up after $attempt attempts"
```

The `until` loop is less common than `while`, but it reads naturally for "keep doing X until Y happens" scenarios.

## Loop Control: break and continue

### break - Exit the Loop Early

```bash
#!/bin/bash

# Find the first file over 100MB in a directory
for file in /var/log/*; do
    [ -f "$file" ] || continue

    size=$(stat -c %s "$file")  # Size in bytes
    if [ "$size" -gt 104857600 ]; then  # 100MB = 100*1024*1024
        echo "Found large file: $file ($size bytes)"
        break  # Stop looking after the first match
    fi
done
```

### continue - Skip to Next Iteration

```bash
#!/bin/bash

# Process users, skipping system accounts (UID < 1000)
while IFS=: read -r username _ uid _; do
    # Skip system accounts
    if [ "$uid" -lt 1000 ]; then
        continue
    fi

    echo "Regular user: $username (UID: $uid)"
done < /etc/passwd
```

### Breaking Out of Nested Loops

```bash
#!/bin/bash

# break N exits N levels of loops
for i in {1..3}; do
    for j in {1..3}; do
        if [ $i -eq 2 ] && [ $j -eq 2 ]; then
            echo "Breaking both loops at i=$i, j=$j"
            break 2  # Exit both the inner and outer loop
        fi
        echo "i=$i j=$j"
    done
done
echo "After loops"
```

## Looping Over CSV Data

```bash
#!/bin/bash
# Process a CSV file (no header row assumed)

csv_file="/tmp/servers.csv"

# Create sample CSV
cat > "$csv_file" << 'EOF'
web01,192.168.1.10,80
web02,192.168.1.11,80
db01,192.168.1.20,5432
EOF

while IFS=',' read -r hostname ip port; do
    echo "Host: $hostname | IP: $ip | Port: $port"
done < "$csv_file"
```

## Parallel Loop Execution

For time-consuming loops, run iterations in the background:

```bash
#!/bin/bash

servers=("server1" "server2" "server3" "server4")
pids=()

for server in "${servers[@]}"; do
    # Run each check in background
    (
        if ping -c 1 -W 2 "$server" > /dev/null 2>&1; then
            echo "$server: UP"
        else
            echo "$server: DOWN"
        fi
    ) &

    # Store the PID of the background job
    pids+=($!)
done

# Wait for all background jobs to finish
for pid in "${pids[@]}"; do
    wait "$pid"
done

echo "All checks complete"
```

This runs all server checks simultaneously instead of sequentially, which is much faster when you have many servers.

## Practical Example: Batch File Renaming

```bash
#!/bin/bash
# Rename all .jpeg files to .jpg in current directory

count=0

for file in *.jpeg; do
    # Skip if no .jpeg files exist
    [ -f "$file" ] || { echo "No .jpeg files found"; exit 0; }

    # Build new filename
    new_name="${file%.jpeg}.jpg"

    mv "$file" "$new_name"
    echo "Renamed: $file -> $new_name"
    (( count++ ))
done

echo "Renamed $count files"
```

## Practical Example: Rotating Log Files

```bash
#!/bin/bash
# Keep only the last 7 days of log files

log_dir="/var/log/myapp"
max_days=7
deleted=0

for logfile in "$log_dir"/*.log; do
    [ -f "$logfile" ] || continue

    # Get file age in days
    age=$(( ( $(date +%s) - $(stat -c %Y "$logfile") ) / 86400 ))

    if [ "$age" -gt "$max_days" ]; then
        rm "$logfile"
        echo "Deleted old log: $logfile (${age} days old)"
        (( deleted++ ))
    fi
done

echo "Cleanup complete. Deleted $deleted files older than $max_days days."
```

Loops are fundamental to writing useful scripts. Combining `for`, `while`, and `until` with `break` and `continue` gives you precise control over iteration for any scenario you'll encounter.
