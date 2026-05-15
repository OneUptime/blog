# How to Set Up Grafana Loki for Log Aggregation on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Grafana Loki, Log Aggregation, Monitoring

Description: Set up Grafana Loki on RHEL for cost-effective log aggregation and querying.

---

## Overview

Set up Grafana Loki on RHEL for cost-effective log aggregation and querying. Effective monitoring is critical for maintaining system health, detecting issues early, and planning capacity.

## Prerequisites

- A RHEL system with a valid subscription or configured repositories
- Root or sudo access
- Network access for remote monitoring tools (if applicable)

## Step 1 - Install Required Packages

Install Grafana Loki, Grafana Alloy, and Grafana from the Grafana RPM repository:

```bash
wget -q -O gpg.key https://rpm.grafana.com/gpg.key
sudo rpm --import gpg.key

sudo tee /etc/yum.repos.d/grafana.repo >/dev/null <<'EOF'
[grafana]
name=grafana
baseurl=https://rpm.grafana.com
repo_gpgcheck=1
enabled=1
gpgcheck=1
gpgkey=https://rpm.grafana.com/gpg.key
sslverify=1
sslcacert=/etc/pki/tls/certs/ca-bundle.crt
EOF

sudo dnf install -y loki alloy grafana
```

Alloy is the recommended Grafana agent for sending local logs to Loki.

## Step 2 - Enable and Start Services

```bash
sudo systemctl enable --now loki alloy grafana-server
```

## Step 3 - Configure the Monitoring Tool

Edit the relevant configuration file for your Loki setup. Common locations include:

- the Loki YAML file passed with Loki's `-config.file` option
- `/etc/alloy/config.alloy` for Alloy log collection
- `/etc/grafana/grafana.ini` for Grafana

For example, configure Alloy to read local RHEL log files and forward them to Loki:

```alloy
loki.source.file "system" {
  targets = [
    {__path__ = "/var/log/messages", "job" = "system"},
    {__path__ = "/var/log/secure", "job" = "auth"},
  ]
  forward_to = [loki.write.local.receiver]
}

loki.write "local" {
  endpoint {
    url = "http://localhost:3100/loki/api/v1/push"
  }
}
```

Apply your changes and reload or restart the relevant service:

```bash
sudo systemctl reload alloy
sudo systemctl restart loki
```

## Step 4 - Open Firewall Ports

Only expose Loki to trusted networks or put it behind an authenticating reverse proxy. If Grafana and Alloy run on the same host as Loki, you can leave port 3100 closed externally.

```bash
# Common Loki and Grafana ports
sudo firewall-cmd --permanent --add-port=3100/tcp   # Loki HTTP API
sudo firewall-cmd --permanent --add-port=3000/tcp   # Grafana
sudo firewall-cmd --reload
```

## Step 5 - Verify Data Collection

Confirm that Loki is running and that log labels are available:

```bash
curl -s http://localhost:3100/ready
curl -G -s "http://localhost:3100/loki/api/v1/labels"
```

## Step 6 - Set Up Alerting (Optional)

Configure alerts based on LogQL queries so you are notified before issues become critical. Use Grafana-managed alerts for the Loki data source or Loki ruler alerts with Alertmanager, depending on your stack.

## Summary

You now know how to set up Grafana Loki for log aggregation. Regular log monitoring helps you detect errors, investigate incidents, and respond quickly on your RHEL systems.
