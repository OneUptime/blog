# Validation Summary: How to Automate SharePoint Site Provisioning with Azure Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- SharePoint Online
- Azure Functions isolated worker
- Microsoft Graph API
- Microsoft Graph .NET SDK
- Azure CLI
- Microsoft Entra ID app registrations
- C#
- JSON Schema

## Sources Consulted
- Microsoft Learn: Azure CLI `az ad app permission` commands - https://learn.microsoft.com/en-us/cli/azure/ad/app/permission?view=azure-cli-lts
- Microsoft Learn: Microsoft Graph permissions reference - https://learn.microsoft.com/en-us/graph/permissions-reference
- Microsoft Learn: Manage groups in Microsoft Graph - https://learn.microsoft.com/en-us/graph/api/resources/groups-overview?view=graph-rest-1.0
- Microsoft Learn: Add members to a group - https://learn.microsoft.com/en-us/graph/api/group-post-members?view=graph-rest-1.0
- Microsoft Learn: Create a SharePoint list - https://learn.microsoft.com/en-us/graph/api/list-create?view=graph-rest-1.0
- Microsoft Learn: `columnDefinition` resource type - https://learn.microsoft.com/en-us/graph/api/resources/columndefinition?view=graph-rest-1.0
- Microsoft Learn: Get SharePoint site by path - https://learn.microsoft.com/en-us/graph/api/site-getbypath?view=graph-rest-1.0
- Microsoft Learn: Azure Functions HTTP trigger - https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook-trigger
- Microsoft Learn: Microsoft Graph `user: sendMail` - https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0

## Issues Found
- The Azure CLI setup created an app registration but never assigned `$APP_ID`, then used that variable in later commands. I changed the command to capture the app ID with `--query appId --output tsv`.
- The Azure CLI permission command repeated `--api-permissions`, while the official CLI syntax documents a space-separated list for that option. I changed it to a single `--api-permissions` argument with multiple permission IDs.
- The notification code sends mail through Microsoft Graph but the app permission setup omitted `Mail.Send`. I added the `Mail.Send` application permission ID.
- The owner/member resolution code reads users by UPN but the app permission setup omitted a user-read permission. I added `User.Read.All`.
- The group owner/member reference URLs used `/users/{id}`. Microsoft Graph documents `$ref` payloads using `/directoryObjects/{id}`, so I updated both references.
- The template service claimed to create pages/navigation while the code only creates lists, libraries, and columns. I corrected the comments and prose to match the implementation.
- The template snippet used nonexistent `ColumnDefinition` properties such as `Type` and `Choices`, and it used `ListInfo` instead of the SDK's `List` property on `Microsoft.Graph.Models.List`. I updated the sample to use real Graph SDK facets such as `Text`, `Choice`, `DateTime`, `Number`, and `PersonOrGroup`, and to pass the column collection into the list creation request.
- The template snippet referenced `ITemplateService`, `ApplyDepartmentTemplateAsync`, `ApplyDefaultTemplateAsync`, and `ListCreate` without defining them. I added compact definitions so the sample is coherent.

## Review Notes
The Azure CLI and .NET SDK examples were checked against current Microsoft Learn documentation. The local workspace does not have `az` or `dotnet` installed, so commands and snippets could not be executed locally.
