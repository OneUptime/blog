# How to Set Up Uptime Monitoring for Services on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Uptime Monitoring, Kubernetes, Health Check, Blackbox Exporter, Prometheus

Description: Configure uptime monitoring for your services running on Talos Linux using Blackbox Exporter, Prometheus, and alerting rules.

---

Knowing that your Kubernetes pods are running is not the same as knowing that your services are actually working. A pod can be in a Running state while the application inside it is returning errors, timing out, or serving stale data. Uptime monitoring solves this by actively checking your services from the outside, the same way your users would access them. On Talos Linux, we can set up comprehensive uptime monitoring using the Prometheus Blackbox Exporter alongside health check probes. This guide covers both approaches.

## Internal vs External Monitoring

There are two perspectives for uptime monitoring:

**Internal monitoring** checks services from within the cluster. This tells you if a service is reachable and responding from the Kubernetes network. It catches application crashes, misconfigurations, and dependency failures.

**External monitoring** checks services from outside the cluster. This catches network issues, DNS problems, load balancer failures, and certificate expiration that internal monitoring would miss.

You need both. Internal monitoring is faster and more detailed. External monitoring reflects what your actual users experience.

## Step 1: Deploy Blackbox Exporter

Blackbox Exporter is a Prometheus component that probes endpoints over HTTP, HTTPS, TCP, DNS, and ICMP. It reports whether the probe succeeded, how long it took, and what SSL certificates look like.

```bash
# Add the Prometheus community Helm repo (if not already added)
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

Create a values file:

```yaml
# blackbox-exporter-values.yaml
config:
  modules:
    # HTTP probe with 5-second timeout
    http_2xx:
      prober: http
      timeout: 5s
      http:
        valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
        valid_status_codes: [200, 201, 202, 204]
        method: GET
        follow_redirects: true
        preferred_ip_protocol: ip4

    # HTTPS probe with certificate validation
    https_2xx:
      prober: http
      timeout: 5s
      http:
        valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
        valid_status_codes: [200]
        method: GET
        follow_redirects: true
        tls_config:
          insecure_skip_verify: false

    # TCP connectivity check
    tcp_connect:
      prober: tcp
      timeout: 5s

    # DNS resolution check
    dns_check:
      prober: dns
      timeout: 5s
      dns:
        query_name: "kubernetes.default.svc.cluster.local"
        query_type: "A"
        valid_rcodes:
          - NOERROR

    # HTTP POST probe for API endpoints
    http_post_2xx:
      prober: http
      timeout: 5s
      http:
        method: POST
        headers:
          Content-Type: application/json
        body: '{}'
        valid_status_codes: [200, 201, 202]

# Service monitor for Prometheus integration
serviceMonitor:
  enabled: true
  defaults:
    labels:
      release: prometheus-stack
```

Install Blackbox Exporter:

```bash
helm install blackbox-exporter prometheus-community/prometheus-blackbox-exporter \
  --namespace monitoring \
  --values blackbox-exporter-values.yaml
```

## Step 2: Configure Prometheus to Probe Your Services

Create a Prometheus scrape configuration or ServiceMonitor that uses Blackbox Exporter to probe your endpoints:

```yaml
# uptime-probes.yaml
apiVersion: monitoring.coreos.com/v1
kind: Probe
metadata:
  name: service-uptime-probes
  namespace: monitoring
  labels:
    release: prometheus-stack
spec:
  jobName: uptime-monitoring
  interval: 30s
  module: http_2xx
  prober:
    url: blackbox-exporter-prometheus-blackbox-exporter.monitoring.svc.cluster.local:9115
  targets:
    staticConfig:
      labels:
        monitoring_type: uptime
      static:
        # Internal service endpoints
        - http://frontend.default.svc.cluster.local/health
        - http://api-server.default.svc.cluster.local/healthz
        - http://payment-service.billing.svc.cluster.local/health
        # External endpoints (if reachable from cluster)
        - https://app.example.com
        - https://api.example.com/health
```

For more complex configurations, use additional scrape configs:

```yaml
# additional-scrape-config.yaml
apiVersion: v1
kind: Secret
metadata:
  name: uptime-scrape-configs
  namespace: monitoring
stringData:
  uptime-scrape.yaml: |
    - job_name: 'uptime-http'
      metrics_path: /probe
      params:
        module: [http_2xx]
      static_configs:
        - targets:
            - http://frontend.default.svc.cluster.local/health
            - http://api-server.default.svc.cluster.local/healthz
            - https://app.example.com
          labels:
            team: platform
        - targets:
            - http://payment-service.billing.svc.cluster.local/health
            - http://notification-service.comms.svc.cluster.local/health
          labels:
            team: backend
      relabel_configs:
        - source_labels: [__address__]
          target_label: __param_target
        - source_labels: [__param_target]
          target_label: instance
        - target_label: __address__
          replacement: blackbox-exporter-prometheus-blackbox-exporter.monitoring.svc.cluster.local:9115

    - job_name: 'uptime-tcp'
      metrics_path: /probe
      params:
        module: [tcp_connect]
      static_configs:
        - targets:
            - postgres.databases.svc.cluster.local:5432
            - redis.cache.svc.cluster.local:6379
            - rabbitmq.messaging.svc.cluster.local:5672
      relabel_configs:
        - source_labels: [__address__]
          target_label: __param_target
        - source_labels: [__param_target]
          target_label: instance
        - target_label: __address__
          replacement: blackbox-exporter-prometheus-blackbox-exporter.monitoring.svc.cluster.local:9115
```

Apply the configuration:

```bash
kubectl apply -f uptime-probes.yaml
kubectl apply -f additional-scrape-config.yaml
```

## Step 3: Create Uptime Alerts

Set up alerting rules for when probes fail:

```yaml
# uptime-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: uptime-alerts
  namespace: monitoring
  labels:
    release: prometheus-stack
spec:
  groups:
    - name: uptime-monitoring
      rules:
        # Alert when an HTTP endpoint is down
        - alert: ServiceDown
          expr: probe_success{job="uptime-monitoring"} == 0
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "Service {{ $labels.instance }} is down"
            description: "The endpoint {{ $labels.instance }} has been unreachable for more than 2 minutes."

        # Alert when response time is slow
        - alert: ServiceSlowResponse
          expr: probe_duration_seconds{job="uptime-monitoring"} > 3
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Service {{ $labels.instance }} is responding slowly"
            description: "The endpoint {{ $labels.instance }} has a response time of {{ $value }}s, which is above the 3s threshold."

        # Alert when SSL certificate is expiring soon
        - alert: SSLCertificateExpiringSoon
          expr: probe_ssl_earliest_cert_expiry - time() < 86400 * 30
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "SSL certificate for {{ $labels.instance }} expires in less than 30 days"
            description: "The SSL certificate for {{ $labels.instance }} will expire in {{ $value | humanizeDuration }}."

        # Alert when SSL certificate is about to expire
        - alert: SSLCertificateExpiringCritical
          expr: probe_ssl_earliest_cert_expiry - time() < 86400 * 7
          for: 1h
          labels:
            severity: critical
          annotations:
            summary: "SSL certificate for {{ $labels.instance }} expires in less than 7 days"
            description: "URGENT: The SSL certificate for {{ $labels.instance }} will expire in {{ $value | humanizeDuration }}."

        # Alert when a TCP port is unreachable
        - alert: TCPPortUnreachable
          expr: probe_success{job="uptime-tcp"} == 0
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "TCP port unreachable on {{ $labels.instance }}"
            description: "Cannot connect to {{ $labels.instance }}. The service may be down or the port may be blocked."
```

```bash
kubectl apply -f uptime-alerts.yaml
```

## Step 4: Build an Uptime Dashboard

Create a Grafana dashboard showing uptime status:

```promql
# Current status of all monitored endpoints (1 = up, 0 = down)
probe_success{job="uptime-monitoring"}

# Response time by endpoint
probe_duration_seconds{job="uptime-monitoring"}

# Uptime percentage over the last 30 days
avg_over_time(probe_success{job="uptime-monitoring"}[30d]) * 100

# SSL certificate expiry days
(probe_ssl_earliest_cert_expiry - time()) / 86400

# HTTP status code returned
probe_http_status_code{job="uptime-monitoring"}

# DNS lookup time
probe_dns_lookup_time_seconds{job="uptime-monitoring"}
```

## Step 5: Set Up External Uptime Checks

For monitoring from outside your cluster, you can deploy Blackbox Exporter on a separate machine or use a SaaS uptime monitoring service. Here is how to set up an external Blackbox Exporter that reports back to your Prometheus:

```yaml
# On an external machine or cloud VM
# docker-compose.yml
version: '3'
services:
  blackbox-exporter:
    image: prom/blackbox-exporter:latest
    ports:
      - "9115:9115"
    volumes:
      - ./blackbox.yml:/etc/blackbox_exporter/config.yml
```

Then add this external exporter as a scrape target in your Prometheus:

```yaml
- job_name: 'external-uptime'
  metrics_path: /probe
  params:
    module: [https_2xx]
  static_configs:
    - targets:
        - https://app.example.com
        - https://api.example.com/health
  relabel_configs:
    - source_labels: [__address__]
      target_label: __param_target
    - source_labels: [__param_target]
      target_label: instance
    - target_label: __address__
      # Point to the external Blackbox Exporter
      replacement: external-monitor.example.com:9115
```

## Step 6: Health Check Endpoints

Make sure your applications expose proper health check endpoints. Here is a best practice pattern:

```python
# Python/Flask health check endpoint
@app.route('/health')
def health_check():
    checks = {
        'database': check_database_connection(),
        'cache': check_redis_connection(),
        'disk_space': check_disk_space(),
    }

    # Return 503 if any check fails
    all_healthy = all(checks.values())
    status_code = 200 if all_healthy else 503

    return jsonify({
        'status': 'healthy' if all_healthy else 'unhealthy',
        'checks': checks,
        'timestamp': datetime.utcnow().isoformat()
    }), status_code
```

## Conclusion

Uptime monitoring on Talos Linux requires a layered approach. Blackbox Exporter handles active probing of HTTP, TCP, and DNS endpoints from inside the cluster. External probes catch network-level issues that internal monitoring misses. Combine both with proper alerting rules and a Grafana dashboard, and you get a complete picture of service availability. The SSL certificate expiry alerts alone will save you from embarrassing outages. Set this up early and keep your probe list updated as you add new services to the cluster.
