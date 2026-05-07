# How to Disable Seccomp for a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Linux, Security, Seccomp, Debugging

Description: Learn how to disable seccomp filtering in Podman containers for debugging and development scenarios where syscall restrictions interfere with your workload.

---

> Disabling seccomp removes the syscall firewall entirely - understand the risks before turning it off.

Seccomp (Secure Computing Mode) is a kernel-level security feature that restricts which system calls a container can make. Podman applies a default seccomp profile that blocks dangerous syscalls. However, during debugging, profiling, or running specialized workloads, seccomp can interfere with legitimate operations. In these cases, you can disable it temporarily.

This guide explains how to disable seccomp in Podman, when it makes sense to do so, and how to minimize the associated risks.

---

## Why Seccomp Might Need to Be Disabled

Certain tools and workloads require syscalls that the default seccomp profile blocks. Common scenarios include:

- Running `perf`, eBPF tracing tools, or other profilers that need restricted syscalls such as `perf_event_open` or `bpf`
- Containers that use `ptrace` for process inspection with a custom or older seccomp profile that blocks it
- Legacy applications that rely on older or unusual syscalls
- Kernel module loading or system-level testing

```bash
# Demonstrate a seccomp restriction - perf needs perf_event_open

# This will fail under the default seccomp profile in many configurations
podman run --rm docker.io/library/alpine:latest \
  sh -c "apk add --no-cache perf && perf stat true" \
  2>&1 || echo "perf may be restricted by seccomp or kernel settings"
```

## Disabling Seccomp with --security-opt

Use the `--security-opt seccomp=unconfined` flag to completely disable seccomp filtering.

```bash
# Run a container with seccomp disabled
# The container can now make any syscall supported by the kernel
podman run --rm \
  --security-opt seccomp=unconfined \
  docker.io/library/alpine:latest \
  echo "Running with seccomp disabled"

# Now perf_event_open is no longer blocked by seccomp
podman run --rm \
  --security-opt seccomp=unconfined \
  docker.io/library/alpine:latest \
  sh -c "apk add --no-cache perf && perf stat true 2>&1 | head -20"
```

## Verifying Seccomp Is Disabled

You can confirm that seccomp is not filtering syscalls inside the container.

```bash
# Check the seccomp status from inside the container
# A value of 0 means seccomp is not active for this process
podman run --rm \
  --security-opt seccomp=unconfined \
  docker.io/library/alpine:latest \
  sh -c "grep Seccomp /proc/self/status"

# Compare with the default - seccomp is active (value of 2)
podman run --rm \
  docker.io/library/alpine:latest \
  sh -c "grep Seccomp /proc/self/status"
```

## Practical Example: Debugging with strace

One reason to disable seccomp is to run strace inside a container when the active seccomp profile blocks `ptrace`. With current Podman defaults, adding `SYS_PTRACE` is usually the important part when strace needs to attach to an existing process.

```bash
# Run a debugging container with seccomp disabled and SYS_PTRACE added
# SYS_PTRACE is also needed for strace to attach to processes
podman run --rm -it \
  --security-opt seccomp=unconfined \
  --cap-add SYS_PTRACE \
  docker.io/library/alpine:latest \
  sh -c "
    apk add --no-cache strace
    # Trace file-related syscalls for a simple command
    strace -e trace=file ls / 2>&1 | head -30
  "
```

## Practical Example: Performance Profiling

Performance tools like `perf` often need unrestricted syscall access.

```bash
# Run a container for performance profiling
# The perf tool requires access to performance monitoring operations
podman run --rm \
  --security-opt seccomp=unconfined \
  --cap-add PERFMON \
  docker.io/library/ubuntu:latest \
  bash -c "
    apt-get update -qq && apt-get install -y -qq linux-tools-generic 2>/dev/null
    # List available performance events
    perf list 2>&1 | head -20 || echo 'perf requires kernel support'
  "
```

## Using Unconfined Seccomp in Podman Compose

You can also disable seccomp through a compose file for development environments.

```bash
# Create a compose file with seccomp disabled
cat > /tmp/debug-compose.yml << 'EOF'
version: "3"
services:
  debug-app:
    image: docker.io/library/alpine:latest
    command: sleep 3600
    security_opt:
      - seccomp:unconfined
    cap_add:
      - SYS_PTRACE
EOF

# Start the service with podman-compose
# podman-compose -f /tmp/debug-compose.yml up -d
echo "Compose file created at /tmp/debug-compose.yml"
```

## Limiting the Blast Radius

If you must disable seccomp, combine it with other security measures to limit risk.

```bash
# Disable seccomp but drop all unnecessary capabilities
# This provides syscall freedom while limiting capability-based attacks
podman run --rm \
  --security-opt seccomp=unconfined \
  --cap-drop ALL \
  --cap-add SYS_PTRACE \
  docker.io/library/alpine:latest \
  sh -c "grep Seccomp /proc/self/status && apk add --no-cache libcap && getpcaps 1"

# Run as a non-root user even with seccomp disabled
# The user restriction limits what the process can do with unrestricted syscalls
podman run --rm \
  --security-opt seccomp=unconfined \
  --user 1000:1000 \
  docker.io/library/alpine:latest \
  sh -c "whoami 2>/dev/null || echo 'Running as UID 1000'; grep Seccomp /proc/self/status"
```

## Inspecting a Running Container

Check whether a running container has seccomp disabled.

```bash
# Start a container with seccomp disabled
podman run -d --name no-seccomp \
  --security-opt seccomp=unconfined \
  docker.io/library/alpine:latest sleep 3600

# Inspect the security options
podman inspect no-seccomp --format '{{.HostConfig.SecurityOpt}}'

# Clean up
podman stop no-seccomp && podman rm no-seccomp
```

## Summary

Disabling seccomp with `--security-opt seccomp=unconfined` removes all syscall filtering from a Podman container. This is appropriate for debugging with tools like strace, performance profiling, or running workloads that need unusual syscalls. Never disable seccomp in production without compensating controls such as dropped capabilities, non-root users, and network restrictions. Always re-enable seccomp once your debugging session is complete.
