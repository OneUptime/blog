# How to Automate Rancher Tasks with the API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, API, REST API, Automation

Description: Practical guide to automating common Rancher operations using the API, including cluster provisioning, user onboarding, backup scheduling, and CI/CD integration.

Automating Rancher tasks through the API saves time, reduces human error, and ensures consistent operations across your infrastructure. This guide provides ready-to-use scripts for the most common automation scenarios.

## Setting Up an Automation Framework

Start with a reusable shell library that handles authentication and error checking:

```bash
#!/bin/bash
# rancher-lib.sh - Reusable functions for Rancher automation

RANCHER_URL="${RANCHER_URL:-https://rancher.example.com}"
RANCHER_TOKEN="${RANCHER_TOKEN:-}"

rancher_get() {
  local endpoint="$1"
  local response
  response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer ${RANCHER_TOKEN}" \
    "${RANCHER_URL}${endpoint}")

  local http_code=$(echo "$response" | tail -1)
  local body=$(echo "$response" | head -n -1)

  if [ "$http_code" -ge 400 ]; then
    echo "ERROR: HTTP ${http_code} on GET ${endpoint}" >&2
    echo "$body" | jq -r '.message // .error // "Unknown error"' >&2
    return 1
  fi
  echo "$body"
}

rancher_post() {
  local endpoint="$1"
  local data="$2"
  local response
  response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Authorization: Bearer ${RANCHER_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$data" \
    "${RANCHER_URL}${endpoint}")

  local http_code=$(echo "$response" | tail -1)
  local body=$(echo "$response" | head -n -1)

  if [ "$http_code" -ge 400 ]; then
    echo "ERROR: HTTP ${http_code} on POST ${endpoint}" >&2
    echo "$body" | jq -r '.message // .error // "Unknown error"' >&2
    return 1
  fi
  echo "$body"
}

rancher_delete() {
  local endpoint="$1"
  curl -s -X DELETE \
    -H "Authorization: Bearer ${RANCHER_TOKEN}" \
    "${RANCHER_URL}${endpoint}"
}

wait_for_cluster() {
  local cluster_id="$1"
  local timeout="${2:-600}"
  local elapsed=0

  echo "Waiting for cluster ${cluster_id} to become active..."
  while [ $elapsed -lt $timeout ]; do
    local state
    state=$(rancher_get "/v3/clusters/${cluster_id}" | jq -r '.state')
    if [ "$state" = "active" ]; then
      echo "Cluster ${cluster_id} is active."
      return 0
    fi
    echo "  Current state: ${state} (${elapsed}s elapsed)"
    sleep 15
    elapsed=$((elapsed + 15))
  done
  echo "ERROR: Timeout waiting for cluster ${cluster_id}" >&2
  return 1
}
```

Source this library in your automation scripts:

```bash
#!/bin/bash
source ./rancher-lib.sh
```

## Automating User Onboarding

When a new team member joins, you need to create their user, assign roles, and grant cluster access:

```bash
#!/bin/bash
# onboard-user.sh
source ./rancher-lib.sh

onboard_user() {
  local username="$1"
  local display_name="$2"
  local password="$3"
  local cluster_id="$4"
  local role="${5:-cluster-member}"

  echo "Creating user: ${username}"
  local user_response
  user_response=$(rancher_post "/apis/management.cattle.io/v3/users" '{
    "apiVersion": "management.cattle.io/v3",
    "kind": "User",
    "metadata": {
      "name": "'"${username}"'"
    },
    "displayName": "'"${display_name}"'",
    "username": "'"${username}"'",
    "mustChangePassword": true,
    "enabled": true
  }')

  local user_name
  user_name=$(echo "$user_response" | jq -r '.metadata.name')
  echo "  User name: ${user_name}"

  echo "Creating password secret..."
  rancher_post "/api/v1/namespaces/cattle-local-user-passwords/secrets" '{
    "apiVersion": "v1",
    "kind": "Secret",
    "metadata": {
      "name": "'"${user_name}"'",
      "namespace": "cattle-local-user-passwords"
    },
    "type": "Opaque",
    "stringData": {
      "password": "'"${password}"'"
    }
  }' > /dev/null

  echo "Setting global role..."
  rancher_post "/apis/management.cattle.io/v3/globalrolebindings" '{
    "apiVersion": "management.cattle.io/v3",
    "kind": "GlobalRoleBinding",
    "globalRoleName": "user",
    "userName": "'"${user_name}"'"
  }' > /dev/null

  echo "Granting ${role} access to cluster ${cluster_id}..."
  rancher_post "/apis/management.cattle.io/v3/namespaces/${cluster_id}/clusterroletemplatebindings" '{
    "apiVersion": "management.cattle.io/v3",
    "kind": "ClusterRoleTemplateBinding",
    "clusterName": "'"${cluster_id}"'",
    "roleTemplateName": "'"${role}"'",
    "userName": "'"${user_name}"'"
  }' > /dev/null

  echo "User ${username} onboarded successfully."
}

# Usage

onboard_user "jdoe" "Jane Doe" "TempPass123!" "c-m-abc12345" "cluster-member"
```

### Batch Onboarding from CSV

```bash
#!/bin/bash
source ./onboard-user.sh

# users.csv format: username,display_name,cluster_id,role
while IFS=',' read -r username display_name cluster_id role; do
  onboard_user "$username" "$display_name" "InitialPass!" "$cluster_id" "$role"
done < users.csv
```

## Automating Namespace Provisioning

Create a script that provisions namespaces with resource quotas:

```bash
#!/bin/bash
source ./rancher-lib.sh

provision_namespace() {
  local cluster_id="$1"
  local project_id="$2"
  local namespace="$3"
  local cpu_limit="${4:-4}"
  local memory_limit="${5:-8Gi}"

  echo "Creating namespace: ${namespace}"

  # Create namespace
  rancher_post "/k8s/clusters/${cluster_id}/api/v1/namespaces" '{
    "apiVersion": "v1",
    "kind": "Namespace",
    "metadata": {
      "name": "'"${namespace}"'",
      "annotations": {
        "field.cattle.io/projectId": "'"${cluster_id}:${project_id}"'"
      }
    }
  }' > /dev/null

  # Apply resource quota
  rancher_post "/k8s/clusters/${cluster_id}/api/v1/namespaces/${namespace}/resourcequotas" '{
    "apiVersion": "v1",
    "kind": "ResourceQuota",
    "metadata": {
      "name": "'"${namespace}-quota"'"
    },
    "spec": {
      "hard": {
        "requests.cpu": "'"${cpu_limit}"'",
        "requests.memory": "'"${memory_limit}"'",
        "limits.cpu": "'"${cpu_limit}"'",
        "limits.memory": "'"${memory_limit}"'",
        "pods": "50"
      }
    }
  }' > /dev/null

  echo "Namespace ${namespace} created with resource quotas."
}

# Usage
provision_namespace "c-m-abc12345" "p-xyz789" "team-alpha" "8" "16Gi"
```

## Automating Cluster Health Monitoring

Create a script that checks cluster health and sends alerts:

```bash
#!/bin/bash
source ./rancher-lib.sh

ALERT_WEBHOOK="${ALERT_WEBHOOK:-https://hooks.slack.com/services/xxx/yyy/zzz}"

check_cluster_health() {
  local clusters
  clusters=$(rancher_get "/v3/clusters" | jq -r '.data[] | "\(.id)|\(.name)|\(.state)"')

  local issues_found=0

  while IFS='|' read -r id name state; do
    if [ "$state" != "active" ]; then
      send_alert "Cluster ${name} is in state: ${state}"
      issues_found=$((issues_found + 1))
      continue
    fi

    # Check node health
    local unhealthy_nodes
    unhealthy_nodes=$(rancher_get "/k8s/clusters/${id}/api/v1/nodes" | \
      jq '[.items[] | select(any(.status.conditions[]?; .type == "Ready" and .status != "True"))] | length')

    if [ "$unhealthy_nodes" -gt 0 ]; then
      send_alert "Cluster ${name} has ${unhealthy_nodes} unhealthy nodes"
      issues_found=$((issues_found + 1))
    fi

  done <<< "$clusters"

  echo "Health check complete. Issues found: ${issues_found}"
}

send_alert() {
  local message="$1"
  echo "ALERT: ${message}"
  curl -s -X POST -H 'Content-type: application/json' \
    --data '{"text":"'"${message}"'"}' \
    "${ALERT_WEBHOOK}" > /dev/null
}

check_cluster_health
```

Schedule this with cron:

```bash
# Run every 5 minutes
*/5 * * * * /opt/scripts/check-cluster-health.sh >> /var/log/rancher-health.log 2>&1
```

## CI/CD Integration

### GitLab CI Example

```yaml
# .gitlab-ci.yml
variables:
  RANCHER_URL: "https://rancher.example.com"
  CLUSTER_ID: "c-m-abc12345"

stages:
  - deploy

deploy_to_staging:
  stage: deploy
  image: ubuntu:24.04
  script:
    - |
      apt-get update
      apt-get install -y ca-certificates curl jq

      curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
      install -m 0755 kubectl /usr/local/bin/kubectl

      # Get kubeconfig from Rancher
      curl -s \
        -H "Authorization: Bearer ${RANCHER_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "$(jq -n --arg cluster "$CLUSTER_ID" '{
          apiVersion: "ext.cattle.io/v1",
          kind: "Kubeconfig",
          spec: {
            clusters: [$cluster],
            currentContext: $cluster
          }
        }')" \
        "${RANCHER_URL}/apis/ext.cattle.io/v1/kubeconfigs" | jq -r '.status.value' > /tmp/kubeconfig

      export KUBECONFIG=/tmp/kubeconfig

      # Apply manifests
      kubectl apply -f k8s/staging/
  only:
    - develop
```

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Rancher
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install deployment tools
        run: |
          sudo apt-get update
          sudo apt-get install -y jq
          curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
          sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

      - name: Deploy to production cluster
        env:
          RANCHER_URL: ${{ secrets.RANCHER_URL }}
          RANCHER_TOKEN: ${{ secrets.RANCHER_TOKEN }}
          CLUSTER_ID: ${{ secrets.CLUSTER_ID }}
        run: |
          curl -s \
            -H "Authorization: Bearer ${RANCHER_TOKEN}" \
            -H "Content-Type: application/json" \
            -d "$(jq -n --arg cluster "$CLUSTER_ID" '{
              apiVersion: "ext.cattle.io/v1",
              kind: "Kubeconfig",
              spec: {
                clusters: [$cluster],
                currentContext: $cluster
              }
            }')" \
            "${RANCHER_URL}/apis/ext.cattle.io/v1/kubeconfigs" | jq -r '.status.value' > /tmp/kubeconfig

          export KUBECONFIG=/tmp/kubeconfig
          kubectl apply -f k8s/production/
```

## Scheduled Cleanup Automation

Clean up completed jobs:

```bash
#!/bin/bash
source ./rancher-lib.sh

cleanup_cluster() {
  local cluster_id="$1"

  echo "Cleaning up cluster: ${cluster_id}"

  # Delete completed jobs
  local old_jobs
  old_jobs=$(rancher_get "/k8s/clusters/${cluster_id}/apis/batch/v1/jobs" | \
    jq -r '.items[]? | select(.status.succeeded >= 1) | .metadata.namespace + "/" + .metadata.name')

  for job in $old_jobs; do
    local ns=$(echo "$job" | cut -d/ -f1)
    local name=$(echo "$job" | cut -d/ -f2)
    echo "  Deleting completed job: ${ns}/${name}"
    rancher_delete "/k8s/clusters/${cluster_id}/apis/batch/v1/namespaces/${ns}/jobs/${name}"
  done

  echo "Cleanup complete."
}

# Run for all clusters
clusters=$(rancher_get "/v3/clusters" | jq -r '.data[].id')
for cluster in $clusters; do
  cleanup_cluster "$cluster"
done
```

## Summary

Automating Rancher tasks with the API covers user onboarding, namespace provisioning, health monitoring, CI/CD deployment, and scheduled maintenance. By building a reusable library of API functions and combining them into task-specific scripts, you can manage large Rancher environments efficiently and consistently. Schedule recurring tasks with cron and integrate deployment workflows with your CI/CD platform.
