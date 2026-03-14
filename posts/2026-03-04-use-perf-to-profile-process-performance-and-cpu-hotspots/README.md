# How to Use perf to Profile Process Performance and CPU Hotspots on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Perf, Performance, Linux

Description: Learn how to use perf to Profile Process Performance and CPU Hotspots on RHEL with step-by-step instructions, configuration examples, and best practices.

---

perf is a powerful Linux profiling tool that samples CPU events to identify performance hotspots in your applications. It works at the kernel level with minimal overhead, making it suitable for production profiling.

## Prerequisites

- RHEL
- Root or sudo access
- Debug symbols for detailed analysis (optional but recommended)

## Step 1: Install perf

```bash
sudo dnf install -y perf
```

For debug symbols:

```bash
sudo dnf debuginfo-install -y <package-name>
```

## Step 2: Profile a Command

```bash
sudo perf record -g ./myapp
```

The `-g` flag enables call graph recording. This creates a `perf.data` file.

## Step 3: Analyze the Profile

```bash
sudo perf report
```

This opens an interactive view showing which functions consumed the most CPU time. Navigate with arrow keys, press Enter to drill into call chains.

## Step 4: Profile a Running Process

```bash
sudo perf record -g -p $(pidof myapp) -- sleep 30
```

This profiles the process for 30 seconds.

## Step 5: Quick CPU Statistics

```bash
sudo perf stat ./myapp
```

Output includes:
- Instructions executed
- CPU cycles
- Cache misses
- Branch mispredictions
- Context switches

```bash
Performance counter stats for './myapp':
     1,234,567,890  instructions
       456,789,012  cycles
         1,234,567  cache-misses
```

## Step 6: Real-Time Top-Like View

```bash
sudo perf top
```

This shows which functions are consuming CPU right now across the entire system.

For a specific process:

```bash
sudo perf top -p $(pidof myapp)
```

## Step 7: Generate a Flamegraph

```bash
sudo perf record -g -p $(pidof myapp) -- sleep 30
sudo perf script > out.perf
```

Then use Brendan Gregg's FlameGraph tools:

```bash
git clone https://github.com/brendangregg/FlameGraph.git
./FlameGraph/stackcollapse-perf.pl out.perf > out.folded
./FlameGraph/flamegraph.pl out.folded > flamegraph.svg
```

Open `flamegraph.svg` in a browser for a visual representation of where CPU time is spent.

## Step 8: Trace Specific Events

List available events:

```bash
sudo perf list
```

Trace cache misses:

```bash
sudo perf stat -e cache-misses,cache-references ./myapp
```

## Conclusion

perf is the premier CPU profiling tool on RHEL, providing low-overhead sampling, detailed call graphs, and hardware performance counter access. Use it to identify CPU hotspots, cache inefficiencies, and branch mispredictions in both user-space applications and kernel code.
