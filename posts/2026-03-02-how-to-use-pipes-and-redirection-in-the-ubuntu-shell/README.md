# How to Use Pipes and Redirection in the Ubuntu Shell

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Shell, Bash, Scripting

Description: Master pipes and I/O redirection in Ubuntu's shell, covering stdin/stdout/stderr, pipes, process substitution, here strings, and building efficient command pipelines.

---

Pipes and redirection are the foundation of the Unix philosophy: build small tools that do one thing well, then compose them. Instead of writing a monolithic program that reads files, filters lines, counts matches, and formats output, you chain together `cat`, `grep`, `wc`, and `printf`. Each tool reads from standard input and writes to standard output, and the shell wires them together.

Understanding this plumbing is what makes the command line powerful rather than just an alternative to clicking through GUIs.

## The Three Standard Streams

Every process has three file descriptors open by default:

- **stdin (0)** - standard input - where the program reads data from
- **stdout (1)** - standard output - where normal output goes
- **stderr (2)** - standard error - where error messages go

By default, stdin reads from the keyboard, and stdout/stderr write to the terminal. Redirection and pipes change these connections.

## Output Redirection

### Redirect stdout to a File

```bash
# Overwrite: create or replace the file
ls -la > file-list.txt

# Append: add to the file without removing existing content
echo "$(date): Job complete" >> /var/log/job.log

# Redirect stdout from a long command
find / -name "*.conf" 2>/dev/null > conf-files.txt
```

The `>` operator is destructive - if the file exists, it's overwritten immediately, even before the command runs. This means `cat file.txt > file.txt` will empty the file.

### Redirect stderr to a File

```bash
# Redirect error messages only (not normal output)
find / -name "*.conf" 2> errors.txt

# Redirect errors to /dev/null (discard them)
find / -name "*.conf" 2>/dev/null

# Suppress all output (both stdout and stderr)
command > /dev/null 2>&1
```

### Redirect Both stdout and stderr

```bash
# Redirect both to the same file
command > output.log 2>&1

# Order matters: 2>&1 must come AFTER > output.log
# This WRONG version sends stderr to the original stdout, not the file:
command 2>&1 > output.log   # Wrong!

# Bash 4+ shorthand (equivalent to > file 2>&1)
command &> output.log

# Append both
command >> output.log 2>&1
```

The `2>&1` syntax means "redirect file descriptor 2 (stderr) to wherever file descriptor 1 (stdout) currently points." Order matters because the shell processes redirections left to right.

### Redirect to /dev/null

```bash
# Discard stdout (suppress normal output)
noisy_command > /dev/null

# Discard stderr (suppress error messages)
command 2>/dev/null

# Discard all output
command > /dev/null 2>&1

# Keep stdout, discard stderr
command 2>/dev/null

# Keep stderr, discard stdout
command > /dev/null
```

## Input Redirection

### Redirect stdin from a File

```bash
# Command reads from file instead of keyboard
sort < unsorted.txt

# Equivalent to (but more efficient for some commands):
cat unsorted.txt | sort

# Feed a file into a command expecting interactive input
mysql -u root -p mydb < backup.sql
```

### Here Strings

Pass a string directly as stdin without creating a file:

```bash
# Feed a string to a command
grep "pattern" <<< "This is a string to search in"

# Useful for reading a variable as stdin
data="foo:bar:baz"
IFS=: read -r a b c <<< "$data"
echo "a=$a b=$b c=$c"

# Pass a number to bc for arithmetic
result=$(bc <<< "2^10")
echo "2^10 = $result"  # 1024
```

### Here Documents

Multi-line input to a command:

```bash
# Pass multiple lines to a command
cat << EOF
Line one
Line two
Line three
EOF

# Write to a file
cat > /etc/myapp.conf << EOF
host = localhost
port = 8080
debug = false
EOF
```

## Pipes

A pipe `|` connects the stdout of one command to the stdin of the next:

```bash
# Basic pipe
command1 | command2

# Multiple pipes
command1 | command2 | command3 | command4
```

### Building Pipelines

```bash
# Count log lines containing "ERROR"
grep "ERROR" /var/log/syslog | wc -l

# List top 10 disk-consuming files
du -sh /var/log/* | sort -rh | head -10

# Find all running Java processes
ps aux | grep "[j]ava" | awk '{print $11}'

# Count unique IP addresses in nginx logs
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20

# Find the most common words in a file
tr '[:upper:]' '[:lower:]' < document.txt | \
    tr -cs '[:alpha:]' '\n' | \
    sort | uniq -c | sort -rn | head -20
```

### Pipeline Exit Codes

In a pipeline, the default exit code is the last command's exit code:

```bash
# grep fails (no match), but wc -l succeeds - exit code is 0
grep "nonexistent" /var/log/syslog | wc -l
echo $?  # 0 (wc -l's exit code)

# To get grep's exit code (the actual error), use pipefail
set -o pipefail
grep "nonexistent" /var/log/syslog | wc -l
echo $?  # 1 (grep's exit code)

# Check all exit codes with PIPESTATUS array
command1 | command2 | command3
echo "${PIPESTATUS[@]}"   # Exit codes of all three commands
```

`PIPESTATUS` is available only immediately after the pipeline, before the next command runs.

## Process Substitution

Process substitution `<()` and `>()` treats command output as a file:

```bash
# Compare two command outputs as if they were files
diff <(ls dir1/) <(ls dir2/)

# Use command output where a file is expected
sort <(grep "ERROR" app.log) <(grep "ERROR" system.log)

# Read from multiple sources simultaneously
while IFS= read -r line; do
    echo "Processing: $line"
done < <(find /etc -name "*.conf" 2>/dev/null)

# Write to process substitution (less common)
command > >(tee file.log | grep "ERROR")
```

Process substitution is particularly useful when a command needs a filename argument rather than reading from stdin.

## Named Pipes (FIFOs)

For more complex producer/consumer patterns, named pipes create persistent pipe files:

```bash
# Create a named pipe
mkfifo /tmp/mypipe

# Producer: writes to the pipe in background
producer_command > /tmp/mypipe &

# Consumer: reads from the pipe
consumer_command < /tmp/mypipe

# Clean up
rm /tmp/mypipe
```

## Combining Redirections in Scripts

```bash
#!/bin/bash

LOG="/var/log/app.log"

# Redirect all script output to log while keeping terminal output
exec > >(tee -a "$LOG") 2>&1

echo "Script started"
echo "Working..."

# This pattern is useful for deployment/maintenance scripts
# Everything the script does is logged
apt-get update
apt-get install -y nginx
systemctl restart nginx

echo "Script complete"
```

## Common Pipeline Patterns

### Filter, Count, Report

```bash
# How many unique users logged in today?
last | grep "$(date +%a)" | awk '{print $1}' | sort -u | wc -l

# How many HTTP 500 errors in the last hour?
awk -v dt="$(date -d '1 hour ago' '+%d/%b/%Y:%H')" '$4 > "["dt' \
    /var/log/nginx/access.log | grep '" 5' | wc -l
```

### Extract and Transform

```bash
# Get all IP addresses from auth log
grep "Accepted" /var/log/auth.log | \
    grep -oE "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" | \
    sort -u

# Extract email addresses from a file
grep -oE "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}" emails.txt | \
    sort -u
```

### Process and Write Results

```bash
# Analyze and save results
{
    echo "=== System Report: $(date) ==="
    echo ""
    echo "Disk Usage:"
    df -h

    echo ""
    echo "Memory:"
    free -h

    echo ""
    echo "Load Average:"
    uptime
} | tee /var/log/system-report.txt | mail -s "Daily Report" ops@example.com
```

The `{ ... }` groups commands so their combined output can be piped or redirected as a unit.

### Parallel Processing

```bash
# Run multiple operations in parallel and collect results
{
    (
        echo "=== Disk Usage ===" &&
        df -h
    ) &

    (
        echo "=== Memory ===" &&
        free -h
    ) &

    (
        echo "=== Load ===" &&
        uptime
    ) &

    wait  # Wait for all background jobs to complete
} > /tmp/system-info.txt 2>&1
```

## Redirecting Within Functions

```bash
#!/bin/bash

# Function that redirects its output to a log
logged_command() {
    local log_file="$1"
    shift

    # All output from the remaining arguments goes to log file AND stdout
    "$@" 2>&1 | tee -a "$log_file"
}

# Usage
logged_command /var/log/deploy.log apt-get install -y nginx
logged_command /var/log/deploy.log systemctl restart nginx
```

## The /dev/null and /dev/zero Devices

```bash
# /dev/null: reads return EOF, writes are discarded
cat /dev/null        # Empty output
echo "data" > /dev/null  # Discard

# /dev/zero: reads return infinite null bytes
# Useful for creating test files of a specific size
dd if=/dev/zero of=/tmp/testfile bs=1M count=100  # Create 100MB file

# /dev/urandom: reads return random bytes
# Useful for generating random data
head -c 32 /dev/urandom | base64  # Generate random 32-byte base64 string
```

Understanding how data flows through pipes and redirections - and how the shell wires together stdin, stdout, and stderr between commands - is what lets you solve data processing problems quickly without writing custom programs. A few well-chosen commands connected with pipes often handles what would otherwise require dozens of lines of code.
