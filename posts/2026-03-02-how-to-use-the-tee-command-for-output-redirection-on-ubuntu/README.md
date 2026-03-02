# How to Use the tee Command for Output Redirection on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Shell, Bash, Text Processing

Description: Learn how to use the tee command on Ubuntu to split output to multiple destinations simultaneously, write to files requiring root privileges, and build data pipelines.

---

`tee` reads from standard input and writes to both standard output and one or more files simultaneously. The name comes from the T-shaped pipe fitting in plumbing - it splits a single stream into two. On Ubuntu, tee is a small but useful tool for scripting, logging, and handling permission issues with output redirection.

## Basic Usage

```bash
# Write output to a file AND show it on screen
echo "Hello, World!" | tee output.txt

# The output appears on terminal AND gets written to output.txt

# Append to a file instead of overwriting
echo "New line" | tee -a output.txt

# Write to multiple files simultaneously
echo "Log entry" | tee file1.log file2.log file3.log
```

The most important thing about tee: it never swallows the output. Everything written to tee also appears on standard output, which means you can continue piping it to other commands.

## Writing and Piping Simultaneously

This is where tee becomes essential in pipelines - you want to save intermediate results but continue processing:

```bash
# Process a log file, save the grep output, and count matches
grep "ERROR" /var/log/syslog | tee /tmp/errors.txt | wc -l

# The errors are saved to /tmp/errors.txt
# AND the count is displayed on screen

# Longer pipeline: filter, save, then summarize
cat /var/log/nginx/access.log | \
    grep "404" | \
    tee /tmp/404-errors.txt | \
    awk '{print $1}' | \
    sort | uniq -c | sort -rn | \
    head -10
# The full 404 lines are saved to /tmp/404-errors.txt
# The terminal shows the top 10 IPs hitting 404s
```

## Solving the sudo Redirection Problem

The most common real-world use for tee on Ubuntu is writing to files that require root permissions when you're using sudo. This classic pattern fails:

```bash
# WRONG: bash handles the redirection, not sudo
# The > runs as the current user, not root
sudo echo "content" > /etc/some-system-file
# Error: permission denied
```

The shell opens the file for redirection before sudo runs echo. The shell (your user) doesn't have permission. Fix it with tee:

```bash
# RIGHT: tee runs as root and handles the write
echo "content" | sudo tee /etc/some-system-file

# Append instead of overwrite
echo "content" | sudo tee -a /etc/some-system-file

# Discard terminal output while still writing to file
echo "content" | sudo tee /etc/some-system-file > /dev/null
```

This pattern appears constantly in system administration:

```bash
# Add a kernel parameter to sysctl
echo "net.ipv4.tcp_syncookies = 1" | sudo tee /etc/sysctl.d/99-security.conf

# Configure a service
cat << 'EOF' | sudo tee /etc/nginx/conf.d/custom.conf
# Custom nginx settings
client_max_body_size 100m;
gzip on;
gzip_types text/plain text/css application/json application/javascript;
EOF

# Add to a file that root owns
echo "192.168.1.100 db.internal" | sudo tee -a /etc/hosts
```

## Logging Script Output While Displaying It

In long-running scripts, you want output both on the terminal for interactive viewing and in a log file for later analysis:

```bash
#!/bin/bash

LOG_FILE="/var/log/deployment.log"

# Log the start time
echo "=== Deployment started: $(date) ===" | tee -a "$LOG_FILE"

# Each command's output goes to terminal and log file
apt-get update 2>&1 | tee -a "$LOG_FILE"
apt-get install -y nginx 2>&1 | tee -a "$LOG_FILE"
systemctl restart nginx 2>&1 | tee -a "$LOG_FILE"

echo "=== Deployment complete: $(date) ===" | tee -a "$LOG_FILE"
```

Note the `2>&1` before `tee` - this redirects stderr to stdout first, so error messages also go through tee to the log file.

### Redirecting All Script Output Through tee

To log everything a script produces without putting `| tee` on every line, use exec redirection:

```bash
#!/bin/bash

LOG_FILE="/var/log/myscript.log"

# Redirect all stdout and stderr through tee to the log file
exec > >(tee -a "$LOG_FILE") 2>&1

echo "This goes to terminal and log"
echo "So does this"

# Errors also go to both places
ls /nonexistent 2>&1 || true

echo "Script finished"
```

The `> >(tee -a "$LOG_FILE")` syntax uses process substitution to redirect stdout through tee. The `2>&1` then sends stderr to the same place.

## Writing to Multiple Files

tee can write to multiple files at once:

```bash
# Simultaneously write to three log files
generate_report() {
    echo "System Report: $(hostname)"
    echo "Date: $(date)"
    df -h
    free -m
    uptime
}

generate_report | tee \
    /var/log/reports/daily.log \
    /var/log/reports/archive-$(date +%Y%m%d).log \
    /tmp/latest-report.txt
```

## Building Data Processing Pipelines with Checkpoints

In complex pipelines, tee saves intermediate states without breaking the flow:

```bash
#!/bin/bash

# Process a large log file through multiple stages
# Save the output at each significant stage

WORK_DIR="/tmp/log-analysis-$(date +%Y%m%d)"
mkdir -p "$WORK_DIR"

cat /var/log/nginx/access.log | \
    # Stage 1: Filter for HTTP errors, save all errors
    grep -E " [45][0-9]{2} " | tee "$WORK_DIR/all-errors.log" | \
    # Stage 2: Get just the IPs, save deduped list
    awk '{print $1}' | sort -u | tee "$WORK_DIR/error-ips.txt" | \
    # Stage 3: Look up each IP (if you had a lookup tool)
    wc -l | tee "$WORK_DIR/error-ip-count.txt"

echo "Files created:"
ls -lh "$WORK_DIR/"
```

## Using tee in Build Scripts

Build pipelines often need to capture compiler output while displaying it:

```bash
#!/bin/bash

BUILD_LOG="/var/log/builds/build-$(date +%Y%m%d-%H%M%S).log"
mkdir -p "$(dirname "$BUILD_LOG")"

echo "Build started: $(date)" | tee "$BUILD_LOG"

# Compile and save output
make 2>&1 | tee -a "$BUILD_LOG"
BUILD_RESULT=${PIPESTATUS[0]}  # Capture make's exit code, not tee's

if [ "$BUILD_RESULT" -eq 0 ]; then
    echo "Build SUCCEEDED" | tee -a "$BUILD_LOG"
else
    echo "Build FAILED with exit code $BUILD_RESULT" | tee -a "$BUILD_LOG"
    echo "Full build log: $BUILD_LOG"
    exit $BUILD_RESULT
fi
```

The `${PIPESTATUS[0]}` is important here - in a pipeline `make | tee`, `$?` gives you tee's exit code, not make's. `PIPESTATUS` is an array containing the exit codes of each command in the last pipeline.

## Monitoring System Metrics While Saving Them

```bash
#!/bin/bash

# Capture a 60-second sample of CPU usage and save it
METRICS_FILE="/var/log/metrics/cpu-$(date +%Y%m%d-%H%M).log"
mkdir -p "$(dirname "$METRICS_FILE")"

echo "Sampling CPU for 60 seconds..."
vmstat 5 12 | tee "$METRICS_FILE"
echo "Saved to: $METRICS_FILE"
```

## Handling tee Errors

When writing to a privileged file fails, tee returns a non-zero exit code:

```bash
#!/bin/bash

# Check if tee succeeded
echo "configuration line" | sudo tee /etc/system-config > /dev/null
if [ $? -ne 0 ]; then
    echo "Failed to write configuration" >&2
    exit 1
fi

# In a pipeline, use pipefail to catch tee failures
set -o pipefail

some_command | tee /var/log/output.log | grep "ERROR"
# If tee fails, the whole pipeline returns non-zero
```

## Comparing tee with Shell Redirection

```bash
# Shell redirection - shows nothing on terminal
command > file.txt          # stdout only
command > file.txt 2>&1     # stdout and stderr

# tee - shows on terminal AND writes to file
command | tee file.txt               # stdout only, shown on screen
command 2>&1 | tee file.txt          # stdout and stderr, shown on screen
command | tee file.txt > /dev/null   # written to file, nothing on screen
command | tee -a file.txt            # append mode
```

The key difference: shell redirection either shows output OR saves it. tee does both simultaneously.

tee is a small tool but it fills a specific gap: the ability to capture output without removing it from the pipeline. Once you recognize the situations where it's the right tool - especially the `sudo tee` pattern for privileged file writes and the exec redirection for script-wide logging - you'll use it regularly.
