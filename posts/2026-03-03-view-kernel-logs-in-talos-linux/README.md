# How to View Kernel Logs in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kernel Logs, Debugging, Linux Kernel, Kubernetes

Description: Learn how to access and interpret kernel logs on Talos Linux nodes for debugging hardware, driver, and system issues.

---

Kernel logs are the lowest-level diagnostic information available on a Linux system. They contain messages from the kernel itself, from device drivers, from memory management subsystems, and from security modules. On a traditional Linux system, you would use `dmesg` or read from `/var/log/kern.log`. Talos Linux works differently because it is an immutable, API-driven operating system with no shell access. But kernel logs are still accessible - you just need to know the right tools and approaches.

This guide covers everything you need to know about viewing and interpreting kernel logs on Talos Linux nodes.

## Accessing Kernel Logs with talosctl

The primary way to view kernel logs on Talos Linux is through the `talosctl dmesg` command. This is the equivalent of running `dmesg` on a traditional Linux system, but it works through the Talos API instead of requiring shell access.

```bash
# View kernel logs from a specific node
talosctl -n 192.168.1.10 dmesg

# View kernel logs from multiple nodes at once
talosctl -n 192.168.1.10,192.168.1.20,192.168.1.21 dmesg
```

The output contains the same information you would see from `dmesg` on any Linux system - boot messages, hardware detection, driver initialization, and any kernel warnings or errors that occur during operation.

## Following Kernel Logs in Real Time

When debugging an active issue, you want to watch kernel logs as they appear. The `--follow` flag enables this:

```bash
# Stream kernel logs in real time from a node
talosctl -n 192.168.1.10 dmesg --follow

# Follow kernel logs from all nodes
talosctl -n 192.168.1.10,192.168.1.20,192.168.1.21 dmesg --follow
```

This is particularly useful when you are troubleshooting hardware problems, network issues, or storage driver errors. You can reproduce the problem while watching the kernel output for any error messages or stack traces.

## Understanding Kernel Log Severity Levels

Kernel messages have severity levels that indicate their importance. These follow the standard syslog severity scale:

```text
# Kernel log severity levels (from most to least severe)
# 0 - KERN_EMERG:   System is unusable
# 1 - KERN_ALERT:   Action must be taken immediately
# 2 - KERN_CRIT:    Critical conditions
# 3 - KERN_ERR:     Error conditions
# 4 - KERN_WARNING: Warning conditions
# 5 - KERN_NOTICE:  Normal but significant condition
# 6 - KERN_INFO:    Informational
# 7 - KERN_DEBUG:   Debug-level messages
```

In the dmesg output, you will see these levels indicated in the timestamp area. When looking at kernel logs, focus first on messages at the error level and above, as these typically indicate real problems.

## Common Kernel Log Messages on Talos Linux

Here are kernel log entries you will commonly encounter on Talos Linux nodes and what they mean:

### Boot and Hardware Detection

```text
# Normal boot messages showing CPU and memory detection
[    0.000000] Linux version 6.1.58-talos ...
[    0.000000] Command line: talos.platform=metal ...
[    0.054321] Memory: 16384000K/16777216K available
[    0.100000] smpboot: CPU0: Intel(R) Xeon(R) ...
```

These are informational messages from early boot. They tell you which kernel version is running, what boot parameters were passed, and how much memory was detected.

### Storage Device Detection

```text
# Disk detection messages
[    1.234567] scsi host0: Virtio SCSI HBA
[    1.345678] sd 0:0:0:0: [sda] 104857600 512-byte logical blocks
[    1.345700] sd 0:0:0:0: [sda] Write cache: enabled, read cache: enabled
```

These messages show which storage devices were found. If you are having disk issues, check whether the expected devices appear here.

### Network Interface Initialization

```text
# Network device messages
[    2.123456] e1000e 0000:00:1f.6: eth0: Intel(R) PRO/1000 Network Connection
[    2.234567] e1000e 0000:00:1f.6: eth0: MAC: aa:bb:cc:dd:ee:ff
[    2.345678] IPv6: ADDRCONF(NETDEV_UP): eth0: link is not ready
[    2.456789] e1000e: eth0 NIC Link is Up 1000 Mbps
```

Network-related kernel messages are valuable when debugging connectivity problems. Look for "link is not ready" or "link down" messages if nodes are having network issues.

## Filtering Kernel Logs

When dealing with verbose kernel output, you can pipe the output through standard Unix tools:

```bash
# Search for error messages in kernel logs
talosctl -n 192.168.1.10 dmesg | grep -i "error"

# Look for out-of-memory events
talosctl -n 192.168.1.10 dmesg | grep -i "oom"

# Find storage-related messages
talosctl -n 192.168.1.10 dmesg | grep -i "sd[a-z]"

# Search for network driver messages
talosctl -n 192.168.1.10 dmesg | grep -i "eth\|eno\|ens\|link"
```

## Debugging OOM (Out of Memory) Events

One of the most common reasons to check kernel logs is to investigate out-of-memory kills. When the Linux kernel runs out of memory, it invokes the OOM killer to terminate processes and free up RAM. The kernel log records exactly which process was killed and why:

```text
# Typical OOM kill kernel log entry
[12345.678] Out of memory: Killed process 4523 (kubelet) total-vm:2048000kB, anon-rss:1536000kB
[12345.679] oom_reaper: reaped process 4523 (kubelet), now anon-rss:0kB
```

If you see these messages, your node does not have enough memory for its workload. You need to either add more memory to the node, reduce the resource requests of your pods, or add more nodes to the cluster.

```bash
# Check for OOM events across all nodes
talosctl -n 192.168.1.10,192.168.1.20,192.168.1.21 dmesg | grep -i "out of memory\|oom"
```

## Debugging Disk and Filesystem Issues

Kernel logs reveal filesystem errors that can help you catch storage problems before they cause data loss:

```bash
# Look for filesystem errors
talosctl -n 192.168.1.10 dmesg | grep -i "ext4\|xfs\|filesystem\|I/O error"
```

Common messages to watch for:

```text
# Disk I/O error indicating potential hardware failure
[23456.789] sd 0:0:0:0: [sda] tag#12 FAILED Result: hostbyte=DID_OK driverbyte=DRIVER_SENSE
[23456.790] blk_update_request: I/O error, dev sda, sector 12345678

# Filesystem corruption detected
[23456.800] EXT4-fs error (device sda1): ext4_lookup:1234: inode #567890: comm kworker
```

These errors typically indicate failing hardware and should be addressed promptly.

## Viewing Kernel Logs During Node Boot

Sometimes you need to see what happened during boot, especially when a node fails to come up properly. The early boot messages are always available in the dmesg buffer as long as the Talos API is reachable:

```bash
# View the complete boot log
talosctl -n 192.168.1.10 dmesg | head -100

# Look for boot failures or warnings
talosctl -n 192.168.1.10 dmesg | grep -i "fail\|warn\|error" | head -30
```

## Forwarding Kernel Logs to External Systems

If you need to persist kernel logs beyond the in-memory buffer, you can configure Talos to forward all machine logs - including kernel messages - to an external system:

```yaml
# kernel-log-forwarding.yaml
# Forward all machine logs including kernel messages
machine:
  logging:
    destinations:
      - endpoint: "tcp://log-collector.monitoring.svc:5140"
        format: json_lines
```

The forwarded logs will include kernel messages alongside other Talos system service logs. In your log aggregation system, you can filter for kernel-specific entries based on the service field.

## Kernel Parameters and Their Effect on Logging

Talos Linux allows you to set kernel command line parameters through machine configuration. Some of these affect logging behavior:

```yaml
# kernel-logging-params.yaml
# Adjust kernel logging parameters
machine:
  install:
    extraKernelArgs:
      - console=ttyS0,115200n8
      - loglevel=7
      - printk.devkmsg=on
```

Setting `loglevel=7` enables debug-level kernel messages, which produces more verbose output. This is helpful during debugging but should be lowered in production to avoid flooding the log buffer. The `console` parameter is useful if you have serial console access for catching very early boot messages before the Talos API is available.

Kernel logs on Talos Linux provide the same deep system visibility you get on any Linux system. The main difference is the access method - instead of SSH and dmesg, you use `talosctl dmesg`. Once you are comfortable with this workflow, debugging hardware issues, memory problems, and driver errors on Talos nodes is straightforward.
