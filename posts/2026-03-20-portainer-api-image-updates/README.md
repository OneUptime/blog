# How to Automate Image Updates via Portainer API - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Docker, Image, Automation

Description: Automate Docker image updates across your Portainer-managed environments using the Portainer REST API and webhooks.

## Introduction

Keeping Docker images up-to-date is essential for security and feature delivery. Portainer's API allows you to pull new images and redeploy containers or stacks programmatically, enabling automated update pipelines triggered by CI/CD, schedule, or registry webhooks.

## Prerequisites

- Portainer CE or BE with API access (container and stack webhooks require Portainer BE)
- Docker registry (Docker Hub, GHCR, private registry)
- Python or shell scripting environment
- Registry webhook support (optional)

## Method 1: Pull and Redeploy via API

For single containers, Portainer's supported automation path is a container webhook. This requires Portainer Business Edition and a non-Edge environment.

```bash
#!/bin/bash
# update-container.sh

# Usage: ./update-container.sh <new-image-tag>

set -euo pipefail

# Enable the container webhook in Portainer first, then copy the webhook URL.
PORTAINER_WEBHOOK_URL="https://portainer.example.com/api/webhooks/your-webhook-token"
NEW_TAG="${1:-latest}"

echo "=== Portainer Container Update ==="
echo "Tag: $NEW_TAG"

curl -fsS -X POST "${PORTAINER_WEBHOOK_URL}?tag=${NEW_TAG}"

echo "Container redeployed successfully."
```

## Method 2: Update a File-Based Stack with New Image Tags

For stacks created with the Web editor or Upload, update the stack's environment variables and redeploy it. This example assumes your Compose file uses an environment variable in the image reference, such as `image: ghcr.io/example/api:${API_TAG}`. For Git-deployed stacks, update the repository or use `/api/stacks/{id}/git/redeploy` instead.

```python
#!/usr/bin/env python3
# update_stack_image.py

import os
import requests
import sys

PORTAINER_URL = os.environ["PORTAINER_URL"].rstrip("/")
API_KEY = os.environ["PORTAINER_API_KEY"]
ENDPOINT_ID = int(os.environ.get("PORTAINER_ENDPOINT_ID", "1"))

headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}


def get_stack_by_name(stack_name):
    """Find a stack by name on the target environment."""
    resp = requests.get(
        f"{PORTAINER_URL}/api/stacks",
        headers=headers,
        timeout=30,
    )
    resp.raise_for_status()
    stacks = resp.json()
    for stack in stacks:
        if stack["Name"] == stack_name and stack["EndpointId"] == ENDPOINT_ID:
            return stack
    return None


def get_stack_file(stack_id):
    """Get the stored compose file content for a file-based stack."""
    resp = requests.get(
        f"{PORTAINER_URL}/api/stacks/{stack_id}/file",
        headers=headers,
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["StackFileContent"]


def upsert_env_var(env_vars, name, value):
    """Create or update a Portainer stack environment variable."""
    env_vars = env_vars or []
    updated = []
    found = False

    for item in env_vars:
        if item["name"] == name:
            updated.append({"name": name, "value": value})
            found = True
        else:
            updated.append(item)

    if not found:
        updated.append({"name": name, "value": value})

    return updated


def update_stack(stack, stack_file_content, env_vars):
    """Update the stack definition and force a re-pull of the referenced images."""
    resp = requests.put(
        f"{PORTAINER_URL}/api/stacks/{stack['Id']}?endpointId={ENDPOINT_ID}",
        headers=headers,
        json={
            "StackFileContent": stack_file_content,
            "Env": env_vars,
            "RepullImageAndRedeploy": True,
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def main():
    stack_name = sys.argv[1] if len(sys.argv) > 1 else "my-app"
    image_tag_var = sys.argv[2] if len(sys.argv) > 2 else "API_TAG"
    new_tag = sys.argv[3] if len(sys.argv) > 3 else "latest"

    print(f"Updating {stack_name}: {image_tag_var}={new_tag}")

    stack = get_stack_by_name(stack_name)
    if not stack:
        print(f"Stack '{stack_name}' not found on endpoint {ENDPOINT_ID}")
        sys.exit(1)

    if stack.get("GitConfig"):
        print("This script updates file-based stacks. For Git-deployed stacks, update the repository or use /api/stacks/{id}/git/redeploy.")
        sys.exit(1)

    compose_content = get_stack_file(stack["Id"])
    env_vars = upsert_env_var(stack.get("Env"), image_tag_var, new_tag)

    result = update_stack(stack, compose_content, env_vars)
    print(f"Stack updated successfully! Updated by: {result.get('UpdatedBy')}")


if __name__ == "__main__":
    main()
```

## Method 3: Using Portainer Webhooks for Auto-Updates

Portainer supports stack webhooks that trigger stack redeployments. These are available in Portainer Business Edition on non-Edge environments:

```bash
# In Portainer UI: Stacks > Your Stack > Editor > Webhooks > Create a stack webhook
# Copy the webhook URL

# Trigger a stack redeploy using the current image tags
curl -X POST "https://portainer.example.com/api/stacks/webhooks/your-webhook-token"

# Trigger a stack redeploy using a different image tag
curl -X POST "https://portainer.example.com/api/stacks/webhooks/your-webhook-token?tag=latest"

# Optionally disable image pulling during the redeploy
curl -X POST "https://portainer.example.com/api/stacks/webhooks/your-webhook-token?pullimage=false"

# Integrate with Docker Hub webhooks
# In Docker Hub: Repository > Webhooks > Add webhook URL
```

## CI/CD Integration

```yaml
# GitHub Actions
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Update image in Portainer
        run: |
          python update_stack_image.py my-app API_TAG ${{ github.sha }}
        env:
          PORTAINER_URL: ${{ secrets.PORTAINER_URL }}
          PORTAINER_API_KEY: ${{ secrets.PORTAINER_API_KEY }}
          PORTAINER_ENDPOINT_ID: "1"
```

## Conclusion

Automating image updates via the Portainer API keeps your containers running the latest, most secure images without manual intervention. Whether triggered by CI/CD pipelines, registry webhooks, or scheduled jobs, automated image updates reduce the operational burden of container management and improve your security posture.
