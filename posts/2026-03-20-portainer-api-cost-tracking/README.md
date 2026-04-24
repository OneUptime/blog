# How to Build a Cost Tracking Tool Using Portainer API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Cost, FinOps, Automation

Description: Build a container cost tracking tool that uses Portainer API to correlate resource usage with cost allocation across teams and projects.

## Introduction

Container workloads can rapidly consume compute resources, but attributing costs to teams or projects is often difficult. This guide shows how to use the Portainer API to collect resource usage data, assign costs based on labels, and generate reports for chargeback or showback purposes.

## Prerequisites

- Portainer CE or BE with API access
- Containers labeled with team/project identifiers
- Python 3.8+ with the `requests` library
- Cost data for your infrastructure

## Cost Model

Define your cost model based on your infrastructure:

```python
# cost_model.py

# Adjust prices based on your actual infrastructure costs

COST_MODEL = {
    # Per-hour costs
    'cpu_core_hour': 0.048,      # Cost per CPU core per hour
    'memory_gb_hour': 0.006,     # Cost per GB of RAM per hour
    'storage_gb_month': 0.10,    # Cost per GB of storage per month
    'network_gb': 0.01,          # Cost per GB of network transfer
}
```

## The Cost Tracking Script

```python
#!/usr/bin/env python3
# container_cost_tracker.py

import json
import csv
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone

import requests

PORTAINER_URL = os.getenv("PORTAINER_URL", "https://portainer.example.com")
PORTAINER_API_KEY = os.getenv("PORTAINER_API_KEY", "your-api-key")
ENDPOINT_ID = int(os.getenv("ENDPOINT_ID", "1"))
OUTPUT_DIR = os.getenv("OUTPUT_DIR", ".")

# Cost model (per hour)
CPU_CORE_HOUR = 0.048
MEMORY_GB_HOUR = 0.006

headers = {"X-API-Key": PORTAINER_API_KEY}


def get_containers():
    """Fetch all running containers."""
    resp = requests.get(
        f"{PORTAINER_URL}/api/endpoints/{ENDPOINT_ID}/docker/containers/json",
        params={"all": "false"},
        headers=headers,
        timeout=10
    )
    resp.raise_for_status()
    return resp.json()


def get_container_stats(container_id: str) -> dict:
    """Get container resource stats."""
    resp = requests.get(
        f"{PORTAINER_URL}/api/endpoints/{ENDPOINT_ID}/docker/containers/{container_id}/stats",
        params={"stream": "false"},
        headers=headers,
        timeout=15
    )
    resp.raise_for_status()
    return resp.json()


def get_container_inspect(container_id: str) -> dict:
    """Get detailed container information including labels."""
    resp = requests.get(
        f"{PORTAINER_URL}/api/endpoints/{ENDPOINT_ID}/docker/containers/{container_id}/json",
        headers=headers,
        timeout=10
    )
    resp.raise_for_status()
    return resp.json()


def calculate_cpu_usage(stats: dict) -> float:
    """Calculate CPU cores used (fractional)."""
    cpu_stats = stats.get('cpu_stats', {})
    precpu_stats = stats.get('precpu_stats', {})
    cpu_usage = cpu_stats.get('cpu_usage', {})
    precpu_usage = precpu_stats.get('cpu_usage', {})

    cpu_delta = cpu_usage.get('total_usage', 0) - precpu_usage.get('total_usage', 0)
    system_delta = cpu_stats.get('system_cpu_usage', 0) - precpu_stats.get('system_cpu_usage', 0)
    num_cpus = cpu_stats.get('online_cpus') or len(cpu_usage.get('percpu_usage') or []) or 1

    if system_delta > 0 and cpu_delta > 0:
        return (cpu_delta / system_delta) * num_cpus
    return 0.0


def calculate_memory_gb(stats: dict) -> float:
    """Calculate memory usage in GB."""
    usage = stats['memory_stats'].get('usage', 0)
    return usage / (1024 ** 3)


def collect_usage_data():
    """Collect resource usage for all containers."""
    containers = get_containers()
    usage_data = []

    for container in containers:
        container_id = container['Id']
        name = container['Names'][0].replace('/', '')

        try:
            # Get labels from inspect
            details = get_container_inspect(container_id)
            labels = details.get('Config', {}).get('Labels', {})

            # Extract cost allocation labels
            team = labels.get('team', labels.get('com.team', 'unassigned'))
            project = labels.get('project', labels.get('com.project', 'unassigned'))
            env = labels.get('environment', labels.get('com.environment', 'unknown'))

            # Get resource stats
            stats = get_container_stats(container_id)
            cpu_cores = calculate_cpu_usage(stats)
            memory_gb = calculate_memory_gb(stats)

            # Calculate hourly cost estimate
            cpu_cost_hour = cpu_cores * CPU_CORE_HOUR
            mem_cost_hour = memory_gb * MEMORY_GB_HOUR
            total_cost_hour = cpu_cost_hour + mem_cost_hour

            # Get uptime
            started_at = details['State']['StartedAt']
            start_time = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
            uptime_hours = (datetime.now(start_time.tzinfo) - start_time).total_seconds() / 3600

            usage_data.append({
                'container_name': name,
                'container_id': container_id[:12],
                'image': container['Image'],
                'team': team,
                'project': project,
                'environment': env,
                'cpu_cores': round(cpu_cores, 4),
                'memory_gb': round(memory_gb, 4),
                'uptime_hours': round(uptime_hours, 2),
                'cpu_cost_hour': round(cpu_cost_hour, 6),
                'mem_cost_hour': round(mem_cost_hour, 6),
                'total_cost_hour': round(total_cost_hour, 6),
                'total_cost_day': round(total_cost_hour * 24, 4),
                'total_cost_month': round(total_cost_hour * 24 * 30, 2),
                'collected_at': datetime.now(timezone.utc).isoformat()
            })

        except Exception as e:
            print(f"Warning: Could not collect data for {name}: {e}", file=sys.stderr)

    return usage_data


def generate_team_report(usage_data: list) -> dict:
    """Generate cost report by team."""
    team_costs = defaultdict(lambda: {
        'containers': 0,
        'cpu_cores': 0,
        'memory_gb': 0,
        'cost_day': 0,
        'cost_month': 0
    })

    for item in usage_data:
        team = item['team']
        team_costs[team]['containers'] += 1
        team_costs[team]['cpu_cores'] += item['cpu_cores']
        team_costs[team]['memory_gb'] += item['memory_gb']
        team_costs[team]['cost_day'] += item['total_cost_day']
        team_costs[team]['cost_month'] += item['total_cost_month']

    return dict(team_costs)


def save_report_csv(usage_data: list, filename: str):
    """Save usage data to CSV."""
    if not usage_data:
        return

    with open(filename, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=usage_data[0].keys())
        writer.writeheader()
        writer.writerows(usage_data)

    print(f"Report saved to {filename}")


def print_summary(team_report: dict):
    """Print cost summary to console."""
    print("\n" + "="*60)
    print("CONTAINER COST REPORT")
    print(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print("="*60)
    print(f"{'Team':<20} {'Containers':>10} {'vCPU':>8} {'RAM(GB)':>8} {'$/Day':>10} {'$/Month':>10}")
    print("-"*60)

    total_cost_month = 0
    for team, data in sorted(team_report.items()):
        print(f"{team:<20} {data['containers']:>10} "
              f"{data['cpu_cores']:>8.2f} "
              f"{data['memory_gb']:>8.2f} "
              f"${data['cost_day']:>9.2f} "
              f"${data['cost_month']:>9.2f}")
        total_cost_month += data['cost_month']

    print("-"*60)
    print(f"{'TOTAL':<20} {'':>27} ${total_cost_month:>9.2f}/mo")
    print("="*60)


if __name__ == '__main__':
    print("Collecting container resource usage...")
    usage_data = collect_usage_data()

    # Generate team report
    team_report = generate_team_report(usage_data)

    # Print summary
    print_summary(team_report)

    # Save detailed CSV
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    date_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    save_report_csv(usage_data, os.path.join(OUTPUT_DIR, f"container-costs-{date_str}.csv"))

    # Save JSON
    with open(os.path.join(OUTPUT_DIR, f"container-costs-{date_str}.json"), 'w') as f:
        json.dump({'usage': usage_data, 'team_summary': team_report}, f, indent=2)
```

## Labeling Containers for Cost Tracking

Add cost allocation labels when starting containers:

```bash
# Docker run with cost labels
docker run -d \
  --label team=platform \
  --label project=api-gateway \
  --label environment=production \
  --name api-gateway \
  nginx:latest

# In docker-compose.yml
services:
  api:
    image: myapp:latest
    labels:
      - "team=backend"
      - "project=checkout"
      - "environment=production"
      - "cost-center=CC-1234"
```

## Scheduling the Report

```bash
# Add to crontab for daily reports
0 8 * * * cd /opt/cost-tracker && python3 container_cost_tracker.py >> /var/log/cost-tracker.log 2>&1

# Or use Docker
docker run --rm \
  -e PORTAINER_URL=https://portainer.example.com \
  -e PORTAINER_API_KEY=your-key \
  -e ENDPOINT_ID=1 \
  -e OUTPUT_DIR=/reports \
  -v "$(pwd)/reports:/reports" \
  cost-tracker:latest
```

## Conclusion

A container cost tracking tool built on the Portainer API provides FinOps visibility for your containerized workloads. By labeling containers with team and project metadata, you can generate chargeback and showback estimates based on current resource usage. Extend this solution by integrating with financial reporting tools or Slack for automated weekly cost summaries to stakeholders.
