# How to Understand Talos Linux Immutable File System

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Immutable Infrastructure, Security, File Systems, Kubernetes

Description: Understand how the immutable filesystem in Talos Linux works and why it makes your Kubernetes nodes more secure and reliable.

---

One of the defining features of Talos Linux is its immutable root filesystem. Unlike traditional Linux distributions where you can modify any file on the system - install packages, edit configuration files, add scripts - Talos locks down the entire root filesystem as read-only. You cannot write to it. Period.

This might sound restrictive, and it is. But that restriction is exactly what makes Talos Linux so well-suited for running Kubernetes in production. This post explains how the immutable filesystem works, what it means for day-to-day operations, and why it matters for security and reliability.

## What Does "Immutable" Mean in Practice?

When we say the Talos Linux filesystem is immutable, we mean that the root filesystem is mounted as a read-only SquashFS image. SquashFS is a compressed, read-only filesystem format commonly used in embedded systems and live CDs. It is small, fast to read, and physically cannot be written to.

On a traditional Linux system, you might see something like this:

```bash
# On traditional Linux - everything is writable
$ mount | grep " / "
/dev/sda1 on / type ext4 (rw,relatime)

# You can modify system files
$ echo "something" >> /etc/hosts
# This works!
```

On Talos Linux, the situation is fundamentally different:

```bash
# On Talos Linux - root is read-only SquashFS
# / is mounted from a SquashFS image (ro)
# Any attempt to write to system paths will fail

# You cannot do this on Talos:
# echo "something" >> /etc/hosts  --> Read-only filesystem error
```

There is no way to modify the contents of the root filesystem at runtime. The only way to change what is on the root filesystem is to build a new Talos image with the changes baked in and update the node to use that new image.

## The Filesystem Layout

Not everything on a Talos node is read-only. The system is carefully partitioned to separate immutable system data from mutable runtime data.

The root filesystem (/) is the immutable SquashFS image containing the kernel, system binaries, and libraries. This is read-only and cannot be changed.

The /var partition is writable and contains runtime data. This is where containerd stores container images and layers, where Kubernetes stores pod data, and where logs are written. However, even /var is carefully controlled. Only specific system processes can write to specific paths.

The /system/state partition stores the machine configuration. This is encrypted and can only be read and written by the Talos system services.

```bash
# View the mount points on a Talos node
talosctl -n 10.0.0.11 mounts

# You will see something like:
# / (squashfs, ro)
# /var (ext4, rw)
# /system/state (ext4, rw, encrypted)
# /etc/cni (tmpfs, rw)
# /etc/kubernetes (tmpfs, rw)
```

## Why SquashFS?

SquashFS was chosen for several reasons.

Compression reduces the image size significantly. A full Talos root filesystem is only around 80-90 MB compressed, compared to several gigabytes for a typical Linux distribution. This makes downloads faster, storage requirements lower, and boot times shorter.

Read-only enforcement is at the filesystem level, not just permission-based. Even if a process runs as root, it cannot write to a SquashFS filesystem. The filesystem format itself does not support writes. This is a stronger guarantee than file permissions or SELinux policies.

Integrity is built in. Since the filesystem is a single compressed image, you can verify its checksum. If the image has been tampered with, the checksum will not match. Talos uses this for Secure Boot verification.

```bash
# Check the Talos OS image information
talosctl -n 10.0.0.11 version

# The output shows the exact image version
# This tells you precisely what is on the root filesystem
```

## How Configuration Works Without Writable Files

On a traditional Linux system, you configure services by editing files in /etc. Nginx has /etc/nginx/nginx.conf. SSH has /etc/ssh/sshd_config. DNS resolution uses /etc/resolv.conf. All of these are writable files that you modify as needed.

Talos takes a completely different approach. All configuration comes from a single YAML document - the machine configuration. This document is provided at boot time and is applied by the machined init system. System services read their configuration from machined, not from files on disk.

For the few cases where Kubernetes components need configuration files (like kubelet or the CNI), Talos uses tmpfs mounts. These are in-memory filesystems that are populated by machined during boot. They appear as regular files to the processes that need them, but they are generated from the machine configuration, not stored on disk.

```yaml
# All configuration lives in the machine config
machine:
  network:
    hostname: my-node
    nameservers:
      - 8.8.8.8
  time:
    servers:
      - time.cloudflare.com
  kubelet:
    extraArgs:
      rotate-server-certificates: "true"
```

```bash
# Apply configuration changes through the API
talosctl -n 10.0.0.11 apply-config --file machine-config.yaml

# View the current configuration
talosctl -n 10.0.0.11 get machineconfig
```

## Security Benefits

The immutable filesystem provides several layers of security protection.

**No persistent malware.** Even if an attacker gains code execution on a Talos node (through a container escape, for example), they cannot install persistent malware. There is nowhere to write a backdoor or rootkit on the root filesystem. When the node reboots, the system is guaranteed to be in a known good state.

**No configuration drift.** On traditional systems, administrators make changes over time - installing packages, tweaking settings, adding cron jobs. Eventually, no two nodes are identical, and nobody knows exactly what is running where. On Talos, every node boots from the same image with the same configuration. There is no drift because there is no way to drift.

**Reduced attack surface.** There are no compilers, no package managers, no scripting languages, and no diagnostic tools on the root filesystem. An attacker who breaks into a container has very little to work with on the host. There is no bash, no curl, no wget, no python.

**Tamper evidence.** Because the root filesystem is a single image with a known checksum, any modification is immediately detectable. Combined with Secure Boot, this creates a chain of trust from the firmware through the OS to the running workloads.

## What About Kernel Modules?

You might wonder how kernel modules work if the filesystem is read-only. Talos includes the most commonly needed kernel modules in the SquashFS image. For modules that are not included by default, you have two options.

You can build a custom Talos image that includes the additional modules. Talos provides tooling for this through the Talos Image Factory.

```bash
# Generate a custom Talos image with additional extensions
# Using the Image Factory
talosctl gen config my-cluster https://10.0.0.10:6443 \
  --install-image=factory.talos.dev/installer/<schematic-id>:v1.6.0
```

Alternatively, you can use Talos system extensions, which are additional SquashFS layers that are mounted alongside the root filesystem. Extensions can add kernel modules, firmware, and other system components without modifying the base image.

```yaml
# Machine config with system extensions
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/iscsi-tools:v0.1.4
      - image: ghcr.io/siderolabs/drbd:9.2.4-v1.6.0
```

## Operational Implications

Working with an immutable filesystem changes how you approach operations.

**Debugging** requires using talosctl instead of SSH. You cannot run tcpdump on the host, but you can capture packets through the Talos API. You cannot tail log files directly, but you can stream them with talosctl logs.

**Customization** happens at image build time, not at runtime. If you need a custom kernel module or system tool, you build it into the image rather than installing it later.

**Updates** are atomic. You replace the entire OS image rather than updating individual packages. This eliminates partial update failures and ensures consistency.

```bash
# Debugging tools available through talosctl
talosctl -n 10.0.0.11 dmesg          # Kernel messages
talosctl -n 10.0.0.11 logs kubelet    # Service logs
talosctl -n 10.0.0.11 netstat         # Network connections
talosctl -n 10.0.0.11 processes       # Running processes
talosctl -n 10.0.0.11 memory          # Memory usage
```

## Conclusion

The immutable filesystem in Talos Linux is not just a feature; it is the foundation of the entire operating system's security and reliability model. By making the root filesystem physically read-only through SquashFS, Talos ensures that system files cannot be modified, malware cannot persist, and configuration drift cannot occur. This approach requires a shift in how you think about system administration, but the benefits in security, consistency, and operational simplicity make it well worth the adjustment. Once you internalize that every node is built from a known image and configured through a single API, operations become much more predictable and much less error-prone.
