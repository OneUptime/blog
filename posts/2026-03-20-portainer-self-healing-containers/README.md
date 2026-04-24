# How to Build a Self-Healing Container System with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Automation, Self-Healing, Reliability

Description: Build a self-healing container system that automatically detects and remedies container failures using the Portainer API and Docker health checks.

## Introduction

A self-healing container system automatically detects unhealthy containers and takes corrective action-restarting, re-deploying, or alerting as appropriate. By combining Docker health checks, restart policies, and the Portainer API, you can build a system that maintains high availability with minimal human intervention.
Docker restart policies recover containers when the main process exits, while health checks mark degraded containers as unhealthy for higher-level automation to act on.

## Layer 1: Docker Restart Policies

The first line of defense is Docker's built-in restart policies:

```yaml
services:
  api:
    image: myapp:latest
    restart: unless-stopped  # Restart unless the container is explicitly stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  db:
    image: postgres:15
    restart: always  # Restart whenever the container stops
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      retries: 5
```

## Layer 2: Self-Healing Service

```python
#!/usr/bin/env python3
# self_healer.py

import requests
import time
import logging
import os
from collections import defaultdict
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

PORTAINER_URL = os.getenv("PORTAINER_URL", "https://portainer.example.com").rstrip("/")
API_KEY = os.getenv("PORTAINER_API_KEY", "your-api-key")
ENDPOINT_ID = int(os.getenv("ENDPOINT_ID", "1"))
CHECK_INTERVAL = 30   # Check every 30 seconds
UNHEALTHY_THRESHOLD = 3    # Remediate after 3 consecutive failures
RESTART_COOLDOWN = 300     # 5 minutes between restarts

headers = {"X-API-Key": API_KEY}
base = f"{PORTAINER_URL}/api/endpoints/{ENDPOINT_ID}/docker"

# Track failure counts and last restart times

failure_counts = defaultdict(int)
last_restart = {}


def get_containers():
    resp = requests.get(
        f"{base}/containers/json",
        params={"all": "true"},
        headers=headers,
        timeout=30
    )
    resp.raise_for_status()
    return resp.json()


def inspect_container(container_id: str) -> dict:
    resp = requests.get(
        f"{base}/containers/{container_id}/json",
        headers=headers,
        timeout=30
    )
    resp.raise_for_status()
    return resp.json()


def restart_container(container_id: str, name: str) -> bool:
    """Restart a container via Portainer API."""
    resp = requests.post(
        f"{base}/containers/{container_id}/restart",
        headers=headers,
        timeout=30
    )
    if resp.status_code == 204:
        logger.info(f"Restarted container: {name}")
        return True
    logger.error(f"Failed to restart {name}: {resp.status_code}")
    return False


def redeploy_stack(stack_name: str) -> bool:
    """Trigger a file-based stack redeploy for persistent failures."""
    resp = requests.get(
        f"{PORTAINER_URL}/api/stacks",
        params={"endpointId": ENDPOINT_ID},
        headers=headers,
        timeout=30
    )
    resp.raise_for_status()
    stacks = resp.json()
    
    for stack in stacks:
        if stack['Name'] == stack_name:
            stack_id = stack['Id']
            # Get current compose file
            file_resp = requests.get(
                f"{PORTAINER_URL}/api/stacks/{stack_id}/file",
                headers=headers,
                timeout=30
            )
            file_resp.raise_for_status()
            compose = file_resp.json().get('StackFileContent', '')
            
            # Update/redeploy
            update_resp = requests.put(
                f"{PORTAINER_URL}/api/stacks/{stack_id}?endpointId={ENDPOINT_ID}",
                headers=headers,
                json={"StackFileContent": compose, "Prune": False},
                timeout=30
            )
            if update_resp.status_code == 200:
                logger.info(f"Redeployed stack: {stack_name}")
                return True
    
    return False


def can_restart(container_name: str) -> bool:
    """Check if we're past the cooldown period."""
    last = last_restart.get(container_name)
    if last is None:
        return True
    elapsed = (datetime.now(timezone.utc) - last).total_seconds()
    return elapsed >= RESTART_COOLDOWN


def heal_container(container: dict):
    """Apply healing action to an unhealthy container."""
    name = container['Names'][0].replace('/', '')
    container_id = container['Id']
    
    if not can_restart(name):
        logger.warning(f"Skipping restart of {name}: cooling down")
        return
    
    failure_counts[name] += 1
    
    if failure_counts[name] >= UNHEALTHY_THRESHOLD:
        logger.warning(f"Container {name} failed {failure_counts[name]} times, restarting...")
        if restart_container(container_id, name):
            last_restart[name] = datetime.now(timezone.utc)
            failure_counts[name] = 0


def check_and_heal():
    """Main healing loop iteration."""
    containers = get_containers()
    healed = set()
    
    for container in containers:
        name = container['Names'][0].replace('/', '')
        container_id = container['Id']
        state = container['State']
        health = 'none'

        # ContainerList uses a smaller summary representation, so inspect is
        # required to read State.Health.Status.
        if state == 'running':
            details = inspect_container(container_id)
            health = details.get('State', {}).get('Health', {}).get('Status', 'none')
        
        needs_healing = False
        reason = ""
        
        if state in ('exited', 'dead'):
            needs_healing = True
            reason = f"state={state}"
        elif state == 'running' and health == 'unhealthy':
            needs_healing = True
            reason = "healthcheck=unhealthy"
        
        if needs_healing:
            logger.warning(f"Container {name} needs healing: {reason}")
            heal_container(container)
            healed.add(name)
        else:
            # Reset failure count for healthy containers
            if name in failure_counts and failure_counts[name] > 0:
                logger.info(f"Container {name} is healthy, resetting failure count")
                failure_counts[name] = 0
    
    if not healed:
        logger.info(f"All {len(containers)} containers healthy")


if __name__ == '__main__':
    logger.info("Self-healing system started")
    while True:
        try:
            check_and_heal()
        except Exception as e:
            logger.error(f"Healer error: {e}")
        time.sleep(CHECK_INTERVAL)
```

## Deploy as Portainer Stack

```yaml
# self-healer-stack.yml
services:
  self-healer:
    image: python:3.11-slim
    restart: always
    environment:
      PORTAINER_URL: https://portainer.example.com
      PORTAINER_API_KEY: ${PORTAINER_API_KEY}
      ENDPOINT_ID: "1"
    command: >
      sh -c "pip install requests -q && python /app/self_healer.py"
    volumes:
      - ./self_healer.py:/app/self_healer.py:ro
```

## Conclusion

A self-healing container system operates in multiple layers: Docker restart policies handle immediate failures, health checks detect degraded states, and the Portainer API enables intelligent remediation with cooldown logic to prevent restart storms. This system dramatically reduces mean time to recovery (MTTR) and reduces on-call burden by automatically resolving the most common container failures.
