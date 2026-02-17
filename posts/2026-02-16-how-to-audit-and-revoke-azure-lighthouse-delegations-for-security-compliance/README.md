# How to Audit and Revoke Azure Lighthouse Delegations for Security Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Lighthouse, Security, Compliance, Auditing, Delegation, Governance

Description: Learn how to audit existing Azure Lighthouse delegations and revoke them when needed to maintain security compliance across your Azure environment.

---

Azure Lighthouse delegations are powerful. They let external tenants manage your resources without creating guest accounts or sharing credentials. But with that power comes responsibility. If you are not regularly auditing who has access to your resources and through what delegations, you have a blind spot in your security posture.

In this guide, I will show you how to discover all active Lighthouse delegations in your environment, audit what access they grant, set up alerts for delegation changes, and revoke delegations when they are no longer needed or when a security concern arises.

## Understanding the Delegation Model

Before we get into the auditing tools, let me quickly review how Lighthouse delegations are structured. Each delegation consists of two parts:

1. **Registration Definition** - Describes the managing tenant, the roles being granted, and the principals who receive those roles
2. **Registration Assignment** - Links a registration definition to a specific scope (subscription or resource group)

When you audit delegations, you need to look at both of these to get the full picture.

## Discovering Active Delegations

The first step in any audit is discovering what delegations currently exist. There are several ways to do this.

### Using the Azure Portal

Navigate to the Azure Lighthouse blade and click on "Service providers." This shows all active delegations across your subscriptions. You can see which managing tenant has access, what roles they have, and what scope the delegation covers.

### Using Azure CLI

For a more programmatic approach, use the Azure CLI to list all delegations:

```bash
# List all registration definitions in a subscription
# This shows what access has been defined
az managedservices definition list \
  --subscription "your-subscription-id" \
  --output table

# List all registration assignments in a subscription
# This shows what delegations are actually active
az managedservices assignment list \
  --subscription "your-subscription-id" \
  --output table
```

### Using PowerShell for a Comprehensive Audit

For a thorough audit across all subscriptions, this PowerShell script collects delegation information:

```powershell
# Collect all Lighthouse delegations across all subscriptions
$allDelegations = @()

# Get every subscription in the current tenant
$subscriptions = Get-AzSubscription

foreach ($sub in $subscriptions) {
    Set-AzContext -SubscriptionId $sub.Id | Out-Null

    # Get registration definitions (what access is defined)
    $definitions = Get-AzManagedServicesDefinition

    # Get registration assignments (what is actively delegated)
    $assignments = Get-AzManagedServicesAssignment

    foreach ($assignment in $assignments) {
        $defId = $assignment.Properties.RegistrationDefinitionId
        $def = $definitions | Where-Object { $_.Id -eq $defId }

        # Build a delegation record for the audit report
        $record = [PSCustomObject]@{
            SubscriptionName  = $sub.Name
            SubscriptionId    = $sub.Id
            ManagingTenantId  = $def.Properties.ManagedByTenantId
            OfferName         = $def.Properties.RegistrationDefinitionName
            Scope             = $assignment.Id
            Authorizations    = ($def.Properties.Authorizations |
                ConvertTo-Json -Compress)
        }
        $allDelegations += $record
    }
}

# Export to CSV for review
$allDelegations | Export-Csv -Path "lighthouse-audit.csv" -NoTypeInformation
Write-Output "Found $($allDelegations.Count) active delegations"
```

## Auditing What Access Delegations Grant

Finding the delegations is step one. Understanding what access they grant is step two. Each delegation contains an authorization array that maps external principals to RBAC roles.

Here is how to decode the authorizations:

```powershell
# For each delegation, expand the authorization details
foreach ($delegation in $allDelegations) {
    $auths = $delegation.Authorizations | ConvertFrom-Json

    Write-Output "=== $($delegation.OfferName) ==="
    Write-Output "Managing Tenant: $($delegation.ManagingTenantId)"
    Write-Output "Scope: $($delegation.Scope)"

    foreach ($auth in $auths) {
        # Resolve the role name from the role definition ID
        $roleName = (Get-AzRoleDefinition -Id $auth.roleDefinitionId).Name
        Write-Output "  Principal: $($auth.principalIdDisplayName)"
        Write-Output "  Role: $roleName"
        Write-Output "  ---"
    }
}
```

Pay particular attention to delegations that grant write permissions (Contributor, specific resource provider roles) versus read-only permissions (Reader). Also check for any delegations that include the Managed Services Registration Assignment Delete role, because principals with that role can remove delegations from the managing tenant side.

## Using Azure Resource Graph for Cross-Subscription Queries

Azure Resource Graph is a great tool for querying delegation information across your entire tenant at once:

```kusto
// Query all Lighthouse registration assignments across the tenant
servicehealthresources
| where type == "microsoft.managedservices/registrationassignments"
| extend managingTenantId = properties.registrationDefinition.properties.managedByTenantId
| extend offerName = properties.registrationDefinition.properties.registrationDefinitionName
| project subscriptionId, managingTenantId, offerName, properties
```

If the managed services resource type is not available in Resource Graph for your tenant, you can use the REST API directly:

```bash
# Query the management services API directly
az rest --method get \
  --url "https://management.azure.com/subscriptions/{sub-id}/providers/Microsoft.ManagedServices/registrationAssignments?api-version=2020-02-01-preview&\$expandRegistrationDefinition=true"
```

## Setting Up Alerts for Delegation Changes

A one-time audit is helpful, but continuous monitoring is what really keeps you secure. Set up Activity Log alerts that trigger when delegations are created, modified, or deleted.

```bash
# Create an action group for delegation alerts
az monitor action-group create \
  --name "LighthouseAlerts" \
  --resource-group "monitoring-rg" \
  --short-name "LHAlerts" \
  --email-receiver name="SecurityTeam" \
    email-address="security@contoso.com"

# Create an activity log alert for new delegation assignments
az monitor activity-log alert create \
  --name "LighthouseDelegationCreated" \
  --resource-group "monitoring-rg" \
  --condition category=Administrative \
    and operationName="Microsoft.ManagedServices/registrationAssignments/write" \
  --action-group "LighthouseAlerts" \
  --description "Alert when a new Lighthouse delegation is created"

# Create an alert for delegation removals
az monitor activity-log alert create \
  --name "LighthouseDelegationRemoved" \
  --resource-group "monitoring-rg" \
  --condition category=Administrative \
    and operationName="Microsoft.ManagedServices/registrationAssignments/delete" \
  --action-group "LighthouseAlerts" \
  --description "Alert when a Lighthouse delegation is removed"
```

These alerts will fire every time a delegation changes, giving your security team immediate visibility into access modifications.

## Revoking Delegations

When you need to revoke a delegation - whether because a contract ended, a security incident occurred, or you are cleaning up old delegations - you have several options.

### Revoking from the Azure Portal

Go to the Lighthouse blade, click "Service providers," find the delegation you want to remove, and click the delete icon. This is the simplest approach for one-off revocations.

### Revoking via Azure CLI

```bash
# First, find the assignment ID you want to remove
az managedservices assignment list \
  --subscription "your-subscription-id" \
  --output table

# Delete the specific assignment
az managedservices assignment delete \
  --assignment "assignment-id-here" \
  --subscription "your-subscription-id"
```

### Revoking via PowerShell at Scale

If you need to revoke all delegations from a specific managing tenant:

```powershell
# Remove all delegations from a specific managing tenant
$targetTenantId = "the-managing-tenant-to-remove"

$subscriptions = Get-AzSubscription
foreach ($sub in $subscriptions) {
    Set-AzContext -SubscriptionId $sub.Id | Out-Null

    $definitions = Get-AzManagedServicesDefinition
    $assignments = Get-AzManagedServicesAssignment

    foreach ($assignment in $assignments) {
        $defId = $assignment.Properties.RegistrationDefinitionId
        $def = $definitions | Where-Object { $_.Id -eq $defId }

        if ($def.Properties.ManagedByTenantId -eq $targetTenantId) {
            # Remove this delegation
            Write-Output "Removing delegation in $($sub.Name)..."
            Remove-AzManagedServicesAssignment -Id $assignment.Id
        }
    }
}
```

## Building a Compliance Report

For organizations with compliance requirements (SOC 2, ISO 27001, etc.), you need to document your third-party access regularly. Here is a framework for a Lighthouse compliance report:

1. **Inventory** - List all active delegations with their scope and authorization details
2. **Justification** - For each delegation, document the business reason
3. **Review date** - When was the delegation last reviewed?
4. **Expiration** - Does the delegation have an end date? (If not, should it?)
5. **Risk level** - Based on the roles granted, classify each delegation as low, medium, or high risk

Automating this report generation on a monthly or quarterly basis and routing it to your security team for review is a good practice that supports most compliance frameworks.

## Best Practices

**Audit quarterly at minimum.** Delegations can accumulate over time, and old ones that are no longer needed represent unnecessary risk.

**Use the principle of least privilege.** Regularly check whether delegations grant more access than necessary. If a managing tenant only needs Reader access, they should not have Contributor.

**Revoke promptly.** When a contract ends or a project completes, revoke the delegation immediately. Do not leave old delegations sitting around.

**Centralize monitoring.** Use a dedicated monitoring subscription or Log Analytics workspace to collect all delegation-related Activity Log events.

**Require eligible access for sensitive roles.** Use PIM-integrated eligible authorizations instead of permanent assignments for roles that can modify resources.

## Summary

Auditing and revoking Azure Lighthouse delegations is a critical part of maintaining security compliance in multi-tenant environments. By combining portal-based reviews, scripted audits, Activity Log alerts, and a regular compliance review process, you can maintain full visibility into who has access to your resources and ensure that access is appropriate and up to date.
