# How to Use a Custom Seccomp Profile with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Linux, Security, Seccomp, Syscalls

Description: Learn how to create and apply custom seccomp profiles in Podman to restrict which system calls a container can make.

---

> Seccomp profiles act as a syscall firewall, blocking dangerous operations before the kernel executes them.

Seccomp (Secure Computing Mode) filters limit the system calls a process can make to the Linux kernel. Podman applies a default seccomp profile that blocks around 50 dangerous syscalls, but you can write a custom profile to tighten restrictions further or allow specific syscalls your application needs.

This guide covers creating, applying, and testing custom seccomp profiles with Podman.

---

## How Seccomp Works

Seccomp profiles are JSON files that define a whitelist or blacklist of system calls. When a container process attempts a blocked syscall, the kernel can return an error, terminate the process, or take another configured action such as logging the event.

```bash
# Check if seccomp is enabled in your kernel

# The output should include CONFIG_SECCOMP=y
grep CONFIG_SECCOMP /boot/config-$(uname -r)

# Check whether Podman reports seccomp support on this host
podman info --format '{{.Host.Security.SECCOMPEnabled}}'
```

## Creating a Basic Custom Profile

A seccomp profile is a JSON file that specifies the default action and a list of syscalls with their allowed actions.

```bash
# Create a directory for your seccomp profiles
mkdir -p ~/podman-seccomp

# Create a restrictive custom seccomp profile
# This profile blocks everything by default and allows only specified syscalls
cat > ~/podman-seccomp/custom-profile.json << 'EOF'
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": [
    "SCMP_ARCH_X86_64",
    "SCMP_ARCH_X86",
    "SCMP_ARCH_AARCH64"
  ],
  "syscalls": [
    {
      "names": [
        "read", "write", "open", "close", "stat", "fstat",
        "lstat", "poll", "lseek", "mmap", "mprotect",
        "munmap", "brk", "rt_sigaction", "rt_sigprocmask",
        "ioctl", "access", "pipe", "select", "sched_yield",
        "mremap", "msync", "mincore", "madvise", "dup",
        "dup2", "nanosleep", "getpid", "socket", "connect",
        "accept", "sendto", "recvfrom", "bind", "listen",
        "clone", "execve", "exit", "wait4", "kill",
        "uname", "fcntl", "flock", "fsync", "fdatasync",
        "getcwd", "chdir", "rename", "mkdir", "rmdir",
        "link", "unlink", "readlink", "chmod", "chown",
        "umask", "gettimeofday", "getuid", "getgid",
        "geteuid", "getegid", "getppid", "getpgrp",
        "arch_prctl", "exit_group", "openat", "newfstatat",
        "set_tid_address", "set_robust_list", "futex",
        "sched_getaffinity", "getdents64", "pread64",
        "pwrite64", "getrandom", "memfd_create",
        "statx", "rseq", "close_range", "prlimit64",
        "epoll_create1", "epoll_ctl", "epoll_wait"
      ],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
EOF

echo "Custom seccomp profile created at ~/podman-seccomp/custom-profile.json"
```

## Applying the Custom Profile

Use the `--security-opt` flag to apply your seccomp profile to a container.

```bash
# Run a container with the custom seccomp profile
# The seccomp= option points to your JSON profile file
podman run --rm \
  --security-opt seccomp=$HOME/podman-seccomp/custom-profile.json \
  docker.io/library/alpine:latest \
  echo "Running with custom seccomp profile"

# Test that blocked syscalls are actually denied
# If ptrace is not in the allow list, strace will fail
podman run --rm \
  --security-opt seccomp=$HOME/podman-seccomp/custom-profile.json \
  docker.io/library/alpine:latest \
  sh -c "apk add --no-cache strace 2>/dev/null; strace -e trace=write echo test" \
  || echo "strace blocked by seccomp as expected"
```

## Creating a Profile That Blocks Specific Syscalls

Instead of allowlisting, you can create an allow-by-default profile and block specific syscalls.

```bash
# Create a profile that blocks network-related syscalls
# The default action allows everything; specific syscalls are denied
cat > ~/podman-seccomp/no-network.json << 'EOF'
{
  "defaultAction": "SCMP_ACT_ALLOW",
  "syscalls": [
    {
      "names": [
        "socket",
        "connect",
        "accept",
        "accept4",
        "bind",
        "listen",
        "sendto",
        "recvfrom",
        "sendmsg",
        "recvmsg"
      ],
      "action": "SCMP_ACT_ERRNO",
      "errnoRet": 1
    }
  ]
}
EOF

# Test the no-network profile - network operations should fail
podman run --rm \
  --security-opt seccomp=$HOME/podman-seccomp/no-network.json \
  docker.io/library/alpine:latest \
  sh -c "wget -q -T 2 http://example.com 2>&1 || echo 'Network blocked by seccomp'"
```

## Verifying the Active Profile

Confirm which seccomp profile a container is using.

```bash
# Run a container with your custom profile
podman run -d --name seccomp-test \
  --security-opt seccomp=$HOME/podman-seccomp/custom-profile.json \
  docker.io/library/alpine:latest sleep 3600

# Inspect the container to confirm the seccomp profile path
podman inspect seccomp-test --format '{{ index .Config.Annotations "io.podman.annotations.seccomp" }}'

# Clean up
podman stop seccomp-test && podman rm seccomp-test
```

## Summary

Custom seccomp profiles give you precise control over which kernel syscalls your Podman containers can invoke. Start by auditing your application with `SCMP_ACT_LOG`, build a minimal allowlist of the syscalls it actually uses, and apply that profile to lock down your production containers. This layered approach to security significantly reduces the kernel attack surface available to containerized workloads.
