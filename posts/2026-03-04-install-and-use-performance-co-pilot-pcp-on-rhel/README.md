# How to Install and Use Performance Co-Pilot (PCP) on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PCP, Performance Monitoring, Metrics, System Administration

Description: Install and configure Performance Co-Pilot (PCP) on RHEL to collect, archive, and analyze detailed system performance metrics for CPU, memory, disk, and network.

---

Performance Co-Pilot (PCP) is an open-source performance monitoring framework that ships with RHEL. It collects hundreds of system metrics, stores them in archives for historical analysis, and provides both command-line and graphical tools for investigation.

## Install PCP

```bash
# Install the core PCP packages
sudo dnf install -y pcp pcp-system-tools pcp-gui

# Start and enable the PCP collector daemon
sudo systemctl enable --now pmcd

# Start and enable the archive logger
sudo systemctl enable --now pmlogger
```

## Verify PCP Is Running

```bash
# Check that pmcd is running
systemctl status pmcd

# List available performance metrics (there are thousands)
pminfo | head -30

# Count total available metrics
pminfo | wc -l
```

## Query Live Metrics

```bash
# Get current CPU utilization
pmval -s 5 -t 1sec kernel.percpu.cpu.user
# -s 5 : take 5 samples
# -t 1sec : one sample per second

# Get memory usage
pmval -s 1 mem.util.used
pmval -s 1 mem.util.free

# Get disk read/write rates
pmval -s 5 -t 1sec disk.all.read_bytes
pmval -s 5 -t 1sec disk.all.write_bytes

# Get network throughput
pmval -s 5 -t 1sec network.interface.in.bytes
```

## Use pmstat for a Quick Overview

```bash
# Similar to vmstat but uses PCP metrics
pmstat -s 10 -t 2sec
# Shows load average, memory, swap, and CPU percentages
```

## Use pmrep for Formatted Reports

```bash
# Install the pmrep tool if not already available
sudo dnf install -y pcp-system-tools

# Show a formatted CPU report
pmrep -s 5 -t 1sec kernel.all.cpu.user kernel.all.cpu.sys kernel.all.cpu.idle

# Show disk I/O report
pmrep -s 5 -t 2sec disk.all.read disk.all.write
```

## Work with PCP Archives

PCP archives are stored in `/var/log/pcp/pmlogger/` by default.

```bash
# List available archives
ls /var/log/pcp/pmlogger/$(hostname)/

# Replay archived data using pmrep
pmrep -a /var/log/pcp/pmlogger/$(hostname)/20250115 \
    -S "@08:00" -T "@09:00" \
    kernel.all.cpu.user kernel.all.cpu.sys

# Use pmdumplog to inspect archive contents
pmdumplog -l /var/log/pcp/pmlogger/$(hostname)/20250115
```

## Configure Archive Retention

```bash
# Edit pmlogger retention (default keeps 14 days)
sudo vi /etc/pcp/pmlogger/control.d/local

# Adjust the retention in the pmlogger_daily config
# The -k flag sets retention in days
# Example: keep 30 days
# sudo vi /etc/sysconfig/pmlogger
# PMLOGGER_DAILY_PARAMS="-k 30"
```

## Use pcp-atop for Interactive Monitoring

```bash
# Install pcp-atop for an atop-like interface backed by PCP
sudo dnf install -y pcp-system-tools

# Run live monitoring
pcp atop

# Replay from a PCP archive
pcp -a /var/log/pcp/pmlogger/$(hostname)/20250115 atop
```

PCP gives you both real-time visibility and historical playback of system performance, which is invaluable for capacity planning and post-incident analysis on RHEL.
