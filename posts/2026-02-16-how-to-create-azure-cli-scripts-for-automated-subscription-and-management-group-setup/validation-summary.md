# Validation Summary: How to Create Azure CLI Scripts for Automated Subscription

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure CLI
- Azure management groups
- Azure subscription aliases
- Azure billing scopes for Enterprise Agreement and Microsoft Customer Agreement
- Bash shell scripting
- JSON and jq
- Azure resource provider registration
- Azure tags
- Azure consumption budgets

## Sources Consulted
- Azure management groups overview: https://learn.microsoft.com/en-us/azure/governance/management-groups/overview
- Azure CLI management group commands: https://learn.microsoft.com/en-us/cli/azure/account/management-group
- Azure CLI management group subscription commands: https://learn.microsoft.com/en-us/cli/azure/account/management-group/subscription
- Programmatically create Azure Enterprise Agreement subscriptions: https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/programmatically-create-subscription-enterprise-agreement
- Programmatically create Azure Microsoft Customer Agreement subscriptions: https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/programmatically-create-subscription-microsoft-customer-agreement
- Azure CLI account alias commands: https://learn.microsoft.com/en-us/cli/azure/account/alias
- Azure CLI billing enrollment account commands: https://learn.microsoft.com/en-us/cli/azure/billing/enrollment-account
- Azure CLI billing profile and invoice section commands: https://learn.microsoft.com/en-us/cli/azure/billing/profile
- Azure CLI tag commands: https://learn.microsoft.com/en-us/cli/azure/tag
- Azure CLI consumption budget commands: https://learn.microsoft.com/en-us/cli/azure/consumption/budget
- Azure CLI provider commands: https://learn.microsoft.com/en-us/cli/azure/provider

## Issues Found
- The post referred to an "Azure Active Directory tenant." Updated this to "Microsoft Entra tenant" to match current Microsoft terminology.
- The prerequisites used a generic "Subscription Creator role" phrase. Updated it to distinguish the MCA Azure subscription creator role on an invoice section from EA Enterprise Administrator or enrollment account Owner permissions.
- The prerequisites listed only the `account` CLI extension. Microsoft's subscription alias guidance documents both `account` and `alias` extension installation, so the post now lists and installs both.
- The management group hierarchy script queried the root management group by the display name `Tenant Root Group`, which is fragile and casing-dependent. Updated it to use the tenant ID from `az account show`, which is the documented root management group ID.
- The EA subscription script built the billing scope as `/providers/Microsoft.Billing/enrollmentAccounts/{id}`, which is not the latest documented EA billing scope format. Updated it to use the full enrollment account resource ID returned by `az billing enrollment-account list`.
- The subscription assignment command used `--subscription-id`, but `az account management-group subscription add` requires `--subscription`. Updated the command accordingly.
- Removed the unused `sub_offer` variable from the subscription creation function because `az account alias create` does not accept an offer parameter.
- The budget creation example used `Cost` and `Monthly`; the current Azure CLI reference documents lowercase `cost` and `monthly`. Updated the example to match the documented accepted values.

## Review Notes
The local environment did not have Azure CLI installed, so command verification was performed against official Microsoft Learn Azure CLI references rather than local `az --help` output. Some billing command groups are marked preview in the Azure CLI reference, which is worth noting for production automation.
