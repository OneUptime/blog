# How to Troubleshoot cgroup Errors in Rootless Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Rootless, Cgroups, Troubleshooting, Linux

Description: A troubleshooting guide for diagnosing and fixing cgroup-related errors in rootless Podman, covering delegation issues, version mismatches, and permission problems.

---

> "Most cgroup errors in rootless Podman have a specific cause and a specific fix."

cgroup errors are among the most common problems when running rootless Podman. They manifest as failed container starts, ignored resource limits, or cryptic permission denied messages. This guide walks through the most frequent cgroup errors, explains why they happen, and provides commands to fix each one.

---

## Identifying the cgroup Version

The first step in any cgroup troubleshooting is knowing which version is active:

```bash
# Check the cgroup filesystem type

stat -fc %T /sys/fs/cgroup/
# "cgroup2fs" = v2 (good for rootless)
# "tmpfs" = v1 or hybrid (may cause issues)

# Check what Podman reports
podman info --format '{{.Host.CgroupsVersion}}'

# Check the kernel command line for cgroup settings
cat /proc/cmdline | tr ' ' '\n' | grep cgroup

# Verify the cgroup mount
mount | grep cgroup
```

## Error: "OCI runtime error: cgroup manager is not set"

This error occurs when Podman cannot determine the cgroup manager. Fix it by explicitly configuring the manager:

```bash
# Check the current cgroup manager
podman info --format '{{.Host.CgroupManager}}'

# Set the cgroup manager to systemd (recommended for rootless)
mkdir -p ~/.config/containers

cat > ~/.config/containers/containers.conf << 'EOF'
[engine]
cgroup_manager = "systemd"
EOF

# Verify the change
podman info --format '{{.Host.CgroupManager}}'

# Test by running a container
podman run --rm alpine echo "cgroup manager is working"
```

## Error: "systemd cgroup flag passed, but systemd not running"

This appears when Podman is configured to use systemd as the cgroup manager, but the user systemd instance is not running:

```bash
# Check if the user systemd instance is active
systemctl --user status

# If it fails, check if XDG_RUNTIME_DIR is set
echo $XDG_RUNTIME_DIR
# Should output: /run/user/<UID>

# If XDG_RUNTIME_DIR is unset (common in cron or non-interactive shells)
export XDG_RUNTIME_DIR=/run/user/$(id -u)

# Verify the runtime directory exists
ls -la $XDG_RUNTIME_DIR

# If the directory does not exist, your user session was not set up
# Ensure pam_systemd is loaded
grep pam_systemd /etc/pam.d/login /etc/pam.d/sshd

# Enable linger so systemd user instance runs at boot
loginctl enable-linger $USER
```

## Error: "failed to create cgroup: Permission denied"

This error means your user does not have permission to create or write to cgroups:

```bash
# Check your user cgroup hierarchy
ls -la /sys/fs/cgroup/user.slice/user-$(id -u).slice/user@$(id -u).service/

# Check which controllers are available
cat /sys/fs/cgroup/user.slice/user-$(id -u).slice/user@$(id -u).service/cgroup.controllers
# If a needed controller is missing, delegation is not configured for that controller

# Fix: Enable controller delegation
sudo mkdir -p /etc/systemd/system/user@.service.d

sudo tee /etc/systemd/system/user@.service.d/delegate.conf << 'EOF'
[Service]
Delegate=cpu cpuset io memory pids
EOF

# Apply the changes
sudo systemctl daemon-reload
# Then log out and log back in, or restart the user manager if safe on your host
sudo systemctl restart user@$(id -u).service

# Verify controllers are now available
cat /sys/fs/cgroup/user.slice/user-$(id -u).slice/user@$(id -u).service/cgroup.controllers
# Should include the delegated controllers supported by your kernel, such as cpu cpuset io memory pids
```

## Error: "failed to write to cgroup.subtree_control"

This error indicates that a controller cannot be enabled in a cgroup subtree:

```bash
# Check the subtree control at each level
cat /sys/fs/cgroup/cgroup.subtree_control
cat /sys/fs/cgroup/user.slice/cgroup.subtree_control
cat /sys/fs/cgroup/user.slice/user-$(id -u).slice/cgroup.subtree_control
cat /sys/fs/cgroup/user.slice/user-$(id -u).slice/user@$(id -u).service/cgroup.subtree_control

# If a needed controller is missing, it was not delegated
# Fix: Ensure the controller is delegated (see delegation fix above)

# Also check for threaded cgroup issues
cat /sys/fs/cgroup/user.slice/user-$(id -u).slice/user@$(id -u).service/cgroup.type
# Should be "domain" not "threaded"
```

## Error: "cgroup v1 is not fully supported in rootless mode"

Some features only work with cgroups v2. If you see this warning, you need to migrate:

```bash
# Check current version
stat -fc %T /sys/fs/cgroup/

# If on v1, switch to v2
# For GRUB-based systems
sudo grubby --update-kernel=ALL --args="systemd.unified_cgroup_hierarchy=1"

# For Debian/Ubuntu using GRUB
sudo sed -i 's/^\(GRUB_CMDLINE_LINUX="[^"]*\)"/\1 systemd.unified_cgroup_hierarchy=1"/' /etc/default/grub
sudo update-grub

# Reboot to apply
sudo reboot

# After reboot, verify v2 is active
stat -fc %T /sys/fs/cgroup/
podman info --format '{{.Host.CgroupsVersion}}'
```

## Summary

cgroup errors in rootless Podman almost always trace back to three root causes: running cgroups v1 instead of v2, missing controller delegation for user sessions, or the user systemd instance not running. Diagnose by checking the cgroup version with `stat -fc %T /sys/fs/cgroup/`, verifying controller availability with `cat /sys/fs/cgroup/user.slice/user-$(id -u).slice/user@$(id -u).service/cgroup.controllers`, and ensuring `XDG_RUNTIME_DIR` is set. Fix delegation by adding a systemd override at `/etc/systemd/system/user@.service.d/delegate.conf` and logging out and back in or restarting the user service. When all else fails, `podman system reset` can clear corrupted Podman storage state, but it will not fix host cgroup configuration and it removes Podman's containers, pods, images, networks, and volumes.
