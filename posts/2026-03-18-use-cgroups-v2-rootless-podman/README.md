# How to Use cgroups v2 with Rootless Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Rootless, Cgroups, Resource Management, Linux

Description: A practical guide to using cgroups v2 with rootless Podman for container resource management, including CPU and memory limits, monitoring, and migration from cgroups v1.

---

> "cgroups v2 gives rootless containers the resource controls that previously required root."

Control groups version 2 (cgroups v2) is the modern Linux resource management subsystem and a requirement for full rootless Podman functionality. With cgroups v2, unprivileged users can set CPU limits, memory caps, and I/O constraints on their containers. This guide shows how to verify, enable, and use cgroups v2 with rootless Podman.

---

## Checking Your cgroups Version

First, determine which cgroup version your system is running:

```bash
# Check if cgroups v2 is active

stat -fc %T /sys/fs/cgroup/
# Output "cgroup2fs" means v2 is active
# Output "tmpfs" means v1 is active (or hybrid)

# Alternative check using mount
mount | grep cgroup

# Check what Podman detects
podman info --format '{{.Host.CgroupsVersion}}'
# Output: v2 (desired) or v1

# Verify the cgroup controllers delegated to your user service
cat /sys/fs/cgroup/user.slice/user-$(id -u).slice/user@$(id -u).service/cgroup.controllers
```

## Enabling cgroups v2

If your system is still on cgroups v1, older systemd-based distributions can usually switch to v2 by updating the kernel boot parameters:

```bash
# For GRUB-based systems, add the cgroup v2 parameter
sudo grubby --update-kernel=ALL --args="systemd.unified_cgroup_hierarchy=1"

# Or edit GRUB config manually
sudo vi /etc/default/grub
# Add to GRUB_CMDLINE_LINUX: systemd.unified_cgroup_hierarchy=1

# Rebuild GRUB configuration
sudo grub2-mkconfig -o /boot/grub2/grub.cfg  # RHEL/Fedora
# or
sudo update-grub  # Debian/Ubuntu

# Reboot to apply
sudo reboot

# After reboot, verify cgroups v2 is active
stat -fc %T /sys/fs/cgroup/
```

## Enabling CPU and Memory Delegation

For rootless containers to use resource limits, your user session needs cgroup controller delegation:

```bash
# Check which controllers are delegated to your user service
cat /sys/fs/cgroup/user.slice/user-$(id -u).slice/user@$(id -u).service/cgroup.controllers

# If cpu and memory are missing, create a systemd override
sudo mkdir -p /etc/systemd/system/user@.service.d

sudo tee /etc/systemd/system/user@.service.d/delegate.conf << 'EOF'
[Service]
Delegate=cpu cpuset io memory pids
EOF

# Reload systemd, then log out and log back in or reboot
sudo systemctl daemon-reload

# Verify controllers are now delegated
cat /sys/fs/cgroup/user.slice/user-$(id -u).slice/user@$(id -u).service/cgroup.controllers
# Should include: cpu cpuset io memory pids
```

## Setting CPU Limits

With cgroups v2 and delegation enabled, apply CPU limits to rootless containers:

```bash
# Limit a container to 50% of one CPU core
podman run -d --name cpu-limited \
  --cpus=0.5 \
  alpine sh -c "while true; do :; done"

# Limit to 2 full CPU cores
podman run -d --name cpu-two-cores \
  --cpus=2 \
  alpine sh -c "while true; do :; done"

# Set CPU shares for relative priority (default is 1024)
podman run -d --name low-priority \
  --cpu-shares=256 \
  alpine sh -c "while true; do :; done"

# Verify CPU limits are applied
podman stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Clean up
podman stop cpu-limited cpu-two-cores low-priority
podman rm cpu-limited cpu-two-cores low-priority
```

## Setting Memory Limits

Control memory usage to prevent containers from consuming all available RAM:

```bash
# Limit a container to 256MB of memory
podman run -d --name mem-limited \
  --memory=256m \
  alpine sh -c "sleep 3600"

# Set memory with swap limit
podman run -d --name mem-swap-limited \
  --memory=256m \
  --memory-swap=512m \
  alpine sh -c "sleep 3600"

# Set a soft memory limit (reservation)
podman run -d --name mem-reserved \
  --memory=512m \
  --memory-reservation=256m \
  alpine sh -c "sleep 3600"

# View memory stats for running containers
podman stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Clean up
podman stop mem-limited mem-swap-limited mem-reserved
podman rm mem-limited mem-swap-limited mem-reserved
```

## Monitoring cgroup Resource Usage

Inspect the cgroup settings applied to running containers:

```bash
# View real-time resource stats
podman stats

# Get the cgroup path for a specific container
podman inspect --format '{{.State.CgroupPath}}' container-name

# Read raw cgroup values for a container
CGPATH=$(podman inspect --format '{{.State.CgroupPath}}' container-name)
cat "/sys/fs/cgroup/$CGPATH/memory.max"
cat "/sys/fs/cgroup/$CGPATH/cpu.max"

# List all cgroup controllers for a container
cat "/sys/fs/cgroup/$CGPATH/cgroup.controllers"
```

## Summary

cgroups v2 is essential for rootless Podman resource management. Verify your system runs cgroups v2 with `stat -fc %T /sys/fs/cgroup/`, switch older systemd-based systems from v1 by adding the `systemd.unified_cgroup_hierarchy=1` kernel parameter, and enable controller delegation with a systemd override for `user@.service`. Once configured, use standard Podman flags like `--cpus`, `--memory`, and `--device-read-bps` to control container resources. Monitor usage with `podman stats` and inspect raw cgroup values when you need detailed diagnostics.
