# How to Create Custom Automation Scripts for Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Automation, Script, Bash, Python, API

Description: A practical guide to writing custom automation scripts for Rancher using Bash and Python, covering common administrative tasks and workflow automation.

## Overview

While Rancher provides a comprehensive UI and Terraform support, there are many scenarios where custom automation scripts provide the most efficient solution: onboarding new clusters, bulk configuration changes, health checks, and integration with existing operational tooling. This guide covers patterns and examples for writing effective Rancher automation scripts.

## Authentication Patterns

### Bash Authentication Helper

```bash
#!/bin/bash
# rancher-auth.sh - Source this in your automation scripts

# Set these via environment variables or a secrets manager

RANCHER_URL="${RANCHER_URL:-https://rancher.example.com}"
RANCHER_TOKEN="${RANCHER_TOKEN}"  # Format: token-xxx:secret

# Validate token
validate_auth() {
  local RESPONSE

  RESPONSE=$(curl -sS \
    -o /dev/null \
    -w "%{http_code}" \
    -u "${RANCHER_TOKEN}" \
    "${RANCHER_URL}/v3/clusters?limit=1")

  if [ "${RESPONSE}" != "200" ]; then
    echo "ERROR: Authentication failed (HTTP ${RESPONSE})"
    exit 1
  fi
  echo "Authentication successful"
}

# Generic API call wrapper with error handling
rancher_api() {
  local METHOD="$1"
  local ENDPOINT="$2"
  local DATA="${3:-}"
  local CURL_ARGS=(
    -sS
    --fail
    -u "${RANCHER_TOKEN}"
    -H "Content-Type: application/json"
    -X "${METHOD}"
  )

  if [ -n "${DATA}" ]; then
    CURL_ARGS+=(-d "${DATA}")
  fi

  curl "${CURL_ARGS[@]}" "${RANCHER_URL}${ENDPOINT}"
}
```

### Python Authentication Client

```python
#!/usr/bin/env python3
# rancher_client.py - Reusable Rancher API client

import os
from typing import Any, Dict, List, Optional

import requests

class RancherClient:
    def __init__(self, url: Optional[str] = None, token: Optional[str] = None):
        self.url = (url or os.environ.get('RANCHER_URL', '')).rstrip('/')
        self.token = token or os.environ.get('RANCHER_TOKEN')
        ca_bundle = os.environ.get('RANCHER_CA_BUNDLE')

        if not self.url or not self.token:
            raise ValueError('RANCHER_URL and RANCHER_TOKEN must be set')
        if ':' not in self.token:
            raise ValueError('RANCHER_TOKEN must use access-key:secret-key format')

        access_key, secret_key = self.token.split(':', 1)

        self.session = requests.Session()
        self.session.auth = (access_key, secret_key)
        self.session.headers.update({'Content-Type': 'application/json'})
        self.session.verify = ca_bundle if ca_bundle else True

    def get_collection(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """GET a paginated Rancher collection"""
        items: List[Dict[str, Any]] = []
        next_url = f"{self.url}{endpoint}"
        next_params = params or {}

        while next_url:
            resp = self.session.get(next_url, params=next_params, timeout=30)
            resp.raise_for_status()
            payload = resp.json()
            items.extend(payload.get('data', []))

            next_url = payload.get('pagination', {}).get('next')
            if next_url and next_url.startswith('/'):
                next_url = f"{self.url}{next_url}"
            next_params = None

        return items

    def get(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """GET request to Rancher API"""
        resp = self.session.get(f"{self.url}{endpoint}", params=params, timeout=30)
        resp.raise_for_status()
        return resp.json()

    def post(self, endpoint: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """POST request to Rancher API"""
        resp = self.session.post(f"{self.url}{endpoint}", json=data, timeout=30)
        resp.raise_for_status()
        return resp.json()

    def put(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """PUT request to Rancher API"""
        resp = self.session.put(f"{self.url}{endpoint}", json=data, timeout=30)
        resp.raise_for_status()
        return resp.json()

    def delete(self, endpoint: str) -> None:
        """DELETE request to Rancher API"""
        resp = self.session.delete(f"{self.url}{endpoint}", timeout=30)
        resp.raise_for_status()

    def get_clusters(self) -> List[Dict[str, Any]]:
        """Get all clusters"""
        return self.get_collection('/v3/clusters')

    def get_cluster_health(self, cluster_id: str) -> str:
        """Get cluster health status"""
        cluster = self.get(f'/v3/clusters/{cluster_id}')
        return cluster.get('state', 'unknown')
```

## Common Automation Scripts

### Cluster Health Check Script

```python
#!/usr/bin/env python3
# cluster-health-check.py
from rancher_client import RancherClient
import sys

def check_all_clusters():
    client = RancherClient()
    clusters = client.get_clusters()

    unhealthy = []
    for cluster in clusters:
        state = cluster.get('state', 'unknown')
        name = cluster.get('name', 'unknown')
        cluster_id = cluster.get('id', 'unknown')

        if state != 'active':
            unhealthy.append({
                'name': name,
                'id': cluster_id,
                'state': state
            })
            print(f"UNHEALTHY: {name} ({cluster_id}) - state: {state}")
        else:
            print(f"OK: {name} ({cluster_id}) - active")

    if unhealthy:
        print(f"\nFound {len(unhealthy)} unhealthy cluster(s)")
        sys.exit(1)
    else:
        print(f"\nAll {len(clusters)} clusters are healthy")

if __name__ == '__main__':
    check_all_clusters()
```

### Bulk Namespace Creation Script

```bash
#!/bin/bash
# bulk-namespaces.sh - Create namespaces across multiple clusters

set -euo pipefail

source rancher-auth.sh

CLUSTERS_FILE="clusters.txt"
NAMESPACES=("monitoring" "logging" "security" "ingress")

while IFS= read -r cluster_id; do
  echo "Processing cluster: ${cluster_id}"
  kubeconfig_file=$(mktemp)

  rancher_api POST "/v3/clusters/${cluster_id}?action=generateKubeconfig" \
    | jq -r '.config' > "${kubeconfig_file}"

  for ns in "${NAMESPACES[@]}"; do
    # Create namespace via kubectl using cluster-specific kubeconfig
    kubectl --kubeconfig="${kubeconfig_file}" create namespace "${ns}" \
      --dry-run=client -o yaml | kubectl --kubeconfig="${kubeconfig_file}" apply -f - >/dev/null

    echo "  Namespace ${ns} created/verified in ${cluster_id}"
  done

  rm -f "${kubeconfig_file}"
done < "${CLUSTERS_FILE}"
```

### Deploy App Across All Clusters

```python
#!/usr/bin/env python3
# deploy-app-all-clusters.py
# Deploys a Helm chart to all clusters with a specific label

from rancher_client import RancherClient
import subprocess
import tempfile

def deploy_app_to_clusters(label_key: str, label_value: str, app_config: dict):
    client = RancherClient()
    clusters = client.get_clusters()

    # Filter clusters by label
    target_clusters = [
        c for c in clusters
        if c.get('labels', {}).get(label_key) == label_value
        and c.get('state') == 'active'
    ]

    print(f"Deploying to {len(target_clusters)} clusters")

    for cluster in target_clusters:
        cluster_id = cluster['id']
        cluster_name = cluster['name']

        try:
            kubeconfig = client.post(
                f'/v3/clusters/{cluster_id}?action=generateKubeconfig'
            ).get('config')

            if not kubeconfig:
                print(f"  FAILED: {cluster_name} - unable to generate kubeconfig")
                continue

            with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml') as kubeconfig_file:
                kubeconfig_file.write(kubeconfig)
                kubeconfig_file.flush()

                cmd = [
                    'helm', 'upgrade', '--install',
                    app_config['release_name'],
                    app_config['chart_ref'],
                    '--kubeconfig', kubeconfig_file.name,
                    '--namespace', app_config['namespace'],
                    '--create-namespace',
                ]

                if app_config.get('chart_version'):
                    cmd.extend(['--version', app_config['chart_version']])

                for key, value in app_config.get('set_values', {}).items():
                    cmd.extend(['--set', f'{key}={value}'])

                subprocess.run(cmd, check=True, capture_output=True, text=True)
                print(f"  Deployed to {cluster_name}")
        except subprocess.CalledProcessError as e:
            error = e.stderr.strip() or str(e)
            print(f"  FAILED: {cluster_name} - {error}")
        except Exception as e:
            print(f"  FAILED: {cluster_name} - {str(e)}")


# Example usage
app_config = {
    'release_name': 'monitoring',
    'chart_ref': 'oci://registry.example.com/charts/monitoring',
    'namespace': 'cattle-monitoring-system',
    'set_values': {
        'prometheus.prometheusSpec.retention': '30d',
    }
}

deploy_app_to_clusters('env', 'production', app_config)
```

### Automated Cluster Labeling

```bash
#!/bin/bash
# label-clusters.sh - Automatically label clusters based on naming convention

set -euo pipefail

# Example: cluster names like "prod-us-east-rke2" get labeled accordingly
source rancher-auth.sh

list_clusters() {
  local endpoint="/v3/clusters?limit=1000"
  local response
  local next_endpoint

  while [ -n "${endpoint}" ]; do
    response=$(rancher_api GET "${endpoint}")
    echo "${response}" | jq -r '.data[] | [.id, .name] | @tsv'
    next_endpoint=$(echo "${response}" | jq -r '.pagination.next // empty | sub("^https?://[^/]+"; "")')
    endpoint="${next_endpoint}"
  done
}

while IFS=$'\t' read -r cluster_id cluster_name; do
  # Extract environment from cluster name
  if [[ "${cluster_name}" == prod-* ]]; then
    ENV="production"
  elif [[ "${cluster_name}" == staging-* ]]; then
    ENV="staging"
  else
    ENV="development"
  fi

  # Extract region from cluster name
  REGION="unknown"
  if [[ "${cluster_name}" == *us-east* ]]; then
    REGION="us-east"
  elif [[ "${cluster_name}" == *us-west* ]]; then
    REGION="us-west"
  elif [[ "${cluster_name}" == *eu-west* ]]; then
    REGION="eu-west"
  fi

  CURRENT_LABELS=$(rancher_api GET "/v3/clusters/${cluster_id}" | jq '.labels // {}')
  UPDATED_LABELS=$(jq -cn \
    --argjson current "${CURRENT_LABELS}" \
    --arg env "${ENV}" \
    --arg region "${REGION}" \
    '$current + {"env": $env, "region": $region}')

  # Update cluster labels
  rancher_api PUT "/v3/clusters/${cluster_id}" \
    "{\"labels\": ${UPDATED_LABELS}}" \
    > /dev/null

  echo "Labeled ${cluster_name}: env=${ENV}, region=${REGION}"
done < <(list_clusters)
```

## Scheduling Scripts with CronJobs

```yaml
# Kubernetes CronJob to run health check daily
apiVersion: batch/v1
kind: CronJob
metadata:
  name: rancher-health-check
  namespace: cattle-system
spec:
  schedule: "0 8 * * *"    # Daily at 8 AM UTC
  timeZone: "Etc/UTC"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: health-checker
              image: registry.example.com/rancher-scripts:latest
              env:
                - name: RANCHER_URL
                  value: "https://rancher.example.com"
                - name: RANCHER_TOKEN
                  valueFrom:
                    secretKeyRef:
                      name: rancher-automation-token
                      key: token
                - name: SLACK_WEBHOOK
                  valueFrom:
                    secretKeyRef:
                      name: notifications
                      key: slack-webhook
              command: ["python3", "/scripts/cluster-health-check.py"]
          restartPolicy: OnFailure
```

## Conclusion

Custom automation scripts for Rancher enable you to integrate Rancher operations into your existing workflows, automate repetitive tasks, and respond to events programmatically. Using a shared authentication helper and API client library ensures consistency across scripts. Store all automation scripts in version control, manage credentials in Kubernetes Secrets or Vault, and schedule recurring tasks as Kubernetes CronJobs for reliability. Always test scripts against non-production environments before running them on production clusters.
