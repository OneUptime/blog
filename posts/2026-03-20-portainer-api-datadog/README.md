# How to Integrate Portainer API with Datadog for Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Datadog, Monitoring, Metric

Description: Send container metrics and events from Portainer to Datadog for unified infrastructure monitoring and alerting.

## Introduction

Datadog is a comprehensive monitoring platform. By querying the Portainer API for container metrics and forwarding them to Datadog, you can correlate container performance data with your broader infrastructure metrics, create dashboards, and set up monitors.

## Prerequisites

- Portainer CE or BE with API access
- Datadog account with an API key and application key
- Python 3.8+ with `datadog` and `requests`

## Installing Dependencies

```bash
pip install datadog requests
```

## Collecting Container Metrics

```python
#!/usr/bin/env python3
# portainer_datadog_collector.py

import requests
import time
import logging
import os
from datadog import initialize, api

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration

PORTAINER_URL = os.getenv("PORTAINER_URL", "https://portainer.example.com")
PORTAINER_API_KEY = os.getenv("PORTAINER_API_KEY", "your-portainer-api-key")
DATADOG_API_KEY = os.getenv("DATADOG_API_KEY", os.getenv("DD_API_KEY", "your-datadog-api-key"))
DATADOG_APP_KEY = os.getenv("DATADOG_APP_KEY", os.getenv("DD_APP_KEY", "your-datadog-app-key"))
DATADOG_SITE = os.getenv("DATADOG_SITE", os.getenv("DD_SITE", "datadoghq.com"))
ENDPOINT_ID = int(os.getenv("PORTAINER_ENDPOINT_ID", "1"))
COLLECT_INTERVAL = int(os.getenv("COLLECT_INTERVAL", "60"))

# Initialize Datadog
initialize(
    api_key=DATADOG_API_KEY,
    app_key=DATADOG_APP_KEY,
    api_host=f"https://api.{DATADOG_SITE}/"
)

portainer_headers = {"X-API-Key": PORTAINER_API_KEY}


def get_containers():
    """Fetch containers from Portainer."""
    resp = requests.get(
        f"{PORTAINER_URL}/api/endpoints/{ENDPOINT_ID}/docker/containers/json",
        params={"all": "true"},
        headers=portainer_headers,
        timeout=10
    )
    resp.raise_for_status()
    return resp.json()


def get_container_stats(container_id: str) -> dict:
    """Get real-time container stats."""
    resp = requests.get(
        f"{PORTAINER_URL}/api/endpoints/{ENDPOINT_ID}/docker/containers/{container_id}/stats",
        params={"stream": "false"},
        headers=portainer_headers,
        timeout=15
    )
    resp.raise_for_status()
    return resp.json()


def calculate_cpu_percent(stats: dict) -> float:
    """Calculate CPU percentage from Docker stats."""
    cpu_stats = stats.get('cpu_stats', {})
    precpu_stats = stats.get('precpu_stats', {})
    cpu_usage = cpu_stats.get('cpu_usage', {})
    precpu_usage = precpu_stats.get('cpu_usage', {})

    cpu_delta = cpu_usage.get('total_usage', 0) - precpu_usage.get('total_usage', 0)
    system_delta = cpu_stats.get('system_cpu_usage', 0) - precpu_stats.get('system_cpu_usage', 0)
    num_cpus = cpu_stats.get('online_cpus') or len(cpu_usage.get('percpu_usage', []) or []) or 1

    if system_delta > 0 and cpu_delta > 0:
        return (cpu_delta / system_delta) * num_cpus * 100.0
    return 0.0


def bytes_to_mb(b: int) -> float:
    """Convert bytes to megabytes."""
    return b / (1024 * 1024)


def collect_and_send_metrics():
    """Collect container metrics and send to Datadog."""
    containers = get_containers()
    timestamp = int(time.time())
    metrics = []

    # Count containers by state
    state_counts = {}
    for c in containers:
        state = c['State']
        state_counts[state] = state_counts.get(state, 0) + 1

    # Send aggregate metrics
    for state, count in state_counts.items():
        metrics.append({
            'metric': 'portainer.containers.count',
            'points': [(timestamp, count)],
            'tags': [
                f'state:{state}',
                f'endpoint_id:{ENDPOINT_ID}',
                f'portainer_url:{PORTAINER_URL}'
            ]
        })

    # Collect per-container metrics
    for container in containers:
        name = container['Names'][0].replace('/', '')
        image = container['Image'].split(':')[0].split('/')[-1]
        tags = [
            f'container_name:{name}',
            f'image:{image}',
            f'state:{container["State"]}',
            f'endpoint_id:{ENDPOINT_ID}'
        ]

        # Send container state (1=running, 0=stopped)
        is_running = 1 if container['State'] == 'running' else 0
        metrics.append({
            'metric': 'portainer.container.running',
            'points': [(timestamp, is_running)],
            'tags': tags
        })

        # Collect resource stats for running containers
        if container['State'] == 'running':
            try:
                stats = get_container_stats(container['Id'])

                cpu_percent = calculate_cpu_percent(stats)
                mem_usage = bytes_to_mb(stats['memory_stats']['usage'])
                mem_limit = bytes_to_mb(stats['memory_stats']['limit'])
                mem_percent = (mem_usage / mem_limit * 100) if mem_limit > 0 else 0

                # Network I/O
                net_rx_bytes = sum(
                    iface['rx_bytes']
                    for iface in stats.get('networks', {}).values()
                )
                net_tx_bytes = sum(
                    iface['tx_bytes']
                    for iface in stats.get('networks', {}).values()
                )

                # Block I/O
                blk_stats = stats.get('blkio_stats', {}).get('io_service_bytes_recursive', [])
                blk_read = sum(s['value'] for s in blk_stats if s['op'] == 'Read')
                blk_write = sum(s['value'] for s in blk_stats if s['op'] == 'Write')

                container_metrics = [
                    ('portainer.container.cpu_percent', cpu_percent),
                    ('portainer.container.memory_mb', mem_usage),
                    ('portainer.container.memory_percent', mem_percent),
                    ('portainer.container.net_rx_bytes', net_rx_bytes),
                    ('portainer.container.net_tx_bytes', net_tx_bytes),
                    ('portainer.container.blk_read_bytes', blk_read),
                    ('portainer.container.blk_write_bytes', blk_write),
                ]

                for metric_name, value in container_metrics:
                    metrics.append({
                        'metric': metric_name,
                        'points': [(timestamp, value)],
                        'tags': tags
                    })

                logger.debug(f"{name}: CPU={cpu_percent:.1f}% MEM={mem_percent:.1f}%")

            except Exception as e:
                logger.warning(f"Failed to collect stats for {name}: {e}")

    # Send all metrics to Datadog in one batch
    if metrics:
        api.Metric.send(metrics)
        logger.info(f"Sent {len(metrics)} metrics to Datadog for {len(containers)} containers")


def send_event(title: str, text: str, tags: list, alert_type: str = "info"):
    """Send an event to Datadog."""
    api.Event.create(
        title=title,
        text=text,
        tags=tags + [f'endpoint_id:{ENDPOINT_ID}'],
        alert_type=alert_type,  # error, warning, info, success
        source_type_name="portainer"
    )


if __name__ == '__main__':
    logger.info("Starting Portainer-Datadog collector")
    while True:
        try:
            collect_and_send_metrics()
        except Exception as e:
            logger.error(f"Collection cycle failed: {e}")
        time.sleep(COLLECT_INTERVAL)
```

## Creating a Datadog Monitor

```bash
# Create a monitor via Datadog API when containers go down
curl -X POST "https://api.datadoghq.com/api/v1/monitor" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: your-api-key" \
  -H "DD-APPLICATION-KEY: your-app-key" \
  -d '{
    "name": "Container Down Alert",
    "type": "query alert",
    "query": "avg(last_5m):avg:portainer.container.running{*} by {container_name} < 1",
    "message": "Container {{container_name.name}} is down! @pagerduty",
    "tags": ["portainer", "container"],
    "options": {
      "notify_no_data": true,
      "no_data_timeframe": 10,
      "thresholds": {
        "critical": 1
      }
    }
  }'
```

## Docker Compose Deployment

```yaml
version: '3.8'
services:
  datadog-collector:
    image: python:3.11-slim
    restart: always
    environment:
      PORTAINER_URL: https://portainer.example.com
      PORTAINER_API_KEY: ${PORTAINER_API_KEY}
      PORTAINER_ENDPOINT_ID: "1"
      DATADOG_API_KEY: ${DATADOG_API_KEY}
      DATADOG_APP_KEY: ${DATADOG_APP_KEY}
      DATADOG_SITE: datadoghq.com
      COLLECT_INTERVAL: "60"
    command: >
      sh -c "pip install datadog requests -q &&
             python /app/collector.py"
    volumes:
      - ./portainer_datadog_collector.py:/app/collector.py
```

## Conclusion

Integrating Portainer with Datadog gives you unified visibility across your entire infrastructure. Container metrics flow into Datadog alongside host metrics, application traces, and logs-enabling correlation analysis, SLO tracking, and anomaly detection across your containerized workloads.
