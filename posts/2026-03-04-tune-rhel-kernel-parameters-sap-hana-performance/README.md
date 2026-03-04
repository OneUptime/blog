# How to Tune RHEL Kernel Parameters for SAP HANA Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SAP HANA, Kernel Tuning, Performance, sysctl, Linux

Description: Configure RHEL kernel parameters for optimal SAP HANA performance, covering memory management, networking, and CPU settings required by SAP.

---

SAP HANA has specific kernel parameter requirements for optimal performance on RHEL. These parameters control memory management, network behavior, and process limits. Incorrect settings can lead to poor performance or HANA startup failures.

## Using the SAP HANA Tuned Profile

The simplest way to apply most settings is through the tuned profile:

```bash
# Install tuned profiles for SAP
sudo dnf install -y tuned-profiles-sap-hana

# Activate the SAP HANA profile
sudo tuned-adm profile sap-hana

# Verify the active profile
tuned-adm active
# Output: Current active profile: sap-hana
```

## Critical sysctl Parameters

Configure the parameters required by SAP HANA:

```bash
# /etc/sysctl.d/sap-hana.conf
# Memory management
vm.max_map_count = 2147483647
vm.memory_failure_early_kill = 1
vm.swappiness = 10

# Disable NUMA balancing (critical for HANA)
kernel.numa_balancing = 0

# Disable transparent huge pages for HANA
# (handled separately - see below)

# Network parameters
net.core.somaxconn = 4096
net.core.netdev_max_backlog = 300000
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_timestamps = 1
net.ipv4.tcp_slow_start_after_idle = 0
```

Apply the parameters:

```bash
# Load the new settings
sudo sysctl --system

# Verify specific values
sysctl vm.max_map_count
sysctl kernel.numa_balancing
```

## Disabling Transparent Huge Pages

SAP HANA manages its own huge pages. Disable THP:

```bash
# Check current THP status
cat /sys/kernel/mm/transparent_hugepage/enabled

# Disable THP at runtime
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag

# Make it persistent via GRUB
sudo grubby --update-kernel=ALL --args="transparent_hugepage=never"
```

## Configuring Process Limits

Set limits for the SAP HANA admin user:

```bash
# /etc/security/limits.d/sap-hana.conf
@sapsys  hard  nofile  1048576
@sapsys  soft  nofile  1048576
@sapsys  hard  nproc   unlimited
@sapsys  soft  nproc   unlimited
@sapsys  hard  memlock unlimited
@sapsys  soft  memlock unlimited
```

## CPU Frequency Scaling

Set the CPU governor to performance mode:

```bash
# Check current governor
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

# Set to performance (the tuned sap-hana profile does this)
# To verify:
cpupower frequency-info | grep governor

# Manual override if needed
sudo cpupower frequency-set -g performance
```

## Verifying All Settings

Run a comprehensive check:

```bash
#!/bin/bash
# /usr/local/bin/check-hana-params.sh
echo "=== SAP HANA Kernel Parameter Check ==="
echo "vm.max_map_count: $(sysctl -n vm.max_map_count)"
echo "kernel.numa_balancing: $(sysctl -n kernel.numa_balancing)"
echo "vm.swappiness: $(sysctl -n vm.swappiness)"
echo "THP: $(cat /sys/kernel/mm/transparent_hugepage/enabled)"
echo "Tuned profile: $(tuned-adm active)"
echo "CPU governor: $(cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor 2>/dev/null || echo 'N/A')"
```
