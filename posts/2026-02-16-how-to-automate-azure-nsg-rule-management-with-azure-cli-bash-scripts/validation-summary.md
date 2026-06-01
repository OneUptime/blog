# Validation Summary: How to Automate Azure NSG Rule Management with Azure CLI Bash Scripts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Network Security Groups
- Azure CLI
- Bash scripting
- jq
- Azure networking and security rules

## Sources Consulted
- Microsoft Learn: az network nsg rule command reference: https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule?view=azure-cli-latest
- Microsoft Learn: How network security groups filter network traffic: https://learn.microsoft.com/en-us/azure/virtual-network/network-security-group-how-it-works
- Microsoft Learn: Create, change, or delete Azure network security groups: https://learn.microsoft.com/en-us/azure/virtual-network/manage-network-security-group
- Microsoft Learn: Azure network security groups overview and default security rules: https://learn.microsoft.com/en-us/azure/architecture/networking/guide/network-level-segmentation
- jq Manual: https://jqlang.org/manual/
- GNU Bash Reference Manual: https://www.gnu.org/software/bash/manual/bash.html
- ShellCheck SC2031 guidance on pipeline subshell variable loss: https://www.shellcheck.net/wiki/SC2031

## Issues Found
- The audit script only checked `sourceAddressPrefix`, so it could miss rules that use the plural `sourceAddressPrefixes` property. Updated the `jq` filter to inspect both singular and plural source fields and to display plural destination ports correctly.
- The copy script used `jq` expressions such as `.sourceAddressPrefixes | join(" ") // empty`, which can fail when the array field is null. Updated the script to normalize singular and plural address/port fields with null-safe `jq` expressions.
- The copy script built an Azure CLI command string and executed it with `eval`, which is brittle for quoted values and descriptions. Replaced it with a Bash array command and preserved source ports, destination prefixes, destination ports, application security groups, and description fields.
- The temporary rule cleanup script deleted every temporary rule whose description contained `expires`, regardless of whether the timestamp had passed. Updated it to store an ISO 8601 UTC expiry timestamp and delete only rules whose expiry is earlier than the current UTC time.
- The temporary rule cleanup counter was incremented inside a piped `while read` loop, so Bash could run the loop in a subshell and lose the updated value. Replaced the pipeline with process substitution so `CLEANED` is updated in the parent shell.
- The report generation script used null-unsafe `jq` joins for plural rule fields. Updated it to handle singular and plural source and destination port fields consistently.

## Review Notes
The Azure CLI command names and core flags are current and GA in the official Azure CLI reference. The local environment did not have Azure CLI installed, so command behavior was checked against Microsoft Learn rather than local `az --help` output. The scripts still assume `jq` is installed.
