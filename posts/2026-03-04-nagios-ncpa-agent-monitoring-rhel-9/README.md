# How to Set Up Nagios NCPA Agent Monitoring on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Nagios, NCPA, Monitoring

Description: Install and configure the Nagios NCPA agent on RHEL 9 for cross-platform monitoring.

---

## Overview

Install and configure the Nagios NCPA agent on RHEL 9 for cross-platform monitoring. Effective monitoring is critical for maintaining system health, detecting issues early, and planning capacity.

## Prerequisites

- A RHEL 9 system with a valid subscription or configured repositories
- Root or sudo access
- Network access for remote monitoring tools (if applicable)

## Step 1 - Install Required Packages

Install the Nagios repository package, then install NCPA:

```bash
sudo rpm -Uvh https://repo.nagios.com/nagios/9/nagios-repo-9-2.el9.noarch.rpm
sudo dnf install -y ncpa
```

The Nagios repository provides the NCPA RPM for RHEL 9.

## Step 2 - Enable and Start Services

```bash
sudo systemctl enable --now ncpa
```

## Step 3 - Configure the Monitoring Tool

Edit the NCPA configuration file:

```bash
sudo vi /usr/local/ncpa/etc/ncpa.cfg
```

Set a unique API token in the `[api]` section:

```ini
[api]
community_string = <your-secure-token>
```

Apply your changes and restart the service:

```bash
sudo systemctl restart ncpa
```

## Step 4 - Open Firewall Ports

```bash
# NCPA listener port
sudo firewall-cmd --permanent --add-port=5693/tcp
sudo firewall-cmd --reload
```

## Step 5 - Verify Data Collection

Confirm that metrics are being collected:

```bash
curl -k -s "https://localhost:5693/api/system/agent_version?token=<your-secure-token>"
curl -k -s "https://localhost:5693/api/cpu/percent?token=<your-secure-token>&aggregate=avg"
```

## Step 6 - Set Up Alerting (Optional)

Configure alerts based on thresholds so you are notified before issues become critical. Use Nagios XI's NCPA configuration wizard, Nagios Core active checks with `check_ncpa.py`, or NCPA passive checks through NRDP depending on your stack.

## Summary

You now know how to set up nagios ncpa agent monitoring. Regular monitoring helps you detect performance degradation, plan capacity, and respond to incidents quickly on your RHEL 9 systems.
