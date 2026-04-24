# How to Build an Automated Container Scaling System with Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Scaling, Docker Swarm, Automation

Description: Build an automated horizontal scaling system that adjusts Docker Swarm service replicas based on metrics using the Portainer API.

## Introduction

While Kubernetes has built-in horizontal pod autoscaling, Docker Swarm requires custom solutions. By combining the Portainer API with container metrics monitoring, you can build an automated scaling system that adjusts Swarm service replicas based on CPU, memory, or custom application metrics.

## Prerequisites

- Docker Swarm cluster managed by Portainer
- Prometheus for metrics collection (optional if you use the Docker stats path shown below)
- Python 3.8+ on the automation host

## The Auto-Scaler

```python
#!/usr/bin/env python3
# autoscaler.py

import json
import logging
import os
import requests
import time
from dataclasses import dataclass
from typing import Optional

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

PORTAINER_URL = os.environ.get("PORTAINER_URL", "https://portainer.example.com")
API_KEY = os.environ.get("PORTAINER_API_KEY", "your-api-key")
ENDPOINT_ID = int(os.environ.get("PORTAINER_ENDPOINT_ID", "1"))  # Swarm endpoint
PROMETHEUS_URL = os.environ.get("PROMETHEUS_URL", "http://prometheus:9090")

headers = {"X-API-Key": API_KEY, "Content-Type": "application/json"}


@dataclass
class ScalingPolicy:
    service_name: str
    min_replicas: int = 1
    max_replicas: int = 10
    scale_up_threshold: float = 70.0   # Scale up when CPU > 70%
    scale_down_threshold: float = 30.0  # Scale down when CPU < 30%
    scale_up_increment: int = 1
    scale_down_increment: int = 1
    cooldown_seconds: int = 300         # 5 minutes between scaling events


# Define scaling policies for your services

SCALING_POLICIES = {
    "myapp_web": ScalingPolicy("myapp_web", min_replicas=2, max_replicas=10),
    "myapp_api": ScalingPolicy("myapp_api", min_replicas=2, max_replicas=8),
    "myapp_worker": ScalingPolicy("myapp_worker", min_replicas=1, max_replicas=5),
}

# Track last scaling events
last_scaled = {}


def get_swarm_services():
    """Get all Swarm services."""
    resp = requests.get(
        f"{PORTAINER_URL}/api/endpoints/{ENDPOINT_ID}/docker/services",
        headers=headers
    )
    resp.raise_for_status()
    return resp.json()


def get_service_replicas(service_id: str) -> int:
    """Get current replica count for a service."""
    resp = requests.get(
        f"{PORTAINER_URL}/api/endpoints/{ENDPOINT_ID}/docker/services/{service_id}",
        headers=headers
    )
    resp.raise_for_status()
    service = resp.json()
    return service['Spec']['Mode']['Replicated']['Replicas']


def scale_service(service_id: str, service_name: str, new_replicas: int) -> bool:
    """Scale a Swarm service to the specified number of replicas."""
    # First, get current service spec
    resp = requests.get(
        f"{PORTAINER_URL}/api/endpoints/{ENDPOINT_ID}/docker/services/{service_id}",
        headers=headers
    )
    resp.raise_for_status()
    service = resp.json()
    
    current_replicas = service['Spec']['Mode']['Replicated']['Replicas']
    version = service['Version']['Index']
    
    # Update the spec with new replica count
    spec = service['Spec']
    spec['Mode']['Replicated']['Replicas'] = new_replicas
    
    resp = requests.post(
        f"{PORTAINER_URL}/api/endpoints/{ENDPOINT_ID}/docker/services/{service_id}/update",
        params={"version": version},
        headers=headers,
        json=spec
    )
    
    if resp.status_code == 200:
        direction = "up" if new_replicas > current_replicas else "down"
        logger.info(f"Scaled {service_name} {direction}: {current_replicas} → {new_replicas}")
        return True
    
    logger.error(f"Failed to scale {service_name}: {resp.status_code} {resp.text}")
    return False


def get_cpu_usage_from_prometheus(service_name: str) -> Optional[float]:
    """Query Prometheus for service CPU usage."""
    # Example query for cAdvisor-style metrics; adjust the selector to match
    # the labels exposed by your container metrics exporter.
    query = f'avg(rate(container_cpu_usage_seconds_total{{name=~"{service_name}.*"}}[5m])) * 100'
    
    resp = requests.get(
        f"{PROMETHEUS_URL}/api/v1/query",
        params={"query": query}
    )
    resp.raise_for_status()
    
    data = resp.json()
    results = data.get('data', {}).get('result', [])
    
    if results:
        return float(results[0]['value'][1])
    return None


def get_cpu_usage_from_docker(service_name: str) -> Optional[float]:
    """Get average CPU usage from Docker stats for all tasks in the service."""
    # Get tasks for the service
    resp = requests.get(
        f"{PORTAINER_URL}/api/endpoints/{ENDPOINT_ID}/docker/tasks",
        params={"filters": json.dumps({"service": [service_name]})},
        headers=headers
    )
    resp.raise_for_status()
    tasks = [t for t in resp.json() if t['Status']['State'] == 'running']
    
    if not tasks:
        return None
    
    total_cpu = 0
    count = 0
    
    for task in tasks:
        container_id = task.get('Status', {}).get('ContainerStatus', {}).get('ContainerID')
        if not container_id:
            continue
        
        try:
            stats_resp = requests.get(
                f"{PORTAINER_URL}/api/endpoints/{ENDPOINT_ID}/docker/containers/{container_id}/stats",
                params={"stream": "false"},
                headers=headers,
                timeout=10
            )
            stats_resp.raise_for_status()
            stats = stats_resp.json()
            
            cpu_delta = (stats['cpu_stats']['cpu_usage']['total_usage'] -
                        stats['precpu_stats']['cpu_usage']['total_usage'])
            sys_delta = (stats['cpu_stats']['system_cpu_usage'] -
                        stats['precpu_stats']['system_cpu_usage'])
            num_cpus = stats['cpu_stats'].get('online_cpus', 1)
            
            if sys_delta > 0:
                total_cpu += (cpu_delta / sys_delta) * num_cpus * 100
                count += 1
        except Exception:
            pass
    
    return total_cpu / count if count > 0 else None


def can_scale(service_name: str) -> bool:
    """Check if the cooldown period has passed."""
    last = last_scaled.get(service_name, 0)
    return (time.time() - last) >= SCALING_POLICIES.get(service_name, ScalingPolicy(service_name)).cooldown_seconds


def auto_scale():
    """Main auto-scaling loop iteration."""
    services = get_swarm_services()
    
    for service in services:
        service_name = service['Spec']['Name']
        
        if service_name not in SCALING_POLICIES:
            continue
        
        policy = SCALING_POLICIES[service_name]
        service_id = service['ID']
        
        # Get current replicas
        current_replicas = service['Spec']['Mode'].get('Replicated', {}).get('Replicas', 1)
        
        # Get CPU usage
        cpu_usage = get_cpu_usage_from_docker(service_name)
        
        if cpu_usage is None:
            logger.debug(f"No CPU data for {service_name}")
            continue
        
        logger.info(f"{service_name}: {current_replicas} replicas, {cpu_usage:.1f}% CPU")
        
        if not can_scale(service_name):
            logger.debug(f"{service_name}: cooling down")
            continue
        
        # Scale up if CPU is high
        if cpu_usage > policy.scale_up_threshold and current_replicas < policy.max_replicas:
            new_replicas = min(current_replicas + policy.scale_up_increment, policy.max_replicas)
            if scale_service(service_id, service_name, new_replicas):
                last_scaled[service_name] = time.time()
        
        # Scale down if CPU is low
        elif cpu_usage < policy.scale_down_threshold and current_replicas > policy.min_replicas:
            new_replicas = max(current_replicas - policy.scale_down_increment, policy.min_replicas)
            if scale_service(service_id, service_name, new_replicas):
                last_scaled[service_name] = time.time()


if __name__ == '__main__':
    logger.info("Auto-scaler started")
    while True:
        try:
            auto_scale()
        except Exception as e:
            logger.error(f"Auto-scaling error: {e}")
        time.sleep(60)
```

## Deploy as a Swarm Service

```yaml
# autoscaler-stack.yml
version: '3.8'
services:
  autoscaler:
    image: python:3.11-slim
    command: >
      sh -c "pip install requests -q && python /app/autoscaler.py"
    configs:
      - source: autoscaler_py
        target: /app/autoscaler.py
    environment:
      PORTAINER_URL: https://portainer.example.com
      PORTAINER_API_KEY: ${PORTAINER_API_KEY}
      PORTAINER_ENDPOINT_ID: 1
      PROMETHEUS_URL: http://prometheus:9090
    deploy:
      replicas: 1
      restart_policy:
        condition: any
      placement:
        constraints:
          - node.role==manager  # Run only on manager nodes
configs:
  autoscaler_py:
    file: ./autoscaler.py
```

## Conclusion

An automated container scaling system built on the Portainer API brings horizontal auto-scaling capabilities to Docker Swarm. The scaler continuously monitors CPU utilization across service replicas and adjusts replica counts within defined policy bounds. Cooldown periods prevent thrashing, and per-service policies allow fine-tuned control over scaling behavior for different workload types.
