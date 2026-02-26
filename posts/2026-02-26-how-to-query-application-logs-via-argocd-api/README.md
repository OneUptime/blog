# How to Query Application Logs via ArgoCD API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, API, Logging

Description: Access and stream container logs for ArgoCD-managed applications through the REST API for debugging deployments, troubleshooting failures, and building log aggregation pipelines.

---

When a deployment fails or an application misbehaves after a sync, the first thing you need is container logs. ArgoCD's REST API provides direct access to pod logs for any resource managed by an application, saving you from having to find the right cluster context, namespace, and pod name manually.

This post shows you how to query, stream, and filter logs through ArgoCD's API for effective debugging and troubleshooting.

## The Logs API Endpoint

ArgoCD exposes logs through the application resource endpoint. You query logs for a specific resource (typically a Pod) within an application.

```bash
# Basic log query for a pod in an ArgoCD application
curl -s -k "$ARGOCD_URL/api/v1/applications/my-web-app/logs" \
  -H "$AUTH_HEADER" \
  --data-urlencode "namespace=web-app" \
  --data-urlencode "podName=web-frontend-7d8f9c6b4-xk2pn" \
  --data-urlencode "container=web-frontend"
```

The logs endpoint supports several query parameters. Here is a complete reference.

```bash
# Full parameter reference
curl -s -k "$ARGOCD_URL/api/v1/applications/{app-name}/logs" \
  -H "$AUTH_HEADER" \
  --data-urlencode "namespace=<namespace>" \
  --data-urlencode "podName=<pod-name>" \
  --data-urlencode "container=<container-name>" \
  --data-urlencode "sinceSeconds=3600" \
  --data-urlencode "tailLines=100" \
  --data-urlencode "follow=false" \
  --data-urlencode "filter=error"
```

## Finding the Right Pod

Before querying logs, you need to identify which pods belong to your application. Use the resource tree endpoint.

```bash
# List all pods in an application
curl -s -k "$ARGOCD_URL/api/v1/applications/my-web-app/resource-tree" \
  -H "$AUTH_HEADER" | jq '[.nodes[] | select(.kind == "Pod") | {
    name: .name,
    namespace: .namespace,
    health: .health.status,
    containers: [.info[]? | select(.name == "Containers") | .value]
  }]'
```

You can also list managed resources to find pods through their parent Deployments.

```bash
# Get managed resources to find deployments and their pods
curl -s -k "$ARGOCD_URL/api/v1/applications/my-web-app/managed-resources" \
  -H "$AUTH_HEADER" | jq '[.items[] | select(.kind == "Deployment" or .kind == "Pod") | {
    kind: .kind,
    name: .name,
    namespace: .namespace
  }]'
```

## Querying Logs for Failed Deployments

When a sync fails, you typically want logs from pods that are in a CrashLoopBackOff or Error state. Here is a script that finds unhealthy pods and fetches their logs.

```bash
#!/bin/bash
# fetch-failed-logs.sh
# Fetches logs from unhealthy pods in an ArgoCD application
APP_NAME=$1
ARGOCD_URL="${ARGOCD_URL:-https://argocd.company.com}"

if [ -z "$APP_NAME" ]; then
  echo "Usage: $0 <app-name>"
  exit 1
fi

# Find unhealthy pods
UNHEALTHY_PODS=$(curl -s -k "$ARGOCD_URL/api/v1/applications/$APP_NAME/resource-tree" \
  -H "$AUTH_HEADER" | jq -r '.nodes[] | select(.kind == "Pod" and .health.status != "Healthy") | "\(.namespace)|\(.name)"')

if [ -z "$UNHEALTHY_PODS" ]; then
  echo "No unhealthy pods found in $APP_NAME"
  exit 0
fi

echo "Found unhealthy pods:"
echo "$UNHEALTHY_PODS" | while IFS='|' read -r ns pod; do
  echo "  - $ns/$pod"
done

echo ""
echo "--- Fetching logs ---"

echo "$UNHEALTHY_PODS" | while IFS='|' read -r ns pod; do
  echo ""
  echo "=== Logs for $ns/$pod ==="

  # Get the last 50 lines of logs
  curl -s -k "$ARGOCD_URL/api/v1/applications/$APP_NAME/logs" \
    -H "$AUTH_HEADER" \
    --data-urlencode "namespace=$ns" \
    --data-urlencode "podName=$pod" \
    --data-urlencode "tailLines=50" | jq -r '.result.content // empty'

  echo "=== End logs for $ns/$pod ==="
done
```

## Streaming Logs in Real-Time

For real-time log streaming during a deployment, use the `follow=true` parameter. This keeps the HTTP connection open and streams new log lines as they appear.

```bash
# Stream logs in real-time (similar to kubectl logs -f)
curl -s -k -N "$ARGOCD_URL/api/v1/applications/my-web-app/logs" \
  -H "$AUTH_HEADER" \
  --data-urlencode "namespace=web-app" \
  --data-urlencode "podName=web-frontend-7d8f9c6b4-xk2pn" \
  --data-urlencode "container=web-frontend" \
  --data-urlencode "follow=true" \
  --data-urlencode "tailLines=10"
```

The `-N` flag disables curl's output buffering so you see lines as they arrive.

## Building a Log Aggregation Script

Here is a Python script that aggregates logs across all pods in an application, which is useful for debugging distributed issues.

```python
# aggregate_logs.py
# Fetch and aggregate logs from all pods in an ArgoCD application
import os
import sys
import json
import requests
from datetime import datetime
from urllib.parse import urlencode

ARGOCD_URL = os.environ.get('ARGOCD_URL', 'https://argocd.company.com')
ARGOCD_TOKEN = os.environ['ARGOCD_AUTH_TOKEN']

headers = {
    'Authorization': f'Bearer {ARGOCD_TOKEN}',
    'Content-Type': 'application/json'
}


def get_app_pods(app_name):
    """Get all pods for an application from the resource tree."""
    resp = requests.get(
        f'{ARGOCD_URL}/api/v1/applications/{app_name}/resource-tree',
        headers=headers,
        verify=False,
        timeout=30
    )
    resp.raise_for_status()
    tree = resp.json()

    pods = []
    for node in tree.get('nodes', []):
        if node.get('kind') == 'Pod':
            pods.append({
                'name': node['name'],
                'namespace': node.get('namespace', ''),
                'health': node.get('health', {}).get('status', 'Unknown'),
            })
    return pods


def get_pod_logs(app_name, namespace, pod_name, container=None,
                 tail_lines=100, since_seconds=None):
    """Fetch logs for a specific pod."""
    params = {
        'namespace': namespace,
        'podName': pod_name,
        'tailLines': str(tail_lines),
    }
    if container:
        params['container'] = container
    if since_seconds:
        params['sinceSeconds'] = str(since_seconds)

    resp = requests.get(
        f'{ARGOCD_URL}/api/v1/applications/{app_name}/logs',
        headers=headers,
        params=params,
        verify=False,
        timeout=60
    )
    resp.raise_for_status()
    return resp.text


def aggregate_logs(app_name, tail_lines=50, since_seconds=3600):
    """Aggregate logs from all pods in an application."""
    pods = get_app_pods(app_name)

    if not pods:
        print(f'No pods found for application {app_name}')
        return

    print(f'Found {len(pods)} pods for {app_name}:')
    for pod in pods:
        health_indicator = 'OK' if pod['health'] == 'Healthy' else pod['health']
        print(f"  [{health_indicator}] {pod['namespace']}/{pod['name']}")

    print(f'\n{"=" * 60}')
    print(f'Logs (last {tail_lines} lines per pod, since {since_seconds}s ago)')
    print(f'{"=" * 60}\n')

    for pod in pods:
        print(f'\n--- {pod["namespace"]}/{pod["name"]} ({pod["health"]}) ---')
        try:
            logs = get_pod_logs(
                app_name,
                pod['namespace'],
                pod['name'],
                tail_lines=tail_lines,
                since_seconds=since_seconds
            )
            if logs.strip():
                print(logs)
            else:
                print('  (no logs available)')
        except requests.exceptions.HTTPError as e:
            print(f'  Error fetching logs: {e}')
        print(f'--- End {pod["name"]} ---')


def search_logs(app_name, search_term, since_seconds=3600):
    """Search for a specific term across all pod logs."""
    pods = get_app_pods(app_name)
    matches = []

    for pod in pods:
        try:
            logs = get_pod_logs(
                app_name,
                pod['namespace'],
                pod['name'],
                tail_lines=1000,
                since_seconds=since_seconds
            )
            for line_num, line in enumerate(logs.split('\n'), 1):
                if search_term.lower() in line.lower():
                    matches.append({
                        'pod': pod['name'],
                        'line': line_num,
                        'content': line.strip()
                    })
        except requests.exceptions.HTTPError:
            continue

    if matches:
        print(f'Found {len(matches)} matches for "{search_term}":')
        for m in matches:
            print(f"  [{m['pod']}:{m['line']}] {m['content']}")
    else:
        print(f'No matches found for "{search_term}"')

    return matches


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python aggregate_logs.py <app-name> [search-term]')
        sys.exit(1)

    app_name = sys.argv[1]
    search_term = sys.argv[2] if len(sys.argv) > 2 else None

    if search_term:
        search_logs(app_name, search_term)
    else:
        aggregate_logs(app_name)
```

### Usage

```bash
# Aggregate logs from all pods
python aggregate_logs.py my-web-app

# Search for errors across all pods
python aggregate_logs.py my-web-app "error"

# Search for a specific exception
python aggregate_logs.py my-web-app "NullPointerException"
```

## Accessing Previous Container Logs

When a container crashes and restarts, you often need the logs from the previous instance. Use the `previous=true` parameter.

```bash
# Get logs from the previous container instance (crash logs)
curl -s -k "$ARGOCD_URL/api/v1/applications/my-web-app/logs" \
  -H "$AUTH_HEADER" \
  --data-urlencode "namespace=web-app" \
  --data-urlencode "podName=web-frontend-7d8f9c6b4-xk2pn" \
  --data-urlencode "container=web-frontend" \
  --data-urlencode "previous=true" \
  --data-urlencode "tailLines=200"
```

## RBAC for Log Access

Control who can access logs through ArgoCD's RBAC configuration.

```yaml
# argocd-rbac-cm - configure log access permissions
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    # Developers can view logs for their team's apps
    p, role:developer, logs, get, team-backend/*, allow
    p, role:developer, applications, get, team-backend/*, allow

    # On-call engineers can view logs for all apps
    p, role:oncall, logs, get, */*, allow
    p, role:oncall, applications, get, */*, allow

    # Restrict log access for read-only users
    p, role:viewer, applications, get, */*, allow
    p, role:viewer, logs, get, */*, deny
```

## Integration with Log Management Systems

For a production setup, forward ArgoCD-accessible logs to a centralized logging system like Elasticsearch, Loki, or Datadog.

```python
def forward_logs_to_loki(app_name, loki_url):
    """Forward application logs to Grafana Loki."""
    pods = get_app_pods(app_name)

    for pod in pods:
        logs = get_pod_logs(
            app_name,
            pod['namespace'],
            pod['name'],
            tail_lines=1000,
            since_seconds=300  # Last 5 minutes
        )

        # Format for Loki push API
        streams = [{
            'stream': {
                'app': app_name,
                'pod': pod['name'],
                'namespace': pod['namespace'],
                'source': 'argocd'
            },
            'values': [
                [str(int(datetime.now().timestamp() * 1e9)), line]
                for line in logs.strip().split('\n')
                if line.strip()
            ]
        }]

        requests.post(
            f'{loki_url}/loki/api/v1/push',
            json={'streams': streams},
            timeout=30
        )
```

## Wrapping Up

ArgoCD's logs API provides a unified interface for accessing container logs across all managed clusters without needing direct cluster access. This is particularly valuable for teams that manage multiple clusters or use ArgoCD as their primary deployment interface. Use the resource tree endpoint to find pods, the logs endpoint with appropriate filters for efficient querying, and streaming for real-time debugging during deployments. For comprehensive monitoring beyond logs, consider integrating with [OneUptime's observability platform](https://oneuptime.com) for a complete picture of application health.
