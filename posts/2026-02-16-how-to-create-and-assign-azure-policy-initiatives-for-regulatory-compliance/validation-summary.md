# Validation Summary: How to Create and Assign Azure Policy Initiatives for Regulatory Compliance

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Policy
- Azure Policy initiatives / policy set definitions
- Azure Policy assignments, exemptions, remediation, and compliance states
- Microsoft Defender for Cloud regulatory compliance dashboard
- Azure PowerShell Az.Resources and Az.PolicyInsights modules
- Regulatory compliance frameworks including CIS, NIST SP 800-53, PCI DSS, ISO 27001, HIPAA HITRUST, and SOC 2

## Sources Consulted
- Microsoft Learn: Get-AzPolicySetDefinition, https://learn.microsoft.com/en-us/powershell/module/az.resources/get-azpolicysetdefinition
- Microsoft Learn: New-AzPolicyAssignment, https://learn.microsoft.com/en-us/powershell/module/az.resources/new-azpolicyassignment
- Microsoft Learn: New-AzPolicySetDefinition, https://learn.microsoft.com/en-us/powershell/module/az.resources/new-azpolicysetdefinition
- Microsoft Learn: New-AzPolicyExemption, https://learn.microsoft.com/en-us/powershell/module/az.resources/new-azpolicyexemption
- Microsoft Learn: Start-AzPolicyRemediation, https://learn.microsoft.com/en-us/powershell/module/az.policyinsights/start-azpolicyremediation
- Microsoft Learn: Get-AzPolicyState, https://learn.microsoft.com/en-us/powershell/module/az.policyinsights/get-azpolicystate
- Microsoft Learn: Get compliance data of Azure resources, https://learn.microsoft.com/en-us/azure/governance/policy/how-to/get-compliance-data
- Microsoft Learn: Azure Policy overview, https://learn.microsoft.com/en-us/azure/governance/policy/overview
- Microsoft Learn: Azure Policy exemption structure, https://learn.microsoft.com/en-us/azure/governance/policy/concepts/exemption-structure
- Microsoft Learn: Azure Policy regulatory compliance controls for Azure Storage, https://learn.microsoft.com/en-us/azure/storage/common/security-controls-policy
- Azure/azure-policy built-in policy definitions repository, https://github.com/Azure/azure-policy

## Issues Found
- The PowerShell examples used the legacy `.Properties.*` object shape from Az.Resources. Current Az.Resources documentation uses top-level properties such as `.DisplayName`, `.Metadata`, and `.PolicyDefinition` unless `-BackwardCompatible` is specified. Updated the snippets to use the current top-level properties.
- The prerequisites named "Policy Contributor", which is not the current built-in role name used in Azure Policy documentation. Updated it to "Resource Policy Contributor".
- The custom initiative example used deprecated SQL policy definition ID `a8bef009-a5c9-4d0f-90d7-6018734e8a16`. Replaced it with the current built-in policy for "Transparent Data Encryption on SQL databases should be enabled", `17k78e20-9358-41c9-923c-fb736d382a12`.
- The remediation example used `$assignment.PolicyAssignmentId`, but current Az.Resources policy assignment objects expose the resource ID as `.Id`. Updated the remediation command to pass `$assignment.Id`.
- The remediation section omitted the managed identity requirement for `DeployIfNotExists` and `Modify` remediation. Added a short note that the assignment needs a managed identity with the required permissions.
- The text implied a complete one-to-one policy-to-control mapping. Microsoft documentation notes that policy mappings often are not one-to-one or complete, so the wording was softened to "Many policies" and "which controls are satisfied."

## Review Notes
PowerShell was not installed in the local environment, so command syntax was validated against Microsoft Learn and the Azure Policy built-in definitions repository rather than by executing the Az cmdlets locally.
