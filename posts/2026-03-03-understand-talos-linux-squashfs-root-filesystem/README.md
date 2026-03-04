# How to Understand Talos Linux SquashFS Root Filesystem

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, SquashFS, Filesystems, Immutable Infrastructure, Security

Description: Deep dive into how Talos Linux uses SquashFS for its root filesystem and what this means for security and operations.

---

At the heart of Talos Linux's immutability is SquashFS, a compressed read-only filesystem that serves as the root of every Talos node. This is not a typical choice for a server operating system. Most Linux distributions use ext4 or XFS for their root filesystem - writable formats that allow users and processes to modify files freely. Talos chose SquashFS deliberately, and understanding why reveals a lot about the operating system's design philosophy.

## What Is SquashFS?

SquashFS is a compressed, read-only filesystem for Linux. It was originally developed for embedded systems and live CDs where space efficiency and read-only access were desirable. The filesystem uses various compression algorithms (gzip, lz4, zstd, xz) to reduce the storage footprint of files.

Some key characteristics of SquashFS:

- Files are compressed individually, so random access is efficient
- The entire filesystem is read-only at the format level
- Block deduplication reduces size further
- Metadata is compact and fast to traverse
- Widely supported in the Linux kernel with no additional modules needed

```bash
# On a typical Linux system, you can inspect SquashFS images
# (not directly on Talos, since there is no shell)
unsquashfs -l talos-rootfs.sqsh | head -20

# On a Talos node, you can check the root mount
talosctl -n 10.0.0.11 mounts | head -5
```

## How Talos Uses SquashFS

When a Talos node boots, the kernel loads an initramfs that contains machined (the init system). machined locates the SquashFS image on the boot partition and mounts it as the root filesystem. From this point forward, the root filesystem is immutable.

The SquashFS image contains everything the operating system needs:

- System binaries (machined, containerd, kubelet, etcd)
- Shared libraries
- Kernel modules (compiled into the image)
- CA certificates for TLS validation
- Basic filesystem structure (/proc, /sys, /dev mount points)

What it does not contain is equally important:

- No shell (bash, sh, zsh)
- No package manager (apt, yum, dnf)
- No text editors (vi, nano)
- No debugging tools (strace, gdb, tcpdump as standalone binaries)
- No scripting runtimes (python, perl, ruby)
- No compiler toolchain (gcc, make)

```bash
# You can check the Talos image version which identifies the SquashFS contents
talosctl -n 10.0.0.11 version

# View the OS image information
talosctl -n 10.0.0.11 get extensions
```

## The Size Advantage

A typical Talos SquashFS root image is between 80 and 120 MB, depending on the version and included extensions. Compare this to other operating systems:

- Ubuntu Server: 2-4 GB minimal installation
- CentOS/RHEL: 1-2 GB minimal installation
- Alpine Linux: 200-500 MB
- Talos Linux: 80-120 MB

This small size has practical benefits. Nodes boot faster because there is less data to read from disk. Upgrades are faster because the entire OS image can be downloaded in seconds. Storage requirements are minimal, leaving more disk space for actual workloads.

The compression ratio with zstd (the default in recent Talos versions) is typically 2:1 to 3:1, meaning the uncompressed content would be 200-350 MB. SquashFS with zstd provides a good balance between compression ratio and decompression speed.

## Read-Only at the Format Level

The most important aspect of SquashFS for Talos is that it is read-only by design. This is not a mounted-as-read-only ext4 filesystem that could theoretically be remounted as read-write. SquashFS physically cannot be written to. The format does not support write operations.

On a traditional Linux system, an attacker with root access can remount the root filesystem:

```bash
# On a traditional Linux system (THIS WORKS)
mount -o remount,rw /

# On Talos Linux, even if you could get a shell (which you cannot),
# remounting SquashFS as read-write is impossible.
# The filesystem format simply does not support it.
```

This is a much stronger guarantee than file permissions, SELinux policies, or even AppArmor. Those are all software-level protections that can be bypassed by a sufficiently privileged process. SquashFS being read-only is a property of the data format itself.

## Overlay Mounts for Writable Paths

Of course, a completely read-only system would be useless. Kubernetes needs to write container images, pod data, logs, and configuration files somewhere. Talos handles this with carefully scoped overlay mounts and tmpfs filesystems.

The /var directory is mounted from the EPHEMERAL partition on disk. This is a regular ext4 filesystem that supports writes. Containerd stores its data here, kubelet writes pod logs here, and ephemeral pod storage lives here.

The /etc/cni and /etc/kubernetes directories use tmpfs (in-memory filesystem) mounts. These are populated by machined during boot with configuration generated from the machine config. They disappear on reboot.

```bash
# View all mount points on a Talos node
talosctl -n 10.0.0.11 mounts

# Typical output:
# /          squashfs  ro
# /var       ext4      rw
# /etc/cni   tmpfs     rw
# /etc/kubernetes tmpfs rw
# /system/state ext4   rw (encrypted)
```

The key principle is that the SquashFS root provides the base layer of the system, and only specific, well-defined directories are writable. A process cannot create new files in /usr/bin or modify files in /etc unless there is an explicit overlay mount allowing it.

## Building Custom SquashFS Images

Sometimes you need to add something to the root filesystem, like a specific kernel module, a hardware firmware blob, or a custom extension. Talos provides the Image Factory for building custom images.

```bash
# Using the Talos Image Factory to create a custom image
# Visit https://factory.talos.dev to generate a schematic

# Generate a config that uses the custom image
talosctl gen config my-cluster https://10.0.0.10:6443 \
  --install-image=factory.talos.dev/installer/<schematic-id>:v1.6.0
```

You can also use system extensions, which are additional SquashFS layers that get mounted alongside the base image. This is a cleaner approach for adding components because you do not need to rebuild the entire base image.

```yaml
# Machine config with system extensions
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/iscsi-tools:v0.1.4
      - image: ghcr.io/siderolabs/intel-ucode:20231114
      - image: ghcr.io/siderolabs/i915-ucode:20231114
```

Each extension is its own SquashFS image that gets overlaid on the root filesystem. The extensions can add files to the system without modifying the base image, maintaining the integrity and verifiability of the core OS.

## Integrity Verification

Because the root filesystem is a single SquashFS image file, verifying its integrity is straightforward. The image has a known checksum that can be validated at boot time.

Talos supports Secure Boot, which creates a chain of trust from the UEFI firmware through the bootloader to the kernel and initramfs. The initramfs contains machined, which then verifies the SquashFS image before mounting it.

If someone tampers with the SquashFS image, the verification will fail and the system will refuse to boot. This protects against supply chain attacks where a modified OS image is deployed to your nodes.

```bash
# Check the installed image and its version
talosctl -n 10.0.0.11 version

# Verify system extensions
talosctl -n 10.0.0.11 get extensions
```

## Performance Characteristics

You might wonder whether using a compressed read-only filesystem has a performance impact. In practice, SquashFS performs well for the read patterns typical of a Kubernetes node.

Compression actually improves read performance for many workloads because less data needs to be read from disk. The CPU cost of decompression is usually less than the I/O savings from reading less data, especially with fast algorithms like zstd or lz4.

Since the root filesystem content does not change, it benefits heavily from the kernel's page cache. Frequently accessed files (like shared libraries loaded by containerd and kubelet) are cached in memory after the first read. Subsequent accesses are served from RAM at memory speed.

Block-level deduplication in SquashFS also means that identical file contents are stored only once, further reducing I/O.

## Comparison with Other Approaches

Other container-optimized operating systems take different approaches to filesystem immutability.

Flatcar Container Linux uses a dual-partition A/B update scheme with a regular filesystem that is mounted read-only. The filesystem format (ext4) supports writes, but it is mounted with the read-only flag. This provides a weaker guarantee than SquashFS.

Bottlerocket uses dm-verity for integrity verification on top of an ext4 filesystem. This provides integrity checking but the filesystem format still supports writes.

Talos's use of SquashFS provides the strongest immutability guarantee because the format itself is incapable of storing writes, regardless of how it is mounted or what permissions are in play.

## Conclusion

SquashFS is the foundation that makes Talos Linux truly immutable. Unlike other approaches that rely on mount flags or access controls to prevent writes, SquashFS provides read-only guarantees at the filesystem format level. This makes the system verifiable, tamper-evident, and resistant to configuration drift. Combined with the small image size, fast boot times, and efficient read performance, SquashFS is an ideal choice for an operating system that exists solely to run Kubernetes. Understanding how Talos uses SquashFS helps you appreciate why the system behaves the way it does and how to work within its constraints effectively.
