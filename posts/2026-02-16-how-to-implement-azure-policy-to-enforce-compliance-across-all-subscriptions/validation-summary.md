# Validation Summary: How to Implement Azure Policy to Enforce Compliance Across All Subscriptions

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Policy
- Azure Policy initiatives
- Azure CLI
- ARM templates
- Azure SQL Database auditing
- Azure Policy remediation tasks
- Azure Policy exemptions and compliance state queries

## Sources Consulted
- Microsoft Learn: Azure Policy effect basics - https://learn.microsoft.com/en-us/azure/governance/policy/concepts/effect-basics
- Microsoft Learn: DeployIfNotExists effect - https://learn.microsoft.com/en-us/azure/governance/policy/concepts/effect-deploy-if-not-exists
- Microsoft Learn: Azure Policy definition structure basics - https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure-basics
- Microsoft Learn: Azure Policy rule conditions - https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure-policy-rule
- Microsoft Learn: Azure Policy initiative definition structure - https://learn.microsoft.com/en-us/azure/governance/policy/concepts/initiative-definition-structure
- Microsoft Learn: Azure CLI `az policy assignment` reference - https://learn.microsoft.com/en-us/cli/azure/policy/assignment
- Microsoft Learn: Azure CLI `az policy remediation` reference - https://learn.microsoft.com/en-us/cli/azure/policy/remediation
- Microsoft Learn: Azure CLI `az policy exemption` reference - https://learn.microsoft.com/en-us/cli/azure/policy/exemption
- Microsoft Learn: Azure CLI `az policy state` reference - https://learn.microsoft.com/en-us/cli/azure/policy/state
- Microsoft Learn: Remediate non-compliant resources - https://learn.microsoft.com/en-us/azure/governance/policy/how-to/remediate-resources
- Azure/azure-policy built-in definitions repository - https://github.com/Azure/azure-policy

## Issues Found
- The Azure Policy evaluation explanation and diagram incorrectly implied that `DeployIfNotExists` immediately creates a remediation task. Updated the wording and diagram to distinguish create/update-time related deployments from remediation tasks for existing resources.
- Several built-in policy examples used policies whose default effect is `Audit` while the surrounding text described enforcement. Added `effect: Deny` parameters for the secure transfer, Key Vault network access, and Azure SQL TLS examples, and corrected the Key Vault description to match the built-in policy.
- The Microsoft cloud security benchmark initiative was referred to by the older Azure Security Benchmark name. Updated the label and assignment name while keeping the same built-in initiative ID.
- The custom initiative example reused the same built-in policy multiple times without `policyDefinitionReferenceId` values. Added unique reference IDs for each included policy.
- The naming policy used `match` with `*` wildcard semantics. Azure Policy `match` does not use `*` as a glob wildcard, so the example was changed to a valid `notLike: "rg-*"` prefix rule and the description was narrowed accordingly.
- The custom policy JSON examples were missing the `properties` wrapper used by Azure Policy definition JSON. Wrapped the examples in `properties`.
- The `DeployIfNotExists` SQL auditing example used `field('fullName')` inside the ARM template body and referenced undeclared template/policy parameters. Updated it to pass `fullDbName`, `storageEndpoint`, and `storageAccountKey` through the deployment parameters.
- The remediation examples used `--scope`, which is not an `az policy remediation create/show` option. Replaced it with `--management-group`.
- The compliance summary query treated `results.policyAssignments` as if it existed and counted resource detail rows instead of counts. Updated the JMESPath query to use the top-level `policyAssignments` array and the `resourceDetails[].count` value.

## Review Notes
The Azure CLI is not installed in this workspace, so command validation was performed against the current Microsoft Learn CLI reference and the Azure Policy built-in definitions repository rather than local `az --help` output.
