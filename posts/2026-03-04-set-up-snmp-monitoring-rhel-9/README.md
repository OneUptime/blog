# How to Set Up SNMP Monitoring on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SNMP, Monitoring, Linux

Description: Set up SNMP monitoring on RHEL for integration with network management systems.

---

## Overview

Set up SNMP monitoring on RHEL for integration with network management systems. Effective monitoring is critical for maintaining system health, detecting issues early, and planning capacity.

## Prerequisites

- A RHEL system with a valid subscription or configured repositories
- Root or sudo access
- Network access for remote monitoring tools (if applicable)

## Step 1 - Install Required Packages

Install the monitoring tools relevant to this guide:

```bash
sudo dnf install -y net-snmp net-snmp-utils
```

Select only the packages you need for your specific setup.

## Step 2 - Enable and Start Services

```bash
sudo systemctl enable --now snmpd
```

## Step 3 - Configure the Monitoring Tool

Edit the SNMP agent configuration file:

- `/etc/snmp/snmpd.conf` for SNMP

For a basic SNMPv2c read-only setup, restrict the community string to localhost and your monitoring server:

```bash
sudo cp /etc/snmp/snmpd.conf /etc/snmp/snmpd.conf.bak
sudo tee -a /etc/snmp/snmpd.conf >/dev/null <<'EOF'
rocommunity <community-name> 127.0.0.1
rocommunity <community-name> <monitoring-server-ip>
syslocation <system-location>
syscontact <admin-email>
EOF
```

Replace the placeholder values before restarting the service.

Apply your changes and restart the service:

```bash
sudo systemctl restart snmpd
```

## Step 4 - Open Firewall Ports

```bash
sudo firewall-cmd --permanent --add-service=snmp
sudo firewall-cmd --reload
```

## Step 5 - Verify Data Collection

Confirm that metrics are being collected:

```bash
snmpwalk -v2c -c <community-name> localhost system
```

## Step 6 - Set Up Alerting (Optional)

Configure alerts based on thresholds so you are notified before issues become critical. Use Prometheus Alertmanager, Nagios notifications, or Red Hat Insights recommendations depending on your stack.

## Summary

You now know how to set up SNMP monitoring. Regular monitoring helps you detect performance degradation, plan capacity, and respond to incidents quickly on your RHEL systems.
