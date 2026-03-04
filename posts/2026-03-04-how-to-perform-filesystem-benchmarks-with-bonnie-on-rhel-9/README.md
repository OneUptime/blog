# How to Perform Filesystem Benchmarks with bonnie++ on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Performance, Benchmarking

Description: Step-by-step guide on perform filesystem benchmarks with bonnie++ on rhel 9 with practical examples and commands.

---

bonnie++ tests filesystem performance on RHEL 9 with sequential and random I/O operations.

## Install bonnie++

```bash
sudo dnf install -y epel-release
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
- `-n`: Number of files for create/delete tests

## Test Specific Operations

```bash
# Sequential output only
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

## Convert Output to CSV

```bash
bonnie++ -d /mnt/test -u root -s 4G | bon_csv2html > results.html
```

## Conclusion

bonnie++ on RHEL 9 provides comprehensive filesystem benchmarking. Use file sizes at least twice your system RAM to ensure you are testing disk performance rather than cache performance.

