# How to Use Geekbench on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Geekbench, Benchmarking, CPU, Performance

Description: Download, install, and run Geekbench on Ubuntu to measure CPU and memory performance with cross-platform comparable scores and detailed workload breakdowns.

---

Geekbench is a cross-platform benchmark that measures CPU and memory performance using realistic workloads drawn from machine learning, image processing, cryptography, and other common computing tasks. Its main value is cross-platform comparability - the same workloads run on Ubuntu, macOS, Windows, Android, and iOS, allowing you to compare a server CPU against desktop and mobile processors on a single scale. The Geekbench Browser database also lets you compare your results against thousands of other systems.

## What Geekbench Tests

Geekbench 6 includes the following test workload categories:

- **File Compression**: Deflate and LZMA compression and decompression
- **Navigation**: Dijkstra's shortest path algorithm
- **HTML5**: DOM parsing, JavaScript-like code
- **PDF Rendering**: PDF page rasterization
- **Photo Library**: Image resizing, color transformation
- **Clang**: Compilation workloads
- **Text Processing**: Text search, manipulation
- **Asset Compression**: Game-style texture compression
- **Object Detection**: MobileNet inference
- **Background Blur**: Gaussian blur image processing
- **Horizon Detection**: Edge detection workloads
- **Object Remover**: Inpainting algorithms
- **HDR**: High dynamic range image processing
- **Photo Filter**: Image filter application
- **Ray Tracer**: CPU ray tracing
- **Structure from Motion**: 3D reconstruction

Both single-core and multi-core scores are provided. The single-core score reflects per-core performance (relevant for single-threaded applications), while the multi-core score reflects parallel throughput.

## System Requirements

- Ubuntu 18.04 or later (64-bit)
- x86_64 architecture
- At least 1GB RAM (4GB+ recommended for accurate multi-core results)
- Internet connection to upload results (optional)

## Downloading Geekbench

Geekbench for Linux is available from the Primate Labs website. It is not available in Ubuntu repositories.

```bash
# Download the latest Geekbench 6 for Linux
# Check https://www.geekbench.com/download/linux/ for the current version

GB_VERSION="6.3.0"
wget "https://cdn.geekbench.com/Geekbench-${GB_VERSION}-Linux.tar.gz"

# Extract the archive
tar -xzf "Geekbench-${GB_VERSION}-Linux.tar.gz"

# Move to a permanent location
sudo mv "Geekbench ${GB_VERSION}" /opt/geekbench

# Create a symlink for easy access
sudo ln -s /opt/geekbench/geekbench6 /usr/local/bin/geekbench6

# Verify it runs
geekbench6 --help
```

## Running a Basic Benchmark

```bash
# Run Geekbench CPU benchmark
geekbench6

# Geekbench runs all tests and displays results:
# Single-Core Score: XXXX
# Multi-Core Score:  XXXX
# A URL is provided to view detailed results online
```

The run takes approximately 5-10 minutes. Progress is shown for each test category.

## Saving Results Locally

```bash
# Run benchmark and save results to a local file
geekbench6 --save results.txt

# Save as JSON for programmatic parsing
geekbench6 --export-json results.json
```

## Running Without Internet Upload

By default, Geekbench uploads results to the Geekbench Browser. To disable this:

```bash
# Run without uploading to Geekbench Browser
geekbench6 --no-upload

# Save results locally when not uploading
geekbench6 --no-upload --save /tmp/geekbench_results.txt
```

## Automated Benchmark Script

For running benchmarks in CI/CD pipelines or automated capacity testing:

```bash
#!/bin/bash
# geekbench_automated.sh - Run Geekbench and capture scores

OUTPUT_FILE="/tmp/geekbench_$(hostname)_$(date +%Y%m%d_%H%M%S).txt"
JSON_FILE="/tmp/geekbench_$(hostname)_$(date +%Y%m%d_%H%M%S).json"

echo "Running Geekbench 6 benchmark..."
echo "Hostname: $(hostname)"
echo "CPU: $(grep -m1 'model name' /proc/cpuinfo | cut -d: -f2 | xargs)"
echo "Cores: $(nproc)"
echo "RAM: $(free -h | grep Mem | awk '{print $2}')"
echo ""

# Run benchmark
geekbench6 --no-upload --save "$OUTPUT_FILE" --export-json "$JSON_FILE"

# Extract scores from the output file
SINGLE=$(grep "Single-Core Score" "$OUTPUT_FILE" | awk '{print $NF}')
MULTI=$(grep "Multi-Core Score" "$OUTPUT_FILE" | awk '{print $NF}')

echo ""
echo "=== Results ==="
echo "Single-Core Score: $SINGLE"
echo "Multi-Core Score:  $MULTI"
echo "Full results: $OUTPUT_FILE"
```

```bash
chmod +x geekbench_automated.sh
./geekbench_automated.sh
```

## Running on Headless Servers

Geekbench does not require a display and runs fine on headless servers:

```bash
# Run on a headless server or over SSH
geekbench6 --no-upload

# For automated runs, suppress the browser-open prompt
geekbench6 --no-upload 2>&1 | tee geekbench_output.log
```

## Understanding the Scores

Geekbench scores are relative to a baseline:

- In Geekbench 6, the baseline system is a Apple Mac mini (2023, M2) with a single-core score of 2500
- Higher is better
- Single-core scores typically range from:
  - Older mobile CPUs: 500-900
  - Modern mid-range desktop: 1200-1800
  - High-end desktop (Ryzen 9/Core i9): 1800-2500
  - Server CPUs (Xeon, EPYC): 1000-1800 single-core (but much higher multi-core)

Server CPUs tend to score lower single-core than desktop CPUs because they are clocked lower to maintain stability at high core counts and within thermal envelopes.

## Comparing Results

After your run, Geekbench provides a URL to the Geekbench Browser:

```
https://browser.geekbench.com/v6/cpu/XXXXXXXX
```

From the browser, you can:
- Compare against other CPUs in the database
- Filter by CPU model, platform (Linux, Windows, macOS)
- See per-workload scores broken down by category
- Compare your Ubuntu result to the same CPU on Windows

Useful comparison queries on the Geekbench Browser:
- Search by CPU model name to find results from similar hardware
- Filter by Operating System to see Linux vs Windows vs macOS results on the same hardware

## Installing Geekbench 5 (Legacy)

If you need Geekbench 5 for comparison with older results:

```bash
# Download Geekbench 5 for Linux
wget https://cdn.geekbench.com/Geekbench-5.5.1-Linux.tar.gz
tar -xzf Geekbench-5.5.1-Linux.tar.gz
cd "Geekbench 5.5.1 Linux"

# Run Geekbench 5
./geekbench5
```

Note: Geekbench 5 and 6 scores are not directly comparable. The workloads and scoring methodology changed between versions.

## Benchmarking VMs and Cloud Instances

Geekbench is valuable for comparing cloud instance types and VM configurations:

```bash
# On a cloud instance (t3.medium, for example)
geekbench6 --no-upload --save t3_medium_results.txt

# On a different instance type for comparison
geekbench6 --no-upload --save c5_xlarge_results.txt

# Compare the scores to evaluate cost/performance ratios
```

For cloud comparisons, pay attention to multi-core scores relative to vCPU count. Some instance types have lower per-core performance when oversubscribed.

## System Preparation Before Benchmarking

For the most accurate and reproducible results:

```bash
# Close unnecessary applications to free memory and CPU
# Check running processes
top -b -n 1 | head -20

# Disable dynamic frequency scaling for consistent results
# (Set CPU to performance governor)
sudo apt install cpufrequtils -y
sudo cpufreq-set -g performance

# Confirm governor change
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

# Restore to default power-saving mode after benchmarking
sudo cpufreq-set -g powersave
```

Thermal throttling can significantly skew results. If the server is in a warm environment or the thermal paste on the CPU is old, scores may be lower than expected and inconsistent between runs.

```bash
# Monitor CPU temperature during benchmark
watch -n 1 sensors

# If temperature exceeds 85-90C, the CPU is throttling
```

Geekbench provides a standardized baseline for CPU comparison that is particularly useful when evaluating cloud providers, new hardware purchases, or configuration changes. The cross-platform database makes it the most useful benchmark for comparing Linux server performance against consumer hardware and mobile devices.
