# How to Write and Debug Bash Scripts on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Bash, Scripting, Shell, Automation, Tutorial

Description: Complete guide to writing, debugging, and best practices for Bash scripts on Ubuntu.

---

Bash scripting is an essential skill for system administrators, DevOps engineers, and developers working with Ubuntu and other Linux distributions. Whether you are automating repetitive tasks, managing servers, or building deployment pipelines, understanding how to write and debug Bash scripts effectively will significantly improve your productivity.

This comprehensive guide covers everything from basic syntax to advanced debugging techniques, helping you write robust and maintainable Bash scripts on Ubuntu.

## Getting Started with Bash Scripts

### The Shebang Line

Every Bash script should begin with a shebang line that tells the system which interpreter to use:

```bash
#!/bin/bash
```

Alternatively, for better portability across different systems:

```bash
#!/usr/bin/env bash
```

The second form uses the `env` command to locate the Bash interpreter in the system's PATH, which is useful when Bash might be installed in different locations.

### Creating and Running Your First Script

Create a simple script file:

```bash
# Create a new script file
nano hello.sh
```

Add the following content:

```bash
#!/bin/bash
# My first Bash script
echo "Hello, Ubuntu!"
```

### Setting File Permissions

Before running a script, you need to make it executable:

```bash
# Add execute permission for the owner
chmod +x hello.sh

# Or set specific permissions (rwxr-xr-x)
chmod 755 hello.sh
```

Run the script:

```bash
# Using relative path
./hello.sh

# Using absolute path
/home/user/scripts/hello.sh

# Or explicitly with bash
bash hello.sh
```

## Variables and Data Types

### Declaring Variables

Bash variables are untyped by default. Declare them without spaces around the equals sign:

```bash
#!/bin/bash

# String variables
name="Ubuntu"
version="24.04"

# Numeric variables (stored as strings but can be used in arithmetic)
count=10
port=8080

# Using variables
echo "Operating System: $name"
echo "Version: ${version}"

# Curly braces are required when variable is adjacent to other characters
echo "File: ${name}_config.txt"
```

### Variable Types and Attributes

Use `declare` to set variable attributes:

```bash
#!/bin/bash

# Read-only variable (constant)
declare -r PI=3.14159
# PI=3.14  # This would cause an error

# Integer variable
declare -i number=42
number=number+8  # Arithmetic without $(())
echo "Number: $number"  # Output: 50

# Array variable
declare -a fruits=("apple" "banana" "cherry")

# Associative array (dictionary)
declare -A user_info
user_info[name]="John"
user_info[age]=30

# Export variable to child processes
declare -x PATH_ADDON="/opt/custom/bin"
```

### Special Variables

Bash provides several built-in special variables:

```bash
#!/bin/bash

echo "Script name: $0"
echo "First argument: $1"
echo "Second argument: $2"
echo "All arguments (as separate words): $@"
echo "All arguments (as single string): $*"
echo "Number of arguments: $#"
echo "Exit status of last command: $?"
echo "Process ID of current script: $$"
echo "Process ID of last background command: $!"
```

### Environment Variables

```bash
#!/bin/bash

# Access environment variables
echo "Home directory: $HOME"
echo "Current user: $USER"
echo "Current shell: $SHELL"
echo "System path: $PATH"

# Set environment variable for child processes
export MY_VAR="custom_value"

# Check if variable is set
if [ -z "$UNDEFINED_VAR" ]; then
    echo "Variable is empty or not set"
fi

# Default value if variable is unset
backup_dir="${BACKUP_PATH:-/tmp/backup}"
echo "Backup directory: $backup_dir"
```

## Conditionals

### If Statements

The `if` statement is fundamental for conditional execution:

```bash
#!/bin/bash

age=25

# Basic if statement
if [ $age -ge 18 ]; then
    echo "You are an adult"
fi

# If-else statement
if [ $age -ge 65 ]; then
    echo "Senior citizen"
else
    echo "Not a senior citizen"
fi

# If-elif-else statement
if [ $age -lt 13 ]; then
    echo "Child"
elif [ $age -lt 20 ]; then
    echo "Teenager"
elif [ $age -lt 65 ]; then
    echo "Adult"
else
    echo "Senior"
fi
```

### Test Operators

#### String Comparisons

```bash
#!/bin/bash

str1="hello"
str2="world"

# String equality
if [ "$str1" = "$str2" ]; then
    echo "Strings are equal"
fi

# String inequality
if [ "$str1" != "$str2" ]; then
    echo "Strings are different"
fi

# String is empty
if [ -z "$str1" ]; then
    echo "String is empty"
fi

# String is not empty
if [ -n "$str1" ]; then
    echo "String is not empty"
fi

# Using [[ ]] for pattern matching (Bash-specific)
if [[ "$str1" == h* ]]; then
    echo "String starts with 'h'"
fi

# Regular expression matching
if [[ "$str1" =~ ^[a-z]+$ ]]; then
    echo "String contains only lowercase letters"
fi
```

#### Numeric Comparisons

```bash
#!/bin/bash

num1=10
num2=20

# Equal
if [ $num1 -eq $num2 ]; then echo "Equal"; fi

# Not equal
if [ $num1 -ne $num2 ]; then echo "Not equal"; fi

# Greater than
if [ $num1 -gt $num2 ]; then echo "Greater"; fi

# Greater than or equal
if [ $num1 -ge $num2 ]; then echo "Greater or equal"; fi

# Less than
if [ $num1 -lt $num2 ]; then echo "Less"; fi

# Less than or equal
if [ $num1 -le $num2 ]; then echo "Less or equal"; fi

# Using (( )) for arithmetic comparisons (more readable)
if (( num1 < num2 )); then
    echo "$num1 is less than $num2"
fi
```

#### File Test Operators

```bash
#!/bin/bash

file="/etc/passwd"
dir="/home"
link="/usr/bin/python"

# File exists
if [ -e "$file" ]; then echo "File exists"; fi

# Is a regular file
if [ -f "$file" ]; then echo "Is a regular file"; fi

# Is a directory
if [ -d "$dir" ]; then echo "Is a directory"; fi

# Is a symbolic link
if [ -L "$link" ]; then echo "Is a symbolic link"; fi

# File is readable
if [ -r "$file" ]; then echo "File is readable"; fi

# File is writable
if [ -w "$file" ]; then echo "File is writable"; fi

# File is executable
if [ -x "$file" ]; then echo "File is executable"; fi

# File is not empty
if [ -s "$file" ]; then echo "File is not empty"; fi

# File1 is newer than file2
if [ "$file1" -nt "$file2" ]; then echo "File1 is newer"; fi

# File1 is older than file2
if [ "$file1" -ot "$file2" ]; then echo "File1 is older"; fi
```

#### Logical Operators

```bash
#!/bin/bash

age=25
has_license=true

# AND operator
if [ $age -ge 18 ] && [ "$has_license" = true ]; then
    echo "Can drive"
fi

# OR operator
if [ $age -lt 18 ] || [ "$has_license" = false ]; then
    echo "Cannot drive"
fi

# NOT operator
if [ ! -f "/tmp/lockfile" ]; then
    echo "Lock file does not exist"
fi

# Combined with [[ ]]
if [[ $age -ge 18 && "$has_license" == true ]]; then
    echo "Can drive"
fi
```

### Case Statements

The `case` statement is ideal for matching against multiple patterns:

```bash
#!/bin/bash

# Simple case statement
fruit="apple"

case $fruit in
    apple)
        echo "It's an apple"
        ;;
    banana)
        echo "It's a banana"
        ;;
    orange|lemon)
        echo "It's a citrus fruit"
        ;;
    *)
        echo "Unknown fruit"
        ;;
esac

# Case statement with patterns
read -p "Enter a character: " char

case $char in
    [a-z])
        echo "Lowercase letter"
        ;;
    [A-Z])
        echo "Uppercase letter"
        ;;
    [0-9])
        echo "Digit"
        ;;
    *)
        echo "Special character"
        ;;
esac

# Processing command-line options
case $1 in
    -h|--help)
        echo "Usage: $0 [options]"
        echo "  -h, --help     Show this help"
        echo "  -v, --version  Show version"
        ;;
    -v|--version)
        echo "Version 1.0.0"
        ;;
    *)
        echo "Unknown option: $1"
        exit 1
        ;;
esac
```

## Loops

### For Loops

```bash
#!/bin/bash

# Loop over a list
for fruit in apple banana cherry; do
    echo "Fruit: $fruit"
done

# Loop over a range
for i in {1..5}; do
    echo "Number: $i"
done

# Loop with step
for i in {0..10..2}; do
    echo "Even number: $i"
done

# C-style for loop
for ((i=0; i<5; i++)); do
    echo "Index: $i"
done

# Loop over array elements
colors=("red" "green" "blue")
for color in "${colors[@]}"; do
    echo "Color: $color"
done

# Loop over files
for file in /etc/*.conf; do
    echo "Config file: $file"
done

# Loop over command output
for user in $(cut -d: -f1 /etc/passwd | head -5); do
    echo "User: $user"
done

# Loop with index
fruits=("apple" "banana" "cherry")
for i in "${!fruits[@]}"; do
    echo "Index $i: ${fruits[$i]}"
done
```

### While Loops

```bash
#!/bin/bash

# Basic while loop
count=1
while [ $count -le 5 ]; do
    echo "Count: $count"
    ((count++))
done

# Reading file line by line
while IFS= read -r line; do
    echo "Line: $line"
done < /etc/hosts

# Infinite loop with break
while true; do
    read -p "Enter 'quit' to exit: " input
    if [ "$input" = "quit" ]; then
        break
    fi
    echo "You entered: $input"
done

# While loop with multiple conditions
x=0
y=10
while [ $x -lt 5 ] && [ $y -gt 5 ]; do
    echo "x=$x, y=$y"
    ((x++))
    ((y--))
done

# Process substitution for reading command output
while read -r pid cmd; do
    echo "PID: $pid, Command: $cmd"
done < <(ps aux | awk 'NR>1 {print $2, $11}' | head -5)
```

### Until Loops

```bash
#!/bin/bash

# Until loop (opposite of while)
count=1
until [ $count -gt 5 ]; do
    echo "Count: $count"
    ((count++))
done

# Wait for a file to exist
until [ -f /tmp/ready.flag ]; do
    echo "Waiting for ready flag..."
    sleep 1
done
echo "Ready flag found!"

# Wait for a service to be available
until nc -z localhost 8080 2>/dev/null; do
    echo "Waiting for service on port 8080..."
    sleep 2
done
echo "Service is available!"
```

### Loop Control

```bash
#!/bin/bash

# Break statement
for i in {1..10}; do
    if [ $i -eq 5 ]; then
        echo "Breaking at $i"
        break
    fi
    echo "Number: $i"
done

# Continue statement
for i in {1..10}; do
    if [ $((i % 2)) -eq 0 ]; then
        continue  # Skip even numbers
    fi
    echo "Odd number: $i"
done

# Nested loops with labeled break
for i in {1..3}; do
    for j in {1..3}; do
        if [ $j -eq 2 ]; then
            break 2  # Break out of both loops
        fi
        echo "i=$i, j=$j"
    done
done
```

## Functions

### Defining and Calling Functions

```bash
#!/bin/bash

# Simple function
greet() {
    echo "Hello, World!"
}

# Call the function
greet

# Function with parameters
greet_user() {
    local name=$1
    local greeting=${2:-"Hello"}  # Default value
    echo "$greeting, $name!"
}

greet_user "Alice"
greet_user "Bob" "Welcome"

# Function with return value (exit status)
is_even() {
    local num=$1
    if [ $((num % 2)) -eq 0 ]; then
        return 0  # True (success)
    else
        return 1  # False (failure)
    fi
}

if is_even 4; then
    echo "4 is even"
fi

# Function returning a string (via echo)
get_timestamp() {
    echo $(date +"%Y-%m-%d %H:%M:%S")
}

timestamp=$(get_timestamp)
echo "Current time: $timestamp"
```

### Local Variables and Scope

```bash
#!/bin/bash

# Global variable
global_var="I am global"

demo_scope() {
    # Local variable (only visible inside function)
    local local_var="I am local"

    # Modifying global variable
    global_var="Modified global"

    echo "Inside function:"
    echo "  local_var: $local_var"
    echo "  global_var: $global_var"
}

echo "Before function:"
echo "  global_var: $global_var"

demo_scope

echo "After function:"
echo "  global_var: $global_var"
echo "  local_var: $local_var"  # Empty - local_var not accessible
```

### Advanced Function Patterns

```bash
#!/bin/bash

# Function with array parameter
process_array() {
    local -a arr=("$@")
    for item in "${arr[@]}"; do
        echo "Processing: $item"
    done
}

my_array=("one" "two" "three")
process_array "${my_array[@]}"

# Function returning array (via global variable)
generate_numbers() {
    local start=$1
    local count=$2
    result_array=()

    for ((i=0; i<count; i++)); do
        result_array+=($((start + i)))
    done
}

generate_numbers 10 5
echo "Generated: ${result_array[@]}"

# Recursive function
factorial() {
    local n=$1
    if [ $n -le 1 ]; then
        echo 1
    else
        local prev=$(factorial $((n - 1)))
        echo $((n * prev))
    fi
}

echo "Factorial of 5: $(factorial 5)"

# Function library (can be sourced from other scripts)
# utils.sh
log_info() {
    echo "[INFO] $(date +%H:%M:%S) - $*"
}

log_error() {
    echo "[ERROR] $(date +%H:%M:%S) - $*" >&2
}

log_debug() {
    if [ "${DEBUG:-false}" = true ]; then
        echo "[DEBUG] $(date +%H:%M:%S) - $*"
    fi
}
```

## Input/Output and Redirection

### Standard Streams

```bash
#!/bin/bash

# Standard output (stdout - file descriptor 1)
echo "This goes to stdout"

# Standard error (stderr - file descriptor 2)
echo "This goes to stderr" >&2

# Standard input (stdin - file descriptor 0)
read -p "Enter your name: " name
echo "Hello, $name"
```

### Output Redirection

```bash
#!/bin/bash

# Redirect stdout to file (overwrite)
echo "Hello" > output.txt

# Redirect stdout to file (append)
echo "World" >> output.txt

# Redirect stderr to file
command_that_fails 2> error.log

# Redirect both stdout and stderr to same file
command 2>&1 > all_output.log

# Modern syntax for redirecting both streams
command &> all_output.log

# Redirect stdout and stderr to different files
command > stdout.log 2> stderr.log

# Discard output
command > /dev/null       # Discard stdout
command 2> /dev/null      # Discard stderr
command &> /dev/null      # Discard both
```

### Input Redirection

```bash
#!/bin/bash

# Read from file
while read -r line; do
    echo "Line: $line"
done < input.txt

# Here document (heredoc)
cat << EOF
This is a multi-line
text block that will be
passed to the cat command.
Variables like $HOME are expanded.
EOF

# Here document with no variable expansion
cat << 'EOF'
Variables like $HOME are NOT expanded.
This is useful for code templates.
EOF

# Here document to a file
cat << EOF > config.txt
server=localhost
port=8080
user=$USER
EOF

# Here string
grep "pattern" <<< "This is a here string with pattern in it"
```

### Pipes and Process Substitution

```bash
#!/bin/bash

# Basic pipe
ls -la | grep ".txt"

# Multiple pipes
cat /etc/passwd | cut -d: -f1 | sort | head -10

# Pipe with tee (write to file and stdout)
ls -la | tee directory_listing.txt | grep ".sh"

# Process substitution (treat command output as file)
diff <(ls dir1) <(ls dir2)

# Process substitution for input
while read -r line; do
    echo "Process: $line"
done < <(ps aux | grep bash)

# Named pipes (FIFOs)
mkfifo my_pipe
echo "Hello through pipe" > my_pipe &
cat < my_pipe
rm my_pipe
```

### File Descriptors

```bash
#!/bin/bash

# Open file descriptor for reading
exec 3< input.txt
while read -r line <&3; do
    echo "Read: $line"
done
exec 3<&-  # Close file descriptor

# Open file descriptor for writing
exec 4> output.txt
echo "Line 1" >&4
echo "Line 2" >&4
exec 4>&-  # Close file descriptor

# Open file descriptor for read/write
exec 5<> data.txt
read -r first_line <&5
echo "Appended line" >&5
exec 5>&-  # Close file descriptor

# Duplicate file descriptors
exec 6>&1  # Save stdout
exec 1> log.txt  # Redirect stdout to file
echo "This goes to log.txt"
exec 1>&6  # Restore stdout
exec 6>&-  # Close saved descriptor
echo "This goes to terminal"
```

## Command Substitution

```bash
#!/bin/bash

# Modern syntax (preferred)
current_date=$(date +%Y-%m-%d)
echo "Today is: $current_date"

# Legacy syntax (backticks)
current_time=`date +%H:%M:%S`
echo "Current time: $current_time"

# Nested command substitution
inner_result=$(echo "Inner: $(whoami)")
echo $inner_result

# Using command substitution in conditionals
if [ $(id -u) -eq 0 ]; then
    echo "Running as root"
else
    echo "Running as $(whoami)"
fi

# Arithmetic with command substitution
file_count=$(ls -1 | wc -l)
echo "Number of files: $file_count"

# Multi-line command substitution
system_info=$(
    echo "Hostname: $(hostname)"
    echo "OS: $(uname -s)"
    echo "Kernel: $(uname -r)"
)
echo "$system_info"

# Command substitution in arrays
files=($(ls *.txt 2>/dev/null))
echo "Text files: ${files[@]}"

# Process command output
while IFS= read -r line; do
    echo "Found: $line"
done < <(find /var/log -name "*.log" -mtime -1 2>/dev/null)
```

## Arrays

### Indexed Arrays

```bash
#!/bin/bash

# Declare and initialize array
fruits=("apple" "banana" "cherry")

# Declare empty array
declare -a numbers

# Add elements
numbers+=(1 2 3)
numbers+=(4)

# Access elements (0-indexed)
echo "First fruit: ${fruits[0]}"
echo "Second fruit: ${fruits[1]}"

# Access all elements
echo "All fruits: ${fruits[@]}"
echo "All fruits (as single string): ${fruits[*]}"

# Array length
echo "Number of fruits: ${#fruits[@]}"

# Element length
echo "Length of first fruit: ${#fruits[0]}"

# Array indices
echo "Indices: ${!fruits[@]}"

# Modify element
fruits[1]="blueberry"

# Remove element
unset fruits[2]

# Slice array
echo "First two: ${fruits[@]:0:2}"
echo "Skip first: ${fruits[@]:1}"

# Iterate over array
for fruit in "${fruits[@]}"; do
    echo "Fruit: $fruit"
done

# Iterate with index
for i in "${!fruits[@]}"; do
    echo "Index $i: ${fruits[$i]}"
done
```

### Associative Arrays

```bash
#!/bin/bash

# Declare associative array (requires Bash 4+)
declare -A user

# Add key-value pairs
user[name]="John"
user[age]=30
user[email]="john@example.com"

# Access values
echo "Name: ${user[name]}"
echo "Age: ${user[age]}"

# Check if key exists
if [ -v user[name] ]; then
    echo "Name is set"
fi

# Get all keys
echo "Keys: ${!user[@]}"

# Get all values
echo "Values: ${user[@]}"

# Iterate over associative array
for key in "${!user[@]}"; do
    echo "$key: ${user[$key]}"
done

# Remove key
unset user[age]

# Initialize with values
declare -A colors=(
    [red]="#FF0000"
    [green]="#00FF00"
    [blue]="#0000FF"
)

# Practical example: counting word occurrences
declare -A word_count
while read -r word; do
    ((word_count[$word]++))
done < <(echo "apple banana apple cherry banana apple" | tr ' ' '\n')

for word in "${!word_count[@]}"; do
    echo "$word: ${word_count[$word]}"
done
```

### Array Operations

```bash
#!/bin/bash

# Copy array
original=("a" "b" "c")
copy=("${original[@]}")

# Merge arrays
array1=("1" "2")
array2=("3" "4")
merged=("${array1[@]}" "${array2[@]}")
echo "Merged: ${merged[@]}"

# Filter array
numbers=(1 2 3 4 5 6 7 8 9 10)
even=()
for n in "${numbers[@]}"; do
    if [ $((n % 2)) -eq 0 ]; then
        even+=($n)
    fi
done
echo "Even numbers: ${even[@]}"

# Map operation (transform elements)
words=("hello" "world")
upper=()
for word in "${words[@]}"; do
    upper+=("$(echo "$word" | tr '[:lower:]' '[:upper:]')")
done
echo "Uppercase: ${upper[@]}"

# Find element in array
contains() {
    local element=$1
    shift
    local array=("$@")
    for item in "${array[@]}"; do
        if [ "$item" = "$element" ]; then
            return 0
        fi
    done
    return 1
}

fruits=("apple" "banana" "cherry")
if contains "banana" "${fruits[@]}"; then
    echo "Found banana"
fi

# Sort array (using external command)
sorted=($(printf '%s\n' "${fruits[@]}" | sort))
echo "Sorted: ${sorted[@]}"

# Reverse array
reversed=()
for ((i=${#fruits[@]}-1; i>=0; i--)); do
    reversed+=("${fruits[$i]}")
done
echo "Reversed: ${reversed[@]}"
```

## Error Handling

### Exit Status and Error Checking

```bash
#!/bin/bash

# Check exit status explicitly
cp source.txt destination.txt
if [ $? -eq 0 ]; then
    echo "Copy successful"
else
    echo "Copy failed"
    exit 1
fi

# Inline error checking
cp source.txt destination.txt || { echo "Copy failed"; exit 1; }

# Using && for success chaining
mkdir -p /tmp/mydir && cd /tmp/mydir && touch file.txt

# Capture and check
output=$(some_command 2>&1)
status=$?
if [ $status -ne 0 ]; then
    echo "Command failed with status $status"
    echo "Error: $output"
fi
```

### Set Options for Error Handling

```bash
#!/bin/bash

# Exit immediately if command fails
set -e

# Treat unset variables as error
set -u

# Fail on pipe errors
set -o pipefail

# Common combination for strict mode
set -euo pipefail

# Alternative: enable options individually
set -e  # Exit on error
set -u  # Error on undefined variable
set -o pipefail  # Catch pipe failures

# Disable options when needed
set +e  # Continue on error temporarily
risky_command
set -e  # Re-enable

# Check if running in strict mode
if [[ $- == *e* ]]; then
    echo "Running with set -e"
fi
```

### Trap for Cleanup and Error Handling

```bash
#!/bin/bash
set -euo pipefail

# Temporary file for cleanup
temp_file=""

# Cleanup function
cleanup() {
    local exit_code=$?
    echo "Cleaning up..."

    # Remove temporary files
    if [ -n "$temp_file" ] && [ -f "$temp_file" ]; then
        rm -f "$temp_file"
        echo "Removed temporary file: $temp_file"
    fi

    # Additional cleanup tasks
    # ...

    exit $exit_code
}

# Error handler
error_handler() {
    local line_no=$1
    local error_code=$2
    echo "Error on line $line_no: command exited with status $error_code"
}

# Set traps
trap cleanup EXIT  # Always run cleanup on exit
trap 'error_handler $LINENO $?' ERR  # Handle errors

# Trap multiple signals
trap 'echo "Interrupted!"; exit 130' INT TERM

# Main script
temp_file=$(mktemp)
echo "Created temp file: $temp_file"

# Simulate work
echo "data" > "$temp_file"

# Simulate error (uncomment to test)
# false

echo "Script completed successfully"
```

### Custom Error Functions

```bash
#!/bin/bash

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'  # No Color

# Error handling functions
die() {
    echo -e "${RED}ERROR: $*${NC}" >&2
    exit 1
}

warn() {
    echo -e "${YELLOW}WARNING: $*${NC}" >&2
}

# Assertion function
assert() {
    local condition=$1
    local message=${2:-"Assertion failed"}

    if ! eval "$condition"; then
        die "$message"
    fi
}

# Require command function
require_command() {
    local cmd=$1
    if ! command -v "$cmd" &> /dev/null; then
        die "Required command not found: $cmd"
    fi
}

# Require file function
require_file() {
    local file=$1
    if [ ! -f "$file" ]; then
        die "Required file not found: $file"
    fi
}

# Usage examples
require_command "git"
require_file "/etc/passwd"

assert '[ -d "/tmp" ]' "Directory /tmp does not exist"
assert '[ $(id -u) -ne 0 ]' "This script should not be run as root"

# Main script logic
echo "All checks passed!"
```

## Debugging Techniques

### Debug Mode with -x

```bash
#!/bin/bash

# Enable debug mode for entire script
set -x

# Or run script with debug flag
# bash -x script.sh

echo "Starting script"
name="Debug Test"
echo "Hello, $name"

# Disable debug mode
set +x

echo "Debug mode disabled"

# Enable debug mode for specific section
set -x
# Critical section
result=$((5 + 3))
set +x

echo "Result: $result"
```

### Verbose Mode with -v

```bash
#!/bin/bash

# Verbose mode shows commands before expansion
set -v

name="World"
echo "Hello, $name"

# Disable verbose
set +v

# Combine with -x for maximum detail
set -xv
for i in 1 2 3; do
    echo "Number: $i"
done
set +xv
```

### Debug Output to File

```bash
#!/bin/bash

# Redirect debug output to file
exec 2> debug.log
set -x

echo "This debug output goes to debug.log"
name="Test"
echo "Hello, $name"

# Or use BASH_XTRACEFD for separate debug file
exec 3> debug_trace.log
BASH_XTRACEFD=3
set -x

echo "Debug trace goes to debug_trace.log"
echo "Stderr still goes to terminal" >&2
```

### Custom Debug Functions

```bash
#!/bin/bash

# Debug level (0=off, 1=basic, 2=verbose)
DEBUG_LEVEL=${DEBUG_LEVEL:-0}

# Debug function
debug() {
    local level=${1:-1}
    shift
    if [ "$DEBUG_LEVEL" -ge "$level" ]; then
        echo "[DEBUG:$level] $*" >&2
    fi
}

# Trace function (shows file, line, function)
trace() {
    if [ "$DEBUG_LEVEL" -ge 2 ]; then
        echo "[TRACE] ${BASH_SOURCE[1]}:${BASH_LINENO[0]} ${FUNCNAME[1]}() - $*" >&2
    fi
}

# Debug dump variable
dump_var() {
    local var_name=$1
    local var_value=${!var_name}
    debug 1 "$var_name = '$var_value'"
}

# Example usage
process_data() {
    trace "Entering function"
    local input=$1
    debug 1 "Processing: $input"

    # Simulate processing
    local result="${input^^}"

    debug 2 "Intermediate result: $result"
    trace "Exiting function"
    echo "$result"
}

# Run with: DEBUG_LEVEL=2 ./script.sh
name="hello"
dump_var name
output=$(process_data "$name")
echo "Output: $output"
```

### PS4 for Enhanced Debug Output

```bash
#!/bin/bash

# Customize debug prompt
export PS4='+(${BASH_SOURCE}:${LINENO}): ${FUNCNAME[0]:+${FUNCNAME[0]}(): }'
set -x

my_function() {
    local var="test"
    echo "In function: $var"
}

my_function
echo "Done"

# Alternative: timestamp in debug output
export PS4='+ $(date +%H:%M:%S) ${BASH_SOURCE}:${LINENO}: '
set -x

echo "This shows timestamp"
sleep 1
echo "After sleep"
```

### Debugging Tools and Techniques

```bash
#!/bin/bash

# Print call stack
print_stack() {
    local i
    echo "Call stack:"
    for ((i=0; i<${#FUNCNAME[@]}; i++)); do
        echo "  [$i] ${FUNCNAME[$i]} (${BASH_SOURCE[$i]}:${BASH_LINENO[$i]})"
    done
}

# Breakpoint function
breakpoint() {
    echo "=== BREAKPOINT ==="
    echo "Location: ${BASH_SOURCE[1]}:${BASH_LINENO[0]}"
    echo "Function: ${FUNCNAME[1]}"
    echo "Press Enter to continue..."
    read
}

# Variable inspector
inspect() {
    local var_name=$1
    echo "=== INSPECT: $var_name ==="
    echo "Value: ${!var_name}"
    echo "Type: $(declare -p "$var_name" 2>/dev/null | cut -d' ' -f2)"
    echo "========================"
}

# Conditional breakpoint
conditional_break() {
    local condition=$1
    if eval "$condition"; then
        echo "Conditional breakpoint triggered: $condition"
        print_stack
        read -p "Press Enter to continue..."
    fi
}

# Example usage
counter=0
process() {
    ((counter++))
    conditional_break '[ $counter -eq 5 ]'
    echo "Processing item $counter"
}

for i in {1..10}; do
    process
done
```

## ShellCheck for Linting

ShellCheck is an excellent static analysis tool for shell scripts that catches common errors and suggests improvements.

### Installing ShellCheck

```bash
# Install on Ubuntu
sudo apt update
sudo apt install shellcheck

# Verify installation
shellcheck --version
```

### Using ShellCheck

```bash
# Check a script
shellcheck script.sh

# Check with specific shell
shellcheck --shell=bash script.sh

# Output formats
shellcheck --format=gcc script.sh      # GCC-style output
shellcheck --format=json script.sh     # JSON output
shellcheck --format=diff script.sh     # Diff format

# Exclude specific warnings
shellcheck --exclude=SC2086 script.sh

# Check from stdin
echo 'echo $var' | shellcheck -
```

### Common ShellCheck Warnings

```bash
#!/bin/bash

# SC2086: Double quote to prevent globbing and word splitting
# Bad:
files=$1
ls $files

# Good:
files=$1
ls "$files"

# SC2046: Quote command substitution
# Bad:
files=$(find . -name "*.txt")
rm $files

# Good:
while IFS= read -r -d '' file; do
    rm "$file"
done < <(find . -name "*.txt" -print0)

# SC2006: Use $(...) instead of legacy `...`
# Bad:
date=`date +%Y-%m-%d`

# Good:
date=$(date +%Y-%m-%d)

# SC2034: Variable appears unused
# Suppress with:
# shellcheck disable=SC2034
unused_var="this is intentionally unused"

# SC2155: Declare and assign separately
# Bad:
local output=$(some_command)

# Good:
local output
output=$(some_command)

# SC2164: Use cd ... || exit in case cd fails
# Bad:
cd /some/directory

# Good:
cd /some/directory || exit 1
```

### ShellCheck Configuration

Create a `.shellcheckrc` file in your project root:

```bash
# .shellcheckrc
# Set default shell
shell=bash

# Disable specific checks globally
disable=SC1091  # File not found (for sourced files)

# Enable optional checks
enable=all

# Set severity level
severity=style
```

### Integrating ShellCheck in CI/CD

```bash
#!/bin/bash
# lint.sh - Run ShellCheck on all shell scripts

set -euo pipefail

# Find all shell scripts
scripts=$(find . -type f -name "*.sh" -o -type f -exec sh -c 'head -1 "$1" | grep -q "^#!.*bash"' _ {} \; -print)

# Run ShellCheck
exit_code=0
for script in $scripts; do
    echo "Checking: $script"
    if ! shellcheck --severity=warning "$script"; then
        exit_code=1
    fi
done

exit $exit_code
```

## Best Practices

### Script Header Template

```bash
#!/bin/bash
#
# Script: backup.sh
# Description: Automated backup script for system files
# Author: Your Name <your.email@example.com>
# Date: 2024-01-15
# Version: 1.0.0
#
# Usage: ./backup.sh [options] <source> <destination>
#
# Options:
#   -h, --help      Show this help message
#   -v, --verbose   Enable verbose output
#   -n, --dry-run   Show what would be done without making changes
#
# Examples:
#   ./backup.sh /home/user /backup
#   ./backup.sh -v --dry-run /etc /backup/etc
#
# Dependencies:
#   - rsync
#   - gzip
#
# Exit codes:
#   0 - Success
#   1 - General error
#   2 - Invalid arguments
#   3 - Missing dependencies
#

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}")"

# Default values
VERBOSE=false
DRY_RUN=false
```

### Argument Parsing

```bash
#!/bin/bash
set -euo pipefail

# Default values
verbose=false
output_file=""
force=false

# Help function
show_help() {
    cat << EOF
Usage: ${0##*/} [OPTIONS] <input_file>

Options:
    -h, --help          Show this help message
    -v, --verbose       Enable verbose output
    -o, --output FILE   Specify output file
    -f, --force         Overwrite existing files

Arguments:
    input_file          The input file to process

Examples:
    ${0##*/} input.txt
    ${0##*/} -v -o result.txt input.txt
EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            verbose=true
            shift
            ;;
        -o|--output)
            output_file="$2"
            shift 2
            ;;
        -f|--force)
            force=true
            shift
            ;;
        -*)
            echo "Error: Unknown option: $1" >&2
            show_help >&2
            exit 2
            ;;
        *)
            # Positional argument
            input_file="$1"
            shift
            ;;
    esac
done

# Validate required arguments
if [ -z "${input_file:-}" ]; then
    echo "Error: Input file is required" >&2
    show_help >&2
    exit 2
fi

# Main logic
echo "Processing: $input_file"
[ "$verbose" = true ] && echo "Verbose mode enabled"
[ -n "$output_file" ] && echo "Output file: $output_file"
```

### Logging Functions

```bash
#!/bin/bash

# Log levels
LOG_LEVEL_DEBUG=0
LOG_LEVEL_INFO=1
LOG_LEVEL_WARN=2
LOG_LEVEL_ERROR=3

# Current log level (can be overridden)
LOG_LEVEL=${LOG_LEVEL:-$LOG_LEVEL_INFO}

# Log file (optional)
LOG_FILE=${LOG_FILE:-}

# Colors
if [ -t 1 ]; then
    RED='\033[0;31m'
    YELLOW='\033[1;33m'
    GREEN='\033[0;32m'
    BLUE='\033[0;34m'
    NC='\033[0m'
else
    RED=''
    YELLOW=''
    GREEN=''
    BLUE=''
    NC=''
fi

# Timestamp function
timestamp() {
    date +"%Y-%m-%d %H:%M:%S"
}

# Log function
log() {
    local level=$1
    local color=$2
    local message="${*:3}"
    local timestamp
    timestamp=$(timestamp)

    if [ "$level" -ge "$LOG_LEVEL" ]; then
        echo -e "${color}[$(timestamp)] $message${NC}"

        # Also write to log file if specified
        if [ -n "$LOG_FILE" ]; then
            echo "[$(timestamp)] $message" >> "$LOG_FILE"
        fi
    fi
}

# Convenience functions
log_debug() { log $LOG_LEVEL_DEBUG "$BLUE" "DEBUG: $*"; }
log_info() { log $LOG_LEVEL_INFO "$GREEN" "INFO: $*"; }
log_warn() { log $LOG_LEVEL_WARN "$YELLOW" "WARN: $*" >&2; }
log_error() { log $LOG_LEVEL_ERROR "$RED" "ERROR: $*" >&2; }

# Usage
log_info "Starting application"
log_debug "Debug information"
log_warn "This is a warning"
log_error "This is an error"
```

### Configuration Management

```bash
#!/bin/bash

# Default configuration
DEFAULT_CONFIG_FILE="${HOME}/.myapp/config"

# Load configuration
load_config() {
    local config_file=${1:-$DEFAULT_CONFIG_FILE}

    if [ -f "$config_file" ]; then
        # Source config file (be careful with untrusted files)
        # shellcheck source=/dev/null
        source "$config_file"
        log_info "Loaded configuration from: $config_file"
    else
        log_warn "Configuration file not found: $config_file"
    fi
}

# Save configuration
save_config() {
    local config_file=${1:-$DEFAULT_CONFIG_FILE}
    local config_dir
    config_dir=$(dirname "$config_file")

    # Create directory if needed
    mkdir -p "$config_dir"

    # Write configuration
    cat > "$config_file" << EOF
# Configuration file for MyApp
# Generated: $(date)

SERVER_HOST="${SERVER_HOST:-localhost}"
SERVER_PORT="${SERVER_PORT:-8080}"
LOG_LEVEL="${LOG_LEVEL:-1}"
EOF

    log_info "Saved configuration to: $config_file"
}

# Get config value with default
get_config() {
    local key=$1
    local default=${2:-}
    echo "${!key:-$default}"
}
```

### Complete Example Script

Here is a complete, well-structured Bash script that demonstrates many best practices:

```bash
#!/bin/bash
#
# Script: system_health_check.sh
# Description: Performs comprehensive system health checks on Ubuntu
# Author: System Administrator
# Version: 1.0.0
#

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

readonly SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}")"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_FILE="/var/log/health_check.log"

# Thresholds
readonly CPU_THRESHOLD=80
readonly MEMORY_THRESHOLD=80
readonly DISK_THRESHOLD=90

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m'

# ============================================================================
# Logging Functions
# ============================================================================

log() {
    local level=$1
    shift
    local message="$*"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "$@" >&2; }
log_error() { log "ERROR" "$@" >&2; }

print_status() {
    local status=$1
    local message=$2

    case $status in
        OK)
            echo -e "${GREEN}[OK]${NC} $message"
            ;;
        WARNING)
            echo -e "${YELLOW}[WARNING]${NC} $message"
            ;;
        CRITICAL)
            echo -e "${RED}[CRITICAL]${NC} $message"
            ;;
    esac
}

# ============================================================================
# Cleanup Function
# ============================================================================

cleanup() {
    local exit_code=$?
    # Cleanup temporary files if any
    [ -n "${temp_file:-}" ] && rm -f "$temp_file"

    if [ $exit_code -ne 0 ]; then
        log_error "Script exited with code: $exit_code"
    fi

    exit $exit_code
}

trap cleanup EXIT

# ============================================================================
# Health Check Functions
# ============================================================================

check_cpu_usage() {
    log_info "Checking CPU usage..."

    local cpu_usage
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print int($2)}')

    if [ "$cpu_usage" -ge "$CPU_THRESHOLD" ]; then
        print_status "CRITICAL" "CPU usage is ${cpu_usage}% (threshold: ${CPU_THRESHOLD}%)"
        return 1
    elif [ "$cpu_usage" -ge $((CPU_THRESHOLD - 20)) ]; then
        print_status "WARNING" "CPU usage is ${cpu_usage}%"
        return 0
    else
        print_status "OK" "CPU usage is ${cpu_usage}%"
        return 0
    fi
}

check_memory_usage() {
    log_info "Checking memory usage..."

    local memory_usage
    memory_usage=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')

    if [ "$memory_usage" -ge "$MEMORY_THRESHOLD" ]; then
        print_status "CRITICAL" "Memory usage is ${memory_usage}% (threshold: ${MEMORY_THRESHOLD}%)"
        return 1
    elif [ "$memory_usage" -ge $((MEMORY_THRESHOLD - 20)) ]; then
        print_status "WARNING" "Memory usage is ${memory_usage}%"
        return 0
    else
        print_status "OK" "Memory usage is ${memory_usage}%"
        return 0
    fi
}

check_disk_usage() {
    log_info "Checking disk usage..."

    local issues=0

    while read -r line; do
        local usage
        local mount
        usage=$(echo "$line" | awk '{print $5}' | tr -d '%')
        mount=$(echo "$line" | awk '{print $6}')

        if [ "$usage" -ge "$DISK_THRESHOLD" ]; then
            print_status "CRITICAL" "Disk usage on $mount is ${usage}%"
            ((issues++))
        elif [ "$usage" -ge $((DISK_THRESHOLD - 10)) ]; then
            print_status "WARNING" "Disk usage on $mount is ${usage}%"
        else
            print_status "OK" "Disk usage on $mount is ${usage}%"
        fi
    done < <(df -h | grep -E '^/dev/' | grep -v '/snap/')

    return "$issues"
}

check_services() {
    log_info "Checking critical services..."

    # Define critical services to check
    local -a services=("ssh" "cron")
    local issues=0

    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service" 2>/dev/null; then
            print_status "OK" "Service $service is running"
        else
            print_status "CRITICAL" "Service $service is not running"
            ((issues++))
        fi
    done

    return "$issues"
}

check_load_average() {
    log_info "Checking load average..."

    local load_1min
    local cpu_count

    load_1min=$(awk '{print $1}' /proc/loadavg)
    cpu_count=$(nproc)

    # Compare using bc for floating point
    if (( $(echo "$load_1min > $cpu_count" | bc -l) )); then
        print_status "WARNING" "Load average ($load_1min) exceeds CPU count ($cpu_count)"
        return 0
    else
        print_status "OK" "Load average is $load_1min (CPUs: $cpu_count)"
        return 0
    fi
}

# ============================================================================
# Help Function
# ============================================================================

show_help() {
    cat << EOF
Usage: $SCRIPT_NAME [OPTIONS]

Performs comprehensive system health checks on Ubuntu.

Options:
    -h, --help          Show this help message
    -q, --quiet         Suppress non-critical output
    -v, --verbose       Enable verbose output
    --cpu-only          Check only CPU usage
    --memory-only       Check only memory usage
    --disk-only         Check only disk usage

Examples:
    $SCRIPT_NAME                    # Run all checks
    $SCRIPT_NAME --cpu-only         # Check only CPU
    $SCRIPT_NAME -v                 # Run with verbose output

Exit Codes:
    0   All checks passed
    1   One or more checks failed
    2   Invalid arguments

EOF
}

# ============================================================================
# Main Function
# ============================================================================

main() {
    local check_cpu=true
    local check_memory=true
    local check_disk=true
    local check_services_flag=true
    local check_load=true
    local verbose=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            -q|--quiet)
                exec 1>/dev/null
                shift
                ;;
            --cpu-only)
                check_memory=false
                check_disk=false
                check_services_flag=false
                check_load=false
                shift
                ;;
            --memory-only)
                check_cpu=false
                check_disk=false
                check_services_flag=false
                check_load=false
                shift
                ;;
            --disk-only)
                check_cpu=false
                check_memory=false
                check_services_flag=false
                check_load=false
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_help >&2
                exit 2
                ;;
        esac
    done

    echo "============================================"
    echo "System Health Check - $(date)"
    echo "Host: $(hostname)"
    echo "============================================"
    echo

    local total_issues=0

    # Run selected checks
    if [ "$check_cpu" = true ]; then
        check_cpu_usage || ((total_issues++))
        echo
    fi

    if [ "$check_memory" = true ]; then
        check_memory_usage || ((total_issues++))
        echo
    fi

    if [ "$check_disk" = true ]; then
        check_disk_usage || ((total_issues+=$?))
        echo
    fi

    if [ "$check_services_flag" = true ]; then
        check_services || ((total_issues+=$?))
        echo
    fi

    if [ "$check_load" = true ]; then
        check_load_average || ((total_issues++))
        echo
    fi

    # Summary
    echo "============================================"
    if [ "$total_issues" -eq 0 ]; then
        print_status "OK" "All health checks passed!"
        log_info "Health check completed successfully"
    else
        print_status "CRITICAL" "$total_issues issue(s) detected!"
        log_warn "Health check completed with $total_issues issue(s)"
    fi
    echo "============================================"

    return "$total_issues"
}

# Run main function
main "$@"
```

## Summary

This guide covered the essential aspects of writing and debugging Bash scripts on Ubuntu:

1. **Basics**: Understanding shebang lines, file permissions, and script execution
2. **Variables**: Working with strings, numbers, arrays, and environment variables
3. **Conditionals**: Using if statements, test operators, and case statements
4. **Loops**: Implementing for, while, and until loops with proper control flow
5. **Functions**: Creating reusable code with proper scoping and return values
6. **I/O and Redirection**: Managing input, output, and file descriptors
7. **Command Substitution**: Capturing command output in variables
8. **Arrays**: Working with indexed and associative arrays
9. **Error Handling**: Using set options, traps, and custom error functions
10. **Debugging**: Leveraging -x, -v, PS4, and custom debugging techniques
11. **ShellCheck**: Using static analysis to catch common errors
12. **Best Practices**: Following conventions for maintainable scripts

By following these practices and techniques, you can write robust, maintainable, and debuggable Bash scripts that automate complex tasks on Ubuntu systems.

---

## Monitoring Your Scripts with OneUptime

Once your Bash scripts are deployed in production, monitoring their execution and health becomes critical. [OneUptime](https://oneuptime.com) provides comprehensive monitoring solutions that can help you track your script executions, alert you when scripts fail, and provide insights into script performance over time.

With OneUptime, you can:

- **Set up custom monitors** to track script exit codes and execution times
- **Configure alerts** to notify your team immediately when scripts fail
- **Create dashboards** to visualize script performance metrics
- **Integrate with your CI/CD pipeline** to monitor deployment scripts
- **Track resource usage** of your Ubuntu servers running automated scripts

Start monitoring your Bash scripts today with OneUptime and ensure your automation runs smoothly around the clock.
