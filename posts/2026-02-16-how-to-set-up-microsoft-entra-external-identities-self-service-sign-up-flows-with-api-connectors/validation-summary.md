# Validation Summary: How to Set Up Microsoft Entra External Identities Self-Service Sign-Up Flows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Entra External ID / External Identities
- B2B collaboration self-service sign-up user flows
- Microsoft Graph PowerShell
- Microsoft Graph REST API
- API connectors
- Azure Functions
- Kusto Query Language (KQL)

## Sources Consulted
- Microsoft Learn: Add self-service sign-up user flows for B2B collaboration - https://learn.microsoft.com/en-us/entra/external-id/self-service-sign-up-user-flow
- Microsoft Learn: Add an API connector to a user flow - https://learn.microsoft.com/en-us/entra/external-id/self-service-sign-up-add-api-connector
- Microsoft Learn: Secure your API used as an API connector - https://learn.microsoft.com/en-us/entra/external-id/self-service-sign-up-secure-api-connector
- Microsoft Graph: authenticationFlowsPolicy resource type - https://learn.microsoft.com/en-us/graph/api/resources/authenticationflowspolicy
- Microsoft Graph: identityApiConnector resource type - https://learn.microsoft.com/en-us/graph/api/resources/identityapiconnector
- Microsoft Graph: Create identityApiConnector - https://learn.microsoft.com/en-us/graph/api/identityapiconnector-create
- Microsoft Graph PowerShell: New-MgIdentityUserFlowAttribute - https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.identity.signins/new-mgidentityuserflowattribute
- Microsoft Graph PowerShell: New-MgIdentityB2XUserFlow - https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.identity.signins/new-mgidentityb2xuserflow
- Azure Functions: Work with access keys - https://learn.microsoft.com/en-us/azure/azure-functions/function-keys-how-to
- Azure Functions: HTTP trigger - https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook-trigger

## Issues Found
- The tenant-level self-service sign-up check used `policies/authorizationPolicy` and `allowedToSignUpEmailBasedSubscriptions`, which is not the documented setting for guest self-service sign-up user flows. Changed it to query `policies/authenticationFlowsPolicy` and `selfServiceSignUp.isEnabled`.
- The custom user attribute examples used `dataType = "String"`. Microsoft Graph examples use the lowercase enum value `string`, so the snippets were corrected.
- The Azure Function/API connector section treated an Azure Functions access key as the API connector Basic authentication password. Azure Functions keys are sent with `code` or `x-functions-key`; API connectors send Basic credentials in the `Authorization` header. Updated the text and sample connector URL/password placeholder to distinguish the two mechanisms.
- The returned custom attribute placeholder used `extension_<app-id>_PartnerRole`. Microsoft documents custom attributes in the `extension_<extensions-app-id>_AttributeName` format, so the placeholder was corrected.
- The API connector authentication text mentioned client credentials. Microsoft Graph API connectors support Basic authentication and PKCS #12 client certificate authentication, so the wording was changed to certificate-based authentication.
- The user flow PowerShell example only built a hashtable and said full creation required beta. Microsoft Graph v1.0 and Graph PowerShell support creating `b2xIdentityUserFlow`; the snippet now calls `New-MgIdentityB2XUserFlow` and uses the unprefixed flow name because Graph adds the `B2X_1_` prefix.
- The identity provider guidance incorrectly implied Email one-time passcode must be enabled at minimum. Microsoft Entra ID is the default provider; the text now treats Email OTP and social providers as optional additions.
- The application assignment section showed a nonfunctional `selfServiceSignUp` service principal update pattern. Replaced it with the documented admin center path for adding an application to a user flow.
- The monitoring section said the API connector timeout is around 10 seconds. Microsoft documentation states Microsoft Entra ID waits up to 20 seconds and retries once, so this was corrected.

## Review Notes
- The post is technically relevant and includes implementation details, commands, and code examples.
- The Python examples are illustrative and syntactically valid, but production deployments should add explicit Basic authentication or client certificate validation logic in the API endpoint, as noted in the corrected text.
