# How to Fix 'Segmentation Fault (Core Dumped)' Application Crashes on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Debugging, Core Dumps, Troubleshooting, Linux

Description: Learn how to capture, analyze, and fix segmentation fault crashes on RHEL using core dumps and debugging tools.

---

A segmentation fault occurs when a process tries to access memory it should not. On RHEL, the system can generate a core dump file that captures the process state at the time of the crash, which is essential for diagnosing the root cause.

## Enabling Core Dumps

First, verify that core dumps are enabled:

```bash
# Check the current core dump size limit
ulimit -c

# If it shows 0, enable core dumps for the current session
ulimit -c unlimited
```

To make this persistent, edit the limits configuration:

```bash
# Add core dump limits for all users
sudo tee -a /etc/security/limits.conf << 'EOF'
*    soft    core    unlimited
*    hard    core    unlimited
EOF
```

## Configuring Core Dump Location with systemd-coredump

RHEL 8 and 9 use `systemd-coredump` by default to manage core dumps:

```bash
# Check if systemd-coredump is handling core dumps
cat /proc/sys/kernel/core_pattern

# List recent core dumps stored by systemd
coredumpctl list

# View details of the most recent crash
coredumpctl info
```

## Analyzing a Core Dump with GDB

Install the debugger and debuginfo packages:

```bash
# Install GDB and debuginfo-install helper
sudo dnf install gdb debuginfo-install

# Install debug symbols for the crashing application (example: httpd)
sudo dnf debuginfo-install httpd
```

Now load the core dump in GDB:

```bash
# Open the most recent core dump with coredumpctl and GDB
coredumpctl gdb

# Inside GDB, get the backtrace
# (gdb) bt full
# (gdb) info threads
# (gdb) thread apply all bt
```

## Common Causes and Fixes

Check for library mismatches:

```bash
# Verify that shared libraries are intact
ldd /usr/sbin/httpd | grep "not found"

# Check for recently updated packages that might cause ABI breakage
dnf history info last
```

Check for corrupted binaries:

```bash
# Verify the package integrity
rpm -V httpd
```

If RPM reports mismatches in the binary, reinstall the package:

```bash
# Reinstall the affected package
sudo dnf reinstall httpd
```

## Checking System Logs

Review journal logs around the crash time:

```bash
# View segfault messages from the kernel
journalctl -k | grep -i segfault

# The log shows the faulting address and instruction pointer
# Example output: httpd[1234]: segfault at 0 ip 00007f... sp 00007f... error 4
```

The `error` code indicates the type of memory access that failed. Error 4 means a user-mode read of an unmapped page, which often points to a null pointer dereference in the application code.
