# How to Configure the Ops Agent for Custom Application Log and Metric Collection on Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Ops Agent, Cloud Monitoring, Cloud Logging, Custom Metrics, Google Cloud

Description: Learn how to configure the Google Cloud Ops Agent to collect custom application logs and metrics from Compute Engine instances.

---

If you are running workloads on Compute Engine, the Ops Agent is your primary tool for getting logs and metrics into Google Cloud's observability stack. Out of the box it collects system metrics and syslog, but the real power comes from configuring it to collect your application-specific logs and metrics. In this post, I will show you how to set up the Ops Agent to collect custom log files, parse structured logs, and scrape application metrics.

## What is the Ops Agent?

The Ops Agent is Google Cloud's unified agent for Compute Engine instances. It replaces the older Monitoring Agent and Logging Agent with a single agent that handles both. Under the hood, it uses Fluent Bit for log collection and the OpenTelemetry Collector for metrics. You configure it with a single YAML file.

## Step 1: Install the Ops Agent

Install the agent on your Compute Engine instance.

```bash
# Download and run the installation script
curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
sudo bash add-google-cloud-ops-agent-repo.sh --also-install
```

Verify the installation.

```bash
# Check the agent status
sudo systemctl status google-cloud-ops-agent

# Check if it is collecting default metrics
sudo journalctl -u google-cloud-ops-agent -n 50
```

## Step 2: Understand the Configuration Structure

The Ops Agent configuration lives at `/etc/google-cloud-ops-agent/config.yaml`. It has three main sections: logging, metrics, and a combined service section.

```yaml
# /etc/google-cloud-ops-agent/config.yaml
# This is the basic structure

logging:
  receivers:
    # Define where to read logs from
  processors:
    # Define how to parse and transform logs
  service:
    pipelines:
      # Connect receivers to processors to exporters

metrics:
  receivers:
    # Define where to scrape metrics from
  processors:
    # Define metric transformations
  service:
    pipelines:
      # Connect receivers to processors to exporters
```

## Step 3: Collect Custom Application Logs

Suppose your application writes logs to `/var/log/myapp/app.log`. Here is how to configure the Ops Agent to collect them.

```yaml
# /etc/google-cloud-ops-agent/config.yaml

logging:
  receivers:
    # Collect the default system logs
    syslog:
      type: files
      include_paths:
        - /var/log/messages
        - /var/log/syslog

    # Collect your application logs
    myapp_logs:
      type: files
      include_paths:
        - /var/log/myapp/*.log
      # Optionally specify the record log name in Cloud Logging
      record_log_name: myapp

  processors:
    # Parse JSON-formatted application logs
    myapp_json_parser:
      type: parse_json
      time_key: timestamp
      time_format: "%Y-%m-%dT%H:%M:%S.%LZ"

    # For non-JSON logs, use regex parsing
    myapp_regex_parser:
      type: parse_regex
      regex: "^(?<timestamp>[\\d-]+T[\\d:.]+Z) \\[(?<severity>\\w+)\\] (?<module>\\w+): (?<message>.*)$"
      time_key: timestamp
      time_format: "%Y-%m-%dT%H:%M:%S.%LZ"

  service:
    pipelines:
      # Default system log pipeline
      default_pipeline:
        receivers: [syslog]

      # Application log pipeline with JSON parsing
      myapp_pipeline:
        receivers: [myapp_logs]
        processors: [myapp_json_parser]
```

## Step 4: Collect Structured JSON Logs

If your application outputs structured JSON logs (which it should), the JSON parser extracts fields automatically.

Here is what your application log might look like.

```json
{"timestamp": "2026-02-17T14:30:00.000Z", "severity": "ERROR", "message": "Database connection failed", "service": "order-api", "trace_id": "abc123", "error_code": "DB_CONN_REFUSED", "retry_count": 3}
```

With the JSON parser configured, these fields become searchable in Cloud Logging.

```yaml
logging:
  receivers:
    myapp:
      type: files
      include_paths:
        - /var/log/myapp/app.json.log

  processors:
    # Parse JSON and map severity field to Cloud Logging severity
    parse_app_json:
      type: parse_json
      time_key: timestamp
      time_format: "%Y-%m-%dT%H:%M:%S.%LZ"

    # Map the severity field from the JSON to the log entry severity
    set_severity:
      type: modify_fields
      fields:
        severity:
          move_from: jsonPayload.severity

  service:
    pipelines:
      myapp:
        receivers: [myapp]
        processors: [parse_app_json, set_severity]
```

## Step 5: Collect Custom Application Metrics

The Ops Agent can scrape Prometheus-format metrics from your application. If your application exposes a `/metrics` endpoint, here is how to collect those metrics.

```yaml
metrics:
  receivers:
    # Collect default system metrics
    hostmetrics:
      type: hostmetrics
      collection_interval: 60s

    # Scrape Prometheus metrics from your application
    myapp_metrics:
      type: prometheus
      config:
        scrape_configs:
          - job_name: myapp
            scrape_interval: 30s
            static_configs:
              - targets: ['localhost:8080']
            metrics_path: /metrics

  service:
    pipelines:
      # Default system metrics
      default:
        receivers: [hostmetrics]

      # Application metrics
      myapp:
        receivers: [myapp_metrics]
```

## Step 6: Collect Metrics from StatsD

If your application emits StatsD metrics, the Ops Agent can receive those too.

```yaml
metrics:
  receivers:
    hostmetrics:
      type: hostmetrics
      collection_interval: 60s

    # Receive StatsD metrics on port 8125
    statsd_metrics:
      type: statsd
      listen_address: 0.0.0.0
      listen_port: 8125

  service:
    pipelines:
      default:
        receivers: [hostmetrics]
      statsd:
        receivers: [statsd_metrics]
```

## Step 7: Collect Third-Party Application Logs

The Ops Agent has built-in support for many common applications. Here are configurations for some popular ones.

```yaml
# Nginx log collection
logging:
  receivers:
    nginx_access:
      type: nginx_access
      include_paths:
        - /var/log/nginx/access.log
    nginx_error:
      type: nginx_error
      include_paths:
        - /var/log/nginx/error.log

  service:
    pipelines:
      nginx:
        receivers: [nginx_access, nginx_error]
```

```yaml
# Apache log collection
logging:
  receivers:
    apache_access:
      type: apache_access
      include_paths:
        - /var/log/apache2/access.log
    apache_error:
      type: apache_error
      include_paths:
        - /var/log/apache2/error.log

  service:
    pipelines:
      apache:
        receivers: [apache_access, apache_error]
```

```yaml
# MySQL log and metric collection
logging:
  receivers:
    mysql_error:
      type: mysql_error
      include_paths:
        - /var/log/mysql/error.log
    mysql_slow_query:
      type: mysql_slow_query
      include_paths:
        - /var/log/mysql/slow-query.log

metrics:
  receivers:
    mysql_metrics:
      type: mysql
      endpoint: localhost:3306
      username: monitoring
      password: secret
      collection_interval: 60s
```

## Step 8: Validate and Apply the Configuration

After editing the config file, validate and restart the agent.

```bash
# Validate the configuration syntax
sudo /opt/google-cloud-ops-agent/libexec/google_cloud_ops_agent_diagnostics -config /etc/google-cloud-ops-agent/config.yaml

# Restart the agent to apply changes
sudo systemctl restart google-cloud-ops-agent

# Check for errors in the agent logs
sudo journalctl -u google-cloud-ops-agent -f
```

## Configuration Architecture

Here is how the Ops Agent components work together.

```mermaid
graph TD
    subgraph "Ops Agent"
        subgraph "Logging (Fluent Bit)"
            A[File Receivers] --> B[Processors - Parse/Transform]
            B --> C[Cloud Logging Exporter]
        end

        subgraph "Metrics (OTel Collector)"
            D[Host Metrics Receiver] --> F[Cloud Monitoring Exporter]
            E[Prometheus Receiver] --> F
            G[StatsD Receiver] --> F
        end
    end

    H[/var/log/myapp/app.log] --> A
    I[/var/log/syslog] --> A
    J[App :8080/metrics] --> E
    K[System CPU/Memory/Disk] --> D

    C --> L[Cloud Logging]
    F --> M[Cloud Monitoring]
```

## Deploying Configuration at Scale

For fleets of VMs, use a startup script or configuration management.

```bash
# Startup script that installs the agent and applies custom config
#!/bin/bash

# Install the Ops Agent
curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
bash add-google-cloud-ops-agent-repo.sh --also-install

# Download custom configuration from Cloud Storage
gsutil cp gs://my-configs-bucket/ops-agent-config.yaml \
    /etc/google-cloud-ops-agent/config.yaml

# Restart to apply the configuration
systemctl restart google-cloud-ops-agent
```

## Troubleshooting

If logs or metrics are not appearing in Google Cloud, check these things.

```bash
# Check if the agent is running
sudo systemctl status google-cloud-ops-agent

# Check agent logs for errors
sudo journalctl -u google-cloud-ops-agent --since "10 minutes ago"

# Verify the config file is valid YAML
python3 -c "import yaml; yaml.safe_load(open('/etc/google-cloud-ops-agent/config.yaml'))"

# Check if the application log file exists and is readable
ls -la /var/log/myapp/app.log

# Check if the Ops Agent user has read permissions
sudo -u google-cloud-ops-agent cat /var/log/myapp/app.log
```

A common issue is file permissions. The Ops Agent runs as the `google-cloud-ops-agent` user and needs read access to your log files. Fix this by adding the agent user to the appropriate group or adjusting file permissions.

## Wrapping Up

The Ops Agent is the bridge between your Compute Engine workloads and Google Cloud's observability tools. Out of the box you get system metrics and syslog, but with custom configuration you can collect any log file, parse structured JSON logs, scrape Prometheus metrics, and receive StatsD metrics. The configuration is straightforward YAML, and the agent handles batching, retrying, and buffering automatically. For fleet deployments, store your configuration in Cloud Storage and apply it via startup scripts to keep all your instances consistent.
