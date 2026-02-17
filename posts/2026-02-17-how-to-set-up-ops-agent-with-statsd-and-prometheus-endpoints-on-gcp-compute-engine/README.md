# How to Set Up Ops Agent with StatsD and Prometheus Endpoints on GCP Compute Engine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Ops Agent, StatsD, Prometheus, Compute Engine, Google Cloud Monitoring

Description: A step-by-step guide to configuring the Google Cloud Ops Agent on Compute Engine to collect metrics from StatsD and Prometheus endpoints.

---

The Google Cloud Ops Agent is the recommended way to collect metrics and logs from Compute Engine instances. Out of the box, it collects system metrics like CPU, memory, and disk usage. But most applications expose their own custom metrics through StatsD or Prometheus endpoints, and the Ops Agent can collect those too.

This post walks through setting up the Ops Agent to scrape both StatsD metrics and Prometheus endpoints on a Compute Engine instance, and send everything to Google Cloud Monitoring where you can dashboard and alert on it.

## What Is the Ops Agent

The Ops Agent is a unified agent that replaces the older Monitoring and Logging agents. It is based on Fluent Bit for logs and the OpenTelemetry Collector for metrics. The key advantage is a single agent configuration file that handles both logs and metrics, with support for many input formats including StatsD and Prometheus.

## Installing the Ops Agent

Install the Ops Agent on your Compute Engine instance:

```bash
# Download and run the installation script
curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
sudo bash add-google-cloud-ops-agent-repo.sh --also-install

# Verify the agent is running
sudo systemctl status google-cloud-ops-agent

# Check the agent version
sudo /opt/google-cloud-ops-agent/libexec/google_cloud_ops_agent_diagnostics -version
```

The default configuration collects system metrics (CPU, memory, disk, network) and system logs (syslog, auth logs). We need to add custom configurations for StatsD and Prometheus.

## Setting Up StatsD Collection

StatsD is a simple UDP-based protocol for sending application metrics. Many application frameworks have StatsD client libraries built in. The Ops Agent can act as a StatsD receiver, accepting metrics over UDP and forwarding them to Cloud Monitoring.

Edit the Ops Agent configuration file to add a StatsD receiver:

```yaml
# /etc/google-cloud-ops-agent/config.yaml
metrics:
  receivers:
    # Default system metrics receiver (keep this)
    hostmetrics:
      type: hostmetrics
      collection_interval: 60s

    # StatsD receiver - listens for UDP metrics
    statsd:
      type: statsd
      collection_interval: 30s
      # The UDP port to listen on for StatsD metrics
      listen_address: 0.0.0.0
      listen_port: 8125

  service:
    pipelines:
      default_pipeline:
        receivers:
          - hostmetrics
          - statsd

logging:
  receivers:
    syslog:
      type: files
      include_paths:
        - /var/log/messages
        - /var/log/syslog
  service:
    pipelines:
      default_pipeline:
        receivers:
          - syslog
```

Restart the agent to apply the configuration:

```bash
# Restart the Ops Agent
sudo systemctl restart google-cloud-ops-agent

# Check the logs to make sure it started correctly
sudo journalctl -u google-cloud-ops-agent -f --no-pager -n 50
```

Now test it by sending a StatsD metric:

```bash
# Send a test counter metric via StatsD
echo "test.request.count:1|c" | nc -u -w0 127.0.0.1 8125

# Send a test gauge metric
echo "test.memory.usage:75.5|g" | nc -u -w0 127.0.0.1 8125

# Send a test timing metric
echo "test.response.time:250|ms" | nc -u -w0 127.0.0.1 8125
```

Here is a Python example of sending StatsD metrics from your application:

```python
import statsd

# Create a StatsD client pointing to the local Ops Agent
client = statsd.StatsClient(host="127.0.0.1", port=8125, prefix="myapp")

# Increment a counter
client.incr("requests.total")

# Set a gauge
client.gauge("active_connections", 42)

# Record a timing
client.timing("db.query_time", 125)  # 125 milliseconds

# Use a timer context manager
with client.timer("api.response_time"):
    # Your code here
    process_request()
```

## Setting Up Prometheus Endpoint Scraping

Many modern applications expose metrics via a Prometheus /metrics endpoint. The Ops Agent can scrape these endpoints and send the metrics to Cloud Monitoring.

Add a Prometheus receiver to the Ops Agent configuration:

```yaml
# /etc/google-cloud-ops-agent/config.yaml
metrics:
  receivers:
    hostmetrics:
      type: hostmetrics
      collection_interval: 60s

    statsd:
      type: statsd
      collection_interval: 30s
      listen_address: 0.0.0.0
      listen_port: 8125

    # Prometheus scraper - scrapes metrics from HTTP endpoints
    prometheus:
      type: prometheus
      collection_interval: 30s
      config:
        scrape_configs:
          - job_name: "my-application"
            scrape_interval: 30s
            # Scrape the local application's Prometheus endpoint
            static_configs:
              - targets:
                  - "localhost:9090"
            metrics_path: /metrics

          - job_name: "redis-exporter"
            scrape_interval: 60s
            static_configs:
              - targets:
                  - "localhost:9121"

          - job_name: "node-exporter"
            scrape_interval: 60s
            static_configs:
              - targets:
                  - "localhost:9100"

  service:
    pipelines:
      default_pipeline:
        receivers:
          - hostmetrics
          - statsd
          - prometheus

logging:
  receivers:
    syslog:
      type: files
      include_paths:
        - /var/log/messages
        - /var/log/syslog
  service:
    pipelines:
      default_pipeline:
        receivers:
          - syslog
```

Restart the agent again:

```bash
# Restart to pick up the new Prometheus configuration
sudo systemctl restart google-cloud-ops-agent

# Verify in the logs that scraping is working
sudo journalctl -u google-cloud-ops-agent --since "1 minute ago" --no-pager
```

## Example: Exposing Prometheus Metrics from a Python App

Here is a simple Python application that exposes Prometheus metrics:

```python
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import time
import random

# Define metrics
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"]
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

ACTIVE_CONNECTIONS = Gauge(
    "active_connections",
    "Number of active connections"
)

DB_POOL_SIZE = Gauge(
    "db_connection_pool_size",
    "Database connection pool size",
    ["state"]
)

def simulate_traffic():
    """Simulate application traffic to generate metrics."""
    while True:
        # Simulate a request
        method = random.choice(["GET", "POST"])
        endpoint = random.choice(["/api/users", "/api/orders", "/api/products"])
        status = random.choices([200, 201, 400, 500], weights=[80, 10, 7, 3])[0]

        # Record the request
        REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=str(status)).inc()

        # Record latency
        latency = random.uniform(0.01, 0.5)
        REQUEST_LATENCY.labels(method=method, endpoint=endpoint).observe(latency)

        # Update gauges
        ACTIVE_CONNECTIONS.set(random.randint(10, 100))
        DB_POOL_SIZE.labels(state="active").set(random.randint(5, 20))
        DB_POOL_SIZE.labels(state="idle").set(random.randint(0, 15))

        time.sleep(1)

if __name__ == "__main__":
    # Start the Prometheus metrics server on port 9090
    start_http_server(9090)
    print("Prometheus metrics available at http://localhost:9090/metrics")
    simulate_traffic()
```

## Verifying Metrics in Cloud Monitoring

After the agent is collecting metrics, verify they appear in Cloud Monitoring:

```bash
# List custom metrics that have been created
gcloud monitoring metrics-descriptors list \
  --project=my-project \
  --filter='metric.type = starts_with("workload.googleapis.com")'
```

StatsD metrics appear under the `workload.googleapis.com/` prefix, while Prometheus metrics appear under `prometheus.googleapis.com/` or `workload.googleapis.com/` depending on the configuration.

You can also check in the Cloud Console by navigating to Monitoring, then Metrics Explorer, and searching for your metric names.

## Creating Dashboards for Custom Metrics

Build a dashboard that shows your custom application metrics alongside system metrics:

```bash
# Create a dashboard JSON file and deploy it
gcloud monitoring dashboards create --config-from-file=app-metrics-dashboard.json
```

A useful dashboard layout would show your StatsD counters (request counts, error counts) in the top row, Prometheus histograms (latency distributions) in the middle row, and system metrics (CPU, memory) in the bottom row. This gives you a complete picture of both application and infrastructure health.

## Setting Up Alerts on Custom Metrics

Create alerting policies on your custom metrics just like you would for built-in metrics:

```bash
# Alert when error rate from StatsD counter exceeds threshold
gcloud alpha monitoring policies create \
  --display-name="High Error Rate (Custom Metric)" \
  --condition-display-name="Error count > 100/min" \
  --condition-filter='metric.type="workload.googleapis.com/myapp.errors.total"' \
  --condition-threshold-value=100 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=300s \
  --condition-threshold-aggregation-alignment-period=60s \
  --condition-threshold-aggregation-per-series-aligner=ALIGN_RATE \
  --notification-channels=projects/my-project/notificationChannels/12345 \
  --project=my-project
```

## Troubleshooting

If metrics are not showing up in Cloud Monitoring, check these common issues:

1. **Agent not running**: Run `sudo systemctl status google-cloud-ops-agent`
2. **Configuration syntax error**: Check logs with `sudo journalctl -u google-cloud-ops-agent -n 100`
3. **Firewall blocking**: Make sure the Compute Engine instance has the Cloud Monitoring API scope enabled
4. **Prometheus endpoint not reachable**: Test with `curl http://localhost:9090/metrics`
5. **StatsD port conflict**: Verify no other process is listening on port 8125

## Summary

The Ops Agent turns your Compute Engine instances into full observability endpoints. By configuring StatsD and Prometheus receivers, you can collect application-specific metrics alongside system metrics, all through a single agent. The metrics flow into Cloud Monitoring where you can build dashboards, set up alerts, and integrate with the rest of your GCP observability stack. Start with the default system metrics, add StatsD for quick counter and gauge metrics, and use Prometheus for more structured application metrics.
