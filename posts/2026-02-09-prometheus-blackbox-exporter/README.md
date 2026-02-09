# How to Deploy Prometheus BlackBox Exporter for Endpoint Availability Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, BlackBox Exporter, Monitoring, Health Checks, Availability

Description: Learn how to deploy and configure Prometheus BlackBox Exporter to monitor endpoint availability, SSL certificates, and perform synthetic monitoring.

---

The Prometheus BlackBox Exporter enables synthetic monitoring by probing endpoints from outside your application. Unlike exporters that run within services, BlackBox acts as an external observer, checking HTTP endpoints, TCP services, DNS, ICMP, and SSL certificates. This provides a user perspective on service availability and helps detect issues before users report them.

## Understanding BlackBox Exporter

BlackBox Exporter performs active checks by:
- Probing HTTP/HTTPS endpoints
- Checking TCP port connectivity
- Testing DNS resolution
- Sending ICMP (ping) requests
- Validating SSL certificates
- Measuring response times

It exposes metrics about these probes that Prometheus scrapes.

## Installing BlackBox Exporter

Deploy using Helm:

```bash
# Add Prometheus community repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install BlackBox Exporter
helm install blackbox-exporter prometheus-community/prometheus-blackbox-exporter \
  --namespace monitoring \
  --create-namespace
```

Or deploy with manifests:

```yaml
# blackbox-exporter-deployment.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: blackbox-exporter-config
  namespace: monitoring
data:
  blackbox.yml: |
    modules:
      http_2xx:
        prober: http
        timeout: 5s
        http:
          valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
          valid_status_codes: []
          method: GET
          preferred_ip_protocol: "ip4"

      http_post:
        prober: http
        http:
          method: POST
          headers:
            Content-Type: application/json
          body: '{"health": "check"}'

      tcp_connect:
        prober: tcp
        timeout: 5s

      icmp:
        prober: icmp
        timeout: 5s

      dns_query:
        prober: dns
        timeout: 5s
        dns:
          query_name: "example.com"
          query_type: "A"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: blackbox-exporter
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: blackbox-exporter
  template:
    metadata:
      labels:
        app: blackbox-exporter
    spec:
      containers:
        - name: blackbox-exporter
          image: prom/blackbox-exporter:latest
          args:
            - --config.file=/config/blackbox.yml
          ports:
            - containerPort: 9115
              name: http
          volumeMounts:
            - name: config
              mountPath: /config
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
          livenessProbe:
            httpGet:
              path: /health
              port: 9115
            initialDelaySeconds: 30
          readinessProbe:
            httpGet:
              path: /health
              port: 9115
            initialDelaySeconds: 10
      volumes:
        - name: config
          configMap:
            name: blackbox-exporter-config

---
apiVersion: v1
kind: Service
metadata:
  name: blackbox-exporter
  namespace: monitoring
spec:
  selector:
    app: blackbox-exporter
  ports:
    - port: 9115
      targetPort: 9115
      name: http
```

Apply:

```bash
kubectl apply -f blackbox-exporter-deployment.yaml
```

## Configuring Probe Modules

### HTTP Probes

Basic HTTP 2xx check:

```yaml
modules:
  http_2xx:
    prober: http
    timeout: 5s
    http:
      valid_status_codes: [200]
      method: GET
      fail_if_ssl: false
      fail_if_not_ssl: false
      preferred_ip_protocol: "ip4"
```

HTTPS with SSL validation:

```yaml
modules:
  https_2xx:
    prober: http
    timeout: 10s
    http:
      valid_status_codes: [200]
      method: GET
      fail_if_ssl: false
      fail_if_not_ssl: true
      tls_config:
        insecure_skip_verify: false
```

HTTP with authentication:

```yaml
modules:
  http_with_auth:
    prober: http
    http:
      method: GET
      valid_status_codes: [200]
      basic_auth:
        username: "monitoring"
        password: "secret"
```

HTTP POST with body:

```yaml
modules:
  http_post_json:
    prober: http
    http:
      method: POST
      headers:
        Content-Type: application/json
      body: '{"check": "health"}'
      valid_status_codes: [200, 201]
```

### TCP Probes

Basic TCP connectivity:

```yaml
modules:
  tcp_connect:
    prober: tcp
    timeout: 5s
    tcp:
      preferred_ip_protocol: "ip4"
```

TCP with TLS:

```yaml
modules:
  tcp_tls:
    prober: tcp
    tcp:
      tls: true
      tls_config:
        insecure_skip_verify: false
```

### DNS Probes

DNS A record lookup:

```yaml
modules:
  dns_a:
    prober: dns
    timeout: 5s
    dns:
      query_name: "example.com"
      query_type: "A"
      valid_rcodes: ["NOERROR"]
```

DNS MX record:

```yaml
modules:
  dns_mx:
    prober: dns
    dns:
      query_name: "example.com"
      query_type: "MX"
```

### ICMP Probes

Ping check:

```yaml
modules:
  icmp:
    prober: icmp
    timeout: 5s
    icmp:
      preferred_ip_protocol: "ip4"
```

Note: ICMP requires privileged mode or NET_RAW capability.

## Configuring Prometheus to Scrape BlackBox

Create a Probe custom resource:

```yaml
# blackbox-probes.yaml
apiVersion: monitoring.coreos.com/v1
kind: Probe
metadata:
  name: website-probe
  namespace: monitoring
spec:
  # Probe HTTP endpoints
  targets:
    staticConfig:
      static:
        - https://example.com
        - https://api.example.com
        - https://app.example.com

  prober:
    url: blackbox-exporter:9115
    path: /probe
    scheme: http

  module: http_2xx
  interval: 30s
  scrapeTimeout: 10s

  # Add labels to metrics
  labels:
    environment: production
    team: platform
```

Multiple probes with different modules:

```yaml
---
apiVersion: monitoring.coreos.com/v1
kind: Probe
metadata:
  name: tcp-probe
  namespace: monitoring
spec:
  targets:
    staticConfig:
      static:
        - database.example.com:5432
        - redis.example.com:6379
  prober:
    url: blackbox-exporter:9115
  module: tcp_connect
  interval: 60s

---
apiVersion: monitoring.coreos.com/v1
kind: Probe
metadata:
  name: dns-probe
  namespace: monitoring
spec:
  targets:
    staticConfig:
      static:
        - example.com
        - api.example.com
  prober:
    url: blackbox-exporter:9115
  module: dns_a
  interval: 300s
```

## ServiceMonitor for Dynamic Targets

Probe all services with a specific annotation:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: blackbox-dynamic-probe
  namespace: monitoring
spec:
  selector:
    matchLabels:
      probe: blackbox
  endpoints:
    - port: http
      interval: 30s
      path: /probe
      params:
        module: [http_2xx]
        target:
          - http://$(SERVICE_NAME).$(NAMESPACE).svc.cluster.local
      relabelings:
        - sourceLabels: [__address__]
          targetLabel: __param_target
        - sourceLabels: [__param_target]
          targetLabel: instance
        - targetLabel: __address__
          replacement: blackbox-exporter:9115
```

## SSL Certificate Monitoring

Check SSL expiration:

```yaml
modules:
  ssl_expiry:
    prober: http
    timeout: 10s
    http:
      method: GET
      fail_if_not_ssl: true
      tls_config:
        insecure_skip_verify: false
```

Create alerts for expiring certificates:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: blackbox-ssl-alerts
  namespace: monitoring
spec:
  groups:
    - name: ssl-certificates
      interval: 1h
      rules:
        - alert: SSLCertificateExpiringSoon
          expr: |
            probe_ssl_earliest_cert_expiry - time() < 86400 * 30
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "SSL certificate expiring soon"
            description: "SSL cert for {{ $labels.instance }} expires in {{ $value | humanizeDuration }}."

        - alert: SSLCertificateExpired
          expr: |
            probe_ssl_earliest_cert_expiry - time() <= 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "SSL certificate expired"
            description: "SSL cert for {{ $labels.instance }} has expired."
```

## Availability Monitoring

Create comprehensive availability alerts:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: blackbox-availability-alerts
  namespace: monitoring
spec:
  groups:
    - name: endpoint-availability
      interval: 30s
      rules:
        - alert: EndpointDown
          expr: |
            probe_success == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Endpoint {{ $labels.instance }} is down"
            description: "Probe failed for 5 minutes."

        - alert: SlowResponse
          expr: |
            probe_http_duration_seconds > 5
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Endpoint {{ $labels.instance }} is slow"
            description: "Response time is {{ $value }}s."

        - alert: HTTPStatusCodeError
          expr: |
            probe_http_status_code >= 400
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "HTTP error on {{ $labels.instance }}"
            description: "Status code: {{ $value }}."

        - alert: DNSLookupFailed
          expr: |
            probe_dns_lookup_time_seconds == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "DNS lookup failed for {{ $labels.instance }}"
```

## Advanced Configuration

### Multi-Step HTTP Probe

```yaml
modules:
  http_multi_step:
    prober: http
    http:
      method: GET
      fail_if_body_not_matches_regexp:
        - ".*healthy.*"
      fail_if_header_matches:
        - header: Content-Type
          regexp: ".*text/plain.*"
          allow_missing: false
```

### Custom Timeouts

```yaml
modules:
  slow_endpoint:
    prober: http
    timeout: 30s
    http:
      method: GET
      valid_status_codes: [200]
```

### IPv6 Probing

```yaml
modules:
  http_ipv6:
    prober: http
    http:
      preferred_ip_protocol: "ip6"
      ip_protocol_fallback: false
```

## Grafana Dashboard

Create a dashboard for BlackBox metrics:

```json
{
  "panels": [
    {
      "title": "Endpoint Availability",
      "targets": [
        {
          "expr": "probe_success",
          "legendFormat": "{{ instance }}"
        }
      ],
      "type": "stat"
    },
    {
      "title": "HTTP Response Time",
      "targets": [
        {
          "expr": "probe_http_duration_seconds",
          "legendFormat": "{{ instance }}"
        }
      ],
      "type": "timeseries"
    },
    {
      "title": "SSL Certificate Expiry",
      "targets": [
        {
          "expr": "(probe_ssl_earliest_cert_expiry - time()) / 86400",
          "legendFormat": "{{ instance }}"
        }
      ],
      "type": "gauge"
    }
  ]
}
```

## Monitoring BlackBox Exporter

Create ServiceMonitor for BlackBox itself:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: blackbox-exporter-metrics
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: blackbox-exporter
  endpoints:
    - port: http
      interval: 30s
      path: /metrics
```

## Best Practices

1. Use appropriate probe intervals (30s-5m depending on criticality)
2. Set realistic timeouts based on expected response times
3. Monitor SSL certificate expiration proactively (30+ days warning)
4. Use TCP probes for non-HTTP services
5. Implement multi-region probing for global services
6. Alert on probe failures and slow responses
7. Test probe configuration before deploying
8. Document which endpoints are being monitored and why
9. Use labels to categorize probes by service, team, or environment
10. Regular review and cleanup of unused probes

## Conclusion

Prometheus BlackBox Exporter provides essential synthetic monitoring capabilities, enabling you to detect issues from a user perspective. By probing HTTP endpoints, checking SSL certificates, and validating service connectivity, BlackBox complements application metrics with external availability monitoring. Combined with proper alerting and dashboards, BlackBox Exporter ensures you detect and resolve issues before they impact users.
