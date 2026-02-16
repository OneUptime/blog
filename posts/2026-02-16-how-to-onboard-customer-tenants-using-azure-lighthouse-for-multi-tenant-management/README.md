# How to Onboard Customer Tenants Using Azure Lighthouse for Multi-Tenant Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Lighthouse, Multi-Tenant, Cloud Management, Managed Services, Azure Active Directory, Delegation

Description: A practical guide to onboarding customer tenants using Azure Lighthouse so you can manage resources across multiple Azure AD tenants from a single pane of glass.

---

If you are a managed service provider or an enterprise with multiple Azure AD tenants, you know the pain of juggling between tenant directories just to manage resources. Switching contexts, re-authenticating, and losing track of which tenant you are working in - it gets old fast. Azure Lighthouse solves this problem by allowing you to manage resources across tenants without switching directories.

In this post, I will cover the end-to-end process of onboarding customer tenants to Azure Lighthouse, from preparing the authorization structure to deploying the delegation and verifying that everything works.

## What Azure Lighthouse Actually Does

Before we dive into the how, let me clarify what Lighthouse does at a technical level. Azure Lighthouse uses a feature called Azure delegated resource management. When a customer tenant delegates a subscription or resource group to your managing tenant, your users get projected access to those resources. The resources show up in the Azure Portal under your own tenant context, and you can manage them using the same tools and workflows you use for your own resources.

The delegation does not involve sharing credentials or creating guest accounts. Instead, it maps principals (users, groups, or service principals) in your managing tenant to specific RBAC roles on the customer's delegated resources.

## Prerequisites

Before you start onboarding, you need a few things in place:

1. Your managing tenant ID (your Azure AD tenant where your team lives)
2. The object IDs of the users, groups, or service principals that will manage customer resources
3. The RBAC role definition IDs you want to assign
4. The customer must have the Microsoft.ManagedServices resource provider registered

## Step 1: Define the Authorization Structure

The authorization structure is the core of any Lighthouse delegation. It defines who in your tenant gets what level of access to the customer's resources.

Here is a common structure for a managed services engagement:

```json
{
  // List of authorization mappings from your tenant to RBAC roles
  "authorizations": [
    {
      // Security group for your L1 support team
      "principalId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "principalIdDisplayName": "L1 Support Team",
      "roleDefinitionId": "acdd72a7-3385-48ef-bd42-f606fba81ae7"
      // Reader role - can view but not modify
    },
    {
      // Security group for your L2 operations team
      "principalId": "ffffffff-1111-2222-3333-444444444444",
      "principalIdDisplayName": "L2 Operations Team",
      "roleDefinitionId": "b24988ac-6180-42a0-ab88-20f7382dd24c"
      // Contributor role - can manage most resources
    },
    {
      // Security group for your security team
      "principalId": "55555555-6666-7777-8888-999999999999",
      "principalIdDisplayName": "Security Admins",
      "roleDefinitionId": "91c1777a-f3dc-4fae-b103-61d183457e46"
      // Managed Services Registration Assignment Delete role
    }
  ]
}
```

A few things to note about this structure. First, always use Azure AD groups rather than individual users. This way, you can add and remove team members without modifying the delegation. Second, include at least one principal with the Managed Services Registration Assignment Delete role. This allows you to clean up delegations when you no longer need them. Third, you cannot assign the Owner role through Lighthouse - that restriction is intentional and exists for security reasons.

## Step 2: Create the ARM Template for Onboarding

Azure Lighthouse onboarding is done through ARM template deployments. Microsoft provides a standard template structure for this.

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-08-01/subscriptionDeploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "mspOfferName": {
      "type": "string",
      "defaultValue": "Contoso Managed Services"
    },
    "mspOfferDescription": {
      "type": "string",
      "defaultValue": "Managed infrastructure and security services by Contoso"
    }
  },
  "variables": {
    // Your managing tenant ID
    "managedByTenantId": "your-managing-tenant-id-here",
    "authorizations": [
      {
        "principalId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        "principalIdDisplayName": "Contoso L2 Operations",
        // Contributor role definition ID
        "roleDefinitionId": "b24988ac-6180-42a0-ab88-20f7382dd24c"
      },
      {
        "principalId": "55555555-6666-7777-8888-999999999999",
        "principalIdDisplayName": "Contoso Security Team",
        // Managed Services Registration Assignment Delete role
        "roleDefinitionId": "91c1777a-f3dc-4fae-b103-61d183457e46"
      }
    ]
  },
  "resources": [
    {
      // Registration definition - defines the delegation terms
      "type": "Microsoft.ManagedServices/registrationDefinitions",
      "apiVersion": "2020-02-01-preview",
      "name": "[guid(parameters('mspOfferName'))]",
      "properties": {
        "registrationDefinitionName": "[parameters('mspOfferName')]",
        "description": "[parameters('mspOfferDescription')]",
        "managedByTenantId": "[variables('managedByTenantId')]",
        "authorizations": "[variables('authorizations')]"
      }
    },
    {
      // Registration assignment - activates the delegation
      "type": "Microsoft.ManagedServices/registrationAssignments",
      "apiVersion": "2020-02-01-preview",
      "name": "[guid(parameters('mspOfferName'))]",
      "dependsOn": [
        "[resourceId('Microsoft.ManagedServices/registrationDefinitions', guid(parameters('mspOfferName')))]"
      ],
      "properties": {
        "registrationDefinitionId": "[resourceId('Microsoft.ManagedServices/registrationDefinitions', guid(parameters('mspOfferName')))]"
      }
    }
  ]
}
```

## Step 3: Deploy the Onboarding Template

The customer needs to deploy this template into their subscription. There are several ways to do this.

### Option A: Customer Deploys via Portal

Share the template file with your customer. They can deploy it using the Azure Portal's "Deploy a custom template" feature. This is the most common approach for customers who want to review and approve the delegation themselves.

### Option B: Deploy via Azure CLI

If you have temporary access to the customer's subscription (for example, during initial setup), you can deploy the template directly.

```bash
# Log into the customer's tenant
az login --tenant customer-tenant-id

# Deploy the onboarding template at subscription scope
az deployment sub create \
  --name "lighthouse-onboarding" \
  --location "eastus" \
  --template-file "onboarding-template.json" \
  --subscription "customer-subscription-id"
```

### Option C: Deploy via PowerShell

```powershell
# Connect to the customer tenant
Connect-AzAccount -Tenant "customer-tenant-id"

# Deploy the template at subscription scope
New-AzSubscriptionDeployment `
  -Name "lighthouse-onboarding" `
  -Location "eastus" `
  -TemplateFile "./onboarding-template.json" `
  -SubscriptionId "customer-subscription-id"
```

## Step 4: Verify the Delegation

After deployment, you should verify the delegation from both sides.

From the managing tenant, check that the customer's resources are visible:

```powershell
# List all delegated subscriptions visible to your tenant
Get-AzManagedServicesAssignment

# Or use Azure CLI
az managedservices assignment list
```

In the Azure Portal, navigate to "My customers" in the Lighthouse blade. You should see the customer's subscription listed there. You can also navigate to the delegated resources directly from your own portal session.

From the customer's side, they can verify the delegation by going to "Service providers" in the Lighthouse blade. They will see your offer listed along with the specific roles you have been granted.

## Step 5: Start Managing Cross-Tenant Resources

Once the delegation is active, your team members can manage the customer's resources from your own tenant. Here is an example of listing virtual machines across all delegated subscriptions:

```powershell
# Get all delegated subscriptions
$subscriptions = Get-AzSubscription

# Loop through and find VMs across all subscriptions
foreach ($sub in $subscriptions) {
    Set-AzContext -SubscriptionId $sub.Id
    $vms = Get-AzVM
    foreach ($vm in $vms) {
        # Output VM details with subscription context
        Write-Output "$($sub.Name) | $($vm.Name) | $($vm.Location)"
    }
}
```

## Common Pitfalls and How to Avoid Them

**Resource provider not registered.** If the customer has not registered the Microsoft.ManagedServices resource provider, the deployment will fail. Have them run `az provider register --namespace Microsoft.ManagedServices` before deploying.

**Using user IDs instead of group IDs.** If you map individual users, you will need to redeploy the template every time someone joins or leaves your team. Always use Azure AD groups.

**Forgetting the delete role.** Without the Managed Services Registration Assignment Delete role assigned to at least one principal, you will not be able to clean up delegations from your side. The customer would have to do it.

**Scope confusion.** Delegations can be scoped to individual resource groups or entire subscriptions. Make sure you and your customer agree on the scope before deploying.

## Security Considerations

Azure Lighthouse was designed with security in mind, but there are still things to be aware of. Customers retain full visibility into what the managing tenant can do. They can see the roles assigned and can revoke the delegation at any time. The managing tenant cannot escalate their own permissions beyond what was defined in the delegation.

For additional security, consider using Azure AD Conditional Access policies to restrict where and how your team members can access delegated resources. You can also use Privileged Identity Management (PIM) to make Lighthouse authorizations eligible rather than permanent, so your team members have to activate their access before managing customer resources.

## Summary

Onboarding customer tenants to Azure Lighthouse is a straightforward process once you understand the moving pieces. Define your authorization structure carefully, use Azure AD groups, deploy the ARM template into the customer's subscription, and verify the delegation from both sides. With Lighthouse in place, you can manage resources across dozens or even hundreds of tenants without the headache of context switching.
