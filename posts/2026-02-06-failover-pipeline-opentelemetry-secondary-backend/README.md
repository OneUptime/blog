# How to Build a Failover Pipeline That Routes OpenTelemetry Data to a Secondary Backend on Outage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Failover, Pipeline, High Availability

Description: Build a resilient OpenTelemetry pipeline that automatically routes telemetry to a secondary backend when the primary becomes unavailable.

A single-backend observability pipeline is a single point of failure. When your primary backend goes down, you lose telemetry data exactly when you need it most - during incidents. Building a failover pipeline that automatically routes OpenTelemetry data to a secondary backend is one of the most practical reliability improvements you can make.

This post walks through a concrete setup using the OpenTelemetry Collector to achieve automatic failover between two backends.

## The Architecture

The approach is straightforward. You configure two exporters in the collector - one for your primary backend and one for your secondary. You then use the `failover` connector or routing logic to direct data to the secondary when the primary is unhealthy.

In simpler setups, you can use the `sending_queue` and `retry_on_failure` settings aggressively on the primary exporter and configure the secondary exporter through a separate pipeline that activates based on health check results.

## Configuring Dual Exporters

Start by defining both backends as separate OTLP exporters in your collector config:

```yaml
# collector-config.yaml
# Define two OTLP exporters - primary and secondary.
# The primary has aggressive retry settings. The secondary is a standby
# that receives data when the primary pipeline is unhealthy.

exporters:
  otlp/primary:
    endpoint: "primary-backend.example.com:4317"
    tls:
      insecure: false
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 10000
      storage: file_storage/primary_queue

  otlp/secondary:
    endpoint: "secondary-backend.example.com:4317"
    tls:
      insecure: false
    retry_on_failure:
      enabled: true
      initial_interval: 2s
      max_interval: 15s
      max_elapsed_time: 60s
    sending_queue:
      enabled: true
      num_consumers: 5
      queue_size: 5000
```

## Using the Failover Connector

The OpenTelemetry Collector Contrib distribution includes a `failover` connector that handles automatic routing between exporters based on health. Here is how to wire it up:

```yaml
# failover-config.yaml
# The failover connector sends data to exporters in priority order.
# It monitors export success rates and switches to the next exporter
# when the current one fails beyond the configured threshold.

connectors:
  failover/traces:
    priority_levels:
      - [otlp/primary]
      - [otlp/secondary]
    retry_interval: 30s      # how often to check if primary is back
    retry_gap: 10s            # minimum gap between retry attempts
    max_retries: 0            # 0 means keep retrying indefinitely

  failover/metrics:
    priority_levels:
      - [otlp/primary]
      - [otlp/secondary]
    retry_interval: 30s
    retry_gap: 10s
    max_retries: 0

service:
  pipelines:
    traces/ingress:
      receivers: [otlp]
      processors: [batch]
      exporters: [failover/traces]
    traces/primary:
      receivers: [failover/traces]
      exporters: [otlp/primary]
    traces/secondary:
      receivers: [failover/traces]
      exporters: [otlp/secondary]

    metrics/ingress:
      receivers: [otlp]
      processors: [batch]
      exporters: [failover/metrics]
    metrics/primary:
      receivers: [failover/metrics]
      exporters: [otlp/primary]
    metrics/secondary:
      receivers: [failover/metrics]
      exporters: [otlp/secondary]
```

When the primary exporter starts failing, the failover connector detects the errors and begins routing data to the secondary. It periodically checks whether the primary has recovered and switches back when it has.

## Alternative: Fan-Out with Load Balancing

If your secondary backend can handle the full load all the time, a simpler approach is to fan out data to both backends simultaneously and use the secondary as a hot standby:

```yaml
# fan-out-config.yaml
# Send data to both backends simultaneously. This gives you zero data loss
# during failover because the secondary already has all the data.
# The tradeoff is double the egress bandwidth and storage cost.

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/primary, otlp/secondary]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/primary, otlp/secondary]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/primary, otlp/secondary]
```

This is expensive but simple. You always have a complete copy of your data in both backends. If one goes down, you just point your dashboards and alerts at the other.

## Adding Health Check Logic

For setups where you want more control over failover decisions, you can use an external health checker that rewrites the collector configuration:

```python
# health_check_failover.py
# This script checks the primary backend health endpoint every 30 seconds.
# If the primary is down, it writes a collector config that routes to the
# secondary and sends SIGHUP to the collector to reload configuration.

import requests
import time
import os
import signal
import shutil

PRIMARY_HEALTH_URL = "https://primary-backend.example.com/health"
COLLECTOR_PID_FILE = "/var/run/otelcol/pid"
CONFIG_PRIMARY = "/etc/otelcol/config-primary.yaml"
CONFIG_SECONDARY = "/etc/otelcol/config-secondary.yaml"
CONFIG_ACTIVE = "/etc/otelcol/config.yaml"

def check_primary_health():
    try:
        resp = requests.get(PRIMARY_HEALTH_URL, timeout=5)
        return resp.status_code == 200
    except requests.RequestException:
        return False

def reload_collector():
    with open(COLLECTOR_PID_FILE, 'r') as f:
        pid = int(f.read().strip())
    os.kill(pid, signal.SIGHUP)

def switch_config(config_source):
    shutil.copy2(config_source, CONFIG_ACTIVE)
    reload_collector()

current_mode = "primary"
consecutive_failures = 0

while True:
    healthy = check_primary_health()

    if healthy and current_mode == "secondary":
        print("Primary is back. Switching to primary config.")
        switch_config(CONFIG_PRIMARY)
        current_mode = "primary"
        consecutive_failures = 0
    elif not healthy:
        consecutive_failures += 1
        # Wait for 3 consecutive failures before switching
        if consecutive_failures >= 3 and current_mode == "primary":
            print("Primary down. Switching to secondary config.")
            switch_config(CONFIG_SECONDARY)
            current_mode = "secondary"

    time.sleep(30)
```

## Testing Your Failover

Before trusting your failover pipeline, test it. Block network access to the primary backend at the firewall level and observe what happens:

```bash
# Block traffic to the primary backend to simulate an outage.
# Watch the collector logs to confirm it switches to the secondary.
iptables -A OUTPUT -d primary-backend.example.com -j DROP

# Monitor collector logs for failover events
journalctl -u otel-collector -f | grep -i "failover\|retry\|error"

# After verifying failover works, restore connectivity
iptables -D OUTPUT -d primary-backend.example.com -j DROP
```

Watch for three things during the test: data appearing in the secondary backend, no gaps in the data timeline, and a clean switch back to primary once connectivity is restored. If any of those fail, adjust your retry intervals and failure thresholds accordingly.

## Key Takeaways

Always run at least two backend targets for production observability. Use the failover connector for automatic routing, or fan-out to both backends if your budget allows. Test failover regularly and monitor the collector's internal health metrics so you know when a switch happens. The worst time to discover your failover does not work is during a real outage.
