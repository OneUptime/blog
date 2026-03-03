# How to Use talosctl dmesg for Kernel Log Analysis

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Kernel Logs, Debugging, System Troubleshooting

Description: Learn how to use talosctl dmesg to read and analyze kernel logs on Talos Linux nodes for hardware and system troubleshooting.

---

When something goes wrong at the operating system level in Talos Linux, the kernel log is where you will find the answers. Since Talos Linux does not provide SSH access or a traditional shell, you cannot just run `dmesg` on the machine. Instead, `talosctl dmesg` provides the same kernel log output through the Talos API. This guide explains how to use it effectively for debugging hardware issues, driver problems, and system-level errors.

## What Is dmesg?

The dmesg (diagnostic message) buffer contains messages from the Linux kernel. These messages cover:

- Hardware detection and initialization during boot
- Driver loading and errors
- Memory management events
- Storage device events
- Network interface events
- Security module messages
- Kernel warnings and errors

In a traditional Linux system, you would SSH into the machine and run `dmesg`. In Talos Linux, you use `talosctl dmesg` instead, which queries the kernel ring buffer through the Talos API.

## Basic Usage

```bash
# View kernel messages from a node
talosctl dmesg --nodes <node-ip>
```

This outputs the full kernel ring buffer, which can be several thousand lines. The output is chronological, with the oldest messages first.

## Following Kernel Messages in Real Time

To watch kernel messages as they happen:

```bash
# Follow kernel messages in real time (like tail -f)
talosctl dmesg --nodes <node-ip> --follow
```

This is particularly useful when you are actively troubleshooting an issue. Keep this running in one terminal while reproducing the problem in another.

## Filtering dmesg Output

The kernel log contains a lot of information. You will often want to filter it to find specific messages.

### By Keyword

Since talosctl dmesg outputs to stdout, you can pipe it through standard text tools:

```bash
# Find all disk-related kernel messages
talosctl dmesg --nodes <node-ip> | grep -i "disk\|sd[a-z]\|nvme"

# Find network-related messages
talosctl dmesg --nodes <node-ip> | grep -i "eth\|link\|network\|nic"

# Find error messages
talosctl dmesg --nodes <node-ip> | grep -i "error\|fail\|warn"

# Find out-of-memory events
talosctl dmesg --nodes <node-ip> | grep -i "oom\|out of memory"
```

### By Time

Kernel messages include timestamps. You can use these to focus on a specific time window:

```bash
# Look at messages from the last boot
talosctl dmesg --nodes <node-ip> | grep "Linux version" -A 1000
```

## Common Troubleshooting Scenarios

### Hardware Detection Problems

If a node is not recognizing hardware (disks, network cards, GPUs):

```bash
# Check what hardware the kernel detected
talosctl dmesg --nodes <node-ip> | grep -i "pci\|usb\|scsi\|nvme\|ata"

# Look for specific device types
talosctl dmesg --nodes <node-ip> | grep -i "sda\|nvme0"
```

If a device is not showing up in the kernel log at all, it may be a hardware connection issue or the device may need a driver that is not included in the Talos Linux kernel.

### Disk Errors

Disk problems often show up as I/O errors in the kernel log:

```bash
# Check for disk I/O errors
talosctl dmesg --nodes <node-ip> | grep -i "i/o error\|medium error\|sector"

# Check for filesystem errors
talosctl dmesg --nodes <node-ip> | grep -i "ext4\|xfs\|filesystem"

# Check for disk timeout issues
talosctl dmesg --nodes <node-ip> | grep -i "timeout\|reset\|abort"
```

Common disk-related messages and what they mean:

- `I/O error, dev sda` - The disk is having read/write failures
- `medium error` - The disk surface has bad sectors
- `device reset` - The disk controller is resetting, often due to hanging I/O
- `DRDY ERR` - The disk is not ready, possibly failing

### Memory Issues

Out-of-memory (OOM) events are critical and visible in kernel logs:

```bash
# Check for OOM kills
talosctl dmesg --nodes <node-ip> | grep -i "oom\|killed process\|out of memory"

# Check memory-related messages
talosctl dmesg --nodes <node-ip> | grep -i "memory\|hugepages\|swap"
```

OOM kills happen when the system runs out of available memory. The kernel selects a process to kill based on an OOM score. In Kubernetes clusters, this often means a pod consumed more memory than its limits allowed.

### Network Interface Issues

```bash
# Check network interface status changes
talosctl dmesg --nodes <node-ip> | grep -i "link is\|carrier\|eth[0-9]\|eno\|enp"

# Look for network driver issues
talosctl dmesg --nodes <node-ip> | grep -i "driver\|firmware"

# Check for dropped packets or errors
talosctl dmesg --nodes <node-ip> | grep -i "drop\|collision\|overflow"
```

Common network messages:

- `link is up` / `link is down` - Physical link state changes
- `no carrier` - The network cable is disconnected or the switch port is down
- `firmware failed` - The network driver cannot load its firmware

### Boot Issues

If a node is slow to boot or fails during boot:

```bash
# Check the full boot sequence
talosctl dmesg --nodes <node-ip>

# Focus on early boot messages
talosctl dmesg --nodes <node-ip> | head -100

# Look for errors during boot
talosctl dmesg --nodes <node-ip> | grep -i "error\|fail" | head -20
```

### Kernel Panics and Crashes

If a node recently crashed and rebooted, check for panic messages:

```bash
# Look for panic or oops messages
talosctl dmesg --nodes <node-ip> | grep -i "panic\|oops\|bug\|call trace"
```

Kernel panics are usually caused by hardware failures or kernel bugs. If you see recurring panics, check your hardware and consider reporting the issue to the Talos Linux project.

## Comparing dmesg Across Nodes

When a specific node behaves differently from others, comparing kernel logs helps identify the difference:

```bash
# Get dmesg from two nodes and compare
talosctl dmesg --nodes 10.0.0.1 > /tmp/dmesg-node1.txt
talosctl dmesg --nodes 10.0.0.2 > /tmp/dmesg-node2.txt

# Look for differences
diff /tmp/dmesg-node1.txt /tmp/dmesg-node2.txt
```

This is especially useful for identifying hardware differences or driver issues that affect only certain nodes.

## dmesg During Operations

### During Talos Upgrades

Watch kernel messages during an upgrade to catch driver or hardware issues:

```bash
# Follow dmesg during an upgrade
talosctl dmesg --nodes <node-ip> --follow
```

In another terminal:

```bash
# Start the upgrade
talosctl upgrade --nodes <node-ip> --image ghcr.io/siderolabs/installer:v1.7.0
```

### During Node Bootstrap

When a new node joins the cluster, kernel messages show hardware initialization:

```bash
# Watch a new node's kernel messages during bootstrap
talosctl dmesg --nodes <new-node-ip> --follow
```

## Kernel Log Ring Buffer Size

The kernel ring buffer has a limited size. Very old messages are overwritten by newer ones. If you need to preserve kernel messages for forensic analysis, capture them periodically:

```bash
# Periodically capture dmesg to a file
DATE=$(date +%Y%m%d_%H%M%S)
talosctl dmesg --nodes <node-ip> > "/tmp/dmesg-${NODE_IP}-${DATE}.txt"
```

For production environments, consider forwarding kernel messages to a centralized logging system.

## Integrating with Monitoring

While `talosctl dmesg` is great for manual investigation, you should also set up automated kernel log monitoring:

```bash
# Simple script to alert on critical kernel messages
talosctl dmesg --nodes <node-ip> --follow | while read line; do
    if echo "$line" | grep -qi "panic\|oom\|i/o error\|hardware error"; then
        echo "ALERT on <node-ip>: $line"
        # Send alert notification
    fi
done
```

## Conclusion

The `talosctl dmesg` command brings the familiar dmesg experience to the API-driven world of Talos Linux. It is your primary tool for investigating hardware problems, driver issues, memory events, and system-level errors. Combined with grep for filtering and the --follow flag for real-time monitoring, it provides everything you need for kernel-level troubleshooting. Make it part of your standard troubleshooting workflow whenever you suspect issues below the Kubernetes layer.
