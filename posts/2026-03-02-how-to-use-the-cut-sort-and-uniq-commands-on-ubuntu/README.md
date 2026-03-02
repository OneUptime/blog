# How to Use the cut, sort, and uniq Commands on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Command Line, Shell, Linux, Text Processing

Description: Master the cut, sort, and uniq commands on Ubuntu to slice fields from text, sort data in various orders, and eliminate duplicate lines efficiently.

---

Three commands - `cut`, `sort`, and `uniq` - show up constantly in shell pipelines for processing structured text. Whether you are parsing log files, analyzing CSV data, or cleaning up lists, understanding these tools and how they work together will save you significant time.

## The cut Command

`cut` extracts specific columns or fields from lines of text. It works on fixed-width fields (character positions) or delimiter-separated fields.

### Cutting by Character Position

```bash
# Extract characters 1 through 10 from each line
cut -c 1-10 /var/log/auth.log

# Extract only the 5th character
cut -c 5 /etc/passwd

# Extract characters 1-3 and 7-9
cut -c 1-3,7-9 somefile.txt
```

### Cutting by Field (Delimiter)

The `-d` flag sets the delimiter and `-f` selects which fields to extract.

```bash
# Extract the username field (field 1) from /etc/passwd
# Fields are colon-separated in that file
cut -d ':' -f 1 /etc/passwd

# Extract username and home directory (fields 1 and 6)
cut -d ':' -f 1,6 /etc/passwd

# Extract fields 3 through 5
cut -d ':' -f 3-5 /etc/passwd
```

### Working with CSV Data

```bash
# Given a file: name,age,city
# Extract just the city column (field 3)
cut -d ',' -f 3 employees.csv

# Extract name and age (fields 1 and 2)
cut -d ',' -f 1,2 employees.csv

# Skip the first line (header) and extract emails
tail -n +2 users.csv | cut -d ',' -f 3
```

### Extracting Everything Except Certain Fields

The `--complement` flag inverts the selection.

```bash
# Show everything except field 2
cut -d ':' -f 2 --complement /etc/passwd
```

## The sort Command

`sort` reorders lines of text. By default it sorts lexicographically (alphabetically), but many flags change that behavior.

### Basic Sorting

```bash
# Sort lines alphabetically
sort names.txt

# Sort in reverse order
sort -r names.txt

# Sort and ignore case
sort -f names.txt
```

### Numeric Sorting

Without `-n`, numbers sort lexicographically ("10" comes before "9"). Always use `-n` for numeric data.

```bash
# Wrong - lexicographic sort of numbers
echo -e "10\n2\n20\n1" | sort
# Output: 1, 10, 2, 20

# Correct - numeric sort
echo -e "10\n2\n20\n1" | sort -n
# Output: 1, 2, 10, 20

# Sort in reverse numeric order (largest first)
sort -rn sizes.txt
```

### Sorting by a Specific Field

```bash
# Sort /etc/passwd by UID (field 3, numeric)
sort -t ':' -k 3 -n /etc/passwd

# Sort CSV by the second column (age)
sort -t ',' -k 2 -n employees.csv

# Sort by third field, then by first field as tiebreaker
sort -t ',' -k 3,3 -k 1,1 employees.csv
```

The `-k` syntax `-k 3,3` means "start sorting at field 3, stop at field 3." Without the stop position, sort reads to end of line.

### Human-Readable Size Sorting

```bash
# Sort du output correctly (handles K, M, G suffixes)
du -sh /var/* | sort -h
```

### Stable Sort

```bash
# Preserve original order for equal elements
sort -s -k 2 data.txt
```

## The uniq Command

`uniq` filters adjacent duplicate lines. It only works on sorted input - which is why it almost always appears after `sort`.

### Basic Deduplication

```bash
# Remove consecutive duplicate lines
sort names.txt | uniq

# Shorthand: sort -u does sort + uniq in one step
sort -u names.txt
```

### Count Occurrences

```bash
# Show each unique line and how many times it appeared
sort access.log | uniq -c

# Most common values first
sort access.log | uniq -c | sort -rn
```

This pattern - `sort | uniq -c | sort -rn` - is extremely common for frequency analysis.

### Show Only Duplicates or Unique Lines

```bash
# Show only lines that appear more than once
sort names.txt | uniq -d

# Show only lines that appear exactly once
sort names.txt | uniq -u
```

### Case-Insensitive Deduplication

```bash
# Treat upper and lowercase as the same
sort names.txt | uniq -i
```

## Real-World Pipeline Examples

### Top 10 IP addresses from an access log

```bash
# Extract IP (field 1), count occurrences, sort by count
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10
```

### List unique usernames who logged in

```bash
# Extract usernames from auth.log successful logins
grep "Accepted" /var/log/auth.log | awk '{print $9}' | sort | uniq
```

### Find duplicate file names in a directory tree

```bash
find /home -type f | xargs -I {} basename {} | sort | uniq -d
```

### Analyze CSV data - count users by city

```bash
# File: name,email,city
cut -d ',' -f 3 users.csv | sort | uniq -c | sort -rn
```

### Find the most common HTTP status codes

```bash
awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn
```

### Extract and deduplicate installed package names

```bash
dpkg -l | awk '/^ii/{print $2}' | cut -d ':' -f 1 | sort | uniq
```

## Combining All Three

Here is a scenario: you have a raw log file with timestamps, IPs, and actions, and you want to find the top 5 most active unique IPs for a specific action.

```bash
# Log format: timestamp ip action
grep "LOGIN_FAIL" security.log | cut -d ' ' -f 2 | sort | uniq -c | sort -rn | head -5
```

Step by step:
1. `grep` filters to relevant lines
2. `cut` extracts the IP field
3. `sort` prepares input for uniq
4. `uniq -c` counts occurrences
5. `sort -rn` puts highest counts first
6. `head -5` shows only top 5

## Tips for Production Use

When working with large files, `sort` can use significant memory. Control this with `-S`:

```bash
# Limit sort to 500MB of memory, spill to disk if needed
sort -S 500M large_file.txt
```

For parallel sorting on multi-core systems:

```bash
# Use 4 parallel threads
sort --parallel=4 large_file.txt
```

These three commands - `cut`, `sort`, and `uniq` - form the backbone of text processing pipelines on Ubuntu. Combining them with `awk`, `grep`, and `head`/`tail` covers the vast majority of structured text analysis tasks you will encounter.
