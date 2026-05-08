# How to Run a Container in Privileged Mode with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Security, Privileged Mode

Description: Understand when and how to run containers in privileged mode with Podman, including the security implications and safer alternatives.

---

> Privileged mode grants a container nearly unrestricted access to the host system, so use it only when you fully understand the trade-offs.

By default, containers run with restricted capabilities for security. They have limited access to host devices and cannot load kernel modules or modify system configurations. However, certain workloads require elevated privileges, such as running container engines inside containers, managing network interfaces, or accessing hardware devices.

Podman's `--privileged` flag removes these restrictions. This guide explains how it works, when to use it, and how to use safer alternatives when possible.

---

## What Privileged Mode Does

When you run a container with `--privileged`, Podman:

- Grants all Linux capabilities to the container
- Disables SELinux and AppArmor confinement
- Gives the container the same host device access as the user launching it
- Removes seccomp filtering
- Disables Podman's default read-only and masked path protections for parts of `/proc` and `/sys`

```bash
# Run a container in privileged mode

podman run --privileged -it alpine sh

# Inside the container, you can now see all host devices
ls /dev/

# You can access system information
cat /proc/partitions

# You can load kernel modules (if available)
modprobe dummy 2>/dev/null && echo "Module loaded" || echo "modprobe not available in image"
```

## Basic Privileged Container Usage

```bash
# Run a privileged container in detached mode
podman run -d --privileged --name privileged-container alpine sleep infinity

# Verify the container has elevated privileges
podman inspect privileged-container --format '{{.HostConfig.Privileged}}'
# Output: true

# Compare capabilities with a non-privileged container
echo "--- Privileged ---"
podman exec privileged-container sh -c "cat /proc/self/status | grep Cap"

echo "--- Normal ---"
podman run --rm alpine sh -c "cat /proc/self/status | grep Cap"
```

## Common Use Cases for Privileged Mode

### Running Container Engines Inside Containers

```bash
# Run Podman inside Podman with extended privileges
podman run --privileged -it --name inner-podman \
  quay.io/podman/stable:latest \
  podman run --rm alpine echo "Nested container works"
```

### Accessing Hardware Devices

```bash
# Access USB devices from within a container
podman run --privileged -it \
  --name hw-access \
  alpine sh -c "ls -la /dev/bus/usb/ 2>/dev/null || echo 'No USB bus found'"

# Access block devices
podman run --privileged -it \
  alpine sh -c "fdisk -l 2>/dev/null | head -20"
```

### Network Configuration

```bash
# Modify network interfaces from within the container
podman run --privileged -it \
  alpine sh -c "
    apk add --no-cache iproute2 > /dev/null 2>&1
    ip link show
    ip addr show
  "
```

## Safer Alternatives to Full Privileged Mode

### Adding Individual Capabilities

Instead of granting all privileges, add only the capabilities you need:

```bash
# Add only the NET_ADMIN capability for network management
podman run --cap-add NET_ADMIN -it alpine sh -c "
  apk add --no-cache iproute2 > /dev/null 2>&1
  ip link add dummy0 type dummy
  ip addr show dummy0
"

# Add SYS_PTRACE for debugging
podman run --cap-add SYS_PTRACE -it alpine sh -c "
  apk add --no-cache strace > /dev/null 2>&1
  strace -c ls / 2>&1 | head -20
"

# Add multiple capabilities
podman run \
  --cap-add NET_ADMIN \
  --cap-add NET_RAW \
  --cap-add SYS_ADMIN \
  -it alpine sh
```

### Common Capabilities and Their Uses

```bash
# NET_ADMIN - network interface management
podman run --cap-add NET_ADMIN --rm alpine sh -c "echo 'Can configure network'"

# SYS_PTRACE - debugging and tracing
podman run --cap-add SYS_PTRACE --rm alpine sh -c "echo 'Can trace processes'"

# SYS_ADMIN - mount filesystems, configure namespaces
podman run --cap-add SYS_ADMIN --rm alpine sh -c "echo 'Can perform admin tasks'"

# MKNOD - create device files
podman run --cap-add MKNOD --rm alpine sh -c "echo 'Can create devices'"

# SYS_RAWIO - raw I/O access
podman run --cap-add SYS_RAWIO --rm alpine sh -c "echo 'Can do raw I/O'"
```

### Granting Access to Specific Devices

Instead of all devices, grant access to only what you need:

```bash
# Grant access to a specific device
podman run --device /dev/fuse -it alpine ls -la /dev/fuse

# Grant access with custom permissions (read/write/mknod)
podman run --device /dev/sda:/dev/sda:r -it alpine sh -c "
  dd if=/dev/sda bs=512 count=1 2>/dev/null | hexdump -C | head -5
"
```

### Using Custom Seccomp Profiles

```bash
# Turn off seccomp confinement
podman run --security-opt seccomp=unconfined -it alpine sh -c "
  echo 'Running with unconfined seccomp'
"

# Use a custom seccomp profile
# First create a profile that allows specific syscalls
cat > /tmp/custom-seccomp.json << 'EOF'
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {"names": ["read","write","open","close","stat","fstat","mmap","mprotect","munmap","brk","exit_group","execve","arch_prctl","access","getdents64","openat","newfstatat"], "action": "SCMP_ACT_ALLOW"}
  ]
}
EOF

podman run --security-opt seccomp=/tmp/custom-seccomp.json --rm alpine echo "Restricted seccomp"
```

## Privileged Mode with Rootless Podman

Even in rootless mode, `--privileged` grants additional access within the user namespace:

```bash
# Rootless privileged container
podman run --privileged -it alpine sh -c "
  echo 'UID: $(id -u)'
  echo 'Capabilities:'
  cat /proc/self/status | grep Cap
"

# Note: rootless privileged is still more restricted than rootful privileged
# Some operations that need true root will still fail
```

## Security Considerations

```bash
# List capabilities of a privileged container vs normal
echo "=== Normal Container Capabilities ==="
podman run --rm alpine sh -c "grep Cap /proc/self/status"

echo ""
echo "=== Privileged Container Capabilities ==="
podman run --rm --privileged alpine sh -c "grep Cap /proc/self/status"
```

## Checking If Privileged Mode Is Necessary

Before using `--privileged`, test with specific capabilities:

```bash
# Step 1: Try without any extra privileges
podman run --rm alpine your-command 2>&1

# Step 2: If it fails, try adding specific capabilities
podman run --rm --cap-add SYS_ADMIN alpine your-command 2>&1

# Step 3: Only if nothing else works, use privileged
podman run --rm --privileged alpine your-command 2>&1
```

## Summary

Privileged mode in Podman removes container isolation for workloads that need full host access:

- Use `--privileged` only when absolutely necessary
- Prefer `--cap-add` to grant individual capabilities
- Use `--device` for specific device access instead of all devices
- Rootless privileged mode is safer than rootful privileged mode
- Always evaluate whether a custom seccomp profile or specific capabilities can replace `--privileged`
- Document why privileged mode is needed for any container that uses it

The principle of least privilege applies to containers just as it does to user accounts. Grant only the access that is actually required.
