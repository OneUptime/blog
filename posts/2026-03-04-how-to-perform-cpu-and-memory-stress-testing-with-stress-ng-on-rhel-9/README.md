# How to Perform CPU and Memory Stress Testing with stress-ng on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Performance, Benchmarking

Description: Step-by-step guide on perform cpu and memory stress testing with stress-ng on rhel 9 with practical examples and commands.

---

stress-ng provides comprehensive CPU and memory stress testing on RHEL 9 for hardware validation and capacity planning.

## Install stress-ng

```bash
sudo dnf install -y stress-ng
```

## CPU Stress Testing

```bash
# Stress all CPU cores for 60 seconds
stress-ng --cpu 0 --timeout 60s --metrics-brief

# Specific CPU methods
stress-ng --cpu 4 --cpu-method matrixprod --timeout 30s

# Mixed CPU workload
stress-ng --cpu 4 --cpu-method all --timeout 120s --metrics-brief
```

## Memory Stress Testing

```bash
# Allocate and stress 4 GB of memory
stress-ng --vm 2 --vm-bytes 2G --timeout 60s --metrics-brief

# Memory with specific patterns
stress-ng --vm 4 --vm-bytes 1G --vm-method all --timeout 120s
```

## Combined Stress Test

```bash
stress-ng --cpu 4 --vm 2 --vm-bytes 2G --io 4 --timeout 300s --metrics-brief
```

## Monitoring During Tests

```bash
# In another terminal
sar -u 1 60
vmstat 1 60
mpstat -P ALL 1 60
```

## Interpret Results

```bash
# stress-ng outputs metrics including:
# - bogo operations per second
# - real time vs user time
# Compare across different hardware to evaluate performance
```

## Conclusion

stress-ng on RHEL 9 validates hardware stability and provides baseline performance metrics. Run extended tests (hours or days) for hardware burn-in and shorter tests for quick performance comparisons.

