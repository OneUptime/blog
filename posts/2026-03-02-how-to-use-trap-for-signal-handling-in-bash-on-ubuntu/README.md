# How to Use trap for Signal Handling in Bash on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Bash, Scripting, Shell, Linux

Description: Learn how to use the Bash trap command to handle signals, clean up temporary files on exit, catch errors, and write robust scripts on Ubuntu.

---

When a script runs, things can go wrong: the user presses Ctrl+C, the system sends a termination signal, or a command fails unexpectedly. Without signal handling, a script might leave behind temporary files, partially written configs, or running subprocesses. The `trap` command lets you register cleanup functions and handle these situations gracefully.

## How trap Works

The `trap` command registers a command to run when the shell receives a specific signal or condition:

```bash
trap 'command' SIGNAL [SIGNAL ...]
```

Common signals and conditions:
- `EXIT` - runs when the script exits (any reason)
- `INT` - user pressed Ctrl+C (SIGINT)
- `TERM` - process received SIGTERM (kill without -9)
- `ERR` - a command returned a non-zero exit code (when `set -e` is active)
- `HUP` - hangup signal (SIGHUP)
- `QUIT` - quit signal (SIGQUIT, Ctrl+\)
- `DEBUG` - before each command (useful for tracing)

## Cleaning Up Temporary Files

The most common use: ensure temporary files are deleted when a script finishes, regardless of how it exits.

```bash
#!/bin/bash

# Create a temp file at the start
tmp_file=$(mktemp /tmp/myscript.XXXXXX)

# Register cleanup to run on exit
trap 'rm -f "$tmp_file"' EXIT

echo "Working with temp file: $tmp_file"

# Do some work with the temp file
some_command > "$tmp_file"
process_results "$tmp_file"

# When the script ends (normally or via Ctrl+C), the trap runs
echo "Done"
```

The `EXIT` trap runs no matter how the script ends - normal completion, Ctrl+C, `exit` command, or even SIGTERM. This makes it reliable for cleanup.

## Cleaning Up Multiple Resources

Use a cleanup function for complex cleanup logic:

```bash
#!/bin/bash

# Variables for resources that need cleanup
tmp_dir=""
pid_file="/var/run/myscript.pid"
lock_file="/tmp/myscript.lock"

# Cleanup function
cleanup() {
    local exit_code=$?

    echo "Cleaning up..."

    # Remove temp directory if it was created
    if [ -n "$tmp_dir" ] && [ -d "$tmp_dir" ]; then
        rm -rf "$tmp_dir"
        echo "Removed temp dir: $tmp_dir"
    fi

    # Remove PID file
    rm -f "$pid_file"

    # Remove lock file
    rm -f "$lock_file"

    # Exit with the original exit code
    exit $exit_code
}

# Register cleanup function for multiple signals
trap cleanup EXIT INT TERM

# Create resources
tmp_dir=$(mktemp -d /tmp/myscript.XXXXXX)
echo "$$" > "$pid_file"
touch "$lock_file"

echo "Working..."
sleep 30  # Simulate work - press Ctrl+C during this to test

echo "Finished normally"
```

## Handling Ctrl+C Gracefully

Sometimes you want to let users interrupt a long operation but give them feedback and do cleanup:

```bash
#!/bin/bash

interrupted=false

handle_interrupt() {
    interrupted=true
    echo ""
    echo "Interrupted. Stopping after current operation..."
}

trap handle_interrupt INT

process_files() {
    for file in /var/log/*.log; do
        # Check if we should stop
        if $interrupted; then
            echo "Stopping at user request"
            break
        fi

        echo "Processing: $file"
        wc -l "$file"
    done
}

process_files

if $interrupted; then
    echo "Processing was interrupted"
    exit 130  # 128 + 2 (SIGINT signal number)
else
    echo "Processing complete"
fi
```

## Error Handling with ERR Trap

The `ERR` trap fires when a command fails (exits non-zero), similar to `set -e` but with more control:

```bash
#!/bin/bash

# Print error information when any command fails
handle_error() {
    local exit_code=$?
    local line_number=$1

    echo "ERROR: Command failed with exit code $exit_code on line $line_number" >&2
    echo "Script: $0" >&2

    # Optional: print the command that failed
    echo "Failed command: $BASH_COMMAND" >&2
}

# $LINENO contains the current line number
trap 'handle_error $LINENO' ERR

# This will trigger the ERR trap
ls /nonexistent/path

echo "This line runs only if previous command succeeded"
```

The `$BASH_COMMAND` variable holds the command that triggered the trap.

## Combining ERR and EXIT Traps

A common robust pattern:

```bash
#!/bin/bash

set -euo pipefail

# Track if we're in an error state
error_occurred=false

cleanup() {
    if $error_occurred; then
        echo "Script failed - cleaning up after error" >&2
    else
        echo "Script completed - cleaning up"
    fi

    # Always remove temp files
    rm -f /tmp/myscript-*
}

on_error() {
    error_occurred=true
    echo "Error on line $1: $BASH_COMMAND" >&2
}

trap cleanup EXIT
trap 'on_error $LINENO' ERR

# Main script logic
echo "Starting deployment..."

# Create temp files
tmp_config=$(mktemp /tmp/myscript-config.XXXXXX)
tmp_data=$(mktemp /tmp/myscript-data.XXXXXX)

# Do work - any failure here triggers on_error, then cleanup
wget -O "$tmp_data" https://example.com/data.json
process_data "$tmp_data" > "$tmp_config"

echo "Deployment complete"
```

## Resetting Traps

To remove a trap, use an empty string or `-`:

```bash
#!/bin/bash

# Remove a trap
trap '' INT     # Ignore INT (Ctrl+C)
trap - EXIT     # Remove EXIT trap (reset to default behavior)
```

Setting trap to an empty string `''` ignores the signal entirely - the script continues running. Setting to `-` resets to the default signal handling.

```bash
#!/bin/bash

# During a critical section, ignore Ctrl+C
echo "Starting critical operation..."
trap '' INT  # Ignore Ctrl+C during critical section

# Critical work here - cannot be interrupted
update_database
write_config
reload_service

# Restore normal Ctrl+C handling
trap - INT
echo "Critical section complete"
```

## Implementing a Lock File

Trap is perfect for lock file management:

```bash
#!/bin/bash

LOCK_FILE="/var/lock/myscript.lock"

acquire_lock() {
    # Try to create lock file with our PID
    if ! ( set -C; echo "$$" > "$LOCK_FILE" ) 2>/dev/null; then
        local existing_pid
        existing_pid=$(cat "$LOCK_FILE" 2>/dev/null)

        if kill -0 "$existing_pid" 2>/dev/null; then
            echo "Error: Script already running with PID $existing_pid" >&2
            exit 1
        else
            echo "Stale lock file found, removing..."
            rm -f "$LOCK_FILE"
            echo "$$" > "$LOCK_FILE"
        fi
    fi
}

release_lock() {
    rm -f "$LOCK_FILE"
}

# Register lock release on exit
trap release_lock EXIT

# Acquire the lock
acquire_lock

echo "Running with lock (PID $$)"
# Do work...
sleep 10
echo "Done"
```

## Debugging with the DEBUG Trap

The `DEBUG` trap runs before every command - useful for tracing script execution:

```bash
#!/bin/bash

# Enable debug tracing
debug_trace() {
    echo "CMD[$BASH_LINENO]: $BASH_COMMAND" >&2
}

trap debug_trace DEBUG

x=5
y=10
z=$(( x + y ))
echo "Result: $z"
```

This is verbose - only use it when debugging a specific section. Better yet, use `set -x` for most debugging needs, and the DEBUG trap for cases where you need custom logic around each command.

## Signal Numbers Reference

Some signals by number in case you need them:

```bash
# Common signal numbers
# 1  = SIGHUP
# 2  = SIGINT (Ctrl+C)
# 3  = SIGQUIT (Ctrl+\)
# 9  = SIGKILL (cannot be trapped)
# 15 = SIGTERM (default kill signal)

# List all signals
kill -l

# Trap by number (less readable but works)
trap 'echo Received SIGTERM' 15
```

Note: `SIGKILL` (9) cannot be trapped, handled, or ignored. The kernel delivers it directly.

## Practical Complete Example: Backup Script with Cleanup

```bash
#!/bin/bash
# backup.sh - Backup with proper signal handling

set -euo pipefail

SOURCE_DIR="/var/www"
BACKUP_DIR="/mnt/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="backup-$TIMESTAMP.tar.gz"
TMP_BACKUP="/tmp/$BACKUP_NAME"

# Track state
backup_complete=false

cleanup() {
    local exit_code=$?

    # Remove incomplete backup from tmp
    if ! $backup_complete && [ -f "$TMP_BACKUP" ]; then
        echo "Removing incomplete backup: $TMP_BACKUP" >&2
        rm -f "$TMP_BACKUP"
    fi

    if [ $exit_code -ne 0 ]; then
        echo "Backup failed with exit code $exit_code" >&2
    fi
}

trap cleanup EXIT

echo "Starting backup of $SOURCE_DIR"
echo "Backup file: $BACKUP_DIR/$BACKUP_NAME"

# Create the backup
tar -czf "$TMP_BACKUP" "$SOURCE_DIR"

# Move to final location
mv "$TMP_BACKUP" "$BACKUP_DIR/$BACKUP_NAME"
backup_complete=true

echo "Backup completed: $BACKUP_DIR/$BACKUP_NAME"
echo "Size: $(du -sh "$BACKUP_DIR/$BACKUP_NAME" | cut -f1)"
```

With `trap`, cleanup logic runs reliably no matter how a script terminates. This is the difference between scripts that leave a mess behind and scripts that behave correctly under real-world conditions.
