# How to Monitor cert-manager Certificate Expiration, Issuance Latency, and Renewal Events with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, cert-manager, TLS Certificates, Kubernetes, Monitoring

Description: Monitor cert-manager certificate expiration, issuance latency, and renewal events using the OpenTelemetry Collector in Kubernetes.

cert-manager automates TLS certificate management in Kubernetes. When it fails silently, you find out the hard way: your services start throwing TLS errors because certificates expired. Monitoring cert-manager metrics with the OpenTelemetry Collector gives you advance warning of expiring certificates, slow issuance, and failed renewals.

## cert-manager Metrics

cert-manager exposes Prometheus metrics on port 9402 by default. The key metrics include:

### Certificate Status
- `certmanager_certificate_ready_status` - Whether certificates are in a ready state (1 = ready, 0 = not ready)
- `certmanager_certificate_expiration_timestamp_seconds` - Unix timestamp of certificate expiration

### Issuance Performance
- `certmanager_controller_sync_call_count` - Number of sync operations by controller
- `certmanager_http_acme_client_request_count` - ACME client request count
- `certmanager_http_acme_client_request_duration_seconds` - ACME client request latency

### Renewal
- `certmanager_certificate_renewal_timestamp_seconds` - When the next renewal is scheduled

## Collector Configuration

```yaml
receivers:
  prometheus/cert-manager:
    config:
      scrape_configs:
        - job_name: "cert-manager"
          scrape_interval: 30s
          kubernetes_sd_configs:
            - role: pod
              namespaces:
                names: ["cert-manager"]
          relabel_configs:
            # Keep only cert-manager controller pods
            - source_labels: [__meta_kubernetes_pod_label_app_kubernetes_io_name]
              action: keep
              regex: "cert-manager"
            - source_labels: [__meta_kubernetes_pod_label_app_kubernetes_io_component]
              action: keep
              regex: "controller"
            # Target the metrics port
            - source_labels: [__meta_kubernetes_pod_ip]
              target_label: __address__
              replacement: "$1:9402"
            - source_labels: [__meta_kubernetes_pod_name]
              target_label: pod

processors:
  resource/cert-manager:
    attributes:
      - key: service.name
        value: "cert-manager"
        action: upsert

  filter/cert-manager:
    metrics:
      include:
        match_type: regexp
        metric_names:
          - "certmanager_certificate_.*"
          - "certmanager_controller_.*"
          - "certmanager_http_acme_.*"

  batch:
    timeout: 15s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    metrics:
      receivers: [prometheus/cert-manager]
      processors: [resource/cert-manager, filter/cert-manager, batch]
      exporters: [otlp]
```

## Computing Time Until Expiration

The raw `certmanager_certificate_expiration_timestamp_seconds` metric is a Unix timestamp. To create a "time until expiration" metric, handle this in your backend queries. However, you can add useful labels at the Collector level:

```yaml
processors:
  transform/expiration:
    metric_statements:
      - context: datapoint
        statements:
          # Tag certificates by their namespace and name for easier querying
          - set(attributes["cert.namespace"], attributes["namespace"]) where metric.name == "certmanager_certificate_expiration_timestamp_seconds"
          - set(attributes["cert.name"], attributes["name"]) where metric.name == "certmanager_certificate_expiration_timestamp_seconds"
```

## Monitoring Certificate Ready Status

The `certmanager_certificate_ready_status` metric is the most direct indicator of certificate health:

```yaml
# A value of 1 means the certificate is ready and valid
# A value of 0 means the certificate is not ready (expired, pending, or failed)

# Alert when any certificate is not ready:
# certmanager_certificate_ready_status{condition="True"} == 0

# In your backend, query:
# certmanager_certificate_ready_status{condition="True"} == 0
# This gives you the name and namespace of problematic certificates
```

## Full Configuration with Static Targets

If you prefer not to use Kubernetes service discovery:

```yaml
receivers:
  prometheus/cert-manager:
    config:
      scrape_configs:
        - job_name: "cert-manager"
          scrape_interval: 30s
          static_configs:
            - targets: ["cert-manager-controller.cert-manager.svc.cluster.local:9402"]

processors:
  resource/cert-manager:
    attributes:
      - key: service.name
        value: "cert-manager"
        action: upsert

  batch:
    timeout: 15s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    metrics:
      receivers: [prometheus/cert-manager]
      processors: [resource/cert-manager, batch]
      exporters: [otlp]
```

## Alerting on Certificate Issues

Set up these alerts for production safety:

```
# Critical: Certificate not ready
# certmanager_certificate_ready_status{condition="True"} == 0

# Warning: Certificate expiring within 14 days
# certmanager_certificate_expiration_timestamp_seconds - time() < 14 * 24 * 3600

# Warning: Certificate expiring within 7 days
# certmanager_certificate_expiration_timestamp_seconds - time() < 7 * 24 * 3600

# Critical: Certificate expiring within 24 hours
# certmanager_certificate_expiration_timestamp_seconds - time() < 24 * 3600

# Warning: ACME client request failures
# rate(certmanager_http_acme_client_request_count{status_code!="200"}) > 0

# Warning: High ACME request latency (issuance slow)
# certmanager_http_acme_client_request_duration_seconds p99 > 30
```

## Monitoring cert-manager Webhook

cert-manager also runs a webhook server. Its metrics are important for cluster stability:

```yaml
scrape_configs:
  - job_name: "cert-manager-webhook"
    scrape_interval: 30s
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names: ["cert-manager"]
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app_kubernetes_io_component]
        action: keep
        regex: "webhook"
      - source_labels: [__meta_kubernetes_pod_ip]
        target_label: __address__
        replacement: "$1:9402"
```

## Monitoring Multiple Issuers

If you have multiple cert-manager issuers (Let's Encrypt staging and production, internal CA), the metrics include issuer labels:

```yaml
# Filter for specific issuer types
processors:
  transform/issuers:
    metric_statements:
      - context: datapoint
        statements:
          - set(attributes["issuer.type"], "letsencrypt-prod") where attributes["issuer_name"] == "letsencrypt-production"
          - set(attributes["issuer.type"], "letsencrypt-staging") where attributes["issuer_name"] == "letsencrypt-staging"
          - set(attributes["issuer.type"], "internal-ca") where attributes["issuer_name"] == "internal-ca"
```

Certificate monitoring is one of those things that seems unnecessary until you experience a certificate expiration outage at 2 AM. With the OpenTelemetry Collector scraping cert-manager metrics, you get early warning and can prevent these incidents entirely.
