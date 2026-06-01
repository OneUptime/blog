# Validation Summary: How to Use SCIM Provisioning for SaaS Apps with Azure AD and Azure Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- SCIM 2.0
- Microsoft Entra ID / Azure AD provisioning
- Azure Functions HTTP triggers
- Python
- OAuth 2.0 bearer token authentication

## Sources Consulted
- Microsoft Learn: Tutorial - Develop a SCIM endpoint for user provisioning to apps from Microsoft Entra ID, https://learn.microsoft.com/en-us/entra/identity/app-provisioning/use-scim-to-provision-users-and-groups
- Microsoft Learn: Understand how application provisioning works in Microsoft Entra ID, https://learn.microsoft.com/en-us/entra/identity/app-provisioning/how-provisioning-works
- Microsoft Learn: Azure Functions HTTP trigger, https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook-trigger
- Microsoft Learn: azure.functions.decorators.FunctionApp class, https://learn.microsoft.com/en-us/python/api/azure-functions/azure.functions.decorators.functionapp
- IETF RFC 7644: System for Cross-domain Identity Management Protocol, https://www.rfc-editor.org/rfc/rfc7644
- IETF RFC 7643: System for Cross-domain Identity Management Core Schema, https://www.rfc-editor.org/rfc/rfc7643

## Issues Found
- The post said Azure AD polls the SCIM endpoint when an admin makes a change. Microsoft documentation describes periodic provisioning cycles, with later syncs occurring approximately every 40 minutes while the service is running. Updated the wording to avoid implying immediate polling on every admin change.
- The endpoint list omitted SCIM discovery endpoints. Added `/ServiceProviderConfig` and `/Schemas`, which are defined by RFC 7644 and relevant to Microsoft Entra SCIM integrations.
- The Azure Functions sample used the default `FunctionApp()` authorization level, which requires a function key by default. Updated it to `func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)` so SCIM bearer-token authentication can be handled by the application code.
- The Python snippets used `datetime.utcnow()`, which is deprecated in modern Python. Replaced it with `datetime.now(timezone.utc)` and imported `timezone`.
- The SCIM error response used a numeric `status` field. RFC 7644 examples and schema define the error `status` value as a string, so the examples now use string values.
- The SCIM filter regex did not support dotted attribute paths such as `emails.value`, even though the mapping table included that attribute. Updated the regex to support dotted attributes, case-insensitive operators, and anchored quoted values.
- The bearer-token snippet referenced `os.environ` without importing `os`. Added the missing import.
- The OAuth production guidance implied a generic Azure AD API/client-credentials setup. Updated it to match Microsoft Entra gallery guidance that OAuth 2.0 client credentials are configured per customer with their own client ID and client secret.

## Review Notes
The sample remains intentionally illustrative: helper functions such as `save_user`, `find_user_by_id`, and token validation must be implemented for a real deployment. A production SCIM service should also fully implement the advertised group and discovery endpoints, validate tokens robustly, return consistent SCIM error bodies, and apply tenant isolation in all database queries.
