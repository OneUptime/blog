# How to Perform Filesystem Benchmarks with bonnie++ on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Performance, Benchmarking

Description: Step-by-step guide on perform filesystem benchmarks with bonnie++ on rhel 9 with practical examples and commands.

---

bonnie++ tests filesystem performance on RHEL 9 with sequential and random I/O operations.

## Install bonnie++

```bash
sudo subscription-manager repos --enable codeready-builder-for-rhel-9-$(arch)-rpms
sudo dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm
sudo dnf install -y bonnie++
```

## Run a Basic Benchmark

```bash
bonnie++ -d /mnt/test -u root -s 8G -n 256
```

Parameters:
- `-d`: Test directory
- `-u`: User to run as
- `-s`: File size (should be 2x RAM)
- `-n`: Number of files for create/stat/delete tests, in units of 1024 files

## Test Specific Operations

```bash
# Disable write buffering

bonnie++ -d /mnt/test -u root -s 4G -b

# With direct I/O
bonnie++ -d /mnt/test -u root -s 4G -D
```

## Interpret Results

bonnie++ reports:

| Operation | Metric |
|-----------|--------|
| Sequential Write | KB/s, % CPU |
| Sequential Read | KB/s, % CPU |
| Random Seeks | Per second |
| File Creates | Per second |
| File Deletes | Per second |

## Convert CSV Output to HTML

```bash
bonnie++ -d /mnt/test -u root -s 4G | bon_csv2html > results.html
```

## Conclusion

bonnie++ on RHEL 9 provides comprehensive filesystem benchmarking. Use file sizes at least twice your system RAM to ensure you are testing disk performance rather than cache performance.
