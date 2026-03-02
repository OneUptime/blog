# How to Use GNU Parallel for Job Execution on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Automation, Shell, Performance

Description: Learn how to use GNU Parallel on Ubuntu to run shell commands in parallel, speed up batch processing tasks, and utilize multiple CPU cores efficiently.

---

Many shell scripting tasks are embarrassingly parallel - processing a list of files, running the same command against multiple hosts, converting images, or making API calls. By default, shell loops run one task at a time. GNU Parallel lets you run multiple jobs simultaneously with minimal changes to your existing commands.

## Installing GNU Parallel

```bash
# Install from Ubuntu repositories
sudo apt update
sudo apt install parallel -y

# Verify installation
parallel --version
# GNU parallel 20XXXXXX

# On first run, you may see a citation notice
# Suppress it by running:
parallel --citation
# Type: will cite
```

## Basic Usage

The fundamental concept: `parallel` takes a command template and a list of arguments, then runs the command once per argument - in parallel.

```bash
# Run a command for each item in a list
parallel echo ::: apple banana cherry
# Output (order may vary):
# apple
# banana
# cherry

# The {} is replaced by the input item
parallel "echo Processing: {}" ::: file1.txt file2.txt file3.txt

# Limit to 4 parallel jobs
parallel -j 4 "echo {}" ::: item1 item2 item3 item4 item5 item6
```

## Reading Input from Files and stdin

```bash
# Read arguments from a file (one per line)
ls /data/*.csv > /tmp/file_list.txt
parallel -a /tmp/file_list.txt "gzip {}"

# Read from stdin
find /data -name "*.log" | parallel gzip

# Use --null for null-delimited input (safe for filenames with spaces)
find /data -name "*.log" -print0 | parallel -0 gzip
```

## Replacing Loops with parallel

Before:

```bash
# Serial loop - slow
for host in server1 server2 server3 server4; do
    ssh "$host" 'df -h'
done
```

After:

```bash
# Parallel - all SSH connections run simultaneously
parallel ssh {} 'df -h' ::: server1 server2 server3 server4
```

## Practical Examples

### Parallel Image Processing

```bash
# Install ImageMagick
sudo apt install imagemagick -y

# Convert all PNGs to JPG in parallel using all CPU cores
find /images -name "*.png" | parallel convert {} {.}.jpg

# Resize images to 800px wide in parallel
parallel -j 8 "convert {} -resize 800x {.}_thumb.jpg" ::: /images/*.png
```

### Parallel File Compression

```bash
# Compress multiple large log files simultaneously
find /var/log -name "*.log" -size +10M | parallel gzip

# Compare: parallel vs serial
time find /var/archive -name "*.csv" | parallel -j 8 gzip
time find /var/archive -name "*.csv" -exec gzip {} \;
```

### Parallel API Calls

```bash
# Make API calls for a list of IDs in parallel
cat user_ids.txt | parallel "curl -s https://api.example.com/users/{} >> /tmp/responses.json"

# With rate limiting: max 5 concurrent connections
cat user_ids.txt | parallel -j 5 "curl -s https://api.example.com/users/{}"
```

### Parallel SSH Commands

```bash
# Run a command on multiple servers simultaneously
cat servers.txt | parallel "ssh {} 'sudo apt update && sudo apt upgrade -y'"

# Collect output with server hostname as prefix
parallel --tag ssh {} 'uptime' ::: server1 server2 server3
# Output:
# server1    15:00:00 up 10 days, 3:30, 1 user
# server2    15:00:01 up 5 days, 0:15, 0 users
# server3    15:00:00 up 22 days, 8:45, 2 users
```

## Input Replacement Strings

Parallel has built-in variables for common filename manipulations.

```bash
# {} - the full input argument
# {.} - input without extension
# {/} - basename (filename without directory)
# {//} - directory of the input
# {/.} - basename without extension

parallel echo "Full: {} | No ext: {.} | Base: {/} | Dir: {//} | Base no ext: {/.}" \
    ::: /data/logs/access.log /data/logs/error.log

# Practical: move processed files to a 'done' subdirectory
parallel "process_script {} && mv {} {//}/done/{/}" ::: /data/input/*.csv
```

## Combining Multiple Input Sources

```bash
# Two input sources - generates all combinations (like nested loops)
# ::: separates different input sources
parallel echo {1} {2} ::: a b c ::: 1 2 3
# a 1
# a 2
# a 3
# b 1
# ...

# Combine with --link to pair inputs (first item of each with first, etc.)
parallel --link echo {1} {2} ::: a b c ::: 1 2 3
# a 1
# b 2
# c 3
```

## Controlling Job Count and Resources

```bash
# Use all CPU cores
parallel -j +0 "process {}" ::: items...

# Use 50% of CPU cores
parallel -j 50% "process {}" ::: items...

# Use a specific number
parallel -j 4 "process {}" ::: items...

# Run at most N jobs simultaneously across multiple machines
parallel -S server1,server2,server3 -j 2 "process {}" ::: items...
```

## Progress and Logging

```bash
# Show a progress bar
parallel --progress "sleep {}" ::: 1 2 3 4 5

# Log results: tag each line of output with the job's input
parallel --tag "echo {}; sleep 1" ::: alpha beta gamma

# Show jobs that are running
parallel --joblog /tmp/parallel-jobs.log "process {}" ::: items...

# View the job log
cat /tmp/parallel-jobs.log
# Seq, Host, Starttime, JobRuntime, Send, Receive, Exitval, Signal, Command
```

## Handling Failures

```bash
# By default, parallel continues even if jobs fail
# Exit code reflects whether any jobs failed

# Resume from a job log (re-runs failed jobs)
parallel --joblog /tmp/jobs.log "process {}" ::: items...

# Re-run only failed jobs
parallel --resume-failed --joblog /tmp/jobs.log "process {}" ::: items...

# Stop all jobs if one fails
parallel --halt soon,fail=1 "process {}" ::: items...

# Stop at first failure immediately
parallel --halt now,fail=1 "process {}" ::: items...
```

## Piping Between parallel Jobs

```bash
# Parallel pipeline: parallel decompress, then parallel process
find /data -name "*.gz" | \
    parallel -j 4 "zcat {}" | \
    parallel -j 8 "process_line {}"

# More realistic: decompress files in parallel then count lines
find /data -name "*.gz" | parallel "zcat {} | wc -l"
```

## Real-World Script: Parallel Log Analysis

```bash
#!/bin/bash
# Analyze Apache/Nginx logs in parallel across multiple servers

SERVERS=(web01 web02 web03 web04)
DATE=$(date -d yesterday +%Y-%m-%d)
OUTPUT_DIR="/tmp/log-analysis-${DATE}"
mkdir -p "$OUTPUT_DIR"

# Count requests per hour from each server's access log in parallel
parallel \
    --tag \
    --results "$OUTPUT_DIR" \
    ssh {} "grep '${DATE}' /var/log/nginx/access.log | awk '{print \$4}' | cut -d: -f2 | sort | uniq -c" \
    ::: "${SERVERS[@]}"

# Combine results
echo "Request counts by hour on $DATE:"
cat "${OUTPUT_DIR}"/*/stdout | sort -k2 -n | awk '{sum[$2]+=$1} END {for (h in sum) print h, sum[h]}' | sort -n
```

GNU Parallel pairs well with any workload that involves repeating the same operation across many inputs. Even a simple `find | parallel` instead of `find -exec` will make better use of multiple cores and reduce wall-clock time significantly.
