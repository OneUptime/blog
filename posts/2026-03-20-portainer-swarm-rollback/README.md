# How to Configure Service Rollback Policies in Portainer on Swarm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Rollback, Deployment, Reliability

Description: Configure automatic and manual rollback policies for Docker Swarm services in Portainer to recover quickly from failed deployments.

## Introduction

Rollbacks are critical for maintaining service availability when deployments fail. Docker Swarm supports both automatic rollback (triggered when an update fails during the monitor period) and manual rollback (via CLI or API). Portainer provides UI controls for managing rollbacks.

## Automatic Rollback Configuration

```yaml
# services with auto-rollback

version: '3.8'

services:
  api:
    image: myapp:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 15s
        failure_action: rollback     # Auto-rollback when an update fails
        monitor: 30s                 # Time to monitor after each task update
        max_failure_ratio: 0.2       # 20% failure rate triggers rollback
        order: start-first
      rollback_config:
        parallelism: 0               # 0 = rollback all at once
        delay: 0s
        failure_action: pause        # Pause on rollback failure
        monitor: 30s
        max_failure_ratio: 0.0       # Zero tolerance during rollback
        order: stop-first
    healthcheck:
      test: ["CMD", "curl", "-sf", "http://localhost:8080/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 20s
```

## Manual Rollback via Portainer UI

1. Go to **Services** and select your service
2. Click **Rollback the service**
3. Confirm the rollback

## Manual Rollback via Docker CLI

```bash
# Rollback to the previous version of a service
docker service rollback myapp_api

# Check rollback status
docker service ps myapp_api --no-trunc

# Watch rollback progress
watch -n 2 "docker service ps myapp_api | head -10"
```

## Manual Rollback via Portainer API

```bash
# Get service ID
SERVICE_ID=$(docker service inspect myapp_api --format '{{.ID}}')

# Get current version
VERSION=$(docker service inspect "$SERVICE_ID" --format '{{.Version.Index}}')

# Get current service spec
SERVICE_SPEC=$(docker service inspect "$SERVICE_ID" --format '{{json .Spec}}')

# Trigger rollback
curl -X POST \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  --data "$SERVICE_SPEC" \
  "https://portainer.example.com/api/endpoints/1/docker/services/$SERVICE_ID/update?version=$VERSION&rollback=previous"
```

## Deployment History Tracking

```python
#!/usr/bin/env python3
# track_deployments.py

import requests
import json
from datetime import datetime

PORTAINER_URL = "https://portainer.example.com"
API_KEY = "your-api-key"

def get_service_tasks(service_id: str) -> list:
    """Get task history for a service."""
    resp = requests.get(
        f"{PORTAINER_URL}/api/endpoints/1/docker/tasks",
        params={"filters": json.dumps({"service": [service_id]})},
        headers={"X-API-Key": API_KEY}
    )
    return resp.json()

def show_deployment_history(service_name: str):
    """Show deployment history for a service."""
    resp = requests.get(
        f"{PORTAINER_URL}/api/endpoints/1/docker/services",
        headers={"X-API-Key": API_KEY}
    )
    services = resp.json()
    
    service = next((s for s in services if s['Spec']['Name'] == service_name), None)
    if not service:
        print(f"Service {service_name} not found")
        return
    
    tasks = get_service_tasks(service['ID'])
    
    # Group by image version
    versions = {}
    for task in tasks:
        image = task['Spec']['ContainerSpec']['Image']
        state = task['Status']['State']
        timestamp = task['CreatedAt']
        
        if image not in versions:
            versions[image] = {'started': timestamp, 'tasks': 0, 'running': 0}
        versions[image]['tasks'] += 1
        if state == 'running':
            versions[image]['running'] += 1
    
    print(f"\nDeployment history for {service_name}:")
    print("-" * 60)
    for image, info in sorted(versions.items(), key=lambda x: x[1]['started'], reverse=True)[:5]:
        status = "RUNNING" if info['running'] > 0 else "old"
        print(f"{status:8} {image}")
        print(f"         Tasks: {info['running']}/{info['tasks']} running")

if __name__ == '__main__':
    show_deployment_history("myapp_api")
```

## Rollback Checklist

Before triggering a rollback:

```bash
# 1. Verify the issue is with the new deployment (not external)
docker service ps myapp_api --no-trunc
docker service logs myapp_api --tail 50

# 2. Check health status
docker service inspect myapp_api --format '{{.UpdateStatus}}'

# 3. Verify the previous image is still available
docker service inspect myapp_api \
  --format '{{.PreviousSpec.TaskTemplate.ContainerSpec.Image}}'

# 4. Execute rollback
docker service rollback myapp_api

# 5. Monitor the rollback
docker service ps myapp_api
```

## Conclusion

Rollback policies in Docker Swarm provide a safety net for deployments. Automatic rollbacks triggered by failed updates during the monitor window minimize downtime, while manual rollback commands give operators control in complex situations. Portainer's service management UI makes triggering rollbacks accessible without Docker CLI knowledge, and the Portainer API enables programmatic rollback in CI/CD pipelines.
