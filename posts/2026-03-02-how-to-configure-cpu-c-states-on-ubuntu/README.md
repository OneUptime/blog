# How to Configure CPU C-States on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, CPU, Power Management, C-States, Performance

Description: A technical guide to understanding and configuring CPU C-states on Ubuntu, covering idle state management, latency tradeoffs, and how to tune settings for servers, workstations, and laptops.

---

CPU C-states are idle power states that processors use when not actively executing instructions. The deeper the C-state, the more of the CPU shuts down, saving power but requiring more time to wake up. Understanding and tuning C-states is important for anyone balancing power consumption against latency requirements.

## What Are C-States

C-states are numbered C0 through C10+ on modern Intel processors (AMD uses similar states with slightly different naming):

- **C0** - Active, executing instructions. Full power.
- **C1/C1E** - Clock stopped, internal caches preserved. Very fast to exit (sub-microsecond).
- **C3** - Last-level cache can be flushed. Slower to exit.
- **C6/C7** - Core voltage can be reduced. Core state saved to LLC.
- **C8/C10** - Deep package sleep on modern CPUs. Significant latency to exit.

The tradeoff: deeper states save more power but take longer to return to C0. For low-latency applications, deep C-states introduce unpredictable delays.

## Checking Current C-State Usage

```bash
# View available and active C-states via cpupower
sudo apt install linux-tools-common linux-tools-$(uname -r)
sudo cpupower idle-info

# View per-CPU idle state statistics
cat /sys/devices/system/cpu/cpu0/cpuidle/state*/name
cat /sys/devices/system/cpu/cpu0/cpuidle/state*/usage
cat /sys/devices/system/cpu/cpu0/cpuidle/state*/time

# Quick view of all CPU idle states
for state in /sys/devices/system/cpu/cpu0/cpuidle/state*; do
    echo -n "$(cat $state/name): "
    echo "usage=$(cat $state/usage), disabled=$(cat $state/disable)"
done

# Use powertop to see C-state residency
sudo powertop
# Navigate to "Idle stats" tab
```

## Viewing Available C-States

```bash
# List all C-states and their properties
for cpu in /sys/devices/system/cpu/cpu*/cpuidle; do
    echo "=== $cpu ==="
    for state in $cpu/state*; do
        echo -n "  $(cat $state/name): "
        echo "latency=$(cat $state/latency)us, power=$(cat $state/power)mW"
    done
    break  # Show just cpu0 for brevity
done

# Via cpupower
sudo cpupower idle-info --silent | grep "State Name"
```

## Disabling Specific C-States

To disable a C-state, write `1` to its `disable` file:

```bash
# Disable C6 on CPU 0 (state3 might be C6 - check the name first)
# First identify which state number corresponds to C6
cat /sys/devices/system/cpu/cpu0/cpuidle/state3/name
# Should show POLL, C1, C1E, C3, C6, C7, etc.

# Find C6 state number
for i in /sys/devices/system/cpu/cpu0/cpuidle/state*; do
    echo "$i: $(cat $i/name)"
done

# Disable C6 on all CPUs (assuming C6 is state3)
for cpu in /sys/devices/system/cpu/cpu*/cpuidle/state3/disable; do
    echo 1 | sudo tee "$cpu"
done

# Verify it's disabled
cat /sys/devices/system/cpu/cpu0/cpuidle/state3/disable
# Should output: 1
```

A more reliable approach using state names:

```bash
#!/bin/bash
# Disable a C-state by name across all CPUs

CSTATE_NAME="C6"

for cpu in /sys/devices/system/cpu/cpu*/cpuidle; do
    for state in "$cpu"/state*; do
        if [ "$(cat $state/name)" = "$CSTATE_NAME" ]; then
            echo "Disabling $CSTATE_NAME at $state"
            echo 1 | sudo tee "$state/disable"
        fi
    done
done
```

## Limiting C-States via Kernel Boot Parameters

The most reliable way to control C-states is through kernel boot parameters:

```bash
sudo nano /etc/default/grub
```

Useful parameters:

```bash
# Disable all C-states except C0 and C1 (use for minimum latency)
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash idle=poll"

# Limit max C-state to C1 (processor-halt only)
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash processor.max_cstate=1"

# Limit to C3 maximum
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash processor.max_cstate=3"

# Disable Intel C-states deep sleep
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash intel_idle.max_cstate=1"

# Disable all deep idle states completely (maximum performance, maximum power)
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash idle=poll"
```

After editing:

```bash
sudo update-grub
sudo reboot
```

The difference between `processor.max_cstate` and `intel_idle.max_cstate`:
- `intel_idle.max_cstate` - Applies to the intel_idle driver (used on modern Intel CPUs)
- `processor.max_cstate` - Applies to the older ACPI processor driver (fallback)

Check which idle driver is active:

```bash
cat /sys/devices/system/cpu/cpu0/cpuidle/current_driver
# intel_idle or acpi_idle
```

## Using cpuidle to Manage C-States

```bash
# View all C-state info
sudo cpupower idle-info

# Set maximum C-state to C1 (latency limit)
sudo cpupower idle-set -D 1

# Enable all C-states
sudo cpupower idle-set -E

# Disable all C-states deeper than 1 (latency threshold in microseconds)
sudo cpupower idle-set -d 100   # disable states with latency > 100us
```

## CPU Power States and Latency Requirements

For different use cases, the appropriate C-state depth varies:

**Maximum performance / minimum latency (real-time, HFT, gaming):**
```bash
# Disable everything deeper than C1
sudo cpupower idle-set -d 1

# Or via kernel parameter:
# intel_idle.max_cstate=1
```

**Balanced server (web server, database):**
```bash
# Allow up to C3 or C6 for idle efficiency
# while keeping reasonable wake-up latency
sudo cpupower idle-set -d 1000  # disable states with latency > 1ms
```

**Power saving (laptop, idle server):**
```bash
# Allow all C-states
sudo cpupower idle-set -E
```

## C-State Latency Tradeoffs

```bash
# Check actual latency for each C-state
for state in /sys/devices/system/cpu/cpu0/cpuidle/state*; do
    name=$(cat $state/name)
    latency=$(cat $state/latency)
    echo "$name: exit latency ${latency}us"
done

# Example output:
# POLL: 0us
# C1: 2us
# C1E: 10us
# C3: 40us
# C6: 133us
# C7s: 166us
# C8: 300us
```

For applications that need consistent sub-millisecond response times, C6 and deeper states (133us+ latency) can cause noticeable jitter.

## Persistent Configuration with systemd

```bash
# Create a script
sudo tee /usr/local/bin/configure-cstates.sh << 'EOF'
#!/bin/bash

# For balanced server configuration: limit to C6 (disable deeper)
# First check what states are available
MAX_ALLOWED_STATE="C6"

for cpu in /sys/devices/system/cpu/cpu*/cpuidle; do
    disabling=0
    for state in "$cpu"/state*; do
        name=$(cat "$state/name" 2>/dev/null)
        if [ "$name" = "$MAX_ALLOWED_STATE" ]; then
            disabling=1
            continue  # Keep C6 itself enabled
        fi
        if [ "$disabling" = "1" ]; then
            echo 1 > "$state/disable"
        fi
    done
done

echo "C-state configuration applied"
EOF

sudo chmod +x /usr/local/bin/configure-cstates.sh

# Create systemd service
sudo tee /etc/systemd/system/cstate-config.service << 'EOF'
[Unit]
Description=Configure CPU C-States
After=multi-user.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/configure-cstates.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable cstate-config
sudo systemctl start cstate-config
```

## Monitoring C-State Effectiveness

```bash
# Check C-state residency after applying settings
# Higher percentage in C6 = better power saving
sudo powertop

# Command-line view of idle percentages
for state in /sys/devices/system/cpu/cpu0/cpuidle/state*; do
    name=$(cat $state/name)
    usage=$(cat $state/usage)
    time=$(cat $state/time)
    echo "$name: $usage entries, ${time}us total"
done

# turbostat shows C-state data while running
sudo apt install linux-tools-common linux-tools-$(uname -r)
sudo turbostat --show idle sleep 5
```

## BIOS/UEFI C-State Settings

Software configuration overrides can only disable C-states - they can't enable states the BIOS has disabled. If `cpupower idle-info` shows fewer states than expected, check BIOS settings:

- Look for "C-States" or "CPU C-State Control" in BIOS power settings
- "C6 State Support" is often separately toggleable
- "Package C State Limit" may cap the deepest allowed state
- Some servers ship with C-states disabled for consistent performance

Enable C-states in BIOS first if you want the deeper power saving states to be available at all.

C-state tuning is a foundational performance and power optimization. For latency-sensitive applications, limiting C-states prevents the CPU from taking too long to wake up. For power efficiency in servers and laptops, allowing deep C-states during idle periods can meaningfully reduce power consumption.
