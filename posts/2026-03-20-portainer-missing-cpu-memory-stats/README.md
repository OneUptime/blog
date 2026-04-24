# How to Fix Missing CPU/Memory Stats in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Troubleshooting, Monitoring, Performance

Description: Resolve missing or zero CPU and memory statistics in Portainer's container dashboard, including cgroup configuration, Docker stats API issues, and kernel compatibility fixes.

## Introduction

Portainer displays CPU and memory usage by polling the Docker stats API. When stats show as zero, "N/A", or don't update, the issue is usually a Docker stats availability problem on the host, a cgroup configuration mismatch, or missing access to the Docker socket or Portainer Agent. This guide walks through the common fixes.

## Step 1: Verify Docker Stats Work from CLI

```bash
# Test if Docker stats work at all

docker stats --no-stream

# If CPU and memory values are missing across running containers,
# the issue is likely at the Docker/kernel level
# If values are present, the issue is likely Portainer-specific
```

## Step 2: Enable cgroup Memory Accounting on cgroup v1 Hosts

On older Linux systems using cgroup v1, memory accounting may be disabled by default:

```bash
# Check whether the host is using cgroup v1 or v2
ls /sys/fs/cgroup/cgroup.controllers 2>/dev/null && echo "cgroup v2" || echo "cgroup v1"

# On cgroup v1 hosts, memory stats live under the memory hierarchy
cat /sys/fs/cgroup/memory/memory.stat 2>/dev/null | head -5

# If that file doesn't exist and the host is cgroup v1, memory cgroups may be disabled
# On cgroup v2 hosts, skip this step and continue to Step 3
# Check kernel boot parameters
grep -i cgroup /proc/cmdline

# For Ubuntu/Debian with GRUB, enable memory cgroup:
sudo sed -i 's/GRUB_CMDLINE_LINUX="/GRUB_CMDLINE_LINUX="cgroup_enable=memory swapaccount=1 /' /etc/default/grub

# Or add directly:
sudo nano /etc/default/grub
# Change:
# GRUB_CMDLINE_LINUX=""
# To:
# GRUB_CMDLINE_LINUX="cgroup_enable=memory swapaccount=1"

# Update GRUB and reboot
sudo update-grub
sudo reboot
```

## Step 3: Check cgroup v1 vs v2

Docker supports cgroup v2, but the checks and fixes differ from cgroup v1:

```bash
# Check cgroup version and Docker cgroup settings
docker info | grep -E 'Cgroup (Driver|Version)'

# For cgroup v2 detection:
ls /sys/fs/cgroup/cgroup.controllers 2>/dev/null && echo "cgroup v2" || echo "cgroup v1"

# On cgroup v2, Docker usually uses the systemd cgroup driver automatically
# If docker info already shows "Cgroup Driver: systemd", don't change daemon.json

# If you do need to set it explicitly, merge this into your existing /etc/docker/daemon.json:
# {
#   "exec-opts": ["native.cgroupdriver=systemd"]
# }

# If you edited /etc/docker/daemon.json, validate it before restarting Docker
sudo dockerd --validate --config-file=/etc/docker/daemon.json
sudo systemctl restart docker
docker restart <portainer-container-name>
```

## Step 4: Fix on Raspberry Pi / ARM Devices

Raspberry Pi OS may use a different active boot cmdline path depending on the release, but the same kernel-argument approach applies:

```bash
# Edit the active boot cmdline file
# Older releases often use /boot/cmdline.txt
# Newer releases often use /boot/firmware/cmdline.txt
sudo nano <active-cmdline-file>

# Add to the end of the single line (don't add a new line):
# cgroup_enable=cpuset cgroup_enable=memory swapaccount=1

# The line should look like:
# console=serial0,115200 console=tty1 root=PARTUUID=... cgroup_enable=cpuset cgroup_enable=memory swapaccount=1

sudo reboot
```

## Step 5: Check Docker Daemon Configuration

```bash
# Show the current daemon config if present
sudo test -f /etc/docker/daemon.json && sudo cat /etc/docker/daemon.json

# Validate the file if you edited it
sudo test -f /etc/docker/daemon.json && sudo dockerd --validate --config-file=/etc/docker/daemon.json

# Restart Docker after any changes
sudo systemctl restart docker
```

## Step 6: Fix on LXC/Proxmox Containers

Proxmox recommends running Docker inside a QEMU VM rather than directly inside an LXC container. If you still run Docker inside LXC, start by enabling the container features Docker commonly needs:

```bash
# On the Proxmox host
pct set <container-id> --features nesting=1,keyctl=1
```

Or use the Proxmox UI:
1. Container → Options → Features
2. Enable **Nesting** and **keyctl**

## Step 7: Verify Portainer Has Access to Stats API

```bash
# Check the server API version first
docker version

# Then query the stats endpoint with the server API version shown above
curl --unix-socket /var/run/docker.sock \
  "http://localhost/v<server-api-version>/containers/<container-id>/stats?stream=false" | jq .

# If the payload contains real cpu_stats and memory_stats values,
# the problem is likely in Portainer or the Portainer Agent path
```

## Step 8: Check Portainer Agent Configuration

When using the Portainer Agent, stats are fetched by the agent:

```bash
# Check agent logs for stats errors
docker logs portainer_agent 2>&1 | grep -iE "stats|cgroup|memory"

# Restart the agent
docker restart portainer_agent
```

## Step 9: Fix for Specific Kernel Versions

Older kernels can also mean incomplete cgroup support, especially for cgroup v2:

```bash
# Check kernel version
uname -r

# Docker requires kernel v4.15+ for cgroup v2, and recommends v5.2+
# Update the kernel and userspace if the host is significantly behind
sudo apt-get update && sudo apt-get dist-upgrade
sudo reboot
```

## Step 10: Verify with cAdvisor

Use cAdvisor to verify metrics are available outside of Portainer:

```bash
# Deploy cAdvisor
VERSION=v0.x.y # use the latest release from https://github.com/google/cadvisor/releases

docker run -d \
  --volume=/:/rootfs:ro \
  --volume=/var/run:/var/run:ro \
  --volume=/sys:/sys:ro \
  --volume=/var/lib/docker/:/var/lib/docker:ro \
  --volume=/dev/disk/:/dev/disk:ro \
  --publish=8080:8080 \
  --name=cadvisor \
  --privileged \
  --device=/dev/kmsg \
  ghcr.io/google/cadvisor:$VERSION

# Access at http://your-host:8080
# If cAdvisor also shows zero stats, it's a kernel/cgroup issue
# If cAdvisor shows stats but Portainer doesn't, update Portainer
```

## Conclusion

Missing CPU/memory stats in Portainer usually mean Docker itself is not exposing usable stats yet, or Portainer cannot read them. Start with `docker stats` and the Docker stats API. On older cgroup v1 systems, adding `cgroup_enable=memory swapaccount=1` to the kernel command line can fix missing memory accounting after a reboot. On newer cgroup v2 systems, verify `docker info` shows the expected cgroup version and driver before changing `daemon.json`. If Docker CLI stats and the stats API both return real values but Portainer still does not, move to a current supported Portainer release.
