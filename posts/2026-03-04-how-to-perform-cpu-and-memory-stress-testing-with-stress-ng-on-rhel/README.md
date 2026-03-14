# How to Perform CPU and Memory Stress Testing with stress-ng on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Stress-ng, Performance Testing, Linux, Benchmarking

Description: Learn how to install and use stress-ng on RHEL to perform CPU and memory stress tests, helping you validate system stability under load.

---

stress-ng is a versatile tool that can stress test various system resources including CPU, memory, I/O, and more. It is useful for validating hardware stability, testing thermal management, and benchmarking performance on RHEL systems.

## Installing stress-ng

Install stress-ng from the EPEL repository:

```bash
# Enable EPEL repository
sudo dnf install -y epel-release

# Install stress-ng
sudo dnf install -y stress-ng
```

## CPU Stress Testing

Run a CPU stress test using all available cores:

```bash
# Stress all CPU cores for 60 seconds
stress-ng --cpu 0 --timeout 60s --metrics-brief

# Stress with a specific CPU method (e.g., matrix multiplication)
stress-ng --cpu 4 --cpu-method matrixprod --timeout 120s --metrics-brief
```

The `--cpu 0` flag tells stress-ng to use all available CPU cores. The `--metrics-brief` flag prints a summary at the end.

## Memory Stress Testing

Test memory allocation and access patterns:

```bash
# Stress 4 memory workers, each allocating 1GB
stress-ng --vm 4 --vm-bytes 1G --timeout 60s --metrics-brief

# Test with specific memory access patterns
stress-ng --vm 2 --vm-bytes 2G --vm-method walk --timeout 120s --metrics-brief
```

## Combined CPU and Memory Test

```bash
# Run both CPU and memory stress simultaneously
stress-ng --cpu 4 --vm 2 --vm-bytes 1G --timeout 300s --metrics-brief
```

## Monitoring During Tests

While running stress-ng, monitor system resources in another terminal:

```bash
# Watch CPU and memory usage
top -b -n 1 | head -20

# Check CPU temperature (requires lm_sensors)
sensors

# Monitor memory usage
free -h
```

## Setting Resource Limits

You can limit the CPU load percentage:

```bash
# Stress CPU at 80% load for 5 minutes
stress-ng --cpu 0 --cpu-load 80 --timeout 300s --metrics-brief
```

stress-ng provides detailed metrics at completion, including bogo-ops (bogus operations per second), which gives a relative performance comparison across runs and systems.
