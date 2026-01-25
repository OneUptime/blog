# How to Integrate with APIs in Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, API, Integration, REST, Automation, Dashboard Management, DevOps

Description: Learn how to use Grafana's HTTP API for dashboard management, data source configuration, alerting automation, and building custom integrations.

---

## Why Use the Grafana API?

Manual dashboard management works fine for a few dashboards, but what happens when you have hundreds? Or when you need to synchronize configurations across multiple Grafana instances? The Grafana HTTP API enables automation, version control, and integration with your existing toolchain.

Common use cases include:
- Provisioning dashboards programmatically
- Managing users and permissions at scale
- Automating alert rule deployment
- Building custom tools that interact with Grafana
- Migrating between Grafana instances

## Authentication

Before making API calls, you need to authenticate. Grafana supports several methods.

### API Keys

Create an API key in Grafana: Configuration > API Keys > Add API key.

```bash
# Using an API key
curl -H "Authorization: Bearer eyJrIjoiT0tTcG1pUlY2..." \
     https://grafana.example.com/api/health
```

API keys can have different roles (Viewer, Editor, Admin) limiting what actions they can perform.

### Service Accounts (Recommended)

Service accounts are the modern replacement for API keys, offering better security and audit trails.

1. Go to Administration > Service accounts
2. Create a service account with appropriate permissions
3. Generate a token for the service account

```bash
# Using a service account token
curl -H "Authorization: Bearer glsa_xxxxxxxxxxxx" \
     https://grafana.example.com/api/health
```

### Basic Authentication

For local development or simple scripts:

```bash
curl -u admin:admin https://localhost:3000/api/health
```

Avoid basic auth in production; use tokens instead.

## Working with Dashboards

The dashboard API is the most commonly used Grafana API.

### Fetching a Dashboard

```bash
# Get dashboard by UID
curl -H "Authorization: Bearer $GRAFANA_TOKEN" \
     https://grafana.example.com/api/dashboards/uid/abc123
```

Response structure:

```json
{
  "dashboard": {
    "id": 1,
    "uid": "abc123",
    "title": "My Dashboard",
    "panels": [...],
    "version": 5
  },
  "meta": {
    "isStarred": false,
    "url": "/d/abc123/my-dashboard",
    "folderId": 0,
    "folderUid": ""
  }
}
```

### Creating or Updating a Dashboard

```bash
curl -X POST \
     -H "Authorization: Bearer $GRAFANA_TOKEN" \
     -H "Content-Type: application/json" \
     -d @dashboard.json \
     https://grafana.example.com/api/dashboards/db
```

The request body:

```json
{
  "dashboard": {
    "uid": "new-dashboard-uid",
    "title": "API Created Dashboard",
    "tags": ["api", "automated"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "type": "stat",
        "title": "Current Value",
        "gridPos": {"h": 4, "w": 6, "x": 0, "y": 0},
        "targets": [
          {
            "expr": "up",
            "datasource": {"type": "prometheus", "uid": "prometheus"}
          }
        ]
      }
    ],
    "schemaVersion": 38
  },
  "folderUid": "general",
  "overwrite": false
}
```

### Dashboard Version Control

Track dashboard changes using the versions endpoint:

```bash
# List versions
curl -H "Authorization: Bearer $GRAFANA_TOKEN" \
     https://grafana.example.com/api/dashboards/uid/abc123/versions

# Get specific version
curl -H "Authorization: Bearer $GRAFANA_TOKEN" \
     https://grafana.example.com/api/dashboards/uid/abc123/versions/3

# Restore a version
curl -X POST \
     -H "Authorization: Bearer $GRAFANA_TOKEN" \
     https://grafana.example.com/api/dashboards/uid/abc123/restore \
     -d '{"version": 3}'
```

## Data Source Management

Automate data source configuration for consistent multi-environment setups.

### Listing Data Sources

```bash
curl -H "Authorization: Bearer $GRAFANA_TOKEN" \
     https://grafana.example.com/api/datasources
```

### Creating a Data Source

```bash
curl -X POST \
     -H "Authorization: Bearer $GRAFANA_TOKEN" \
     -H "Content-Type: application/json" \
     https://grafana.example.com/api/datasources \
     -d '{
       "name": "Prometheus Prod",
       "type": "prometheus",
       "url": "http://prometheus.monitoring:9090",
       "access": "proxy",
       "basicAuth": false,
       "isDefault": true,
       "jsonData": {
         "httpMethod": "POST",
         "timeInterval": "15s"
       }
     }'
```

### Updating a Data Source

```bash
curl -X PUT \
     -H "Authorization: Bearer $GRAFANA_TOKEN" \
     -H "Content-Type: application/json" \
     https://grafana.example.com/api/datasources/1 \
     -d '{
       "name": "Prometheus Prod",
       "type": "prometheus",
       "url": "http://prometheus-new.monitoring:9090",
       "access": "proxy"
     }'
```

## Alert Management

Manage alert rules programmatically for consistent alerting across environments.

### Listing Alert Rules

```bash
curl -H "Authorization: Bearer $GRAFANA_TOKEN" \
     https://grafana.example.com/api/v1/provisioning/alert-rules
```

### Creating an Alert Rule

```bash
curl -X POST \
     -H "Authorization: Bearer $GRAFANA_TOKEN" \
     -H "Content-Type: application/json" \
     https://grafana.example.com/api/v1/provisioning/alert-rules \
     -d '{
       "title": "High Error Rate",
       "condition": "B",
       "data": [
         {
           "refId": "A",
           "relativeTimeRange": {"from": 600, "to": 0},
           "datasourceUid": "prometheus",
           "model": {
             "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
             "intervalMs": 1000,
             "maxDataPoints": 43200
           }
         },
         {
           "refId": "B",
           "relativeTimeRange": {"from": 0, "to": 0},
           "datasourceUid": "-100",
           "model": {
             "type": "threshold",
             "conditions": [
               {"evaluator": {"type": "gt", "params": [0.1]}}
             ]
           }
         }
       ],
       "noDataState": "NoData",
       "execErrState": "Error",
       "for": "5m",
       "annotations": {
         "summary": "Error rate exceeded 10%"
       },
       "labels": {
         "severity": "critical"
       },
       "folderUID": "alerting"
     }'
```

### Managing Contact Points

```bash
# List contact points
curl -H "Authorization: Bearer $GRAFANA_TOKEN" \
     https://grafana.example.com/api/v1/provisioning/contact-points

# Create a contact point
curl -X POST \
     -H "Authorization: Bearer $GRAFANA_TOKEN" \
     -H "Content-Type: application/json" \
     https://grafana.example.com/api/v1/provisioning/contact-points \
     -d '{
       "name": "Slack Alerts",
       "type": "slack",
       "settings": {
         "url": "https://hooks.slack.com/services/xxx/yyy/zzz",
         "recipient": "#alerts"
       }
     }'
```

## Building a Python Client

For complex integrations, build a client library.

```python
import requests
from typing import Optional, Dict, Any


class GrafanaClient:
    def __init__(self, base_url: str, api_token: str):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_token}',
            'Content-Type': 'application/json'
        })

    def get_dashboard(self, uid: str) -> Dict[str, Any]:
        """Fetch a dashboard by UID."""
        response = self.session.get(
            f'{self.base_url}/api/dashboards/uid/{uid}'
        )
        response.raise_for_status()
        return response.json()

    def save_dashboard(
        self,
        dashboard: Dict[str, Any],
        folder_uid: str = 'general',
        overwrite: bool = False
    ) -> Dict[str, Any]:
        """Create or update a dashboard."""
        payload = {
            'dashboard': dashboard,
            'folderUid': folder_uid,
            'overwrite': overwrite
        }
        response = self.session.post(
            f'{self.base_url}/api/dashboards/db',
            json=payload
        )
        response.raise_for_status()
        return response.json()

    def search_dashboards(
        self,
        query: Optional[str] = None,
        tags: Optional[list] = None
    ) -> list:
        """Search for dashboards."""
        params = {}
        if query:
            params['query'] = query
        if tags:
            params['tag'] = tags

        response = self.session.get(
            f'{self.base_url}/api/search',
            params=params
        )
        response.raise_for_status()
        return response.json()

    def get_datasources(self) -> list:
        """List all data sources."""
        response = self.session.get(f'{self.base_url}/api/datasources')
        response.raise_for_status()
        return response.json()


# Usage example
if __name__ == '__main__':
    client = GrafanaClient(
        base_url='https://grafana.example.com',
        api_token='glsa_xxxxxxxxxxxx'
    )

    # Search for dashboards tagged with 'production'
    dashboards = client.search_dashboards(tags=['production'])
    print(f'Found {len(dashboards)} production dashboards')

    # Export a dashboard
    dashboard = client.get_dashboard('abc123')
    print(f"Dashboard title: {dashboard['dashboard']['title']}")
```

## CI/CD Integration

Integrate Grafana API calls into your deployment pipeline.

### GitHub Actions Example

```yaml
name: Deploy Dashboards

on:
  push:
    branches: [main]
    paths:
      - 'dashboards/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy dashboards to Grafana
        env:
          GRAFANA_URL: ${{ secrets.GRAFANA_URL }}
          GRAFANA_TOKEN: ${{ secrets.GRAFANA_TOKEN }}
        run: |
          for file in dashboards/*.json; do
            echo "Deploying $file"
            curl -X POST \
              -H "Authorization: Bearer $GRAFANA_TOKEN" \
              -H "Content-Type: application/json" \
              -d "{\"dashboard\": $(cat $file), \"overwrite\": true}" \
              "$GRAFANA_URL/api/dashboards/db"
          done
```

### Terraform Integration

Use the Grafana Terraform provider for infrastructure-as-code management:

```hcl
terraform {
  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = "~> 2.0"
    }
  }
}

provider "grafana" {
  url  = "https://grafana.example.com"
  auth = var.grafana_auth
}

resource "grafana_dashboard" "service_overview" {
  config_json = file("dashboards/service-overview.json")
  folder      = grafana_folder.services.id
  overwrite   = true
}

resource "grafana_folder" "services" {
  title = "Services"
}

resource "grafana_data_source" "prometheus" {
  type = "prometheus"
  name = "Prometheus"
  url  = "http://prometheus:9090"
}
```

## Error Handling

API errors include status codes and messages to help diagnose issues.

```python
def safe_api_call(client: GrafanaClient, uid: str):
    try:
        dashboard = client.get_dashboard(uid)
        return dashboard
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            print(f"Dashboard {uid} not found")
        elif e.response.status_code == 403:
            print("Permission denied - check API token permissions")
        elif e.response.status_code == 401:
            print("Authentication failed - check API token")
        else:
            print(f"API error: {e.response.text}")
        return None
```

Common status codes:
- **200**: Success
- **400**: Bad request (invalid JSON, missing fields)
- **401**: Unauthorized (invalid or missing token)
- **403**: Forbidden (insufficient permissions)
- **404**: Resource not found
- **412**: Precondition failed (version conflict on dashboard save)

## Rate Limiting and Best Practices

When making many API calls, consider:

```python
import time
from functools import wraps

def rate_limit(calls_per_second: float = 10):
    """Decorator to rate limit API calls."""
    min_interval = 1.0 / calls_per_second

    def decorator(func):
        last_call = [0.0]

        @wraps(func)
        def wrapper(*args, **kwargs):
            elapsed = time.time() - last_call[0]
            if elapsed < min_interval:
                time.sleep(min_interval - elapsed)
            result = func(*args, **kwargs)
            last_call[0] = time.time()
            return result

        return wrapper
    return decorator

@rate_limit(calls_per_second=5)
def fetch_dashboard(client, uid):
    return client.get_dashboard(uid)
```

## Conclusion

The Grafana API transforms dashboard management from a manual task into an automated, version-controlled process. Start with simple scripts for backup and migration, then evolve toward full CI/CD integration. Whether you are managing five dashboards or five hundred, the API provides the foundation for scalable, consistent monitoring configuration.
