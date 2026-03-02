# How to Use cpufrequtils to Manage CPU Frequency Scaling on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Performance Tuning, Linux, CPU, Power Management

Description: Learn how to use cpufrequtils on Ubuntu to manage CPU frequency scaling governors, view current CPU frequencies, and optimize performance for server and desktop workloads.

---

CPU frequency scaling allows the processor to run at different speeds depending on workload. On battery-powered laptops this saves energy. On servers, it can cause unexpected latency spikes when the CPU needs to ramp from idle frequency to maximum under sudden load.

`cpufrequtils` is the userspace tool for viewing and controlling CPU frequency scaling on Linux. Understanding it lets you choose the right trade-off between power efficiency and performance for your workload.

## Installing cpufrequtils

```bash
sudo apt update
sudo apt install cpufrequtils -y
```

Also useful:

```bash
# Install linux-tools for additional CPU freq tools
sudo apt install linux-tools-$(uname -r) -y
```

## Viewing Current CPU Frequency

```bash
# Show frequency info for all CPUs
cpufreq-info

# Show only the current frequency for each CPU
cpufreq-info -f

# Show frequency info for a specific CPU
cpufreq-info -c 0  # CPU 0
```

Output for `cpufreq-info -c 0`:

```
cpufrequtils 008: cpufreq-info (C) Dominik Brodowski 2004-2009
analyzing CPU 0:
  driver: intel_pstate
  CPUs which run at the same hardware frequency: 0
  CPUs which need to have their frequency coordinated by software: 0
  maximum transition latency: 4294.55 ms.
  hardware limits: 800 MHz - 3.60 GHz
  available cpufreq governors: performance, powersave
  current policy: frequency should be within 800 MHz and 3.60 GHz.
                  The governor "powersave" may decide which speed to use
  current CPU frequency is 2.10 GHz.
```

## Understanding Governors

The CPU frequency governor is the algorithm that decides when to change frequencies:

| Governor | Behavior | Best For |
|----------|----------|----------|
| `performance` | Always runs at maximum frequency | Server workloads, latency-sensitive applications |
| `powersave` | Always runs at minimum frequency | Low-power scenarios |
| `ondemand` | Scales up quickly on load, down slowly | General purpose |
| `conservative` | Scales up/down gradually | Battery-powered devices |
| `schedutil` | Uses scheduler utilization data (modern default) | General purpose, good balance |
| `userspace` | User controls frequency manually | Testing and benchmarking |

Available governors depend on the CPU driver:

```bash
# Check available governors
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_available_governors
```

## Checking the Current Governor

```bash
# All CPUs
for cpu in /sys/devices/system/cpu/cpu[0-9]*/cpufreq/scaling_governor; do
    echo "$cpu: $(cat $cpu)"
done

# Simpler: just show CPU0 (usually all cores use the same)
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

# Using cpufreq-info
cpufreq-info -p
```

## Setting the Governor

### Using cpufreq-set

```bash
# Set performance governor for all CPUs
sudo cpufreq-set -g performance

# Set for a specific CPU
sudo cpufreq-set -c 0 -g performance
sudo cpufreq-set -c 1 -g performance

# Set powersave
sudo cpufreq-set -g powersave
```

### Setting Across All CPUs at Once

```bash
# Loop through all CPUs
for cpu in $(seq 0 $(($(nproc) - 1))); do
    sudo cpufreq-set -c $cpu -g performance
done

# Alternative with cpupower (from linux-tools)
sudo cpupower frequency-set --governor performance
```

## Setting Minimum and Maximum Frequencies

Constrain the frequency range:

```bash
# Get available frequency steps
cpufreq-info -s

# Set minimum frequency to 2GHz, max to 3.6GHz
sudo cpufreq-set -c 0 --min 2GHz --max 3.6GHz

# Lock to a specific frequency (requires userspace governor)
sudo cpufreq-set -c 0 -g userspace
sudo cpufreq-set -c 0 -f 2.4GHz
```

## Making Settings Persistent

cpufreq-set changes are not persistent across reboots. Use a systemd service:

```bash
sudo nano /etc/systemd/system/cpu-performance.service
```

```ini
[Unit]
Description=Set CPU governor to performance
After=sysinit.target

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'for cpu in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do echo performance > "$cpu"; done'
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable cpu-performance
sudo systemctl start cpu-performance
```

Alternatively, use the `cpufrequtils` configuration file:

```bash
sudo nano /etc/init.d/cpufrequtils
# Or more cleanly:
echo 'GOVERNOR="performance"' | sudo tee /etc/default/cpufrequtils
```

Then restart:

```bash
sudo systemctl restart cpufrequtils
```

## Using cpupower (Modern Alternative)

`cpupower` from `linux-tools` is more capable than cpufrequtils:

```bash
sudo apt install linux-tools-common linux-tools-$(uname -r) -y

# Show CPU frequency info
sudo cpupower frequency-info

# Set governor for all CPUs
sudo cpupower frequency-set --governor performance

# Set minimum frequency
sudo cpupower frequency-set --min 2GHz

# View power-related CPU features
sudo cpupower idle-info
sudo cpupower monitor
```

## Intel pstate Driver Considerations

Modern Intel CPUs use the `intel_pstate` driver rather than the traditional `acpi-cpufreq`. This driver has its own behavior:

```bash
# Check which driver is active
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_driver
```

If using `intel_pstate`:

```bash
# Check pstate-specific controls
ls /sys/devices/system/cpu/intel_pstate/

# View current max performance percentage
cat /sys/devices/system/cpu/intel_pstate/max_perf_pct

# Set to 100% (full performance)
echo 100 | sudo tee /sys/devices/system/cpu/intel_pstate/max_perf_pct

# Min performance percentage
cat /sys/devices/system/cpu/intel_pstate/min_perf_pct
```

With `intel_pstate`, only `performance` and `powersave` governors are available. To get access to `ondemand`, `conservative`, etc., you need to switch the driver:

```bash
# Switch from intel_pstate to acpi-cpufreq (in GRUB)
sudo nano /etc/default/grub

# Add to GRUB_CMDLINE_LINUX:
# intel_pstate=disable
```

## Monitoring Frequency in Real Time

```bash
# Watch CPU frequency in real time
watch -n 0.5 "cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_cur_freq | \
  awk '{sum += \$1/1000000; n++} END {printf \"Avg freq: %.2f GHz\n\", sum/n}'"

# Per-core frequency
watch -n 1 "for i in \$(seq 0 \$(($(nproc)-1))); do
    freq=\$(cat /sys/devices/system/cpu/cpu\$i/cpufreq/scaling_cur_freq)
    echo \"CPU\$i: \$(echo "scale=2; \$freq/1000000" | bc) GHz\"
done"

# Use turbostat for detailed frequency and power data (Intel)
sudo apt install linux-tools-$(uname -r) -y
sudo turbostat --interval 1 --num_iterations 5
```

## Performance Impact of Frequency Scaling

The latency impact of frequency scaling is often underestimated. When a server receives a burst of requests after an idle period, the CPU may be running at 800MHz. The time to ramp to 3.6GHz with typical `ondemand` governor settings can be 10-50ms.

For latency-sensitive applications, this ramp-up time adds to tail latency. Setting the governor to `performance` eliminates this at the cost of higher power consumption:

```bash
# Before: measure response time with powersave governor
sudo cpufreq-set -g powersave
ab -n 1000 -c 10 http://localhost/ 2>&1 | grep "99%"

# After: measure with performance governor
sudo cpufreq-set -g performance
ab -n 1000 -c 10 http://localhost/ 2>&1 | grep "99%"
```

The difference in 99th percentile latency is often dramatic for IO-light, CPU-intensive endpoints.

## BIOS Power Settings

`cpufreq-set` settings interact with BIOS/firmware settings. On many servers, the BIOS has "Power Management" or "Performance Profile" settings that override OS-level frequency scaling. If `cpufreq-set -g performance` doesn't seem to take effect:

1. Check BIOS/IPMI settings for "OS DBPM" or similar options that allow OS control
2. Set BIOS power profile to "Maximum Performance"
3. Check if hardware is limiting frequency:

```bash
# Check for hardware-imposed frequency limits
sudo cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq
sudo cat /sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq

# Thermal throttling?
sudo dmesg | grep -i "thermal\|throttl"
```

For production servers where consistent performance matters, setting the governor to `performance` in both BIOS and OS is the recommended starting point. Power costs are usually minor compared to the cost of a slow or inconsistent application.
