# Use Ops Agent to Collect Custom Application Metrics from Compute Engine VMs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Ops Agent, Cloud Monitoring, Custom Metric

Description: Learn how to install and configure the Google Cloud Ops Agent on Compute Engine VMs to collect custom application metrics and send them to Cloud Monitoring for dashboards and alerting.

---

Default VM metrics like CPU usage and disk I/O only tell part of the story. To really understand how your application is performing, you need custom metrics - things like request latency, queue depth, active connections, or business-specific numbers like orders per minute. The Ops Agent is Google's unified agent for collecting both logs and metrics from Compute Engine VMs, and it makes custom metric collection surprisingly straightforward.

## What Is the Ops Agent

The Ops Agent is the recommended replacement for the older Monitoring Agent and Logging Agent. It combines both functions into a single agent built on OpenTelemetry Collector (for metrics) and Fluent Bit (for logs). It runs as a systemd service on your VM and sends data to Cloud Monitoring and Cloud Logging.

## Step 1: Install the Ops Agent

SSH into your VM and run the installation script:

```bash
# Download and run the Ops Agent installation script

curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
sudo bash add-google-cloud-ops-agent-repo.sh --also-install
```

Verify the installation:

```bash
# Check that the Ops Agent is running
sudo systemctl status google-cloud-ops-agent

# Check the agent version
dpkg -l google-cloud-ops-agent | grep google-cloud-ops-agent
```

For automated deployments, you can install it via a startup script:

```bash
#!/bin/bash
# Startup script to install Ops Agent on boot
curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
bash add-google-cloud-ops-agent-repo.sh --also-install
```

## Step 2: Understand the Configuration Structure

The Ops Agent configuration lives in `/etc/google-cloud-ops-agent/config.yaml`. The default configuration collects standard system metrics and system logs. To add custom metrics, you extend this file.

The configuration uses the same building blocks for metrics and logging:

```yaml
# /etc/google-cloud-ops-agent/config.yaml
metrics:
  receivers:
    # Define where metrics come from
  processors:
    # Define how metrics are transformed
  service:
    pipelines:
      # Connect receivers to processors

logging:
  receivers:
    # Define log sources
  processors:
    # Define log transformations
  service:
    pipelines:
      # Connect log receivers to processors
```

## Step 3: Expose Custom Metrics from Your Application

Before the Ops Agent can collect custom metrics, your application needs to expose them. The most common approach is to use a Prometheus-compatible metrics endpoint.

Here is a Python Flask application that exposes custom metrics:

```python
from flask import Flask
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST

app = Flask(__name__)

# Define custom metrics
REQUEST_COUNT = Counter(
    'app_requests_total',
    'Total number of requests',
    ['method', 'endpoint', 'status']
)

REQUEST_LATENCY = Histogram(
    'app_request_duration_seconds',
    'Request latency in seconds',
    ['endpoint'],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

ACTIVE_CONNECTIONS = Gauge(
    'app_active_connections',
    'Number of active connections'
)

QUEUE_DEPTH = Gauge(
    'app_queue_depth',
    'Current depth of the processing queue'
)

@app.route('/metrics')
def metrics():
    """Expose Prometheus-formatted metrics for the Ops Agent to scrape."""
    return generate_latest(), 200, {'Content-Type': CONTENT_TYPE_LATEST}

@app.route('/api/data')
def get_data():
    """Example API endpoint that records custom metrics."""
    ACTIVE_CONNECTIONS.inc()
    with REQUEST_LATENCY.labels(endpoint='/api/data').time():
        # Your application logic here
        result = {"data": "example"}
    REQUEST_COUNT.labels(method='GET', endpoint='/api/data', status='200').inc()
    ACTIVE_CONNECTIONS.dec()
    return result
```

## Step 4: Configure the Ops Agent to Scrape Prometheus Metrics

Now configure the Ops Agent to scrape the Prometheus endpoint your application exposes:

```yaml
# /etc/google-cloud-ops-agent/config.yaml
metrics:
  receivers:
    # Keep the default host metrics receiver
    hostmetrics:
      type: hostmetrics

    # Add a Prometheus receiver for custom app metrics
    prometheus_app:
      type: prometheus
      config:
        scrape_configs:
          - job_name: 'my-application'
            scrape_interval: 15s
            static_configs:
              - targets: ['localhost:5000']
            metrics_path: '/metrics'

  service:
    pipelines:
      default_pipeline:
        receivers:
          - hostmetrics
      app_pipeline:
        receivers:
          - prometheus_app

logging:
  receivers:
    syslog:
      type: files
      include_paths:
        - /var/log/syslog
  service:
    pipelines:
      default_pipeline:
        receivers:
          - syslog
```

After editing the configuration, restart the Ops Agent:

```bash
# Restart the Ops Agent to pick up configuration changes
sudo systemctl restart google-cloud-ops-agent

# Check for configuration errors in the agent logs
sudo journalctl -u google-cloud-ops-agent -n 20 --no-pager
```

## Step 5: Collect StatsD Metrics

The Ops Agent does not have a native StatsD receiver. If your application uses StatsD, run a StatsD-to-Prometheus exporter on the VM and configure the Ops Agent to scrape the exporter's Prometheus endpoint:

```yaml
# Scrape a StatsD exporter with the Ops Agent Prometheus receiver
metrics:
  receivers:
    hostmetrics:
      type: hostmetrics
    statsd_exporter:
      type: prometheus
      config:
        scrape_configs:
          - job_name: 'statsd-exporter'
            scrape_interval: 15s
            static_configs:
              - targets: ['localhost:9102']
  service:
    pipelines:
      default_pipeline:
        receivers:
          - hostmetrics
      statsd_pipeline:
        receivers:
          - statsd_exporter
```

Then send metrics from your application to the exporter using any StatsD client:

```python
import statsd

# Create a StatsD client pointing to localhost
client = statsd.StatsClient('localhost', 8125, prefix='myapp')

# Record different types of metrics
client.incr('requests.total')          # Counter
client.timing('request.latency', 42)   # Timer in milliseconds
client.gauge('connections.active', 15) # Gauge
```

## Step 6: Collect JMX Metrics for Java Applications

For Java applications, the Ops Agent has a built-in JVM receiver that collects metrics from a JMX endpoint:

```yaml
# Configure JMX metrics collection for a Java application
metrics:
  receivers:
    hostmetrics:
      type: hostmetrics
    jmx_app:
      type: jvm
      endpoint: localhost:9999
  service:
    pipelines:
      default_pipeline:
        receivers:
          - hostmetrics
      jmx_pipeline:
        receivers:
          - jmx_app
```

Make sure your Java application has JMX enabled:

```bash
# Start Java application with JMX remote access enabled
java -Dcom.sun.management.jmxremote \
     -Dcom.sun.management.jmxremote.port=9999 \
     -Dcom.sun.management.jmxremote.rmi.port=9999 \
     -Dcom.sun.management.jmxremote.authenticate=false \
     -Dcom.sun.management.jmxremote.ssl=false \
     -jar myapp.jar
```

## Step 7: View Custom Metrics in Cloud Monitoring

Once the Ops Agent is collecting your custom metrics, Prometheus-scraped metrics appear in Cloud Monitoring under the `prometheus.googleapis.com` namespace. JVM integration metrics appear under the `workload.googleapis.com/jvm.*` namespace.

To find your metrics in the Cloud Console, go to Monitoring and then Metrics Explorer. Search for your metric name, such as `prometheus.googleapis.com/app_requests_total/counter`.

You can also query metrics using the Cloud Monitoring API:

```bash
# Query a custom metric from Cloud Monitoring
PROJECT_ID="my-project"
START_TIME=$(date -u -d '-1 hour' +%Y-%m-%dT%H:%M:%SZ)
END_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)

curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  --get "https://monitoring.googleapis.com/v3/projects/${PROJECT_ID}/timeSeries" \
  --data-urlencode 'filter=metric.type="prometheus.googleapis.com/app_requests_total/counter"' \
  --data-urlencode "interval.startTime=${START_TIME}" \
  --data-urlencode "interval.endTime=${END_TIME}"
```

## Step 8: Create Alerting Policies

Set up alerts on your custom metrics to get notified when something goes wrong:

```bash
# Create an alerting policy for high request latency
cat > high-latency-policy.yaml <<'EOF'
displayName: High Request Latency
combiner: OR
conditions:
  - displayName: P95 latency above 500ms
    conditionPrometheusQueryLanguage:
      query: |
        histogram_quantile(0.95, sum by (le) (rate(app_request_duration_seconds_bucket[5m]))) > 0.5
      duration: 300s
notificationChannels:
  - projects/my-project/notificationChannels/12345
EOF

gcloud monitoring policies create --policy-from-file=high-latency-policy.yaml
```

## Troubleshooting

If metrics are not showing up in Cloud Monitoring, check these things:

```bash
# Verify the Ops Agent is running without errors
sudo systemctl status google-cloud-ops-agent

# Check agent logs for scraping errors
sudo journalctl -u google-cloud-ops-agent -f | grep -i error

# Verify your application's metrics endpoint is accessible
curl http://localhost:5000/metrics

# Check Ops Agent health-check logs
sudo journalctl -u google-cloud-ops-agent"*"
```

Also make sure the VM's service account has the `roles/monitoring.metricWriter` IAM role, otherwise the agent cannot send metrics to Cloud Monitoring.

Custom metrics through the Ops Agent give you visibility into what your application is actually doing, not just what the underlying infrastructure looks like. Pair them with dashboards and alerting policies, and you have a solid observability setup without needing to run your own Prometheus server.
