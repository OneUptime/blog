# How to Integrate Portainer API with PagerDuty for Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, PagerDuty, Alerting, Monitoring

Description: Integrate the Portainer API with PagerDuty to automatically create and resolve incidents when container health issues are detected.

## Introduction

PagerDuty is a leading incident management platform. By combining the Portainer API's container monitoring capabilities with PagerDuty's alerting system, you can automatically trigger on-call escalations when containers fail, then auto-resolve incidents when they recover.

## Prerequisites

- Portainer CE or BE with API access
- PagerDuty account with a service configured
- Python 3.8+ with `requests` library
- PagerDuty Events API v2 integration key

## Setting Up PagerDuty

1. Log in to PagerDuty
2. Go to **Services > Service Directory > New Service**
3. Name it "Container Infrastructure"
4. Choose **Events API v2** as the integration type
5. Copy the **Integration Key** (looks like `abc123def456...`)

## The Integration Script

```python
#!/usr/bin/env python3
# portainer_pagerduty.py

import hashlib
import logging
import os
import time
from datetime import datetime

import requests

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration

PORTAINER_URL = os.getenv("PORTAINER_URL", "https://portainer.example.com")
PORTAINER_API_KEY = os.getenv("PORTAINER_API_KEY", "your-portainer-api-key")
PAGERDUTY_ROUTING_KEY = os.getenv("PAGERDUTY_ROUTING_KEY", "your-pagerduty-integration-key")
ENDPOINT_ID = int(os.getenv("ENDPOINT_ID", "1"))
CHECK_INTERVAL = int(os.getenv("CHECK_INTERVAL", "60"))  # seconds

# Track active incidents to avoid duplicate alerts
active_incidents = {}


def get_containers():
    """Fetch all containers from Portainer."""
    resp = requests.get(
        f"{PORTAINER_URL}/api/endpoints/{ENDPOINT_ID}/docker/containers/json",
        params={"all": "true"},
        headers={"X-API-Key": PORTAINER_API_KEY},
        timeout=10
    )
    resp.raise_for_status()
    return resp.json()


def get_container_details(container_id: str):
    """Fetch a container's inspection details from Portainer."""
    resp = requests.get(
        f"{PORTAINER_URL}/api/endpoints/{ENDPOINT_ID}/docker/containers/{container_id}/json",
        headers={"X-API-Key": PORTAINER_API_KEY},
        timeout=10
    )
    resp.raise_for_status()
    return resp.json()


def create_dedup_key(container_name: str, issue_type: str) -> str:
    """Create a consistent dedup key for PagerDuty incidents."""
    key = f"{PORTAINER_URL}-{ENDPOINT_ID}-{container_name}-{issue_type}"
    return hashlib.md5(key.encode()).hexdigest()


def send_pagerduty_event(routing_key: str, action: str, dedup_key: str,
                          summary: str, source: str, severity: str = "error",
                          custom_details: dict = None):
    """Send an event to PagerDuty Events API v2."""
    payload = {
        "routing_key": routing_key,
        "event_action": action,  # trigger, acknowledge, resolve
        "dedup_key": dedup_key,
        "payload": {
            "summary": summary,
            "source": source,
            "severity": severity,  # critical, error, warning, info
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "custom_details": custom_details or {}
        },
        "links": [
            {
                "href": f"{PORTAINER_URL}",
                "text": "Open Portainer"
            }
        ]
    }

    resp = requests.post(
        "https://events.pagerduty.com/v2/enqueue",
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=10
    )
    resp.raise_for_status()
    return resp.json()


def trigger_incident(container_name: str, issue: str, severity: str = "error", details: dict = None):
    """Trigger a PagerDuty incident."""
    dedup_key = create_dedup_key(container_name, issue)

    if dedup_key in active_incidents:
        logger.debug(f"Incident already active for {container_name}: {issue}")
        return

    result = send_pagerduty_event(
        routing_key=PAGERDUTY_ROUTING_KEY,
        action="trigger",
        dedup_key=dedup_key,
        summary=f"Container {container_name}: {issue}",
        source=f"Portainer/{PORTAINER_URL}",
        severity=severity,
        custom_details={
            "container": container_name,
            "issue": issue,
            "portainer_url": PORTAINER_URL,
            "endpoint_id": ENDPOINT_ID,
            **(details or {})
        }
    )

    active_incidents[dedup_key] = {
        "container": container_name,
        "issue": issue,
        "triggered_at": datetime.utcnow().isoformat()
    }

    logger.warning(f"PagerDuty incident triggered for {container_name}: {issue}")
    return result


def resolve_incident(container_name: str, issue: str):
    """Resolve a PagerDuty incident."""
    dedup_key = create_dedup_key(container_name, issue)

    if dedup_key not in active_incidents:
        return

    send_pagerduty_event(
        routing_key=PAGERDUTY_ROUTING_KEY,
        action="resolve",
        dedup_key=dedup_key,
        summary=f"Container {container_name} recovered",
        source=f"Portainer/{PORTAINER_URL}"
    )

    del active_incidents[dedup_key]
    logger.info(f"PagerDuty incident resolved for {container_name}: {issue}")


def resolve_container_state_incidents(container_name: str, current_issue: str = None):
    """Resolve any active state incidents for a container."""
    state_issues = [
        incident["issue"]
        for incident in list(active_incidents.values())
        if incident["container"] == container_name
        and incident["issue"].startswith("Container is ")
        and incident["issue"] != current_issue
    ]

    for issue in state_issues:
        resolve_incident(container_name, issue)


def check_and_alert():
    """Check container health and send PagerDuty alerts."""
    containers = get_containers()

    for container in containers:
        container_id = container['Id']
        name = container['Names'][0].lstrip('/')
        state = container['State'].lower()

        if state != 'running':
            issue = f"Container is {state}"
            resolve_container_state_incidents(name, current_issue=issue)
            resolve_incident(name, "Docker healthcheck failed")
            trigger_incident(
                container_name=name,
                issue=issue,
                severity="critical",
                details={"state": state, "status": container['Status']}
            )
        else:
            resolve_container_state_incidents(name)

            # Check Docker healthcheck from container inspection details
            container_details = get_container_details(container_id)
            health_status = container_details.get('State', {}).get('Health', {}).get('Status', '').lower()
            if health_status == 'unhealthy':
                trigger_incident(
                    container_name=name,
                    issue="Docker healthcheck failed",
                    severity="error"
                )
            elif health_status == 'healthy':
                resolve_incident(name, "Docker healthcheck failed")

    logger.info(f"Checked {len(containers)} containers, {len(active_incidents)} active incidents")


if __name__ == '__main__':
    logger.info("Starting Portainer-PagerDuty integration")
    while True:
        try:
            check_and_alert()
        except Exception as e:
            logger.error(f"Check cycle failed: {e}")
        time.sleep(CHECK_INTERVAL)
```

## Deploying as a Docker Service

```yaml
# docker-compose.yml
services:
  pagerduty-integration:
    image: python:3.11-slim
    restart: always
    environment:
      PORTAINER_URL: https://portainer.example.com
      PORTAINER_API_KEY: your-api-key
      PAGERDUTY_ROUTING_KEY: your-routing-key
      ENDPOINT_ID: "1"
    volumes:
      - ./portainer_pagerduty.py:/app/monitor.py
    command: sh -c "pip install requests -q && python /app/monitor.py"
```

## Testing the Integration

```bash
# Manually stop a container to trigger an incident
docker stop my-container

# Watch the logs for the alert
docker compose logs -f pagerduty-integration

# Start the container to test auto-resolution
docker start my-container
```

## Conclusion

The Portainer-PagerDuty integration provides automated incident management for containerized workloads. Container failures automatically create PagerDuty incidents with deduplication, and recovery automatically resolves them-reducing alert fatigue and ensuring your on-call team is notified only when action is needed.
