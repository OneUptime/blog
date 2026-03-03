# How to Use the column and printf Commands for Formatted Output on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Command Line, Shell, Linux, Text Processing

Description: Learn to format terminal output into aligned tables using the column command and produce precisely formatted text using printf on Ubuntu with practical examples.

---

Raw command output is often hard to read at a glance. The `column` command formats data into aligned columns, and `printf` gives you precise control over text formatting. Both are indispensable when writing scripts that produce readable output or when processing structured data.

## The column Command

`column` takes input with a common delimiter and formats it into neatly aligned columns. It is part of the `util-linux` package, which is installed by default on Ubuntu.

### Basic Usage

```bash
# Format whitespace-separated data into columns
echo -e "name age city\nAlice 30 London\nBob 25 Tokyo\nCharlie 35 Paris" | column -t
```

Output:
```text
name     age  city
Alice    30   London
Bob      25   Tokyo
Charlie  35   Paris
```

The `-t` flag enables table mode, which aligns columns based on the widest entry in each.

### Specifying a Delimiter

```bash
# Format CSV data
cat employees.csv | column -t -s ','

# Format colon-delimited data (like /etc/passwd)
cut -d: -f1,3,6 /etc/passwd | column -t -s ':'

# Example output:
# root     0   /root
# daemon   1   /usr/sbin
# nobody   65534  /nonexistent
```

### Filling Columns vs. Rows

By default, `column` fills across rows. The `-x` flag fills down columns instead:

```bash
# Fill across (default)
echo "a b c d e f g h i" | tr ' ' '\n' | column

# Fill down columns instead
echo "a b c d e f g h i" | tr ' ' '\n' | column -x
```

### Controlling Number of Columns

```bash
# Display in exactly 3 columns
ls /usr/bin | column -c 3

# Set total output width
ls /usr/bin | column -c 80
```

### Adding Column Headers

The newer version of `column` (from util-linux 2.35+) supports JSON output and named columns:

```bash
# Check version
column --version

# For modern column: use --table-columns for headers
printf 'Alice 30 London\nBob 25 Tokyo\n' | column --table --table-columns NAME,AGE,CITY
```

### Practical Examples with column

```bash
# Nicely formatted disk usage
df -h | column -t

# Format process list (ps output is already columnar but column -t cleans it up)
ps aux | column -t | head -20

# Format /etc/fstab readably
column -t /etc/fstab

# Format IP routing table
ip route | column -t

# Show mounted filesystems in aligned format
mount | grep -v "tmpfs\|devtmpfs" | column -t
```

## The printf Command

`printf` is a shell builtin (and standalone command) that formats output using format strings, similar to C's `printf`. It gives precise control over field widths, padding, and number formatting.

### Basic Syntax

```bash
printf FORMAT [ARGUMENTS...]
```

### Format Specifiers

```text
%s    - string
%d    - decimal integer
%f    - floating point number
%e    - scientific notation
%g    - shorter of %f or %e
%x    - hexadecimal (lowercase)
%X    - hexadecimal (uppercase)
%o    - octal
%%    - literal percent sign
```

### Width and Padding

```bash
# Right-align string in 20-character field
printf "%20s\n" "hello"
#                hello

# Left-align with -
printf "%-20s\n" "hello"
# hello

# Combine width and string
printf "%-15s %5d %10s\n" "Alice" 30 "London"
# Alice           30     London

# Leading zeros for numbers
printf "%05d\n" 42
# 00042
```

### Formatted Tables in Scripts

This is where `printf` shines - generating aligned output in shell scripts:

```bash
#!/bin/bash
# Print a formatted table of service statuses

# Print header
printf "%-20s %-10s %-15s\n" "SERVICE" "STATUS" "UPTIME"
printf "%s\n" "----------------------------------------------"

# Print each row
services=("nginx" "postgresql" "redis")
for svc in "${services[@]}"; do
    status=$(systemctl is-active "$svc" 2>/dev/null || echo "unknown")
    uptime_val=$(systemctl show "$svc" --property=ActiveEnterTimestamp --value 2>/dev/null | head -1)
    printf "%-20s %-10s %-15s\n" "$svc" "$status" "${uptime_val:-N/A}"
done
```

### Number Formatting

```bash
# Format floating point with 2 decimal places
printf "%.2f\n" 3.14159
# 3.14

# Format large numbers with specific width
printf "%10.2f\n" 1234567.89
# 1234567.89

# Format bytes as GB
bytes=10737418240
printf "%.2f GB\n" $(echo "$bytes / 1073741824" | bc -l)
# 10.00 GB
```

### Repeating Output

```bash
# printf repeats when given more args than format specifiers
printf "%s\n" apple banana cherry
# apple
# banana
# cherry

# Print a separator line of dashes
printf '%0.s-' {1..50}; echo
# --------------------------------------------------
```

### Colors in printf

```bash
# ANSI color codes work in printf
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'  # No Color

printf "${GREEN}%-20s${NC} ${RED}%-10s${NC}\n" "service" "FAILED"
```

### Hex and Binary Output

```bash
# Print in hexadecimal
printf "%x\n" 255   # ff
printf "%X\n" 255   # FF
printf "0x%08X\n" 255  # 0x000000FF

# Print decimal as octal (useful for permissions)
printf "%o\n" 493   # 755
```

## Combining column and printf

For the most control, use `printf` to generate delimited rows and `column` to align them:

```bash
#!/bin/bash
# Generate formatted report combining printf and column

{
    # Header
    printf "NAME|SIZE|MODIFIED|PERMISSIONS\n"
    # Data rows
    for file in /etc/*.conf; do
        size=$(stat -c %s "$file")
        modified=$(stat -c %y "$file" | cut -d' ' -f1)
        perms=$(stat -c %A "$file")
        printf "%s|%d|%s|%s\n" "$(basename $file)" "$size" "$modified" "$perms"
    done
} | column -t -s '|'
```

This approach:
1. Uses `printf` for precise control over each field
2. Pipes through `column` for automatic width alignment
3. Uses a delimiter (`|`) that does not appear in the data

## Practical Script: System Summary

```bash
#!/bin/bash
# Print a formatted system summary

divider="========================================"

printf "\n%s\n" "$divider"
printf "%-20s %s\n" "Hostname:" "$(hostname)"
printf "%-20s %s\n" "OS:" "$(lsb_release -ds)"
printf "%-20s %s\n" "Kernel:" "$(uname -r)"
printf "%-20s %s\n" "Uptime:" "$(uptime -p)"
printf "%-20s %s\n" "CPU cores:" "$(nproc)"
printf "%-20s %s\n" "Total RAM:" "$(free -h | awk '/^Mem/{print $2}')"
printf "%-20s %s\n" "Used RAM:" "$(free -h | awk '/^Mem/{print $3}')"
printf "%s\n\n" "$divider"

# Disk usage table
echo "Disk Usage:"
df -h | grep -v tmpfs | column -t
```

`column` handles quick alignment of existing command output, while `printf` gives you complete control when generating output from scratch. Using both together covers nearly any formatting requirement in shell scripts.
