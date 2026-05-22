# How to Migrate Between Terraform Enterprise Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, Migration, Data Migration, DevOps, Operation

Description: A step-by-step guide to migrating between Terraform Enterprise deployments, covering state migration, workspace recreation, and data transfer with minimal downtime.

---

There are several reasons you might need to migrate between Terraform Enterprise deployments - moving from on-premises to cloud, upgrading from a legacy installation architecture to the current Docker-based deployment, migrating to a different region, or consolidating multiple TFE instances into one. Whatever the reason, the migration needs to preserve your workspaces, state files, variables, team configurations, and run history.

This guide walks through the complete migration process with scripts and verification steps.

## Migration Strategies

### Strategy 1: Database and Storage Migration (Recommended)

Migrate the PostgreSQL database and object storage directly. This preserves everything - run history, audit logs, and all configuration.

### Strategy 2: API-Based Migration

Recreate everything using the TFE API. This is cleaner but loses run history and audit logs. Best when you want a fresh start.

### Strategy 3: Hybrid

Migrate critical data (state files, variables) via API and let non-critical data (run history) be left behind.

## Pre-Migration Planning

```bash
# Inventory your source TFE instance

echo "=== TFE Migration Inventory ==="

# Count organizations
ORGS=$(curl -s \
  --header "Authorization: Bearer ${SRC_ADMIN_TOKEN}" \
  "${SRC_TFE_URL}/api/v2/admin/organizations" | \
  jq '.meta.pagination["total-count"]')
echo "Organizations: ${ORGS}"

# Count workspaces
WS_COUNT=$(curl -s \
  --header "Authorization: Bearer ${SRC_ADMIN_TOKEN}" \
  "${SRC_TFE_URL}/api/v2/admin/workspaces" | \
  jq '.meta.pagination["total-count"]')
echo "Workspaces: ${WS_COUNT}"

# Count users
USERS=$(curl -s \
  --header "Authorization: Bearer ${SRC_ADMIN_TOKEN}" \
  "${SRC_TFE_URL}/api/v2/admin/users" | \
  jq '.meta.pagination["total-count"]')
echo "Users: ${USERS}"

# Count teams
# (per organization - loop through orgs)

# Estimate state file storage size
# Check object storage bucket size
aws s3 ls s3://source-tfe-objects --recursive --summarize | tail -2
```

## Strategy 1: Database and Storage Migration

### Step 1: Prepare the Destination

Set up the new TFE deployment with all external services but do NOT start TFE yet:

```bash
# New infrastructure should be ready:
# - PostgreSQL database (empty)
# - Redis instance
# - Object storage bucket (empty)
# - TFE host(s) with Docker installed
# - Load balancer configured
# - DNS ready to switch
# - TLS certificates installed
```

### Step 2: Stop the Source Instance

```bash
# Prevent new work from entering the source instance.
# For example, disable VCS webhooks or temporarily block user/API access at the load balancer.

# Wait for all active runs to complete
while true; do
  ACTIVE=$(curl -s \
    --header "Authorization: Bearer ${SRC_ADMIN_TOKEN}" \
    "${SRC_TFE_URL}/api/v2/admin/runs?filter[status]=pending,plan_queued,planning,confirmed,apply_queued,applying" | \
    jq '.meta.pagination["total-count"]')

  if [ "${ACTIVE}" -eq 0 ]; then
    echo "All runs complete. Safe to proceed."
    break
  fi
  echo "Waiting for ${ACTIVE} active runs to complete..."
  sleep 30
done

# Stop the source TFE instance
ssh source-tfe "cd /opt/tfe && docker compose down"
```

### Step 3: Migrate the Database

```bash
# Dump the source database
PGPASSWORD="${SRC_DB_PASSWORD}" pg_dump \
  -h "${SRC_DB_HOST}" \
  -U "${SRC_DB_USER}" \
  -d tfe \
  --format=custom \
  --compress=9 \
  --file="tfe-migration-dump.sql"

# Restore to the destination database
PGPASSWORD="${DST_DB_PASSWORD}" pg_restore \
  -h "${DST_DB_HOST}" \
  -U "${DST_DB_USER}" \
  -d tfe \
  --verbose \
  --no-owner \
  --no-acl \
  "tfe-migration-dump.sql"

# Verify the restore
PGPASSWORD="${DST_DB_PASSWORD}" psql \
  -h "${DST_DB_HOST}" \
  -U "${DST_DB_USER}" \
  -d tfe \
  -c "SELECT count(*) FROM workspaces;"
```

### Step 4: Migrate Object Storage

```bash
# Sync all objects from source to destination bucket
aws s3 sync \
  s3://source-tfe-objects \
  s3://dest-tfe-objects \
  --source-region us-east-1 \
  --region us-west-2 \
  --exact-timestamps

# Verify the sync
SRC_COUNT=$(aws s3 ls s3://source-tfe-objects --recursive | wc -l)
DST_COUNT=$(aws s3 ls s3://dest-tfe-objects --recursive | wc -l)
echo "Source objects: ${SRC_COUNT}, Destination objects: ${DST_COUNT}"

if [ "${SRC_COUNT}" -ne "${DST_COUNT}" ]; then
  echo "WARNING: Object counts do not match. Investigate before proceeding."
fi
```

### Step 5: Start the Destination TFE

```bash
# If the hostname changed, update the destination deployment configuration
# (for example, TFE_HOSTNAME in Docker Compose) before starting TFE.
# You will also need to reconfigure VCS connections after the restore.

# Start TFE on the destination
ssh dest-tfe "cd /opt/tfe && docker compose up -d"

# Wait for TFE to come up
for i in $(seq 1 60); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "https://new-tfe.example.com/_health_check" 2>/dev/null)
  if [ "${STATUS}" = "200" ]; then
    echo "TFE is healthy on destination!"
    break
  fi
  echo "Waiting for TFE to start... (attempt ${i}/60)"
  sleep 10
done
```

### Step 6: Switch DNS

```bash
# Update DNS to point to the new TFE instance
# If you kept the same hostname:
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "tfe.example.com",
        "Type": "CNAME",
        "TTL": 60,
        "ResourceRecords": [{"Value": "new-tfe-alb.us-west-2.elb.amazonaws.com"}]
      }
    }]
  }'
```

## Strategy 2: API-Based Migration

For when you want a clean start on the new instance:

```bash
#!/bin/bash
# migrate-tfe-api.sh
# Migrate workspaces and state via the TFE API

SRC_URL="https://old-tfe.example.com"
DST_URL="https://new-tfe.example.com"

# Get all organizations
ORGS=$(curl -s \
  --header "Authorization: Bearer ${SRC_ADMIN_TOKEN}" \
  "${SRC_URL}/api/v2/organizations?page[size]=100" | \
  jq -r '.data[].attributes.name')

for ORG in ${ORGS}; do
  echo "Migrating organization: ${ORG}"

  # Create organization on destination
  curl -s \
    --header "Authorization: Bearer ${DST_ADMIN_TOKEN}" \
    --header "Content-Type: application/vnd.api+json" \
    --request POST \
    "${DST_URL}/api/v2/organizations" \
    --data "{
      \"data\": {
        \"type\": \"organizations\",
        \"attributes\": {
          \"name\": \"${ORG}\",
          \"email\": \"admin@example.com\"
        }
      }
    }" > /dev/null 2>&1

  # Get all workspaces in the organization
  WORKSPACES=$(curl -s \
    --header "Authorization: Bearer ${SRC_ADMIN_TOKEN}" \
    "${SRC_URL}/api/v2/organizations/${ORG}/workspaces?page[size]=100" | \
    jq -c '.data[]')

  echo "${WORKSPACES}" | while read -r WS; do
    WS_NAME=$(echo "${WS}" | jq -r '.attributes.name')
    WS_ID=$(echo "${WS}" | jq -r '.id')
    TF_VERSION=$(echo "${WS}" | jq -r '.attributes["terraform-version"]')

    echo "  Migrating workspace: ${WS_NAME}"

    # Create workspace on destination
    DST_WS_ID=$(curl -s \
      --header "Authorization: Bearer ${DST_ADMIN_TOKEN}" \
      --header "Content-Type: application/vnd.api+json" \
      --request POST \
      "${DST_URL}/api/v2/organizations/${ORG}/workspaces" \
      --data "{
        \"data\": {
          \"type\": \"workspaces\",
          \"attributes\": {
            \"name\": \"${WS_NAME}\",
            \"terraform-version\": \"${TF_VERSION}\"
          }
        }
      }" | jq -r '.data.id')

    # Download current state from source
    STATE_URL=$(curl -s \
      --header "Authorization: Bearer ${SRC_ADMIN_TOKEN}" \
      "${SRC_URL}/api/v2/workspaces/${WS_ID}/current-state-version" | \
      jq -r '.data.attributes["hosted-state-download-url"]')

    if [ "${STATE_URL}" != "null" ]; then
      STATE_FILE="/tmp/state-${WS_NAME}.tfstate"
      curl -s -L \
        --header "Authorization: Bearer ${SRC_ADMIN_TOKEN}" \
        -o "${STATE_FILE}" \
        "${STATE_URL}"

      # Upload state to destination
      # Create a state version. The API expects the state file content
      # to be base64-encoded and the serial/lineage to match the state file.
      SERIAL=$(jq '.serial' "${STATE_FILE}")
      LINEAGE=$(jq -r '.lineage' "${STATE_FILE}")
      MD5=$(md5sum "${STATE_FILE}" | cut -d' ' -f1)
      STATE_B64=$(base64 -w 0 "${STATE_FILE}")

      STATE_PAYLOAD=$(jq -n \
        --arg md5 "${MD5}" \
        --arg lineage "${LINEAGE}" \
        --arg state "${STATE_B64}" \
        --argjson serial "${SERIAL}" \
        '{
          data: {
            type: "state-versions",
            attributes: {
              serial: $serial,
              md5: $md5,
              lineage: $lineage,
              state: $state
            }
          }
        }')

      curl -s \
        --header "Authorization: Bearer ${DST_ADMIN_TOKEN}" \
        --header "Content-Type: application/vnd.api+json" \
        --request POST \
        "${DST_URL}/api/v2/workspaces/${DST_WS_ID}/state-versions" \
        --data "${STATE_PAYLOAD}"

      rm -f "${STATE_FILE}"
    fi

    # Migrate variables
    VARS=$(curl -s \
      --header "Authorization: Bearer ${SRC_ADMIN_TOKEN}" \
      "${SRC_URL}/api/v2/workspaces/${WS_ID}/vars" | \
      jq -c '.data[]')

    echo "${VARS}" | while read -r VAR; do
      VAR_KEY=$(echo "${VAR}" | jq -r '.attributes.key')
      VAR_VALUE=$(echo "${VAR}" | jq -r '.attributes.value')
      VAR_CAT=$(echo "${VAR}" | jq -r '.attributes.category')
      VAR_SENSITIVE=$(echo "${VAR}" | jq -r '.attributes.sensitive')

      # Skip sensitive variables - they cannot be read via API
      if [ "${VAR_SENSITIVE}" = "true" ]; then
        echo "    SKIP sensitive variable: ${VAR_KEY} (must be set manually)"
        continue
      fi

      VAR_PAYLOAD=$(jq -n \
        --arg key "${VAR_KEY}" \
        --arg value "${VAR_VALUE}" \
        --arg category "${VAR_CAT}" \
        '{
          data: {
            type: "vars",
            attributes: {
              key: $key,
              value: $value,
              category: $category,
              sensitive: false
            }
          }
        }')

      curl -s \
        --header "Authorization: Bearer ${DST_ADMIN_TOKEN}" \
        --header "Content-Type: application/vnd.api+json" \
        --request POST \
        "${DST_URL}/api/v2/workspaces/${DST_WS_ID}/vars" \
        --data "${VAR_PAYLOAD}" > /dev/null
    done
  done
done

echo "Migration complete. Remember to:"
echo "1. Manually set sensitive variables"
echo "2. Reconnect VCS providers"
echo "3. Recreate team assignments"
echo "4. Configure SSO/LDAP settings"
```

## Post-Migration Verification

```bash
#!/bin/bash
# verify-migration.sh

echo "=== Post-Migration Verification ==="

# Compare workspace counts
SRC_WS=$(curl -s \
  --header "Authorization: Bearer ${SRC_ADMIN_TOKEN}" \
  "${SRC_URL}/api/v2/admin/workspaces" | jq '.meta.pagination["total-count"]')

DST_WS=$(curl -s \
  --header "Authorization: Bearer ${DST_ADMIN_TOKEN}" \
  "${DST_URL}/api/v2/admin/workspaces" | jq '.meta.pagination["total-count"]')

echo "Workspaces - Source: ${SRC_WS}, Destination: ${DST_WS}"

# Verify health check
curl -s "${DST_URL}/_health_check" | jq .

# Test login
echo "Test login at: ${DST_URL}"

# Test a plan
echo "Trigger a test plan in a non-critical workspace"

# Verify state files are accessible
echo "Check state in a few workspaces via UI or API"
```

## Rollback Plan

If the migration fails, have a clear rollback:

```bash
# Rollback steps:
# 1. Switch DNS back to the source TFE
# 2. Re-enable user/API access and VCS webhooks on source
# 3. Start the source TFE instance
# 4. Verify source is healthy
# 5. Investigate what went wrong with the migration
```

## Summary

Migrating between TFE deployments requires careful planning around three data stores: the database, object storage, and configuration. The database migration approach (Strategy 1) preserves everything and is fastest for large installations. The API-based approach (Strategy 2) gives you a clean slate but requires manual handling of sensitive variables and loses run history. Whichever approach you choose, plan for a maintenance window, have a tested rollback procedure, and verify every aspect of the new deployment before decommissioning the old one.
