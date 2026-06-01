# Validation Summary: How to Query Microsoft Graph API from Azure Functions to Manage User Profiles

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Graph API
- Microsoft Graph .NET SDK
- Azure Functions
- Azure Functions Core Tools
- Azure Identity
- Microsoft Entra ID app registrations
- OAuth 2.0 client credentials and on-behalf-of flows
- C# and .NET

## Sources Consulted
- Microsoft Graph SDK authentication providers: https://learn.microsoft.com/en-us/graph/sdks/choose-authentication-providers
- Microsoft Graph .NET client creation: https://learn.microsoft.com/en-us/graph/sdks/create-client
- Microsoft Graph list users API: https://learn.microsoft.com/en-us/graph/api/user-list
- Microsoft Graph user update API: https://learn.microsoft.com/en-us/graph/api/user-update
- Microsoft Graph users resource documentation: https://learn.microsoft.com/en-us/graph/api/resources/users
- Microsoft Graph user transitive memberships API: https://learn.microsoft.com/en-us/graph/api/user-list-transitivememberof
- Microsoft Graph SDK paging documentation: https://learn.microsoft.com/en-us/graph/sdks/paging
- Microsoft Graph SDK batch request documentation: https://learn.microsoft.com/en-us/graph/sdks/batch-requests
- Microsoft Graph throttling guidance: https://learn.microsoft.com/en-us/graph/throttling
- Microsoft Graph error responses: https://learn.microsoft.com/en-us/graph/errors
- Azure Functions local development with Core Tools: https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local
- Azure Functions Core Tools reference: https://learn.microsoft.com/en-us/azure/azure-functions/functions-core-tools-reference

## Issues Found
- The Azure portal navigation used the retired "Azure Active Directory" label. Changed it to "Microsoft Entra ID" to match current Microsoft documentation and portal naming.
- The Azure Functions project creation command used `func init GraphUserFunctions --dotnet`, which is not the current documented Core Tools option. Changed it to `func init GraphUserFunctions --worker-runtime dotnet`.
- The app-only Graph client helper omitted the `https://graph.microsoft.com/.default` scope required by the documented client credentials provider pattern. Added the scope when constructing `GraphServiceClient`.
- The pagination example processed the first page manually and then passed the same page to `PageIterator`, which would process the first page again. Removed the manual first-page loop because `PageIterator` processes the initial page and subsequent pages.
- The search example described `$search` as fuzzy matching and omitted `$count=true`. Microsoft Graph directory `$search` uses documented search/tokenization semantics and requires `ConsistencyLevel: eventual` plus `$count`. Updated the description and added `Count = true`.
- The bulk update example counted every batched update as successful without inspecting individual batch subresponses. Stored batch request IDs and checked each `HttpResponseMessage.IsSuccessStatusCode` before incrementing success or failure counts.
- The throttling helper caught `ServiceException`, which is not the current Microsoft Graph .NET SDK v5 error type for Graph API errors. Updated it to catch `Microsoft.Graph.Models.ODataErrors.ODataError`.

## Review Notes
- The examples use the Azure Functions in-process C# model (`Microsoft.Azure.WebJobs`). This is still technically coherent for the shown code, but Microsoft recommends isolated worker for newer .NET Azure Functions projects.
- The snippets are illustrative and omit some surrounding model classes and `using` directives, such as `UserProfile`, `BulkUpdateItem`, and `UserUpdateRequest`.
