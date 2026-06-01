# Validation Summary: How to Use SharePoint Document Approval Workflows with Power Automate

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- SharePoint Online
- Power Automate approvals
- Microsoft Graph
- Microsoft Entra ID / Azure AD groups
- Azure CLI
- PnP PowerShell
- Workflow Definition Language JSON

## Sources Consulted
- PnP PowerShell `Connect-PnPOnline`: https://pnp.github.io/powershell/cmdlets/Connect-PnPOnline.html
- PnP PowerShell `Add-PnPField`: https://pnp.github.io/powershell/cmdlets/Add-PnPField.html
- PnP PowerShell `Set-PnPField`: https://pnp.github.io/powershell/cmdlets/Set-PnPField.html
- Azure CLI `az ad group`: https://learn.microsoft.com/en-us/cli/azure/ad/group
- Azure CLI `az ad group member`: https://learn.microsoft.com/en-us/cli/azure/ad/group/member
- Azure CLI `az ad user`: https://learn.microsoft.com/en-us/cli/azure/ad/user
- Microsoft Graph list group members: https://learn.microsoft.com/en-us/graph/api/group-list-members
- Power Automate custom approval responses: https://learn.microsoft.com/en-us/power-automate/create-approval-response-options
- Power Automate approval action differences: https://learn.microsoft.com/en-us/troubleshoot/power-platform/power-automate/approvals/differences-between-flow-approval-actions
- Azure Logic Apps workflow action schema: https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-workflow-actions-triggers

## Issues Found
- `Connect-PnPOnline -Interactive` now requires a client ID or configured environment variable in current PnP PowerShell guidance. Updated the example to include `-ClientId "<your-entra-app-client-id>"`.
- `Add-PnPField` does not support `-DefaultValue`. Split the choice field creation from the default value update by adding `Set-PnPField -Values @{DefaultValue = "Draft"}`.
- The Power Automate switch examples used case names as match values. Updated switch cases to include explicit `case` values and added a default terminate branch for unsupported document types.
- The approver list example used a `Select` shape that would not reliably produce a semicolon-delimited email string. Replaced it with initialized variables, Microsoft Graph user-member casting, `mail`/`userPrincipalName` fallback, and an array variable joined with semicolons.
- The approval request section implied that a create-only approval action would provide outcome, responder, and comments. Updated the prose and snippet to use `Start and wait for an approval` semantics with custom responses.
- The response switch used `Request_Changes` even though the configured custom response text is `Request Changes`. Updated the case value and added the missing SharePoint update path in the revision branch.
- The timeout example used a delay after the approval action, which would not escalate while a wait-for-approval action was still blocking. Replaced it with an action `limit.timeout` and an escalation action configured to run after timeout.

## Review Notes
The Azure CLI group commands and Graph group-member endpoint are current. The article still uses the older "Azure AD" term in the title and narrative; Microsoft documentation now generally uses "Microsoft Entra ID", but the `az ad` CLI namespace and many tenant/admin interfaces still use the older wording, so this is not a functional error.
