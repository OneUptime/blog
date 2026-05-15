# How to Monitor Podman Containers with Prometheus on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Podman, Prometheus, Container

Description: Monitor Podman containers on RHEL 9 using Prometheus for container-level metrics.

---

## Overview

Monitor Podman containers on RHEL 9 using Prometheus for container-level metrics. Effective monitoring is critical for maintaining system health, detecting issues early, and planning capacity.

## Prerequisites

- A RHEL 9 system with a valid subscription or configured repositories
- The EPEL repository enabled for the Podman exporter package
- A Prometheus server that can scrape the RHEL 9 host
- Root or sudo access
- Network access for remote monitoring tools (if applicable)

## Step 1 - Install Required Packages

Install the monitoring tools relevant to this guide:

```bash
sudo dnf install -y podman prometheus-podman-exporter
```

Select only the packages you need for your specific setup.

## Step 2 - Enable and Start Services

```bash
sudo systemctl enable --now prometheus-podman-exporter
```

## Step 3 - Configure the Monitoring Tool

Edit your Prometheus configuration file, usually `/etc/prometheus/prometheus.yml`, and add the Podman exporter as a scrape target:

```yaml
scrape_configs:
  - job_name: "podman"
    static_configs:
      - targets: ["rhel9-host.example.com:9882"]
```

Apply your changes and restart the service:

```bash
sudo systemctl restart prometheus
```

## Step 4 - Open Firewall Ports

```bash
# Common monitoring ports
sudo firewall-cmd --permanent --add-port=9090/tcp   # Prometheus
sudo firewall-cmd --permanent --add-port=9882/tcp   # Podman exporter
sudo firewall-cmd --reload
```

## Step 5 - Verify Data Collection

Confirm that metrics are being collected:

```bash
# Podman exporter metrics
curl -s http://localhost:9882/metrics | grep '^podman_container_'
# Prometheus target status
curl -s 'http://localhost:9090/api/v1/query?query=up%7Bjob%3D%22podman%22%7D'
```

## Step 6 - Set Up Alerting (Optional)

Configure alerts based on thresholds so you are notified before issues become critical. Use Prometheus Alertmanager or Red Hat Insights recommendations depending on your stack.

## Summary

You now know how to monitor podman containers with prometheus. Regular monitoring helps you detect performance degradation, plan capacity, and respond to incidents quickly on your RHEL 9 systems.
