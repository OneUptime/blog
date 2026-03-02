# How to Configure Intel P-State Driver on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Intel, Power Management, CPU, Performance

Description: Configure the Intel P-State CPU driver on Ubuntu to control frequency scaling behavior, balance power and performance, and tune settings for different workloads.

---

The Intel P-State driver is a CPU frequency scaling driver specifically designed for Intel Core processors (Sandy Bridge and newer). Unlike the older `acpi-cpufreq` driver, P-State communicates directly with the processor's built-in frequency control, allowing finer-grained and more responsive frequency management. Understanding how to configure it lets you tune the balance between power consumption and performance.

## Checking if Intel P-State is Active

```bash
# Check which driver is handling CPU frequency
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_driver

# Intel P-State active output:
# intel_pstate

# Or check directly
ls /sys/devices/system/cpu/intel_pstate/

# Check current governor
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

# List available governors under P-State
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_available_governors
# Typically: performance powersave
```

With Intel P-State active, only `performance` and `powersave` governors are available by default - not `ondemand`, `schedutil`, etc. Those are available only under `acpi-cpufreq`.

## Intel P-State Operating Modes

Intel P-State has two operating modes:

**Active mode** (default): The driver fully manages frequency scaling. The `powersave` governor in this mode uses `schedutil`-like behavior internally, dynamically adjusting based on load.

**Passive mode**: The driver hands frequency control to the Linux CPUFreq framework, enabling governors like `schedutil` and `ondemand`.

```bash
# Check current mode
cat /sys/devices/system/cpu/intel_pstate/status
# Outputs: active, passive, or off

# Switch to passive mode (enables all CPUFreq governors)
echo passive | sudo tee /sys/devices/system/cpu/intel_pstate/status

# Switch back to active mode
echo active | sudo tee /sys/devices/system/cpu/intel_pstate/status
```

## P-State Specific Tuning Parameters

```bash
# Directory containing all P-State parameters
ls /sys/devices/system/cpu/intel_pstate/

# Files you'll typically see:
# max_perf_pct         - maximum frequency as percentage of max
# min_perf_pct         - minimum frequency as percentage of max
# no_turbo             - disable/enable turbo boost (0=enabled, 1=disabled)
# status               - active/passive/off
# turbo_pct            - percentage of frequencies that are turbo
# num_pstates          - total number of P-states available
# hwp_dynamic_boost    - hardware-controlled dynamic boost

# View current settings
cat /sys/devices/system/cpu/intel_pstate/max_perf_pct
cat /sys/devices/system/cpu/intel_pstate/min_perf_pct
cat /sys/devices/system/cpu/intel_pstate/no_turbo
```

### Capping Maximum Frequency

```bash
# Limit CPU to 80% of max frequency (reduces heat and power)
echo 80 | sudo tee /sys/devices/system/cpu/intel_pstate/max_perf_pct

# Example: 3.0 GHz max CPU, setting 80% = 2.4 GHz cap
# This prevents turbo boost and limits sustained frequency

# View actual frequency range
cat /sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_min_freq
cat /sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq
# Values are in kHz
```

### Setting Minimum Frequency

```bash
# Set minimum to 20% of max (allows more aggressive power saving)
echo 20 | sudo tee /sys/devices/system/cpu/intel_pstate/min_perf_pct

# For latency-sensitive workloads, set minimum higher
# to avoid frequency ramp-up delay
echo 50 | sudo tee /sys/devices/system/cpu/intel_pstate/min_perf_pct
```

### Controlling Turbo Boost

```bash
# Disable Turbo Boost (1 = disabled)
echo 1 | sudo tee /sys/devices/system/cpu/intel_pstate/no_turbo

# Enable Turbo Boost (0 = enabled, default)
echo 0 | sudo tee /sys/devices/system/cpu/intel_pstate/no_turbo

# Check if turbo is available
cat /sys/devices/system/cpu/intel_pstate/turbo_pct
# Shows percentage of frequencies that are turbo frequencies
```

Disabling turbo is useful when you need predictable, consistent CPU performance (like in benchmarking or real-time workloads) or when the system is overheating.

## Governor Selection Under P-State

In active mode:

```bash
# powersave governor - dynamically adjusts, prioritizes power
echo powersave | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# performance governor - prefers high frequencies
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
```

Despite being named `powersave`, the Intel P-State powersave governor is dynamic - it ramps up when needed. The difference from `performance` is how aggressively it ramps up and how quickly it drops back down.

In passive mode, you can use any governor:

```bash
# Switch to passive mode first
echo passive | sudo tee /sys/devices/system/cpu/intel_pstate/status

# Now all governors are available
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_available_governors
# conservative ondemand userspace powersave performance schedutil

# Set schedutil (usually best for general use)
echo schedutil | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
```

## Hardware-Controlled P-States (HWP)

Modern Intel CPUs support Hardware-Controlled P-States (HWP), where the CPU hardware itself manages frequency selection:

```bash
# Check if HWP is available
cat /sys/devices/system/cpu/cpu0/cpufreq/energy_performance_available_preferences
# Outputs: default performance balance_performance balance_power power

# Set HWP preference (affects how hardware makes frequency decisions)
# Apply to all CPUs
echo balance_power | sudo tee \
  /sys/devices/system/cpu/cpu*/cpufreq/energy_performance_preference

# Options:
# default          - hardware chooses
# performance      - maximize performance
# balance_performance - lean toward performance
# balance_power    - lean toward power saving
# power            - maximize power saving
```

HWP works in conjunction with the software governor - the governor sets the general policy, HWP handles microsecond-level decisions.

## Persistent Configuration

P-State settings don't persist across reboots. Options for persistence:

### Boot Parameters

```bash
# Add kernel parameters for permanent P-State configuration
sudo nano /etc/default/grub

# Examples of boot parameters:
# intel_pstate=passive                    - start in passive mode
# intel_pstate=disable                    - disable P-State driver entirely
# intel_pstate=no_turbo                   - disable turbo at boot

# Apply the change
sudo update-grub
```

### Systemd Service

```bash
# Create a script to apply P-State settings at boot
sudo tee /usr/local/bin/intel-pstate-tune.sh << 'EOF'
#!/bin/bash

# Set max performance to 90% (prevent excessive boost)
echo 90 > /sys/devices/system/cpu/intel_pstate/max_perf_pct

# Set minimum to 30%
echo 30 > /sys/devices/system/cpu/intel_pstate/min_perf_pct

# Keep turbo enabled
echo 0 > /sys/devices/system/cpu/intel_pstate/no_turbo

# Set powersave governor with balanced_power HWP preference
echo powersave > /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
for cpu in /sys/devices/system/cpu/cpu*/cpufreq/energy_performance_preference; do
    echo balance_power > "$cpu"
done
EOF

sudo chmod +x /usr/local/bin/intel-pstate-tune.sh

# Create systemd service
sudo tee /etc/systemd/system/intel-pstate-tune.service << 'EOF'
[Unit]
Description=Intel P-State Tuning
After=multi-user.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/intel-pstate-tune.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable intel-pstate-tune
sudo systemctl start intel-pstate-tune
```

## Monitoring P-State Behavior

```bash
# Watch CPU frequencies in real time
watch -n 1 "cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_cur_freq | sort -n | head -5"

# Use cpupower to view frequency info
sudo apt install linux-tools-common linux-tools-$(uname -r)
sudo cpupower frequency-info

# Monitor all CPUs
sudo cpupower -c all frequency-info | grep "current CPU frequency"

# Use powertop for power-level view
sudo powertop

# Check if CPUs are reaching turbo frequencies
grep MHz /proc/cpuinfo | sort -t: -k2 -n | tail -5
```

## Typical Configurations by Use Case

**Laptop - Battery Life Priority:**
```bash
echo 60 > /sys/devices/system/cpu/intel_pstate/max_perf_pct
echo power > /sys/devices/system/cpu/cpu*/cpufreq/energy_performance_preference
```

**Server - Balanced:**
```bash
echo powersave > /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
echo balance_power > /sys/devices/system/cpu/cpu*/cpufreq/energy_performance_preference
```

**Workstation - Performance:**
```bash
echo performance > /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
echo performance > /sys/devices/system/cpu/cpu*/cpufreq/energy_performance_preference
```

**Real-time / Low Latency:**
```bash
echo 100 > /sys/devices/system/cpu/intel_pstate/min_perf_pct
echo performance > /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
```

The Intel P-State driver provides more responsive and accurate frequency control than generic ACPI power management. Taking time to tune it for your specific workload pays off in both performance and power efficiency.
