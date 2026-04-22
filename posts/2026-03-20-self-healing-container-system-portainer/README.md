# How to Build a Self-Healing Container System with Portainer - Container System

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Self-Healing, Docker, Automation, DevOps, Health Check, Monitoring

Description: Learn how to build a self-healing container system that automatically detects and recovers from container failures using Portainer and Docker health checks.

---

A self-healing container system automatically detects failures and recovers without manual intervention. With Docker's built-in restart policies, health checks, and the Portainer API, you can build a system that monitors container health, restarts failing services, and sends alerts - all automatically.

---

## Layer 1: Docker Restart Policies

The first and simplest layer of self-healing. Docker automatically restarts containers when they exit.

```yaml
# self-healing-stack.yml - restart policies for each service type

services:
  webapp:
    image: myapp:latest
    # Restart always unless explicitly stopped
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  worker:
    image: myapp-worker:latest
    # Restart on failure only (useful for jobs that succeed-and-exit)
    restart: on-failure:5   # max 5 restart attempts

  db:
    image: postgres:15
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
```

---

## Layer 2: Automated Health-Based Restarts via Portainer API

Build a watchdog service that polls Portainer for unhealthy containers and restarts them.

```python
#!/usr/bin/env python3
# watchdog.py - self-healing watchdog that monitors and restarts containers

import logging
import os
import time

import requests

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

PORTAINER_URL = os.environ.get("PORTAINER_URL", "https://portainer.example.com").rstrip("/")
API_KEY = os.environ.get("PORTAINER_API_KEY", "ptr_your_api_key_here")
HEADERS = {"X-API-Key": API_KEY}
CHECK_INTERVAL = 60  # seconds between checks
MAX_RESTARTS = 3     # alert instead of restart after this many attempts

restart_counts: dict = {}

def get_unhealthy_containers(env_id: int) -> list:
    """Find containers that are unhealthy."""
    r = requests.get(
        f"{PORTAINER_URL}/api/endpoints/{env_id}/docker/containers/json",
        headers=HEADERS, params={"all": "true"}, timeout=10
    )
    r.raise_for_status()
    return [
        c for c in r.json()
        if c.get("Health", {}).get("Status") == "unhealthy"
        or "unhealthy" in c.get("Status", "")
    ]

def restart_container(env_id: int, container_id: str, name: str):
    """Restart a container via Portainer API."""
    key = f"{env_id}:{container_id}"
    restart_counts[key] = restart_counts.get(key, 0) + 1

    if restart_counts[key] > MAX_RESTARTS:
        logging.error(
            f"Container {name} has been restarted {MAX_RESTARTS}x - sending alert!"
        )
        send_alert(name, restart_counts[key])
        return

    logging.warning(f"Restarting unhealthy container: {name} (attempt {restart_counts[key]})")
    r = requests.post(
        f"{PORTAINER_URL}/api/endpoints/{env_id}/docker/containers/{container_id}/restart",
        headers=HEADERS,
        timeout=10
    )
    r.raise_for_status()

def send_alert(container_name: str, restart_count: int):
    """Send alert when a container keeps failing - integrate with your alerting system."""
    # Example: POST to a webhook (Slack, PagerDuty, OneUptime, etc.)
    r = requests.post(
        "https://your-alerting-webhook.example.com/notify",
        json={
            "text": f"ALERT: Container '{container_name}' has failed {restart_count} times",
            "severity": "critical"
        },
        timeout=10
    )
    r.raise_for_status()

def watchdog_loop():
    """Main loop: check health and heal."""
    logging.info("Self-healing watchdog started")
    r = requests.get(f"{PORTAINER_URL}/api/endpoints", headers=HEADERS, timeout=10)
    r.raise_for_status()
    envs = r.json()

    while True:
        for env in envs:
            unhealthy = get_unhealthy_containers(env["Id"])
            for c in unhealthy:
                name = c["Names"][0].lstrip("/")
                restart_container(env["Id"], c["Id"], name)

            if not unhealthy:
                # Reset restart counts for healthy containers
                env_prefix = f"{env['Id']}:"
                for key in list(restart_counts.keys()):
                    if key.startswith(env_prefix):
                        restart_counts[key] = 0

        time.sleep(CHECK_INTERVAL)

if __name__ == "__main__":
    watchdog_loop()
```

---

## Layer 3: Deploy the Watchdog as a Portainer Stack

Run the watchdog itself as a managed container in Portainer.

```yaml
# watchdog-stack.yml - the self-healing watchdog as a Portainer service

services:
  watchdog:
    image: python:3.11-slim
    restart: unless-stopped
    environment:
      PORTAINER_URL: https://portainer.example.com
      PORTAINER_API_KEY: ${PORTAINER_API_KEY}
    volumes:
      - ./watchdog.py:/app/watchdog.py:ro
    working_dir: /app
    command: >
      sh -c "pip install requests -q && python watchdog.py"
```

---

## Summary

A self-healing container system with Portainer combines three layers: Docker restart policies as the first line of defense, a watchdog script that polls the Portainer API for unhealthy containers and restarts them, and alerting integration that fires when containers fail repeatedly. The watchdog itself runs as a Portainer-managed container for consistent lifecycle management.
