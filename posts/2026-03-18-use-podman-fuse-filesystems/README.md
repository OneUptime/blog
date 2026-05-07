# How to Use Podman with FUSE Filesystems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, FUSE, Filesystem, Storage, Linux

Description: A practical guide to using FUSE filesystems with Podman containers, including fuse-overlayfs for rootless containers, SSHFS mounts, and custom FUSE filesystem integration.

---

> FUSE (Filesystem in Userspace) can play an important role in Podman's storage stack, especially when rootless containers use fuse-overlayfs on systems that do not support native rootless overlayfs. Understanding how Podman uses FUSE filesystems helps you optimize performance and unlock advanced storage patterns.

FUSE allows filesystems to be implemented in userspace rather than kernel space. Podman can use FUSE for rootless storage through fuse-overlayfs, and you can mount additional FUSE filesystems inside containers for scenarios like remote storage access, encrypted volumes, and custom file systems.

---

## Understanding FUSE in Podman

Podman can involve FUSE in two common ways:

1. **fuse-overlayfs**: A userspace overlay driver Podman can use for rootless containers
2. **Container FUSE mounts**: Mounting FUSE filesystems inside containers

### Why FUSE Matters for Rootless Podman

The standard overlay filesystem is a kernel feature. On modern kernels, rootless Podman can use native overlayfs. On older systems, or when native rootless overlay is not available, Podman can use fuse-overlayfs to provide copy-on-write semantics in userspace.

Check your current storage driver:

```bash
podman info --format '{{.Store.GraphDriverName}}'
```

If you are running rootless and see "overlay," check whether Podman is using native overlayfs or fuse-overlayfs underneath:

```bash
podman info --format '{{index .Store.GraphStatus "Native Overlay Diff"}}'
```

A value of `true` means native overlayfs is active. A value of `false` means rootless `overlay` is going through `fuse-overlayfs`.

## Installing fuse-overlayfs

Many distributions install fuse-overlayfs alongside Podman. If not, install it manually:

```bash
# Fedora/RHEL

sudo dnf install fuse-overlayfs

# Ubuntu/Debian
sudo apt-get install fuse-overlayfs

# Verify installation
fuse-overlayfs --version
```

## Configuring Podman Storage with FUSE

### Storage Configuration File

To configure Podman to use fuse-overlayfs explicitly in the storage configuration:

```bash
mkdir -p ~/.config/containers
```

```ini
# ~/.config/containers/storage.conf
[storage]
driver = "overlay"

[storage.options.overlay]
mount_program = "/usr/bin/fuse-overlayfs"
mountopt = "nodev"
```

Note: The `metacopy=on` mount option is only supported with the native kernel overlay driver (requires root). It is not compatible with fuse-overlayfs in rootless mode.

Verify the configuration:

```bash
podman system reset  # Warning: removes all containers, images, and volumes
podman info --format '{{.Store.GraphDriverName}}'
podman info --format '{{index .Store.GraphStatus "Native Overlay Diff"}}'
```

### Performance Tuning

A minimal fuse-overlayfs configuration with Podman's recommended `nodev` mount option looks like this:

```ini
# ~/.config/containers/storage.conf
[storage]
driver = "overlay"

[storage.options.overlay]
mount_program = "/usr/bin/fuse-overlayfs"
mountopt = "nodev"
```

If you are running Podman as root with the native kernel overlay driver (not fuse-overlayfs), you can enable `metacopy=on` for faster file operations:

```ini
# /etc/containers/storage.conf (root only, native overlay)
[storage]
driver = "overlay"

[storage.options.overlay]
mountopt = "nodev,metacopy=on"
```

## Mounting FUSE Filesystems Inside Containers

To use FUSE filesystems inside containers, you typically need access to the `/dev/fuse` device and the `SYS_ADMIN` capability:

```bash
podman run --rm -it \
  --device /dev/fuse \
  --cap-add SYS_ADMIN \
  alpine sh
```

On SELinux systems, Podman may also require `sudo setsebool -P container_use_devices=true` or `--security-opt label=disable`.

### Using SSHFS Inside a Container

Mount a remote filesystem via SSH inside a container:

```dockerfile
# Containerfile.sshfs
FROM fedora:latest

RUN dnf install -y fuse-sshfs openssh-clients && dnf clean all

RUN mkdir /remote
ENTRYPOINT ["/bin/bash"]
```

Build and run:

```bash
podman build -t sshfs-container -f Containerfile.sshfs .

podman run --rm -it \
  --device /dev/fuse \
  --cap-add SYS_ADMIN \
  -v ~/.ssh/id_rsa:/root/.ssh/id_rsa:ro \
  sshfs-container \
  -c '
    sshfs user@remote-host:/data /remote -o StrictHostKeyChecking=no
    ls /remote
    umount /remote
  '
```

### Using S3 FUSE Inside a Container

Mount an S3 bucket as a filesystem:

```dockerfile
# Containerfile.s3fs
FROM fedora:latest

RUN dnf install -y s3fs-fuse && dnf clean all

RUN mkdir /s3data
ENTRYPOINT ["/bin/bash"]
```

```bash
podman build -t s3fs-container -f Containerfile.s3fs .

podman run --rm -it \
  --device /dev/fuse \
  --cap-add SYS_ADMIN \
  -e AWS_ACCESS_KEY_ID=your-key \
  -e AWS_SECRET_ACCESS_KEY=your-secret \
  s3fs-container \
  -c '
    echo "$AWS_ACCESS_KEY_ID:$AWS_SECRET_ACCESS_KEY" > /etc/passwd-s3fs
    chmod 600 /etc/passwd-s3fs
    s3fs my-bucket /s3data -o passwd_file=/etc/passwd-s3fs
    ls /s3data
    umount /s3data
  '
```

## GlusterFS with Podman

Mount a GlusterFS volume inside a container:

```bash
podman run --rm -it \
  --device /dev/fuse \
  --cap-add SYS_ADMIN \
  --network host \
  fedora:latest \
  bash -c '
    dnf install -y glusterfs-fuse
    mkdir /gluster
    mount -t glusterfs gluster-server:/volume /gluster
    ls /gluster
  '
```

## Encrypted FUSE Filesystems

Use gocryptfs or encfs for encrypted storage inside containers:

```dockerfile
# Containerfile.encrypted
FROM fedora:latest

RUN dnf install -y gocryptfs && dnf clean all

RUN mkdir -p /encrypted /decrypted
ENTRYPOINT ["/bin/bash"]
```

```bash
podman build -t encrypted-container -f Containerfile.encrypted .

# Initialize encrypted filesystem on host
mkdir -p /tmp/encrypted-data
echo "mypassword" | gocryptfs -init -passfile /dev/stdin /tmp/encrypted-data

# Run container with encrypted mount
podman run --rm -it \
  --device /dev/fuse \
  --cap-add SYS_ADMIN \
  -v /tmp/encrypted-data:/encrypted:Z \
  encrypted-container \
  -c '
    echo "mypassword" | gocryptfs -passfile /dev/stdin /encrypted /decrypted
    echo "Secret data" > /decrypted/secret.txt
    cat /decrypted/secret.txt
    umount /decrypted
  '
```

## Troubleshooting FUSE with Podman

### /dev/fuse Not Available

If the FUSE device is not present:

```bash
# Check if FUSE is loaded
lsmod | grep fuse

# Load the FUSE module
sudo modprobe fuse

# Verify /dev/fuse exists
ls -la /dev/fuse
```

### Permission Denied on FUSE Mount

For rootless containers, ensure the container can access `/dev/fuse`:

```bash
podman run --rm -it \
  --device /dev/fuse \
  --cap-add SYS_ADMIN \
  alpine sh -c 'ls -la /dev/fuse'
```

If `/dev/fuse` access comes from a supplemental host group, add `--group-add keep-groups`. On SELinux systems, Podman may also require `sudo setsebool -P container_use_devices=true` or `--security-opt label=disable`.

### fuse-overlayfs Performance Issues

If container operations are slow, check fuse-overlayfs performance:

```bash
# Benchmark layer operations
time podman pull docker.io/library/python:3.11

# Check for excessive I/O
podman system df

# Check whether native overlay is active
podman info --format '{{index .Store.GraphStatus "Native Overlay Diff"}}'
```

### Storage Driver Fallback

If rootless overlay is not available, Podman falls back to the VFS driver. Check and correct this:

```bash
# Check current driver
podman info --format '{{.Store.GraphDriverName}}'

# If VFS on an older system, install fuse-overlayfs
sudo dnf install fuse-overlayfs

# Reset storage to apply the new driver
podman system reset
```

## Comparing Storage Drivers

Here is a practical comparison script:

```python
#!/usr/bin/env python3
"""Compare Podman storage driver performance."""

import subprocess
import time

def benchmark_operation(description, command):
    """Time a podman operation."""
    start = time.time()
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    elapsed = time.time() - start

    status = "OK" if result.returncode == 0 else "FAIL"
    print(f"  {description}: {elapsed:.2f}s [{status}]")
    return elapsed

def run_benchmarks():
    """Run storage performance benchmarks."""
    print("Storage Driver Benchmarks")
    print("=" * 50)

    # Get current driver
    result = subprocess.run(
        ["podman", "info", "--format", "{{.Store.GraphDriverName}}"],
        capture_output=True, text=True
    )
    driver = result.stdout.strip()
    print(f"Driver: {driver}")
    if driver == "overlay":
        result = subprocess.run(
            ["podman", "info", "--format", "{{index .Store.GraphStatus \"Native Overlay Diff\"}}"],
            capture_output=True, text=True
        )
        print(f"Native Overlay Diff: {result.stdout.strip()}")
    print()

    # Pull benchmark
    subprocess.run(["podman", "rmi", "-f", "alpine:latest"],
                   capture_output=True)
    benchmark_operation("Pull alpine:latest",
                       "podman pull docker.io/library/alpine:latest")

    # Create container benchmark
    benchmark_operation("Create container",
                       "podman create --name bench-test alpine:latest echo test")

    # Start container benchmark
    benchmark_operation("Start container",
                       "podman start bench-test")

    # Remove container
    benchmark_operation("Remove container",
                       "podman rm -f bench-test")

    # Build benchmark
    benchmark_operation("Build simple image",
                       "printf 'FROM alpine\\nRUN echo hello\\n' | podman build -t bench-image -f - .")

    # Cleanup
    subprocess.run(["podman", "rmi", "-f", "bench-image"], capture_output=True)

run_benchmarks()
```

## Best Practices

### Security Recommendations

When using FUSE inside containers, follow these security guidelines:

```bash
# Prefer --device /dev/fuse over --privileged
podman run --device /dev/fuse --cap-add SYS_ADMIN ...

# Use read-only root filesystem where possible
podman run --device /dev/fuse --cap-add SYS_ADMIN \
  --read-only --tmpfs /tmp \
  my-fuse-container

# Drop unnecessary capabilities
podman run --device /dev/fuse \
  --cap-drop ALL \
  --cap-add SYS_ADMIN \
  my-fuse-container
```

### Performance Tips

```bash
# Check whether native overlayfs is active
podman info --format '{{index .Store.GraphStatus "Native Overlay Diff"}}'

# If rootless Podman is using fuse-overlayfs, keep it current
fuse-overlayfs --version  # Check installed version

# Use metacopy option for faster operations (root/native overlay only)
# In storage.conf: mountopt = "nodev,metacopy=on"

# Use tmpfs for ephemeral containers
podman run --tmpfs /var/lib/data:rw,size=2g ...
```

## Conclusion

FUSE filesystems remain useful with Podman. `fuse-overlayfs` can provide rootless overlay storage when native rootless overlayfs is unavailable, and FUSE mounts inside containers enable powerful storage patterns. From remote filesystem access with SSHFS to encrypted storage with gocryptfs, understanding how to configure, optimize, and troubleshoot FUSE with Podman helps you get the best performance and functionality from your container workloads.
