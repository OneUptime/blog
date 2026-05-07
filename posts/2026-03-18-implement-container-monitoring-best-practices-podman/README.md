# How to Implement Container Monitoring Best Practices with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Monitoring, Prometheus, Grafana, Container, Observability

Description: Learn how to implement container monitoring best practices with Podman using Prometheus, Grafana, health checks, and custom metrics for complete operational visibility.

---

> Container monitoring gives you real-time visibility into resource usage, application health, and performance trends, enabling you to detect and resolve issues before they impact users.

Monitoring containerized applications requires tracking both container-level metrics (CPU, memory, network) and application-level metrics (response times, error rates, queue depths). Podman provides built-in tools for basic monitoring and integrates well with Prometheus and Grafana for comprehensive observability.

This guide covers monitoring best practices from basic health checks to full metrics pipelines.

---

## Built-In Monitoring with Podman

Podman provides basic monitoring out of the box:

```bash
# Real-time resource usage for all containers

podman stats

# Resource usage for specific containers
podman stats api db cache

# One-time snapshot (no streaming)
podman stats --no-stream

# Custom format
podman stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

# JSON output for scripting
podman stats --no-stream --format json
```

## Container Health Checks

Define health checks to detect when containers are unhealthy:

```bash
podman run -d \
  --name api \
  --health-cmd="curl -f http://localhost:3000/health || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  --health-start-period=60s \
  my-api:latest
```

In a Containerfile:

```dockerfile
FROM docker.io/library/node:20-alpine
WORKDIR /app
COPY . .
RUN apk add --no-cache curl
RUN npm ci --production

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=60s \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
```

Check health status:

```bash
# View health status
podman inspect api --format '{{.State.Health.Status}}'

# Run health check manually
podman healthcheck run api

# View health check log
podman inspect api --format '{{json .State.Health}}' | python3 -m json.tool
```

## Application Health Endpoints

Implement meaningful health check endpoints:

```javascript
// Node.js health endpoint
app.get('/health', async (req, res) => {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {}
  };

  // Database check
  try {
    await db.query('SELECT 1');
    checks.checks.database = { status: 'healthy' };
  } catch (err) {
    checks.checks.database = { status: 'unhealthy', error: err.message };
    checks.status = 'unhealthy';
  }

  // Redis check
  try {
    await redis.ping();
    checks.checks.redis = { status: 'healthy' };
  } catch (err) {
    checks.checks.redis = { status: 'unhealthy', error: err.message };
    checks.status = 'unhealthy';
  }

  // Memory check
  const memUsage = process.memoryUsage();
  checks.checks.memory = {
    rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB'
  };

  const statusCode = checks.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(checks);
});
```

## Prometheus Metrics Stack

Deploy a complete monitoring stack:

```bash
mkdir -p ~/monitoring
podman network create monitoring

# Prometheus
cat > ~/monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - /etc/prometheus/alerts.yml

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'containers'
    static_configs:
      - targets: ['cadvisor:8080']

  - job_name: 'applications'
    static_configs:
      - targets: ['api:3000']
    metrics_path: '/metrics'
EOF

cat > ~/monitoring/alerts.yml << 'EOF'
groups: []
EOF

podman run -d \
  --name prometheus \
  --network monitoring \
  -p 9090:9090 \
  -v ~/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro,Z \
  -v ~/monitoring/alerts.yml:/etc/prometheus/alerts.yml:ro,Z \
  -v prometheus-data:/prometheus:Z \
  docker.io/prom/prometheus:latest

# cAdvisor for container metrics
podman run -d \
  --name cadvisor \
  --network monitoring \
  -p 8080:8080 \
  --privileged \
  --device /dev/kmsg \
  -v /:/rootfs:ro \
  -v /var/run:/var/run:ro \
  -v /sys:/sys:ro \
  -v /var/lib/containers:/var/lib/containers:ro \
  gcr.io/cadvisor/cadvisor:latest

# Node Exporter for host metrics
podman run -d \
  --name node-exporter \
  --network monitoring \
  -p 9100:9100 \
  --pid=host \
  -v /:/host:ro \
  docker.io/prom/node-exporter:latest \
  --path.rootfs=/host

# Grafana for visualization
podman run -d \
  --name grafana \
  --network monitoring \
  -p 3000:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  -v grafana-data:/var/lib/grafana:Z \
  docker.io/grafana/grafana:latest
```

## Application Metrics

Instrument your applications with Prometheus metrics:

```javascript
// Node.js with prom-client
const client = require('prom-client');

// Default metrics (CPU, memory, event loop)
client.collectDefaultMetrics();

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
});

// Middleware to track metrics
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  activeConnections.inc();

  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path || req.path, status: res.statusCode });
    httpRequestsTotal.inc({ method: req.method, route: req.route?.path || req.path, status: res.statusCode });
    activeConnections.dec();
  });

  next();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});
```

```python
# Python with prometheus_client
from prometheus_client import Counter, Histogram, Gauge, generate_latest
import time

REQUEST_COUNT = Counter('http_requests_total', 'Total requests', ['method', 'endpoint', 'status'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'Request latency', ['method', 'endpoint'])
ACTIVE_REQUESTS = Gauge('active_requests', 'Active requests')

def metrics_endpoint():
    return generate_latest()
```

## Key Metrics to Monitor

Track these essential metrics for every container:

```text
Container Level:
- CPU usage percentage
- Memory usage and limits
- Network I/O (bytes in/out)
- Disk I/O (reads/writes)
- Container restart count
- Container uptime

Application Level:
- Request rate (requests/second)
- Error rate (errors/second)
- Response time (p50, p95, p99)
- Active connections
- Queue depth (for workers)
- Database connection pool usage
```

## Monitoring Script

Create a comprehensive monitoring script:

```bash
#!/bin/bash
# monitor-containers.sh

echo "=== Container Health Report ==="
echo "Time: $(date)"
echo ""

# Container status
echo "--- Container Status ---"
podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Resource usage
echo "--- Resource Usage ---"
podman stats --no-stream --format \
  "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}"
echo ""

# Health check status
echo "--- Health Checks ---"
for container in $(podman ps --format '{{.Names}}'); do
  HEALTH=$(podman inspect "$container" --format '{{.State.Health.Status}}' 2>/dev/null)
  if [ -n "$HEALTH" ]; then
    echo "$container: $HEALTH"
  fi
done
echo ""

# Disk usage
echo "--- Storage ---"
podman system df
echo ""

# Alerts
echo "--- Alerts ---"
for container in $(podman ps --format '{{.Names}}'); do
  # High CPU
  CPU=$(podman stats --no-stream "$container" --format '{{.CPUPerc}}' | tr -d '%')
  if (( $(echo "$CPU > 80" | bc -l) )); then
    echo "HIGH CPU: $container at ${CPU}%"
  fi

  # High memory
  MEM=$(podman stats --no-stream "$container" --format '{{.MemPerc}}' | tr -d '%')
  if (( $(echo "$MEM > 80" | bc -l) )); then
    echo "HIGH MEMORY: $container at ${MEM}%"
  fi

  # Unhealthy
  HEALTH=$(podman inspect "$container" --format '{{.State.Health.Status}}' 2>/dev/null)
  if [ "$HEALTH" = "unhealthy" ]; then
    echo "UNHEALTHY: $container"
  fi
done
```

## Alerting Rules

Define Prometheus alerting rules:

```yaml
# ~/monitoring/alerts.yml
groups:
  - name: container_alerts
    rules:
      - alert: ContainerHighCPU
        expr: sum by (name) (rate(container_cpu_usage_seconds_total{name!=""}[5m])) > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.name }}"

      - alert: ContainerHighMemory
        expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.name }}"

      - alert: ContainerRestarting
        expr: changes(container_start_time_seconds{name!=""}[1h]) > 3
        labels:
          severity: critical
        annotations:
          summary: "Container {{ $labels.name }} restarting frequently"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate on {{ $labels.job }}"
```

Reload Prometheus after updating the rules file:

```bash
podman kill --signal HUP prometheus
```

## Quadlet for Monitoring Stack

```ini
# ~/.config/containers/systemd/prometheus.container
[Container]
Image=docker.io/prom/prometheus:latest
ContainerName=prometheus
Network=monitoring
PublishPort=9090:9090
Volume=%h/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro,Z
Volume=%h/monitoring/alerts.yml:/etc/prometheus/alerts.yml:ro,Z
Volume=prometheus-data:/prometheus:Z

[Service]
Restart=always

[Install]
WantedBy=default.target
```

## Conclusion

Container monitoring with Podman combines built-in tools like `podman stats` and health checks with external observability systems like Prometheus and Grafana. Instrument your applications with meaningful metrics, define health checks that verify actual functionality, and set up alerting for critical thresholds. Start with basic resource monitoring and health checks, then add application-level metrics as your monitoring practice matures. The goal is to detect issues before they impact users and to have the data needed for efficient debugging when problems occur.
