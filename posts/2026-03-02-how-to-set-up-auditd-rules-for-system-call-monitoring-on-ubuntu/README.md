# How to Set Up auditd Rules for System Call Monitoring on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, auditd, Compliance, Linux

Description: Configure auditd system call monitoring rules on Ubuntu to detect privilege escalation, unauthorized setuid execution, and suspicious process behavior for security auditing.

---

System call monitoring with auditd goes deeper than file access monitoring. Instead of watching specific files, syscall rules intercept every kernel call that matches your criteria - regardless of which file or process is involved. This lets you detect patterns like privilege escalation attempts, unauthorized binary execution, or unusual network operations.

System call rules are more performance-intensive than file watch rules because the kernel evaluates them for every relevant system call. Careful rule design minimizes overhead while capturing security-relevant events.

## Syscall Rule Syntax

System call rules use the `-a` flag with `auditctl`:

```bash
auditctl -a action,filter -S syscall -F field=value -k key
```

- **action:** `always` (always audit) or `never` (never audit - used to exclude)
- **filter:** `exit` (after system call), `entry` (before), `user` (user-space), `task` (on fork)
- **-S syscall:** Syscall name or number
- **-F field=value:** Filter on process attributes (uid, gid, exe, etc.)
- **-k key:** Label for searching

The most common combination is `-a always,exit` which records the event after the syscall completes, including whether it succeeded.

## Architecture-Specific Rules

Most rules need versions for both 64-bit and 32-bit system calls:

```bash
# Both architectures for completeness
-a always,exit -F arch=b64 -S syscall_name -k key
-a always,exit -F arch=b32 -S syscall_name -k key
```

`arch=b64` matches 64-bit processes. `arch=b32` matches 32-bit processes (including 32-bit binaries running on 64-bit kernels).

## Setting Up Core Syscall Rules

Create a rules file for syscall monitoring:

```bash
sudo nano /etc/audit/rules.d/45-syscall-monitoring.rules
```

### Process Execution Monitoring

Audit every process execution. This creates a complete record of what ran on the system:

```bash
# Audit execve - the syscall for executing programs
-a always,exit -F arch=b64 -S execve -k process-execution
-a always,exit -F arch=b32 -S execve -k process-execution
```

These rules generate a lot of events on busy systems. Consider filtering to specific users or directories if volume is a concern:

```bash
# Only audit execution by non-root users
-a always,exit -F arch=b64 -S execve -F uid>=1000 -F uid!=65534 -k user-execution
-a always,exit -F arch=b32 -S execve -F uid>=1000 -F uid!=65534 -k user-execution
```

### Privilege Escalation Detection

Detect when processes change their user or group identity:

```bash
# Audit setuid/setgid syscalls
-a always,exit -F arch=b64 -S setuid -S setgid -S setreuid -S setregid -k identity-change
-a always,exit -F arch=b32 -S setuid -S setgid -S setreuid -S setregid -k identity-change

# Detect execution of setuid/setgid binaries
-a always,exit -F arch=b64 -S execve -F euid=0 -F uid!=0 -k setuid-execution
-a always,exit -F arch=b32 -S execve -F euid=0 -F uid!=0 -k setuid-execution
```

The last pair catches the common privilege escalation pattern: a non-root user (`uid!=0`) runs a setuid-root program (effective UID becomes 0, `euid=0`).

### Capability Use

```bash
# Monitor capability changes
-a always,exit -F arch=b64 -S capset -k capability-change
-a always,exit -F arch=b32 -S capset -k capability-change

# Monitor privileged operations (prctl)
-a always,exit -F arch=b64 -S prctl -k prctl-calls
-a always,exit -F arch=b32 -S prctl -k prctl-calls
```

### File System Mounting

Unauthorized mounts can be used to introduce malicious filesystems:

```bash
# Audit mount and unmount operations
-a always,exit -F arch=b64 -S mount -S umount2 -k mount-operations
-a always,exit -F arch=b32 -S mount -S umount -k mount-operations
```

### Kernel Module Loading

Unauthorized kernel modules can provide root-level backdoors:

```bash
# Audit module load/unload
-a always,exit -F arch=b64 -S init_module -S finit_module -S delete_module -k kernel-modules
-a always,exit -F arch=b32 -S init_module -S finit_module -S delete_module -k kernel-modules
```

### Network Operations

Detect unexpected network configuration changes:

```bash
# Audit socket creation
-a always,exit -F arch=b64 -S socket -F a0=2 -k ipv4-socket-creation   # AF_INET = 2
-a always,exit -F arch=b64 -S socket -F a0=10 -k ipv6-socket-creation   # AF_INET6 = 10

# Network configuration changes
-a always,exit -F arch=b64 -S setsockopt -k socket-options

# Detect bind to privileged ports (requires root normally)
-a always,exit -F arch=b64 -S bind -F euid=0 -k privileged-bind
```

### File Permission and Ownership Changes

```bash
# Audit chmod and related calls
-a always,exit -F arch=b64 -S chmod -S fchmod -S fchmodat -k file-permissions
-a always,exit -F arch=b32 -S chmod -S fchmod -S fchmodat -k file-permissions

# Audit chown and related calls
-a always,exit -F arch=b64 -S chown -S fchown -S lchown -S fchownat -k file-ownership
-a always,exit -F arch=b32 -S chown -S fchown -S lchown -S fchownat -k file-ownership

# Audit setattr changes on files
-a always,exit -F arch=b64 -S setxattr -S lsetxattr -S fsetxattr -k extended-attributes
-a always,exit -F arch=b32 -S setxattr -S lsetxattr -S fsetxattr -k extended-attributes
```

### Unauthorized File Deletion

Track file deletions, which can indicate data destruction or log tampering:

```bash
# Audit unlink and rename operations
-a always,exit -F arch=b64 -S unlink -S unlinkat -S rename -S renameat -k file-deletion
-a always,exit -F arch=b32 -S unlink -S unlinkat -S rename -S renameat -k file-deletion
```

### Syscalls that Should Only Succeed as Root

```bash
# Audit syscalls that non-root should not succeed at
-a always,exit -F arch=b64 -S ptrace -k ptrace-calls     # debugging/injection
-a always,exit -F arch=b32 -S ptrace -k ptrace-calls

# Personality - used by some exploits
-a always,exit -F arch=b64 -S personality -k personality-change
-a always,exit -F arch=b32 -S personality -k personality-change
```

## Excluding High-Volume, Low-Risk Events

Without exclusions, syscall monitoring can generate enormous volumes of events. Use `never` rules to exclude noise:

```bash
# /etc/audit/rules.d/20-exclusions.rules

# Exclude high-volume but expected operations from specific daemons
-a never,exit -F arch=b64 -S execve -F exe=/usr/bin/python3
-a never,exit -F arch=b64 -S open -F uid=daemon

# Exclude specific commands from execution monitoring
-a never,exit -F arch=b64 -S execve -F exe=/bin/bash

# Note: never rules must come BEFORE the always rules they are meant to exclude
# auditd processes rules in order - first match wins for never rules
```

## Checking Available Syscalls

Find the syscall number for a name, or vice versa:

```bash
# Get syscall number from name
ausyscall --dump | grep execve

# Or use ausyscall directly
ausyscall execve
# Output: 59 (for x86_64)

# List all syscalls
ausyscall --dump | head -30
```

## Loading and Verifying Rules

```bash
# Load rules from files
sudo augenrules --load

# List all currently active rules
sudo auditctl -l

# Count of rules
sudo auditctl -l | wc -l

# Check for syntax errors
sudo augenrules --check
```

## Searching Syscall Events

```bash
# Search for all setuid execution events
sudo ausearch -k setuid-execution

# Search for events in the last hour
sudo ausearch -k setuid-execution -ts recent

# Search for events from a specific process
sudo ausearch -k process-execution -c bash

# Search for events by a specific user
sudo ausearch -k process-execution -ua 1001

# Format output for human reading
sudo ausearch -k privilege-escalation -i
```

## Interpreting Syscall Events

```bash
# View a process execution event
sudo ausearch -k process-execution -ts recent -i | head -30
```

Example output:

```text
----
time->Mon Mar 02 10:15:33 2026
type=SYSCALL msg=audit(1234567890.123:4567): arch=c000003e syscall=59 success=yes exit=0
  a0=7f8ab... a1=7f8cd... a2=7f8ef... items=3 ppid=1234 pid=5678
  uid=1001 gid=1001 euid=1001 egid=1001 suid=1001 sgid=1001
  fsuid=1001 fsgid=1001 tty=pts0 ses=5 comm="wget"
  exe="/usr/bin/wget" key="process-execution"
type=PATH msg=audit(...): item=0 name="/usr/bin/wget" inode=... objtype=NORMAL
```

Key fields:
- `uid/euid`: Real and effective UIDs (if `euid != uid`, a setuid escalation occurred)
- `comm`: Command name
- `exe`: Full executable path
- `ppid/pid`: Parent and process IDs
- `ses`: Session ID (links to login event)

## Correlating Events

Events can be correlated using the session ID and process ID:

```bash
# Find all events from a specific session
sudo ausearch -se 42

# Find all events from a specific process ID
sudo ausearch -p 5678

# Correlate parent process to child processes
sudo ausearch -p 1234 -i | grep ppid
```

## Performance Considerations

Syscall rules add overhead to every matching syscall. Estimate the impact:

```bash
# Count how many times a syscall fires per second
strace -c -p 1 2>&1 | head -20    # Sample process 1 (systemd)

# Check audit daemon queue usage
sudo auditctl -s | grep -E "backlog|lost"
```

If the backlog is growing, either increase it or reduce the number of rules:

```bash
# Increase backlog limit
-b 16384    # In rules file
```

A well-designed syscall ruleset focusing on high-value signals (privilege escalation, kernel module loading, execution of unusual binaries) provides meaningful security visibility without generating unmanageable log volumes.
