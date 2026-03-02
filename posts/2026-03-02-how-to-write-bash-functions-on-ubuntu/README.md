# How to Write Bash Functions on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Bash, Scripting, Shell, Linux

Description: Learn how to write reusable Bash functions on Ubuntu, covering syntax, arguments, return values, local variables, scope, and building a function library.

---

Functions in Bash do what functions do in any programming language: they group reusable code under a name, take arguments, and return results. Once you start organizing scripts with functions, the difference in readability and maintainability is significant - a 200-line script with well-named functions is far easier to debug than 200 lines of sequential commands.

## Function Syntax

Bash supports two syntax styles for defining functions:

```bash
# Style 1: function keyword (explicit, clear)
function greet() {
    echo "Hello, $1"
}

# Style 2: POSIX-compatible style (more portable)
greet() {
    echo "Hello, $1"
}
```

Both work in Bash. The second form is more portable to other POSIX shells. Either is fine - pick one and be consistent.

Call a function the same way you'd call a command:

```bash
greet "World"   # prints: Hello, World
greet "Ubuntu"  # prints: Hello, Ubuntu
```

Functions must be defined before they're called in the script. Define them at the top, call them at the bottom.

## Function Arguments

Inside a function, arguments work exactly like script arguments:

```bash
#!/bin/bash

create_backup() {
    local source="$1"       # First argument
    local destination="$2"  # Second argument
    local timestamp="$3"    # Third argument (optional)

    # Default timestamp if not provided
    timestamp="${timestamp:-$(date +%Y%m%d-%H%M%S)}"

    local backup_name="backup-${timestamp}.tar.gz"

    echo "Backing up: $source"
    echo "Destination: $destination/$backup_name"

    tar -czf "$destination/$backup_name" "$source"

    if [ $? -eq 0 ]; then
        echo "Backup created: $destination/$backup_name"
        return 0
    else
        echo "Backup failed" >&2
        return 1
    fi
}

# Call the function
create_backup "/var/www/html" "/mnt/backups"
create_backup "/etc/nginx" "/mnt/backups" "20260302-custom"
```

Special argument variables inside functions:
- `$1`, `$2`, etc. - function arguments (not the script's arguments)
- `$#` - number of arguments passed to the function
- `$@` - all arguments as separate words
- `$*` - all arguments as a single string

Note that `$0` inside a function still refers to the script name, not the function name.

## Local Variables

Always use `local` for variables inside functions. Without it, you're creating or modifying global variables, which causes subtle bugs when functions interact:

```bash
#!/bin/bash

# Without local - dangerous
bad_function() {
    count=10  # This modifies the global $count
    echo "Inside function: count=$count"
}

count=1
echo "Before function: count=$count"  # 1
bad_function
echo "After function: count=$count"   # 10 - was modified!

# With local - safe
good_function() {
    local count=10  # Local to this function only
    echo "Inside function: count=$count"
}

count=1
echo "Before function: count=$count"  # 1
good_function
echo "After function: count=$count"   # 1 - unchanged
```

Make `local` the default for any variable you declare inside a function.

## Return Values

Bash functions return an exit code (0-255), not a value like in most languages. 0 means success, non-zero means failure.

```bash
#!/bin/bash

# Return exit code to signal success or failure
is_service_running() {
    local service_name="$1"

    if systemctl is-active --quiet "$service_name"; then
        return 0  # Success - service is running
    else
        return 1  # Failure - service is not running
    fi
}

# Use the return value in a conditional
if is_service_running "nginx"; then
    echo "nginx is running"
else
    echo "nginx is not running"
fi

# Or capture the exit code
is_service_running "mysql"
exit_code=$?
echo "mysql check exit code: $exit_code"
```

### Returning String Values

To return a string from a function, print it and capture the output with command substitution:

```bash
#!/bin/bash

get_disk_usage() {
    local mount_point="${1:-/}"
    df -h "$mount_point" | awk 'NR==2 {print $5}'
}

get_ip_address() {
    local interface="${1:-eth0}"
    ip addr show "$interface" 2>/dev/null | awk '/inet /{print $2}' | cut -d/ -f1
}

# Capture the returned string
usage=$(get_disk_usage "/")
echo "Root disk usage: $usage"

ip=$(get_ip_address "eth0")
echo "IP address: $ip"
```

### Returning Multiple Values

A function can print multiple values that the caller parses, or write to a named variable:

```bash
#!/bin/bash

# Return multiple values by printing them space-separated
get_file_info() {
    local file="$1"
    local size=$(stat -c %s "$file")
    local mtime=$(stat -c %Y "$file")
    local owner=$(stat -c %U "$file")

    echo "$size $mtime $owner"
}

# Parse multiple return values
read -r size mtime owner <<< "$(get_file_info /etc/passwd)"
echo "Size: $size bytes"
echo "Modified: $(date -d @"$mtime")"
echo "Owner: $owner"
```

## Validating Arguments Inside Functions

Functions should validate their inputs:

```bash
#!/bin/bash

check_port() {
    local host="$1"
    local port="$2"
    local timeout="${3:-5}"

    # Validate required arguments
    if [ -z "$host" ] || [ -z "$port" ]; then
        echo "Usage: check_port <host> <port> [timeout]" >&2
        return 1
    fi

    # Validate port is a number
    if ! [[ "$port" =~ ^[0-9]+$ ]]; then
        echo "Error: port must be a number, got: $port" >&2
        return 1
    fi

    # Do the actual check
    timeout "$timeout" bash -c ">/dev/tcp/$host/$port" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "Port $port on $host is open"
        return 0
    else
        echo "Port $port on $host is closed or unreachable"
        return 1
    fi
}

check_port "google.com" "80"
check_port "google.com" "9999"
check_port ""  # Missing args
```

## Recursive Functions

Bash supports recursion, though it's rarely needed:

```bash
#!/bin/bash

# Calculate factorial recursively
factorial() {
    local n="$1"

    if [ "$n" -le 1 ]; then
        echo 1
        return
    fi

    local sub=$(factorial $(( n - 1 )))
    echo $(( n * sub ))
}

echo "5! = $(factorial 5)"   # 120
echo "10! = $(factorial 10)" # 3628800
```

For deep recursion, be aware that Bash doesn't optimize tail calls and can hit stack limits.

## Building a Reusable Function Library

For projects with multiple scripts, put common functions in a shared library file:

```bash
# /usr/local/lib/bash/utils.sh

# Logging functions
log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]  $*"
}

log_warn() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN]  $*" >&2
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $*" >&2
}

# Check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if script is running as root
require_root() {
    if [ "$(id -u)" -ne 0 ]; then
        log_error "This script must be run as root"
        exit 1
    fi
}

# Retry a command with backoff
retry() {
    local max_attempts="$1"
    local delay="$2"
    shift 2
    local attempt=0

    while true; do
        attempt=$(( attempt + 1 ))
        "$@" && return 0

        if [ "$attempt" -ge "$max_attempts" ]; then
            log_error "Command failed after $max_attempts attempts: $*"
            return 1
        fi

        log_warn "Attempt $attempt failed, retrying in ${delay}s..."
        sleep "$delay"
        delay=$(( delay * 2 ))  # Exponential backoff
    done
}

# Create a directory and exit on failure
ensure_dir() {
    local dir="$1"
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir" || {
            log_error "Failed to create directory: $dir"
            exit 1
        }
    fi
}
```

Source this library in any script that needs it:

```bash
#!/bin/bash

# Load the utility library
source /usr/local/lib/bash/utils.sh

# Now use the functions
require_root
log_info "Starting deployment"

ensure_dir "/var/log/myapp"

if command_exists "docker"; then
    log_info "Docker is available"
else
    log_error "Docker is required but not installed"
    exit 1
fi

# Retry a flaky command up to 5 times with 2 second initial delay
retry 5 2 curl -sf https://registry.example.com/health

log_info "Deployment complete"
```

## Function Naming Conventions

Good function names make scripts self-documenting:

- Use lowercase with underscores: `create_backup`, `get_disk_usage`
- Use verb-noun pairs: `check_port`, `install_package`, `parse_config`
- Prefix private/internal functions: `_format_output`, `_validate_input`
- Be specific: `backup_mysql_database` is better than `backup`

## Overriding Commands with Functions

You can use a function name that shadows a command - useful for adding behavior:

```bash
#!/bin/bash

# Wrap rm to always ask for confirmation
rm() {
    echo -n "Delete '$*'? [y/N] "
    read -r confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        command rm "$@"
    else
        echo "Cancelled"
    fi
}

# Now 'rm' calls our function, which calls the real 'rm' via 'command'
rm /tmp/testfile
```

Use `command rm` to explicitly call the real command and bypass the function.

Well-designed functions are the difference between a script you can hand off to someone else and one only you can maintain. Keep them focused on a single task, validate inputs, use local variables, and group related functions into library files.
