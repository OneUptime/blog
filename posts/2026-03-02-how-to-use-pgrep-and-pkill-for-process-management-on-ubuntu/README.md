# How to Use pgrep and pkill for Process Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Process Management, Shell, Linux Administration

Description: Learn how to use pgrep and pkill on Ubuntu for efficient process searching and signal sending with pattern matching, user filtering, and advanced selection options.

---

While `ps | grep` and `kill` work, `pgrep` and `pkill` are more precise tools designed specifically for finding and signaling processes. They support regex matching, user filtering, and parent-child relationships in ways that make process management scripts cleaner and less error-prone.

## pgrep - Finding Processes by Pattern

`pgrep` returns the PIDs of processes matching a given pattern. Unlike `ps | grep`, it matches against the process name by default and does not match itself (no need for the `grep '[p]attern'` trick).

### Basic pgrep Usage

```bash
# Find PIDs of all nginx processes
pgrep nginx

# Example output:
# 1234
# 1235
# 1236

# Show both PID and process name
pgrep -l nginx

# Example output:
# 1234 nginx
# 1235 nginx: master process /usr/sbin/nginx
# 1236 nginx: worker process

# Show full command line
pgrep -a nginx

# Example output:
# 1234 /usr/sbin/nginx -g daemon on; master_process on;
# 1235 nginx: master process /usr/sbin/nginx -g daemon on; master_process on;
# 1236 nginx: worker process
```

### Matching Against Full Command Line

By default, pgrep matches only against the process name (the first 15 characters of argv[0]). Use `-f` to match against the full command line:

```bash
# Match processes by name only (default)
pgrep python3
# Returns all python3 processes regardless of arguments

# Match against full command line
pgrep -f "python3 /home/user/script-a.py"
# Returns only the specific script

# Very useful when multiple instances of an interpreter are running
pgrep -f "gunicorn myapp:app"
pgrep -f "celery worker --app=myapp"
pgrep -f "node /var/www/api/server.js"
```

### Filtering by User

```bash
# Find processes owned by a specific user
pgrep -u www-data

# Find a specific process owned by a user
pgrep -u www-data php-fpm

# Find processes owned by multiple users
pgrep -u www-data,nginx

# Find processes NOT owned by a user (negation)
pgrep -U root nginx  # nginx processes not owned by root
```

### Filtering by Parent PID

```bash
# Find all children of a specific process
pgrep -P 1234

# Find children of multiple parents
pgrep -P 1234,5678

# Find children of the current shell
pgrep -P $$

# Find grandchildren (children of children)
pgrep -P $(pgrep -P 1234)
```

### Additional pgrep Options

```bash
# Return the count of matching processes
pgrep -c nginx

# Match exact process name (no substring matching)
pgrep -x nginx  # matches 'nginx' but not 'nginx: worker process'

# Find processes in a specific process group
pgrep -g 5678

# Find processes with a specific terminal
pgrep -t tty1

# Only return the newest (most recently started) matching process
pgrep -n nginx

# Only return the oldest matching process
pgrep -o nginx

# Invert the match (find processes that do NOT match)
pgrep -v nginx  # Returns all PIDs except nginx processes (use carefully)
```

### Using pgrep in Scripts

The exit status of pgrep indicates whether any matching processes were found:
- `0` - At least one matching process found
- `1` - No matching processes found

```bash
# Check if a service is running
if pgrep -x nginx > /dev/null; then
    echo "nginx is running"
else
    echo "nginx is NOT running"
fi

# Get the PID of a service for further processing
NGINX_PID=$(pgrep -x -o nginx)  # Get PID of master nginx process
if [ -n "$NGINX_PID" ]; then
    echo "nginx master PID: $NGINX_PID"
    # Send SIGHUP to reload configuration
    kill -HUP "$NGINX_PID"
fi

# Wait for a process to finish
while pgrep -f "heavy-task.sh" > /dev/null; do
    echo "Still running... waiting"
    sleep 10
done
echo "heavy-task.sh has finished"
```

## pkill - Sending Signals to Matched Processes

`pkill` combines the pattern matching of `pgrep` with signal sending. It uses the same matching options as `pgrep`.

### Basic pkill Usage

```bash
# Send SIGTERM (default) to all nginx processes
pkill nginx

# Same as kill -15 on all matching processes
pkill -TERM nginx
pkill -15 nginx

# Force kill all matching processes
pkill -9 nginx
pkill -KILL nginx

# Send SIGHUP to reload configuration
pkill -HUP nginx

# Send SIGUSR1 (application-specific)
pkill -USR1 nginx
```

### Matching Full Command Line

```bash
# Kill a specific script
pkill -f "python3 /home/user/worker.py"

# Kill all gunicorn workers for a specific app
pkill -f "gunicorn myapp:app"

# Kill a specific celery queue
pkill -f "celery worker -Q high-priority"
```

### Filtering Targets

```bash
# Kill only processes owned by www-data
pkill -u www-data python3

# Kill processes belonging to a parent PID
pkill -P 1234

# Kill the newest matching process
pkill -n myapp

# Kill the oldest matching process (careful - might be the master process)
pkill -o myapp
```

### Interactive and Safe Killing

```bash
# Echo what would be killed without actually killing (dry run)
pkill --dry-run nginx

# See which processes match before killing
pgrep -la nginx
# Review the output, then:
pkill nginx

# Combine with confirmation
pgrep -la python3  # Review
read -p "Kill all python3 processes? (y/N) " confirm
[ "$confirm" = "y" ] && pkill python3
```

## Practical Examples

### Gracefully Reloading a Service

```bash
# Reload nginx without downtime
pkill -HUP -x nginx

# Or just the master process
pkill -HUP -o nginx  # Oldest (master) nginx process
```

### Killing All Processes of a Specific Application

```bash
# Kill all processes related to myapp
pkill -f "myapp"

# More specific - only the main process, not worker or helper processes
pkill -f "^/usr/local/bin/myapp$"
# The ^ and $ anchors ensure exact match

# Wait for processes to die, then confirm
pkill -f "myapp"
sleep 2
if pgrep -f "myapp" > /dev/null; then
    echo "Some processes survived, force killing"
    pkill -9 -f "myapp"
fi
```

### Monitoring and Auto-Restarting Processes

```bash
#!/bin/bash
# Simple process monitor

PROCESS_NAME="myapp"
PROCESS_CMD="/usr/local/bin/myapp --config /etc/myapp/config.yaml"
LOGFILE="/var/log/myapp-monitor.log"

while true; do
    if ! pgrep -f "$PROCESS_CMD" > /dev/null; then
        echo "[$(date)] $PROCESS_NAME not running, starting it" >> "$LOGFILE"
        $PROCESS_CMD &
        sleep 2

        if pgrep -f "$PROCESS_CMD" > /dev/null; then
            echo "[$(date)] $PROCESS_NAME started successfully (PID: $(pgrep -f "$PROCESS_CMD"))" >> "$LOGFILE"
        else
            echo "[$(date)] FAILED to start $PROCESS_NAME" >> "$LOGFILE"
        fi
    fi
    sleep 30
done
```

### Cleanup Script After Service Stop

```bash
#!/bin/bash
# Ensure all processes related to myapp are stopped

stop_myapp() {
    echo "Stopping myapp processes..."

    # Try graceful shutdown first
    pkill -TERM -f "myapp"

    # Wait up to 30 seconds
    local count=0
    while pgrep -f "myapp" > /dev/null && [ $count -lt 30 ]; do
        sleep 1
        count=$((count + 1))
    done

    # Force kill if still running
    if pgrep -f "myapp" > /dev/null; then
        echo "Graceful shutdown failed, force killing"
        pkill -KILL -f "myapp"
        sleep 2
    fi

    # Check result
    if pgrep -f "myapp" > /dev/null; then
        echo "ERROR: Could not stop all myapp processes"
        pgrep -la "myapp"
        return 1
    else
        echo "All myapp processes stopped"
        return 0
    fi
}

stop_myapp
```

### Managing Worker Pools

```bash
# Check how many workers are running
WORKER_COUNT=$(pgrep -c -f "worker.py")
echo "Running workers: $WORKER_COUNT"

# If there are too many, kill the excess
TARGET_WORKERS=4
if [ "$WORKER_COUNT" -gt "$TARGET_WORKERS" ]; then
    EXCESS=$((WORKER_COUNT - TARGET_WORKERS))
    echo "Killing $EXCESS excess workers"
    # Kill the newest workers (most recently started)
    for i in $(seq 1 $EXCESS); do
        pkill -n -f "worker.py"
        sleep 1
    done
fi
```

## Comparing pgrep/pkill with Alternatives

| Task | pgrep/pkill | Alternatives |
|------|-------------|--------------|
| Find PID by name | `pgrep nginx` | `ps aux \| grep nginx \| awk '{print $2}'` |
| Kill by name | `pkill nginx` | `kill $(ps aux \| grep nginx \| awk '{print $2}')` |
| Match full cmdline | `pgrep -f "script.py"` | `ps aux \| grep "script.py"` (may match grep itself) |
| Check if running | `pgrep -x nginx && echo yes` | Longer pipeline with grep |
| Kill by user | `pkill -u www-data` | `kill $(ps -u www-data -o pid=)` |

`pgrep` and `pkill` are cleaner, less error-prone, and purpose-built for the task. The main advantage over `ps | grep | kill` chains is that they do not accidentally match the grep process itself, handle edge cases cleanly, and return proper exit codes for scripting.

## Summary

`pgrep` and `pkill` form a powerful pair for process management. Use `pgrep` to find process IDs and check whether services are running in scripts. Use `pkill` to send signals to processes matched by name, pattern, user, or parent PID. The `-f` flag for full command-line matching is essential when you need to distinguish between multiple instances of the same interpreter. Both tools return proper exit codes, making them ideal building blocks for monitoring and management scripts. Always verify matches with `pgrep -la pattern` before running `pkill pattern` on a production system.
