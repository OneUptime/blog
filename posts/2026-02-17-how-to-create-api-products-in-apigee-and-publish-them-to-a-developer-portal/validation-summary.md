# Validation Summary: How to Create API Products in Apigee and Publish Them to a Developer Portal

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Apigee
- Apigee API products
- Apigee developer apps and developers
- Apigee integrated developer portal
- OpenAPI 3.0
- Apigee VerifyAPIKey and Quota policies
- curl and gcloud authentication

## Sources Consulted
- Apigee API products REST reference: https://docs.cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.apiproducts
- Apigee API products create method: https://docs.cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.apiproducts/create
- Apigee developers REST reference: https://docs.cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.developers
- Apigee developer apps REST reference: https://docs.cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.developers.apps
- Apigee portal management guide: https://docs.cloud.google.com/apigee/docs/api-platform/publish/portal/manage-portals
- Apigee portal API docs REST reference: https://docs.cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.sites.apidocs
- Apigee API documentation schema: https://docs.cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/ApiDocDocumentation
- Apigee publishing APIs guide: https://docs.cloud.google.com/apigee/docs/api-platform/publish/portal/publish-apis
- Apigee Quota policy reference: https://docs.cloud.google.com/apigee/docs/api-platform/reference/policies/quota-policy

## Issues Found
- The portal creation command used `POST /v1/organizations/YOUR_ORG/sites`, but the current Apigee documentation describes creating integrated portals through the Apigee in Cloud console. Replaced the invalid API command with the documented console workflow.
- The OpenAPI upload command created an API doc catalog item but did not upload the OpenAPI file contents. Updated the section to create the catalog item first, then call `organizations.sites.apidocs.updateDocumentation` with base64-encoded OpenAPI contents.
- The API docs examples used `weather-api-portal` directly as the site path segment. Replaced it with `YOUR_SITE_ID`, because Apigee portal API calls use the generated portal site ID.
- The developer app example used a top-level `displayName` field, but Apigee developer apps expose the UI display name as a `DisplayName` attribute. Moved the display name into the attributes list.
- The Quota policy XML nested `<Allow>`, `<Interval>`, and `<TimeUnit>` elements incorrectly. Replaced them with the documented element forms using fallback values and `ref` attributes.
- The Quota policy identifier used `client_id` directly. Updated it to the VerifyAPIKey policy-specific `verifyapikey.VerifyAPIKey.client_id` flow variable shown in Apigee's Quota policy examples.

## Review Notes
The API product, developer, app retrieval, and API product lifecycle management examples match current Apigee REST resource fields and HTTP methods. The examples still assume that the named environments and API proxies already exist, which is required by Apigee when products are bound to specific proxies and environments.
