# How to Set Up Red Hat Insights for Proactive Performance Monitoring on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Red Hat Insights, Performance, Monitoring

Description: Set up Red Hat Insights on RHEL 9 for proactive performance monitoring and recommendations.

---

## Overview

Set up Red Hat Insights on RHEL 9 for proactive performance monitoring and recommendations. Effective monitoring is critical for maintaining system health, detecting issues early, and planning capacity.

## Prerequisites

- A RHEL 9 system with a valid subscription or configured repositories
- Root or sudo access
- Network access to Red Hat services
- A Red Hat activation key and organization ID

## Step 1 - Install Required Packages

Install the monitoring tools relevant to this guide:

```bash
sudo dnf install -y insights-client rhc pcp pcp-system-tools sysstat
```

Select only the packages you need for your specific setup.

## Step 2 - Enable and Start Services

```bash
sudo rhc connect --activation-key=<activation_key_name> --organization=<organization_ID>
sudo dnf install -y rhc-worker-playbook

sudo systemctl enable --now pmcd pmlogger
```

## Step 3 - Configure the Monitoring Tool

Edit the relevant configuration file for your monitoring setup. Common locations include:

- `/etc/insights-client/insights-client.conf` for Insights client configuration
- `/etc/pcp/` for PCP configuration
- `/var/lib/pcp/config/pmlogger/config.default` for default PCP archive logging

Apply your changes and restart the service:

```bash
sudo systemctl restart <service-name>
```

## Step 4 - Open Firewall Ports

```bash
# Only needed if remote PCP collectors will connect to this host
sudo firewall-cmd --permanent --add-port=44321/tcp   # PCP pmcd
sudo firewall-cmd --reload
```

## Step 5 - Verify Data Collection

Confirm that metrics are being collected:

```bash
# Red Hat Insights / Lightspeed connection
rhc status
sudo insights-client
# PCP
pmstat -s 3
# sysstat
sar -u 1 3
```

## Step 6 - Set Up Alerting (Optional)

Configure alerts based on thresholds so you are notified before issues become critical. Use PCP/Grafana alerting, Nagios notifications, or Red Hat Insights recommendations depending on your stack.

## Summary

You now know how to set up Red Hat Insights for proactive recommendations and use RHEL performance tools for local monitoring. Regular monitoring helps you detect performance degradation, plan capacity, and respond to incidents quickly on your RHEL 9 systems.
