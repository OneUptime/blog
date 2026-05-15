# How to Monitor CPU, Memory, Disk, and Network with sar (sysstat) on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Sysstat, Sar, Performance Monitoring

Description: Use sar from sysstat on RHEL 9 to monitor CPU, memory, disk, and network over time.

---

## Overview

Use sar from sysstat on RHEL 9 to monitor CPU, memory, disk, and network over time. Effective monitoring is critical for maintaining system health, detecting issues early, and planning capacity.

## Prerequisites

- A RHEL 9 system with a valid subscription or configured repositories
- Root or sudo access
- Network access for remote monitoring tools (if applicable)

## Step 1 - Install Required Packages

Install the monitoring tools relevant to this guide:

```bash
sudo dnf install -y sysstat
```

Select only the additional packages you need if you also use another monitoring stack.

## Step 2 - Enable and Start Services

```bash
sudo systemctl enable --now sysstat
```

## Step 3 - Configure the Monitoring Tool

Edit the relevant configuration file for your monitoring setup. Common locations include:

- `/etc/sysstat/sysstat` for sysstat collection settings
- `/etc/sysstat/sysstat.ioconf` for disk device name mapping

For example, adjust `HISTORY` to change how long daily data files are kept, or adjust `SADC_OPTIONS` to collect additional optional activity data. The scheduled sysstat collection scripts read this file on their next run.

```bash
systemctl list-timers 'sysstat*'
```

## Step 4 - Open Firewall Ports

```bash
# No firewall ports are required for local sar collection.
# If you add remote monitoring services, open only the ports for those services.
```

## Step 5 - Verify Data Collection

Confirm that metrics are being collected:

```bash
# CPU
sar -u 1 3
# Memory
sar -r 1 3
# Disk devices
sar -d 1 3
# Network interfaces
sar -n DEV 1 3
```

## Step 6 - Set Up Alerting (Optional)

Configure alerts based on thresholds so you are notified before issues become critical. Use Prometheus Alertmanager, Nagios notifications, or Red Hat Insights recommendations depending on your stack.

## Summary

You now know how to monitor cpu, memory, disk, and network with sar (sysstat). Regular monitoring helps you detect performance degradation, plan capacity, and respond to incidents quickly on your RHEL 9 systems.
