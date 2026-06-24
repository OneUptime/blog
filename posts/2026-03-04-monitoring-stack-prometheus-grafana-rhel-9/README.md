# How to Set Up a Complete Monitoring Stack with Prometheus and Grafana on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Prometheus, Grafana, Monitoring

Description: Set up a complete monitoring stack with Prometheus and Grafana on RHEL 9.

---

## Overview

Set up a basic monitoring stack with PCP, Prometheus, and Grafana on RHEL 9. Effective monitoring is critical for maintaining system health, detecting issues early, and planning capacity.

## Prerequisites

- A RHEL 9 system with a valid subscription or configured repositories
- Root or sudo access
- Network access for remote monitoring tools (if applicable)

## Step 1 - Install Required Packages

Install the monitoring tools relevant to this guide:

```bash
sudo dnf install -y pcp-zeroconf pcp-system-tools sysstat net-snmp net-snmp-utils grafana grafana-pcp
```

Install Prometheus and Node Exporter from the official Prometheus release binaries or from your approved repository if they are part of your setup. Select only the packages you need for your specific setup.

## Step 2 - Enable and Start Services

```bash
sudo systemctl enable --now pmcd pmlogger
# for sysstat collection:

sudo systemctl enable --now sysstat sysstat-collect.timer sysstat-summary.timer
# for Grafana:

sudo systemctl enable --now grafana-server
```

## Step 3 - Configure the Monitoring Tool

Edit the relevant configuration file for your monitoring setup. Common locations include:

- `/etc/pcp/` for PCP configuration
- `/etc/snmp/snmpd.conf` for SNMP
- `/etc/prometheus/prometheus.yml` for Prometheus when installed with that configuration path
- `/etc/grafana/grafana.ini` for Grafana

Apply your changes and restart the service:

```bash
sudo systemctl restart <service-name>
```

## Step 4 - Open Firewall Ports

```bash
# Common monitoring ports
sudo firewall-cmd --permanent --add-port=9090/tcp   # Prometheus
sudo firewall-cmd --permanent --add-port=9100/tcp   # Node Exporter
sudo firewall-cmd --permanent --add-service=grafana # Grafana
sudo firewall-cmd --permanent --add-service=snmp     # SNMP
sudo firewall-cmd --reload
```

## Step 5 - Verify Data Collection

Confirm that metrics are being collected:

```bash
# PCP
pmstat -s 3
# sysstat
sar -u 1 3
# Prometheus endpoint
curl -s http://localhost:9090/api/v1/query?query=up
```

## Step 6 - Set Up Alerting (Optional)

Configure alerts based on thresholds so you are notified before issues become critical. Use Prometheus Alertmanager, Nagios notifications, or Red Hat Insights recommendations depending on your stack.

## Summary

You now know how to set up a basic monitoring stack with PCP, Prometheus, and Grafana. Regular monitoring helps you detect performance degradation, plan capacity, and respond to incidents quickly on your RHEL 9 systems.
