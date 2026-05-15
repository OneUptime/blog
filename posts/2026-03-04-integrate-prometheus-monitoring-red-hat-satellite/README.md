# How to Integrate Prometheus Monitoring with Red Hat Satellite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Prometheus, Red Hat Satellite, Monitoring

Description: Integrate Prometheus monitoring with Red Hat Satellite for unified observability.

---

## Overview

Integrate Prometheus monitoring with Red Hat Satellite for unified observability. Effective monitoring is critical for maintaining system health, detecting issues early, and planning capacity.

## Prerequisites

- A Red Hat Satellite Server running on RHEL 9 with a valid subscription or configured repositories
- A Prometheus server that can reach the Satellite Server
- Root or sudo access
- Network access for remote monitoring tools (if applicable)

## Step 1 - Install Required Packages

Install the monitoring tools relevant to this guide:

```bash
sudo satellite-maintain packages install pcp \
  pcp-pmda-apache \
  pcp-pmda-openmetrics \
  pcp-pmda-postgresql \
  pcp-pmda-redis \
  pcp-system-tools \
  foreman-pcp
```

Select only the packages you need for your specific setup.

## Step 2 - Enable and Start Services

```bash
sudo systemctl enable --now pmcd pmlogger
```

## Step 3 - Configure the Monitoring Tool

Configure PCP to collect Satellite, Apache HTTP Server, PostgreSQL, and Redis metrics:

```bash
sudo ln -s /etc/pcp/proc/foreman-hotproc.conf /var/lib/pcp/pmdas/proc/hotproc.conf

cd /var/lib/pcp/pmdas/proc
sudo ./Install

sudo satellite-installer --enable-apache-mod-status
cd /var/lib/pcp/pmdas/apache
sudo ./Install

cd /var/lib/pcp/pmdas/postgresql
sudo ./Install

cd /var/lib/pcp/pmdas/redis
sudo ./Install

sudo satellite-installer --foreman-telemetry-prometheus-enabled true
cd /var/lib/pcp/pmdas/openmetrics
echo "https://satellite.example.com/metrics" | sudo tee config.d/foreman.url
sudo ./Install

sudo systemctl restart pmcd pmlogger pmproxy
```

Replace `satellite.example.com` with the FQDN of your Satellite Server.

On your Prometheus server, add the Satellite metrics endpoint to `/etc/prometheus/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: satellite
    scheme: https
    metrics_path: /metrics
    static_configs:
      - targets:
          - satellite.example.com
```

## Step 4 - Open Firewall Ports

```bash
# Common monitoring ports
sudo firewall-cmd --permanent --add-port=9090/tcp   # Prometheus, if hosted on this system
sudo firewall-cmd --permanent --add-service=grafana  # Grafana, if hosted on this system
sudo firewall-cmd --reload
```

## Step 5 - Verify Data Collection

Confirm that metrics are being collected:

```bash
# PCP
pcp
pminfo
foreman-rake telemetry:metrics

# Prometheus query API, from the Prometheus server
curl -G http://localhost:9090/api/v1/query --data-urlencode 'query=up{job="satellite"}'
```

## Step 6 - Set Up Alerting (Optional)

Configure alerts based on thresholds so you are notified before issues become critical. Use Prometheus Alertmanager, Nagios notifications, or Red Hat Insights recommendations depending on your stack.

## Summary

You now know how to integrate prometheus monitoring with red hat satellite. Regular monitoring helps you detect performance degradation, plan capacity, and respond to incidents quickly on your RHEL 9 systems.
