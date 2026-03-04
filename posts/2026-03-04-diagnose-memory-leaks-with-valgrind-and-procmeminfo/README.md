# How to Diagnose Memory Leaks with Valgrind and /proc/meminfo on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, proc, Debugging, Memory, Linux

Description: Learn how to diagnose Memory Leaks with Valgrind and /proc/meminfo on RHEL with step-by-step instructions, configuration examples, and best practices.

---

Memory leaks cause applications to consume ever-increasing amounts of RAM until they crash or trigger the OOM killer. Valgrind and /proc/meminfo are complementary tools for detecting and diagnosing memory leaks on RHEL.

## Prerequisites

- RHEL
- Root or sudo access
- Debug symbols for the target application (recommended)

## Step 1: Install Valgrind

```bash
sudo dnf install -y valgrind
```

## Step 2: Run Valgrind Memcheck

```bash
valgrind --leak-check=full --show-leak-kinds=all ./myapp
```

Valgrind runs your program in a virtual CPU and tracks every memory allocation. When the program exits, it reports:

```
LEAK SUMMARY:
   definitely lost: 1,024 bytes in 4 blocks
   indirectly lost: 0 bytes in 0 blocks
     possibly lost: 512 bytes in 2 blocks
   still reachable: 2,048 bytes in 8 blocks
        suppressed: 0 bytes in 0 blocks
```

- **definitely lost** - Memory that was allocated but never freed and no pointer references it
- **possibly lost** - Memory that might be lost (interior pointers exist)
- **still reachable** - Memory still referenced at exit (not technically a leak)

## Step 3: Get Detailed Stack Traces

```bash
valgrind --leak-check=full --track-origins=yes --num-callers=20 ./myapp
```

This shows exactly which function allocated the leaked memory.

## Step 4: Monitor Memory Growth with /proc/meminfo

For long-running services where Valgrind is too slow:

```bash
while true; do
    echo "$(date): RSS=$(cat /proc/$(pidof myapp)/status | grep VmRSS)"
    sleep 60
done
```

Or use a more detailed view:

```bash
cat /proc/$(pidof myapp)/smaps_rollup
```

## Step 5: Track Memory Over Time

```bash
pidstat -r -p $(pidof myapp) 60
```

If RSS grows continuously, you likely have a memory leak.

## Step 6: Use Valgrind with Massif for Heap Profiling

```bash
valgrind --tool=massif ./myapp
ms_print massif.out.<pid>
```

Massif shows heap usage over time and identifies which allocations are responsible for peak memory consumption.

## Step 7: Check System-Wide Memory

```bash
cat /proc/meminfo | grep -E 'MemTotal|MemFree|MemAvailable|Buffers|Cached|Slab'
```

| Field | Description |
|-------|-------------|
| `MemTotal` | Total physical RAM |
| `MemAvailable` | Estimated available memory |
| `Buffers` | Kernel buffer cache |
| `Cached` | Page cache |
| `Slab` | Kernel data structure cache |

## Conclusion

Valgrind is the gold standard for finding memory leaks in compiled programs on RHEL, though it adds significant overhead. For production monitoring, track RSS growth via /proc and pidstat. Combine both approaches for thorough leak detection and diagnosis.
