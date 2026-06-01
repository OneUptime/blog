# Validation Summary: Onboard Customer Tenants Using Azure Lighthouse for Multi-Tenant Management

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Lighthouse
- Azure delegated resource management
- Azure Resource Manager templates
- Azure CLI
- Azure PowerShell
- Azure RBAC
- Microsoft Entra ID
- Microsoft Entra Privileged Identity Management

## Sources Consulted
- Microsoft Learn: Onboard a customer to Azure Lighthouse: https://learn.microsoft.com/en-us/azure/lighthouse/how-to/onboard-customer
- Microsoft Learn: Microsoft.ManagedServices/registrationDefinitions ARM template reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.managedservices/registrationdefinitions
- Microsoft Learn: Microsoft.ManagedServices/registrationAssignments ARM template reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.managedservices/registrationassignments
- Microsoft Learn: Azure Lighthouse tenants, users, and roles: https://learn.microsoft.com/en-us/azure/lighthouse/concepts/tenants-users-roles
- Microsoft Learn: Azure built-in roles for management and governance: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/management-and-governance
- Microsoft Learn: Azure CLI `az managedservices assignment`: https://learn.microsoft.com/en-us/cli/azure/managedservices/assignment
- Microsoft Learn: Azure PowerShell `Get-AzManagedServicesAssignment`: https://learn.microsoft.com/en-us/powershell/module/az.managedservices/get-azmanagedservicesassignment
- Microsoft Learn: Deploy resources to subscription scope with ARM templates: https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deploy-to-subscription
- Microsoft Learn: ARM template structure and syntax: https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/syntax
- Microsoft Learn: Create eligible authorizations for Azure Lighthouse: https://learn.microsoft.com/en-us/azure/lighthouse/how-to/create-eligible-authorizations

## Issues Found
- The ARM template used the older `2020-02-01-preview` API version for `Microsoft.ManagedServices/registrationDefinitions` and `registrationAssignments`. Updated both resources to the current stable `2022-10-01` API version from the ARM template reference.
- The JSON snippets contained inline comments inside `json` code blocks. ARM template comments are not supported consistently across all deployment paths, including portal deployment, so the comments were removed to keep the examples deployable as shown.
- The prerequisites stated that the customer must already have the `Microsoft.ManagedServices` resource provider registered. Microsoft documentation says standard onboarding registers the provider for the subscription, with manual registration needed in some later marketplace or management-group policy scenarios. Updated the prerequisite and pitfall language accordingly.
- The PowerShell deployment example passed `-SubscriptionId` to `New-AzSubscriptionDeployment`. Subscription deployments run in the current Azure context, so the example now sets the context with `Set-AzContext -SubscriptionId` before calling `New-AzSubscriptionDeployment`.
- The verification text described `Get-AzManagedServicesAssignment` as listing all delegated subscriptions visible to the managing tenant. The cmdlet lists Azure Lighthouse registration assignments for the current scope, so the wording was corrected.
- The security section overstated customer visibility and revocation as unconditional. Updated it to say customers can see delegated offers and assigned roles, and that customer-tenant users with the required permissions can revoke delegations.

## Review Notes
The role IDs for Reader, Contributor, and Managed Services Registration Assignment Delete Role are correct. The article's PIM guidance is directionally correct, with the caveat that eligible authorizations require Microsoft Entra ID Governance licensing and are not supported for service principals.
