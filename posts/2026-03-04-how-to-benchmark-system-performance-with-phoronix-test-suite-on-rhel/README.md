# How to Benchmark System Performance with Phoronix Test Suite on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Phoronix Test Suite, Benchmarking, Performance, System Testing

Description: Learn how to install and use Phoronix Test Suite on RHEL for comprehensive system benchmarking across CPU, memory, disk, and more.

---

Phoronix Test Suite (PTS) is an open-source benchmarking platform that provides over 500 test profiles. It supports automated testing, result comparison, and result uploading to OpenBenchmarking.org.

## Installing Phoronix Test Suite

```bash
# Install dependencies
sudo dnf install -y php-cli php-xml php-json wget

# Download and install the latest Phoronix Test Suite
wget https://phoronix-test-suite.com/releases/phoronix-test-suite-10.8.4.tar.gz
tar xzf phoronix-test-suite-10.8.4.tar.gz
cd phoronix-test-suite
sudo ./install-sh
```

## Listing Available Tests

```bash
# List all available test suites
phoronix-test-suite list-available-suites

# List individual tests
phoronix-test-suite list-available-tests

# Search for specific tests
phoronix-test-suite search cpu
```

## Running Individual Tests

```bash
# Install and run a specific test (e.g., compress-7zip)
phoronix-test-suite benchmark pts/compress-7zip

# Run a CPU benchmark
phoronix-test-suite benchmark pts/build-linux-kernel

# Run a memory bandwidth test
phoronix-test-suite benchmark pts/ramspeed
```

## Running Test Suites

```bash
# Run a comprehensive CPU test suite
phoronix-test-suite benchmark pts/cpu

# Run a disk/storage test suite
phoronix-test-suite benchmark pts/disk

# Run a general system benchmark
phoronix-test-suite benchmark pts/system
```

## Batch Mode for Automation

```bash
# Configure batch mode settings
phoronix-test-suite batch-setup

# Run in batch mode (no prompts)
phoronix-test-suite batch-benchmark pts/compress-7zip
```

## Comparing Results

```bash
# List saved results
phoronix-test-suite list-saved-results

# View a specific result
phoronix-test-suite result-file-to-text <result-name>

# Compare two result files
phoronix-test-suite merge-results result1 result2
```

Phoronix Test Suite automatically detects your hardware and software environment and includes it in results. This makes it easy to compare performance across different RHEL versions, kernel versions, or hardware configurations.
