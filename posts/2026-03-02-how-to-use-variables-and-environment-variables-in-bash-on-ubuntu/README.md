# How to Use Variables and Environment Variables in Bash on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Bash, Scripting, Shell, Linux

Description: Master Bash variables and environment variables on Ubuntu, including scope, exports, special variables, parameter expansion, and reading from config files.

---

Variables are the backbone of any useful shell script. They store data, pass information between commands, and let you write scripts that adapt to different inputs and environments. Bash has two kinds: regular shell variables that exist only in the current shell session, and environment variables that get inherited by child processes.

Understanding the difference between these, and knowing how to use the various expansion and manipulation features, is what separates a working script from a robust one.

## Shell Variables vs Environment Variables

A regular shell variable is local to the current shell:

```bash
# Create a shell variable
my_var="hello"
echo $my_var  # prints: hello

# Run a subshell - child process can't see the variable
bash -c 'echo $my_var'  # prints nothing
```

An environment variable is exported so child processes inherit it:

```bash
# Export makes it an environment variable
export my_var="hello"

# Now child processes can see it
bash -c 'echo $my_var'  # prints: hello
```

You can also set a variable as an environment variable for just one command:

```bash
# Temporary environment - only available to that single command
MY_VAR="hello" bash -c 'echo $MY_VAR'
echo $MY_VAR  # Empty - not set in the parent shell
```

## Variable Assignment

The assignment syntax requires no spaces around `=`:

```bash
# Correct
name="John"
count=42
path="/var/log"

# Wrong - these all fail
name = "John"   # Error: command not found
count =42       # Error
```

String values with spaces must be quoted:

```bash
# Without quotes, only "Hello" is assigned; "World" is treated as a command
greeting="Hello World"

# Single quotes prevent all interpretation
literal='$HOME is not expanded here'

# Double quotes allow variable and command expansion
expanded="Home is $HOME and user is $(whoami)"
```

## Quoting Rules

Understanding when to quote is crucial:

```bash
name="John Doe"

# Always quote variables used in conditions and arguments
if [ -n "$name" ]; then       # Correct
    echo "Name: $name"
fi

# Without quotes, spaces in the value cause problems
if [ -n $name ]; then          # Wrong: splits into multiple words
    echo "Name: $name"
fi

# File operations - always quote variables with paths
file="/home/user/my file.txt"
ls "$file"      # Works: treats as single argument
ls $file        # Fails: splits on space, looks for two files
```

## Special Built-in Variables

Bash provides several built-in variables:

```bash
#!/bin/bash

# Script name and arguments
echo "Script: $0"
echo "First arg: $1"
echo "Second arg: $2"
echo "All args: $@"
echo "All args as one string: $*"
echo "Arg count: $#"

# Process IDs
echo "Current PID: $$"
echo "Last background PID: $!"

# Exit status of last command
ls /nonexistent 2>/dev/null
echo "Last exit code: $?"  # prints: 2

# Current options
echo "Shell options: $-"
```

## Parameter Expansion and Manipulation

Bash can manipulate variable values without external commands:

### Default Values

```bash
# Use default if variable is unset or empty
name="${1:-default_user}"
echo "Hello, $name"

# Use default only if variable is unset (not if empty)
name="${1-default_user}"

# Assign default if variable is unset
: "${config_file:=/etc/myapp.conf}"
echo "Config: $config_file"
```

### String Length

```bash
word="hello"
echo "Length: ${#word}"  # prints: 5
```

### Substring Extraction

```bash
text="Hello World"

# ${variable:offset:length}
echo "${text:0:5}"   # Hello (start at 0, take 5 chars)
echo "${text:6}"     # World (start at index 6 to end)
echo "${text: -5}"   # World (last 5 chars, note the space before -)
```

### Pattern Removal

```bash
filename="/var/log/syslog.1.gz"

# Remove prefix (shortest match)
echo "${filename#*/}"    # var/log/syslog.1.gz

# Remove prefix (longest match - greedy)
echo "${filename##*/}"   # syslog.1.gz  (like basename)

# Remove suffix (shortest match)
echo "${filename%.*}"    # /var/log/syslog.1

# Remove suffix (longest match - greedy)
echo "${filename%%.*}"   # /var/log/syslog

# Extract just the extension
ext="${filename##*.}"
echo "Extension: $ext"   # gz

# Extract directory name
dir="${filename%/*}"
echo "Directory: $dir"   # /var/log
```

### String Replacement

```bash
text="I love cats and cats love me"

# Replace first occurrence
echo "${text/cats/dogs}"   # I love dogs and cats love me

# Replace all occurrences
echo "${text//cats/dogs}"  # I love dogs and dogs love me

# Replace at start
path="/home/user/file.txt"
echo "${path/#\/home/\/mnt}"  # /mnt/user/file.txt

# Case conversion (Bash 4+)
word="Hello World"
echo "${word,,}"   # hello world (all lowercase)
echo "${word^^}"   # HELLO WORLD (all uppercase)
echo "${word^}"    # Hello World (capitalize first)
```

## Arrays

Bash supports indexed arrays:

```bash
# Define an array
fruits=("apple" "banana" "cherry")

# Access elements
echo "${fruits[0]}"     # apple
echo "${fruits[1]}"     # banana
echo "${fruits[-1]}"    # cherry (last element)

# All elements
echo "${fruits[@]}"     # apple banana cherry

# Number of elements
echo "${#fruits[@]}"    # 3

# Add an element
fruits+=("date")

# Iterate over array
for fruit in "${fruits[@]}"; do
    echo "Fruit: $fruit"
done

# Slice of array (offset:length)
echo "${fruits[@]:1:2}"  # banana cherry
```

## Associative Arrays (Hash Maps)

Bash 4+ supports key-value associative arrays:

```bash
# Declare an associative array
declare -A config

# Set values
config[host]="localhost"
config[port]="5432"
config[database]="myapp"
config[user]="dbuser"

# Access values
echo "Host: ${config[host]}"
echo "Port: ${config[port]}"

# Iterate over keys and values
for key in "${!config[@]}"; do
    echo "$key = ${config[$key]}"
done
```

## Environment Variables

View current environment variables:

```bash
# Print all environment variables
env

# Or
printenv

# Print a specific one
printenv HOME
echo $PATH

# Check if a variable is in the environment
if printenv MY_VAR > /dev/null 2>&1; then
    echo "MY_VAR is exported"
fi
```

## Reading Configuration from Files

Scripts often need to load settings from a config file rather than hardcoding them:

```bash
# Create a config file (key=value format)
cat > /tmp/myapp.conf << 'EOF'
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp
DB_USER=appuser
LOG_LEVEL=info
EOF
```

Source the file to load its variables:

```bash
#!/bin/bash
# Load configuration from file

CONFIG_FILE="${1:-/etc/myapp.conf}"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Config file not found: $CONFIG_FILE"
    exit 1
fi

# Source the config file - variables become available in script
# shellcheck source=/dev/null
source "$CONFIG_FILE"

# Now use the variables
echo "Connecting to $DB_HOST:$DB_PORT/$DB_NAME as $DB_USER"
```

For more secure loading that validates the format:

```bash
#!/bin/bash
# Safe config file loading - only read KEY=VALUE lines

load_config() {
    local config_file="$1"
    local line key value

    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ "$key" =~ ^[[:space:]]*# ]] && continue
        [[ -z "$key" ]] && continue

        # Strip whitespace
        key="${key// /}"
        value="${value//\"/}"

        # Export only if key looks valid
        if [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
            export "$key=$value"
        fi
    done < "$config_file"
}

load_config "/etc/myapp.conf"
echo "DB host is: $DB_HOST"
```

## Declaring Variable Types

Bash can constrain variable types:

```bash
# Declare an integer - arithmetic works without $(())
declare -i count=5
count+=3
echo $count  # 8

# Read-only variable - cannot be changed
declare -r CONSTANT="immutable"
CONSTANT="new value"  # Error: readonly variable

# Lowercase all values assigned to this variable
declare -l lower_var
lower_var="HELLO"
echo $lower_var  # hello
```

## Unsetting Variables

Remove a variable when it's no longer needed:

```bash
name="temporary"
echo $name  # temporary

unset name
echo $name  # empty

# Unset a function
my_func() { echo "hello"; }
unset -f my_func
```

Getting these fundamentals right makes everything else in Bash scripting - loops, functions, error handling - much more manageable. Variables with proper quoting and expansion avoid the majority of bugs you'd otherwise spend time debugging.
