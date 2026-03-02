# How to Write Your First Bash Script on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Bash, Scripting, Linux, Shell

Description: A practical introduction to writing Bash scripts on Ubuntu, covering shebang lines, variables, conditionals, user input, exit codes, and script execution.

---

Bash scripting turns a sequence of commands you'd otherwise type manually into a reusable, automated program. Whether you're backing up files, deploying applications, or processing log data, scripts save time and reduce human error. Ubuntu ships with Bash as the default shell, so everything here works out of the box.

This guide gets you writing real, functional scripts from the start. No toy examples that don't connect to actual work.

## Your First Script

Open a terminal and create a file:

```bash
# Create the script file
nano ~/my-first-script.sh
```

Type this in:

```bash
#!/bin/bash
# My first Bash script
# This script prints a greeting and shows basic system info

# Print a greeting
echo "Hello from $(hostname)"

# Show the current date and time
echo "Current date: $(date)"

# Show who's logged in
echo "Logged in as: $(whoami)"

# Show disk usage for home directory
echo "Home directory usage:"
du -sh ~
```

Save and close (Ctrl+O, Enter, Ctrl+X in nano).

## Understanding the Shebang Line

The first line `#!/bin/bash` is called a shebang (or hashbang). When you run a script, the kernel reads this line to know which interpreter to use. Without it, the script might run under `/bin/sh` (which is `dash` on Ubuntu, not bash) and some bash-specific syntax will fail.

Always put `#!/bin/bash` as the very first line with no spaces before it.

Common shebangs you'll encounter:
```bash
#!/bin/bash        # Use bash explicitly
#!/usr/bin/env bash  # Find bash via PATH (more portable)
#!/bin/sh          # POSIX sh (dash on Ubuntu, more portable but fewer features)
```

For Ubuntu scripts, `#!/bin/bash` or `#!/usr/bin/env bash` both work fine.

## Making Scripts Executable

A script file needs the execute permission set before you can run it directly:

```bash
# Add execute permission for the owner
chmod +x ~/my-first-script.sh

# Verify the permissions
ls -la ~/my-first-script.sh
# Should show: -rwxr-xr-x
```

Now you can run it:

```bash
# Run with the path
~/my-first-script.sh

# Or using bash explicitly (doesn't need execute permission)
bash ~/my-first-script.sh
```

## Variables

Variables store data you want to reference multiple times or that changes:

```bash
#!/bin/bash

# Assign variables (no spaces around the = sign)
name="ubuntu-server"
port=8080
log_file="/var/log/myapp.log"

# Use variables with $
echo "Server: $name"
echo "Port: $port"

# Use curly braces when needed to avoid ambiguity
prefix="backup"
echo "${prefix}_file.tar.gz"   # Works: backup_file.tar.gz
echo "$prefix_file.tar.gz"     # Wrong: treats prefix_file as the variable name

# Command substitution - store command output in a variable
current_user=$(whoami)
current_date=$(date +%Y-%m-%d)
disk_usage=$(df -h / | awk 'NR==2 {print $5}')

echo "User: $current_user"
echo "Date: $current_date"
echo "Root disk usage: $disk_usage"
```

### Arithmetic

```bash
#!/bin/bash

count=5
limit=10

# Arithmetic with $(( ))
result=$(( count + limit ))
echo "Sum: $result"

# Increment a counter
count=$(( count + 1 ))
echo "Count: $count"

# Or use the shorter form
(( count++ ))
echo "Count after increment: $count"
```

## Reading User Input

Scripts often need to ask the user for information:

```bash
#!/bin/bash

# Read input from the user
echo -n "Enter your name: "
read user_name

echo "Hello, $user_name!"

# Read with a prompt on the same command
read -p "Enter backup destination: " dest

# Read a password without showing it on screen
read -sp "Enter password: " password
echo  # Print newline after hidden input

echo "Destination: $dest"
echo "Password length: ${#password} characters"
```

## Conditionals with if/else

```bash
#!/bin/bash

# Basic if/else
file="/etc/passwd"

if [ -f "$file" ]; then
    echo "$file exists and is a regular file"
elif [ -d "$file" ]; then
    echo "$file is a directory"
else
    echo "$file does not exist"
fi

# Comparing strings
environment="production"

if [ "$environment" = "production" ]; then
    echo "Running in production mode"
fi

# Comparing numbers (use -eq, -ne, -lt, -gt, -le, -ge for integers)
free_space=$(df / | awk 'NR==2 {print $4}')

if [ "$free_space" -lt 1048576 ]; then
    echo "Warning: Less than 1GB free on root filesystem"
fi
```

Common test operators:
- `-f file` - file exists and is regular file
- `-d dir` - directory exists
- `-e path` - path exists (any type)
- `-r file` - file is readable
- `-w file` - file is writable
- `-s file` - file exists and is not empty
- `"$a" = "$b"` - strings are equal
- `"$a" != "$b"` - strings are not equal
- `-z "$var"` - variable is empty
- `-n "$var"` - variable is not empty

## Handling Script Arguments

Arguments passed to a script are accessed via numbered variables:

```bash
#!/bin/bash
# Usage: ./backup.sh source_dir destination_dir

# $0 is the script name itself
# $1, $2, etc. are the arguments
# $# is the count of arguments
# $@ is all arguments as separate strings

script_name="$0"
source="$1"
destination="$2"
arg_count="$#"

# Validate that required arguments were provided
if [ "$arg_count" -ne 2 ]; then
    echo "Usage: $script_name <source_dir> <destination_dir>"
    echo "Example: $script_name /home/user/data /mnt/backup"
    exit 1
fi

# Validate the source directory exists
if [ ! -d "$source" ]; then
    echo "Error: Source directory '$source' does not exist"
    exit 1
fi

echo "Backing up $source to $destination"
# (actual backup command would go here)
```

## Exit Codes

Every command returns an exit code: 0 means success, anything else means failure. Scripts should do the same:

```bash
#!/bin/bash

# Check exit code of last command with $?
ping -c 1 8.8.8.8 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Network is up"
else
    echo "Network check failed"
    exit 1  # Exit script with failure code
fi

# Shorter form using || and &&
ping -c 1 8.8.8.8 > /dev/null 2>&1 && echo "Network up" || echo "Network down"

# Always exit with 0 at the end of a successful script
echo "Script completed successfully"
exit 0
```

## A Real-World Script: System Health Check

Putting it all together in a practical script:

```bash
#!/bin/bash
# system-health.sh - Quick system health summary
# Usage: ./system-health.sh

# Color codes for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'  # No color (reset)

# Thresholds
CPU_WARN=80
DISK_WARN=85
MEM_WARN=90

echo "=== System Health Check: $(date) ==="
echo ""

# CPU load (1-minute average)
cpu_load=$(uptime | awk -F'load average:' '{print $2}' | awk -F',' '{print $1}' | tr -d ' ')
cpu_cores=$(nproc)
cpu_percent=$(echo "$cpu_load $cpu_cores" | awk '{printf "%.0f", ($1/$2)*100}')

echo -n "CPU Load: ${cpu_percent}% - "
if [ "$cpu_percent" -ge "$CPU_WARN" ]; then
    echo -e "${RED}WARNING${NC}"
else
    echo -e "${GREEN}OK${NC}"
fi

# Disk usage
disk_usage=$(df / | awk 'NR==2 {print $5}' | tr -d '%')

echo -n "Disk Usage: ${disk_usage}% - "
if [ "$disk_usage" -ge "$DISK_WARN" ]; then
    echo -e "${RED}WARNING${NC}"
else
    echo -e "${GREEN}OK${NC}"
fi

# Memory usage
mem_total=$(free | awk '/^Mem:/{print $2}')
mem_used=$(free | awk '/^Mem:/{print $3}')
mem_percent=$(echo "$mem_used $mem_total" | awk '{printf "%.0f", ($1/$2)*100}')

echo -n "Memory Usage: ${mem_percent}% - "
if [ "$mem_percent" -ge "$MEM_WARN" ]; then
    echo -e "${RED}WARNING${NC}"
else
    echo -e "${GREEN}OK${NC}"
fi

echo ""
echo "Uptime: $(uptime -p)"
echo "Users logged in: $(who | wc -l)"
```

Save this to a file, make it executable, and run it:

```bash
chmod +x system-health.sh
./system-health.sh
```

## Script Debugging

When something isn't working, bash's debug mode shows each command before it runs:

```bash
# Run with debug mode
bash -x my-script.sh

# Or add to the script itself (useful for specific sections)
set -x  # Enable debug mode
# ... commands to debug ...
set +x  # Disable debug mode
```

Two other useful `set` options to put at the top of scripts:

```bash
#!/bin/bash
set -e  # Exit immediately if any command fails
set -u  # Treat unset variables as errors
set -o pipefail  # Catch errors in pipelines
```

These three options together (`set -euo pipefail`) make scripts fail fast and noisily when something goes wrong, rather than silently continuing in a broken state.

From here, the natural progression is learning loops, functions, and more complex text processing - all of which build on the fundamentals covered here.
