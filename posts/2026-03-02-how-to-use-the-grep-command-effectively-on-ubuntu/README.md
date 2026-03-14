# How to Use the grep Command Effectively on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Grep, Shell, Text Processing

Description: Master the grep command on Ubuntu with practical examples covering regex patterns, file search, context lines, color output, and combining grep with other tools.

---

`grep` (Global Regular Expression Print) searches files for lines matching a pattern and prints them. It's one of the most-used commands on any Linux system, and knowing it well saves significant time when investigating logs, searching code, or processing data.

Ubuntu ships with GNU grep, which has extensions beyond the POSIX standard. This guide covers the most useful options with real examples.

## Basic Usage

```bash
# Search for a pattern in a file
grep "pattern" filename

# Search multiple files
grep "error" /var/log/syslog /var/log/auth.log

# Search all files in a directory
grep "error" /var/log/*

# Search recursively in a directory and subdirectories
grep -r "config" /etc/nginx/
```

## Case-Insensitive Search

```bash
# Match regardless of case
grep -i "error" /var/log/syslog

# Matches: error, Error, ERROR, ErRoR
```

## Inverting Matches

```bash
# Print lines that do NOT match the pattern
grep -v "^#" /etc/hosts         # Skip comment lines
grep -v "^$" /etc/hosts         # Skip blank lines
grep -v "^#" /etc/ssh/sshd_config | grep -v "^$"  # Skip both
```

## Showing Line Numbers

```bash
# Show the line number of each match
grep -n "PermitRootLogin" /etc/ssh/sshd_config

# Useful for knowing exactly where in a file a match appears
grep -n "error\|warning" /var/log/nginx/error.log | head -20
```

## Counting Matches

```bash
# Count matching lines (not occurrences - each matching line counts once)
grep -c "Failed password" /var/log/auth.log

# Count matches per file
grep -c "error" /var/log/*.log
```

## Showing Filenames Only

```bash
# Print only the filenames that contain matches
grep -l "ServerName" /etc/nginx/sites-available/*

# Print filenames that do NOT contain the pattern
grep -L "ServerName" /etc/nginx/sites-available/*
```

## Context Lines

Show lines before and after a match for context:

```bash
# Show 3 lines after each match
grep -A 3 "FATAL" /var/log/app.log

# Show 3 lines before each match
grep -B 3 "FATAL" /var/log/app.log

# Show 3 lines before AND after each match
grep -C 3 "FATAL" /var/log/app.log
```

Context is invaluable when investigating errors - you need to see what happened before and after the failure, not just the error line itself.

## Recursive Search with File Filtering

```bash
# Search recursively, only in .conf files
grep -r "listen 80" /etc/nginx/ --include="*.conf"

# Search recursively, exclude certain files
grep -r "TODO" /var/www/ --exclude="*.min.js" --exclude-dir=".git"

# Search recursively in multiple file types
grep -r "db_password" /var/www/ --include="*.php" --include="*.env"
```

## Regular Expressions

grep uses Basic Regular Expressions (BRE) by default. Use `-E` or `-P` for more powerful patterns.

### Basic Regex (BRE)

```bash
# Match start of line
grep "^root" /etc/passwd

# Match end of line
grep "bash$" /etc/passwd

# Match any character (.)
grep "....." /etc/hostname  # Lines with at least 5 chars

# Match zero or more of preceding character (*)
grep "erro*r" logfile.txt  # Matches: errr, error, erroor, etc.

# Character classes
grep "[0-9]" /etc/hosts     # Lines containing a digit
grep "[A-Z]" file.txt       # Lines containing uppercase letters
```

### Extended Regex with -E

The `-E` flag enables extended regex (ERE), which avoids backslash escaping for `+`, `?`, `|`, `()`:

```bash
# One or more (+)
grep -E "https?://" urls.txt   # Matches http:// or https://

# Zero or one (?)
grep -E "colou?r" file.txt     # Matches color or colour

# Alternation (|)
grep -E "error|warning|fatal" /var/log/syslog

# Grouping
grep -E "(WARN|ERROR):" app.log

# Quantifiers
grep -E "[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}" /var/log/auth.log  # IP addresses
```

### Perl-Compatible Regex with -P

For more advanced patterns, `-P` enables Perl-compatible regex:

```bash
# Non-greedy matching
grep -P "\".*?\"" config.json

# Lookahead: find "password" not followed by "="
grep -P "password(?!=)" config.txt

# Named character classes
grep -P "\d{4}-\d{2}-\d{2}" logs/  # ISO date format

# Match specific number of characters
grep -P "^\S{8,}$" passwords.txt   # Lines with 8+ non-space chars
```

## Fixed String Search (No Regex)

```bash
# -F treats the pattern as a literal string, not regex
# Useful when your pattern contains regex special characters
grep -F "192.168.1.100" /var/log/nginx/access.log

# Much faster for literal string searches in large files
grep -F "payment_gateway_error" /var/log/app.log

# Multiple fixed patterns from a file
echo -e "error\nwarning\nfatal" > /tmp/patterns.txt
grep -F -f /tmp/patterns.txt /var/log/syslog
```

## Searching Binary Files

```bash
# By default, grep skips binary files
# Force text mode with -a
grep -a "pattern" binary_file

# Or tell grep how to handle binary files
grep --binary-files=text "pattern" file
```

## Practical Examples

### Find Failed SSH Login Attempts

```bash
# Count failed login attempts per IP
grep "Failed password" /var/log/auth.log | \
    grep -oE "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" | \
    sort | uniq -c | sort -rn | head -20
```

### Find Configuration Files Missing a Setting

```bash
# Find nginx config files that don't have ssl_certificate configured
grep -L "ssl_certificate" /etc/nginx/sites-enabled/*
```

### Search Logs for Errors in a Time Window

```bash
# Find errors from a specific hour
grep "2026-03-02 10:" /var/log/app.log | grep -i "error"

# Find slow queries (over 1000ms) in mysql slow log
grep -E "Query_time: [1-9][0-9]*\." /var/log/mysql/slow.log
```

### Extract Unique Values from Log Fields

```bash
# Get all unique HTTP methods from nginx access log
grep -oE '"(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH)' /var/log/nginx/access.log | \
    sort | uniq -c | sort -rn

# Get all unique user agents
grep -oP '(?<=" )\S+ \(.*?\)' /var/log/nginx/access.log | \
    sort | uniq -c | sort -rn | head -10
```

### Find Files Containing Multiple Patterns

```bash
# Files containing both "password" and "plaintext"
# (two-pass: find files matching first pattern, then filter for second)
grep -rl "password" /var/www/ | xargs grep -l "plaintext"
```

### Check if a Service Config Is Valid

```bash
# Verify that all required directives are present
required_directives=("listen" "server_name" "root")
config_file="/etc/nginx/sites-available/mysite"

for directive in "${required_directives[@]}"; do
    if ! grep -q "$directive" "$config_file"; then
        echo "Missing required directive: $directive"
    fi
done
```

## Color Output

GNU grep supports colored output:

```bash
# Enable color (usually default in modern Ubuntu)
grep --color=auto "pattern" file

# Always show color even when piping
grep --color=always "pattern" file | less -R

# The GREP_COLORS environment variable controls colors
# Default highlights matched text in red
```

## Combining with Other Commands

```bash
# Filter ps output for a process name
ps aux | grep "[n]ginx"  # The brackets prevent grep from matching itself

# Monitor live log file for errors
tail -f /var/log/syslog | grep -i "error\|critical"

# Search dmesg output
dmesg | grep -i "usb\|error"

# Find which package installed a file
dpkg -l | grep -i "nginx"

# Check if a port is in use
ss -tulnp | grep ":80 "
```

The `[n]ginx` pattern in the ps example is a neat trick: the grep process itself appears in `ps` output as `grep nginx`, but `[n]ginx` matches `nginx` while the character class `[n]` doesn't match the square bracket in `grep [n]ginx`. This prevents the grep command from appearing in its own output.

## Grep Cheat Sheet

Common option combinations to bookmark:

```bash
grep -rn "pattern" dir/          # Recursive with line numbers
grep -ri "pattern" dir/          # Recursive case-insensitive
grep -rn "pattern" dir/ --include="*.py"  # Recursive in .py files only
grep -v "^#\|^$" config.conf     # Remove comments and blank lines
grep -c "pattern" file           # Count matching lines
grep -l "pattern" dir/*          # List files with matches
grep -A2 -B2 "pattern" file      # 2 lines of context
grep -E "pat1|pat2" file         # Either pattern
grep -oE "[0-9.]+" file          # Extract only the match (not whole line)
```

The `-o` (only) flag deserves special mention: it prints only the matched portion of each line, one match per line. Combined with `-E` for regex patterns, it's the fastest way to extract structured data from text without needing awk or sed.
