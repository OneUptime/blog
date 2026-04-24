# How to Monitor Docker Swarm Cluster Health from Portainer - Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Monitoring, Health, Infrastructure

Description: Monitor Docker Swarm cluster health including node status, service availability, and task failures using Portainer and complementary tools.

## Introduction

A healthy Docker Swarm cluster requires monitoring at multiple levels: node health, service availability, task states, and resource utilization. Portainer provides built-in Swarm visibility, and combined with Prometheus and Grafana, you can build comprehensive cluster health monitoring.

## Portainer Built-In Swarm Monitoring

Portainer provides several views for Swarm health:

1. **Swarm > Details**: Overall cluster status, node count
2. **Swarm > Details > Nodes**: Individual node health and resource usage
3. **Services**: Service task distribution and health
4. **Services > expand a service**: Individual task states and logs

## Health Check Script

```bash
#!/bin/bash
# swarm-health-check.sh

PORTAINER_URL="https://portainer.example.com"
API_KEY="your-api-key"
ENDPOINT_ID=1

echo "=== Docker Swarm Health Report ==="
echo "Time: $(date)"
echo ""

# Node health

echo "--- Nodes ---"
curl -s \
  -H "X-API-Key: $API_KEY" \
  "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/nodes" \
  | python3 -c "
import sys, json
nodes = json.load(sys.stdin)
for n in nodes:
    hostname = n['Description']['Hostname']
    state = n['Status']['State']
    avail = n['Spec']['Availability']
    role = n['Spec']['Role']
    manager_status = n.get('ManagerStatus', {}).get('Reachability', 'N/A')
    
    status_icon = '✓' if state == 'ready' else '✗'
    print(f'{status_icon} {hostname:20} {role:8} {state:10} {avail:8} {manager_status}')
"

echo ""
echo "--- Services ---"
curl -s \
  -H "X-API-Key: $API_KEY" \
  "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/services?status=true" \
  | python3 -c "
import sys, json
services = json.load(sys.stdin)
for s in services:
    name = s['Spec']['Name']
    service_status = s.get('ServiceStatus', {})
    running = service_status.get('RunningTasks', 0)
    desired = service_status.get('DesiredTasks', 0)
    status_icon = '✓' if running >= desired else '!'
    if 'Replicated' in s['Spec']['Mode']:
        print(f'{status_icon} {name:30} {running}/{desired} replicas')
    else:
        print(f'{status_icon} {name:30} {running}/{desired} tasks')
"

echo ""
echo "--- Failed Tasks (last 10 minutes) ---"
curl -s \
  -H "X-API-Key: $API_KEY" \
  "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/tasks" \
  | python3 -c "
import sys, json
from datetime import datetime, timezone, timedelta

def parse_ts(value):
    if not value:
        return None
    return datetime.fromisoformat(value.replace('Z', '+00:00'))

tasks = json.load(sys.stdin)
cutoff = datetime.now(timezone.utc) - timedelta(minutes=10)
failed = []
for t in tasks:
    state = t['Status']['State']
    ts = parse_ts(t['Status'].get('Timestamp'))
    if state in ('failed', 'rejected', 'orphaned') and ts and ts >= cutoff:
        failed.append((ts, t))
failed.sort(key=lambda item: item[0])
if failed:
    for _, t in failed[-10:]:
        svc = t.get('Name', t.get('ServiceID', 'N/A'))[:40]
        state = t['Status']['State']
        err = t['Status'].get('Err', 'no error')[:50]
        print(f'  ✗ {svc}: {state} - {err}')
else:
    print('  No failed tasks')
"
```

## Prometheus Stack for Swarm Monitoring

```yaml
# monitoring-stack.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
    ports:
      - "9090:9090"
    configs:
      - source: prometheus-config
        target: /etc/prometheus/prometheus.yml
      - source: swarm-alerts
        target: /etc/prometheus/swarm-alerts.yml
    volumes:
      - prometheus-data:/prometheus
    command:
      - --config.file=/etc/prometheus/prometheus.yml
      - --storage.tsdb.retention.time=30d
    networks:
      - monitoring

  node-exporter:
    image: quay.io/prometheus/node-exporter:latest
    deploy:
      mode: global       # Run on every node
    volumes:
      - /:/host:ro,rslave
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
    command:
      - --path.rootfs=/host
      - --path.procfs=/host/proc
      - --path.sysfs=/host/sys
    networks:
      - monitoring

  cadvisor:
    image: ghcr.io/google/cadvisor:v0.56.2
    deploy:
      mode: global       # Container metrics from every node
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    deploy:
      replicas: 1
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    networks:
      - monitoring

configs:
  prometheus-config:
    file: ./prometheus.yml
  swarm-alerts:
    file: ./swarm-alerts.yml

volumes:
  prometheus-data:
  grafana-data:

networks:
  monitoring:
    driver: overlay
    attachable: true
```

## Key Metrics to Monitor

```yaml
# swarm-alerts.yml
groups:
  - name: swarm_health
    rules:
      # Node down
      - alert: SwarmNodeDown
        expr: up{job="node-exporter"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Swarm node {{ $labels.instance }} is down"

      # High memory on a node
      - alert: SwarmNodeHighMemory
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 90
        for: 5m
        labels:
          severity: warning

      # High CPU on a node
      - alert: SwarmNodeHighCPU
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
        for: 5m
        labels:
          severity: warning
```

## Conclusion

Comprehensive Swarm cluster health monitoring combines Portainer's built-in visibility with Prometheus metrics and Grafana dashboards. The multi-level monitoring approach covers node health, service availability, task failures, and resource utilization. Automated alerting ensures operations teams are notified immediately when cluster health degrades, enabling rapid response.
