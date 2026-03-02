# How to Use Seccomp Profiles for Container Security on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Docker, Container, Linux

Description: Learn how to use seccomp profiles to restrict system calls available to containers on Ubuntu, reducing your attack surface and hardening container workloads.

---

Containers run on shared Linux kernels, which means a compromised container process can potentially exploit kernel vulnerabilities to break out of the container boundary. Seccomp (Secure Computing Mode) is one of the most effective kernel-level security mechanisms for limiting what a containerized process can do.

This post covers how seccomp profiles work, how to apply them to Docker containers, and how to craft custom profiles for your specific workloads on Ubuntu.

## What Is Seccomp

Seccomp is a Linux kernel feature that filters the system calls a process can make. When a process is confined by a seccomp profile, any system call not explicitly allowed results in the process being killed (or receiving an error, depending on the action configured).

Docker ships with a default seccomp profile that blocks around 44 system calls out of over 300 available. This is a good baseline, but many production workloads benefit from a tighter, application-specific profile.

## Checking Seccomp Support

Before doing anything, confirm that your Ubuntu system and Docker installation support seccomp.

```bash
# Check kernel config for seccomp support
grep CONFIG_SECCOMP /boot/config-$(uname -r)

# You should see:
# CONFIG_SECCOMP=y
# CONFIG_SECCOMP_FILTER=y

# Check Docker's security features
docker info | grep -i seccomp
# Should show: Security Options: seccomp
```

## Understanding the Default Docker Seccomp Profile

Docker's default profile is maintained in the Moby project. You can download it to inspect it.

```bash
# Download the default profile
curl -o /tmp/default-seccomp.json \
  https://raw.githubusercontent.com/moby/moby/master/profiles/seccomp/default.json

# Count the number of allowed syscalls
cat /tmp/default-seccomp.json | python3 -c "
import json, sys
profile = json.load(sys.stdin)
syscalls = [s for s in profile['syscalls'] if 'SCMP_ACT_ALLOW' in str(s.get('action',''))]
names = [n for s in syscalls for n in s.get('names',[])]
print(f'Allowed syscalls: {len(names)}')
"
```

The profile uses a whitelist approach: everything not explicitly allowed is blocked by default. The `defaultAction` field is set to `SCMP_ACT_ERRNO`, which returns a "Operation not permitted" error to the process.

## Running Containers with a Custom Seccomp Profile

You can apply a seccomp profile when running a container with the `--security-opt` flag.

```bash
# Run with the default seccomp profile explicitly
docker run --security-opt seccomp=/tmp/default-seccomp.json ubuntu:22.04 /bin/bash

# Run with seccomp disabled (not recommended for production)
docker run --security-opt seccomp=unconfined ubuntu:22.04 /bin/bash
```

## Creating a Minimal Custom Profile

The best practice for high-security workloads is to create a profile that only allows the system calls your application actually uses. Here is how to figure out what those are.

### Step 1: Trace System Calls with strace

```bash
# Install strace if needed
sudo apt install strace -y

# Run your application under strace and capture syscalls
strace -o /tmp/app-trace.txt -f your_application

# Extract unique syscall names
grep -oP '^\w+' /tmp/app-trace.txt | sort -u > /tmp/needed-syscalls.txt

cat /tmp/needed-syscalls.txt
```

### Step 2: Build the Profile

Create a JSON profile based on the syscalls you discovered.

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
        "bind",
        "close",
        "connect",
        "epoll_create1",
        "epoll_ctl",
        "epoll_wait",
        "exit_group",
        "fstat",
        "futex",
        "getpid",
        "listen",
        "mmap",
        "mprotect",
        "munmap",
        "openat",
        "read",
        "recvfrom",
        "sendto",
        "socket",
        "write"
      ],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

Save this to `/etc/docker/seccomp/myapp.json` and apply it.

```bash
# Create the directory for profiles
sudo mkdir -p /etc/docker/seccomp

# Save your profile
sudo nano /etc/docker/seccomp/myapp.json

# Run your container with it
docker run --security-opt seccomp=/etc/docker/seccomp/myapp.json myapp:latest
```

## Using seccomp with Docker Compose

You can specify seccomp profiles in your Compose files as well.

```yaml
version: "3.8"
services:
  app:
    image: myapp:latest
    security_opt:
      - seccomp:/etc/docker/seccomp/myapp.json
    ports:
      - "8080:8080"
```

## Applying Profiles in Kubernetes

On Kubernetes, seccomp profiles are applied at the pod level using the `securityContext`.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-pod
spec:
  securityContext:
    seccompProfile:
      type: Localhost
      # Path relative to the kubelet seccomp profile directory
      localhostProfile: profiles/myapp.json
  containers:
    - name: myapp
      image: myapp:latest
```

The kubelet looks for profiles under `/var/lib/kubelet/seccomp/` by default on Ubuntu nodes. Copy your profile there.

```bash
# Copy profile to kubelet seccomp directory on each node
sudo mkdir -p /var/lib/kubelet/seccomp/profiles
sudo cp /etc/docker/seccomp/myapp.json /var/lib/kubelet/seccomp/profiles/myapp.json
```

## Logging Denied Syscalls

During development, you may want to log violations rather than kill the process. Use `SCMP_ACT_LOG` to audit what syscalls are being denied.

```json
{
  "defaultAction": "SCMP_ACT_LOG",
  "syscalls": [
    {
      "names": ["read", "write", "open", "close", "exit_group"],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

Check the kernel audit log for denied calls.

```bash
# View seccomp denials in the audit log
sudo ausearch -m SECCOMP | tail -30

# Or check syslog
sudo journalctl -k | grep seccomp
```

## Testing Your Profile

After applying a profile, test your application thoroughly. A good testing approach is to use the log-only mode first, then convert denials to blocks once you are confident all needed syscalls are allowed.

```bash
# Check if container exited due to seccomp violation
docker inspect <container_id> | grep -A5 State

# If ExitCode is 159 or 31, that is a seccomp kill signal
# ExitCode 159 = 128 + SIGSYS(31)
```

## Best Practices

Tight seccomp profiles significantly reduce the kernel attack surface for your containers. A container that cannot call `ptrace`, `clone`, or `mount` cannot perform many common container escape techniques.

Start with Docker's default profile, tighten it over time as you understand your workload's syscall requirements, and use the audit log mode during the testing phase to avoid unexpected application failures in production.

For monitoring and alerting when seccomp violations occur in production, consider pairing this with a security monitoring solution that can detect unusual kernel events.
