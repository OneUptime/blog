# How to Create Custom Seccomp Profiles for Docker Containers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Security, Seccomp, Containers, Linux, Hardening, DevOps

Description: Learn how to create and apply custom seccomp profiles to restrict system calls in Docker containers, reducing your attack surface significantly.

---

Seccomp (Secure Computing Mode) filters the system calls a process can make. Docker ships with a default seccomp profile that blocks around 44 of the 300+ Linux system calls. For most workloads, this default is fine. But when you run sensitive applications or need to comply with strict security standards, a custom seccomp profile lets you lock down containers to only the exact system calls they need.

## What Is Seccomp and Why Does It Matter?

Every time a container interacts with the kernel, it makes a system call. File operations, network requests, memory allocation, process management - all system calls. If an attacker compromises your container, they can attempt to exploit kernel vulnerabilities through system calls. Seccomp limits which calls are available, shrinking the attack surface.

Docker's default profile is permissive enough to run most applications. It blocks dangerous calls like `reboot`, `mount`, and `kexec_load`, but allows hundreds of others. A custom profile takes the opposite approach: deny everything, then allow only what your application actually uses.

## Docker's Default Seccomp Profile

Before writing a custom profile, check what the default profile allows. Docker's default profile is a JSON file. Here is how to inspect it:

```bash
# Download Docker's default seccomp profile for reference
curl -sL https://raw.githubusercontent.com/moby/moby/master/profiles/seccomp/default.json \
  -o default-seccomp.json

# Count how many syscalls it allows
cat default-seccomp.json | python3 -c "
import json, sys
profile = json.load(sys.stdin)
print(f'Allowed syscalls: {len(profile[\"syscalls\"])} rules')
print(f'Default action: {profile[\"defaultAction\"]}')
"
```

The default action is `SCMP_ACT_ERRNO`, meaning any system call not explicitly listed gets blocked with a permission error. The profile then lists the allowed calls.

## Anatomy of a Seccomp Profile

A seccomp profile is a JSON file with this structure:

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "defaultErrnoRet": 1,
  "archMap": [
    {
      "architecture": "SCMP_ARCH_X86_64",
      "subArchitectures": [
        "SCMP_ARCH_X86",
        "SCMP_ARCH_X32"
      ]
    }
  ],
  "syscalls": [
    {
      "names": ["read", "write", "close", "fstat"],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

The key fields are:

- `defaultAction`: What happens when a syscall is not in the list. Use `SCMP_ACT_ERRNO` to block by default.
- `archMap`: Which CPU architectures this profile applies to.
- `syscalls`: Array of rules. Each rule has a list of syscall names and an action.

Available actions include:

- `SCMP_ACT_ALLOW` - Allow the call
- `SCMP_ACT_ERRNO` - Block with an error code
- `SCMP_ACT_LOG` - Allow but log it (useful for auditing)
- `SCMP_ACT_KILL` - Kill the process immediately
- `SCMP_ACT_TRAP` - Send a SIGSYS signal

## Step 1: Discover Which System Calls Your Application Uses

The first step in creating a custom profile is finding out which system calls your application actually makes. Use `strace` to trace them.

Run your container with the default seccomp profile and strace attached:

```bash
# Run the container with strace to discover syscall usage
docker run --rm -it --security-opt seccomp=unconfined \
  strace -c -f -S name your-image:latest 2>&1 | tail -50
```

The `-c` flag gives you a summary count of each syscall. The `-f` flag follows child processes. The output looks something like this:

```
% time     seconds  usecs/call     calls    errors syscall
------ ----------- ----------- --------- --------- --------
 35.12    0.012453        1245        10           read
 28.44    0.010083          56       180           write
 12.31    0.004365           4      1091           close
  8.77    0.003110          31       100         5 openat
  5.23    0.001854          18       103           fstat
  ...
```

For a more automated approach, use the OCI seccomp-bpf tracing tool:

```bash
# Install oci-seccomp-bpf-hook for automatic profile generation
sudo apt-get install golang-github-containers-ocicrypt-dev

# Run with the hook to generate a profile automatically
docker run --rm \
  --annotation io.containers.trace-syscall="of:/tmp/generated-profile.json" \
  your-image:latest
```

## Step 2: Write the Custom Profile

Based on your syscall trace, write a profile that allows only the needed calls. Here is an example for a typical Node.js web application:

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "defaultErrnoRet": 1,
  "archMap": [
    {
      "architecture": "SCMP_ARCH_X86_64",
      "subArchitectures": [
        "SCMP_ARCH_X86",
        "SCMP_ARCH_X32"
      ]
    },
    {
      "architecture": "SCMP_ARCH_AARCH64",
      "subArchitectures": []
    }
  ],
  "syscalls": [
    {
      "names": [
        "accept", "accept4", "access", "arch_prctl", "bind", "brk",
        "capget", "capset", "chdir", "clock_getres", "clock_gettime",
        "clock_nanosleep", "clone", "close", "connect", "dup", "dup2",
        "dup3", "epoll_create1", "epoll_ctl", "epoll_pwait", "epoll_wait",
        "eventfd2", "execve", "exit", "exit_group", "faccessat", "fadvise64",
        "fchmod", "fchown", "fcntl", "fdatasync", "fstat", "fstatfs",
        "fsync", "ftruncate", "futex", "getcwd", "getdents64", "getegid",
        "geteuid", "getgid", "getpeername", "getpgrp", "getpid", "getppid",
        "getrandom", "getresgid", "getresuid", "getsockname", "getsockopt",
        "getuid", "ioctl", "listen", "lseek", "lstat", "madvise",
        "membarrier", "mkdir", "mmap", "mprotect", "mremap", "munmap",
        "nanosleep", "newfstatat", "openat", "pipe", "pipe2", "poll",
        "ppoll", "prctl", "pread64", "prlimit64", "pwrite64", "read",
        "readlink", "recvfrom", "recvmsg", "rename", "rmdir", "rt_sigaction",
        "rt_sigprocmask", "rt_sigreturn", "sched_getaffinity",
        "sched_yield", "sendmsg", "sendto", "set_robust_list",
        "set_tid_address", "setgid", "setgroups", "setsockopt", "setuid",
        "shutdown", "sigaltstack", "socket", "stat", "statfs", "statx",
        "sysinfo", "tgkill", "umask", "uname", "unlink", "wait4",
        "write", "writev"
      ],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

Save this as `nodejs-seccomp.json`.

## Step 3: Apply the Profile

Apply the profile when running the container:

```bash
# Run a container with the custom seccomp profile
docker run -d \
  --name myapp \
  --security-opt seccomp=./nodejs-seccomp.json \
  -p 3000:3000 \
  myapp:latest
```

For Docker Compose:

```yaml
# docker-compose.yml with custom seccomp profile
services:
  api:
    image: myapp:latest
    ports:
      - "3000:3000"
    security_opt:
      - seccomp=./nodejs-seccomp.json
```

## Step 4: Test and Iterate

After applying the profile, test your application thoroughly. If something breaks, the container logs or `dmesg` will show which syscall was blocked:

```bash
# Check kernel logs for blocked syscalls
dmesg | grep -i seccomp

# Run with SCMP_ACT_LOG as the default action for debugging
# This allows all calls but logs the ones not in your allow list
```

Create a debug version of your profile that logs instead of blocks:

```json
{
  "defaultAction": "SCMP_ACT_LOG",
  "syscalls": [
    {
      "names": ["read", "write", "close"],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

Run with this profile, exercise all application features, check the audit log for logged syscalls, and add any missing ones to your allow list.

## Filtering by Arguments

Seccomp profiles can filter based on syscall arguments, not just names. This is useful for restricting socket types or file access patterns:

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "syscalls": [
    {
      "names": ["socket"],
      "action": "SCMP_ACT_ALLOW",
      "args": [
        {
          "index": 0,
          "value": 2,
          "op": "SCMP_CMP_EQ"
        }
      ]
    }
  ]
}
```

This rule allows `socket()` only when the first argument (domain) equals 2 (`AF_INET`). IPv6 sockets (`AF_INET6 = 10`) and Unix sockets (`AF_UNIX = 1`) would be blocked.

## Automating Profile Generation in CI/CD

Integrate profile generation into your CI pipeline:

```bash
#!/bin/bash
# generate-seccomp-profile.sh
# Runs the application under strace and generates a minimal seccomp profile

IMAGE=$1
OUTPUT=${2:-seccomp-profile.json}

# Run with strace and capture syscalls
SYSCALLS=$(docker run --rm --security-opt seccomp=unconfined \
  --entrypoint strace "$IMAGE" \
  -c -f -S name /app/entrypoint.sh 2>&1 | \
  grep -E '^\s+[0-9]' | awk '{print $NF}' | sort -u)

# Generate the profile JSON
python3 -c "
import json
syscalls = '''$SYSCALLS'''.strip().split('\n')
profile = {
    'defaultAction': 'SCMP_ACT_ERRNO',
    'archMap': [{'architecture': 'SCMP_ARCH_X86_64', 'subArchitectures': ['SCMP_ARCH_X86', 'SCMP_ARCH_X32']}],
    'syscalls': [{'names': syscalls, 'action': 'SCMP_ACT_ALLOW'}]
}
print(json.dumps(profile, indent=2))
" > "$OUTPUT"

echo "Generated profile with $(echo "$SYSCALLS" | wc -l) syscalls: $OUTPUT"
```

## Wrapping Up

Custom seccomp profiles reduce the kernel attack surface for your containers. The process is straightforward: trace your application's syscalls, build an allow list, apply the profile, and test. Start with a logging profile in staging, then switch to enforcement in production. Even a rough custom profile blocks more dangerous syscalls than Docker's default, giving you a meaningful security improvement.
