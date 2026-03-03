# How to Use systemd Targets Instead of Runlevels on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, systemd, Linux Administration, Boot Management

Description: Learn how systemd targets replace traditional SysV runlevels on Ubuntu, how to switch between them, and how to set a default boot target for your system.

---

If you have a background with older Linux systems, you are probably familiar with runlevels - those numbered states (0 through 6) that controlled which services ran at startup. systemd replaced that concept with targets, which are more flexible and easier to understand. This post explains what targets are, how they map to the old runlevels, and how to manage them on Ubuntu.

## What Are systemd Targets

A target in systemd is a grouping mechanism. It represents a named synchronization point during boot. When you reach a particular target, a defined set of units (services, mounts, sockets, and so on) have been activated.

Targets use the `.target` suffix and are defined as unit files just like services. They can depend on each other, allowing systemd to build a dependency tree for the boot process.

The key difference from runlevels is that multiple targets can be active at the same time. This is unlike the old SysV model where only one runlevel was active.

## Mapping Old Runlevels to systemd Targets

Here is how the traditional runlevels correspond to systemd targets:

| SysV Runlevel | systemd Target         | Description                        |
|---------------|------------------------|------------------------------------|
| 0             | poweroff.target        | Halt and power off the system      |
| 1             | rescue.target          | Single-user rescue mode            |
| 2, 3, 4       | multi-user.target      | Multi-user mode without GUI        |
| 5             | graphical.target       | Multi-user mode with GUI           |
| 6             | reboot.target          | Reboot the system                  |

There are also targets like `emergency.target` (even more minimal than rescue) and `sleep.target` (for suspend/hibernate).

## Viewing Available Targets

To see all targets on your system:

```bash
# List all available targets
systemctl list-units --type=target

# List all targets including inactive ones
systemctl list-units --type=target --all
```

To get details on a specific target:

```bash
# Show the status of multi-user.target
systemctl status multi-user.target

# Show what a target requires and wants
systemctl show multi-user.target
```

## Checking the Current and Default Target

```bash
# Show the currently active default target
systemctl get-default

# Show what target is currently reached
# (look for active targets in the list)
systemctl list-units --type=target
```

The output of `systemctl get-default` will typically show something like `graphical.target` on a desktop Ubuntu or `multi-user.target` on a server.

## Switching Targets Temporarily

You can switch to a different target on the running system without rebooting. This is useful for troubleshooting or maintenance tasks.

```bash
# Switch to multi-user mode (no GUI) temporarily
sudo systemctl isolate multi-user.target

# Switch back to graphical mode
sudo systemctl isolate graphical.target

# Switch to rescue mode (requires root, drops to single shell)
sudo systemctl isolate rescue.target
```

The `isolate` command activates the specified target and deactivates all units not required by it. Be careful with this on production systems - isolating to rescue mode will terminate all user sessions and most services.

## Setting the Default Boot Target

To change what target the system boots into by default:

```bash
# Set the default target to multi-user (no GUI)
sudo systemctl set-default multi-user.target

# Set the default target to graphical (with GUI)
sudo systemctl set-default graphical.target

# Confirm the change
systemctl get-default
```

This creates a symlink at `/etc/systemd/system/default.target` pointing to the chosen target:

```bash
# You can verify the symlink directly
ls -la /etc/systemd/system/default.target
```

## Overriding the Target at Boot Time

You can override the default target at boot without changing the configuration. At the GRUB menu, press `e` to edit the boot entry, then find the line starting with `linux` and append your target:

```text
# Add one of these to the kernel command line in GRUB
systemd.unit=multi-user.target
systemd.unit=rescue.target
systemd.unit=emergency.target
```

This is particularly useful when you need to recover from a broken graphical environment or troubleshoot a boot issue without permanently changing the default.

## Understanding Target Dependencies

Targets form a dependency chain. You can inspect these with:

```bash
# Show what graphical.target depends on
systemctl list-dependencies graphical.target

# Show what depends on network.target
systemctl list-dependencies --reverse network.target
```

The graphical target typically pulls in the multi-user target, which in turn requires basic.target and sysinit.target. Understanding this chain helps when you are debugging why certain services do not start.

## Creating a Custom Target

You can create your own targets for grouping services. This is useful when you want to start or stop a group of related services together.

```bash
# Create a custom target unit file
sudo tee /etc/systemd/system/myapp.target << 'EOF'
[Unit]
Description=My Application Stack
Requires=network.target
After=network.target

[Install]
WantedBy=multi-user.target
EOF
```

Then make your services want this target instead of multi-user.target directly:

```bash
# In your service file's [Install] section
# WantedBy=myapp.target

# Enable the target
sudo systemctl enable myapp.target

# Start all services associated with the target
sudo systemctl start myapp.target
```

## Practical Use Cases

### Booting into Text Mode on a Desktop System

If you have a desktop Ubuntu installation but want it to default to text mode (useful for servers repurposed from desktops):

```bash
# Stop booting into graphical interface
sudo systemctl set-default multi-user.target

# Verify
systemctl get-default
```

You can still start a graphical session manually with `startx` or by switching back temporarily.

### Entering Rescue Mode for Repairs

If your system has a broken service that prevents normal boot:

```bash
# From the running system, switch to rescue mode
sudo systemctl isolate rescue.target

# Or at GRUB, add to kernel line:
# systemd.unit=rescue.target
```

Rescue mode mounts filesystems and starts a minimal shell as root. It is one step above emergency mode, which mounts only the root filesystem read-only.

### Emergency Mode for Critical Repairs

```bash
# Emergency mode - even more minimal than rescue
sudo systemctl isolate emergency.target

# Or at boot:
# systemd.unit=emergency.target
```

Emergency mode is useful when the root filesystem itself has problems that prevent rescue mode from loading.

## Summary

systemd targets provide a clean, dependency-aware replacement for the old runlevel system. The key commands to remember are `systemctl get-default`, `systemctl set-default`, and `systemctl isolate`. Targets give you precise control over what state your system boots into and how you can switch between operational modes during runtime. For most Ubuntu server work, you will primarily deal with `multi-user.target` and occasionally `rescue.target` during maintenance.
