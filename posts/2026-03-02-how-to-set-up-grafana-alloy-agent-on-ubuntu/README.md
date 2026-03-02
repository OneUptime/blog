# How to Set Up Grafana Alloy (Agent) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Grafana, Monitoring, Observability, Prometheus

Description: Learn how to install and configure Grafana Alloy on Ubuntu to collect metrics, logs, and traces for your Grafana observability stack.

---

Grafana Alloy is the next generation of Grafana Agent - a unified telemetry collector for metrics, logs, traces, and profiles. It replaced Grafana Agent Flow and uses a component-based configuration model called River (now called Alloy configuration syntax). If you run Grafana Cloud or a self-hosted Grafana stack, Alloy is the recommended way to get data from your Ubuntu systems into your observability stack.

## What Alloy Does

Alloy sits between your services and your backends (Prometheus, Loki, Tempo, Pyroscope). It can:

- Scrape Prometheus metrics from applications and exporters
- Collect and ship logs to Loki
- Receive and forward traces to Tempo
- Run as a Prometheus remote_write target
- Run otel-collector pipelines for OpenTelemetry data
- Profile applications with Pyroscope

## Prerequisites

- Ubuntu 20.04 or 22.04
- A target backend: Grafana Cloud, or self-hosted Prometheus/Loki/Tempo
- sudo privileges

## Installation

Grafana maintains an official APT repository:

```bash
# Import the Grafana GPG key
sudo mkdir -p /etc/apt/keyrings
wget -q -O - https://apt.grafana.com/gpg.key | \
  gpg --dearmor | \
  sudo tee /etc/apt/keyrings/grafana.gpg > /dev/null

# Add the Grafana APT repository
echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" | \
  sudo tee /etc/apt/sources.list.d/grafana.list

# Update and install Alloy
sudo apt-get update && sudo apt-get install -y alloy

# Check the installed version
alloy --version
```

## Configuration Basics

Alloy uses a component-based configuration language. The config file lives at `/etc/alloy/config.alloy`. Components are connected by passing references between them.

The basic pattern is:

```
source_component "name" {
  // reads data from somewhere
}

sink_component "name" {
  // receives data from source via reference
  forward_to = [source_component.name.receiver]
}
```

## Scraping Node Metrics

A common first configuration is scraping `node_exporter` metrics and forwarding them to Prometheus:

```alloy
// /etc/alloy/config.alloy

// Define where to send metrics
prometheus.remote_write "default" {
  endpoint {
    url = "https://prometheus.example.com/api/v1/write"

    // For Grafana Cloud, use HTTP basic auth
    basic_auth {
      username = "123456"
      password = env("GRAFANA_CLOUD_API_KEY")
    }
  }
}

// Scrape node_exporter on this host
prometheus.scrape "node" {
  targets = [{
    __address__ = "localhost:9100",
    instance    = env("HOSTNAME"),
    job         = "node",
  }]
  forward_to = [prometheus.remote_write.default.receiver]
  scrape_interval = "30s"
}

// Discover and scrape all local Prometheus-format metrics
prometheus.scrape "local_services" {
  targets = [{
    __address__ = "localhost:8080",
    job         = "myapp",
  }]
  forward_to = [prometheus.remote_write.default.receiver]
}
```

## Collecting System Metrics with prometheus.exporter

Alloy includes built-in exporters so you don't always need a separate `node_exporter` process:

```alloy
// Built-in node metrics exporter
prometheus.exporter.unix "local_system" {
  // Equivalent to node_exporter
  // No additional arguments needed for defaults
  include_exporter_metrics = true
  disable_collectors = ["wifi"]  // Skip wifi collector if not relevant
}

// Scrape the built-in exporter
prometheus.scrape "system" {
  targets    = prometheus.exporter.unix.local_system.targets
  forward_to = [prometheus.remote_write.default.receiver]
  scrape_interval = "30s"

  // Add extra labels
  clustering {
    enabled = false
  }
}
```

## Collecting Logs with Loki

```alloy
// Read local log files
local.file_match "system_logs" {
  path_targets = [
    {__path__ = "/var/log/syslog",        job = "syslog"},
    {__path__ = "/var/log/auth.log",      job = "auth"},
    {__path__ = "/var/log/nginx/*.log",   job = "nginx"},
    {__path__ = "/var/log/apt/history.log", job = "apt"},
  ]
}

// Loki source - tail matched files
loki.source.file "logs" {
  targets    = local.file_match.system_logs.targets
  forward_to = [loki.write.default.receiver]
}

// Send logs to Loki
loki.write "default" {
  endpoint {
    url = "https://loki.example.com/loki/api/v1/push"

    basic_auth {
      username = "your-loki-user"
      password = env("LOKI_PASSWORD")
    }
  }

  // External labels added to all log streams
  external_labels = {
    host        = env("HOSTNAME"),
    environment = "production",
  }
}
```

## Parsing and Processing Logs

Use `loki.process` to parse and enrich log lines:

```alloy
loki.process "nginx_logs" {
  // Parse nginx access log format
  stage.regex {
    expression = `(?P<ip>\S+) - (?P<user>\S+) \[(?P<timestamp>[^\]]+)\] "(?P<method>\S+) (?P<path>\S+) \S+" (?P<status>\d+) (?P<bytes>\d+)`
  }

  // Extract fields as labels (be careful - high cardinality labels are expensive)
  stage.labels {
    values = {
      status_code = "status",
      method      = "method",
    }
  }

  // Drop debug-level entries
  stage.drop {
    expression = `.*healthcheck.*`
    drop_counter_reason = "healthcheck_noise"
  }

  forward_to = [loki.write.default.receiver]
}

// Wire nginx logs through the processor
loki.source.file "nginx" {
  targets    = [{__path__ = "/var/log/nginx/access.log", job = "nginx"}]
  forward_to = [loki.process.nginx_logs.receiver]
}
```

## Receiving OpenTelemetry Data

Alloy can act as an OTel collector endpoint:

```alloy
// Accept OTLP data over gRPC
otelcol.receiver.otlp "default" {
  grpc {
    endpoint = "0.0.0.0:4317"
  }
  http {
    endpoint = "0.0.0.0:4318"
  }

  output {
    metrics = [otelcol.exporter.prometheus.default.input]
    logs    = [otelcol.exporter.loki.default.input]
    traces  = [otelcol.exporter.otlp.tempo.input]
  }
}

// Convert OTel metrics to Prometheus format
otelcol.exporter.prometheus "default" {
  forward_to = [prometheus.remote_write.default.receiver]
}

// Convert OTel logs to Loki format
otelcol.exporter.loki "default" {
  forward_to = [loki.write.default.receiver]
}

// Forward traces to Tempo
otelcol.exporter.otlp "tempo" {
  client {
    endpoint = "tempo.example.com:4317"
  }
}
```

## Environment Variables and Secrets

Store secrets as environment variables rather than in the config file:

```bash
# /etc/alloy/alloy.env
GRAFANA_CLOUD_API_KEY=glc_eyJrIjoiA...
LOKI_PASSWORD=your-loki-password
```

Reference them in config with `env("VAR_NAME")`.

Update the systemd service to load this file:

```bash
sudo systemctl edit alloy
```

Add:

```ini
[Service]
EnvironmentFile=/etc/alloy/alloy.env
```

## Starting and Managing Alloy

```bash
# Enable and start Alloy
sudo systemctl enable alloy
sudo systemctl start alloy

# Check status
sudo systemctl status alloy

# View logs
sudo journalctl -u alloy -f

# Reload config without restart (sends SIGHUP)
sudo kill -HUP $(pgrep alloy)
```

## Alloy's Built-in UI

Alloy exposes a web UI on port 12345 for debugging:

```bash
# Access locally
curl http://localhost:12345

# Or open in browser (with SSH tunnel if remote)
ssh -L 12345:localhost:12345 ubuntu@your-server
```

The UI shows all configured components, their current state, and data flow between them.

## Validating Configuration

```bash
# Check config syntax before applying
alloy fmt /etc/alloy/config.alloy  # Format and validate

# Run in test mode
alloy run /etc/alloy/config.alloy --stability.level=generally-available
```

## Troubleshooting

**Component not forwarding data:**
- Check the UI at `http://localhost:12345` - unhealthy components are highlighted
- Look at component-specific logs: `journalctl -u alloy | grep "component.name"`

**Prometheus remote_write fails:**
```bash
# Test connectivity to remote write endpoint
curl -v -X POST https://prometheus.example.com/api/v1/write \
  -u "username:password" \
  -H "Content-Type: application/x-protobuf"
```

**Log files not being tailed:**
```bash
# Verify paths exist and are readable
ls -la /var/log/nginx/
sudo -u alloy cat /var/log/nginx/access.log
```

Grafana Alloy's component model makes it easy to add new pipelines without disrupting existing ones. As your observability requirements grow, you can extend the same config file to cover new services, add processing stages, or route data to multiple backends simultaneously.
