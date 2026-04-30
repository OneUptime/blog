# How to Fix Missing CPU/Memory Stats in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, Stats, Docker, Cgroups, Raspberry Pi, LXC

Description: Learn how to fix missing CPU and memory statistics in Portainer, including enabling cgroup memory accounting, fixing LXC container limitations, and kernel parameter issues.

---

The container statistics panel in Portainer shows "N/A" or missing charts when the Docker host cannot collect cgroup metrics. This is common on Raspberry Pi, LXC containers, and some minimal Linux installations.

## Step 1: Check Docker Stats Directly

First verify the issue is at the Docker level, not just in Portainer:

```bash
# Test if Docker can collect stats

docker stats --no-stream

# If all values show 0 or N/A for memory, the issue is in cgroups
# If stats work in CLI but not in Portainer, the issue is in Portainer or its agent configuration
```

## Step 2: Enable cgroup Memory Accounting (Raspberry Pi / ARM)

Some Raspberry Pi OS / ARM setups have memory cgroup or swap accounting disabled. Edit the kernel cmdline:

```bash
# Edit the boot command line (older Raspberry Pi OS releases use /boot/cmdline.txt)
sudo nano /boot/firmware/cmdline.txt

# Add these parameters to the existing single line (do NOT add a new line):
cgroup_enable=memory swapaccount=1

# Reboot
sudo reboot
```

After reboot, verify:

```bash
# On cgroup v1 hosts
cat /proc/cgroups | grep memory
# Should show: memory  0  XX  1  (the last 1 means enabled)

# On cgroup v2 hosts
cat /sys/fs/cgroup/cgroup.controllers | tr ' ' '\n' | grep memory
# Should output: memory
```

## Step 3: Fix Missing Stats in LXC Containers

If Docker runs inside an LXC container (Proxmox), enable the Proxmox features Docker typically needs:

In the Proxmox LXC configuration file (e.g., `/etc/pve/lxc/100.conf`):

```bash
# Add this line to allow nesting and keyctl for Docker in LXC
features: nesting=1,keyctl=1
```

Restart the LXC container after editing.

## Step 4: Verify Docker Daemon cgroup Driver

```bash
# Check the Docker cgroup driver and cgroup version
docker info | grep -E "Cgroup Driver|Cgroup Version"
# On cgroup v2 hosts, Docker normally uses the systemd driver

# If you need to set it explicitly on a systemd-based host, configure it in /etc/docker/daemon.json
sudo nano /etc/docker/daemon.json
```

```json
{
  "exec-opts": ["native.cgroupdriver=systemd"]
}
```

```bash
sudo systemctl restart docker
```

## Step 5: Check Agent Permissions

If using the Portainer Agent, make sure you are using the documented host mount:

```bash
# For Portainer Agent host management features, mount the host filesystem at /host
docker run ... \
  -v /:/host \
  portainer/agent:latest
```
