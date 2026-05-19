# How to Configure Kernel Samepage Merging (KSM) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, KSM, Virtualization, Memory, Performance

Description: Enable and tune Kernel Samepage Merging (KSM) on Ubuntu to reduce memory usage in virtualization environments by deduplicating identical memory pages across virtual machines.

---

Kernel Samepage Merging is a kernel feature that scans process memory looking for pages with identical content. When it finds identical pages, it merges them into a single copy-on-write page, reducing physical memory usage. This is most valuable on virtualization hosts running many VMs with the same operating system, where large portions of memory contain identical kernel and runtime data.

## How KSM Works

KSM runs as a kernel thread (`ksmd`) that periodically scans memory pages that applications have explicitly opted in for scanning (or that the hypervisor has marked as candidate pages). When it finds pages with identical checksums and byte-for-byte matching content, it replaces both copies with a single shared page marked copy-on-write (COW).

When either process writes to the shared page, the kernel automatically creates a private copy for that process - the same mechanism used for fork(). The original page remains shared for other processes.

KSM doesn't scan all memory automatically. Applications or hypervisors must call `madvise(addr, len, MADV_MERGEABLE)` to mark regions as candidates. QEMU/KVM can mark guest RAM as mergeable, which is why KSM is most commonly used in KVM virtualization.

## Checking KSM Status

```bash
# Check if KSM is available in your kernel

ls /sys/kernel/mm/ksm/
# Should show: full_scans  max_page_sharing  merge_across_nodes  pages_shared  ...

# Check if KSM is currently running (1 = running, 0 = stopped)
cat /sys/kernel/mm/ksm/run

# See current KSM statistics
cat /sys/kernel/mm/ksm/pages_shared      # Shared KSM pages in use
cat /sys/kernel/mm/ksm/pages_sharing     # Additional mappings sharing those pages
cat /sys/kernel/mm/ksm/pages_unshared    # Pages scanned but not mergeable
cat /sys/kernel/mm/ksm/pages_volatile    # Pages changing too fast to be shared
cat /sys/kernel/mm/ksm/full_scans        # Complete scan cycles completed

# Calculate memory savings
# Memory saved = pages_sharing * page_size
PAGE_SIZE=$(getconf PAGE_SIZE)
SHARING=$(cat /sys/kernel/mm/ksm/pages_sharing)
SAVED=$(( SHARING * PAGE_SIZE / 1024 / 1024 ))
echo "KSM has saved approximately ${SAVED} MB of RAM"
```

## Enabling KSM

```bash
# Enable KSM (write 1 to the run file)
echo 1 | sudo tee /sys/kernel/mm/ksm/run

# Verify it's running
cat /sys/kernel/mm/ksm/run

# KSM runs in the background - give it time to scan
# Check progress after a few minutes
watch -n 10 "cat /sys/kernel/mm/ksm/pages_shared /sys/kernel/mm/ksm/pages_sharing"
```

The three values for `run` are:
- `0` - stop scanning and sharing, but keep existing shared pages
- `1` - run the KSM scanning thread
- `2` - stop scanning, and also unmerge all currently shared pages

## Tuning KSM Parameters

The scanning rate and behavior are controlled through `/sys/kernel/mm/ksm/`:

```bash
# pages_to_scan: how many pages to scan per sleep interval
# Default: 100
# Higher = faster convergence, more CPU usage
cat /sys/kernel/mm/ksm/pages_to_scan

# Increase scan rate for faster sharing on a hypervisor host
echo 1000 | sudo tee /sys/kernel/mm/ksm/pages_to_scan

# sleep_millisecs: pause between scan rounds
# Default: 20ms
# Lower = more aggressive scanning, more CPU
cat /sys/kernel/mm/ksm/sleep_millisecs

# Balance: scan frequently but don't consume too much CPU
echo 50 | sudo tee /sys/kernel/mm/ksm/sleep_millisecs

# max_page_sharing: limit on how many processes can share a single page
# Default: 256
# Higher values can improve deduplication, but may increase latency in some VM operations
cat /sys/kernel/mm/ksm/max_page_sharing
echo 512 | sudo tee /sys/kernel/mm/ksm/max_page_sharing
```

## Making KSM Settings Persistent

Settings in `/sys/kernel/mm/ksm/` are reset on reboot. Make them persistent with a systemd service that writes the sysfs values at startup:

```bash
sudo tee /etc/systemd/system/ksm.service << 'EOF'
[Unit]
Description=Enable Kernel Samepage Merging
After=basic.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/bin/sh -c 'echo 1 > /sys/kernel/mm/ksm/run && echo 1000 > /sys/kernel/mm/ksm/pages_to_scan && echo 50 > /sys/kernel/mm/ksm/sleep_millisecs'
ExecStop=/bin/sh -c 'echo 2 > /sys/kernel/mm/ksm/run'

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable ksm
sudo systemctl start ksm
```

## KSM in KVM Virtualization

KSM provides the most benefit on KVM hosts. QEMU/KVM can mark guest memory as mergeable. To verify:

```bash
# Check that VMs are using mergeable memory
# Look for the "mg" (mergeable) VmFlags entry in running qemu processes
for pid in $(pgrep -f 'qemu-system|qemu-kvm'); do
    sudo awk '/^VmFlags:/ && /(^| )mg( |$)/ { found=1 } END { if (found) print FILENAME }' /proc/$pid/smaps
done

# Monitor KSM effectiveness on a running KVM host
watch -n 5 '
echo "Pages shared: $(cat /sys/kernel/mm/ksm/pages_shared)"
echo "Pages sharing: $(cat /sys/kernel/mm/ksm/pages_sharing)"
PAGE_SIZE=$(getconf PAGE_SIZE)
SAVED=$(( $(cat /sys/kernel/mm/ksm/pages_sharing) * PAGE_SIZE / 1024 / 1024 ))
echo "Estimated RAM saved: ${SAVED} MB"
echo "Full scans completed: $(cat /sys/kernel/mm/ksm/full_scans)"
'
```

## UKSM - Alternative KSM Implementation

Some third-party kernels include UKSM, an enhanced version with more aggressive scanning:

```bash
# Check if UKSM is available (not in standard Ubuntu kernel)
ls /sys/kernel/mm/uksm/ 2>/dev/null

# UKSM configuration if available
echo 1 | sudo tee /sys/kernel/mm/uksm/run
echo 2000 | sudo tee /sys/kernel/mm/uksm/sleep_millisecs  # 2 seconds between scans
```

## Measuring KSM Benefit

Write a script to calculate and log KSM's ongoing contribution:

```bash
#!/bin/bash
# /usr/local/bin/ksm-stats.sh - Monitor KSM effectiveness

PAGE_SIZE=$(getconf PAGE_SIZE)

while true; do
    SHARED=$(cat /sys/kernel/mm/ksm/pages_shared)
    SHARING=$(cat /sys/kernel/mm/ksm/pages_sharing)
    UNSHARED=$(cat /sys/kernel/mm/ksm/pages_unshared)
    VOLATILE=$(cat /sys/kernel/mm/ksm/pages_volatile)
    SCANS=$(cat /sys/kernel/mm/ksm/full_scans)

    # Memory saved: pages_sharing counts the extra mappings saved by KSM
    SAVED_MB=$(( SHARING * PAGE_SIZE / 1024 / 1024 ))
    SHARED_MB=$(( SHARED * PAGE_SIZE / 1024 / 1024 ))

    echo "$(date '+%Y-%m-%d %H:%M:%S') | saved=${SAVED_MB}MB | shared=${SHARED_MB}MB | unshared=${UNSHARED} | volatile=${VOLATILE} | scans=${SCANS}"

    sleep 60
done
```

```bash
chmod +x /usr/local/bin/ksm-stats.sh
# Run in background and log
nohup /usr/local/bin/ksm-stats.sh >> /var/log/ksm-stats.log &
```

## When KSM Helps and When It Doesn't

KSM is most effective when:
- Multiple VMs run the same OS (Ubuntu 22.04 x3 will share lots of kernel pages)
- VMs are mostly idle (less volatile memory means more stable sharing opportunities)
- The host has many similar VMs (more candidates means more deduplication)

KSM is less effective or counterproductive when:
- VMs run different OSes or workloads (less identical content)
- VMs are under heavy write load (COW faults increase CPU usage)
- The CPU overhead of scanning exceeds the benefit of saved memory

On a KVM host running many similar Ubuntu VMs, KSM can save gigabytes of RAM after convergence. The exact savings depend on guest count, guest memory contents, workload activity, and tuning.
