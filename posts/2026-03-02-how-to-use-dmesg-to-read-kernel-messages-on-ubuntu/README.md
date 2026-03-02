# How to Use dmesg to Read Kernel Messages on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux Kernel, System Administration, Troubleshooting, Debugging

Description: Learn how to use dmesg on Ubuntu to read kernel ring buffer messages, diagnose hardware issues, debug driver problems, and monitor system events.

---

`dmesg` reads the kernel ring buffer - the log where the kernel records messages about hardware detection, driver initialization, system errors, and other low-level events. When a system acts strange, hardware fails, or a device stops working, `dmesg` is often the first place to look.

## Basic Usage

```bash
# Print all kernel messages
dmesg

# Follow new messages in real time (like tail -f)
dmesg -w

# Clear dmesg (useful before testing)
sudo dmesg -c
```

The output can be thousands of lines. Most of the useful investigation uses filters.

## Human-Readable Timestamps

By default, older versions of dmesg show seconds since boot. Use `-T` for human-readable timestamps:

```bash
# Human-readable timestamps
dmesg -T

# Follow with readable timestamps
dmesg -T -w
```

On Ubuntu 20.04 and later, readable timestamps are often the default, but `-T` ensures it.

## Filtering by Log Level

Kernel messages have severity levels from 0 (emergency) to 7 (debug):

| Level | Name | Meaning |
|-------|------|---------|
| 0 | EMERG | System is unusable |
| 1 | ALERT | Action must be taken immediately |
| 2 | CRIT | Critical condition |
| 3 | ERR | Error condition |
| 4 | WARN | Warning condition |
| 5 | NOTICE | Normal but significant |
| 6 | INFO | Informational |
| 7 | DEBUG | Debug-level messages |

Filter to show only errors and worse:

```bash
# Show only critical errors and above
dmesg --level=err,crit,alert,emerg

# Show warnings and above
dmesg --level=warn,err,crit,alert,emerg

# Shorthand - show errors and critical
dmesg -l err
```

## Colorized Output

Use `-H` for pager with color, or `-x` to show level names:

```bash
# Colorized, human-readable output in pager
dmesg -H

# Show facility and level names explicitly
dmesg -x

# Combine: human time, color, and level names
dmesg -Tx
```

## Filtering by Facility

Kernel messages come from different facilities:

```bash
# Show kernel messages only
dmesg -f kern

# Show daemon messages
dmesg -f daemon

# Multiple facilities
dmesg -f kern,daemon
```

## Grepping for Specific Events

```bash
# Find USB device events
dmesg | grep -i usb

# Find disk-related messages
dmesg | grep -i "sda\|sdb\|nvme\|scsi"

# Find network interface events
dmesg | grep -i "eth0\|ens\|enp\|bond"

# Find errors specifically
dmesg | grep -i "error\|fail\|corrupt\|exception"

# Find OOM killer events
dmesg | grep -i "oom\|out of memory\|killed"

# Find hardware errors (ECC memory, etc.)
dmesg | grep -i "mce\|machine check\|edac"
```

## Diagnosing Hardware Issues

### Disk Problems

```bash
# Look for disk I/O errors
dmesg -T | grep -i "i/o error\|blk_update_request\|ata.*error"
```

A message like:

```
[Mon Mar  2 10:23:45 2026] blk_update_request: I/O error, dev sda, sector 4096
```

Indicates a bad sector. Follow up with `smartctl -a /dev/sda` to check disk health.

### Memory Errors

```bash
# Hardware memory errors
dmesg | grep -i "mce\|edac\|memory error"
```

MCE (Machine Check Exception) messages indicate hardware-level memory or CPU errors.

### Network Issues

```bash
# NIC driver errors or link state changes
dmesg -T | grep -i "link\|carrier\|eth\|bond\|dropped"
```

Link down/up events show as:

```
[Mon Mar  2 10:15:32 2026] eth0: renamed from eth0 to ens3
[Mon Mar  2 10:15:33 2026] ens3: Link is Up - 1Gbps
```

### GPU and PCIe Errors

```bash
# PCIe errors (can indicate bad slot, cable, or card)
dmesg | grep -i "pcie\|aer\|uncorrected\|corrected error"
```

## Viewing Kernel Messages at Boot

The most complete boot log is in the journal:

```bash
# All boot messages
sudo journalctl -b

# Previous boot
sudo journalctl -b -1

# Only kernel messages from current boot
sudo journalctl -b -k

# Kernel messages from last boot
sudo journalctl -b -1 -k
```

This is where you see why a previous boot failed.

## Understanding Timestamps After System Suspend

After a system resumes from suspend, dmesg timestamps reset. The journal handles this better:

```bash
# Kernel log with accurate wall-clock time after suspend
sudo journalctl -k --since "2 hours ago"
```

## Monitoring dmesg in Real Time for Alerts

A simple monitoring pattern:

```bash
#!/bin/bash
# dmesg-monitor.sh - alert on kernel errors

dmesg -w -T | while read line; do
    # Alert on critical kernel events
    if echo "$line" | grep -qiE "error|fail|oom|killed|i/o error|mce"; then
        echo "KERNEL ALERT: $line" >> /var/log/kernel-alerts.log
        # Optionally send alert via email or webhook
    fi
done
```

## Checking for USB Device Recognition

When a USB device isn't recognized:

```bash
# Watch for USB events when plugging in a device
dmesg -w | grep -i usb

# Or check recent USB events
dmesg -T | grep -i usb | tail -20
```

You'll see either successful enumeration or an error explaining why it failed.

## Checking Filesystem Mount Events

```bash
# Filesystem-related messages
dmesg | grep -i "ext4\|xfs\|btrfs\|mount\|unmount"
```

This shows filesystem errors on mount, journal replays after unclean shutdown, and read-only remounts triggered by errors.

## Kernel Module Loading

```bash
# Module load/unload messages
dmesg | grep -i "module\|insmod\|rmmod\|loaded\|unloaded"
```

## Checking for Segfaults

Application segfaults are logged to dmesg:

```bash
# Find segfaults
dmesg | grep -i "segfault\|general protection\|trap"
```

Output:

```
[12345.678] myapp[1234]: segfault at 0 ip 0000... sp 0000... error 4 in myapp[...]
```

This gives you the address, instruction pointer, and stack pointer at crash time.

## Saving dmesg Output

```bash
# Save current dmesg to file
dmesg -T > /tmp/dmesg_$(date +%Y%m%d_%H%M%S).txt

# Save only errors
dmesg --level=err -T > /tmp/kernel_errors.txt
```

## The Difference Between dmesg and journalctl -k

- `dmesg` reads the kernel ring buffer directly from `/dev/kmsg`. It's available even if systemd-journald isn't running.
- `journalctl -k` reads kernel messages from the systemd journal, which can go further back in history (the ring buffer is limited in size and wraps around).

For current events: use `dmesg`. For historical analysis: use `journalctl -k`.

The ring buffer size is configurable:

```bash
# Check current ring buffer size
dmesg --buffer-size

# Set a larger ring buffer (in /etc/default/grub)
# Add to GRUB_CMDLINE_LINUX: log_buf_len=32M
```

`dmesg` is one of those tools that experienced admins check reflexively when something goes wrong. Hardware instability, driver problems, OOM events, filesystem corruption - all of these leave traces in the kernel ring buffer. Checking it takes seconds and often surfaces the exact problem immediately.
