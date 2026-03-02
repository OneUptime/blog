# How to Use the rename Command for Batch File Renaming on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Command Line, Linux, Shell, Productivity

Description: Learn how to use the rename command on Ubuntu to batch rename files using Perl regular expressions, covering common patterns, dry runs, and practical examples.

---

Renaming files one at a time in a graphical file manager is tedious when you have hundreds or thousands of them. The `rename` command on Ubuntu uses Perl regular expressions to rename multiple files at once, giving you precise control over transformations like changing extensions, replacing characters, adding prefixes, or reformatting date patterns.

## Installing rename

Ubuntu includes two different `rename` commands. The Perl-based version (`perl-rename` or `prename`) is the more powerful one.

```bash
# Check which version you have
rename --version

# Install the Perl-based rename if needed
sudo apt install rename

# On some Ubuntu versions it may be called differently
which rename
ls -la /usr/bin/rename
```

If you see `util-linux` in the version output, you have the simpler version. Install the Perl one explicitly:

```bash
sudo apt install perl
# The Perl rename is usually packaged as 'rename' in Ubuntu
```

## Basic Syntax

```bash
rename [options] 's/PATTERN/REPLACEMENT/' files
```

The expression `s/PATTERN/REPLACEMENT/` is a Perl substitution. The `s` stands for substitute, the first part is what to find, and the second part is what to replace it with.

## Essential Options

```bash
# -n / --dry-run: show what would happen without doing it (always use this first)
rename -n 's/old/new/' *.txt

# -v / --verbose: show each rename as it happens
rename -v 's/old/new/' *.txt

# -f / --force: allow overwriting existing files
rename -f 's/old/new/' *.txt
```

Always test with `-n` before running the actual rename. There is no undo.

## Common Renaming Tasks

### Change File Extension

```bash
# Rename all .htm files to .html
rename -n 's/\.htm$/.html/' *.htm
rename -v 's/\.htm$/.html/' *.htm

# Change .jpeg to .jpg
rename 's/\.jpeg$/.jpg/' *.jpeg

# Remove extensions entirely
rename 's/\.[^.]+$//' *

# Change extension for specific files
rename 's/\.bak$/.conf/' *.bak
```

### Convert Uppercase to Lowercase

```bash
# Lowercase the entire filename (requires /e or uc/lc modifiers)
rename 's/(.+)/lc($1)/e' *

# Lowercase only the extension
rename 's/(\.[^.]+)$/lc($1)/e' *

# Example: PHOTO.JPG -> PHOTO.jpg
rename 's/\.JPG$/.jpg/' *.JPG
```

The `/e` modifier evaluates the replacement as Perl code, enabling functions like `lc()` (lowercase) and `uc()` (uppercase).

### Replace Characters in Filenames

```bash
# Replace spaces with underscores
rename -n 's/ /_/g' *

# The /g flag replaces ALL occurrences (not just the first)
rename 's/ /_/g' *.txt

# Replace multiple different characters
rename 's/[ ()-]/_/g' *

# Remove all parentheses
rename 's/[()]//g' *

# Replace hyphens with underscores
rename 's/-/_/g' *
```

### Add Prefix or Suffix

```bash
# Add a prefix to all matching files
rename 's/^/2026-03-01_/' *.log
# report.log -> 2026-03-01_report.log

# Add a suffix before the extension
rename 's/(\.[^.]+)$/_backup$1/' *.conf
# nginx.conf -> nginx_backup.conf

# Add a numeric prefix using shell loop for sequencing
i=1
for f in *.jpg; do
    rename "s/^/$(printf '%03d_' $i)/" "$f"
    ((i++))
done
```

### Remove Prefix or Suffix

```bash
# Remove a common prefix
rename 's/^prefix_//' prefix_*.txt

# Remove trailing numbers from filename
rename 's/\d+(\.[^.]+)$/$1/' *.txt
# report001.txt -> report.txt

# Remove a suffix before extension
rename 's/_backup(\.[^.]+)$/$1/' *_backup.*
```

### Reformat Date Patterns

```bash
# Convert YYYYMMDD to YYYY-MM-DD
rename 's/(\d{4})(\d{2})(\d{2})/$1-$2-$3/' *

# Example: 20260301_report.pdf -> 2026-03-01_report.pdf

# Convert MM-DD-YYYY to YYYY-MM-DD
rename 's/(\d{2})-(\d{2})-(\d{4})/$3-$1-$2/' *
```

### Working with Number Sequences

```bash
# Zero-pad single digit numbers (1.txt -> 01.txt)
rename 's/(\d+)/sprintf("%02d", $1)/e' *.txt

# Three-digit padding
rename 's/(\d+)/sprintf("%03d", $1)/e' *.jpg
# img1.jpg -> img001.jpg
# img10.jpg -> img010.jpg
```

## Using Capture Groups

Parentheses create capture groups, referenced as `$1`, `$2`, etc. in the replacement:

```bash
# Swap filename parts: "firstname_lastname" -> "lastname_firstname"
rename 's/^([^_]+)_([^_]+)$/$2_$1/' *

# Reorder date components: 01-2026-03 -> 2026-03-01
rename 's/^(\d{2})-(\d{4})-(\d{2})/$2-$3-$1/' *

# Extract version number pattern
rename 's/^app-v(\d+\.\d+)/$1_app/' *.tar.gz
```

## Practical Real-World Examples

### Sanitize filenames for web use

```bash
# Make filenames URL-safe: lowercase, spaces to hyphens, remove special chars
rename 's/ /-/g' *
rename 's/[^a-zA-Z0-9._-]//g' *
rename 's/(.+)/lc($1)/e' *
```

### Rename downloaded photos

```bash
# Camera files often come as IMG_1234.JPG
# Rename to lowercase jpg
rename 's/\.JPG$/.jpg/i' *.JPG

# Add a date prefix from the directory name
# If directory is 2026-03-01, prefix files with that date
DATE=$(basename "$PWD")
rename "s/^/${DATE}_/" *.jpg
```

### Rename log files with timestamps

```bash
# Backup logs with date appended before rotating
DATE=$(date +%Y%m%d)
rename "s/\.log$/_${DATE}.log/" *.log
```

### Fix Windows filenames on Linux

```bash
# Windows allows characters that cause issues on Linux
# Remove or replace problematic characters: : * ? " < > |
rename 's/[:\*\?"<>\|]/_/g' *

# Replace Windows path separator if somehow present
rename 's/\\/_/g' *
```

## Batch Operations Across Directories

`rename` only processes files in the current directory by default. Use `find` for recursive operations:

```bash
# Rename all .htm files recursively
find . -name "*.htm" -exec rename 's/\.htm$/.html/' {} \;

# Or safer with xargs
find . -name "*.htm" -print0 | xargs -0 rename 's/\.htm$/.html/'

# Dry run recursive rename first
find . -name "*.htm" | xargs rename -n 's/\.htm$/.html/'
```

## When rename is Not Available

If you need a quick rename without the Perl `rename` command, use a shell loop:

```bash
# Simple extension change with bash
for f in *.htm; do
    mv "$f" "${f%.htm}.html"
done

# Lowercase with bash 4+
for f in *; do
    mv "$f" "${f,,}" 2>/dev/null
done
```

The Perl `rename` command is faster and more expressive for complex patterns, but shell loops work universally.

## Summary

The most important habit when using `rename`: always run with `-n` first to preview changes. Regular expression mistakes can rename hundreds of files in unexpected ways, and there is no built-in undo. The key patterns to know are: `s/old/new/g` for substitution, `s/^/prefix_/` for adding a prefix, `s/\.ext$/.new/` for extension changes, and `s/(.+)/lc($1)/e` for case conversion.
