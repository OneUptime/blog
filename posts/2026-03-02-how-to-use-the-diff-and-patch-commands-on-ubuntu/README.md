# How to Use the diff and patch Commands on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Command Line, Linux, Version Control, Development

Description: Learn how to compare files with diff and apply changes with patch on Ubuntu, covering unified format, directory diffs, and practical patch workflows.

---

`diff` and `patch` are a matched pair. `diff` compares two files or directory trees and outputs a description of the differences. `patch` takes that description and applies the changes to a target file. Together they form the basis of how code changes have been shared and reviewed for decades.

## Understanding diff Output Formats

`diff` has several output formats. The most commonly used today is unified format (`-u`), which is what `git diff` uses.

### Normal Format (default)

```bash
diff file1.txt file2.txt
```

Output:
```text
3c3
< old line in file1
---
> new line in file2
5a6
> added line
```

The `c` means changed, `a` means added, `d` means deleted. The numbers indicate line positions.

### Unified Format

```bash
# -u flag produces unified diff, -N context lines (default 3)
diff -u file1.txt file2.txt
```

Output:
```diff
--- file1.txt   2026-03-01 10:00:00.000 +0000
+++ file2.txt   2026-03-01 10:05:00.000 +0000
@@ -1,6 +1,7 @@
 line 1
 line 2
-old line in file1
+new line in file2
 line 4
 line 5
+added line
 line 6
```

Lines starting with `-` are removed, lines with `+` are added, lines with a space are unchanged context.

### Context Format

```bash
# Older format still used by some tools
diff -c file1.txt file2.txt
```

## Practical diff Options

```bash
# Ignore whitespace differences
diff -w file1.txt file2.txt

# Ignore blank lines
diff -B file1.txt file2.txt

# Ignore case differences
diff -i file1.txt file2.txt

# Show side-by-side comparison
diff -y file1.txt file2.txt

# Side-by-side with width limit
diff -y -W 120 file1.txt file2.txt

# Just report whether files differ (exit code only)
diff -q file1.txt file2.txt

# Suppress output, just check exit code for scripting
if diff -q file1.txt file2.txt > /dev/null 2>&1; then
    echo "Files are identical"
else
    echo "Files differ"
fi
```

## Comparing Directories

`diff` can recursively compare entire directory trees.

```bash
# Compare two directories recursively
diff -r dir1/ dir2/

# Combined with unified format
diff -ru dir1/ dir2/

# Only report which files differ, not the content differences
diff -rq dir1/ dir2/
```

This is useful for comparing configuration directories, source trees, or deployment artifacts.

```bash
# Compare production and staging config directories
diff -rq /etc/nginx/sites-available/ /srv/staging/nginx/sites-available/
```

## Generating a Patch File

Save `diff` output to a file to create a patch:

```bash
# Generate a unified patch file
diff -u original.conf modified.conf > my_changes.patch

# Generate a recursive patch for a directory tree
diff -ru original_dir/ modified_dir/ > changes.patch
```

Patch files are plain text and can be reviewed, shared via email, or committed to a repository.

## Using patch to Apply Changes

`patch` reads a diff file and applies it to the target.

```bash
# Apply a patch to a file (patch figures out the target from the diff header)
patch < my_changes.patch

# Explicitly specify the file to patch
patch original.conf < my_changes.patch

# Dry run - show what would happen without making changes
patch --dry-run < my_changes.patch

# Verbose output
patch -v < my_changes.patch
```

### Strip Path Components with -p

When a patch was generated with full paths that do not match your local structure, use `-p` to strip leading path components.

```bash
# Patch file contains: --- a/src/config.py
# You are in the repo root, want: src/config.py
patch -p1 < fix.patch

# Strip 2 leading components
patch -p2 < fix.patch
```

The `-p0` flag uses the path as-is, `-p1` strips one leading directory, and so on.

### Applying Directory Patches

```bash
# Apply a recursive patch from the project root
cd /path/to/project
patch -p1 < /tmp/feature_changes.patch
```

## Reversing a Patch

If you applied a patch and need to undo it:

```bash
# Reverse a previously applied patch
patch -R < my_changes.patch

# Dry run first to verify the reversal will work
patch -R --dry-run < my_changes.patch
```

## Handling Rejected Hunks

When a patch does not apply cleanly (because the target file changed), `patch` creates `.rej` files containing the parts that failed:

```bash
# Apply patch, examine failures
patch -p1 < changes.patch

# Find all rejection files
find . -name "*.rej"

# Review what failed
cat somefile.py.rej
```

After manually resolving the conflicts, remove the `.rej` and `.orig` files:

```bash
# Clean up patch artifacts
find . -name "*.rej" -delete
find . -name "*.orig" -delete
```

## Practical Workflow: Sharing Code Changes

This workflow is common when contributing to projects that do not use Git pull requests, or when generating minimal patches to share with a team.

```bash
# 1. Make a copy of the original
cp nginx.conf nginx.conf.orig

# 2. Edit nginx.conf with your changes
vim nginx.conf

# 3. Generate the patch
diff -u nginx.conf.orig nginx.conf > nginx_performance_tuning.patch

# 4. Share the patch file
# 5. Recipient applies it:
patch nginx.conf < nginx_performance_tuning.patch
```

## Comparing Configuration Snapshots

A practical use case is tracking configuration drift:

```bash
# Take a snapshot of current config
cp -r /etc/ssh/ /backup/ssh_config_$(date +%Y%m%d)/

# Later, after updates, compare
diff -ru /backup/ssh_config_20260201/ /etc/ssh/
```

## Using diff3 for Three-Way Merges

`diff3` compares three files and helps merge conflicting changes:

```bash
# Compare your version, original, and someone else's version
diff3 myfile.conf original.conf theirfile.conf

# Attempt automatic merge
diff3 -m myfile.conf original.conf theirfile.conf > merged.conf
```

## colordiff - A Readable Alternative

The `colordiff` tool wraps `diff` with color output:

```bash
# Install
sudo apt install colordiff

# Use just like diff
colordiff -u file1.txt file2.txt

# Alias for convenience
echo "alias diff='colordiff'" >> ~/.bashrc
```

## Summary

`diff` and `patch` remain relevant tools even in a Git-dominated world. They are useful for inspecting changes without a version control system, sharing targeted fixes, comparing configuration directories, and understanding what changed between two snapshots. The key habits to build: always use `-u` for unified format, test with `--dry-run` before applying patches to important files, and keep `.orig` copies when working with complex patches.
