# How to Run stress-ng for System Stress Testing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, stress-ng, Performance, Testing, System Administration

Description: Use stress-ng on Ubuntu to load-test CPU, memory, I/O, and network subsystems to verify stability, measure thermal behavior, and validate hardware changes.

---

`stress-ng` is the successor to the original `stress` tool, with far more test types and options. It can stress individual hardware subsystems - CPU cores, memory controllers, disk I/O paths, network stacks - or hammer everything simultaneously. Sysadmins use it to validate new hardware, check thermal performance under load, reproduce race conditions in kernel code, and confirm that tuning changes are safe under pressure.

## Installing stress-ng

```bash
# Install stress-ng from Ubuntu repositories
sudo apt update
sudo apt install stress-ng -y

# Verify version and available stressors
stress-ng --version
stress-ng --help 2>&1 | head -30

# List all available stressors
stress-ng --stressors 2>&1 | head -50
```

## Basic Concepts

stress-ng uses "stressors" - individual test workers that load specific subsystems:

- `--cpu N`: N workers performing CPU-intensive math and crypto operations
- `--vm N`: N workers performing random memory read/write operations
- `--io N`: N workers performing sequential file I/O
- `--hdd N`: N workers performing disk I/O with multiple patterns
- `--timeout SECS`: Total test duration in seconds

## CPU Stress Testing

```bash
# Load all CPU cores for 60 seconds
# Automatically detects core count
stress-ng --cpu $(nproc) --timeout 60s --metrics-brief

# Stress specific number of cores
stress-ng --cpu 4 --timeout 30s

# Use a specific CPU stressor type
# matrix: floating-point matrix math (good thermal test)
stress-ng --cpu 4 --cpu-method matrix --timeout 60s

# Test all available CPU methods
stress-ng --cpu 4 --cpu-method all --timeout 120s

# View available CPU stressor methods
stress-ng --cpu-method list
```

CPU stress methods available:
- `all`: cycles through all methods
- `ackermann`: recursive Ackermann function
- `bitops`: bit manipulation operations
- `callfunc`: function call overhead
- `crc16`: CRC-16 computation
- `euler`: Euler series summation
- `fft`: Fast Fourier Transform
- `fibonacci`: Fibonacci calculation
- `matrix`: matrix multiplication (best for thermal testing)
- `sha512`: SHA-512 hashing

## Memory Stress Testing

```bash
# Stress memory with virtual memory workers
# Each worker allocates and writes random data
stress-ng --vm 2 --vm-bytes 1G --timeout 60s --metrics-brief

# Use 75% of available RAM
stress-ng --vm 2 --vm-bytes 75% --timeout 60s

# Test with malloc/free cycles
stress-ng --malloc 4 --timeout 60s

# NUMA memory stress (on multi-socket systems)
stress-ng --numa 4 --timeout 30s

# Memory hotplug stress
stress-ng --mmap 2 --mmap-bytes 512M --timeout 60s
```

## Disk I/O Stress Testing

```bash
# Basic disk I/O stress
stress-ng --hdd 4 --timeout 60s --metrics-brief

# Specify the target directory (use a dedicated test partition)
stress-ng --hdd 4 --hdd-dir /tmp/stress_test --timeout 60s

# Control write size per operation
stress-ng --hdd 4 --hdd-write-size 1M --timeout 60s

# Sequential I/O stress
stress-ng --sequential 0 --timeout 60s    # 0 = auto-detect cores

# File read/write mix
stress-ng --rdwr 4 --timeout 60s
```

## Combined System Stress Test

The most useful test for stability validation loads everything simultaneously:

```bash
# Full system stress test - CPU, memory, disk, and I/O
# Run for 10 minutes to identify thermal and stability issues
stress-ng \
    --cpu $(nproc) \
    --vm 2 --vm-bytes 1G \
    --hdd 2 \
    --io 4 \
    --timeout 600s \
    --metrics-brief \
    --log-file /tmp/stress_results.log

echo "Exit code: $?"
# Exit code 0 = all tests passed
# Non-zero = failures occurred
```

## Monitoring During Stress Tests

While stress-ng runs, monitor the system in another terminal:

```bash
# Monitor CPU temperature
watch -n 1 sensors

# Monitor CPU frequency and utilization
watch -n 1 "grep MHz /proc/cpuinfo | head -$(nproc)"

# Monitor memory usage
watch -n 1 "free -h"

# Monitor disk I/O
iostat -x 2

# Monitor all at once with htop
htop
```

Setting up temperature monitoring:

```bash
# Install sensor tools
sudo apt install lm-sensors -y

# Detect available sensors
sudo sensors-detect --auto

# Read temperatures
sensors

# Watch temperatures during stress test
watch -n 2 "sensors | grep -E 'Core|temp|Package'"
```

## Identifying Throttling Behavior

```bash
# Before starting stress test - note base frequencies
cat /proc/cpuinfo | grep "cpu MHz" | head -4

# Start stress test in background
stress-ng --cpu $(nproc) --cpu-method matrix --timeout 300s &
STRESS_PID=$!

# Poll CPU frequencies during test to detect throttling
for i in $(seq 1 30); do
    AVG_FREQ=$(cat /proc/cpuinfo | grep "cpu MHz" | awk -F: '{sum+=$2; count++} END {printf "%.0f", sum/count}')
    TEMP=$(sensors | grep "Package id 0" | awk '{print $4}' 2>/dev/null || echo "N/A")
    echo "$(date +%T) - CPU: ${AVG_FREQ} MHz  Temp: ${TEMP}"
    sleep 10
done

wait $STRESS_PID
echo "Stress test complete"
```

If CPU frequency drops significantly during the test (e.g., from 3.5 GHz to 2.0 GHz), thermal throttling is occurring.

## Memory Reliability Testing

For validating RAM after hardware changes:

```bash
# Extended memory test - allocates and verifies memory contents
# This is a light check; use memtest86 for thorough RAM validation
stress-ng \
    --vm-rw 2 \
    --timeout 300s \
    --metrics-brief \
    --verify    # Verify data integrity during test

# Run multiple memory stressors simultaneously
stress-ng \
    --malloc 4 \
    --mmap 4 \
    --shm 4 \
    --timeout 120s \
    --metrics-brief
```

## Network Stack Stress Testing

```bash
# Stress the networking stack with local socket operations
stress-ng --sock 4 --timeout 60s --metrics-brief

# UDP packet stress
stress-ng --udp 4 --timeout 60s

# TCP stress with various socket operations
stress-ng --sockfd 4 --timeout 60s

# Pipe operations (inter-process communication)
stress-ng --pipe 8 --timeout 60s
```

## Using Stressor Classes

stress-ng groups stressors into classes for convenience:

```bash
# Stress all CPU-related stressors
stress-ng --class cpu --all $(nproc) --timeout 60s

# Stress all I/O-related stressors
stress-ng --class io --all 4 --timeout 60s

# Stress all memory-related stressors
stress-ng --class memory --all 4 --timeout 60s

# List available classes
stress-ng --class list
```

## Generating Detailed Reports

```bash
# Run with YAML output for parsing
stress-ng \
    --cpu 4 \
    --vm 2 \
    --timeout 60s \
    --yaml /tmp/stress_report.yaml \
    --metrics-brief

# View the YAML report
cat /tmp/stress_report.yaml

# Generate JSON output
stress-ng \
    --cpu 4 \
    --timeout 60s \
    --json /tmp/stress_report.json

# Parse JSON results
cat /tmp/stress_report.json | python3 -m json.tool
```

## Scheduled Overnight Stability Test

For comprehensive hardware validation, run an overnight test:

```bash
#!/bin/bash
# overnight_stress.sh - Run comprehensive stress test overnight

LOG_DIR="/var/log/stress_tests"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/stress_${TIMESTAMP}.log"

mkdir -p "$LOG_DIR"

echo "Starting overnight stress test: $TIMESTAMP" | tee -a "$LOG_FILE"
echo "Duration: 8 hours" | tee -a "$LOG_FILE"
echo "CPU cores: $(nproc)" | tee -a "$LOG_FILE"
echo "Memory: $(free -h | grep Mem | awk '{print $2}')" | tee -a "$LOG_FILE"

# Record baseline temperatures
sensors >> "$LOG_FILE" 2>/dev/null

stress-ng \
    --cpu $(nproc) --cpu-method matrix \
    --vm 2 --vm-bytes 75% \
    --hdd 2 \
    --io 4 \
    --timeout 28800s \
    --metrics-brief \
    --yaml "${LOG_DIR}/stress_results_${TIMESTAMP}.yaml" \
    2>&1 | tee -a "$LOG_FILE"

EXIT_CODE=$?
echo "Test complete. Exit code: $EXIT_CODE" | tee -a "$LOG_FILE"
sensors >> "$LOG_FILE" 2>/dev/null

if [ $EXIT_CODE -eq 0 ]; then
    echo "PASS: All tests completed successfully"
else
    echo "FAIL: Some tests encountered errors - check $LOG_FILE"
fi
```

```bash
chmod +x overnight_stress.sh
nohup ./overnight_stress.sh &
```

## Interpreting Exit Codes

stress-ng exit codes tell you exactly what happened:

```bash
# Run a test and check the exit code
stress-ng --cpu 4 --timeout 30s
echo "Exit code: $?"

# Exit codes:
# 0 = SUCCESS - all tests passed
# 1 = ERROR - general error
# 2 = FAILED - some stressors failed
# 3 = PARTIAL - some stressors were skipped
# 130 = INTERRUPTED - test was killed with Ctrl+C
```

stress-ng is essential for any hardware acceptance testing workflow. After adding RAM, replacing a CPU, or modifying cooling, a 30-minute stress test under full load will quickly surface any stability problems that would otherwise show up at unpredictable times in production.
