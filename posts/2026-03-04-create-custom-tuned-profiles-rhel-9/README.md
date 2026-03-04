# How to Create Custom TuneD Profiles on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, TuneD, Performance, Custom Profiles, Linux, System Tuning

Description: Learn how to create custom TuneD profiles on RHEL to fine-tune system performance for your specific requirements.

---

While RHEL ships with several built-in TuneD profiles, you may need a custom profile tailored to your application. Custom profiles can inherit from existing profiles and override specific settings.

## Prerequisites

- A RHEL system with TuneD installed and running
- Root or sudo access

## Understanding TuneD Profile Structure

TuneD profiles are stored in two locations:

- `/usr/lib/tuned/` - System profiles (do not modify)
- `/etc/tuned/` - Custom profiles

Each profile is a directory containing a `tuned.conf` file:

```bash
ls /usr/lib/tuned/throughput-performance/
```

## Creating a Custom Profile Directory

Create a new profile directory:

```bash
sudo mkdir -p /etc/tuned/my-webserver
```

## Writing the Profile Configuration

Create the profile configuration file:

```bash
sudo tee /etc/tuned/my-webserver/tuned.conf << 'CONF'
[main]
summary=Custom profile for web server workloads
include=throughput-performance

[sysctl]
# Increase TCP buffer sizes for high-traffic web servers
net.core.rmem_max=16777216
net.core.wmem_max=16777216
net.ipv4.tcp_rmem=4096 87380 16777216
net.ipv4.tcp_wmem=4096 65536 16777216

# Increase connection backlog
net.core.somaxconn=65535
net.core.netdev_max_backlog=5000

# Enable TCP fast open
net.ipv4.tcp_fastopen=3

# Reduce swappiness for web servers
vm.swappiness=10

[cpu]
governor=performance
energy_perf_bias=performance

[disk]
readahead=4096

[vm]
transparent_hugepages=never
CONF
```

## Profile Sections Explained

### [main]

- `summary` - Description of the profile
- `include` - Parent profile to inherit from

### [sysctl]

Kernel parameters set through sysctl. These apply on profile activation.

### [cpu]

CPU governor and energy settings.

### [disk]

Disk scheduler and readahead settings. You can target specific devices:

```ini
[disk]
devices=sda,sdb
readahead=4096
```

### [vm]

Virtual memory settings like transparent huge pages.

## Activating the Custom Profile

Apply your custom profile:

```bash
sudo tuned-adm profile my-webserver
```

Verify it is active:

```bash
tuned-adm active
```

Verify settings are applied:

```bash
sudo tuned-adm verify
```

## Creating a Profile with Scripts

You can run custom scripts when a profile is activated or deactivated:

```bash
sudo mkdir -p /etc/tuned/my-database
```

Create a script:

```bash
sudo tee /etc/tuned/my-database/script.sh << 'SH'
#!/bin/bash
. /usr/lib/tuned/functions

start() {
    echo 1024 > /sys/block/sda/queue/nr_requests
    return 0
}

stop() {
    echo 128 > /sys/block/sda/queue/nr_requests
    return 0
}

process $@
SH
sudo chmod +x /etc/tuned/my-database/script.sh
```

Reference it in the profile:

```bash
sudo tee /etc/tuned/my-database/tuned.conf << 'CONF'
[main]
summary=Custom profile for database workloads
include=throughput-performance

[script]
script=${i:PROFILE_DIR}/script.sh

[sysctl]
vm.swappiness=1
vm.dirty_ratio=15
vm.dirty_background_ratio=5

[disk]
elevator=none
readahead=8192
CONF
```

## Validating the Profile

Check for syntax errors by activating the profile and checking logs:

```bash
sudo tuned-adm profile my-database
sudo journalctl -u tuned --no-pager -n 20
```

Run verification:

```bash
sudo tuned-adm verify
```

## Sharing Custom Profiles

Package your custom profile as an RPM or copy the directory to other systems:

```bash
scp -r /etc/tuned/my-webserver user@otherhost:/etc/tuned/
```

## Conclusion

Custom TuneD profiles on RHEL let you optimize system performance for your exact workload. Start by inheriting from a built-in profile and override only the settings you need to change. Use the verify command to confirm your settings are properly applied.
