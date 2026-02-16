# How to Use Azure CLI Scripting to Automate Resource Group Management and Tagging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure CLI, Automation, Resource Groups, Tagging, Azure, DevOps, Cloud Management

Description: Automate Azure resource group creation, management, and tagging with Azure CLI scripts for consistent and efficient cloud operations.

---

Managing Azure resources manually through the portal works when you have a handful of resources, but it does not scale. When you have dozens of resource groups across multiple subscriptions, each needing consistent tags, naming conventions, and configurations, manual management becomes error-prone and time-consuming.

The Azure CLI is the tool for automating these operations. It is available on every platform, works well in scripts and pipelines, and covers the full Azure API surface. In this post, I will walk through practical scripts for resource group management, tagging strategies, bulk operations, and pipeline integration.

## Azure CLI Basics

If you have not used the Azure CLI before, here is the quick setup.

```bash
# Install Azure CLI (macOS)
brew install azure-cli

# Install Azure CLI (Linux)
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Log in to Azure
az login

# Set the default subscription
az account set --subscription "My Subscription Name"

# Verify your context
az account show --output table
```

## Creating Resource Groups

Resource groups are containers for Azure resources. Every resource in Azure lives in a resource group, making them the fundamental organizational unit.

The following script creates a resource group with a standardized naming convention and tags.

```bash
#!/bin/bash
# create-resource-group.sh - Create a resource group with standard tags

# Parameters
ENVIRONMENT="${1:-dev}"
PROJECT="${2:-myapp}"
LOCATION="${3:-eastus2}"
OWNER="${4:-platform-team}"

# Naming convention: rg-<project>-<environment>-<location>
RG_NAME="rg-${PROJECT}-${ENVIRONMENT}-${LOCATION}"

# Standard tags
CREATED_DATE=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

# Create the resource group with tags
az group create \
  --name "$RG_NAME" \
  --location "$LOCATION" \
  --tags \
    environment="$ENVIRONMENT" \
    project="$PROJECT" \
    owner="$OWNER" \
    createdDate="$CREATED_DATE" \
    managedBy="azure-cli" \
    costCenter="engineering"

echo "Created resource group: $RG_NAME"
```

Run it for different environments.

```bash
# Create resource groups for all environments
./create-resource-group.sh dev myapp eastus2 platform-team
./create-resource-group.sh staging myapp eastus2 platform-team
./create-resource-group.sh prod myapp eastus2 platform-team
```

## Tagging Strategy

Tags are key-value pairs attached to Azure resources. They are critical for:

- **Cost management**: Track spending by project, team, or environment
- **Operations**: Identify resource owners and maintenance windows
- **Compliance**: Mark resources with data classification and regulatory requirements
- **Automation**: Target resources for automated actions based on tags

Here is the tagging schema I use across organizations.

```bash
# Standard tag schema
# Required tags (every resource must have these)
TAGS=(
  "environment=prod"           # dev, staging, prod
  "project=myapp"              # Project or application name
  "owner=platform-team"        # Team responsible for the resource
  "costCenter=CC-1234"         # Financial cost center
)

# Recommended tags (should have where applicable)
TAGS+=(
  "createdDate=2026-02-16"    # When the resource was created
  "createdBy=user@company.com" # Who created it
  "managedBy=terraform"        # How it is managed (terraform, bicep, manual)
  "dataClassification=internal" # public, internal, confidential, restricted
)

# Optional tags
TAGS+=(
  "maintenanceWindow=sun-0200-0600"  # When maintenance is allowed
  "autoShutdown=true"                 # Whether to auto-shutdown in non-prod
  "expiryDate=2026-12-31"            # When the resource should be reviewed/deleted
)
```

## Bulk Tagging Operations

### Tag All Resources in a Resource Group

When you apply tags to a resource group, the tags do not automatically propagate to the resources inside it. You need to explicitly tag each resource.

This script copies resource group tags to all resources within it.

```bash
#!/bin/bash
# propagate-tags.sh - Copy resource group tags to all resources in the group

RG_NAME="${1:?Usage: propagate-tags.sh <resource-group-name>}"

echo "Propagating tags from resource group: $RG_NAME"

# Get the resource group tags
RG_TAGS=$(az group show --name "$RG_NAME" --query "tags" -o json)

if [ "$RG_TAGS" = "null" ] || [ "$RG_TAGS" = "{}" ]; then
  echo "No tags found on resource group $RG_NAME"
  exit 0
fi

echo "Resource group tags: $RG_TAGS"

# Get all resource IDs in the group
RESOURCE_IDS=$(az resource list \
  --resource-group "$RG_NAME" \
  --query "[].id" \
  -o tsv)

# Counter for progress tracking
TOTAL=$(echo "$RESOURCE_IDS" | wc -l)
CURRENT=0

# Apply tags to each resource
while IFS= read -r RESOURCE_ID; do
  CURRENT=$((CURRENT + 1))

  if [ -z "$RESOURCE_ID" ]; then
    continue
  fi

  RESOURCE_NAME=$(echo "$RESOURCE_ID" | awk -F'/' '{print $NF}')
  echo "[$CURRENT/$TOTAL] Tagging: $RESOURCE_NAME"

  # Merge tags (preserve existing resource tags, add/update from RG)
  az resource tag \
    --ids "$RESOURCE_ID" \
    --tags $(echo "$RG_TAGS" | jq -r 'to_entries | map("\(.key)=\(.value)") | .[]') \
    --is-incremental \
    --output none 2>/dev/null || echo "  Warning: Could not tag $RESOURCE_NAME"

done <<< "$RESOURCE_IDS"

echo "Done. Tagged $TOTAL resources."
```

### Find Resources Missing Required Tags

This script audits resources for missing tags and generates a report.

```bash
#!/bin/bash
# audit-tags.sh - Find resources missing required tags

# Define required tags
REQUIRED_TAGS=("environment" "project" "owner" "costCenter")

echo "Auditing resources for missing tags..."
echo "Required tags: ${REQUIRED_TAGS[*]}"
echo ""

# Get all resource groups in the subscription
RESOURCE_GROUPS=$(az group list --query "[].name" -o tsv)

ISSUES=0

while IFS= read -r RG; do
  # Get resource group tags
  TAGS=$(az group show --name "$RG" --query "tags" -o json 2>/dev/null)

  for TAG in "${REQUIRED_TAGS[@]}"; do
    HAS_TAG=$(echo "$TAGS" | jq -r --arg t "$TAG" 'has($t)')
    if [ "$HAS_TAG" != "true" ]; then
      echo "MISSING TAG: Resource Group '$RG' is missing tag '$TAG'"
      ISSUES=$((ISSUES + 1))
    fi
  done

done <<< "$RESOURCE_GROUPS"

echo ""
if [ $ISSUES -gt 0 ]; then
  echo "Found $ISSUES tagging issues."
  exit 1
else
  echo "All resource groups have required tags."
fi
```

## Resource Group Lifecycle Management

### Listing and Filtering Resource Groups

```bash
# List all resource groups with their tags
az group list \
  --query "[].{name:name, location:location, environment:tags.environment, project:tags.project}" \
  --output table

# Find resource groups by tag
az group list \
  --tag environment=dev \
  --query "[].{name:name, location:location}" \
  --output table

# Find resource groups for a specific project
az group list \
  --tag project=myapp \
  --output table
```

### Cleaning Up Non-Production Resources

This script identifies and optionally deletes resource groups that are tagged for auto-cleanup.

```bash
#!/bin/bash
# cleanup-resources.sh - Clean up expired non-production resource groups

DRY_RUN="${1:-true}"  # Pass "false" to actually delete

echo "Scanning for expired resource groups..."
if [ "$DRY_RUN" = "true" ]; then
  echo "DRY RUN MODE - no resources will be deleted"
fi

TODAY=$(date -u '+%Y-%m-%d')

# Find resource groups with an expiry date that has passed
EXPIRED_RGS=$(az group list \
  --query "[?tags.expiryDate != null && tags.expiryDate < '$TODAY' && tags.environment != 'prod'].{name:name, expiry:tags.expiryDate, env:tags.environment}" \
  -o json)

COUNT=$(echo "$EXPIRED_RGS" | jq 'length')

if [ "$COUNT" -eq 0 ]; then
  echo "No expired resource groups found."
  exit 0
fi

echo "Found $COUNT expired resource group(s):"
echo "$EXPIRED_RGS" | jq -r '.[] | "  \(.name) (expired: \(.expiry), env: \(.env))"'

if [ "$DRY_RUN" = "false" ]; then
  echo ""
  echo "Deleting expired resource groups..."

  for RG in $(echo "$EXPIRED_RGS" | jq -r '.[].name'); do
    echo "Deleting: $RG"
    az group delete --name "$RG" --yes --no-wait
  done

  echo "Deletion initiated for $COUNT resource groups."
else
  echo ""
  echo "Run with 'false' argument to actually delete: ./cleanup-resources.sh false"
fi
```

## Resource Group Locking

Locks prevent accidental deletion or modification of critical resources.

```bash
# Add a delete lock to a production resource group
az lock create \
  --name "prevent-deletion" \
  --resource-group "rg-myapp-prod-eastus2" \
  --lock-type CanNotDelete \
  --notes "Production resource group - do not delete"

# Add a read-only lock (prevents all modifications)
az lock create \
  --name "read-only" \
  --resource-group "rg-shared-prod-eastus2" \
  --lock-type ReadOnly \
  --notes "Shared infrastructure - changes require approval"

# List locks on a resource group
az lock list \
  --resource-group "rg-myapp-prod-eastus2" \
  --output table

# Remove a lock when you need to make changes
az lock delete \
  --name "read-only" \
  --resource-group "rg-shared-prod-eastus2"
```

## Integrating with Azure Pipelines

All of these scripts can run in Azure Pipelines using the AzureCLI task.

```yaml
# azure-pipelines.yml - Resource group management pipeline
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - infra/resource-groups/**

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: AuditTags
    displayName: 'Audit Resource Tags'
    jobs:
      - job: Audit
        steps:
          - task: AzureCLI@2
            displayName: 'Run tag audit'
            inputs:
              azureSubscription: 'my-connection'
              scriptType: 'bash'
              scriptLocation: 'scriptPath'
              scriptPath: 'infra/scripts/audit-tags.sh'

  - stage: CreateResourceGroups
    displayName: 'Create/Update Resource Groups'
    dependsOn: AuditTags
    jobs:
      - job: Create
        steps:
          - task: AzureCLI@2
            displayName: 'Create resource groups'
            inputs:
              azureSubscription: 'my-connection'
              scriptType: 'bash'
              scriptLocation: 'inlineScript'
              inlineScript: |
                # Create resource groups from a configuration file
                while IFS=, read -r ENV PROJECT LOCATION OWNER; do
                  RG_NAME="rg-${PROJECT}-${ENV}-${LOCATION}"
                  echo "Creating: $RG_NAME"
                  az group create \
                    --name "$RG_NAME" \
                    --location "$LOCATION" \
                    --tags \
                      environment="$ENV" \
                      project="$PROJECT" \
                      owner="$OWNER" \
                      managedBy="pipeline" \
                    --output none
                done < infra/resource-groups/config.csv
```

## Exporting Resource Group Configuration

For disaster recovery or documentation, export your resource group configuration.

```bash
#!/bin/bash
# export-rg-config.sh - Export resource group configuration to JSON

OUTPUT_DIR="./exports"
mkdir -p "$OUTPUT_DIR"

echo "Exporting resource group configurations..."

# Export all resource groups with their details
az group list \
  --query "[].{name:name, location:location, tags:tags, id:id}" \
  -o json > "$OUTPUT_DIR/resource-groups.json"

# Export resource counts per group
for RG in $(az group list --query "[].name" -o tsv); do
  COUNT=$(az resource list --resource-group "$RG" --query "length(@)")
  echo "$RG: $COUNT resources"
done > "$OUTPUT_DIR/resource-counts.txt"

echo "Export complete. Files in $OUTPUT_DIR/"
```

## Best Practices

**Enforce naming conventions.** Use a consistent pattern like `rg-<project>-<environment>-<location>`. This makes it easy to find resource groups and apply policies.

**Tag everything.** If a resource does not have tags, it will eventually become an orphan that nobody knows who owns or whether it is safe to delete.

**Lock production resource groups.** A CanNotDelete lock takes seconds to add and prevents the catastrophic scenario of accidentally deleting a production database.

**Automate cleanup.** Non-production resources that linger waste money. Use expiry tags and cleanup scripts to keep your Azure environment tidy.

**Run tag audits regularly.** Schedule a weekly pipeline that checks for missing tags and sends notifications to the responsible teams.

**Use JMESPath queries.** The `--query` parameter in Azure CLI uses JMESPath syntax, which is powerful for filtering and shaping output. Learn the basics - it will make your scripts much more readable.

## Wrapping Up

Azure CLI scripting turns resource group management from a manual, error-prone process into an automated, consistent one. Start with a naming convention and tagging schema, then build scripts for creation, auditing, and cleanup. Run these scripts in your CI/CD pipeline for continuous governance. The investment in automation pays off quickly when you have more than a few resource groups to manage, and it scales effortlessly as your Azure footprint grows.
