# How to Set Up Automated Container Health Monitoring with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Monitoring, Docker, Health Check, Automation, DevOps

Description: Learn how to configure Docker health checks in Portainer stacks and automate monitoring and alerting for unhealthy containers.

---

Docker health checks let you define when a container is "healthy" beyond just "running". Combined with Portainer's API and external monitoring tools, you can automate detection and response to unhealthy containers before users notice problems. This guide covers adding health checks to stacks and building automated monitoring workflows.

---

## Step 1: Add Health Checks to Your Portainer Stacks

Define health checks in your Docker Compose files to let Docker know how to test container health.

```yaml
# webapp-with-healthcheck-stack.yml

services:
  webapp:
    image: myapp:latest
    restart: unless-stopped
    ports:
      - "8080:8080"
    healthcheck:
      # Test: send HTTP request to health endpoint (requires curl in the image)
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s      # how often to run the check
      timeout: 10s       # max time a single check can take
      retries: 3         # unhealthy after this many consecutive failures
      start_period: 40s  # grace period before first health check

  postgres:
    image: postgres:15
    restart: unless-stopped
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    healthcheck:
      # Test: run a simple PostgreSQL command
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    healthcheck:
      # Test: ping Redis
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
```

---

## Step 2: Check Container Health via Portainer API

Poll the Portainer API to identify unhealthy containers across all environments.

```python
#!/usr/bin/env python3
# Requires: pip install requests
# check_container_health.py - monitor health status via Portainer API

import requests
import json
from datetime import datetime

PORTAINER_URL = "https://portainer.example.com"
API_KEY = "your_portainer_api_key_here"
HEADERS = {"X-API-Key": API_KEY}

def get_environments():
    """Get all Portainer environments."""
    r = requests.get(f"{PORTAINER_URL}/api/endpoints", headers=HEADERS)
    return r.json()

def get_unhealthy_containers(env_id: int) -> list:
    """List containers that are unhealthy or restarting."""
    r = requests.get(
        f"{PORTAINER_URL}/api/endpoints/{env_id}/docker/containers/json",
        headers=HEADERS,
        params={"all": True}
    )
    containers = r.json()
    return [
        c for c in containers
        if "unhealthy" in c.get("Status", "") or
           c.get("State") == "restarting"
    ]

def main():
    unhealthy_report = []
    for env in get_environments():
        containers = get_unhealthy_containers(env["Id"])
        for c in containers:
            unhealthy_report.append({
                "environment": env["Name"],
                "container": c["Names"][0].lstrip("/"),
                "status": c["Status"],
                "image": c["Image"],
                "checked_at": datetime.now().isoformat()
            })

    if unhealthy_report:
        print("UNHEALTHY CONTAINERS DETECTED:")
        print(json.dumps(unhealthy_report, indent=2))
        return 1  # exit code 1 triggers alerting in monitoring systems

    print("All containers healthy.")
    return 0

if __name__ == "__main__":
    exit(main())
```

---

## Step 3: Automate Restart of Unhealthy Containers

```bash
#!/bin/bash
# auto-restart-unhealthy.sh - restart unhealthy containers via Portainer API

PORTAINER_URL="https://portainer.example.com"
API_KEY="your_portainer_api_key_here"

# Get environments
ENV_IDS=$(curl -s -H "X-API-Key: $API_KEY" \
  "$PORTAINER_URL/api/endpoints" | \
  python3 -c "import sys,json; print(' '.join(str(e['Id']) for e in json.load(sys.stdin)))")

for ENV_ID in $ENV_IDS; do
  # Get unhealthy container IDs
  UNHEALTHY=$(curl -s -H "X-API-Key: $API_KEY" \
    "$PORTAINER_URL/api/endpoints/$ENV_ID/docker/containers/json?all=true" | \
    python3 -c "
import sys, json
containers = json.load(sys.stdin)
for c in containers:
    if 'unhealthy' in c.get('Status', ''):
        print(c['Id'], c['Names'][0])
")

  while IFS=' ' read -r CONTAINER_ID CONTAINER_NAME; do
    [ -z "$CONTAINER_ID" ] && continue
    echo "Restarting unhealthy container: $CONTAINER_NAME ($CONTAINER_ID)"
    curl -s -X POST \
      -H "X-API-Key: $API_KEY" \
      "$PORTAINER_URL/api/endpoints/$ENV_ID/docker/containers/$CONTAINER_ID/restart" > /dev/null
  done <<< "$UNHEALTHY"
done
```

---

## Step 4: Schedule the Health Check

```bash
# Run health check every 5 minutes via cron
*/5 * * * * /usr/local/bin/check_container_health.py 2>&1 | logger -t portainer-health
```

---

## Summary

Automated container health monitoring with Portainer involves three layers: Docker health checks in your Compose files that define what "healthy" means for each service, a monitoring script that polls the Portainer API for unhealthy containers, and an optional auto-restart script or alert webhook. Combined with OneUptime or another monitoring platform, this gives you full observability across your container fleet.
