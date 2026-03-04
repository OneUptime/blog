# How to Select and Apply TuneD Performance Profiles on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, TuneD, Performance, Profiles, Linux, System Tuning

Description: Learn how to select and apply the right TuneD performance profile on RHEL for your specific workload.

---

RHEL ships with multiple TuneD profiles designed for different workloads. Selecting the right profile can significantly improve performance for databases, web servers, virtual machines, and latency-sensitive applications.

## Prerequisites

- A RHEL system with TuneD installed and running
- Root or sudo access

## Available TuneD Profiles

List all profiles:

```bash
tuned-adm list
```

### General Purpose Profiles

**balanced** - Balances performance and power consumption. Good default for mixed workloads:

```bash
sudo tuned-adm profile balanced
```

**throughput-performance** - Optimized for maximum throughput. Disables power saving, sets the performance CPU governor:

```bash
sudo tuned-adm profile throughput-performance
```

### Latency-Sensitive Profiles

**latency-performance** - Minimizes latency by disabling power management features:

```bash
sudo tuned-adm profile latency-performance
```

**network-latency** - Extends latency-performance with network-specific tuning like disabling transparent huge pages and tuning socket buffers:

```bash
sudo tuned-adm profile network-latency
```

### Network Profiles

**network-throughput** - Maximizes network throughput by increasing buffer sizes:

```bash
sudo tuned-adm profile network-throughput
```

### Virtualization Profiles

**virtual-guest** - Optimizes a VM guest by reducing swappiness and adjusting disk readahead:

```bash
sudo tuned-adm profile virtual-guest
```

**virtual-host** - Optimizes a KVM hypervisor host:

```bash
sudo tuned-adm profile virtual-host
```

### Power Saving Profiles

**powersave** - Maximizes power savings at the cost of performance:

```bash
sudo tuned-adm profile powersave
```

## Getting a Recommendation

Let TuneD analyze your system and recommend a profile:

```bash
tuned-adm recommend
```

On a virtual machine, it typically recommends `virtual-guest`. On bare metal, it may recommend `throughput-performance`.

## Applying a Profile

Set a profile:

```bash
sudo tuned-adm profile throughput-performance
```

Verify it is active:

```bash
tuned-adm active
```

Confirm settings are applied:

```bash
sudo tuned-adm verify
```

## Applying Multiple Profiles

You can merge multiple profiles. The second profile overrides conflicting settings from the first:

```bash
sudo tuned-adm profile throughput-performance network-throughput
```

## Comparing Profile Effects

Check the current CPU governor:

```bash
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
```

Check transparent huge pages setting:

```bash
cat /sys/kernel/mm/transparent_hugepage/enabled
```

Check disk scheduler:

```bash
cat /sys/block/sda/queue/scheduler
```

Switch profiles and compare these values to understand the impact.

## Persisting Profiles Across Reboots

TuneD automatically persists the selected profile across reboots. The active profile is stored in:

```bash
cat /etc/tuned/active_profile
```

## Conclusion

Selecting the right TuneD profile is one of the easiest performance wins on RHEL. Match your profile to your workload: use `throughput-performance` for servers, `latency-performance` for real-time workloads, and `virtual-guest` for VMs.
