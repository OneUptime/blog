# How to Configure Harbor Project Quotas for Storage Limits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harbor, Container Registry, Storage Management

Description: Learn how to implement and manage Harbor project quotas to control storage consumption, enforce resource limits, and optimize container registry infrastructure costs.

---

As container registries grow, uncontrolled storage consumption can lead to unexpected costs and infrastructure strain. Harbor provides project quotas that enable administrators to set hard limits on storage and artifact counts, ensuring fair resource allocation and preventing runaway usage.

## Understanding Harbor Project Quotas

Harbor organizes container images into projects, which serve as namespaces for access control and resource management. Project quotas allow you to define two types of limits:

1. **Storage quotas** - Maximum bytes of storage a project can consume
2. **Count quotas** - Maximum number of artifacts (images, charts, etc.)

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

Navigate to Projects, select your project, and click Configuration. Under Resource Management, you'll find quota settings:

**Storage Quota** - Enter a value with unit (MB, GB, TB). For example, `50GB` limits the project to 50 gigabytes.

**Count Quota** - Enter a numeric value. For example, `1000` allows up to 1,000 artifacts.

Leave a field at `-1` to indicate unlimited (default behavior).

Click Save to apply the quotas immediately.

## Setting Quotas via Harbor API

For automation and infrastructure-as-code workflows, use Harbor's REST API to manage quotas programmatically.

First, authenticate and get a project ID:

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

echo "Project ID: ${PROJECT_ID}"
```

Update the project quota:

```bash
# Set 100GB storage quota and 2000 artifact count quota
curl -X PUT \
  -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
  -H "Content-Type: application/json" \
  "${HARBOR_URL}/api/v2.0/quotas/${PROJECT_ID}" \
  -d '{
    "hard": {
      "storage": 107374182400,
      "count": 2000
    }
  }'
```

Note that storage values are in bytes. To convert:
- 1 GB = 1073741824 bytes
- 100 GB = 107374182400 bytes
- 1 TB = 1099511627776 bytes

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
    "storage_limit": 21474836480,
    "count_limit": 500
  }'
```

This creates a project with 20 GB storage and 500 artifact limits from inception.

## Monitoring Quota Usage

Harbor provides real-time quota consumption metrics. Query them via API:

```bash
# Get current quota usage
curl -s -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
  "${HARBOR_URL}/api/v2.0/quotas/${PROJECT_ID}" | \
  jq '.used'
```

Output shows current consumption:

```json
{
  "storage": 45348576256,
  "count": 342
}
```

Calculate usage percentages:

```bash
# Get quota details
QUOTA_INFO=$(curl -s -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
  "${HARBOR_URL}/api/v2.0/quotas/${PROJECT_ID}")

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
  echo "Usage: $0 <project-name> <storage-gb> <count-limit>"
  echo "Example: $0 myproject 50 1000"
  exit 1
}

if [ $# -ne 3 ]; then
  usage
fi

PROJECT_NAME=$1
STORAGE_GB=$2
COUNT_LIMIT=$3

# Convert GB to bytes
STORAGE_BYTES=$((STORAGE_GB * 1073741824))

# Get project ID
PROJECT_ID=$(curl -s -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
  "${HARBOR_URL}/api/v2.0/projects?name=${PROJECT_NAME}" | \
  jq -r '.[0].project_id')

if [ "$PROJECT_ID" == "null" ]; then
  echo "Error: Project ${PROJECT_NAME} not found"
  exit 1
fi

# Update quota
echo "Setting quota for ${PROJECT_NAME} (ID: ${PROJECT_ID})"
echo "  Storage: ${STORAGE_GB} GB (${STORAGE_BYTES} bytes)"
echo "  Count: ${COUNT_LIMIT} artifacts"

curl -X PUT \
  -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
  -H "Content-Type: application/json" \
  "${HARBOR_URL}/api/v2.0/quotas/${PROJECT_ID}" \
  -d "{
    \"hard\": {
      \"storage\": ${STORAGE_BYTES},
      \"count\": ${COUNT_LIMIT}
    }
  }" \
  -w "\nHTTP Status: %{http_code}\n"

echo "Quota updated successfully"
```

Use the script:

```bash
chmod +x harbor-quota-manager.sh
./harbor-quota-manager.sh production 100 2000
./harbor-quota-manager.sh staging 50 1000
./harbor-quota-manager.sh development 20 500
```

## Handling Quota Exceeded Scenarios

When a project hits its quota, push operations fail with HTTP 413 errors:

```
Error: failed to push image: 413 Project quota exceeded
```

Users see this error immediately at push time, preventing partial uploads.

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

**Option 2: Run garbage collection** - Reclaim space from deleted artifacts.

Harbor's garbage collection must run to actually free disk space after deleting artifacts. Schedule it via the UI (Administration > Garbage Collection) or trigger via API.

**Option 3: Increase quota** - If usage is legitimate, raise the limits using the scripts above.

## Implementing Tiered Quota Policies

Different project types need different quotas. Create a tiered system:

```bash
# Production projects: Large quotas, strict monitoring
./harbor-quota-manager.sh prod-api 200 5000
./harbor-quota-manager.sh prod-web 150 3000

# Staging projects: Medium quotas
./harbor-quota-manager.sh staging-api 75 2000
./harbor-quota-manager.sh staging-web 50 1500

# Development projects: Small quotas, encourage cleanup
./harbor-quota-manager.sh dev-team-a 25 500
./harbor-quota-manager.sh dev-team-b 25 500

# CI/CD projects: Medium quotas, fast churn
./harbor-quota-manager.sh ci-builds 100 1000
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

  QUOTA=$(curl -s -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
    "${HARBOR_URL}/api/v2.0/quotas/${PROJECT_ID}")

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
