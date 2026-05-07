# How to Fix 'overlay: mount failed' Errors in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, Linux, Troubleshooting, DevOps

Description: Learn how to diagnose and fix the common 'overlay: mount failed' error in Podman, including causes like filesystem incompatibilities, permission issues, and storage driver misconfiguration.

---

> The "overlay: mount failed" error in Podman typically stems from filesystem incompatibilities, incorrect storage driver configuration, or permission issues. This guide walks you through every common cause and its fix.

If you have ever tried to pull an image or start a container with Podman and been greeted by a cryptic "overlay: mount failed" message, you are not alone. This error is one of the most frequently encountered issues when running Podman, especially on systems with non-standard filesystem setups or when running in rootless mode. In this guide, we will break down exactly what causes this error and how to resolve it step by step.

---

## Understanding the Overlay Storage Driver

Podman uses storage drivers to manage the layered filesystem that containers rely on. The overlay driver is the default and most performant option on most Linux systems. It works by stacking filesystem layers on top of each other, allowing containers to share common base layers efficiently.

The overlay driver requires specific kernel support and filesystem capabilities. When these requirements are not met, Podman throws the "overlay: mount failed" error.

You can check which storage driver Podman is currently using with:

```bash
podman info --format '{{.Store.GraphDriverName}}'
```

## Common Causes and Fixes

### 1. Filesystem Does Not Support overlay

The overlay driver requires the underlying filesystem to support the `d_type` (directory entry type) feature. Filesystems like older versions of XFS (formatted without `ftype=1`) or certain network filesystems do not support this.

Check if your filesystem supports `d_type`:

```bash
xfs_info /var/lib/containers | grep ftype
```

If `ftype=0` is returned, your XFS filesystem was formatted without directory type support. You have two options.

Reformat the filesystem with `ftype=1`:

```bash
mkfs.xfs -n ftype=1 /dev/sdX
```

Alternatively, switch Podman to the `vfs` storage driver, which works on any filesystem but is slower:

```bash
# Edit the storage configuration

vi /etc/containers/storage.conf

# Change the driver line to:
# [storage]
# driver = "vfs"
```

For rootless Podman, the configuration file is located at `~/.config/containers/storage.conf`.

### 2. Kernel Module Not Loaded

The overlay filesystem requires the `overlay` kernel module. Verify it is loaded:

```bash
lsmod | grep overlay
```

If there is no output, load the module:

```bash
sudo modprobe overlay
```

To make it persistent across reboots:

```bash
echo "overlay" | sudo tee /etc/modules-load.d/overlay.conf
```

### 3. SELinux Conflicts

On systems with SELinux enabled, the overlay driver can fail if the security context is not set correctly. Check if SELinux is causing the problem:

```bash
sudo ausearch -m avc -ts recent | grep overlay
```

If you see denial messages, you can try temporarily setting SELinux to permissive mode to confirm it is the cause:

```bash
sudo setenforce 0
podman run hello-world
```

If that works, the proper fix is to correct the SELinux labels or policy rather than leaving it in permissive mode. For example, if you moved Podman's storage directory, label the new path like the default container storage path:

```bash
sudo semanage fcontext -a -e /var/lib/containers /NEWSTORAGEPATH
sudo restorecon -Rv /NEWSTORAGEPATH
```

### 4. Corrupted Storage

Sometimes the local storage directory becomes corrupted, especially after an unclean shutdown or disk issue. The fix is to reset the storage:

```bash
# For rootless Podman
podman system reset

# For rootful Podman
sudo podman system reset
```

This command removes all pods, containers, images, networks, volumes, machines, and the configured storage directories, so use it with caution. If you want to preserve your images, you can export them first:

```bash
podman save -o my-image-backup.tar my-image:latest
podman system reset
podman load -i my-image-backup.tar
```

### 5. Rootless Mode and User Namespace Issues

Rootless Podman relies on user namespaces, and the overlay driver in rootless mode requires either the `fuse-overlayfs` utility or kernel 5.13 or later with native rootless overlay support. While kernel 5.11 introduced unprivileged overlay mounting, a bug with SELinux was not fixed until kernel 5.13.

Check your kernel version:

```bash
uname -r
```

If your kernel is older than 5.13, install `fuse-overlayfs`:

```bash
# Fedora / RHEL / CentOS
sudo dnf install fuse-overlayfs

# Ubuntu / Debian
sudo apt install fuse-overlayfs
```

Then configure Podman to use it by editing `~/.config/containers/storage.conf`:

```toml
[storage]
driver = "overlay"

[storage.options.overlay]
mount_program = "/usr/bin/fuse-overlayfs"
```

If Podman has already initialized storage with another driver, reset storage before changing the driver configuration:

```bash
podman system reset
```

### 6. Incorrect mount Options in storage.conf

A misconfigured `storage.conf` file can cause mount failures. Check for typos or invalid options:

```bash
# System-wide config
cat /etc/containers/storage.conf

# User config (rootless)
cat ~/.config/containers/storage.conf
```

A minimal working configuration looks like this:

```toml
[storage]
driver = "overlay"
graphroot = "/var/lib/containers/storage"
runroot = "/run/containers/storage"

[storage.options.overlay]
mountopt = "nodev,metacopy=on"
```

For rootless users, the paths should be within your home directory:

```toml
[storage]
driver = "overlay"
graphroot = "/home/youruser/.local/share/containers/storage"
runroot = "/run/user/1000/containers"
```

### 7. Running Inside a Container or VM

If you are running Podman inside a container (nested containers) or certain virtual machines, the overlay driver may not be available. In these environments, fall back to the `vfs` driver:

```bash
podman --storage-driver vfs run hello-world
```

Or set it permanently in your `storage.conf`:

```toml
[storage]
driver = "vfs"
```

## Diagnostic Steps

When you encounter the overlay mount error, follow this diagnostic sequence:

```bash
# Step 1: Check Podman system info for storage details
podman info

# Step 2: Check kernel support for overlay
cat /proc/filesystems | grep overlay

# Step 3: Check the filesystem type of the storage directory
df -T /var/lib/containers/storage

# Step 4: Check for SELinux denials
sudo ausearch -m avc -ts recent 2>/dev/null | grep -i overlay

# Step 5: Verify fuse-overlayfs is installed (rootless)
which fuse-overlayfs

# Step 6: Check storage configuration
podman info --format '{{.Store.GraphOptions}}'
```

## Conclusion

The "overlay: mount failed" error in Podman almost always comes down to one of a few root causes: an incompatible filesystem, a missing kernel module, SELinux restrictions, corrupted storage, or a missing `fuse-overlayfs` for rootless setups. By systematically working through the checks outlined above, you can identify and resolve the issue quickly. Start with the simplest fixes like loading the kernel module and checking your filesystem, then move on to storage resets if needed. If all else fails, the `vfs` driver provides a universal fallback that works on any system, albeit with reduced performance.
