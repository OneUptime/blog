# How to Kill Processes by PID, Name, and Signal on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Process Management, Linux Administration, Shell

Description: Learn how to terminate processes on Ubuntu using kill, killall, and pkill by PID, name, and various signals, including when to use SIGTERM versus SIGKILL.

---

Terminating a process seems straightforward, but there are important distinctions between different signals, different ways to identify the target process, and the right order to try them. Using SIGKILL immediately without trying SIGTERM first is a common mistake that can leave processes without a chance to clean up resources.

## Understanding Signals

A signal is a software interrupt sent to a process. The process can handle (or ignore) most signals. Two signals are particularly important for process termination:

- **SIGTERM (15)**: The graceful termination signal. The process receives it and can clean up, close connections, flush buffers, and exit cleanly. This is the default signal sent by `kill`.
- **SIGKILL (9)**: The force kill signal. The kernel terminates the process immediately, without giving it any chance to clean up. This cannot be caught or ignored by the process.

Other useful signals:

| Signal | Number | Purpose |
|--------|--------|---------|
| SIGHUP | 1 | Reload configuration (many daemons respond to this) |
| SIGINT | 2 | Interrupt (equivalent to Ctrl+C) |
| SIGTERM | 15 | Graceful termination (default) |
| SIGKILL | 9 | Force kill, cannot be ignored |
| SIGSTOP | 19 | Pause the process |
| SIGCONT | 18 | Resume a stopped process |
| SIGUSR1 | 10 | User-defined signal (application-specific) |
| SIGUSR2 | 12 | User-defined signal (application-specific) |

## Killing a Process by PID

The `kill` command sends a signal to a process identified by PID:

```bash
# Find the PID first
ps aux | grep nginx
pgrep nginx

# Send SIGTERM (graceful shutdown) - this is the default
kill 1234

# Explicitly specify SIGTERM
kill -15 1234
kill -TERM 1234
kill -SIGTERM 1234

# Force kill with SIGKILL
kill -9 1234
kill -KILL 1234

# Reload configuration with SIGHUP
kill -HUP 1234

# Pause a process
kill -STOP 1234

# Resume a paused process
kill -CONT 1234
```

## The Right Approach to Terminating a Process

Always try SIGTERM first and give the process time to exit:

```bash
# Step 1: Try graceful shutdown
kill -TERM 1234

# Step 2: Wait a moment for it to exit
sleep 5

# Step 3: Check if it is still running
if kill -0 1234 2>/dev/null; then
    echo "Process still running, sending SIGKILL"
    kill -KILL 1234
else
    echo "Process terminated gracefully"
fi
```

The `kill -0` command checks if a process exists without sending a real signal.

## Killing Multiple Processes by PID

```bash
# Kill several specific PIDs
kill -TERM 1234 5678 9012

# Kill all processes in a process group
kill -TERM -1234  # Negative PID = process group ID

# Kill all children of a parent process
pkill -TERM -P 1234
```

## killall - Kill by Process Name

`killall` sends signals to all processes with a matching name:

```bash
# Kill all processes named 'nginx'
killall nginx

# Equivalent to SIGTERM (default)
killall -TERM nginx

# Force kill all nginx processes
killall -9 nginx
killall -KILL nginx

# Kill processes matching a name, case-insensitive
killall -i NGINX

# Kill only processes owned by a specific user
killall -u www-data nginx

# Interactive mode - ask before killing each process
killall -i nginx

# Kill processes older than a specific age
killall -o 1h nginx  # Kill nginx processes older than 1 hour
killall -y 30m nginx # Kill only nginx processes younger than 30 minutes

# Verify without actually killing (dry run)
killall -v nginx
```

One important note: `killall` on Linux kills by exact name. A process named `nginx: worker process` will not be matched by `killall nginx`. Use `pkill` for pattern matching.

## pkill - Kill by Pattern

`pkill` is more flexible than `killall` - it supports regular expressions and various matching options:

```bash
# Kill processes matching a pattern (partial name match by default)
pkill nginx  # Matches 'nginx', 'nginx: worker process', etc.

# Force kill
pkill -9 nginx
pkill -KILL nginx

# Kill only processes owned by a specific user
pkill -u www-data python3

# Kill processes matching a full command line (not just name)
pkill -f "python3 /home/user/script.py"

# Kill the oldest matching process
pkill -o nginx  # Oldest
pkill -n nginx  # Newest

# Show what would be killed without actually killing
pkill --dry-run -f "my-script"

# Kill processes in a specific process group
pkill -g 1234
```

The `-f` flag is particularly useful for distinguishing between multiple Python or Node.js scripts with different arguments:

```bash
# You have multiple python3 scripts running:
# python3 /home/user/script-a.py
# python3 /home/user/script-b.py

# Kill only script-a.py
pkill -f "script-a.py"

# Kill only script-b.py
pkill -f "script-b.py"
```

## Finding and Killing Processes on a Specific Port

When you need to free a port:

```bash
# Find the process using port 8080
sudo ss -tlnp | grep :8080
sudo lsof -i :8080

# Kill it directly using fuser
sudo fuser -k 8080/tcp

# Or find the PID and kill manually
PID=$(sudo lsof -t -i :8080)
if [ -n "$PID" ]; then
    kill -TERM "$PID"
fi
```

## Sending Signals to Specific Users' Processes

```bash
# Kill all of a user's processes (use with caution)
pkill -u username

# Kill all of a user's processes except their login shell
pkill -u username -v -x bash  # -v inverts, -x exact match

# Kill a user's specific application
pkill -u www-data php-fpm
```

## Using kill with sudo

To kill processes owned by other users:

```bash
# Find the PID first
ps aux | grep root

# Kill as root
sudo kill -TERM 1234

# Kill all of another user's processes (forcefully, for terminating a session)
sudo pkill -u baduser
sudo pkill -KILL -u baduser  # Force kill
```

## Killing a Process That Ignores SIGTERM

Some processes are badly written and ignore SIGTERM, or are in an uninterruptible wait state. For these:

```bash
# Check the process state
ps -p 1234 -o state,cmd

# 'D' state = Uninterruptible sleep (usually waiting for I/O)
# SIGKILL won't work for D state processes - they are waiting on kernel I/O
# You usually have to wait for the I/O to complete or reboot

# 'Z' state = Zombie (cannot be killed, must reap from parent)

# For S, R, T states:
kill -KILL 1234
```

## Scripting Process Cleanup

Here is a robust script for terminating a process:

```bash
#!/bin/bash
# Terminate a process gracefully, falling back to SIGKILL

terminate_process() {
    local pid="$1"
    local name="$2"
    local timeout="${3:-10}"  # Default 10 second timeout

    if ! kill -0 "$pid" 2>/dev/null; then
        echo "Process $pid ($name) is not running"
        return 0
    fi

    echo "Sending SIGTERM to $name (PID: $pid)"
    kill -TERM "$pid"

    # Wait for the process to exit
    local count=0
    while kill -0 "$pid" 2>/dev/null && [ $count -lt $timeout ]; do
        sleep 1
        count=$((count + 1))
    done

    if kill -0 "$pid" 2>/dev/null; then
        echo "Process did not exit after ${timeout}s, sending SIGKILL"
        kill -KILL "$pid"
        sleep 1

        if kill -0 "$pid" 2>/dev/null; then
            echo "ERROR: Failed to kill process $pid ($name)"
            return 1
        fi
    fi

    echo "Process $pid ($name) terminated successfully"
    return 0
}

# Usage
PID=$(pgrep -x myapp)
if [ -n "$PID" ]; then
    terminate_process "$PID" "myapp" 15
fi
```

## Reload Configuration Without Killing

For services that support configuration reload via SIGHUP:

```bash
# Reload nginx configuration without dropping connections
sudo kill -HUP $(pgrep -x nginx | head -1)
# Or: sudo systemctl reload nginx

# Reload sshd configuration
sudo kill -HUP $(cat /var/run/sshd.pid)

# Check if a daemon supports SIGHUP reload
# Look at the man page or documentation for the specific service
man nginx  # Search for "SIGHUP"
```

## Summary

Process termination on Ubuntu has a clear hierarchy of tools and approaches. Use `kill` when you have the PID and want precise control over which signal to send. Use `killall` for exact name matching and `pkill` when you need pattern matching or want to target by full command line with `-f`. Always try SIGTERM first and allow time for graceful shutdown before escalating to SIGKILL. Reserve SIGKILL for processes that are unresponsive to SIGTERM, keeping in mind that processes in uninterruptible 'D' state cannot be killed at all until their I/O completes.
