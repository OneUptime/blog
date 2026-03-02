# How to Benchmark Ubuntu Server with Phoronix Test Suite

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Benchmarking, Phoronix, Performance, Testing

Description: Use the Phoronix Test Suite on Ubuntu to run comprehensive hardware and software benchmarks, compare results, and generate professional performance reports.

---

Phoronix Test Suite (PTS) is the most comprehensive open-source benchmarking platform for Linux. It includes hundreds of test profiles covering CPU performance, memory bandwidth, disk I/O, network throughput, GPU compute, and specific application workloads. PTS handles downloading test dependencies, compiling test binaries when needed, running tests with proper statistical sampling, and generating detailed HTML reports.

## Installing Phoronix Test Suite

### From Ubuntu Repositories

```bash
# Install PTS from the Ubuntu repositories
sudo apt update
sudo apt install phoronix-test-suite -y

# Verify installation
phoronix-test-suite version
```

### From the Official PTS Repository (Latest Version)

```bash
# Install dependencies
sudo apt install php-cli php-xml php-curl php-json -y

# Download latest PTS release
PTS_VERSION=$(curl -s https://api.github.com/repos/phoronix-test-suite/phoronix-test-suite/releases/latest | grep tag_name | cut -d'"' -f4)
wget "https://github.com/phoronix-test-suite/phoronix-test-suite/releases/download/${PTS_VERSION}/phoronix-test-suite_${PTS_VERSION#v}_all.deb"

sudo dpkg -i phoronix-test-suite_*.deb
sudo apt install -f -y    # Fix any missing dependencies

phoronix-test-suite version
```

## Understanding PTS Concepts

- **Test Profile**: Defines a single benchmark (e.g., compress-7zip, ramspeed)
- **Test Suite**: A collection of related test profiles (e.g., system, disk, network)
- **Test Run**: One execution of a benchmark with multiple samples
- **OpenBenchmarking.org**: Cloud platform for comparing results with other systems

## Initial Setup

```bash
# Configure PTS (optional but recommended)
phoronix-test-suite enterprise-setup

# List all available test suites
phoronix-test-suite list-available-suites

# List all available test profiles
phoronix-test-suite list-available-tests

# Show system information that PTS collects
phoronix-test-suite system-info
```

## Running Your First Benchmark

```bash
# Run the 7-Zip compression benchmark (quick, no compilation needed)
phoronix-test-suite benchmark compress-7zip

# PTS will:
# 1. Download the test if not already installed
# 2. Install required dependencies
# 3. Run multiple samples for statistical accuracy
# 4. Display results and offer to upload to OpenBenchmarking.org
```

## Installing Tests Ahead of Time

To avoid downloads during a benchmark run:

```bash
# Install a test without running it
phoronix-test-suite install compress-7zip

# Install multiple tests at once
phoronix-test-suite install compress-7zip ramspeed iozone fio

# Install an entire suite
phoronix-test-suite install system
```

## Commonly Used Benchmarks

### CPU Benchmarks

```bash
# 7-Zip compression/decompression (good overall CPU test)
phoronix-test-suite benchmark compress-7zip

# OpenSSL cryptographic performance
phoronix-test-suite benchmark openssl

# John the Ripper password hash performance
phoronix-test-suite benchmark john-the-ripper

# BLAS/LAPACK linear algebra (good for scientific computing)
phoronix-test-suite benchmark blender
```

### Memory Benchmarks

```bash
# RAMspeed - memory read/write throughput
phoronix-test-suite benchmark ramspeed

# Stream - memory bandwidth benchmark
phoronix-test-suite benchmark stream

# mbw - memory bandwidth test
phoronix-test-suite benchmark mbw
```

### Disk Benchmarks

```bash
# IOzone - comprehensive filesystem benchmark
phoronix-test-suite benchmark iozone

# fio - flexible I/O tester
phoronix-test-suite benchmark fio

# SQLite - disk-bound database performance
phoronix-test-suite benchmark sqlite
```

### Comprehensive Test Suites

```bash
# Run the complete system test suite (takes 30-60 minutes)
phoronix-test-suite benchmark pts/system

# Disk performance suite
phoronix-test-suite benchmark pts/disk

# Network suite
phoronix-test-suite benchmark pts/network
```

## Running Benchmarks Silently (Batch Mode)

For automated testing, use batch mode to avoid interactive prompts:

```bash
# Set up batch mode (answer prompts once, then they are saved)
phoronix-test-suite batch-setup

# Alternatively, set environment variables for batch mode
export PHORONIX_BATCH_MODE=TRUE
export PHORONIX_BATCH_RESULT_SAVE_NAME="ubuntu_baseline_$(date +%Y%m%d)"

# Run benchmark non-interactively
phoronix-test-suite batch-benchmark compress-7zip
```

Create a batch configuration file:

```bash
mkdir -p ~/.phoronix-test-suite
nano ~/.phoronix-test-suite/user-config.xml
```

```xml
<?xml version="1.0"?>
<PhoronixTestSuite>
    <Options>
        <OpenBenchmarking>
            <AnonymousUsageReporting>FALSE</AnonymousUsageReporting>
            <IndexCacheTTL>3</IndexCacheTTL>
        </OpenBenchmarking>
        <General>
            <DefaultBrowser></DefaultBrowser>
            <UsePhpCli>TRUE</UsePhpCli>
            <DefaultDisplayMode>ALL_RESULTS</DefaultDisplayMode>
            <PhoromaticServers></PhoromaticServers>
        </General>
        <TestResultValidation>
            <DynamicRunCount>TRUE</DynamicRunCount>
            <MinimalTestTime>2</MinimalTestTime>
            <StandardDeviationThreshold>3.50</StandardDeviationThreshold>
        </TestResultValidation>
        <BatchMode>
            <SaveResults>TRUE</SaveResults>
            <OpenBrowser>FALSE</OpenBrowser>
            <UploadResults>FALSE</UploadResults>
            <PromptForTestIdentifier>FALSE</PromptForTestIdentifier>
            <PromptForTestDescription>FALSE</PromptForTestDescription>
            <PromptSaveName>FALSE</PromptSaveName>
            <RunAllTestCombinations>TRUE</RunAllTestCombinations>
        </BatchMode>
    </Options>
</PhoronixTestSuite>
```

## Creating Custom Test Suites

You can define a custom suite of tests for repeatable benchmarks:

```bash
# Create a custom test suite
phoronix-test-suite make-test-suite

# Follow the prompts to name the suite and add tests
# Or create the XML file directly:
mkdir -p ~/.phoronix-test-suite/test-suites/local/my-server-suite

nano ~/.phoronix-test-suite/test-suites/local/my-server-suite/suite-definition.xml
```

```xml
<?xml version="1.0"?>
<PhoronixTestSuite>
    <SuiteInformation>
        <SuiteName>My Server Benchmark Suite</SuiteName>
        <SuiteVersion>1.0</SuiteVersion>
        <SuiteType>Processor</SuiteType>
        <SuiteDescription>Custom suite for Ubuntu server benchmarking</SuiteDescription>
        <Maintainer>Admin</Maintainer>
    </SuiteInformation>
    <Execute>
        <Test>compress-7zip</Test>
        <Test>openssl</Test>
        <Test>ramspeed</Test>
        <Test>iozone</Test>
    </Execute>
</PhoronixTestSuite>
```

```bash
# Run the custom suite
phoronix-test-suite benchmark local/my-server-suite
```

## Comparing Results Between Systems

PTS results are saved and can be compared:

```bash
# List saved results
phoronix-test-suite list-saved-results

# Compare two saved result sets
phoronix-test-suite result-file-to-text result1
phoronix-test-suite result-file-to-text result2

# Merge results for comparison
phoronix-test-suite merge-results result1 result2

# Generate an HTML report from saved results
phoronix-test-suite result-file-to-pdf result_name
```

## Uploading Results to OpenBenchmarking.org

PTS integrates with OpenBenchmarking.org for community comparisons:

```bash
# Upload results to compare with hardware worldwide
phoronix-test-suite upload-result result_name

# Browse results at: https://openbenchmarking.org/
```

## Setting Up Automated Regular Benchmarks

```bash
# Create a benchmark script
nano /usr/local/bin/weekly_benchmark.sh
```

```bash
#!/bin/bash
# weekly_benchmark.sh - Run weekly performance benchmarks

RESULT_NAME="server_$(hostname)_$(date +%Y%m%d)"
LOG_FILE="/var/log/phoronix_${RESULT_NAME}.log"

echo "Starting benchmark: $RESULT_NAME" >> "$LOG_FILE"
date >> "$LOG_FILE"

# Set batch mode variables
export PHORONIX_BATCH_MODE=TRUE

# Run benchmarks
phoronix-test-suite batch-benchmark compress-7zip >> "$LOG_FILE" 2>&1
phoronix-test-suite batch-benchmark ramspeed >> "$LOG_FILE" 2>&1

echo "Benchmark complete: $RESULT_NAME" >> "$LOG_FILE"
```

```bash
chmod +x /usr/local/bin/weekly_benchmark.sh

# Schedule with cron (run every Sunday at 2am)
echo "0 2 * * 0 root /usr/local/bin/weekly_benchmark.sh" | sudo tee -a /etc/cron.d/phoronix
```

## Troubleshooting

**Test fails to compile**: Install build dependencies: `sudo apt install build-essential gcc g++ make -y`.

**Tests download slowly**: PTS downloads test binaries and source from the internet. Check network connectivity and consider increasing the download timeout in the config.

**Results vary too much between runs**: High system variability (other processes, thermals) affects benchmarks. Run PTS on an otherwise idle system and ensure the server is not throttling due to heat.

**Out of disk space**: PTS downloads and compiles tests in `~/.phoronix-test-suite/`. Some test suites require several gigabytes. Check free space with `df -h`.

Phoronix Test Suite gives you repeatable, standardized benchmarks that make it easy to track performance changes after kernel updates, hardware changes, or configuration modifications.
