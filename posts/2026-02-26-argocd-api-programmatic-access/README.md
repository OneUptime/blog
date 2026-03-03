# How to Access ArgoCD API Programmatically

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, API, Automation

Description: Learn how to interact with the ArgoCD REST and gRPC APIs programmatically for automation, CI/CD integration, and building custom tooling.

---

ArgoCD exposes a comprehensive API that you can use to automate everything the UI and CLI can do. Whether you need to trigger syncs from CI/CD pipelines, build custom dashboards, or create automated workflows, the ArgoCD API gives you full control. This guide covers authentication, common API endpoints, and practical examples using curl, Python, and Go.

## ArgoCD API Overview

ArgoCD provides two APIs:

1. **REST API** (HTTP/JSON) - used by the web UI and for general programmatic access
2. **gRPC API** - used by the ArgoCD CLI for more efficient communication

For most automation use cases, the REST API is the easier choice. It is well-documented, works with any HTTP client, and does not require gRPC libraries.

The API documentation is built into ArgoCD. Access it at:

```text
https://argocd.example.com/swagger-ui
```

## Authentication

### Method 1: API Token (Recommended for Automation)

Generate a long-lived API token for your automation:

```bash
# Login first
argocd login argocd.example.com --grpc-web

# Generate a token for the admin account
argocd account generate-token --account admin

# Or generate a token for a specific project role
argocd proj role create-token my-project ci-role
```

Use the token in API requests:

```bash
# Set the token as a variable
export ARGOCD_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Use it in requests
curl -H "Authorization: Bearer $ARGOCD_TOKEN" \
  https://argocd.example.com/api/v1/applications
```

### Method 2: Session Token (Short-Lived)

Get a session token by authenticating with username and password:

```bash
# Get a session token
ARGOCD_TOKEN=$(curl -s https://argocd.example.com/api/v1/session \
  -d '{"username":"admin","password":"your-password"}' \
  | jq -r '.token')

echo $ARGOCD_TOKEN
```

### Method 3: Project Tokens (Scoped Access)

For CI/CD pipelines, create a project-scoped token with limited permissions:

```bash
# Create a project role
argocd proj role create my-project ci-deployer \
  --description "CI/CD deployment role"

# Add permissions to the role
argocd proj role add-policy my-project ci-deployer \
  -a sync -o my-app -p allow

argocd proj role add-policy my-project ci-deployer \
  -a get -o my-app -p allow

# Generate a token for the role
argocd proj role create-token my-project ci-deployer
```

## Common API Endpoints

### List Applications

```bash
# List all applications
curl -s -H "Authorization: Bearer $ARGOCD_TOKEN" \
  https://argocd.example.com/api/v1/applications | jq '.items[].metadata.name'

# Get a specific application
curl -s -H "Authorization: Bearer $ARGOCD_TOKEN" \
  https://argocd.example.com/api/v1/applications/my-app | jq '.'

# Filter applications by project
curl -s -H "Authorization: Bearer $ARGOCD_TOKEN" \
  "https://argocd.example.com/api/v1/applications?projects=my-project" | jq '.'
```

### Create an Application

```bash
curl -s -X POST -H "Authorization: Bearer $ARGOCD_TOKEN" \
  -H "Content-Type: application/json" \
  https://argocd.example.com/api/v1/applications \
  -d '{
    "metadata": {
      "name": "my-new-app",
      "namespace": "argocd"
    },
    "spec": {
      "project": "default",
      "source": {
        "repoURL": "https://github.com/myorg/myrepo.git",
        "path": "manifests",
        "targetRevision": "main"
      },
      "destination": {
        "server": "https://kubernetes.default.svc",
        "namespace": "my-namespace"
      },
      "syncPolicy": {
        "automated": {
          "prune": true,
          "selfHeal": true
        }
      }
    }
  }'
```

### Sync an Application

```bash
# Trigger a sync
curl -s -X POST -H "Authorization: Bearer $ARGOCD_TOKEN" \
  -H "Content-Type: application/json" \
  https://argocd.example.com/api/v1/applications/my-app/sync \
  -d '{
    "revision": "main",
    "prune": true,
    "dryRun": false
  }'

# Sync specific resources only
curl -s -X POST -H "Authorization: Bearer $ARGOCD_TOKEN" \
  -H "Content-Type: application/json" \
  https://argocd.example.com/api/v1/applications/my-app/sync \
  -d '{
    "resources": [
      {
        "group": "apps",
        "kind": "Deployment",
        "name": "my-deployment"
      }
    ]
  }'
```

### Get Application Health and Sync Status

```bash
# Get status summary
curl -s -H "Authorization: Bearer $ARGOCD_TOKEN" \
  https://argocd.example.com/api/v1/applications/my-app | \
  jq '{
    health: .status.health.status,
    sync: .status.sync.status,
    revision: .status.sync.revision
  }'
```

### Delete an Application

```bash
# Delete without removing resources (orphan)
curl -s -X DELETE -H "Authorization: Bearer $ARGOCD_TOKEN" \
  "https://argocd.example.com/api/v1/applications/my-app?cascade=false"

# Delete and remove all resources
curl -s -X DELETE -H "Authorization: Bearer $ARGOCD_TOKEN" \
  "https://argocd.example.com/api/v1/applications/my-app?cascade=true"
```

### Rollback an Application

```bash
# Get application history
curl -s -H "Authorization: Bearer $ARGOCD_TOKEN" \
  https://argocd.example.com/api/v1/applications/my-app | \
  jq '.status.history'

# Rollback to a specific revision
curl -s -X POST -H "Authorization: Bearer $ARGOCD_TOKEN" \
  -H "Content-Type: application/json" \
  https://argocd.example.com/api/v1/applications/my-app/rollback \
  -d '{"id": 2}'
```

## Python Example

Here is a complete Python script for common ArgoCD operations:

```python
import requests
import json
import time

class ArgoCDClient:
    def __init__(self, server, token, verify_ssl=True):
        self.base_url = f"https://{server}/api/v1"
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        self.verify = verify_ssl

    def list_applications(self, project=None):
        """List all applications, optionally filtered by project."""
        params = {}
        if project:
            params["projects"] = project
        resp = requests.get(
            f"{self.base_url}/applications",
            headers=self.headers,
            params=params,
            verify=self.verify
        )
        resp.raise_for_status()
        return resp.json()["items"]

    def get_application(self, name):
        """Get a single application by name."""
        resp = requests.get(
            f"{self.base_url}/applications/{name}",
            headers=self.headers,
            verify=self.verify
        )
        resp.raise_for_status()
        return resp.json()

    def sync_application(self, name, revision="HEAD", prune=False):
        """Trigger a sync for an application."""
        payload = {
            "revision": revision,
            "prune": prune,
            "dryRun": False
        }
        resp = requests.post(
            f"{self.base_url}/applications/{name}/sync",
            headers=self.headers,
            json=payload,
            verify=self.verify
        )
        resp.raise_for_status()
        return resp.json()

    def wait_for_sync(self, name, timeout=300):
        """Wait for an application to finish syncing."""
        start = time.time()
        while time.time() - start < timeout:
            app = self.get_application(name)
            phase = app.get("status", {}).get("operationState", {}).get("phase", "")
            if phase in ("Succeeded", "Failed", "Error"):
                return phase
            time.sleep(5)
        return "Timeout"

# Usage
client = ArgoCDClient("argocd.example.com", "your-token-here")

# List all apps
apps = client.list_applications()
for app in apps:
    print(f"{app['metadata']['name']}: {app['status']['health']['status']}")

# Sync and wait
client.sync_application("my-app", revision="main", prune=True)
result = client.wait_for_sync("my-app")
print(f"Sync result: {result}")
```

## CI/CD Integration Example

Use the API in a GitHub Actions workflow:

```yaml
# .github/workflows/deploy.yml
name: Deploy with ArgoCD
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger ArgoCD Sync
        run: |
          # Sync the application
          curl -s -X POST \
            -H "Authorization: Bearer ${{ secrets.ARGOCD_TOKEN }}" \
            -H "Content-Type: application/json" \
            https://argocd.example.com/api/v1/applications/my-app/sync \
            -d '{"revision": "${{ github.sha }}"}'

      - name: Wait for Sync
        run: |
          # Poll until sync completes
          for i in $(seq 1 60); do
            STATUS=$(curl -s \
              -H "Authorization: Bearer ${{ secrets.ARGOCD_TOKEN }}" \
              https://argocd.example.com/api/v1/applications/my-app | \
              jq -r '.status.operationState.phase')

            if [ "$STATUS" = "Succeeded" ]; then
              echo "Sync succeeded"
              exit 0
            elif [ "$STATUS" = "Failed" ] || [ "$STATUS" = "Error" ]; then
              echo "Sync failed: $STATUS"
              exit 1
            fi

            echo "Waiting... ($STATUS)"
            sleep 10
          done
          echo "Timeout waiting for sync"
          exit 1
```

## Security Best Practices

1. **Use project-scoped tokens** instead of admin tokens for CI/CD
2. **Set token expiration** to limit exposure if tokens leak
3. **Use HTTPS** for all API communication
4. **Store tokens in secret managers**, not in code or config files
5. **Audit API access** through ArgoCD's audit logs

```bash
# Create a token with expiration (24 hours)
argocd account generate-token --account ci-user --expires-in 24h

# Create a project token with limited scope
argocd proj role create-token my-project deployer --expires-in 8h
```

For more on ArgoCD automation, see [configuring ArgoCD notifications](https://oneuptime.com/blog/post/2026-01-25-notifications-argocd/view) and [ArgoCD webhook configuration](https://oneuptime.com/blog/post/2026-02-09-argocd-webhook-github-status/view).
