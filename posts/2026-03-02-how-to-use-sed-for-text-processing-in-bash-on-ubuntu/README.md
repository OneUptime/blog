# How to Use sed for Text Processing in Bash on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Bash, Sed, Text Processing, Linux

Description: Learn how to use sed for text substitution, deletion, insertion, and transformation in Bash scripts on Ubuntu, with practical real-world examples.

---

`sed` (stream editor) processes text line by line, applying editing commands to each line as it passes through. It's one of the most useful tools in a sysadmin's toolkit for search-and-replace operations, line filtering, and text transformation - all without opening a text editor. On Ubuntu, GNU sed is installed by default.

The mental model for sed: it reads input line by line into a "pattern space", applies your commands, and prints the result. You can filter which lines commands apply to using address patterns.

## Basic Syntax

```bash
sed [options] 'command' input_file
```

Common options:
- `-i` - edit file in place (modifies the file directly)
- `-i.bak` - edit in place with a backup (creates `.bak` copy first)
- `-n` - suppress automatic printing (print only when explicitly told)
- `-e` - specify multiple commands
- `-E` or `-r` - use extended regular expressions

## Substitution: The Most Common Operation

The `s` command substitutes text:

```bash
# Basic substitution: s/find/replace/
# Replace the first occurrence on each line
sed 's/foo/bar/' file.txt

# Replace ALL occurrences on each line (g = global flag)
sed 's/foo/bar/g' file.txt

# Case-insensitive replacement (i flag)
sed 's/foo/bar/gi' file.txt

# Replace second occurrence only
sed 's/foo/bar/2' file.txt
```

### Real-World Substitution Examples

```bash
# Change a config value in a file
# Replace "debug" with "info" in the log level setting
sed 's/log_level=debug/log_level=info/' /etc/myapp.conf

# Normalize line endings (Windows CRLF to Unix LF)
sed 's/\r//' windows-file.txt > unix-file.txt

# Remove trailing whitespace from all lines
sed 's/[[:space:]]*$//' file.txt

# Remove leading whitespace
sed 's/^[[:space:]]*//' file.txt

# Remove both leading and trailing whitespace
sed 's/^[[:space:]]*//;s/[[:space:]]*$//' file.txt

# Comment out a specific line
sed 's/^ServerName/#ServerName/' /etc/apache2/apache2.conf
```

### In-Place Editing

The `-i` option modifies files directly - very useful for config automation:

```bash
# Update a value in a config file (always backup first in production)
sed -i.bak 's/^#Port 22$/Port 2222/' /etc/ssh/sshd_config

# Verify the change
grep "^Port" /etc/ssh/sshd_config

# If something went wrong, restore the backup
mv /etc/ssh/sshd_config.bak /etc/ssh/sshd_config
```

### Using Captured Groups

Parentheses capture matched text that you can reference with `\1`, `\2`, etc.:

```bash
# Swap the first two words on each line
# Requires -E for extended regex (or escape with \(...\))
echo "hello world" | sed -E 's/^(\S+)\s+(\S+)/\2 \1/'
# Output: world hello

# Extract IP addresses from log entries
# Input: "2026-03-02 10:00:00 Connection from 192.168.1.100:54321"
echo "Connection from 192.168.1.100:54321" | sed -E 's/.*from ([0-9.]+):.*/\1/'
# Output: 192.168.1.100

# Reformat dates: YYYY-MM-DD to DD/MM/YYYY
echo "2026-03-02" | sed -E 's/([0-9]{4})-([0-9]{2})-([0-9]{2})/\3\/\2\/\1/'
# Output: 02/03/2026
```

## Address Patterns: Targeting Specific Lines

By default, sed applies commands to every line. Address patterns restrict which lines are affected.

### Line Numbers

```bash
# Apply command only to line 5
sed '5s/foo/bar/' file.txt

# Apply to lines 5 through 10
sed '5,10s/foo/bar/' file.txt

# Apply to all lines from 5 to end
sed '5,$s/foo/bar/' file.txt

# Apply to every other line (step address - GNU sed)
sed '1~2s/foo/bar/' file.txt  # Odd lines only
sed '0~2s/foo/bar/' file.txt  # Even lines only
```

### Pattern Matching as Address

```bash
# Apply substitution only to lines containing "ERROR"
sed '/ERROR/s/localhost/server01/' logfile.txt

# Apply to lines NOT containing "ERROR"
sed '/ERROR/!s/active/inactive/' config.txt

# Apply between two patterns (inclusive)
sed '/START/,/END/s/foo/bar/' file.txt
```

## Deleting Lines

The `d` command deletes lines:

```bash
# Delete all blank lines
sed '/^[[:space:]]*$/d' file.txt

# Delete all comment lines (starting with #)
sed '/^[[:space:]]*#/d' file.txt

# Delete both blank lines and comments
sed '/^[[:space:]]*#/d;/^[[:space:]]*$/d' file.txt

# Delete line 5
sed '5d' file.txt

# Delete lines 5 through 10
sed '5,10d' file.txt

# Delete lines containing "test" or "debug"
sed '/test\|debug/d' file.txt
```

## Printing Specific Lines

With `-n` (suppress output) and `p` (print), you can extract specific lines:

```bash
# Print only line 10
sed -n '10p' file.txt

# Print lines 10-20
sed -n '10,20p' file.txt

# Print lines matching a pattern (like grep)
sed -n '/ERROR/p' /var/log/syslog

# Print line numbers with matching lines
sed -n '/ERROR/{=;p}' /var/log/syslog
```

## Inserting and Appending Text

### Insert Before a Line

```bash
# Insert a line before line 3
sed '3i\New line inserted here' file.txt

# Insert before a matching line
sed '/ServerName/i\# Server configuration below' /etc/apache2/apache2.conf
```

### Append After a Line

```bash
# Append a line after line 5
sed '5a\Appended line here' file.txt

# Append after a matching line
sed '/^GRUB_CMDLINE_LINUX=/a\# End of GRUB settings' /etc/default/grub
```

### Replace an Entire Line

```bash
# Replace line 4 entirely
sed '4c\Replacement line content' file.txt

# Replace a line matching a pattern
sed '/^ServerName.*/c\ServerName example.com' /etc/apache2/sites-available/000-default.conf
```

## Multiple Commands

```bash
# Use -e for multiple commands
sed -e 's/foo/bar/g' -e 's/baz/qux/g' file.txt

# Or use semicolons between commands
sed 's/foo/bar/g; s/baz/qux/g' file.txt

# Or use a command script file
cat > /tmp/sed-commands.sed << 'EOF'
s/foo/bar/g
s/baz/qux/g
/^#/d
/^$/d
EOF

sed -f /tmp/sed-commands.sed file.txt
```

## Practical Script: Update nginx Virtual Host Config

```bash
#!/bin/bash
# update-vhost.sh - Update nginx virtual host configuration

vhost_file="/etc/nginx/sites-available/mysite"
server_name="$1"
new_root="$2"

if [ -z "$server_name" ] || [ -z "$new_root" ]; then
    echo "Usage: $0 <server_name> <document_root>"
    exit 1
fi

# Backup the file
cp "$vhost_file" "${vhost_file}.bak"

# Update server_name
sed -i "s/server_name .*/server_name $server_name;/" "$vhost_file"

# Update document root
sed -i "s|root .*;|root $new_root;|" "$vhost_file"

# Enable the site (if not already enabled)
if [ ! -f "/etc/nginx/sites-enabled/mysite" ]; then
    ln -s "$vhost_file" /etc/nginx/sites-enabled/
fi

echo "Updated $vhost_file"
nginx -t && systemctl reload nginx
```

## Practical Script: Remove Sensitive Data from Logs

```bash
#!/bin/bash
# sanitize-logs.sh - Remove sensitive patterns from log files

sanitize_log() {
    local input_file="$1"
    local output_file="${2:-${input_file%.log}-sanitized.log}"

    sed -E \
        -e 's/password=[^&" ]*/password=REDACTED/gi' \
        -e 's/token=[^&" ]*/token=REDACTED/gi' \
        -e 's/api_key=[^&" ]*/api_key=REDACTED/gi' \
        -e 's/[0-9]{3}-[0-9]{2}-[0-9]{4}/SSN-REDACTED/g' \
        -e 's/[0-9]{16}/CARD-REDACTED/g' \
        "$input_file" > "$output_file"

    echo "Sanitized log written to: $output_file"
}

sanitize_log /var/log/app/access.log
```

## Working with Multi-line Patterns

By default, sed works one line at a time. For multi-line operations, the `N` command reads the next line into the pattern space:

```bash
# Join continuation lines (lines ending with \)
sed ':a; /\\$/{N; s/\\\n//; ba}' file.txt

# Delete a line and the line after it
sed '/pattern/{N;d}' file.txt

# Squeeze multiple blank lines into one
sed '/^$/{ N; /^\n$/d }' file.txt
```

## Useful Character Classes

GNU sed supports POSIX character classes:

```bash
# [:alpha:] - letters
# [:digit:] - digits
# [:alnum:] - letters and digits
# [:space:] - whitespace including tabs
# [:upper:] - uppercase letters
# [:lower:] - lowercase letters
# [:blank:] - space and tab only

# Convert all uppercase to lowercase
sed 's/[[:upper:]]/\L&/g' file.txt  # GNU sed extension

# Remove non-printable characters
sed 's/[^[:print:]]//g' file.txt
```

Sed is most powerful when combined with other tools in a pipeline. A command like `grep -v "^#" config.conf | sed 's/[[:space:]]//g'` strips comments and whitespace in two steps, each tool doing what it does best.
