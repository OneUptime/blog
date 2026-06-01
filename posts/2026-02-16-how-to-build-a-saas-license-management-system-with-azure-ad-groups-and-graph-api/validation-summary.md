# Validation Summary: How to Build a SaaS License Management System with Azure AD Groups and Graph API

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Microsoft Graph API
- Microsoft Entra ID / Azure AD groups
- Microsoft Entra B2B guest invitations
- OAuth 2.0 client credentials flow
- Azure Functions Python v2 programming model
- Python requests
- SaaS license and subscription management

## Sources Consulted
- Microsoft Graph create group documentation: https://learn.microsoft.com/en-us/graph/api/group-post-groups?view=graph-rest-1.0
- Microsoft Graph group resource documentation: https://learn.microsoft.com/en-us/graph/api/resources/group?view=graph-rest-1.0
- Microsoft Graph add members documentation: https://learn.microsoft.com/en-us/graph/api/group-post-members?view=graph-rest-1.0
- Microsoft Graph remove member documentation: https://learn.microsoft.com/en-us/graph/api/group-delete-members?view=graph-rest-1.0
- Microsoft Graph list group members documentation: https://learn.microsoft.com/en-us/graph/api/group-list-members?view=graph-rest-1.0
- Microsoft Graph list users documentation: https://learn.microsoft.com/en-us/graph/api/user-list?view=graph-rest-1.0
- Microsoft Graph filter query parameter documentation: https://learn.microsoft.com/en-us/graph/filter-query-parameter
- Microsoft Graph query parameters documentation: https://learn.microsoft.com/en-us/graph/query-parameters
- Microsoft Graph create invitation documentation: https://learn.microsoft.com/en-us/graph/api/invitation-post?view=graph-rest-1.0
- Microsoft Graph list a user's direct memberships documentation: https://learn.microsoft.com/en-us/graph/api/user-list-memberof?view=graph-rest-1.0
- Azure Functions Python developer reference: https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-python

## Issues Found
- The license assignment handler could dereference `user["id"]` after a failed guest invitation. Added a failure response when `invite_guest_user` returns no user.
- The user lookup built the `$filter` directly into the URL and did not escape single quotes in OData string literals. Updated it to escape the email value and pass `$filter` and `$select` as query parameters.
- The group membership helper treated every `400 Bad Request` from `POST /groups/{id}/members/$ref` as success. Microsoft Graph also returns `400` for unsupported or invalid member additions, so the code now only accepts `204` or a `400` whose error message indicates the object reference already exists.
- The license check used only the first page of `/users/{id}/memberOf` results and described them as all groups. Updated the example to state that it checks direct groups and to follow `@odata.nextLink` pagination.

## Review Notes
The article remains a simplified tutorial and still assumes supporting application code exists for subscription storage, authentication/session handling, route protection, and billing. In a production implementation, the app registration also needs the appropriate Microsoft Graph application permissions and tenant admin consent for the Graph operations used.
