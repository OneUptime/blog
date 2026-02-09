# How to Monitor SSL/TLS Certificate Expiration Across Services with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, SSL, TLS, Certificate Monitoring, Security

Description: Use the OpenTelemetry Collector to monitor SSL/TLS certificate expiration dates across all your services and alert before certificates expire.

Expired certificates cause outages. It does not matter how many nines your infrastructure achieves if a forgotten certificate expires on a Friday night and takes down your API gateway. Certificate monitoring is one of those things that teams set up after getting burned, but with the OpenTelemetry Collector, you can build it into your existing observability pipeline without any additional tooling.

## The Problem with Certificate Management

Most organizations manage certificates across dozens of services - API gateways, load balancers, internal services with mTLS, third-party integrations. Some are managed by cert-manager in Kubernetes, some are provisioned through AWS Certificate Manager, and some were manually created two years ago by an engineer who has since left the company.

Without active monitoring, the only notification you get is the browser warning or connection failure when a certificate expires.

## Using the HTTP Check Receiver for Certificate Monitoring

The OpenTelemetry Collector's `httpcheck` receiver already connects to HTTPS endpoints, which means it performs TLS handshakes. By default, it reports whether the connection succeeded, but you can extract certificate metadata by combining it with custom processing.

However, for dedicated certificate monitoring, the Collector Contrib distribution includes more direct approaches. Here is a setup that monitors certificate expiration for all your HTTPS endpoints:

```yaml
# collector-cert-monitor.yaml
# Monitor SSL/TLS certificate expiration for all public and internal endpoints.
# The httpcheck receiver connects via TLS and we track certificate-related
# connection metrics. Combine with a script-based approach for detailed cert info.

receivers:
  httpcheck/certs:
    targets:
      - endpoint: "https://api.example.com"
        method: GET
      - endpoint: "https://web.example.com"
        method: GET
      - endpoint: "https://auth.example.com"
        method: GET
      - endpoint: "https://payments.example.com"
        method: GET
      - endpoint: "https://partner-api.example.com"
        method: GET
      - endpoint: "https://internal-service.corp:8443"
        method: GET
        tls:
          ca_file: "/etc/ssl/certs/internal-ca.pem"
    collection_interval: 3600s    # check every hour - certs do not change often

processors:
  resource:
    attributes:
      - key: monitor.type
        value: "certificate_check"
        action: upsert

  batch:
    timeout: 10s

exporters:
  otlp:
    endpoint: "backend.example.com:4317"

service:
  pipelines:
    metrics:
      receivers: [httpcheck/certs]
      processors: [resource, batch]
      exporters: [otlp]
```

## Dedicated Certificate Expiration Checker

For precise certificate expiration tracking, use a custom script that connects to each endpoint, extracts the certificate, and pushes the expiration date as an OpenTelemetry metric:

```python
# cert_expiry_monitor.py
# Connects to each endpoint, extracts the TLS certificate, and reports
# the number of days until expiration as an OpenTelemetry gauge metric.
# Run this as a sidecar or cron job alongside your collector.

import ssl
import socket
import time
from datetime import datetime, timezone
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader

# OTLP exporter pointing to the local collector
exporter = OTLPMetricExporter(endpoint="localhost:4317", insecure=True)
reader = PeriodicExportingMetricReader(exporter, export_interval_millis=60000)
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter("certificate.monitor")
days_until_expiry = meter.create_gauge(
    "tls.certificate.days_until_expiry",
    unit="days",
    description="Number of days until the TLS certificate expires"
)
cert_check_errors = meter.create_counter(
    "tls.certificate.check_errors",
    description="Number of certificate check failures"
)

# List of endpoints to monitor
ENDPOINTS = [
    {"host": "api.example.com", "port": 443},
    {"host": "web.example.com", "port": 443},
    {"host": "auth.example.com", "port": 443},
    {"host": "payments.example.com", "port": 443},
    {"host": "partner-api.example.com", "port": 443},
    {"host": "internal-service.corp", "port": 8443},
]

def check_certificate(host, port):
    """Connect to the host and return the certificate expiration date."""
    context = ssl.create_default_context()
    try:
        with socket.create_connection((host, port), timeout=10) as sock:
            with context.wrap_socket(sock, server_hostname=host) as ssock:
                cert = ssock.getpeercert()
                expiry_str = cert['notAfter']
                # Parse the expiry date - format is 'Mon DD HH:MM:SS YYYY GMT'
                expiry_date = datetime.strptime(expiry_str, '%b %d %H:%M:%S %Y %Z')
                expiry_date = expiry_date.replace(tzinfo=timezone.utc)
                now = datetime.now(timezone.utc)
                remaining = (expiry_date - now).days
                return remaining, cert.get('subject', ''), cert.get('issuer', '')
    except Exception as e:
        print(f"Error checking {host}:{port} - {e}")
        return None, None, None

def run_checks():
    for endpoint in ENDPOINTS:
        host = endpoint["host"]
        port = endpoint["port"]
        remaining, subject, issuer = check_certificate(host, port)

        attrs = {
            "server.address": host,
            "server.port": str(port),
        }

        if remaining is not None:
            days_until_expiry.set(remaining, attrs)
            print(f"{host}:{port} - certificate expires in {remaining} days")
        else:
            cert_check_errors.add(1, attrs)
            print(f"{host}:{port} - failed to check certificate")

# Run checks every hour
while True:
    run_checks()
    time.sleep(3600)
```

## Alert Rules for Certificate Expiration

Different expiration windows need different urgency levels. Here are alert rules that give your team time to act:

```yaml
# cert-expiry-alerts.yaml
# Progressive alerting based on days until certificate expiration.
# Start warning at 30 days, escalate as the deadline approaches.

groups:
  - name: tls-certificate-expiration
    rules:
      # 30-day warning - time to plan renewal
      - alert: CertificateExpiringSoon
        expr: tls_certificate_days_until_expiry < 30 and tls_certificate_days_until_expiry >= 14
        for: 1h
        labels:
          severity: info
          routing: slack
        annotations:
          summary: "Certificate for {{ $labels.server_address }} expires in {{ $value }} days"
          description: "Plan certificate renewal. Expiration is within 30 days."

      # 14-day warning - renewal should be in progress
      - alert: CertificateExpiringWarning
        expr: tls_certificate_days_until_expiry < 14 and tls_certificate_days_until_expiry >= 7
        for: 1h
        labels:
          severity: warning
          routing: slack
        annotations:
          summary: "Certificate for {{ $labels.server_address }} expires in {{ $value }} days"
          description: "Certificate renewal should be underway. Escalate if not."

      # 7-day critical - immediate action required
      - alert: CertificateExpiringCritical
        expr: tls_certificate_days_until_expiry < 7 and tls_certificate_days_until_expiry >= 1
        for: 30m
        labels:
          severity: critical
          routing: pagerduty
        annotations:
          summary: "URGENT: Certificate for {{ $labels.server_address }} expires in {{ $value }} days"
          description: "Renew immediately to prevent outage."

      # Already expired
      - alert: CertificateExpired
        expr: tls_certificate_days_until_expiry <= 0
        for: 5m
        labels:
          severity: critical
          routing: pagerduty
        annotations:
          summary: "EXPIRED: Certificate for {{ $labels.server_address }} has expired"
          description: "This is causing or will cause service disruptions."

      # Check failure - we cannot even verify the certificate
      - alert: CertificateCheckFailed
        expr: rate(tls_certificate_check_errors_total[1h]) > 0
        for: 2h
        labels:
          severity: warning
        annotations:
          summary: "Cannot check certificate for {{ $labels.server_address }}"
          description: "Certificate monitoring is failing. Connection or DNS issues likely."
```

## Integrating with cert-manager

If you use cert-manager in Kubernetes, it already exposes certificate metrics. You can scrape those directly with the OpenTelemetry Collector's Prometheus receiver:

```yaml
# collector-certmanager.yaml
# Scrape cert-manager's Prometheus metrics to get certificate
# expiration data for all Kubernetes-managed certificates.

receivers:
  prometheus/certmanager:
    config:
      scrape_configs:
        - job_name: 'cert-manager'
          scrape_interval: 300s
          kubernetes_sd_configs:
            - role: pod
              namespaces:
                names: ['cert-manager']
          relabel_configs:
            - source_labels: [__meta_kubernetes_pod_label_app]
              regex: cert-manager
              action: keep
            - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
              target_label: __address__
              regex: (.+)
              replacement: "${1}:9402"

exporters:
  otlp:
    endpoint: "backend.example.com:4317"

service:
  pipelines:
    metrics:
      receivers: [prometheus/certmanager]
      processors: [batch]
      exporters: [otlp]
```

cert-manager exposes `certmanager_certificate_expiration_timestamp_seconds` which gives you the exact expiration time for every certificate it manages. This covers your Kubernetes certificates while the custom script covers everything else.

## Building a Certificate Inventory Dashboard

Your certificate monitoring dashboard should show:

- **Certificate inventory table** - all monitored certificates with their expiration dates, sorted by soonest expiration
- **Days until expiration histogram** - distribution of certificate lifetimes
- **Certificates by issuer** - group by CA to track which providers manage which certificates
- **Check failures** - endpoints where certificate monitoring itself is failing
- **Historical renewal timeline** - when certificates were last renewed (detected by expiration date changes)

This dashboard becomes your single source of truth for certificate lifecycle management. When someone asks "are any certificates expiring this month," you have the answer in seconds instead of running ad-hoc checks across every service.

Certificate monitoring is cheap insurance against one of the most preventable outage types. With OpenTelemetry, it plugs directly into the pipeline you already run, uses the alerting you already have, and shows up in the dashboards your team already watches. No excuses for letting a certificate expire unnoticed.
