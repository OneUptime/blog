# Validation Summary: How to Delegate Azure Resource Management Using Azure Lighthouse Service Offers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Lighthouse
- Microsoft Marketplace Managed Service offers
- Partner Center
- Microsoft Entra ID and Privileged Identity Management
- Azure RBAC
- Az.ManagedServices PowerShell cmdlets

## Sources Consulted
- Microsoft Learn: Publish a Managed Service offer to Microsoft Marketplace - https://learn.microsoft.com/en-us/azure/lighthouse/how-to/publish-managed-services-offers
- Microsoft Learn: Managed Service offers in Microsoft Marketplace - https://learn.microsoft.com/en-us/azure/lighthouse/concepts/managed-services-offers
- Microsoft Learn: Create a Managed Service offer for Microsoft Marketplace - https://learn.microsoft.com/en-us/partner-center/marketplace-offers/create-managed-service-offer
- Microsoft Learn: Create plans for a Managed Service offer on Microsoft Marketplace - https://learn.microsoft.com/en-us/partner-center/marketplace-offers/create-managed-service-offer-plans
- Microsoft Learn: Private plans in Microsoft Marketplace - https://learn.microsoft.com/en-us/partner-center/marketplace-offers/private-plans
- Microsoft Learn: Create eligible authorizations - https://learn.microsoft.com/en-us/azure/lighthouse/how-to/create-eligible-authorizations
- Microsoft Learn: Tenants, users, and roles in Azure Lighthouse scenarios - https://learn.microsoft.com/en-us/azure/lighthouse/concepts/tenants-users-roles
- Microsoft Learn: Remove access to a delegation - https://learn.microsoft.com/en-us/azure/lighthouse/how-to/remove-delegation
- Microsoft Learn: Get-AzManagedServicesAssignment - https://learn.microsoft.com/en-us/powershell/module/az.managedservices/get-azmanagedservicesassignment
- Microsoft Learn: Get-AzManagedServicesDefinition - https://learn.microsoft.com/en-us/powershell/module/az.managedservices/get-azmanagedservicesdefinition
- Microsoft Learn: Microsoft AI Cloud Partner Program account guidance - https://learn.microsoft.com/en-us/partner-center/mpn-create-a-partner-center-account

## Issues Found
- The post described public and private Lighthouse service offers as separate offer types. Microsoft documentation describes Managed Service offers as having public or private plans, so the terminology was corrected.
- The post said private plans and preview audiences are targeted by tenant IDs. For Managed Service offers, Microsoft documentation specifies Azure subscription IDs, so those references were corrected.
- The prerequisites listed Microsoft Partner Network membership and Azure AD Premium P1/P2 for Conditional Access. The current requirements are a Microsoft Marketplace account, Solutions Partner designation for Infrastructure (Azure) or Security, and Microsoft Entra ID Governance licensing when using eligible authorizations with PIM. The prerequisite list was updated.
- The manifest example used comments inside a `json` code block, making the snippet invalid JSON. The comments were removed and the example was adjusted to include an active Reader authorization for the same principal that receives eligible Contributor access, matching Azure Lighthouse PIM guidance.
- The post used older Azure AD terminology in a few places. These were updated to Microsoft Entra terminology where relevant.
- The customer acceptance flow said customers click "Subscribe." The wording was changed to describe creating the offer and delegating selected resources, matching Microsoft documentation.
- The PowerShell example accessed `Properties.Scope` and `Properties.RegistrationDefinitionId`, which does not match the documented Az.ManagedServices output examples. The script now displays `Id` and `RegistrationDefinitionId`.
- The publishing section implied private offers are simply available faster. The wording was changed to note that private plan audience changes can be synced without republishing the whole offer.

## Review Notes
The post is technically relevant and remains a valid Azure Lighthouse guide after the corrections. Future improvements could add a short note that private Managed Service plans are not supported with subscriptions established through a reseller in the Cloud Solution Provider program, and that Managed Service offers may not be available in Azure Government or other national clouds.
