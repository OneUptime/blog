# How to Scale Docker Swarm Services Based on Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Swarm, Auto Scaling, Prometheus, Monitoring, Metrics, DevOps

Description: Implement metric-based auto-scaling for Docker Swarm services using Prometheus, custom scripts, and monitoring tools.

---

Docker Swarm does not include built-in auto-scaling. You can manually scale services with `docker service scale`, but there is no native mechanism to adjust replicas based on CPU usage, memory consumption, or request rates. This is a notable gap compared to Kubernetes, which has the Horizontal Pod Autoscaler.

The good news is that building auto-scaling for Swarm is straightforward. You collect metrics, evaluate them against thresholds, and call the Docker API to scale services up or down. This guide shows you how to implement this using Prometheus for metrics collection and a custom scaling controller.

## Manual Scaling Basics

Before automating, understand the manual commands:

```bash
# Scale a service to 5 replicas
docker service scale webapp=5

# Scale multiple services at once
docker service scale webapp=5 api=3 worker=8

# Check current replica count
docker service ls
```

You can also update the replica count through the service update command:

```bash
# Another way to scale
docker service update --replicas 5 webapp
```

## Setting Up the Monitoring Stack

Auto-scaling needs metrics. We will deploy Prometheus with cAdvisor for container metrics and Node Exporter for host metrics.

```yaml
# monitoring-stack.yml - Prometheus monitoring for Docker Swarm
version: "3.8"

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - prometheus-data:/prometheus
    configs:
      - source: prometheus-config
        target: /etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
    deploy:
      placement:
        constraints:
          - node.role == manager
    networks:
      - monitoring

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    deploy:
      # Run on every node to collect container metrics
      mode: global
    networks:
      - monitoring

  node-exporter:
    image: prom/node-exporter:latest
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - "--path.procfs=/host/proc"
      - "--path.sysfs=/host/sys"
      - "--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)"
    deploy:
      # Run on every node to collect host metrics
      mode: global
    networks:
      - monitoring

configs:
  prometheus-config:
    file: ./prometheus.yml

volumes:
  prometheus-data:

networks:
  monitoring:
    driver: overlay
```

The Prometheus configuration file:

```yaml
# prometheus.yml - Scrape configuration for Swarm metrics
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: "cadvisor"
    dns_sd_configs:
      - names:
          - "tasks.cadvisor"
        type: "A"
        port: 8080

  - job_name: "node-exporter"
    dns_sd_configs:
      - names:
          - "tasks.node-exporter"
        type: "A"
        port: 9100

  - job_name: "docker"
    static_configs:
      - targets: ["172.17.0.1:9323"]
```

Deploy the monitoring stack:

```bash
# Deploy the monitoring stack
docker stack deploy -c monitoring-stack.yml monitoring
```

## Building a Custom Auto-Scaler

Here is a Python script that queries Prometheus for CPU metrics and scales Docker Swarm services accordingly.

```python
#!/usr/bin/env python3
# autoscaler.py - Scale Docker Swarm services based on Prometheus metrics

import docker
import requests
import time
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s')
logger = logging.getLogger(__name__)

# Configuration
PROMETHEUS_URL = "http://prometheus:9090"
DOCKER_CLIENT = docker.from_env()
CHECK_INTERVAL = 30  # seconds between scaling checks

# Scaling rules: define thresholds for each service
SCALING_RULES = {
    "webapp": {
        "metric_query": 'avg(rate(container_cpu_usage_seconds_total{container_label_com_docker_swarm_service_name="webapp"}[2m])) * 100',
        "scale_up_threshold": 70,    # Scale up when CPU exceeds 70%
        "scale_down_threshold": 30,  # Scale down when CPU drops below 30%
        "min_replicas": 2,
        "max_replicas": 10,
        "scale_up_step": 2,          # Add 2 replicas at a time
        "scale_down_step": 1,        # Remove 1 replica at a time
        "cooldown": 120,             # Seconds to wait between scaling actions
    },
    "api": {
        "metric_query": 'avg(rate(container_cpu_usage_seconds_total{container_label_com_docker_swarm_service_name="api"}[2m])) * 100',
        "scale_up_threshold": 60,
        "scale_down_threshold": 25,
        "min_replicas": 1,
        "max_replicas": 8,
        "scale_up_step": 1,
        "scale_down_step": 1,
        "cooldown": 120,
    },
}

# Track last scaling time to enforce cooldowns
last_scaled = {}


def query_prometheus(query):
    """Execute a PromQL query and return the numeric result."""
    try:
        response = requests.get(
            f"{PROMETHEUS_URL}/api/v1/query",
            params={"query": query},
            timeout=10
        )
        data = response.json()
        if data["status"] == "success" and data["data"]["result"]:
            return float(data["data"]["result"][0]["value"][1])
    except Exception as e:
        logger.error(f"Prometheus query failed: {e}")
    return None


def get_current_replicas(service_name):
    """Get the current replica count for a Swarm service."""
    try:
        service = DOCKER_CLIENT.services.get(service_name)
        return service.attrs["Spec"]["Mode"]["Replicated"]["Replicas"]
    except Exception as e:
        logger.error(f"Failed to get replicas for {service_name}: {e}")
        return None


def scale_service(service_name, target_replicas):
    """Scale a Swarm service to the target replica count."""
    try:
        service = DOCKER_CLIENT.services.get(service_name)
        service.scale(target_replicas)
        logger.info(f"Scaled {service_name} to {target_replicas} replicas")
        last_scaled[service_name] = time.time()
    except Exception as e:
        logger.error(f"Failed to scale {service_name}: {e}")


def check_and_scale():
    """Evaluate metrics and scale services as needed."""
    for service_name, rules in SCALING_RULES.items():
        # Check cooldown period
        if service_name in last_scaled:
            elapsed = time.time() - last_scaled[service_name]
            if elapsed < rules["cooldown"]:
                logger.debug(f"{service_name}: In cooldown ({elapsed:.0f}s / {rules['cooldown']}s)")
                continue

        # Query the metric
        metric_value = query_prometheus(rules["metric_query"])
        if metric_value is None:
            continue

        current_replicas = get_current_replicas(service_name)
        if current_replicas is None:
            continue

        logger.info(f"{service_name}: CPU={metric_value:.1f}%, replicas={current_replicas}")

        # Scale up
        if metric_value > rules["scale_up_threshold"]:
            target = min(current_replicas + rules["scale_up_step"], rules["max_replicas"])
            if target > current_replicas:
                logger.info(f"{service_name}: Scaling UP {current_replicas} -> {target}")
                scale_service(service_name, target)

        # Scale down
        elif metric_value < rules["scale_down_threshold"]:
            target = max(current_replicas - rules["scale_down_step"], rules["min_replicas"])
            if target < current_replicas:
                logger.info(f"{service_name}: Scaling DOWN {current_replicas} -> {target}")
                scale_service(service_name, target)


if __name__ == "__main__":
    logger.info("Swarm auto-scaler starting")
    while True:
        check_and_scale()
        time.sleep(CHECK_INTERVAL)
```

## Deploying the Auto-Scaler

Package the auto-scaler as a Docker image and deploy it to the Swarm.

```dockerfile
# Dockerfile for the auto-scaler
FROM python:3.12-alpine
WORKDIR /app
RUN pip install docker requests
COPY autoscaler.py .
CMD ["python", "autoscaler.py"]
```

```bash
# Build and deploy the auto-scaler
docker build -t swarm-autoscaler:v1.0 .

docker service create \
  --name autoscaler \
  --mount type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock \
  --network monitoring_monitoring \
  --constraint 'node.role == manager' \
  --replicas 1 \
  swarm-autoscaler:v1.0
```

The auto-scaler needs access to the Docker socket to call the scaling API, and it must run on a manager node.

## Scaling Based on Request Rate

CPU is not the only useful metric. You can scale based on HTTP request rates using a reverse proxy's metrics.

If your services expose Prometheus metrics, use request rate as a scaling signal:

```python
# PromQL query for requests per second per replica
SCALING_RULES = {
    "webapp": {
        "metric_query": 'sum(rate(http_requests_total{service="webapp"}[2m])) / count(container_last_seen{container_label_com_docker_swarm_service_name="webapp"})',
        "scale_up_threshold": 100,    # Scale up above 100 req/s per replica
        "scale_down_threshold": 20,   # Scale down below 20 req/s per replica
        "min_replicas": 2,
        "max_replicas": 20,
        "scale_up_step": 3,
        "scale_down_step": 1,
        "cooldown": 60,
    },
}
```

## Scaling Based on Queue Depth

For worker services that process messages from a queue, scale based on queue length:

```python
# Scale workers based on RabbitMQ queue depth
SCALING_RULES = {
    "worker": {
        "metric_query": 'rabbitmq_queue_messages{queue="tasks"}',
        "scale_up_threshold": 1000,   # Scale up when queue exceeds 1000 messages
        "scale_down_threshold": 100,  # Scale down when queue drops below 100
        "min_replicas": 1,
        "max_replicas": 15,
        "scale_up_step": 3,
        "scale_down_step": 1,
        "cooldown": 90,
    },
}
```

## Using a Shell Script Instead

If you prefer a simpler approach without Python, a shell script works too:

```bash
#!/bin/bash
# simple-autoscaler.sh - Basic auto-scaler using Docker stats

SERVICE="webapp"
MIN_REPLICAS=2
MAX_REPLICAS=10
SCALE_UP_CPU=70
SCALE_DOWN_CPU=30

while true; do
  # Get average CPU usage across all tasks
  AVG_CPU=$(docker stats --no-stream --format "{{.CPUPerc}}" \
    $(docker service ps -q "$SERVICE" --filter "desired-state=running") 2>/dev/null | \
    sed 's/%//' | awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print 0}')

  CURRENT=$(docker service inspect "$SERVICE" --format '{{.Spec.Mode.Replicated.Replicas}}')

  echo "$(date): $SERVICE CPU=${AVG_CPU}% replicas=$CURRENT"

  # Scale up
  if (( $(echo "$AVG_CPU > $SCALE_UP_CPU" | bc -l) )); then
    NEW=$((CURRENT + 1))
    if [ "$NEW" -le "$MAX_REPLICAS" ]; then
      echo "Scaling up to $NEW"
      docker service scale "$SERVICE=$NEW"
      sleep 120
    fi
  fi

  # Scale down
  if (( $(echo "$AVG_CPU < $SCALE_DOWN_CPU" | bc -l) )); then
    NEW=$((CURRENT - 1))
    if [ "$NEW" -ge "$MIN_REPLICAS" ]; then
      echo "Scaling down to $NEW"
      docker service scale "$SERVICE=$NEW"
      sleep 120
    fi
  fi

  sleep 30
done
```

## Best Practices

**Set a cooldown period.** Without it, the scaler oscillates wildly, scaling up and down in rapid succession. Two minutes is a reasonable starting point.

**Use min and max bounds.** Always set a minimum replica count (for availability) and a maximum (to prevent runaway scaling that exhausts cluster resources).

**Scale up fast, scale down slow.** Use larger steps when scaling up and smaller steps when scaling down. This responds quickly to load spikes while avoiding premature scale-downs.

**Monitor the scaler itself.** Log every scaling decision and the metric values that triggered it. This helps you tune thresholds over time.

**Test with load generation.** Use tools like `hey` or `wrk` to generate traffic and verify the scaler responds correctly:

```bash
# Generate load to test auto-scaling
hey -z 5m -c 50 http://your-service:80/
```

## Conclusion

While Docker Swarm lacks built-in auto-scaling, the building blocks are all there: the Docker API for scaling, Prometheus for metrics, and straightforward scripting to connect the two. A simple Python or shell script running as a Swarm service can handle most auto-scaling needs. The key is choosing the right metrics for each service type (CPU for compute-heavy services, request rate for web servers, queue depth for workers), setting appropriate thresholds with cooldown periods, and testing thoroughly before relying on it in production.
