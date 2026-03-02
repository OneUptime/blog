# How to Debug Kernel Panics on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kernel, Debugging, System Administration, Linux

Description: Diagnose and debug kernel panics on Ubuntu using crash dumps, dmesg, kdump, and kernel debugging tools to identify root causes of system crashes.

---

A kernel panic is the Linux equivalent of a Windows blue screen of death. The kernel encounters an unrecoverable error, prints a diagnostic message, and halts the system. Debugging kernel panics requires a methodical approach: collect the right information, analyze it with the right tools, and trace the failure back to its source.

## Understanding What a Kernel Panic Tells You

When a kernel panic occurs, the kernel prints a diagnostic message before halting. This message contains crucial information:

```
Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0)
CPU: 0 PID: 1 Comm: swapper/0 Not tainted 6.8.0-51-generic #52-Ubuntu
Hardware name: ...
Call Trace:
 dump_stack_lvl+0x4a/0x80
 panic+0x106/0x2c0
 mount_block_root+0x28d/0x2d0
 ...
```

Key elements to extract:
- **Panic message** - describes what failed (e.g., "unable to mount root fs", "out of memory", "BUG: kernel NULL pointer dereference")
- **CPU and PID** - which processor and process was running when the panic occurred
- **Tainted kernel** - indicates if non-GPL modules were loaded (proprietary drivers)
- **Call trace** - the sequence of function calls leading to the panic
- **RIP/EIP** - the instruction pointer showing exactly where execution stopped

## Setting Up to Capture Panics

Before you can debug panics, you need a way to capture the information. Several options:

### Enable Serial Console Logging

For physical systems, serial console captures output even when the display crashes:

```bash
# Edit GRUB configuration
sudo nano /etc/default/grub

# Add serial console parameters
GRUB_CMDLINE_LINUX="console=tty0 console=ttyS0,115200n8"

# Update GRUB
sudo update-grub
```

### Configure kdump for Crash Dumps

kdump captures a memory dump that can be analyzed after reboot:

```bash
# Install kdump tools
sudo apt install kdump-tools linux-crashdump

# Configure reserved memory in GRUB
sudo nano /etc/default/grub
# Add: crashkernel=512M to GRUB_CMDLINE_LINUX_DEFAULT

sudo update-grub
sudo reboot

# Verify kdump is active after reboot
kdump-config show
systemctl status kdump-tools
```

### Configure Automatic Reboot After Panic

```bash
# Create sysctl configuration
sudo nano /etc/sysctl.d/99-panic.conf
```

```bash
# Automatically reboot 30 seconds after panic
# Gives time to read the panic message on physical console
kernel.panic = 30

# Panic on kernel oops (catches more errors)
kernel.panic_on_oops = 1

# Panic if watchdog detects hang
kernel.hung_task_panic = 1
```

```bash
sudo sysctl -p /etc/sysctl.d/99-panic.conf
```

## Reading the Panic from Logs

After a system recovers from a panic (if kdump captured it, or if the system was configured to reboot), check the logs:

```bash
# Check the previous boot's messages
journalctl -b -1 -p err

# Look specifically for panic messages
journalctl -b -1 | grep -i "kernel panic\|BUG:\|oops\|WARN:"

# Check dmesg from the crash dump
cat /var/crash/*/dmesg.txt 2>/dev/null

# If using persistent journal
journalctl --list-boots
journalctl -b -2  # Two boots ago
```

## Analyzing the Call Trace

The call trace is the most important part of a panic message. It shows the sequence of function calls:

```
Call Trace:
 <TASK>
 dump_stack_lvl+0x4a/0x80
 __warn+0x81/0x130
 report_bug+0x171/0x1a0
 handle_bug+0x3c/0x80
 exc_invalid_op+0x17/0x70
 asm_exc_invalid_op+0x1a/0x20
 RIP: 0010:some_kernel_function+0x45/0x120 [some_module]
```

Each line shows `function_name+offset/size`. The `RIP:` line shows exactly where execution stopped.

### Decoding Symbol Names

```bash
# Install kernel debug symbols
sudo apt install linux-image-$(uname -r)-dbgsym 2>/dev/null || \
    sudo apt install linux-crashdump

# Use addr2line to find source location from an address
addr2line -e /usr/lib/debug/boot/vmlinux-$(uname -r) 0xffffffff81234567

# Use nm to look up symbols
nm /boot/System.map-$(uname -r) | grep some_function

# Decode a complete oops with a script
# Install: sudo apt install linux-tools-common
decode_stacktrace.sh /boot/vmlinux-$(uname -r) < /var/crash/*/dmesg.txt
```

## Using the crash Tool for Post-Mortem Analysis

Once you have a kdump crash file, the `crash` utility provides an interactive analysis environment:

```bash
# Install crash tool
sudo apt install crash

# Install debug symbols for crash analysis
sudo apt install linux-image-$(uname -r)-dbgsym

# Open the crash dump
sudo crash /usr/lib/debug/boot/vmlinux-$(uname -r) \
           /var/crash/202603021045/dump.202603021045
```

Inside the crash shell:

```bash
# Show the panic message and backtrace of the crashing task
crash> bt

# Show backtrace for all tasks
crash> bt -a | less

# Show the kernel log buffer (equivalent to dmesg)
crash> log | less

# Show the log with readable timestamps
crash> log -m | less

# List processes running at crash time
crash> ps

# Show a specific process and its stack
crash> bt <pid>

# Show memory information
crash> kmem -i

# Show virtual memory for a process
crash> vm <pid>

# List loaded kernel modules at crash time
crash> mod

# Show interrupts
crash> irq

# Check for memory corruption patterns
crash> search -k ffffffff 0xdeadbeef

# Quit crash
crash> quit
```

## Common Kernel Panic Causes and How to Diagnose Them

### NULL Pointer Dereference

```
BUG: kernel NULL pointer dereference, address: 0000000000000000
```

This means code tried to access memory at address 0. Usually a driver bug or a use-after-free error. Look at the call trace to identify the faulty module.

```bash
# Check if a specific module is implicated
crash> bt
# Look for module name in brackets: [module_name]

# Check if it's a known bug
lsmod | grep <module_name>
modinfo <module_name>
```

### Out of Memory Killer (OOM)

```
Out of memory: Kill process 12345 (some-process) score 850 or sacrifice child
```

The OOM killer is not always a panic, but can lead to one if the system kills critical processes.

```bash
# Find OOM events in logs
journalctl -b | grep -i "out of memory\|oom"

# Check memory usage at the time
journalctl -b | grep -B 5 "Out of memory"

# Current memory situation
free -h
cat /proc/meminfo | grep -E "MemTotal|MemFree|MemAvailable|SwapTotal|SwapFree"

# Check vmstat
vmstat -s
```

### Hung Task

```
INFO: task kworker:0:2 blocked for more than 120 seconds
```

A task is stuck waiting for I/O or a lock.

```bash
# Look for hung task warnings
journalctl -b | grep "blocked for more than"

# Check disk I/O issues
journalctl -b | grep -i "I/O error\|ata\|scsi error"

# Check for filesystem errors
dmesg | grep -i "EXT4-fs error\|XFS.*error"
```

### Stack Overflow

```
Kernel stack overflow detected
```

A kernel thread exhausted its stack. Usually caused by deep recursion in a driver.

### Hardware Errors (MCE)

```
EDAC PCI: ECC disabled in the BIOS
mce: Hardware Error: Machine check events logged
```

```bash
# Install MCE tools
sudo apt install mcelog

# Check machine check error log
sudo mcelog
sudo cat /var/log/mcelog

# More detailed hardware error checking
sudo mcelog --client
```

## Enabling Kernel Debugging Options

For development systems or persistent panic investigation, additional kernel debugging can help:

```bash
# Add to GRUB kernel parameters for debugging
sudo nano /etc/default/grub
```

```bash
# Options to add to GRUB_CMDLINE_LINUX_DEFAULT:

# Enable kernel address space layout randomization debugging
# (disable KASLR to get consistent addresses for crash analysis)
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash nokaslr"

# Enable extra kernel debugging
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash debug"

# For panic debugging - don't reboot immediately
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash panic=0"
# panic=0 means don't auto-reboot, let you read the message

# Enable Magic SysRq for controlled crash triggering
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash sysrq_always_enabled=1"
```

```bash
sudo update-grub
```

## Using Magic SysRq for Controlled Diagnosis

When a system is hung but not panicked, SysRq can help:

```bash
# Enable SysRq
echo 1 > /proc/sys/kernel/sysrq

# Show all running processes and their state
echo t > /proc/sysrq-trigger

# Show memory information
echo m > /proc/sysrq-trigger

# Show blocked tasks (useful for hang debugging)
echo w > /proc/sysrq-trigger

# Controlled crash for testing kdump
echo c > /proc/sysrq-trigger   # WARNING: crashes the system immediately
```

## Checking for Driver Issues

Many panics are caused by faulty drivers. Check for obvious culprits:

```bash
# List third-party (non-GPL) modules - these are common panic sources
lsmod | grep -v "^Module" | awk '{print $1}' | while read m; do
    taints=$(cat /sys/module/$m/taint 2>/dev/null)
    [ -n "$taints" ] && echo "$m: $taints"
done

# Check if panic happened after loading a specific module
journalctl -b -1 | grep -E "loaded.*module|insmod|modprobe" | tail -20

# Look for firmware load failures
journalctl -b | grep -i "firmware"
```

## Reporting Kernel Bugs

If you've isolated a kernel bug, report it:

```bash
# Collect system information for a bug report
ubuntu-bug linux

# Or manually gather info
uname -a
lsb_release -a
cat /proc/version
dmesg | grep -A 50 "BUG:\|panic"
lspci
lsmod
```

Debugging kernel panics is a methodical process. Collect crash dumps, read the call trace carefully, identify the offending module or code path, and work backwards from there. Most production kernel panics come down to a handful of causes: faulty drivers, memory corruption, I/O errors, or resource exhaustion.
