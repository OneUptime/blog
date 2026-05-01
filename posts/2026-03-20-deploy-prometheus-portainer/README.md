# How to Deploy Prometheus via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Prometheus, Monitoring, Metric, Docker

Description: Learn how to deploy Prometheus via Portainer with scrape configuration, persistent storage, alerting rules, and integration with Alertmanager.

## Prometheus via Portainer Stack

**Stacks → Add Stack → prometheus**

```yaml
version: "3.8"

services:
  prometheus:
    image: prom/prometheus:latest
    restart: unless-stopped
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.enable-lifecycle'       # Enable /-/reload endpoint
    volumes:
      - /path/to/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - /path/to/prometheus/rules:/etc/prometheus/rules:ro
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    healthcheck:
      test: ["CMD", "/bin/promtool", "check", "healthy", "--url", "http://localhost:9090"]
      interval: 10s
      retries: 5

  alertmanager:
    image: prom/alertmanager:latest
    restart: unless-stopped
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    volumes:
      - /path/to/alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
      - alertmanager_data:/alertmanager
    ports:
      - "9093:9093"

volumes:
  prometheus_data:
  alertmanager_data:
```

## Prometheus Configuration

```yaml
# prometheus.yml

global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    environment: production
    region: us-east

storage:
  tsdb:
    retention:
      time: 30d
      size: 10GB

# Alert rules
rule_files:
  - /etc/prometheus/rules/*.yml

# Send alerts to Alertmanager
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        regex: '([^:]+)(:[0-9]+)?'
        replacement: '${1}'

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']

  - job_name: 'custom-app'
    static_configs:
      - targets: ['myapp:8080']
    metrics_path: /metrics
    scheme: http
```

## Alerting Rules

```yaml
# rules/host-alerts.yml
groups:
  - name: host-health
    interval: 30s
    rules:
      - alert: HighCPU
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU on {{ $labels.instance }}"
          description: "CPU usage is {{ $value | printf \"%.0f\" }}%"

      - alert: DiskFull
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 < 10
        for: 5m
        labels:
          severity: critical

      - alert: ServiceDown
        expr: up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
```

## Alertmanager Configuration

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@yourdomain.com'

route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default'
  routes:
    - matchers:
        - severity="critical"
      receiver: 'pagerduty'

receivers:
  - name: 'default'
    email_configs:
      - to: 'team@yourdomain.com'
        auth_username: 'alerts@yourdomain.com'
        auth_password: 'your-app-password'

  - name: 'pagerduty'
    pagerduty_configs:
      - routing_key: 'your-pagerduty-routing-key'

  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/your/webhook/path'
        channel: '#alerts'
```

## Reloading Configuration

```bash
# Reload without restart (via Portainer exec or host)
curl -s -X POST http://localhost:9090/-/reload

# Verify configuration
docker exec -it <prometheus-container-name> /bin/promtool check config /etc/prometheus/prometheus.yml
```

## Conclusion

Prometheus via Portainer provides the metrics backbone for your Docker environment. The `--web.enable-lifecycle` flag allows configuration reloads without restarts, and the `rule_files` configuration separates alerting rules into maintainable files. Pair with Grafana for dashboards and Alertmanager for notification routing.
