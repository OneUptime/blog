# Validation Summary: How to Assign Azure Policy at the Management Group Level for Governance at Scale

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Policy
- Azure management groups
- Azure Policy initiatives / policy set definitions
- Azure CLI
- Azure Resource Manager templates
- Azure Policy exemptions and compliance state queries

## Sources Consulted
- Microsoft Learn: Azure management groups overview - https://learn.microsoft.com/en-us/azure/governance/management-groups/overview
- Microsoft Learn: Azure Policy assignment structure - https://learn.microsoft.com/en-us/azure/governance/policy/concepts/assignment-structure
- Microsoft Learn: Azure Policy definition structure basics - https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure-basics
- Microsoft Learn: Azure Policy deployIfNotExists effect - https://learn.microsoft.com/en-us/azure/governance/policy/concepts/effect-deploy-if-not-exists
- Microsoft Learn: Azure CLI `az policy assignment` reference - https://learn.microsoft.com/en-us/cli/azure/policy/assignment?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az policy set-definition` reference - https://learn.microsoft.com/en-us/cli/azure/policy/set-definition?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az policy state` reference - https://learn.microsoft.com/en-us/cli/azure/policy/state?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az policy exemption` reference - https://learn.microsoft.com/en-us/cli/azure/policy/exemption?view=azure-cli-latest
- Microsoft Learn: Azure Policy exemption structure - https://learn.microsoft.com/en-us/azure/governance/policy/concepts/exemption-structure
- Microsoft Azure Policy built-in definitions repository - https://github.com/Azure/azure-policy

## Issues Found
- Updated the policy conflict explanation. The original "most restrictive one wins (deny beats allow)" wording was imprecise because Azure Policy evaluates applicable effects rather than using a general allow/deny precedence model. It now states that any applicable Deny effect blocks the request.
- Clarified that lower-level assignments do not override higher-level assignments, but exclusions and exemptions can still be used when appropriate.
- Corrected the portal instructions for "Require a tag on resource groups." The built-in policy has a fixed Deny effect and does not require setting an effect parameter for this policy.
- Updated "Azure Security Benchmark" to the current built-in initiative display name, "Microsoft cloud security benchmark," while noting the former name.
- Replaced the incorrect Azure CLI flag `--identity-type SystemAssigned` with the current `--mi-system-assigned` flag for `az policy assignment create`.
- Added the missing `tagValue` parameter to the custom initiative JSON for the built-in "Require a tag and its value on resources" policy.
- Removed sandbox examples that are not Azure Policy assignments as written, such as subscription budget limits and VM auto-shutdown schedules, and replaced them with policy-appropriate examples.
- Reworded the DoNotEnforce example from "audit mode" to "non-enforcing mode" to avoid confusing enforcement mode with the Audit policy effect.

## Review Notes
The local Azure CLI was not installed, so CLI options were verified against Microsoft Learn command reference instead of local `az --help` output. The policy and initiative GUIDs used in the post were checked against Microsoft's Azure Policy built-in definitions repository.
