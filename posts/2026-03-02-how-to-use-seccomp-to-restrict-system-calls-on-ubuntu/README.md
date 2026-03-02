# How to Use seccomp to Restrict System Calls on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Linux, Kernel, Container

Description: Learn how to use seccomp (Secure Computing Mode) on Ubuntu to restrict system calls available to processes, reducing the attack surface of applications and containers.

---

seccomp (Secure Computing Mode) is a Linux kernel security feature that restricts which system calls a process can make. By filtering system calls, you reduce the attack surface available to a compromised process. Even if an attacker gains code execution inside a process, they can only use the system calls you've permitted.

seccomp is used extensively in container runtimes (Docker's default seccomp profile, Chrome's sandbox, OpenSSH), and it's a practical tool for hardening any application that runs in a well-defined way.

## How seccomp Works

When a process calls `prctl(PR_SET_SECCOMP, ...)` or `seccomp()`, it installs a filter. The filter is a BPF (Berkeley Packet Filter) program that the kernel evaluates for every subsequent system call. Based on the filter result, the kernel either allows the call, kills the process, returns an error, or sends a signal.

Two modes:

**SECCOMP_MODE_STRICT** - Only allows `read`, `write`, `exit`, and `sigreturn`. Very restrictive, rarely used directly.

**SECCOMP_MODE_FILTER** - Uses BPF programs to allow/deny specific syscalls, optionally based on arguments.

## Installing Tools

```bash
# Install seccomp development library and tools
sudo apt install libseccomp-dev libseccomp2 seccomp

# Install audit tools for logging denied syscalls
sudo apt install auditd

# Install strace for tracing system calls (useful for building profiles)
sudo apt install strace
```

## Discovering Which System Calls a Program Makes

Before writing a seccomp profile, you need to know what system calls your program actually uses.

```bash
# Trace all syscalls made by a command
strace -c ls /tmp

# Get a summary count
strace -c -S calls ls /tmp 2>&1 | tail -30

# Trace a running process
strace -p 1234 -c

# Trace with output to file (less noisy)
strace -o /tmp/strace-nginx.txt -c -f nginx -g 'daemon off;'

# For long-running services, collect for a period then summarize
strace -p $(pgrep nginx | head -1) -c -f -o /tmp/nginx-strace.txt &
sleep 30
kill %1
# Then review /tmp/nginx-strace.txt
```

## Writing a seccomp Profile in C

The most direct way to use seccomp is from C code using `libseccomp`:

```c
/* seccomp_example.c - Restrict to only read, write, exit syscalls */
#include <stdio.h>
#include <stdlib.h>
#include <seccomp.h>
#include <unistd.h>

int main() {
    scmp_filter_ctx ctx;

    /* Initialize with default action: kill process for unknown syscalls */
    ctx = seccomp_init(SCMP_ACT_KILL);
    if (!ctx) {
        perror("seccomp_init");
        exit(1);
    }

    /* Allow specific syscalls */
    seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(read), 0);
    seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(write), 0);
    seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(exit), 0);
    seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(exit_group), 0);
    seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(brk), 0);
    seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(mmap), 0);
    seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(munmap), 0);

    /* Load the filter */
    if (seccomp_load(ctx) < 0) {
        perror("seccomp_load");
        seccomp_release(ctx);
        exit(1);
    }

    seccomp_release(ctx);

    /* This will work */
    write(1, "Hello from restricted process\n", 30);

    /* This will kill the process (socket() is not in the allowlist) */
    /* socket(AF_INET, SOCK_STREAM, 0); */

    return 0;
}
```

```bash
# Compile and run
gcc -o seccomp_example seccomp_example.c -lseccomp
./seccomp_example
```

## Using seccomp with Docker

Docker ships with a default seccomp profile that blocks ~44 dangerous syscalls. You can view and customize it:

```bash
# View Docker's default seccomp profile
docker run --rm alpine cat /dev/null  # Docker applies default profile automatically

# Run with no seccomp restriction
docker run --security-opt seccomp=unconfined myimage

# Apply a custom profile
docker run --security-opt seccomp=/path/to/profile.json myimage
```

### Writing a Docker seccomp Profile

Docker uses JSON-formatted seccomp profiles:

```json
{
    "defaultAction": "SCMP_ACT_ERRNO",
    "architectures": [
        "SCMP_ARCH_X86_64",
        "SCMP_ARCH_X86",
        "SCMP_ARCH_X32"
    ],
    "syscalls": [
        {
            "names": [
                "accept",
                "accept4",
                "bind",
                "brk",
                "close",
                "connect",
                "epoll_create",
                "epoll_create1",
                "epoll_ctl",
                "epoll_wait",
                "epoll_pwait",
                "exit",
                "exit_group",
                "fstat",
                "futex",
                "getpid",
                "getsockopt",
                "listen",
                "mmap",
                "mprotect",
                "munmap",
                "nanosleep",
                "read",
                "recvfrom",
                "recvmsg",
                "rt_sigaction",
                "rt_sigprocmask",
                "rt_sigreturn",
                "sendmsg",
                "sendto",
                "setsockopt",
                "socket",
                "stat",
                "write",
                "writev"
            ],
            "action": "SCMP_ACT_ALLOW"
        }
    ]
}
```

```bash
# Save as nginx-seccomp.json and use it
docker run --security-opt seccomp=nginx-seccomp.json nginx
```

## Using seccomp with systemd Services

systemd has built-in seccomp support via `SystemCallFilter`:

```bash
# Add to a service unit file
sudo systemctl edit myapp.service
```

```ini
[Service]
# Allow only specific syscall groups
# Use @ to refer to predefined groups
SystemCallFilter=@system-service

# Or be more specific
SystemCallFilter=read write open close stat fstat lstat
SystemCallFilter=~@clock @cpu-emulation @debug @keyring @module @mount @obsolete @privileged @raw-io @reboot @resources @setuid @swap

# Action when a blocked syscall is attempted
# Options: kill (default), kill-process, trap, log, errno:EPERM
SystemCallErrorNumber=EPERM

# Also set the architecture for 32-bit syscall table filtering
SystemCallArchitectures=native
```

```bash
# Apply changes
sudo systemctl daemon-reload
sudo systemctl restart myapp.service
```

### Predefined systemd Syscall Groups

systemd provides these `@group` shortcuts:

- `@system-service` - A reasonable set for most system services
- `@basic-io` - Basic I/O operations
- `@file-system` - Filesystem operations
- `@network-io` - Network operations
- `@process` - Process management
- `@privileged` - Privileged operations (usually deny these)
- `@clock` - Clock/time modification (usually deny)
- `@module` - Kernel module loading (deny)
- `@mount` - Filesystem mounting (deny unless needed)
- `@debug` - ptrace and debugging (deny in production)

```bash
# See what syscalls are in a group
systemd-analyze syscall-filter @system-service
systemd-analyze syscall-filter @network-io
```

## Logging Blocked Syscalls

When a syscall is blocked, you want to know about it during development and testing:

```bash
# Use SECCOMP_RET_LOG instead of KILL to log without killing
# In Docker:
docker run --security-opt seccomp=profile-with-log.json myimage

# In systemd, use errno action to get EPERM but not kill:
# SystemCallErrorNumber=EPERM  (process gets error, not killed)

# Monitor audit logs for seccomp violations
sudo journalctl -k | grep seccomp
sudo ausearch -m SECCOMP
```

## Practical: Hardening nginx with seccomp and systemd

```bash
sudo systemctl edit nginx.service
```

```ini
[Service]
# Restrict to only what nginx needs
SystemCallFilter=@system-service @network-io @file-system
SystemCallFilter=~@clock @cpu-emulation @debug @keyring @module @mount @obsolete @privileged @raw-io @reboot @swap

# Fail with EPERM rather than killing (easier debugging)
SystemCallErrorNumber=EPERM

# Restrict architecture
SystemCallArchitectures=native

# Complement with other hardening
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
NoNewPrivileges=true
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
```

```bash
sudo systemctl daemon-reload
sudo systemctl restart nginx

# Test that nginx still serves pages
curl localhost
```

## Testing a seccomp Profile

After applying a profile, test all code paths of your application. A profile that blocks required syscalls will cause mysterious failures.

```bash
# Watch for seccomp kills in audit log while testing
sudo journalctl -k -f | grep -i seccomp &

# Run your application's test suite
./run_tests.sh

# Check for any audit entries
sudo ausearch -m SECCOMP -ts recent
```

seccomp is one of the most effective defense-in-depth tools available on Linux. Combined with other hardening mechanisms like capabilities, namespaces, and AppArmor, it significantly limits what a compromised process can do, even if an attacker manages to achieve code execution.
