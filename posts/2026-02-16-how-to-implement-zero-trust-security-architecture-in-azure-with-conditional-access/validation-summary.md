# Validation Summary: How to Use Zero Trust Security Architecture in Azure with Conditional Access

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Microsoft Azure
- Microsoft Entra ID
- Conditional Access
- Microsoft Entra ID Protection
- Microsoft Intune
- Microsoft Defender for Cloud Apps
- Microsoft Sentinel
- Microsoft Defender for Cloud
- Microsoft Defender for Identity
- Microsoft Entra Privileged Identity Management
- Terraform AzureAD provider
- Azure CLI
- Azure Private Link and Private Endpoints
- Azure Firewall, NSGs, and Azure Bastion

## Sources Consulted
- Microsoft Learn: Build a Conditional Access policy - https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-policies
- Microsoft Learn: Plan a Conditional Access deployment - https://learn.microsoft.com/en-us/entra/identity/conditional-access/plan-conditional-access
- Microsoft Learn: Security defaults in Microsoft Entra ID - https://learn.microsoft.com/en-us/entra/fundamentals/security-defaults
- Microsoft Learn: Risk-based access policies - https://learn.microsoft.com/en-us/entra/id-protection/concept-identity-protection-policies
- Microsoft Learn: Require remediation for risky users - https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-risk-based-user
- Microsoft Learn: Microsoft Entra ID Protection FAQ - https://learn.microsoft.com/en-us/entra/id-protection/id-protection-faq
- Microsoft Learn: Conditional Access for workload identities - https://learn.microsoft.com/en-us/entra/identity/conditional-access/workload-identity
- Microsoft Learn: Conditional Access app control in Microsoft Defender for Cloud Apps - https://learn.microsoft.com/en-us/defender-cloud-apps/proxy-deployment-any-app
- Microsoft Learn: Microsoft Entra application proxy - https://learn.microsoft.com/en-us/entra/identity/app-proxy/overview-what-is-app-proxy
- Microsoft Learn: Azure Private Endpoint for Azure SQL with Azure CLI - https://learn.microsoft.com/en-us/azure/private-link/tutorial-private-endpoint-sql-cli
- Microsoft Learn: az network private-endpoint create - https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint
- Terraform Registry: hashicorp/azuread azuread_conditional_access_policy - https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/resources/conditional_access_policy

## Issues Found
- Updated Azure AD terminology to Microsoft Entra ID where the post referred to the current product name, including Azure AD Connect and Azure AD Identity Protection references.
- Corrected the Conditional Access navigation path to use the Microsoft Entra admin center and Entra ID > Conditional Access.
- Renamed the "Block Access from High-Risk Locations" policy to "Block Access from High-Risk Sign-Ins" because the policy condition is sign-in risk, not a named or geographic location condition.
- Updated the risky-user policy guidance from requiring password change plus MFA to requiring risk remediation, matching current Microsoft Entra ID Protection Conditional Access guidance.
- Clarified that Microsoft Defender for Cloud Apps Conditional Access App Control provides session controls, while Microsoft Entra application proxy publishes on-premises apps so those controls can be applied.
- Clarified the service principal and managed identity caveat: Conditional Access for workload identities can target service principals with appropriate licensing, but managed identities are not covered.

## Review Notes
The Azure CLI private endpoint command shape and SQL `sqlServer` group ID are consistent with Microsoft Learn examples, but the command was not executed locally because Azure CLI is not installed in this environment. The Terraform Conditional Access policy resource fields and control values match the current HashiCorp AzureAD provider documentation.
