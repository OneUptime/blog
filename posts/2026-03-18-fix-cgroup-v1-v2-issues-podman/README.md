# How to Fix cgroup v1 vs v2 Issues with Podman

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, Container, Cgroups, Linux, Troubleshooting

Description: A detailed guide to diagnosing and fixing cgroup v1 vs v2 compatibility issues in Podman, including migration strategies, hybrid configurations, and container runtime adjustments.

---

> Control groups (cgroups) manage resource allocation for containers. The transition from cgroup v1 to v2 has introduced compatibility issues that affect Podman container startup, resource limits, and rootless operation. This guide explains how to identify and fix these issues.

Linux control groups (cgroups) are the kernel mechanism that containers use to limit CPU, memory, I/O, and other resources. The Linux kernel supports two versions: cgroup v1 and cgroup v2. Most modern distributions have switched to cgroup v2 as the default, but some older container runtimes, applications, and tools that inspect `/sys/fs/cgroup` directly still expect cgroup v1. This mismatch causes containers to fail to start, resource limits to be ignored, or cryptic errors about missing cgroup controllers.

---

## Determining Your cgroup Version

The first step in troubleshooting is identifying which cgroup version your system uses:

```bash
# Check the mounted cgroup filesystem

mount | grep cgroup
```

If you see a single `cgroup2` mount at `/sys/fs/cgroup`, your system uses the unified cgroup v2 hierarchy:

```text
cgroup2 on /sys/fs/cgroup type cgroup2 (rw,nosuid,nodev,noexec,relatime)
```

If you see multiple `cgroup` mounts (one per controller), you are on a cgroup v1 or hybrid hierarchy:

```text
cgroup on /sys/fs/cgroup/cpu type cgroup (rw,nosuid,nodev,noexec,relatime,cpu)
cgroup on /sys/fs/cgroup/memory type cgroup (rw,nosuid,nodev,noexec,relatime,memory)
```

A more direct check:

```bash
stat -fc %T /sys/fs/cgroup/
```

Output `cgroup2fs` means unified v2. Output `tmpfs` means a legacy or hybrid hierarchy; in hybrid mode, a cgroup v2 mount may also exist below `/sys/fs/cgroup/unified`.

You can also check through Podman:

```bash
podman info --format '{{.Host.CgroupVersion}}'
```

## Common cgroup v2 Errors

### Error: OCI runtime error with cgroup

```text
Error: OCI runtime error: crun: the requested cgroup controller `cpu` is not available
```

This happens when a cgroup v2 controller is not enabled for your user's cgroup slice. In cgroup v2, controllers must be explicitly delegated to non-root users.

Check which controllers are available:

```bash
cat /sys/fs/cgroup/user.slice/user-$(id -u).slice/user@$(id -u).service/cgroup.controllers
```

If controllers like `cpu`, `memory`, or `io` are missing, they need to be delegated.

### Enabling Controller Delegation for Rootless Podman

Create or edit the systemd configuration for user delegates:

```bash
sudo mkdir -p /etc/systemd/system/user@.service.d/
cat << 'EOF' | sudo tee /etc/systemd/system/user@.service.d/delegate.conf > /dev/null
[Service]
Delegate=cpu cpuset io memory pids
EOF
```

Reload systemd and restart your user session:

```bash
sudo systemctl daemon-reload
```

You need to fully log out and log back in for this to take effect. Alternatively, restart the user session:

```bash
sudo systemctl restart user@$(id -u).service
```

Verify the controllers are now available:

```bash
cat /sys/fs/cgroup/user.slice/user-$(id -u).slice/user@$(id -u).service/cgroup.controllers
```

### Error: Failed to Create Container with Resource Limits

```text
Error: setting cgroup config for procHooks process: failed to write "max 104857600"
to "/sys/fs/cgroup/.../memory.max": permission denied
```

This occurs when rootless Podman tries to set resource limits but the cgroup controllers are not delegated. Apply the controller delegation fix above.

## Switching Between cgroup v1 and v2

### Switch to cgroup v1 (On a cgroup v2 System)

If you have applications that require cgroup v1, you can switch the system to use v1 by adding a kernel parameter:

```bash
sudo grubby --update-kernel=ALL --args="systemd.unified_cgroup_hierarchy=0 systemd.legacy_systemd_cgroup_controller=1"
```

On systems using GRUB directly:

```bash
sudo vim /etc/default/grub
# Add to GRUB_CMDLINE_LINUX:
# systemd.unified_cgroup_hierarchy=0 systemd.legacy_systemd_cgroup_controller=1
sudo grub2-mkconfig -o /boot/grub2/grub.cfg
```

Reboot for the change to take effect:

```bash
sudo reboot
```

### Switch to cgroup v2 (On a cgroup v1 System)

```bash
sudo grubby --update-kernel=ALL --args="systemd.unified_cgroup_hierarchy=1"
sudo reboot
```

### Use Hybrid Mode

Hybrid mode mounts both cgroup v1 and v2 simultaneously. This provides compatibility with older tools while allowing newer ones to use v2. On systemd releases that still support these kernel parameters, disable the unified hierarchy but keep systemd off the legacy cgroup controller:

```bash
sudo grubby --update-kernel=ALL --args="systemd.unified_cgroup_hierarchy=0 systemd.legacy_systemd_cgroup_controller=0"
sudo reboot
```

## Podman cgroup Manager Configuration

Podman can use either `systemd` or `cgroupfs` as its cgroup manager. On cgroup v2 systems, `systemd` is the recommended and default manager.

Check your current cgroup manager:

```bash
podman info --format '{{.Host.CgroupManager}}'
```

If you need to change it, edit the containers configuration.

For rootless, edit `~/.config/containers/containers.conf`:

```ini
[engine]
cgroup_manager = "systemd"
```

For rootful, edit `/etc/containers/containers.conf`:

```ini
[engine]
cgroup_manager = "systemd"
```

Using `cgroupfs` on a cgroup v2 system can cause issues. If you must use `cgroupfs`, ensure you are on cgroup v1:

```ini
[engine]
cgroup_manager = "cgroupfs"
```

## Container Runtime Compatibility

The container runtime matters for cgroup compatibility. Podman supports `crun` and `runc`.

**crun** has native cgroup v2 support and is the default on newer Podman installations. **runc** added cgroup v2 support later and older versions may not support it properly.

Check which runtime Podman is using:

```bash
podman info --format '{{.Host.OCIRuntime.Name}}'
```

If you are using `runc` and having cgroup v2 issues, switch to `crun`:

```bash
# Install crun
sudo dnf install crun
# or
sudo apt install crun
```

Configure Podman to use crun in `containers.conf`:

```ini
[engine]
runtime = "crun"
```

## Fixing Resource Limit Issues

On cgroup v2, resource limits work differently than on v1. Some limits have changed names or behavior.

### Memory Limits

Set memory limits for a container:

```bash
podman run --memory 512m myimage
```

If this fails on cgroup v2, ensure the memory controller is delegated (see the delegation section above).

### CPU Limits

```bash
podman run --cpus 2 --cpu-shares 1024 myimage
```

On cgroup v2, `--cpu-shares` maps to `cpu.weight` (range 1-10000, default 100) instead of v1's `cpu.shares` (range 2-262144, default 1024). Podman handles this translation, but third-party tools may not.

### I/O Limits

```bash
podman run --device-read-bps /dev/sda:10mb myimage
```

On cgroup v2, I/O controls use `io.max` instead of v1's `blkio.throttle.read_bps_device`. Again, Podman translates these, but verify they are working:

```bash
podman exec mycontainer cat /sys/fs/cgroup/io.max
```

## Debugging cgroup Issues

### Inspect a Container's cgroup

```bash
# Get the cgroup path
podman inspect mycontainer --format '{{.State.CgroupPath}}'

# List the cgroup contents
ls /sys/fs/cgroup/$(podman inspect mycontainer --format '{{.State.CgroupPath}}')/
```

### Check Available Controllers in a Container

```bash
podman exec mycontainer cat /sys/fs/cgroup/cgroup.controllers
```

### View Resource Usage

```bash
podman stats mycontainer --no-stream
```

### Enable Debug Logging

```bash
podman --log-level=debug run --memory 512m myimage 2>&1 | grep -i cgroup
```

## Distribution-Specific Notes

### Fedora / RHEL 9+

Fedora and RHEL 9 use cgroup v2 by default. RHEL 9 uses `crun` as the default runtime; Fedora commonly uses `crun`, but you should verify with `podman info`. They should work out of the box with rootless Podman. If controllers are not delegated, apply the systemd delegate fix.

### Ubuntu 22.04+

Uses cgroup v2 by default. Install `crun` for best compatibility:

```bash
sudo apt install crun podman
```

### CentOS/RHEL 7-8

RHEL 8 uses cgroup v1 by default and RHEL 8's default runtime is `runc`; CentOS 7 also uses cgroup v1 by default. Rootless Podman has limited cgroup support on cgroup v1, so use cgroup v2 if you need rootless resource limits. To switch to v2, update the kernel parameters as described above.

## Conclusion

cgroup v1 vs v2 issues with Podman come down to three main areas: controller delegation for rootless mode, runtime compatibility (prefer `crun` for cgroup v2), and cgroup manager configuration (prefer `systemd` on cgroup v2). If you are on a modern distribution with cgroup v2, ensure controllers are delegated to your user and that you are running `crun`. If you must stay on cgroup v1 for compatibility, set the kernel parameter to disable the unified hierarchy. Hybrid mode offers a middle ground but adds complexity. Check `podman info` to verify your configuration and use debug logging when resource limits are not behaving as expected.
