# How to Use top, htop, vmstat, and iostat for System Diagnostics on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Top, Htop, Vmstat, Iostat

Description: Use top, htop, vmstat, and iostat on RHEL 9 for real-time system diagnostics.

---

## Overview

Use top, htop, vmstat, and iostat on RHEL 9 for real-time system diagnostics. Effective monitoring is critical for maintaining system health, detecting issues early, and planning capacity.

## Prerequisites

- A RHEL 9 system with a valid subscription or configured repositories
- Root or sudo access
- Network access for remote monitoring tools (if applicable)

## Step 1 - Install Required Packages

Install the monitoring tools relevant to this guide:

```bash
sudo dnf install -y procps-ng sysstat

# If you have EPEL enabled, install htop with:
sudo dnf install -y htop
```

Select only the packages you need for your specific setup.

## Step 2 - Enable and Start Services

`top`, `htop`, `vmstat`, and `iostat` read live system data and do not require a daemon. Enable `sysstat` only if you also want historical `sar` data collection:

```bash
sudo systemctl enable --now sysstat
```

## Step 3 - Configure the Monitoring Tool

No configuration is required for interactive use. Run the tools directly when you need a live view:

```bash
top
htop
vmstat 1 5
iostat -xz 1 5
```

## Step 4 - Open Firewall Ports

No firewall ports are required for local command-line diagnostics with these tools. Only open firewall ports if you add a separate remote monitoring stack.

```bash
# Example for SNMP-based remote monitoring, if you configure snmpd separately:
sudo firewall-cmd --permanent --add-service=snmp
sudo firewall-cmd --reload
```

## Step 5 - Verify Data Collection

Confirm that the tools run and show current system activity:

```bash
top -b -n 1 | head
htop --version
vmstat 1 3
iostat -xz 1 3
```

## Step 6 - Set Up Alerting (Optional)

Configure alerts based on thresholds so you are notified before issues become critical. Use a separate monitoring stack, such as Prometheus Alertmanager, Nagios notifications, or Red Hat Insights recommendations, depending on your environment.

## Summary

You now know how to use top, htop, vmstat, and iostat for system diagnostics. Regular monitoring helps you detect performance degradation, plan capacity, and respond to incidents quickly on your RHEL 9 systems.
