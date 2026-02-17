# How to Delegate Azure Resource Management Using Azure Lighthouse Service Offers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Lighthouse, Service Offers, Managed Services, Delegation, Azure Marketplace, Multi-Tenant

Description: Learn how to create and publish Azure Lighthouse service offers to delegate resource management to managed service providers or internal teams.

---

Azure Lighthouse service offers give managed service providers a scalable way to onboard customers. Instead of manually deploying ARM templates for each customer, you can publish a service offer to the Azure Marketplace or use a private plan that customers can accept with a few clicks. This approach is cleaner, more professional, and easier to manage at scale.

In this post, I will walk you through how to create Azure Lighthouse service offers, the difference between public and private offers, and how the delegation flow works from both the provider and customer perspectives.

## Public vs. Private Service Offers

There are two types of Lighthouse service offers you can publish through Partner Center:

**Public offers** are visible to anyone in the Azure Marketplace. Any Azure customer can discover your offer and accept it. This is the typical approach for MSPs who want to attract new customers.

**Private offers** are only visible to specific tenants that you designate. This is useful when you have an existing customer relationship and want a streamlined onboarding experience, or when you are an internal team managing resources across multiple tenants within the same organization.

Both types go through the same publishing process, but private offers have an additional step where you specify the tenant IDs that can see the offer.

## Prerequisites for Publishing Service Offers

Before you can publish a Lighthouse service offer, you need:

1. A Microsoft Partner Network (MPN) membership
2. A Partner Center account linked to your Azure AD tenant
3. A commercial marketplace publisher account in Partner Center
4. Your managing tenant must have the Azure Active Directory Premium P1 or P2 license (for Conditional Access integration, which is recommended)

If you are an enterprise team managing internal tenants (not an MSP), you can skip the marketplace route and use ARM template-based onboarding instead. The service offer approach is primarily designed for the MSP scenario.

## Step 1: Create the Offer in Partner Center

Log into Partner Center and navigate to the Commercial Marketplace section. Click "New offer" and select "Managed Service."

You will need to fill in several sections:

**Offer setup** - Enter the basic details like offer name, offer ID (which cannot be changed later), and the description that customers will see.

**Properties** - Select the categories and industries that best describe your services. This helps with discoverability in the marketplace.

**Offer listing** - Write a compelling description of what your managed service includes. Add links to your support documentation and privacy policy.

**Preview audience** - Specify tenant IDs that can see the offer before it goes live. This is your chance to test the offer with a friendly customer before publishing it widely.

## Step 2: Define the Authorization Plan

This is the most critical part of the offer. The plan defines what RBAC roles your team gets on the customer's delegated resources.

Navigate to the "Plans" section and create a new plan. Within the plan, you will configure the manifest, which contains your managing tenant ID and the authorization mappings.

Here is what a typical plan manifest looks like conceptually:

```json
{
  // Your managing tenant where your operations team lives
  "managedByTenantId": "11111111-2222-3333-4444-555555555555",
  "authorizations": [
    {
      // Operations team group in your Azure AD
      "principalId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "principalIdDisplayName": "MSP Operations Team",
      // Contributor - can manage resources but not access control
      "roleDefinitionId": "b24988ac-6180-42a0-ab88-20f7382dd24c"
    },
    {
      // Monitoring team - read only access
      "principalId": "ffffffff-1111-2222-3333-444444444444",
      "principalIdDisplayName": "MSP Monitoring Team",
      // Reader - view only
      "roleDefinitionId": "acdd72a7-3385-48ef-bd42-f606fba81ae7"
    },
    {
      // Admin group that can remove the delegation if needed
      "principalId": "99999999-aaaa-bbbb-cccc-dddddddddddd",
      "principalIdDisplayName": "MSP Admin Team",
      // Managed Services Registration Assignment Delete
      "roleDefinitionId": "91c1777a-f3dc-4fae-b103-61d183457e46"
    }
  ],
  "eligibleAuthorizations": [
    {
      // JIT access for elevated operations
      "principalId": "eeeeeeee-ffff-0000-1111-222222222222",
      "principalIdDisplayName": "MSP Elevated Ops",
      // Contributor - but only when activated through PIM
      "roleDefinitionId": "b24988ac-6180-42a0-ab88-20f7382dd24c",
      "justInTimeAccessPolicy": {
        "multiFactorAuthProvider": "Azure",
        "maximumActivationDuration": "PT4H"
      }
    }
  ]
}
```

Notice the `eligibleAuthorizations` section. This is a powerful feature that integrates with Azure AD Privileged Identity Management (PIM). Instead of giving your team permanent Contributor access, you can make it eligible, meaning team members have to activate the role before using it. The activation can require MFA and has a maximum duration (4 hours in this example).

## Step 3: Configure the Plan Visibility

If you want a public offer, simply leave the visibility settings at their defaults. For a private plan, go to the plan's "Pricing and availability" section and add the specific tenant IDs that should be able to see this plan.

You can have multiple plans within a single offer. A common pattern is to have different service tiers:

- **Basic Monitoring** - Reader role only, lower cost
- **Standard Management** - Contributor role, moderate cost
- **Premium Management** - Contributor plus eligible elevated access, higher cost

Each plan has its own authorization structure, so you can tailor the access levels to match your service tiers.

## Step 4: Review and Publish

Before publishing, Partner Center will run validation checks on your offer. Common issues include:

- Missing required fields in the offer listing
- Role definition IDs that are not supported by Lighthouse (Owner role is not allowed)
- Principal IDs that do not exist in your managing tenant
- Duplicate role assignments for the same principal

Once validation passes, you can publish the offer. For public offers, the review process typically takes a few business days. Private offers are usually available faster.

## The Customer Acceptance Flow

Once your offer is published, here is what the customer experience looks like:

1. The customer navigates to the Azure Marketplace (or receives a direct link to your private offer)
2. They review the offer details, including exactly which roles will be granted to which principals
3. They select the subscription or resource group they want to delegate
4. They click "Subscribe" to accept the delegation

The entire process is transparent to the customer. They can see exactly what access they are granting before they accept.

After acceptance, the delegation is active immediately. Your team can see the customer's resources in the Azure Portal under "My customers."

## Managing Active Delegations

Once you have customers onboarded through service offers, you can manage the delegations from the Azure Portal.

```powershell
# View all your active customer delegations
Get-AzManagedServicesDefinition

# View delegations for a specific customer subscription
Get-AzManagedServicesAssignment -Scope "/subscriptions/customer-sub-id"

# List all customers and their delegated scopes
$customers = Get-AzManagedServicesAssignment
foreach ($customer in $customers) {
    # Display customer delegation details
    Write-Output "Scope: $($customer.Properties.Scope)"
    Write-Output "Definition: $($customer.Properties.RegistrationDefinitionId)"
    Write-Output "---"
}
```

## Updating Your Service Offer

When you need to change the authorization structure (for example, adding a new role or changing a group), you publish an updated version of your plan in Partner Center. Existing customers will need to accept the updated offer for the changes to take effect. They will see a notification in the Azure Portal that an update is available.

This is an important distinction from ARM template-based onboarding, where you would need to redeploy the template. With service offers, updates are managed through the marketplace flow.

## Best Practices for Service Offers

**Use Azure AD groups, not individual users.** This is the single most important recommendation. If you use individual user IDs, you will need to update the offer every time someone joins or leaves your team.

**Implement eligible authorizations for sensitive roles.** The PIM integration is one of the best features of Lighthouse. Use it for any role that could modify resources.

**Create multiple plans for different service levels.** This gives customers flexibility and makes it clear what each tier includes.

**Keep your offer listing up to date.** Customers see this information when deciding whether to accept your delegation. Make sure it accurately reflects your current services.

**Test with the preview audience first.** Always test new offers or updates with a preview tenant before publishing to all customers.

## Revoking Delegations

Either side can revoke a delegation at any time. From the provider side, a principal with the Managed Services Registration Assignment Delete role can remove the delegation. From the customer side, any user with the appropriate permissions can go to "Service providers" and remove the delegation.

This mutual revocation capability is important for building trust. Customers know they are always in control and can remove access whenever they need to.

## Summary

Azure Lighthouse service offers provide a professional, scalable way to onboard customers for multi-tenant resource management. By publishing offers through Partner Center, you get a streamlined customer acceptance flow, built-in transparency, and the ability to manage updates through the marketplace. Combined with eligible authorizations and PIM integration, service offers give you a strong foundation for secure, auditable, multi-tenant management at scale.
