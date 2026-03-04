# How to Tune vm.swappiness and Swap Behavior on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Memory, Swap, Linux

Description: Learn how to tune vm.swappiness and Swap Behavior on RHEL with step-by-step instructions, configuration examples, and best practices.

---

The vm.swappiness parameter controls how aggressively the kernel moves memory pages from RAM to swap space. Tuning this value, along with understanding swap behavior, helps balance performance and memory availability on RHEL.

## Prerequisites

- RHEL
- Root or sudo access
- Swap space configured

## Understanding vm.swappiness

The swappiness value ranges from 0 to 200 (with cgroup v2):
- `0` - Kernel avoids swapping as much as possible
- `60` - Default value, moderate swapping
- `100` - Kernel treats swap and RAM equally
- `200` - Maximum swap aggressiveness (cgroup v2 only)

## Step 1: Check Current Swappiness

```bash
cat /proc/sys/vm/swappiness
swapon --show
free -h
```

## Step 2: Adjust Swappiness

For database servers or latency-sensitive workloads (minimize swapping):

```bash
sudo sysctl -w vm.swappiness=10
```

For general-purpose servers:

```bash
sudo sysctl -w vm.swappiness=30
```

## Step 3: Make Persistent

```bash
echo "vm.swappiness=10" | sudo tee /etc/sysctl.d/99-swappiness.conf
sudo sysctl --system
```

## Step 4: Monitor Swap Usage

```bash
vmstat 1 5
```

Key columns:
- `si` - Swap in (pages read from swap)
- `so` - Swap out (pages written to swap)

If `si` and `so` are consistently high, your system is thrashing.

```bash
sar -W 1 5
```

## Step 5: Check Per-Process Swap Usage

```bash
for pid in /proc/[0-9]*; do
    swap=$(grep VmSwap "$pid/status" 2>/dev/null | awk '{print $2}')
    if [ "$swap" -gt 0 ] 2>/dev/null; then
        comm=$(cat "$pid/comm" 2>/dev/null)
        echo "$comm (PID $(basename $pid)): ${swap} kB"
    fi
done | sort -t: -k2 -rn | head -10
```

## Step 6: Configure Swap Priority

If you have multiple swap devices:

```bash
swapon --show
sudo swapoff /dev/sdb1
sudo swapon -p 10 /dev/sdb1   # Higher priority = used first
```

## Step 7: Use zram as Compressed Swap

zram creates a compressed block device in RAM, acting as fast swap:

```bash
sudo dnf install -y zram-generator
sudo vi /etc/systemd/zram-generator.conf
```

```ini
[zram0]
zram-size = ram / 2
compression-algorithm = zstd
```

```bash
sudo systemctl daemon-reload
sudo systemctl start /dev/zram0
swapon --show
```

## Conclusion

Tuning vm.swappiness on RHEL lets you control the tradeoff between keeping applications in RAM and using swap for less active pages. Lower values suit latency-sensitive workloads, while higher values work for systems that need to maximize the number of running processes. Consider zram for compressed in-memory swap as a high-performance alternative.
