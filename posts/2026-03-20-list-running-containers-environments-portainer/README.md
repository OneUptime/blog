# How to List All Running Containers Across Environments in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container Management, Multi-Environment, Operation, API

Description: View and manage all running containers across multiple Docker and Kubernetes environments from Portainer's unified dashboard and API for efficient fleet-wide container visibility.

---

When managing multiple Portainer environments, you need a cross-environment view of system-wide status. This guide covers the Portainer UI overview for all environments and the API approach for listing running containers across Docker-based environments.

## Portainer Home Dashboard

The Portainer home screen (the first page after login) shows a summary of all environments:

- Environment name and status (online/offline)
- Environment-specific resource summaries, such as container counts for Docker-based environments or node counts for Kubernetes
- CPU and memory usage summary

This gives you a fleet-level overview without drilling into each environment.

## Portainer API for Cross-Environment Container Listing

For automation or custom dashboards across Docker-based environments, use the Portainer API:

```python
#!/usr/bin/env python3
# list-all-containers.py - fetch containers from all Portainer environments

import requests

PORTAINER_URL = "https://portainer.example.com"
API_TOKEN = "your-api-token"  # From Account Settings > Access Tokens

headers = {"X-API-Key": API_TOKEN}

# Docker, agent-on-Docker, and edge-agent-on-Docker environments
DOCKER_API_ENVIRONMENT_TYPES = {1, 2, 4}

# Step 1: Get all environments

environments = requests.get(
    f"{PORTAINER_URL}/api/endpoints",
    headers=headers
).json()

# Step 2: Get containers from each environment
all_containers = []
for env in environments:
    env_id = env["Id"]
    env_name = env["Name"]
    
    if env["Status"] != 1:  # Skip offline environments
        continue
    if env["Type"] not in DOCKER_API_ENVIRONMENT_TYPES:  # Skip Kubernetes and Azure environments
        continue
    
    # Fetch running containers for this environment
    containers = requests.get(
        f"{PORTAINER_URL}/api/endpoints/{env_id}/docker/containers/json",
        headers=headers,
        params={"all": "false"}  # Only running containers
    ).json()
    
    for container in containers:
        all_containers.append({
            "environment": env_name,
            "name": container["Names"][0].lstrip("/"),
            "image": container["Image"],
            "status": container["Status"],
            "state": container["State"]
        })

# Print results
print(f"Total running containers: {len(all_containers)}")
print(f"\n{'Environment':<30} {'Container':<30} {'Image':<40} {'Status'}")
print("-" * 120)
for c in sorted(all_containers, key=lambda x: x["environment"]):
    print(f"{c['environment']:<30} {c['name']:<30} {c['image']:<40} {c['status']}")
```

## Sample Output

```yaml
Total running containers: 47

Environment                    Container                      Image                                    Status
----------------------------------------------------------------------------------------------------
prod-us-east-webapp-01         nginx-proxy                    nginx:1.25.4                            Up 14 days
prod-us-east-webapp-01         webapp-api                     myregistry/api:2.1.3                    Up 14 days
prod-us-east-webapp-01         postgres                       postgres:16-alpine                      Up 14 days
staging-webapp-01              webapp-api                     myregistry/api:2.2.0-beta               Up 2 hours
```

## Filtering by State or Image

Filter the API results to find specific containers:

```python
# Find all containers using a specific image across all environments
target_image = "nginx"
nginx_containers = [c for c in all_containers if target_image in c["image"]]

# Find containers that are restarting
problem_containers = [c for c in all_containers if c["state"] == "restarting"]
if problem_containers:
    print("WARNING: Containers in restart loop:")
    for c in problem_containers:
        print(f"  {c['environment']} / {c['name']}")
```

## Using the Portainer UI for Cross-Environment Search

In Portainer, use the **Home** page environment cards to navigate between environments. Each environment card shows:

- Environment-specific summary information, such as container counts for Docker-based environments or node counts for Kubernetes
- Quick actions to connect to or inspect that environment

For more advanced cross-environment search, use the API approach above or integrate with an external monitoring tool like Prometheus with cAdvisor.

## Summary

Portainer's home dashboard provides a quick multi-environment overview, while the API enables programmatic container inventory and monitoring across Docker-based environments. Building a simple script around the API gives you fleet-wide visibility for reporting, alerting, and auditing.
