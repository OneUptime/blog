# How to Assign and Update Azure Blueprint Assignments Across Subscriptions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Blueprints, Governance, Subscriptions, Compliance, Automation, Enterprise

Description: Learn how to assign Azure Blueprints to multiple subscriptions, update assignments when blueprint versions change, and automate the process at scale.

---

Creating an Azure Blueprint definition is only half the story. The real work is assigning it consistently across your subscriptions and keeping those assignments updated as your governance requirements evolve. When you have dozens or hundreds of subscriptions, manually assigning and updating Blueprints through the portal is not viable. You need automation.

In this post, I will cover how to assign Blueprints to subscriptions, how to update assignments when new versions are published, how to handle assignment failures, and how to automate the entire lifecycle at scale.

## Blueprint Assignment Basics

A Blueprint assignment is the link between a published Blueprint version and a specific subscription. When you create an assignment, Azure deploys all the artifacts defined in the Blueprint: policies get assigned, RBAC roles get created, resource groups get provisioned, and ARM templates get deployed.

Each assignment includes:
- A reference to a specific Blueprint version
- Parameter values for the Blueprint
- Resource group configurations (names and locations)
- Lock settings
- A managed identity (system-assigned or user-assigned) that performs the deployment

## Assigning a Blueprint to a Single Subscription

### Through the Portal

1. Go to "Blueprints" in the Azure portal
2. Click on your published Blueprint definition
3. Click "Assign blueprint"
4. Select the target subscription
5. Fill in the parameters
6. Configure resource groups
7. Choose the lock setting
8. Click Assign

### Through the REST API

```bash
# Assign a blueprint to a subscription
# The assignment name must be unique within the subscription
az rest --method put \
  --url "https://management.azure.com/subscriptions/<subscription-id>/providers/Microsoft.Blueprint/blueprintAssignments/baseline-v1?api-version=2018-11-01-preview" \
  --body '{
    "identity": {
      "type": "SystemAssigned"
    },
    "location": "eastus",
    "properties": {
      "blueprintId": "/providers/Microsoft.Management/managementGroups/Workloads/providers/Microsoft.Blueprint/blueprints/compliant-subscription/versions/1.0.0",
      "parameters": {
        "organizationName": { "value": "engineering" },
        "environment": { "value": "production" },
        "allowedLocations": { "value": ["eastus", "eastus2", "westus2"] }
      },
      "resourceGroups": {
        "rg-networking": {
          "name": "eng-rg-networking-prod",
          "location": "eastus"
        },
        "rg-monitoring": {
          "name": "eng-rg-monitoring-prod",
          "location": "eastus"
        }
      },
      "locks": {
        "mode": "AllResourcesDoNotDelete"
      }
    }
  }'
```

## Assigning a Blueprint to Multiple Subscriptions

For organizations with many subscriptions, you need to script the assignment process. Here is a practical approach using a configuration file.

### Create a Configuration File

Define your subscription assignments in a JSON file:

```json
{
  "blueprintId": "/providers/Microsoft.Management/managementGroups/Workloads/providers/Microsoft.Blueprint/blueprints/compliant-subscription/versions/1.0.0",
  "assignments": [
    {
      "subscriptionId": "11111111-1111-1111-1111-111111111111",
      "assignmentName": "baseline-sales-prod",
      "parameters": {
        "organizationName": "sales",
        "environment": "production",
        "allowedLocations": ["eastus", "westus2"]
      }
    },
    {
      "subscriptionId": "22222222-2222-2222-2222-222222222222",
      "assignmentName": "baseline-eng-prod",
      "parameters": {
        "organizationName": "engineering",
        "environment": "production",
        "allowedLocations": ["eastus", "eastus2"]
      }
    },
    {
      "subscriptionId": "33333333-3333-3333-3333-333333333333",
      "assignmentName": "baseline-eng-dev",
      "parameters": {
        "organizationName": "engineering",
        "environment": "dev",
        "allowedLocations": ["eastus"]
      }
    }
  ]
}
```

### Script the Bulk Assignment

```bash
#!/bin/bash
# Assign a blueprint to multiple subscriptions from a configuration file
# Usage: ./assign-blueprints.sh assignments.json

CONFIG_FILE=$1
BLUEPRINT_ID=$(jq -r '.blueprintId' "$CONFIG_FILE")

# Get the number of assignments
ASSIGNMENT_COUNT=$(jq '.assignments | length' "$CONFIG_FILE")

echo "Blueprint: $BLUEPRINT_ID"
echo "Assignments to process: $ASSIGNMENT_COUNT"
echo "---"

for i in $(seq 0 $((ASSIGNMENT_COUNT - 1))); do
    # Extract assignment details
    SUB_ID=$(jq -r ".assignments[$i].subscriptionId" "$CONFIG_FILE")
    ASSIGNMENT_NAME=$(jq -r ".assignments[$i].assignmentName" "$CONFIG_FILE")
    ORG_NAME=$(jq -r ".assignments[$i].parameters.organizationName" "$CONFIG_FILE")
    ENV=$(jq -r ".assignments[$i].parameters.environment" "$CONFIG_FILE")
    LOCATIONS=$(jq -c ".assignments[$i].parameters.allowedLocations" "$CONFIG_FILE")

    echo "Assigning to subscription: $SUB_ID ($ASSIGNMENT_NAME)"

    # Build the assignment body
    BODY=$(cat <<EOF
{
  "identity": {"type": "SystemAssigned"},
  "location": "eastus",
  "properties": {
    "blueprintId": "$BLUEPRINT_ID",
    "parameters": {
      "organizationName": {"value": "$ORG_NAME"},
      "environment": {"value": "$ENV"},
      "allowedLocations": {"value": $LOCATIONS}
    },
    "resourceGroups": {
      "rg-networking": {
        "name": "${ORG_NAME}-rg-networking-${ENV}",
        "location": "eastus"
      },
      "rg-monitoring": {
        "name": "${ORG_NAME}-rg-monitoring-${ENV}",
        "location": "eastus"
      }
    },
    "locks": {"mode": "AllResourcesDoNotDelete"}
  }
}
EOF
)

    # Create the assignment
    az rest --method put \
      --url "https://management.azure.com/subscriptions/$SUB_ID/providers/Microsoft.Blueprint/blueprintAssignments/$ASSIGNMENT_NAME?api-version=2018-11-01-preview" \
      --body "$BODY" 2>&1

    if [ $? -eq 0 ]; then
        echo "  Assignment created successfully"
    else
        echo "  FAILED - check permissions and subscription status"
    fi

    echo "---"
done

echo "Bulk assignment complete"
```

## Checking Assignment Status

Blueprint assignments are asynchronous. The API call returns immediately, but the actual deployment can take several minutes.

### Check Assignment Status

```bash
# Check the status of a blueprint assignment
az rest --method get \
  --url "https://management.azure.com/subscriptions/<subscription-id>/providers/Microsoft.Blueprint/blueprintAssignments/baseline-v1?api-version=2018-11-01-preview" \
  --query "{status:properties.provisioningState, blueprint:properties.blueprintId, locks:properties.locks.mode}"
```

Possible provisioning states:
- **Creating** - the assignment is being processed
- **Succeeded** - all artifacts were deployed successfully
- **Failed** - one or more artifacts failed to deploy
- **Updating** - the assignment is being updated to a new version
- **Deleting** - the assignment is being removed

### List All Assignments for a Subscription

```bash
# List all blueprint assignments on a subscription
az rest --method get \
  --url "https://management.azure.com/subscriptions/<subscription-id>/providers/Microsoft.Blueprint/blueprintAssignments?api-version=2018-11-01-preview" \
  --query "value[].{name:name, state:properties.provisioningState, blueprint:properties.blueprintId}" \
  --output table
```

## Updating Assignments to a New Blueprint Version

When you publish a new Blueprint version (e.g., 1.1.0 with updated policies), you need to update existing assignments.

### Update a Single Assignment

```bash
# Update an existing assignment to use a new blueprint version
# You must include all parameters again, even if they haven't changed
az rest --method put \
  --url "https://management.azure.com/subscriptions/<subscription-id>/providers/Microsoft.Blueprint/blueprintAssignments/baseline-v1?api-version=2018-11-01-preview" \
  --body '{
    "identity": {
      "type": "SystemAssigned"
    },
    "location": "eastus",
    "properties": {
      "blueprintId": "/providers/Microsoft.Management/managementGroups/Workloads/providers/Microsoft.Blueprint/blueprints/compliant-subscription/versions/1.1.0",
      "parameters": {
        "organizationName": { "value": "engineering" },
        "environment": { "value": "production" },
        "allowedLocations": { "value": ["eastus", "eastus2", "westus2"] }
      },
      "resourceGroups": {
        "rg-networking": {
          "name": "eng-rg-networking-prod",
          "location": "eastus"
        },
        "rg-monitoring": {
          "name": "eng-rg-monitoring-prod",
          "location": "eastus"
        }
      },
      "locks": {
        "mode": "AllResourcesDoNotDelete"
      }
    }
  }'
```

### Bulk Update Assignments

To update all assignments across multiple subscriptions, modify the configuration file with the new version and rerun the assignment script:

```bash
# Update the configuration file to reference the new version
# Then rerun the assignment script
jq '.blueprintId = "/providers/Microsoft.Management/managementGroups/Workloads/providers/Microsoft.Blueprint/blueprints/compliant-subscription/versions/1.1.0"' \
  assignments.json > assignments-v1.1.json

./assign-blueprints.sh assignments-v1.1.json
```

Since the assignment names are the same, the API call updates the existing assignments rather than creating new ones.

## Rolling Out Updates Gradually

For risk-sensitive updates, roll out the new Blueprint version gradually:

### Phase 1: Sandbox Subscriptions

Update sandbox subscription assignments first and monitor for issues.

```bash
# Update sandbox assignments only
az rest --method put \
  --url "https://management.azure.com/subscriptions/<sandbox-sub-id>/providers/Microsoft.Blueprint/blueprintAssignments/baseline-sandbox?api-version=2018-11-01-preview" \
  --body '{ ... new version ... }'
```

### Phase 2: Non-Production Subscriptions

After validating in sandbox (give it 24-48 hours), update non-production subscriptions.

### Phase 3: Production Subscriptions

After validating in non-production, update production subscriptions.

This phased approach catches issues before they affect production.

## Handling Failed Assignments

### Diagnosing Failures

When an assignment fails, check the assignment status for error details:

```bash
# Get detailed assignment status including errors
az rest --method get \
  --url "https://management.azure.com/subscriptions/<subscription-id>/providers/Microsoft.Blueprint/blueprintAssignments/baseline-v1?api-version=2018-11-01-preview" \
  --query "properties.status"
```

Common failure reasons:

**Permission errors**: The managed identity created by the assignment does not have sufficient permissions. The identity needs Owner role on the subscription to deploy all artifact types (policies, RBAC, resource groups, and ARM templates).

**Template deployment failures**: An ARM template artifact fails because of resource naming conflicts, quota limits, or unsupported features in the target region.

**Policy conflicts**: A new policy in the Blueprint conflicts with an existing policy already assigned to the subscription.

### Fixing and Retrying

After fixing the underlying issue, simply re-PUT the assignment. Azure will retry deploying the failed artifacts.

```bash
# Retry by re-submitting the same assignment
# Azure will attempt to deploy any failed artifacts
az rest --method put \
  --url "https://management.azure.com/subscriptions/<subscription-id>/providers/Microsoft.Blueprint/blueprintAssignments/baseline-v1?api-version=2018-11-01-preview" \
  --body '{ ... same body as before ... }'
```

## Automating with CI/CD

For fully automated Blueprint lifecycle management, integrate with your CI/CD pipeline:

```yaml
# GitHub Actions workflow for Blueprint assignment updates
name: Update Blueprint Assignments

on:
  workflow_dispatch:
    inputs:
      blueprintVersion:
        description: 'Blueprint version to deploy'
        required: true
        default: '1.0.0'
      targetEnvironment:
        description: 'Target environment (sandbox, non-production, production)'
        required: true
        type: choice
        options:
          - sandbox
          - non-production
          - production

jobs:
  update-assignments:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.targetEnvironment }}
    steps:
      - uses: actions/checkout@v4

      - uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Update Blueprint Assignments
        run: |
          # Read subscription list for the target environment
          SUBS=$(jq -r ".environments[\"${{ github.event.inputs.targetEnvironment }}\"][]" subscriptions.json)

          for SUB_ID in $SUBS; do
            echo "Updating assignment for subscription: $SUB_ID"
            # Update each assignment using the assignment script
            ./scripts/assign-blueprint.sh "$SUB_ID" "${{ github.event.inputs.blueprintVersion }}"
          done

      - name: Verify Assignments
        run: |
          # Wait for assignments to complete and check status
          sleep 120
          SUBS=$(jq -r ".environments[\"${{ github.event.inputs.targetEnvironment }}\"][]" subscriptions.json)

          ALL_SUCCEEDED=true
          for SUB_ID in $SUBS; do
            STATUS=$(az rest --method get \
              --url "https://management.azure.com/subscriptions/$SUB_ID/providers/Microsoft.Blueprint/blueprintAssignments/baseline?api-version=2018-11-01-preview" \
              --query "properties.provisioningState" -o tsv)

            echo "Subscription $SUB_ID: $STATUS"
            if [ "$STATUS" != "Succeeded" ]; then
              ALL_SUCCEEDED=false
            fi
          done

          if [ "$ALL_SUCCEEDED" = false ]; then
            echo "Some assignments failed. Check the Azure portal for details."
            exit 1
          fi
```

## Monitoring Assignment Compliance

After assignments are in place, monitor ongoing compliance:

```bash
# Check all blueprint assignments across a management group
# This helps identify assignments that have drifted or failed
for SUB_ID in $(az account list --query "[].id" -o tsv); do
    ASSIGNMENTS=$(az rest --method get \
      --url "https://management.azure.com/subscriptions/$SUB_ID/providers/Microsoft.Blueprint/blueprintAssignments?api-version=2018-11-01-preview" \
      --query "value[].{name:name, state:properties.provisioningState, version:properties.blueprintId}" -o json 2>/dev/null)

    if [ "$(echo $ASSIGNMENTS | jq 'length')" -gt 0 ]; then
        echo "Subscription: $SUB_ID"
        echo "$ASSIGNMENTS" | jq -r '.[] | "  \(.name): \(.state)"'
    fi
done
```

## Best Practices for Managing Assignments at Scale

1. **Use a configuration file as the source of truth.** Keep a JSON or YAML file in source control that defines which subscriptions get which Blueprint versions with which parameters. This is your single source of truth for governance configuration.

2. **Automate everything.** Manual assignments drift. Use CI/CD pipelines to ensure every subscription gets the right Blueprint version with the right parameters.

3. **Version your Blueprints semantically.** Use major versions for breaking changes (new required parameters, removed artifacts), minor versions for additions, and patch versions for fixes.

4. **Roll out gradually.** Never update all production assignments at once. Use the sandbox, non-production, production phased approach.

5. **Monitor assignment status regularly.** Set up a scheduled job that checks all assignments and alerts if any are in a failed state.

6. **Document assignment parameters.** For each subscription, document why specific parameter values were chosen (especially for allowed locations and organization names).

## Wrapping Up

Managing Azure Blueprint assignments across many subscriptions requires automation and a clear process. The combination of a configuration file as the source of truth, a bulk assignment script, phased rollouts, and CI/CD integration gives you a scalable, repeatable governance deployment process. Start by assigning your Blueprint to a few subscriptions manually to validate the artifacts, then build out the automation as you scale to more subscriptions.
