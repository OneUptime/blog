# How to Install and Configure Grafana Agent for Metrics Collection on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Grafana, Metrics, Monitoring, Prometheus

Description: Set up the Grafana Agent on RHEL to collect system metrics and forward them to Grafana Cloud or a Prometheus-compatible backend.

---

The Grafana Agent (now called Grafana Alloy) is a lightweight telemetry collector that scrapes Prometheus metrics and forwards them to Grafana Cloud, Mimir, or any Prometheus-compatible remote write endpoint.

## Installing the Grafana Agent

```bash
# Add the Grafana repository
sudo tee /etc/yum.repos.d/grafana.repo << 'EOF'
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

# Install Grafana Alloy (the successor to Grafana Agent)
sudo dnf install alloy -y

# Enable and start the service
sudo systemctl enable --now alloy
```

## Configuring for System Metrics

Create the configuration file to scrape node-level metrics:

```bash
# Edit the Alloy configuration
sudo tee /etc/alloy/config.alloy << 'EOF'
// Collect system metrics using the node_exporter integration
prometheus.exporter.unix "default" {
  // Enable common system metric collectors
  set_collectors = [
    "cpu",
    "diskstats",
    "filesystem",
    "loadavg",
    "meminfo",
    "netdev",
    "systemd",
    "uname",
  ]
}

// Scrape the local node_exporter metrics
prometheus.scrape "node" {
  targets    = prometheus.exporter.unix.default.targets
  forward_to = [prometheus.remote_write.grafana_cloud.receiver]
  scrape_interval = "15s"
}

// Send metrics to Grafana Cloud (or any Prometheus remote write endpoint)
prometheus.remote_write "grafana_cloud" {
  endpoint {
    url = "https://prometheus-us-central1.grafana.net/api/prom/push"

    basic_auth {
      username = "YOUR_GRAFANA_CLOUD_USER_ID"
      password = "YOUR_GRAFANA_CLOUD_API_KEY"
    }
  }
}
EOF
```

## Collecting Custom Application Metrics

If your application exposes Prometheus metrics, add a scrape config:

```bash
# Append to the config.alloy file
sudo tee -a /etc/alloy/config.alloy << 'EOF'

// Scrape application metrics on port 8080
prometheus.scrape "app" {
  targets = [{
    __address__ = "localhost:8080",
  }]
  metrics_path = "/metrics"
  forward_to   = [prometheus.remote_write.grafana_cloud.receiver]
  scrape_interval = "15s"
}
EOF
```

## Collecting Logs

Grafana Alloy can also collect and forward logs:

```bash
# Append log collection to the config
sudo tee -a /etc/alloy/config.alloy << 'EOF'

// Collect system logs
local.file_match "system_logs" {
  path_targets = [
    {__path__ = "/var/log/messages", job = "system"},
    {__path__ = "/var/log/secure", job = "auth"},
  ]
}

loki.source.file "system" {
  targets    = local.file_match.system_logs.targets
  forward_to = [loki.write.grafana_cloud.receiver]
}

loki.write "grafana_cloud" {
  endpoint {
    url = "https://logs-prod-us-central1.grafana.net/loki/api/v1/push"
    basic_auth {
      username = "YOUR_LOKI_USER_ID"
      password = "YOUR_GRAFANA_CLOUD_API_KEY"
    }
  }
}
EOF
```

## Restart and Verify

```bash
# Validate the configuration
alloy fmt /etc/alloy/config.alloy

# Restart to pick up changes
sudo systemctl restart alloy

# Check for errors
sudo journalctl -u alloy -f --no-pager -n 20

# Verify the agent is scraping metrics
curl -s http://localhost:12345/metrics | head -5
```

## Firewall Configuration

```bash
# Allow the agent's built-in HTTP server (for health checks)
sudo firewall-cmd --permanent --add-port=12345/tcp
sudo firewall-cmd --reload
```

After setup, your RHEL system metrics will appear in Grafana dashboards within a few minutes.
