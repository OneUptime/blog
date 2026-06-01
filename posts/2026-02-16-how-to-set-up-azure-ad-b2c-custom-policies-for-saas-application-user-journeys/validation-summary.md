# Validation Summary: How to Set Up Azure AD B2C Custom Policies for SaaS Application User Journeys

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure AD B2C custom policies
- Identity Experience Framework
- Microsoft Graph trustFrameworkPolicy API
- Azure CLI `az rest`
- Azure Functions for Python
- XML policy configuration
- REST API technical profiles
- Self-asserted technical profiles
- Claims transformations
- Conditional MFA

## Sources Consulted
- Microsoft Learn: Azure AD B2C custom policy overview - https://learn.microsoft.com/en-us/azure/active-directory-b2c/custom-policy-overview
- Microsoft Learn: RESTful technical profile in Azure AD B2C custom policy - https://learn.microsoft.com/en-us/azure/active-directory-b2c/restful-technical-profile
- Microsoft Learn: Self-asserted technical profile in Azure AD B2C custom policy - https://learn.microsoft.com/en-us/azure/active-directory-b2c/self-asserted-technical-profile
- Microsoft Learn: Validation technical profile in Azure AD B2C custom policy - https://learn.microsoft.com/en-us/azure/active-directory-b2c/validation-technical-profile
- Microsoft Learn: String claims transformations, including `ParseDomain` - https://learn.microsoft.com/en-us/azure/active-directory-b2c/string-transformations
- Microsoft Learn: Validate user inputs by using Azure AD B2C custom policy - https://learn.microsoft.com/en-us/azure/active-directory-b2c/custom-policies-series-validate-user-input
- Microsoft Graph beta: Update or create trustFrameworkPolicy - https://learn.microsoft.com/en-us/graph/api/trustframework-put-trustframeworkpolicy?view=graph-rest-beta
- Microsoft Graph beta: Create trustFrameworkPolicy - https://learn.microsoft.com/en-us/graph/api/trustframework-post-trustframeworkpolicy?view=graph-rest-beta
- Microsoft Learn: Python developer reference for Azure Functions - https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-python
- Azure Samples: Azure AD B2C custom policy starter pack - https://github.com/Azure-Samples/active-directory-b2c-custom-policy-starterpack

## Issues Found
- Azure AD B2C availability caveat was missing for a 2026 post. Added Microsoft’s May 1, 2025 new-customer availability note while preserving guidance for existing tenants.
- The starter pack folder used `SocialAndLocalAccounts`, but the MFA example references `PhoneFactor-InputOrVerify`, which is defined in `SocialAndLocalAccountsWithMfa`. Updated the setup command accordingly.
- RESTful and self-asserted technical profile handlers omitted `PublicKeyToken=null`. Updated handler strings to match Microsoft’s documented fully qualified provider names.
- Several REST technical profiles omitted required `AuthenticationType` metadata or referenced bearer authentication without a key. Updated examples to use `ApiKeyHeader` with a `B2C_1A_RestApiKey` policy key.
- The self-asserted profile used only `OutputClaims` for user input collection. Added `DisplayClaims`, which current Microsoft documentation recommends for collecting self-asserted input.
- The progressive profile journey attempted to write SaaS-specific profile fields with the built-in `AAD-UserWriteProfileUsingObjectId` profile. Replaced that step with a REST save profile technical profile to match the sample’s SaaS profile API flow.
- The domain validation REST profile did not invoke the `ParseDomain` transformation before sending `emailDomain`. Added `InputClaimsTransformations`.
- Custom claims used later in the article were not all declared. Added `emailDomain`, `isBusinessEmail`, `requiresMfa`, and `subscriptionTier` to the claims schema snippet.
- The Azure Functions Python snippet used the v2 decorator model but did not define imports or the `FunctionApp` instance. Added `json`, `azure.functions`, and `app = func.FunctionApp()`.
- Microsoft Graph upload URLs were missing the required `/$value` segment. Updated the `az rest` commands and used single-quoted URLs so the shell does not expand `$value`.

## Review Notes
The Microsoft Graph trustFrameworkPolicy APIs used for custom policy upload are still under the `/beta` endpoint, which Microsoft documents as preview and not supported for production applications. The post now remains technically valid, but readers should treat automated custom policy deployment through Graph beta as version-sensitive.
