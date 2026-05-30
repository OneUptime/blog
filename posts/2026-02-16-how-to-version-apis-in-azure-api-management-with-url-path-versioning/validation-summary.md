# Validation Summary: How to Version APIs in Azure API Management with URL Path Versioning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure API Management
- API version sets
- URL path API versioning
- Azure API Management policies
- REST API versioning

## Sources Consulted
- Microsoft Learn: Versions in Azure API Management - https://learn.microsoft.com/en-us/azure/api-management/api-management-versions
- Microsoft Learn: Tutorial: Publish multiple versions of your API - https://learn.microsoft.com/en-us/azure/api-management/api-management-get-started-publish-versions
- Microsoft Learn: Azure API Management policy expressions - https://learn.microsoft.com/en-gb/azure/api-management/api-management-policy-expressions
- Microsoft Learn: Set backend service policy - https://learn.microsoft.com/en-us/azure/api-management/set-backend-service-policy
- Microsoft Learn: Choose policy - https://learn.microsoft.com/en-us/azure/api-management/choose-policy
- Microsoft Learn: Rate limit policy - https://learn.microsoft.com/en-us/azure/api-management/rate-limit-policy
- Microsoft Learn: Return response policy - https://learn.microsoft.com/en-us/azure/api-management/return-response-policy
- Microsoft Learn: Set or edit Azure API Management policies - https://learn.microsoft.com/en-us/azure/api-management/set-edit-policies
- Microsoft Learn: API Management REST API create/update API - https://learn.microsoft.com/en-us/rest/api/apimanagement/apis/create-or-update?view=rest-apimanagement-2024-05-01

## Issues Found
- Corrected the URL path versioning examples to match Azure API Management's documented path format, where the version identifier is added after the API path, such as `/orders/v1`.
- Corrected the migration description for an existing unversioned API. Microsoft documents that adding a version keeps the existing API as the `Original` version at the default URL and creates a new versioned API that requires the version identifier.
- Corrected the "new version is a blank slate" wording. APIM creates a new API/version based on an existing API or revision, and the REST API supports copying operations from a source API.
- Fixed the `choose` policy XML snippet so the `condition` attributes are well-formed XML while still using valid APIM policy expressions.
- Added the `Original` version caveat to the unversioned base URL section, because APIM only returns 404 at the base path by default when the API was created with versioning enabled from the start or when no base-path API exists.

## Review Notes
The policy snippets use APIM-supported policies and context members, including `context.Api.Version`, `set-backend-service`, `rate-limit`, `set-header`, and `return-response`. The `rate-limit` examples are valid but apply per subscription and only when the API is accessed with a subscription key, which may be worth calling out in a future expanded version of the article.
