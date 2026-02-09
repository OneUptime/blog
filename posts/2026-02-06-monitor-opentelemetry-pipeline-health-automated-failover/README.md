# How to Monitor OpenTelemetry Pipeline Health and Trigger Automated Failover on Degradation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Pipeline Health, Automated Failover, Monitoring

Description: Set up comprehensive health monitoring for your OpenTelemetry pipeline and configure automated failover when performance degrades beyond acceptable thresholds.

Your observability pipeline is infrastructure too. It needs monitoring just like any other critical system. When the pipeline that collects your metrics, traces, and logs starts degrading, you need to know immediately and you need automated responses in place.

This post covers how to instrument your OpenTelemetry Collector for health monitoring, define meaningful health thresholds, and trigger automated failover when things go wrong.

## The Collector's Built-in Health Signals

The OpenTelemetry Collector exposes internal telemetry through a Prometheus-compatible endpoint on port 8888 by default. These metrics tell you everything about pipeline health.

Enable the health check extension and telemetry endpoint in your collector config:

```yaml
# collector-health-config.yaml
# Enable the health_check extension for liveness/readiness probes
# and the zpages extension for debugging. The telemetry section
# configures the Prometheus metrics endpoint.

extensions:
  health_check:
    endpoint: "0.0.0.0:13133"
    path: "/health"
    check_collector_pipeline:
      enabled: true
      exporter_failure_threshold: 5  # mark unhealthy after 5 consecutive export failures
  zpages:
    endpoint: "0.0.0.0:55679"

service:
  telemetry:
    metrics:
      level: detailed    # expose all internal metrics
      address: "0.0.0.0:8888"
  extensions: [health_check, zpages]
```

The `check_collector_pipeline` option is important. It ties the health endpoint response to actual pipeline health, not just whether the process is running. After 5 consecutive export failures, the health endpoint returns unhealthy, which lets your load balancer or orchestrator react.

## Key Metrics to Watch

Not all collector metrics are equally useful for health monitoring. Focus on these:

```yaml
# prometheus-alerts.yaml
# Alert rules for OpenTelemetry Collector pipeline health.
# Each rule targets a specific failure mode with appropriate thresholds.

groups:
  - name: otel-pipeline-health
    rules:
      # Export failure rate - the most direct indicator of pipeline health
      - alert: HighExportFailureRate
        expr: >
          rate(otelcol_exporter_send_failed_spans_total[5m])
          / (rate(otelcol_exporter_sent_spans_total[5m]) + rate(otelcol_exporter_send_failed_spans_total[5m]))
          > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "More than 5% of spans failing to export"

      # Queue saturation - data loss is imminent
      - alert: ExporterQueueSaturation
        expr: >
          otelcol_exporter_queue_size
          / otelcol_exporter_queue_capacity
          > 0.85
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Exporter queue above 85% capacity"

      # Receiver backpressure - upstream clients are being rejected
      - alert: ReceiverRefusingData
        expr: rate(otelcol_receiver_refused_spans_total[5m]) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Collector is refusing incoming spans"

      # Memory pressure - collector approaching OOM
      - alert: CollectorHighMemory
        expr: >
          otelcol_process_memory_rss
          / otelcol_process_runtime_total_alloc_bytes
          > 0.80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Collector memory usage above 80%"
```

## Automated Failover with a Health-Based Controller

For environments where you need tighter control than the built-in failover connector provides, you can build a lightweight controller that monitors pipeline health and triggers configuration switches:

```python
# failover_controller.py
# Monitors the collector's health endpoint and internal metrics.
# When the primary pipeline degrades beyond thresholds, it switches
# the collector configuration to route data to a secondary backend.

import requests
import subprocess
import time
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

HEALTH_ENDPOINT = "http://localhost:13133/health"
METRICS_ENDPOINT = "http://localhost:8888/metrics"
FAILOVER_THRESHOLD = 3       # consecutive unhealthy checks before failover
RECOVERY_THRESHOLD = 5       # consecutive healthy checks before recovery
CHECK_INTERVAL = 10          # seconds between checks

CONFIG_PRIMARY = "/etc/otelcol/config-primary.yaml"
CONFIG_SECONDARY = "/etc/otelcol/config-secondary.yaml"

class FailoverController:
    def __init__(self):
        self.unhealthy_count = 0
        self.healthy_count = 0
        self.current_mode = "primary"

    def check_health(self):
        try:
            resp = requests.get(HEALTH_ENDPOINT, timeout=5)
            if resp.status_code != 200:
                return False
        except requests.RequestException:
            return False

        # Also check export failure rate from metrics
        try:
            metrics = requests.get(METRICS_ENDPOINT, timeout=5).text
            failed = self._parse_metric(metrics, "otelcol_exporter_send_failed_spans_total")
            sent = self._parse_metric(metrics, "otelcol_exporter_sent_spans_total")
            if sent > 0 and (failed / sent) > 0.10:
                return False
        except Exception:
            pass

        return True

    def _parse_metric(self, text, name):
        for line in text.split('\n'):
            if line.startswith(name) and not line.startswith('#'):
                return float(line.split()[-1])
        return 0

    def switch_config(self, mode):
        config = CONFIG_PRIMARY if mode == "primary" else CONFIG_SECONDARY
        logger.info(f"Switching to {mode} configuration: {config}")
        # Copy config and send SIGHUP to collector
        subprocess.run(["cp", config, "/etc/otelcol/config.yaml"], check=True)
        subprocess.run(["pkill", "-HUP", "otelcol"], check=True)
        self.current_mode = mode

    def run(self):
        logger.info("Failover controller started")
        while True:
            healthy = self.check_health()

            if not healthy:
                self.unhealthy_count += 1
                self.healthy_count = 0
                logger.warning(f"Unhealthy check ({self.unhealthy_count}/{FAILOVER_THRESHOLD})")

                if self.unhealthy_count >= FAILOVER_THRESHOLD and self.current_mode == "primary":
                    self.switch_config("secondary")
                    self.unhealthy_count = 0
            else:
                self.healthy_count += 1
                self.unhealthy_count = 0

                if self.healthy_count >= RECOVERY_THRESHOLD and self.current_mode == "secondary":
                    self.switch_config("primary")
                    self.healthy_count = 0

            time.sleep(CHECK_INTERVAL)

if __name__ == "__main__":
    controller = FailoverController()
    controller.run()
```

## Kubernetes-Native Failover

If you run on Kubernetes, you can use the collector's health endpoint with a custom readiness probe to remove unhealthy collector instances from your service:

```yaml
# collector-service.yaml
# The Service only routes traffic to collectors that pass readiness checks.
# If a collector's pipeline is degraded, it gets removed from the service
# endpoints and stops receiving new telemetry.

apiVersion: v1
kind: Service
metadata:
  name: otel-collector
  namespace: monitoring
spec:
  selector:
    app: otel-collector
  ports:
    - name: otlp-grpc
      port: 4317
      targetPort: 4317
    - name: otlp-http
      port: 4318
      targetPort: 4318
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: monitoring
spec:
  replicas: 3
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:latest
          readinessProbe:
            httpGet:
              path: /health
              port: 13133
            initialDelaySeconds: 10
            periodSeconds: 10
            failureThreshold: 3
          livenessProbe:
            httpGet:
              path: /health
              port: 13133
            initialDelaySeconds: 15
            periodSeconds: 15
            failureThreshold: 5
```

The readiness probe is more aggressive than the liveness probe on purpose. You want to stop sending traffic to a degraded collector quickly (3 checks at 10-second intervals), but you want to give it more time to recover before killing and restarting it (5 checks at 15-second intervals).

## Dashboarding Pipeline Health

Build a dashboard that gives your team immediate visibility into pipeline state. The essential panels are:

- **Export success rate** over time (should stay above 99%)
- **Queue utilization** as a percentage of capacity
- **Data throughput** in spans/sec, data points/sec, and log records/sec
- **Active collector instances** vs desired count
- **Current pipeline mode** (primary vs failover)

This dashboard becomes your first stop during any incident. If the pipeline itself is degraded, everything else you see in your other dashboards might be incomplete or misleading.

Monitoring your monitoring might sound redundant, but it is essential. The failure mode where your telemetry pipeline silently drops data is far worse than a noisy failure that triggers alerts. Invest in health checks, set thresholds based on your SLOs, and automate the response. Manual failover at 3 AM is not a plan.
