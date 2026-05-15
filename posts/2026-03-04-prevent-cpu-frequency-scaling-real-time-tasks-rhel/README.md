# How to Prevent CPU Frequency Scaling from Affecting Real-Time Tasks on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Real-Time, CPU Frequency, Power Management, Performance Tuning, Linux

Description: Disable CPU frequency scaling and power-saving features on RHEL to prevent latency spikes caused by frequency transitions in real-time workloads.

---

CPU frequency scaling (also called dynamic voltage and frequency scaling) adjusts processor speed to save power. While this is beneficial for general workloads, the transition time between frequency states introduces latency that is unacceptable for real-time applications.

## Check Current CPU Frequency Governor

```bash
# View the active frequency governor for each CPU

cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Check the current CPU frequencies
cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_cur_freq

# View available governors
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_available_governors
```

## Set the Performance Governor

The `performance` governor requests the highest allowed frequency within the `scaling_max_freq` policy limit.

```bash
# Set all CPUs to the performance governor
for cpu in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
    echo performance | sudo tee "$cpu"
done

# Verify the change
cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
```

## Use tuned for Persistent Configuration

The `tuned` daemon provides profiles that persist across reboots.

```bash
# Install tuned if not already present
sudo dnf install -y tuned

# Enable and start tuned
sudo systemctl enable --now tuned

# Use latency-performance, or realtime on RHEL for Real Time
# when the tuned-profiles-realtime package is installed
sudo tuned-adm profile latency-performance

# Verify the active profile
sudo tuned-adm active
# Output: Current active profile: latency-performance
```

## Disable C-States via Kernel Parameters

CPU C-states allow the processor to enter idle power-saving modes. Exiting deep C-states takes time and causes latency.

```bash
# Disable deep C-states by limiting the maximum C-state
sudo grubby --update-kernel=ALL \
  --args="processor.max_cstate=0 intel_idle.max_cstate=0"

# Also disable the intel_pstate driver if you need to use another cpufreq driver
sudo grubby --update-kernel=ALL \
  --args="intel_pstate=disable"

# Reboot for changes to take effect
sudo reboot
```

## Verify C-State Configuration After Reboot

```bash
# Check the maximum allowed C-state
cat /sys/module/processor/parameters/max_cstate 2>/dev/null || echo "processor idle driver not active"
cat /sys/module/intel_idle/parameters/max_cstate 2>/dev/null || echo "intel_idle disabled"

# Verify the requested CPU frequency policy
cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_cur_freq
cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_max_freq
# scaling_cur_freq often matches scaling_max_freq with the performance governor,
# but hardware, thermal limits, turbo settings, and the active driver can affect it.
```

## Disable Turbo Boost (Optional)

Turbo Boost can also introduce frequency variability.

```bash
# Disable Intel Turbo Boost
echo 1 | sudo tee /sys/devices/system/cpu/intel_pstate/no_turbo 2>/dev/null

# For AMD systems, disable Core Performance Boost
echo 0 | sudo tee /sys/devices/system/cpu/cpufreq/boost 2>/dev/null
```

## Validate with cyclictest

```bash
# Run cyclictest to confirm latency is stable
sudo cyclictest --mlockall --threads=4 --priority=99 --interval=1000 --duration=60
```

With frequency scaling constrained and deep C-states disabled, your real-time CPUs avoid many frequency and idle-state transitions that can add latency to your system.
