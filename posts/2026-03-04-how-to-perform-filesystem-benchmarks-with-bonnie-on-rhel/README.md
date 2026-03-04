# How to Perform Filesystem Benchmarks with bonnie++ on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, bonnie++, Filesystems, Benchmarking, Storage, Performance

Description: Learn how to use bonnie++ on RHEL to benchmark filesystem performance including sequential I/O, random seeks, and metadata operations.

---

bonnie++ is a filesystem benchmark tool that tests sequential I/O, random seeks, and file metadata operations (create, stat, delete). It is particularly useful for comparing different filesystems and storage configurations.

## Installing bonnie++

```bash
# Install from EPEL
sudo dnf install -y epel-release
sudo dnf install -y bonnie++
```

## Running a Basic Benchmark

```bash
# Run bonnie++ with 2x RAM size for accurate results
# Replace 16g with twice your system RAM
bonnie++ -d /tmp -s 16g -n 256 -u root

# -d: directory to test in
# -s: file size (should be 2x RAM to bypass cache)
# -n: number of files for metadata tests (num:max_size:min_size:num_dirs)
# -u: user to run as
```

## Testing a Specific Mount Point

```bash
# Benchmark a specific filesystem mount
bonnie++ -d /mnt/data -s 32g -n 256 -u root

# Test with specific block size
bonnie++ -d /mnt/data -s 16g -n 256 -b -u root
# -b: no write buffering (forces sync)
```

## Understanding the Output

bonnie++ outputs results in CSV format. Key metrics include:

```bash
# Sequential Output (write):
#   - Per character: byte-by-byte write speed
#   - Block: block write speed (most relevant)
#   - Rewrite: block rewrite speed

# Sequential Input (read):
#   - Per character: byte-by-byte read speed
#   - Block: block read speed (most relevant)

# Random Seeks:
#   - seeks/sec: random access performance
```

## Generating HTML Reports

```bash
# Run bonnie++ and save CSV output
bonnie++ -d /tmp -s 16g -n 256 -u root 2>&1 | tee /tmp/bonnie-results.csv

# Convert CSV to HTML
cat /tmp/bonnie-results.csv | bon_csv2html > /tmp/bonnie-report.html
```

## Comparing Filesystems

```bash
# Test XFS
bonnie++ -d /mnt/xfs-volume -s 16g -n 256 -u root > /tmp/xfs-results.csv 2>&1

# Test ext4
bonnie++ -d /mnt/ext4-volume -s 16g -n 256 -u root > /tmp/ext4-results.csv 2>&1

# Combine and compare
cat /tmp/xfs-results.csv /tmp/ext4-results.csv | bon_csv2html > /tmp/comparison.html
```

Always ensure the test size (`-s`) is at least twice your system RAM. This prevents the OS page cache from inflating results, giving you an accurate picture of actual storage performance.
