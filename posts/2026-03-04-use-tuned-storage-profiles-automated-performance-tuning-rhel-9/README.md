# How to Use tuned Storage Profiles for Automated Performance Tuning on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, tuned, Storage, Performance, Tuning, Linux

Description: Learn how to use the tuned daemon on RHEL to automatically apply storage performance profiles and create custom profiles for your workloads.

---

The `tuned` daemon on RHEL automatically adjusts system settings including storage parameters based on predefined profiles. Instead of manually tuning dozens of kernel parameters, you can select a profile that matches your workload and let tuned handle the rest. You can also create custom profiles for specific requirements.

## Installing and Enabling tuned

```bash
sudo dnf install tuned
sudo systemctl enable --now tuned
```

## Listing Available Profiles

```bash
tuned-adm list
```

Key profiles relevant to storage:

- **throughput-performance** - Optimized for high throughput workloads
- **latency-performance** - Optimized for low latency
- **virtual-guest** - Optimized for running as a VM guest
- **virtual-host** - Optimized for KVM virtualization hosts
- **balanced** - Compromise between performance and power saving

## Checking the Active Profile

```bash
tuned-adm active
```

## Applying a Storage-Optimized Profile

For database and storage-heavy workloads:

```bash
sudo tuned-adm profile throughput-performance
```

For latency-sensitive applications:

```bash
sudo tuned-adm profile latency-performance
```

Verify:

```bash
tuned-adm active
tuned-adm verify
```

## What Storage Settings Each Profile Changes

### throughput-performance

- Sets I/O scheduler based on device type
- Increases read-ahead for sequential workloads
- Disables transparent huge pages defragmentation
- Sets vm.dirty_ratio to 40
- Sets vm.dirty_background_ratio to 10
- Enables disk write-back caching

### latency-performance

- Minimizes I/O latency by reducing buffering
- Sets CPU governor to performance
- Disables power management features that add latency
- Optimizes interrupt handling

## Viewing Profile Details

```bash
tuned-adm profile_info throughput-performance
```

Or read the profile configuration directly:

```bash
cat /usr/lib/tuned/throughput-performance/tuned.conf
```

## Creating a Custom Storage Profile

Create a directory for your profile:

```bash
sudo mkdir -p /etc/tuned/my-storage-profile
```

Create the configuration:

```bash
sudo vi /etc/tuned/my-storage-profile/tuned.conf
```

```ini
[main]
summary=Custom storage profile for database workloads
include=throughput-performance

[disk]
# I/O scheduler based on device type
devices_udev_regex=ATTR{queue/rotational}=="0"
elevator=none

[disk_rotational]
devices_udev_regex=ATTR{queue/rotational}=="1"
elevator=mq-deadline
readahead=4096

[sysctl]
# Increase dirty page limits for write-heavy workloads
vm.dirty_ratio=60
vm.dirty_background_ratio=20
vm.dirty_expire_centisecs=6000
vm.dirty_writeback_centisecs=500

# Reduce swappiness for database workloads
vm.swappiness=10

# Optimize for many open files
fs.file-max=2097152

[script]
script=tuning.sh
```

Create the tuning script for per-device settings:

```bash
sudo vi /etc/tuned/my-storage-profile/tuning.sh
```

```bash
#!/bin/bash

. /usr/lib/tuned/functions

start() {
    # Set NVMe queue depth
    for dev in /sys/block/nvme*; do
        [ -d "$dev" ] || continue
        echo 1023 > "$dev/queue/nr_requests"
        echo 128 > "$dev/queue/read_ahead_kb"
    done

    # Set HDD settings
    for dev in /sys/block/sd*; do
        [ -d "$dev" ] || continue
        ROTATIONAL=$(cat "$dev/queue/rotational")
        if [ "$ROTATIONAL" = "1" ]; then
            echo 128 > "$dev/queue/nr_requests"
            echo 1024 > "$dev/queue/read_ahead_kb"
        fi
    done

    return 0
}

stop() {
    return 0
}

process $@
```

Make the script executable:

```bash
sudo chmod +x /etc/tuned/my-storage-profile/tuning.sh
```

Apply the custom profile:

```bash
sudo tuned-adm profile my-storage-profile
```

## Using tuned with Dynamic Tuning

Enable dynamic tuning for automatic adjustments based on current load:

```bash
sudo vi /etc/tuned/tuned-main.conf
```

Set:

```text
dynamic_tuning = 1
```

Restart tuned:

```bash
sudo systemctl restart tuned
```

## Monitoring tuned Activity

```bash
journalctl -u tuned -f
```

## Verifying Applied Settings

Check that tuned settings are active:

```bash
tuned-adm verify
```

Verify specific settings:

```bash
# Check I/O scheduler
cat /sys/block/nvme0n1/queue/scheduler

# Check dirty page settings
sysctl vm.dirty_ratio vm.dirty_background_ratio

# Check read-ahead
cat /sys/block/sda/queue/read_ahead_kb
```

## Recommending a Profile

Let tuned recommend a profile based on your hardware:

```bash
tuned-adm recommend
```

## Summary

The `tuned` daemon on RHEL simplifies storage performance tuning by applying comprehensive profiles that adjust I/O schedulers, queue depths, dirty page settings, and more. Use built-in profiles for common workloads, or create custom profiles that inherit from existing ones and add your specific requirements. Dynamic tuning enables automatic adjustments based on current system load, making tuned a set-and-forget solution for storage optimization.
