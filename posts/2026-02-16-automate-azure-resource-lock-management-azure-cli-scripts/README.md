# How to Automate Azure Resource Lock Management with Azure CLI Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure CLI, Resource Locks, Automation, DevOps, Cloud Security, Scripting

Description: Automate Azure resource lock management with Azure CLI scripts to protect critical resources from accidental deletion or modification.

---

Azure resource locks are one of those features that nobody thinks about until someone accidentally deletes a production database. Locks prevent resources from being deleted or modified, adding a safety net against human error. The problem is that managing locks manually through the portal does not scale. When you have hundreds of resources across multiple subscriptions, you need automation.

Azure CLI scripts give you a straightforward way to apply, audit, and manage resource locks at scale. This post shows you how to build practical scripts for lock management that you can run in CI/CD pipelines or as scheduled tasks.

## Understanding Lock Types

Azure has two types of resource locks. A `CanNotDelete` lock prevents deletion but allows modifications. A `ReadOnly` lock prevents both deletion and any changes to the resource. ReadOnly locks are more restrictive than you might expect - they can break things like scaling operations or backup configurations because those count as modifications.

For most production resources, `CanNotDelete` is the safer choice. Use `ReadOnly` only for resources that truly should never change, like a shared Key Vault or a core networking component.

## Applying Locks to Critical Resources

Here is a script that applies delete locks to all resources matching specific criteria.

```bash
#!/bin/bash
# lock-critical-resources.sh
# Applies CanNotDelete locks to production databases, key vaults,
# and storage accounts across all resource groups

set -euo pipefail

# Configuration
SUBSCRIPTION_ID="${SUBSCRIPTION_ID:-}"
LOCK_NOTE="Protected by automated lock management - contact platform team before removal"

# Ensure we are logged in and using the right subscription
if [ -n "$SUBSCRIPTION_ID" ]; then
    az account set --subscription "$SUBSCRIPTION_ID"
fi

CURRENT_SUB=$(az account show --query "name" -o tsv)
echo "Working in subscription: $CURRENT_SUB"

# Function to apply a lock to a resource
apply_lock() {
    local resource_id="$1"
    local lock_name="$2"
    local lock_level="$3"
    local resource_name
    resource_name=$(echo "$resource_id" | awk -F'/' '{print $NF}')

    # Check if lock already exists
    existing_lock=$(az lock list \
        --resource "$resource_id" \
        --query "[?name=='$lock_name']" \
        -o tsv 2>/dev/null || true)

    if [ -z "$existing_lock" ]; then
        echo "Applying $lock_level lock to: $resource_name"
        az lock create \
            --name "$lock_name" \
            --resource "$resource_id" \
            --lock-type "$lock_level" \
            --notes "$LOCK_NOTE"
    else
        echo "Lock already exists on: $resource_name - skipping"
    fi
}

# Lock all SQL databases in production resource groups
echo "=== Locking SQL Databases ==="
sql_servers=$(az sql server list --query "[].id" -o tsv 2>/dev/null || true)
for server_id in $sql_servers; do
    # Lock the server itself
    apply_lock "$server_id" "protect-sql-server" "CanNotDelete"

    # Lock each database on the server
    server_name=$(echo "$server_id" | awk -F'/' '{print $NF}')
    rg_name=$(echo "$server_id" | awk -F'/' '{print $5}')

    databases=$(az sql db list \
        --server "$server_name" \
        --resource-group "$rg_name" \
        --query "[?name!='master'].id" -o tsv 2>/dev/null || true)

    for db_id in $databases; do
        apply_lock "$db_id" "protect-sql-database" "CanNotDelete"
    done
done

# Lock all Key Vaults
echo "=== Locking Key Vaults ==="
keyvaults=$(az keyvault list --query "[].id" -o tsv 2>/dev/null || true)
for kv_id in $keyvaults; do
    apply_lock "$kv_id" "protect-keyvault" "CanNotDelete"
done

# Lock storage accounts that contain important data
echo "=== Locking Storage Accounts ==="
storage_accounts=$(az storage account list \
    --query "[?tags.protected=='true'].id" -o tsv 2>/dev/null || true)
for sa_id in $storage_accounts; do
    apply_lock "$sa_id" "protect-storage" "CanNotDelete"
done

echo "Lock application complete."
```

The script checks for existing locks before applying new ones, making it safe to run repeatedly. The `set -euo pipefail` ensures the script exits on any error, which is critical for automation scripts.

## Auditing Lock Status

Knowing what is and is not locked is just as important as applying locks. This script generates a report.

```bash
#!/bin/bash
# audit-locks.sh
# Generates a report of all resource locks across the subscription
# and identifies critical resources that are missing locks

set -euo pipefail

OUTPUT_FILE="lock-audit-report-$(date +%Y%m%d).csv"

# CSV header
echo "ResourceGroup,ResourceName,ResourceType,LockName,LockLevel,Notes" > "$OUTPUT_FILE"

echo "Generating lock audit report..."

# Get all locks in the subscription
locks_json=$(az lock list --query "[].{name:name, level:level, notes:notes, id:id}" -o json)

# Get all resource group level locks
resource_groups=$(az group list --query "[].name" -o tsv)
for rg in $resource_groups; do
    # Get locks at resource group level
    rg_locks=$(az lock list \
        --resource-group "$rg" \
        --query "[].{name:name, level:level, notes:notes}" \
        -o json 2>/dev/null || echo "[]")

    lock_count=$(echo "$rg_locks" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))")

    if [ "$lock_count" -gt 0 ]; then
        echo "$rg_locks" | python3 -c "
import sys, json
locks = json.load(sys.stdin)
for lock in locks:
    print(f\"$rg,ResourceGroup,Microsoft.Resources/resourceGroups,{lock['name']},{lock['level']},{lock.get('notes', '')}\")" >> "$OUTPUT_FILE"
    fi
done

echo "Report saved to: $OUTPUT_FILE"
echo ""

# Check for critical resources without locks
echo "=== Resources Missing Locks ==="

# Check SQL databases without locks
echo "Checking SQL databases..."
sql_servers=$(az sql server list --query "[].{name:name, rg:resourceGroup}" -o json 2>/dev/null || echo "[]")
echo "$sql_servers" | python3 -c "
import sys, json, subprocess
servers = json.load(sys.stdin)
for server in servers:
    result = subprocess.run(
        ['az', 'lock', 'list', '--resource-group', server['rg'],
         '--resource-name', server['name'],
         '--resource-type', 'Microsoft.Sql/servers',
         '--query', 'length(@)', '-o', 'tsv'],
        capture_output=True, text=True
    )
    count = int(result.stdout.strip() or '0')
    if count == 0:
        print(f'  WARNING: SQL Server {server[\"name\"]} in {server[\"rg\"]} has no locks')
" 2>/dev/null || true

# Check Key Vaults without locks
echo "Checking Key Vaults..."
keyvaults=$(az keyvault list --query "[].{name:name, rg:resourceGroup}" -o json 2>/dev/null || echo "[]")
echo "$keyvaults" | python3 -c "
import sys, json, subprocess
vaults = json.load(sys.stdin)
for vault in vaults:
    result = subprocess.run(
        ['az', 'lock', 'list', '--resource-group', vault['rg'],
         '--resource-name', vault['name'],
         '--resource-type', 'Microsoft.KeyVault/vaults',
         '--query', 'length(@)', '-o', 'tsv'],
        capture_output=True, text=True
    )
    count = int(result.stdout.strip() or '0')
    if count == 0:
        print(f'  WARNING: Key Vault {vault[\"name\"]} in {vault[\"rg\"]} has no locks')
" 2>/dev/null || true

echo ""
echo "Audit complete."
```

## Bulk Lock Operations with Tag-Based Targeting

Tags give you a flexible way to control which resources get locked. This script applies locks based on tag values.

```bash
#!/bin/bash
# lock-by-tags.sh
# Applies locks to resources based on their tags
# Resources tagged with lock-level=CanNotDelete or lock-level=ReadOnly

set -euo pipefail

echo "Applying locks based on resource tags..."

# Find resources tagged for CanNotDelete locks
echo "=== Applying CanNotDelete Locks ==="
az resource list \
    --tag "lock-level=CanNotDelete" \
    --query "[].id" -o tsv | while read -r resource_id; do

    resource_name=$(echo "$resource_id" | awk -F'/' '{print $NF}')
    echo "Locking (CanNotDelete): $resource_name"

    az lock create \
        --name "tag-based-delete-lock" \
        --resource "$resource_id" \
        --lock-type "CanNotDelete" \
        --notes "Applied automatically based on lock-level tag" \
        2>/dev/null || echo "  Failed to lock $resource_name - may already have a lock"
done

# Find resources tagged for ReadOnly locks
echo "=== Applying ReadOnly Locks ==="
az resource list \
    --tag "lock-level=ReadOnly" \
    --query "[].id" -o tsv | while read -r resource_id; do

    resource_name=$(echo "$resource_id" | awk -F'/' '{print $NF}')
    echo "Locking (ReadOnly): $resource_name"

    az lock create \
        --name "tag-based-readonly-lock" \
        --resource "$resource_id" \
        --lock-type "ReadOnly" \
        --notes "Applied automatically based on lock-level tag" \
        2>/dev/null || echo "  Failed to lock $resource_name - may already have a lock"
done

echo "Tag-based lock application complete."
```

## Temporary Lock Removal for Maintenance

Sometimes you need to temporarily remove locks for maintenance operations like scaling or configuration changes. This script removes locks, runs a maintenance command, and reapplies them.

```bash
#!/bin/bash
# maintenance-window.sh
# Temporarily removes locks from a resource group, runs maintenance,
# and reapplies locks afterward

set -euo pipefail

RESOURCE_GROUP="${1:?Usage: $0 <resource-group> <maintenance-command>}"
MAINTENANCE_CMD="${2:?Usage: $0 <resource-group> <maintenance-command>}"

echo "Starting maintenance window for resource group: $RESOURCE_GROUP"

# Save current locks to a file for restoration
LOCKS_BACKUP="locks-backup-${RESOURCE_GROUP}-$(date +%s).json"
az lock list --resource-group "$RESOURCE_GROUP" -o json > "$LOCKS_BACKUP"

lock_count=$(python3 -c "import json; print(len(json.load(open('$LOCKS_BACKUP'))))")
echo "Found $lock_count locks to temporarily remove"

# Remove all locks in the resource group
az lock list --resource-group "$RESOURCE_GROUP" \
    --query "[].name" -o tsv | while read -r lock_name; do
    echo "Removing lock: $lock_name"
    az lock delete --name "$lock_name" --resource-group "$RESOURCE_GROUP"
done

echo "All locks removed. Running maintenance command..."

# Run the maintenance command
eval "$MAINTENANCE_CMD"
maintenance_exit_code=$?

echo "Maintenance command finished with exit code: $maintenance_exit_code"

# Restore locks from backup
echo "Restoring locks..."
python3 -c "
import json, subprocess
locks = json.load(open('$LOCKS_BACKUP'))
for lock in locks:
    name = lock['name']
    level = lock['level']
    notes = lock.get('notes', 'Restored after maintenance')
    print(f'Restoring lock: {name} ({level})')
    subprocess.run([
        'az', 'lock', 'create',
        '--name', name,
        '--resource-group', '$RESOURCE_GROUP',
        '--lock-type', level,
        '--notes', notes
    ])
"

# Clean up backup file
rm -f "$LOCKS_BACKUP"

echo "Maintenance window complete. All locks restored."
exit $maintenance_exit_code
```

## Scheduling Lock Audits

Use a cron job or Azure DevOps scheduled pipeline to run the audit script regularly.

```yaml
# azure-pipelines.yml
# Scheduled pipeline that audits resource locks weekly
trigger: none

schedules:
  - cron: "0 8 * * 1"
    displayName: "Weekly Lock Audit"
    branches:
      include:
        - main

pool:
  vmImage: "ubuntu-latest"

steps:
  - task: AzureCLI@2
    displayName: "Run Lock Audit"
    inputs:
      azureSubscription: "production-connection"
      scriptType: "bash"
      scriptPath: "scripts/audit-locks.sh"

  - task: PublishBuildArtifacts@1
    displayName: "Publish Audit Report"
    inputs:
      pathToPublish: "lock-audit-report-*.csv"
      artifactName: "lock-audit"
```

## Best Practices

A few lessons from working with locks in production environments. First, always use `CanNotDelete` over `ReadOnly` unless you have a specific reason. ReadOnly locks interfere with more operations than you would expect, including things like generating SAS tokens on storage accounts.

Second, document why a lock exists in the notes field. Six months from now, someone will want to remove a lock and having context helps them make the right decision.

Third, apply locks at the resource group level for groups that contain only production resources. This is simpler than locking individual resources and catches new resources automatically.

Fourth, build lock removal into your deployment pipelines. If your deployment needs to modify locked resources, the pipeline should remove the lock, make the change, and reapply it, all in a single automated flow.

Finally, audit regularly. Locks only work if they are actually in place. A weekly audit report that flags critical resources without locks keeps your safety net intact.

Resource locks are a simple concept, but automating their management with Azure CLI scripts turns them from a best practice people forget about into a systematic defense against accidental destruction.
