# How to Set Resource Limits for systemd-nspawn Containers on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, systemd-nspawn, Resource Limits, cgroups, Containers

Description: Limit CPU, memory, and I/O resources for systemd-nspawn containers on RHEL using systemd resource controls and cgroup settings.

---

When running multiple systemd-nspawn containers on a single RHEL host, you need to limit their resource consumption so one container cannot starve others. systemd integrates with cgroups v2 to provide fine-grained resource controls.

## Set Limits via the nspawn Configuration File

Create or edit `/etc/systemd/nspawn/mycontainer.nspawn`:

```ini
[Exec]
Boot=yes

[Network]
VirtualEthernet=yes
```

Resource limits are set through the systemd service unit, not the nspawn file itself.

## Configure Resource Limits with systemd Overrides

Each nspawn container runs as a systemd service named `systemd-nspawn@<name>.service`. Create an override:

```bash
# Create an override for the container service
sudo systemctl edit systemd-nspawn@mycontainer.service
```

Add the resource directives:

```ini
[Service]
# Limit memory to 2 GB
MemoryMax=2G
# Set a soft memory limit
MemoryHigh=1536M

# Limit to 50% of one CPU core
CPUQuota=50%

# Limit I/O bandwidth on a specific device (e.g., /dev/sda)
IOWriteBandwidthMax=/dev/sda 50M
IOReadBandwidthMax=/dev/sda 100M

# Set I/O weight (1-10000, default 100)
IOWeight=50
```

Apply the changes:

```bash
# Reload systemd to pick up the override
sudo systemctl daemon-reload

# Restart the container
sudo machinectl poweroff mycontainer
sudo machinectl start mycontainer
```

## Verify Resource Limits

Check that the limits are applied:

```bash
# View the effective resource configuration
systemctl show systemd-nspawn@mycontainer.service | grep -E "Memory|CPU|IO"

# Monitor real-time resource usage
systemd-cgtop
```

## Set Limits via Command Line

You can also pass resource limits directly when launching:

```bash
# Start with CPU and memory limits using systemd-run
sudo systemd-run --machine=mycontainer --scope \
    -p MemoryMax=1G -p CPUQuota=25% \
    /bin/bash
```

## Limit the Number of Processes

Prevent fork bombs inside a container:

```bash
# In the systemd override
[Service]
TasksMax=512
```

## Limit Disk Space

Use machinectl to set a disk quota for the container image:

```bash
# Set a 10 GB size limit on the container image
sudo machinectl set-limit mycontainer 10G
```

These controls ensure that no single container monopolizes host resources, keeping your RHEL system stable under multi-container workloads.
