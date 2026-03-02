# How to Read and Process Files in Bash on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Bash, Scripting, Shell, Linux

Description: Learn how to read files line by line, process specific fields, parse structured formats, and handle file operations safely in Bash scripts on Ubuntu.

---

Reading and processing files is one of the most common things you'll do in shell scripts. Whether it's parsing a log file, processing a CSV, reading a config, or searching through text data, Bash provides the building blocks to handle these tasks. The key is knowing which approach works correctly for each file format and avoiding the common pitfalls that cause silent data corruption.

## Reading a File Line by Line

The most reliable way to read a file line by line:

```bash
#!/bin/bash

# Read each line of a file
while IFS= read -r line; do
    echo "Line: $line"
done < /etc/hosts
```

The critical parts:
- `IFS=` - clears the Internal Field Separator so leading whitespace is preserved
- `-r` - prevents backslash interpretation (so `\n` stays as two characters, not a newline)
- `< filename` - redirects the file as input to the `while` loop

Without `IFS=`, lines with leading spaces or tabs get those stripped. Without `-r`, backslash sequences get interpreted. Both will corrupt your data silently.

### Skipping Empty Lines and Comments

```bash
#!/bin/bash

config_file="/etc/myapp.conf"

while IFS= read -r line; do
    # Skip empty lines
    [[ -z "$line" ]] && continue

    # Skip lines starting with # (comments)
    [[ "$line" =~ ^[[:space:]]*# ]] && continue

    echo "Config: $line"
done < "$config_file"
```

### Reading with a Counter

```bash
#!/bin/bash

line_number=0
while IFS= read -r line; do
    line_number=$(( line_number + 1 ))
    echo "$line_number: $line"
done < /etc/passwd
```

## Reading Fields with a Delimiter

When each line has multiple fields separated by a delimiter, read them directly:

```bash
#!/bin/bash

# Read /etc/passwd - colon-delimited
while IFS=: read -r username password uid gid comment home shell; do
    # Skip system accounts (UID < 1000)
    [ "$uid" -lt 1000 ] && continue

    echo "User: $username | UID: $uid | Home: $home | Shell: $shell"
done < /etc/passwd
```

For CSV files:

```bash
#!/bin/bash

# Process a CSV file (assumes no commas inside quoted fields)
csv_file="/tmp/inventory.csv"

# Skip header line with tail
tail -n +2 "$csv_file" | while IFS=',' read -r name quantity price; do
    total=$(echo "$quantity * $price" | bc)
    echo "Item: $name | Qty: $quantity | Price: $price | Total: $total"
done
```

## Reading the Entire File at Once

Sometimes you need the whole file in a variable:

```bash
#!/bin/bash

# Read entire file into a variable
file_contents=$(cat /etc/hostname)
echo "Hostname: $file_contents"

# More efficient for small files - read builtin
file_path="/etc/os-release"
if [ -f "$file_path" ]; then
    content=$(<"$file_path")
    echo "OS info:"
    echo "$content"
fi
```

The `$(<filename)` form is slightly more efficient than `$(cat filename)` because it doesn't fork a subprocess.

## Reading Specific Lines

Extract specific lines using various tools:

```bash
#!/bin/bash

file="/var/log/syslog"

# Read line 5 only
line5=$(sed -n '5p' "$file")
echo "Line 5: $line5"

# Read lines 10 to 20
sed -n '10,20p' "$file"

# Read last 10 lines
tail -10 "$file"

# Read first 5 lines
head -5 "$file"

# Read from line 100 to the end
tail -n +100 "$file"
```

## Checking File Properties

Always validate files before processing them:

```bash
#!/bin/bash

process_log() {
    local log_file="$1"

    # Check file exists
    if [ ! -f "$log_file" ]; then
        echo "Error: File not found: $log_file" >&2
        return 1
    fi

    # Check file is readable
    if [ ! -r "$log_file" ]; then
        echo "Error: File not readable: $log_file" >&2
        return 1
    fi

    # Check file is not empty
    if [ ! -s "$log_file" ]; then
        echo "Warning: File is empty: $log_file"
        return 0
    fi

    # Get file size
    local size=$(stat -c %s "$log_file")
    local lines=$(wc -l < "$log_file")

    echo "Processing: $log_file ($lines lines, $size bytes)"

    # Process the file
    while IFS= read -r line; do
        [[ "$line" == *"ERROR"* ]] && echo "ERROR FOUND: $line"
    done < "$log_file"
}

process_log "/var/log/syslog"
```

## Processing Structured Config Files

Parse a simple `KEY=VALUE` config file:

```bash
#!/bin/bash

# Parse a key=value config file into an associative array
declare -A config

parse_config() {
    local config_file="$1"

    while IFS='=' read -r key value; do
        # Skip comments and blank lines
        [[ "$key" =~ ^[[:space:]]*# ]] && continue
        [[ -z "${key// /}" ]] && continue

        # Strip surrounding whitespace from key
        key="${key#"${key%%[![:space:]]*}"}"
        key="${key%"${key##*[![:space:]]}"}"

        # Strip surrounding whitespace and quotes from value
        value="${value#"${value%%[![:space:]]*}"}"
        value="${value%"${value##*[![:space:]]}"}"
        value="${value%\"}"
        value="${value#\"}"
        value="${value%\'}"
        value="${value#\'}"

        config["$key"]="$value"
    done < "$config_file"
}

# Create a sample config file
cat > /tmp/sample.conf << 'EOF'
# Database configuration
DB_HOST = localhost
DB_PORT = 5432
DB_NAME = "myapp"
DB_USER = 'appuser'
DB_PASS = secret123

# Application settings
LOG_LEVEL = info
MAX_CONNECTIONS = 100
EOF

parse_config /tmp/sample.conf

echo "DB Host: ${config[DB_HOST]}"
echo "DB Port: ${config[DB_PORT]}"
echo "Log Level: ${config[LOG_LEVEL]}"
```

## Processing Log Files

Extract useful information from log files:

```bash
#!/bin/bash

# Analyze an nginx access log
analyze_access_log() {
    local log_file="${1:-/var/log/nginx/access.log}"

    echo "=== Access Log Analysis: $log_file ==="

    # Total request count
    total=$(wc -l < "$log_file")
    echo "Total requests: $total"

    # Count by HTTP status code
    echo ""
    echo "Requests by status code:"
    awk '{print $9}' "$log_file" | sort | uniq -c | sort -rn | head -10

    # Top 10 requested URLs
    echo ""
    echo "Top 10 URLs:"
    awk '{print $7}' "$log_file" | sort | uniq -c | sort -rn | head -10

    # Error requests (4xx and 5xx)
    echo ""
    echo "Error requests:"
    awk '$9 >= 400' "$log_file" | wc -l
}

analyze_access_log /var/log/nginx/access.log
```

## Writing and Appending to Files

```bash
#!/bin/bash

output_file="/tmp/results.txt"

# Overwrite a file
echo "Results from $(date)" > "$output_file"

# Append to a file
echo "First entry" >> "$output_file"

# Write multi-line content
cat >> "$output_file" << 'EOF'
This is line 1
This is line 2
This is line 3
EOF

# Write from a loop
for i in {1..5}; do
    echo "Item $i: processed" >> "$output_file"
done

# Write to file and also show on screen (tee)
echo "Final result" | tee -a "$output_file"
```

## Atomic File Writes

For critical files, write to a temporary file and then move it to avoid partial writes:

```bash
#!/bin/bash

safe_write() {
    local target_file="$1"
    local content="$2"
    local tmp_file

    # Create temp file in same directory to ensure same filesystem
    tmp_file=$(mktemp "$(dirname "$target_file")/.tmp.XXXXXX")

    # Write content to temp file
    echo "$content" > "$tmp_file"

    # Check write succeeded
    if [ $? -ne 0 ]; then
        rm -f "$tmp_file"
        echo "Error: Failed to write temporary file" >&2
        return 1
    fi

    # Move temp file to target (atomic on same filesystem)
    mv "$tmp_file" "$target_file"
    echo "Written: $target_file"
}

safe_write "/tmp/output.txt" "Hello, World!"
```

## Processing Binary Files

For binary files, use `xxd` or `od` to inspect them, and specific tools for their format:

```bash
#!/bin/bash

# Check if a file is binary
is_binary() {
    local file="$1"
    # grep returns non-zero if file contains binary data
    if grep -qI '' "$file" 2>/dev/null; then
        return 1  # Text file
    else
        return 0  # Binary file
    fi
}

# Inspect binary file in hex
inspect_binary() {
    local file="$1"
    local bytes="${2:-64}"  # Show first 64 bytes by default

    echo "First $bytes bytes of $file:"
    xxd "$file" | head -$(( bytes / 16 + 1 ))
}

# Check magic bytes to identify file type
check_file_type() {
    local file="$1"
    local magic

    # Read first 4 bytes as hex
    magic=$(xxd -l 4 -p "$file" 2>/dev/null)

    case "$magic" in
        504b0304) echo "ZIP archive" ;;
        1f8b*)    echo "Gzip compressed" ;;
        7f454c46) echo "ELF executable" ;;
        25504446) echo "PDF document" ;;
        *)        echo "Unknown: $magic" ;;
    esac
}
```

## Finding and Processing Multiple Files

Process all files matching a pattern:

```bash
#!/bin/bash

# Process all .conf files in a directory
process_configs() {
    local config_dir="${1:-/etc}"

    # Find all .conf files (avoid subshell with while loop issue)
    while IFS= read -r -d '' config_file; do
        echo "Processing: $config_file"
        # Do something with each file
        line_count=$(wc -l < "$config_file")
        echo "  Lines: $line_count"
    done < <(find "$config_dir" -name "*.conf" -type f -print0 2>/dev/null)
}

process_configs /etc/nginx
```

The `-print0` and `-d ''` combination handles filenames with spaces correctly by using null bytes as delimiters instead of newlines.

Reading files safely in Bash comes down to a few consistent patterns: use `while IFS= read -r line` for line-by-line reading, validate files before processing, use `find -print0` with null delimiters for filenames, and write atomically for important outputs. These habits handle the edge cases that trip up simpler approaches.
