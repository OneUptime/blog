# How to Build a Cost Tracking Tool with the Portainer API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Docker, Cost Tracking, Automation, DevOps

Description: Learn how to use the Portainer API to enumerate running containers and build a simple cost tracking and resource attribution tool.

---

The Portainer API provides programmatic access to all container, stack, and environment data. You can query it to build custom reporting tools that correlate container resource usage with team or project costs.

---

## Authenticate with the Portainer API

```bash
# Get a JWT token

TOKEN=$(curl -s -X POST   https://portainer.example.com/api/auth   -H "Content-Type: application/json"   -d '{"username":"admin","password":"your-password"}'   | jq -r '.jwt')

echo "Token: ${TOKEN}"
```

---

## List All Endpoints (Environments)

```bash
curl -s   -H "Authorization: Bearer ${TOKEN}"   https://portainer.example.com/api/endpoints   | jq '[.[] | {id: .Id, name: .Name, type: .Type}]'
```

---

## List Containers with Resource Labels

```bash
ENDPOINT_ID=1

curl -s   -H "Authorization: Bearer ${TOKEN}"   "https://portainer.example.com/api/endpoints/${ENDPOINT_ID}/docker/containers/json?all=false"   | jq '[.[] | {
      id: .Id[0:12],
      name: .Names[0],
      image: .Image,
      status: .Status,
      team: .Labels["com.example.team"],
      project: .Labels["com.example.project"]
    }]'
```

---

## Python Cost Tracker Script

```python
#!/usr/bin/env python3
import requests
from collections import defaultdict

PORTAINER = "https://portainer.example.com"
TOKEN = "your-jwt-token"
ENDPOINT_ID = 1

headers = {"Authorization": f"Bearer {TOKEN}"}

# Cost rates per hour (example)
COST_PER_CPU_HOUR = 0.05
COST_PER_GB_HOUR = 0.01

containers = requests.get(
    f"{PORTAINER}/api/endpoints/{ENDPOINT_ID}/docker/containers/json",
    headers=headers
).json()

costs = defaultdict(float)

for container in containers:
    team = container.get("Labels", {}).get("com.example.team", "untagged")
    # Estimate cost from image resource limits (simplified)
    costs[team] += COST_PER_CPU_HOUR  # $0.05/hr per container

print("Team Cost Report (hourly estimate):")
for team, cost in sorted(costs.items(), key=lambda x: -x[1]):
    print(f"  {team}: ${cost:.2f}/hr")
```

---

## Generate a Stacks Report

```bash
curl -s   -H "Authorization: Bearer ${TOKEN}"   https://portainer.example.com/api/stacks   | jq '[.[] | {name: .Name, status: .Status, type: .Type, endpointId: .EndpointId}]'
```

---

## Summary

Authenticate to the Portainer API with a POST to `/api/auth` to get a JWT token. Use the `/api/endpoints/{id}/docker/containers/json` endpoint to enumerate containers and read custom labels for team and project attribution. Build a Python script that aggregates container counts per team and estimates hourly costs based on configured rates. Schedule the script to produce regular cost reports.
