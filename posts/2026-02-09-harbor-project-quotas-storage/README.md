# How to Configure Harbor Project Quotas for Storage Limits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harbor, Container Registry, Storage Management

Description: Learn how to implement and manage Harbor project quotas to control storage consumption, enforce resource limits, and optimize container registry infrastructure costs.

---

As container registries grow, uncontrolled storage consumption can lead to unexpected costs and infrastructure strain. Harbor provides project quotas that enable administrators to set hard limits on storage consumption, ensuring fair resource allocation and preventing runaway usage.

## Understanding Harbor Project Quotas

Harbor organizes container images into projects, which serve as namespaces for access control and resource management. Project quotas allow you to define storage limits:

1. **Storage quotas** - Maximum bytes of storage a project can consume

When a project reaches its quota, Harbor blocks new pushes until space is freed. This prevents individual teams or projects from monopolizing registry resources.

## Why Project Quotas Matter

Without quotas, several problems emerge in production environments:

**Cost overruns** - Cloud storage bills spike as teams push unlimited images without cleanup policies.

**Resource exhaustion** - One project fills available storage, causing pushes to fail for all other projects.

**Lack of accountability** - Without visibility into per-project consumption, it's difficult to identify wasteful practices.

**Operational burden** - Admins manually intervene when storage runs low, hunting for large images to delete.

Quotas shift storage management from reactive firefighting to proactive resource governance.

## Configuring Quotas via Harbor UI

The simplest way to set quotas is through Harbor's web interface.

Navigate to the Project Quotas view, select your project, and click Edit. You'll find the quota settings:

**Storage Quota** - Enter a value with unit (MiB, GiB, TiB). For example, `50GiB` limits the project to 50 gibibytes.

Leave a field at `-1` to indicate unlimited (default behavior).

Click OK to apply the quota.

## Setting Quotas via Harbor API

For automation and infrastructure-as-code workflows, use Harbor's REST API to manage quotas programmatically.

First, authenticate and get the project ID and quota ID:

```bash
# Set Harbor credentials

HARBOR_URL="https://harbor.example.com"
HARBOR_USER="admin"
HARBOR_PASSWORD="YourPassword"

# Get project ID by name
PROJECT_NAME="production"
PROJECT_ID=$(curl -s -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
  "${HARBOR_URL}/api/v2.0/projects?name=${PROJECT_NAME}" | \
  jq -r '.[0].project_id')

QUOTA_ID=$(curl -s -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
  "${HARBOR_URL}/api/v2.0/quotas?reference=project&reference_id=${PROJECT_ID}" | \
  jq -r '.[0].id')

echo "Project ID: ${PROJECT_ID}"
echo "Quota ID: ${QUOTA_ID}"
```

Update the project quota:

```bash
# Set 100GiB storage quota
curl -X PUT \
  -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
  -H "Content-Type: application/json" \
  "${HARBOR_URL}/api/v2.0/quotas/${QUOTA_ID}" \
  -d '{
    "hard": {
      "storage": 107374182400
    }
  }'
```

Note that storage values are in bytes. To convert:
- 1 GiB = 1073741824 bytes
- 100 GiB = 107374182400 bytes
- 1 TiB = 1099511627776 bytes

## Creating Projects with Initial Quotas

When creating new projects, set quotas from the start to prevent unchecked growth:

```bash
# Create project with quotas using API
curl -X POST \
  -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
  -H "Content-Type: application/json" \
  "${HARBOR_URL}/api/v2.0/projects" \
  -d '{
    "project_name": "development",
    "metadata": {
      "public": "false"
    },
    "storage_limit": 21474836480
  }'
```

This creates a project with a 20 GiB storage limit from inception.

## Monitoring Quota Usage

Harbor provides real-time quota consumption metrics. Query them via API:

```bash
# Get current quota usage
curl -s -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
  "${HARBOR_URL}/api/v2.0/quotas/${QUOTA_ID}" | \
  jq '.used'
```

Output shows current consumption:

```json
{
  "storage": 45348576256
}
```

Calculate usage percentages:

```bash
# Get quota details
QUOTA_INFO=$(curl -s -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
  "${HARBOR_URL}/api/v2.0/quotas/${QUOTA_ID}")

USED_STORAGE=$(echo $QUOTA_INFO | jq -r '.used.storage')
HARD_STORAGE=$(echo $QUOTA_INFO | jq -r '.hard.storage')

# Calculate percentage
PERCENT=$(echo "scale=2; ($USED_STORAGE / $HARD_STORAGE) * 100" | bc)
echo "Storage used: ${PERCENT}%"
```

## Automating Quota Management with Scripts

Create a script to standardize quota management across projects:

```bash
#!/bin/bash
# harbor-quota-manager.sh

set -e

HARBOR_URL="${HARBOR_URL:-https://harbor.example.com}"
HARBOR_USER="${HARBOR_USER:-admin}"
HARBOR_PASSWORD="${HARBOR_PASSWORD}"

usage() {
  echo "Usage: $0 <project-name> <storage-gib>"
  echo "Example: $0 myproject 50"
  exit 1
}

if [ $# -ne 2 ]; then
  usage
fi

PROJECT_NAME=$1
STORAGE_GIB=$2

# Convert GiB to bytes
STORAGE_BYTES=$((STORAGE_GIB * 1073741824))

# Get project ID
PROJECT_ID=$(curl -s -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
  "${HARBOR_URL}/api/v2.0/projects?name=${PROJECT_NAME}" | \
  jq -r '.[0].project_id')

if [ "$PROJECT_ID" == "null" ]; then
  echo "Error: Project ${PROJECT_NAME} not found"
  exit 1
fi

QUOTA_ID=$(curl -s -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
  "${HARBOR_URL}/api/v2.0/quotas?reference=project&reference_id=${PROJECT_ID}" | \
  jq -r '.[0].id')

if [ "$QUOTA_ID" == "null" ]; then
  echo "Error: Quota for project ${PROJECT_NAME} not found"
  exit 1
fi

# Update quota
echo "Setting quota for ${PROJECT_NAME} (ID: ${PROJECT_ID})"
echo "  Storage: ${STORAGE_GIB} GiB (${STORAGE_BYTES} bytes)"

curl -X PUT \
  -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
  -H "Content-Type: application/json" \
  "${HARBOR_URL}/api/v2.0/quotas/${QUOTA_ID}" \
  -d "{
    \"hard\": {
      \"storage\": ${STORAGE_BYTES}
    }
  }" \
  -w "\nHTTP Status: %{http_code}\n"

echo "Quota updated successfully"
```

Use the script:

```bash
chmod +x harbor-quota-manager.sh
./harbor-quota-manager.sh production 100
./harbor-quota-manager.sh staging 50
./harbor-quota-manager.sh development 20
```

## Handling Quota Exceeded Scenarios

When a project hits its quota, push operations can fail with quota exceeded errors:

```text
Error: failed to push image: 413 Project quota exceeded
```

Because image manifests are pushed after blobs, Harbor might only reject the push when the manifest arrives and the quota check determines that the limit would be exceeded.

To resolve quota exceeded issues:

**Option 1: Clean up old images** - Delete unused tags and artifacts to free space.

```bash
# List repositories in project
curl -s -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
  "${HARBOR_URL}/api/v2.0/projects/${PROJECT_NAME}/repositories" | \
  jq -r '.[].name'

# Delete specific tag
curl -X DELETE \
  -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
  "${HARBOR_URL}/api/v2.0/projects/${PROJECT_NAME}/repositories/${REPO_NAME}/artifacts/${TAG}"
```

If `REPO_NAME` contains a slash, URL-encode it twice before using it in the API path.

**Option 2: Run garbage collection** - Reclaim space from deleted artifacts.

Harbor's garbage collection must run to actually free disk space after deleting artifacts. Schedule it via the UI (Administration > Clean Up > Garbage Collection) or trigger via API.

**Option 3: Increase quota** - If usage is legitimate, raise the limits using the scripts above.

## Implementing Tiered Quota Policies

Different project types need different quotas. Create a tiered system:

```bash
# Production projects: Large quotas, strict monitoring
./harbor-quota-manager.sh prod-api 200
./harbor-quota-manager.sh prod-web 150

# Staging projects: Medium quotas
./harbor-quota-manager.sh staging-api 75
./harbor-quota-manager.sh staging-web 50

# Development projects: Small quotas, encourage cleanup
./harbor-quota-manager.sh dev-team-a 25
./harbor-quota-manager.sh dev-team-b 25

# CI/CD projects: Medium quotas, fast churn
./harbor-quota-manager.sh ci-builds 100
```

Document your quota tiers and communicate them to development teams.

## Setting Up Quota Alerts

Monitor quota usage and alert before limits are reached:

```bash
#!/bin/bash
# harbor-quota-alerts.sh

THRESHOLD=80  # Alert at 80% usage

for PROJECT in prod-api staging-api dev-team-a; do
  PROJECT_ID=$(curl -s -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
    "${HARBOR_URL}/api/v2.0/projects?name=${PROJECT}" | \
    jq -r '.[0].project_id')

  QUOTA_ID=$(curl -s -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
    "${HARBOR_URL}/api/v2.0/quotas?reference=project&reference_id=${PROJECT_ID}" | \
    jq -r '.[0].id')

  QUOTA=$(curl -s -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
    "${HARBOR_URL}/api/v2.0/quotas/${QUOTA_ID}")

  USED=$(echo $QUOTA | jq -r '.used.storage')
  HARD=$(echo $QUOTA | jq -r '.hard.storage')

  if [ "$HARD" != "-1" ]; then
    PERCENT=$(echo "scale=2; ($USED / $HARD) * 100" | bc)

    if (( $(echo "$PERCENT > $THRESHOLD" | bc -l) )); then
      echo "WARNING: ${PROJECT} at ${PERCENT}% storage quota"
      # Send alert via webhook, email, Slack, etc.
    fi
  fi
done
```

Run this script periodically via cron to proactively identify quota pressure.

## Best Practices

**Start with generous quotas** - Set initial limits well above current usage to avoid disrupting workflows while gathering baseline data.

**Review usage quarterly** - Analyze trends and adjust quotas as projects mature.

**Combine with retention policies** - Use Harbor's tag retention rules to automatically prune old images.

**Document quota policies** - Create clear guidelines for requesting quota increases.

**Audit regularly** - Identify projects using storage inefficiently (many duplicate layers, oversized images).

**Plan for growth** - Monitor overall registry storage trends to ensure physical capacity keeps pace.

## Conclusion

Harbor project quotas provide essential controls for managing container registry resources at scale. By setting appropriate limits, monitoring usage, and implementing automated cleanup processes, you can prevent storage exhaustion, control costs, and ensure fair resource allocation across teams. Combined with retention policies and regular audits, quotas enable sustainable registry operations that support rather than hinder development velocity.
