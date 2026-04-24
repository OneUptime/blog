# How to Integrate Portainer API with Datadog for Monitoring - Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Datadog, Monitoring, API, Observability, DevOps

Description: Use the Portainer REST API to collect container and service metrics, then submit them to Datadog for dashboards, anomaly detection, and alerting across your container infrastructure.

---

Portainer exposes container statistics and service health through its REST API. By periodically querying this API and forwarding the data to Datadog's metrics API, you can build dashboards and alerts for container infrastructure without deploying the Datadog agent on every host.

## Integration Approaches

| Approach | When to Use |
|---|---|
| Portainer API → Datadog Metrics API | Simple metrics from Portainer's perspective |
| Datadog Agent on hosts | Full host + container metrics, auto-discovery |
| OpenTelemetry Collector | If you also have application traces/logs |

This guide covers the Portainer API approach for environments where deploying the Datadog agent is not feasible.

## Step 1: Get Portainer API Token

In Portainer, go to **My Account > Access Tokens** and generate a token.

## Step 2: Get Datadog API Key

In Datadog, go to **Organization Settings > API Keys** and create an API key.

## Step 3: Metrics Collection Script

```python
#!/usr/bin/env python3
"""
Collect Portainer container stats and forward to Datadog.
"""
import requests
import time
import os

PORTAINER_URL = os.environ["PORTAINER_URL"].rstrip("/")
PORTAINER_TOKEN = os.environ["PORTAINER_TOKEN"]
PORTAINER_CA_CERT = os.environ.get("PORTAINER_CA_CERT")
PORTAINER_VERIFY_TLS = os.environ.get("PORTAINER_VERIFY_TLS", "true").lower() == "true"
DATADOG_API_KEY = os.environ["DD_API_KEY"]
DATADOG_SITE = os.environ.get("DD_SITE", "datadoghq.com")
ENDPOINT_ID = int(os.environ.get("PORTAINER_ENDPOINT_ID", "1"))

def portainer_verify():
    return PORTAINER_CA_CERT or PORTAINER_VERIFY_TLS

def get_containers():
    resp = requests.get(
        f"{PORTAINER_URL}/api/endpoints/{ENDPOINT_ID}/docker/containers/json",
        headers={"X-API-Key": PORTAINER_TOKEN},
        verify=portainer_verify(),
        params={"all": "false"}  # Only running containers
    )
    resp.raise_for_status()
    return resp.json()

def get_container_stats(container_id):
    resp = requests.get(
        f"{PORTAINER_URL}/api/endpoints/{ENDPOINT_ID}/docker/containers/{container_id}/stats",
        headers={"X-API-Key": PORTAINER_TOKEN},
        verify=portainer_verify(),
        params={"stream": "false"}
    )
    resp.raise_for_status()
    return resp.json()

def calculate_cpu_percent(stats):
    cpu_stats = stats.get("cpu_stats", {})
    precpu_stats = stats.get("precpu_stats", {})
    cpu_delta = cpu_stats.get("cpu_usage", {}).get("total_usage", 0) - \
                precpu_stats.get("cpu_usage", {}).get("total_usage", 0)
    system_delta = cpu_stats.get("system_cpu_usage", 0) - \
                   precpu_stats.get("system_cpu_usage", 0)
    num_cpus = cpu_stats.get("online_cpus") or len(
        cpu_stats.get("cpu_usage", {}).get("percpu_usage", [1])
    )
    if cpu_delta <= 0 or system_delta <= 0:
        return 0.0
    return (cpu_delta / system_delta) * num_cpus * 100.0

def submit_to_datadog(metrics):
    now = int(time.time())
    series = [
        {
            "metric": f"portainer.container.{m['name']}",
            "points": [[now, m["value"]]],
            "type": "gauge",
            "tags": m["tags"]
        }
        for m in metrics
    ]
    resp = requests.post(
        f"https://api.{DATADOG_SITE}/api/v1/series",
        headers={
            "Content-Type": "application/json",
            "DD-API-KEY": DATADOG_API_KEY
        },
        json={"series": series}
    )
    return resp.status_code

if __name__ == "__main__":
    containers = get_containers()
    metrics = []
    
    for container in containers:
        cid = container["Id"]
        name = container["Names"][0].lstrip("/")
        
        stats = get_container_stats(cid)
        cpu = calculate_cpu_percent(stats)
        memory = stats["memory_stats"]["usage"]
        memory_limit = stats["memory_stats"]["limit"]
        
        tags = [f"container:{name}", f"image:{container['Image']}"]
        
        metrics.extend([
            {"name": "cpu_percent", "value": cpu, "tags": tags},
            {"name": "memory_bytes", "value": memory, "tags": tags},
            {"name": "memory_percent", "value": (memory / memory_limit) * 100, "tags": tags}
        ])
    
    status = submit_to_datadog(metrics)
    print(f"Submitted {len(metrics)} metrics to Datadog: HTTP {status}")
```

## Step 4: Deploy as a Portainer Stack

Because Portainer serves HTTPS with a self-signed certificate by default, either provide a trusted CA bundle with `PORTAINER_CA_CERT` or set `PORTAINER_VERIFY_TLS=false` for internal testing. If you deploy this from Git in Portainer, place `collector.py` next to the compose file and enable relative path volumes so `./collector.py` resolves correctly.

```yaml
version: "3.8"
services:
  datadog-bridge:
    image: python:3.12-slim
    command: >
      sh -c "pip install requests -q &&
             while true; do python /app/collector.py; sleep 30; done"
    environment:
      - PORTAINER_URL=https://your-portainer-host:9443
      - PORTAINER_ENDPOINT_ID=${PORTAINER_ENDPOINT_ID}
      - PORTAINER_TOKEN=${PORTAINER_TOKEN}
      - PORTAINER_VERIFY_TLS=false
      - DD_API_KEY=${DD_API_KEY}
      - DD_SITE=datadoghq.com
    volumes:
      - ./collector.py:/app/collector.py:ro
    restart: unless-stopped
```

## Step 5: Create Datadog Dashboard

With metrics flowing, create a Datadog dashboard with:

- Time series: `portainer.container.cpu_percent` by container tag
- Top list: highest memory consumers
- Alert: CPU > 80% for 5 minutes

## Summary

Portainer's REST API provides container metrics that can be forwarded to Datadog for centralized monitoring. This approach works without installing the Datadog agent directly on hosts, making it useful for environments with strict agent installation requirements.
