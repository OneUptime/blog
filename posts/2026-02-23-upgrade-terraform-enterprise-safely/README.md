# How to Upgrade Terraform Enterprise Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, Upgrade, Maintenance, DevOps, Operations

Description: A step-by-step guide to safely upgrading Terraform Enterprise, covering pre-upgrade checks, backup procedures, upgrade execution, and rollback planning.

---

Upgrading Terraform Enterprise is one of those tasks that makes platform teams nervous - and rightfully so. TFE is a critical piece of infrastructure that manages your entire cloud estate. A botched upgrade can block every team that depends on Terraform. But upgrades are necessary for security patches, new features, and continued support.

This guide provides a repeatable, safe upgrade process that minimizes risk and gives you a clear rollback path if something goes wrong.

## Understanding TFE Release Cadence

HashiCorp releases new versions of Terraform Enterprise regularly. Each release includes a changelog that describes new features, bug fixes, and breaking changes. Before upgrading, always read the release notes for every version between your current version and your target version.

```bash
# Check your current TFE version
curl -s https://tfe.example.com/api/v2/admin/general-settings \
  --header "Authorization: Bearer $TFE_ADMIN_TOKEN" | jq '.data.attributes."app-version"'

# Or check via the container image tag
docker inspect hashicorp/terraform-enterprise:latest --format '{{.Config.Labels}}' | grep version
```

## Pre-Upgrade Checklist

Run through this checklist before every upgrade:

### 1. Read the Release Notes

```bash
# Check the HashiCorp releases page for TFE
# https://developer.hashicorp.com/terraform/enterprise/releases
# Look for:
# - Breaking changes
# - Deprecations
# - New prerequisites (e.g., minimum PostgreSQL version)
# - Required configuration changes
```

### 2. Verify Current Health

```bash
# Check TFE health endpoint
curl -s https://tfe.example.com/_health_check | jq .

# Verify no runs are currently in progress
curl -s \
  --header "Authorization: Bearer $TFE_ADMIN_TOKEN" \
  "https://tfe.example.com/api/v2/admin/runs?filter[status]=planning,applying" | \
  jq '.meta.pagination["total-count"]'

# Check system resources
docker stats --no-stream tfe
df -h /var/lib/docker
free -h
```

### 3. Create Backups

```bash
# Full database backup
PGPASSWORD="${DB_PASSWORD}" pg_dump \
  -h "${DB_HOST}" \
  -U "${DB_USER}" \
  -d tfe \
  --format=custom \
  --compress=9 \
  --file="/opt/tfe-backups/pre-upgrade-$(date +%Y%m%d).dump"

# Snapshot RDS if using AWS
aws rds create-db-snapshot \
  --db-instance-identifier tfe-postgres \
  --db-snapshot-identifier "tfe-pre-upgrade-$(date +%Y%m%d)"

# Back up the TFE configuration
cp -r /opt/tfe /opt/tfe-backup-$(date +%Y%m%d)

# Back up Docker Compose file and env
cp /opt/tfe/docker-compose.yml /opt/tfe-backups/
cp /opt/tfe/.env /opt/tfe-backups/
```

### 4. Notify Users

```bash
# Use the TFE API to check active users in the last 24 hours
# Then send a notification through your team's communication channel

# Create a maintenance window banner (if your version supports it)
curl -s \
  --header "Authorization: Bearer $TFE_ADMIN_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  https://tfe.example.com/api/v2/admin/general-settings \
  --data '{
    "data": {
      "type": "general-settings",
      "attributes": {
        "maintenance-mode": true
      }
    }
  }'
```

## Performing the Upgrade

### Docker Compose Deployment

```bash
# Step 1: Pull the new image
docker pull images.releases.hashicorp.com/hashicorp/terraform-enterprise:v202402-1

# Step 2: Stop the current instance gracefully
# Wait for any active runs to complete first
cd /opt/tfe
docker compose down

# Step 3: Update the image tag in docker-compose.yml
# Change the image line to the new version
sed -i 's|terraform-enterprise:.*|terraform-enterprise:v202402-1|' docker-compose.yml

# Step 4: Start TFE with the new version
docker compose up -d

# Step 5: Monitor the startup logs
docker compose logs -f tfe
```

### Kubernetes / Helm Deployment

```bash
# Step 1: Update the Helm values
# Edit values.yaml to set the new image tag
# image:
#   tag: v202402-1

# Step 2: Run the Helm upgrade
helm upgrade tfe hashicorp/terraform-enterprise \
  --namespace tfe \
  --values values.yaml \
  --timeout 15m \
  --wait

# Step 3: Monitor the rollout
kubectl -n tfe rollout status deployment/tfe

# Step 4: Check pod logs
kubectl -n tfe logs -f deployment/tfe --tail=100
```

## Post-Upgrade Verification

```bash
# 1. Check the health endpoint
curl -s https://tfe.example.com/_health_check | jq .

# 2. Verify the version
curl -s https://tfe.example.com/api/v2/admin/general-settings \
  --header "Authorization: Bearer $TFE_ADMIN_TOKEN" | jq '.data.attributes."app-version"'

# 3. Test login (both SSO and local admin)
# Open browser and log in

# 4. Test a plan operation
# Trigger a plan in a test workspace
curl -s \
  --header "Authorization: Bearer $TFE_USER_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "https://tfe.example.com/api/v2/runs" \
  --data '{
    "data": {
      "type": "runs",
      "attributes": {
        "message": "Post-upgrade verification run",
        "is-destroy": false
      },
      "relationships": {
        "workspace": {
          "data": {
            "type": "workspaces",
            "id": "ws-testworkspaceid"
          }
        }
      }
    }
  }'

# 5. Check that VCS integration works
# Make a commit to a VCS-connected workspace and verify the run triggers

# 6. Verify Sentinel policies execute
# If using Sentinel, confirm policy checks pass on a test run

# 7. Check agent pools (if using custom agents)
curl -s \
  --header "Authorization: Bearer $TFE_ORG_TOKEN" \
  "https://tfe.example.com/api/v2/organizations/my-org/agent-pools" | \
  jq '.data[].attributes.name'
```

## Rollback Procedure

If the upgrade fails or causes issues, roll back quickly:

### Docker Compose Rollback

```bash
# Step 1: Stop the failed instance
cd /opt/tfe
docker compose down

# Step 2: Restore the previous configuration
cp /opt/tfe-backups/docker-compose.yml /opt/tfe/docker-compose.yml
cp /opt/tfe-backups/.env /opt/tfe/.env

# Step 3: Restore the database if schema changes were applied
PGPASSWORD="${DB_PASSWORD}" pg_restore \
  -h "${DB_HOST}" \
  -U "${DB_USER}" \
  -d tfe \
  --clean \
  --if-exists \
  "/opt/tfe-backups/pre-upgrade-$(date +%Y%m%d).dump"

# Step 4: Start TFE with the previous version
docker compose up -d

# Step 5: Verify the rollback
curl -s https://tfe.example.com/_health_check | jq .
```

### Kubernetes Rollback

```bash
# Rollback to the previous Helm release
helm rollback tfe --namespace tfe

# Or rollback to a specific revision
helm history tfe --namespace tfe
helm rollback tfe 3 --namespace tfe

# Monitor the rollback
kubectl -n tfe rollout status deployment/tfe
```

## Upgrade Tips for Large Environments

- **Upgrade during low-traffic periods**: Check run volume patterns and pick a quiet time.
- **Drain the run queue**: Before stopping TFE, wait for active runs to complete. New runs will queue and execute after the upgrade.
- **Test in staging first**: If you have a non-production TFE instance, upgrade it first and let it run for a day or two before upgrading production.
- **Do not skip versions**: If you are multiple versions behind, check if there are required intermediate upgrades. Some database migrations cannot be skipped.
- **Monitor for 24 hours**: Watch TFE closely for the first day after an upgrade. Some issues only surface when specific features are used.

## Automating Upgrade Notifications

Set up monitoring to track your TFE version against the latest available:

```bash
#!/bin/bash
# check-tfe-version.sh - Alert when a new TFE version is available

CURRENT=$(curl -s https://tfe.example.com/api/v2/admin/general-settings \
  --header "Authorization: Bearer $TFE_ADMIN_TOKEN" | jq -r '.data.attributes."app-version"')

# Compare with latest available (check HashiCorp releases page)
echo "Current TFE version: ${CURRENT}"
echo "Check https://developer.hashicorp.com/terraform/enterprise/releases for updates"
```

## Summary

Safe TFE upgrades follow a predictable pattern: read the release notes, verify system health, back up everything, upgrade during a maintenance window, verify functionality, and have a tested rollback plan. The key is preparation - most upgrade failures come from skipping the pre-upgrade checks or not having a working backup. Take the time to do it right, and upgrades become routine instead of stressful.

For backup details, see [How to Handle Terraform Enterprise Backup and Recovery](https://oneuptime.com/blog/post/2026-02-23-terraform-enterprise-backup-and-recovery/view).
