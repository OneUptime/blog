# Validation Summary: How to Use Azure CLI to Create and Manage Azure Policy Assignments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure CLI
- Azure Policy
- Azure Policy definitions
- Azure Policy assignments
- Azure Policy initiatives / policy set definitions
- Azure Policy compliance state, exemptions, and remediation
- Bash and jq

## Sources Consulted
- Microsoft Learn: Azure CLI `az policy definition` reference: https://learn.microsoft.com/en-us/cli/azure/policy/definition?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az policy assignment` reference: https://learn.microsoft.com/en-us/cli/azure/policy/assignment?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az policy set-definition` reference: https://learn.microsoft.com/en-us/cli/azure/policy/set-definition?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az policy state` reference: https://learn.microsoft.com/en-us/cli/azure/policy/state?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az policy exemption` reference: https://learn.microsoft.com/en-us/cli/azure/policy/exemption?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az policy remediation` reference: https://learn.microsoft.com/en-us/cli/azure/policy/remediation?view=azure-cli-latest
- Microsoft Learn: Azure Policy definition structure basics: https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure-basics
- Microsoft Learn: Azure Policy definition structure policy rules: https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure-policy-rule
- Microsoft Learn: Azure Policy parameter pattern: https://learn.microsoft.com/en-us/azure/governance/policy/samples/pattern-parameters
- Microsoft Learn: Remediate non-compliant resources with Azure Policy: https://learn.microsoft.com/en-us/azure/governance/policy/how-to/remediate-resources

## Issues Found
- The static public IP example was introduced as denying public IP addresses generally, but the rule only denies static public IP addresses. Updated the comment to match the actual policy rule.
- The first assignment example was labeled as a built-in policy assignment, but it assigns the custom `require-tag` policy created earlier in the article. Updated the comments to describe it as a custom parameterized policy.
- The Bash deployment script used `az policy assignment create --from-file`, which is not a documented option for that command. Reworked the loop to read assignment properties with `jq` and pass them through documented `--policy`, `--scope`, `--display-name`, and `--params` options.
- The Bash deployment script printed "already exists, updating..." after failed create commands, but it did not run update commands. Changed the message to say that `az policy definition update` or `az policy assignment update` is needed for changes.

## Review Notes
Azure CLI was not installed in the local environment, so command validation was performed against current Microsoft Learn Azure CLI reference pages rather than local `az --help` output.
