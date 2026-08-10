# Validation Summary: How to Fix AADSTS7000215 Without Confusing the Client Secret Value and Secret ID

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Microsoft Entra ID application registrations and service principals
- Microsoft Graph `passwordCredential`, `addPassword`, and `removePassword` APIs
- OAuth 2.0 client credentials and authorization code token requests
- Azure CLI (`az account` and `az ad app`)
- curl form encoding and standard-input handling
- Managed identities, workload identity federation, certificates, and client secrets
- Kubernetes Secrets, Azure App Service deployment slots, and Azure Key Vault references

## Sources Consulted
- Microsoft Entra authentication and authorization error codes: https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes
- Azure Identity authentication troubleshooting, including the AADSTS7000215 Secret Value/Secret ID diagnostic: https://learn.microsoft.com/en-us/azure/developer/java/sdk/troubleshooting-authentication-overview
- Microsoft Graph `passwordCredential` resource: https://learn.microsoft.com/en-us/graph/api/resources/passwordcredential?view=graph-rest-1.0
- Microsoft Graph application `addPassword` and `removePassword`: https://learn.microsoft.com/en-us/graph/api/application-addpassword?view=graph-rest-1.0 and https://learn.microsoft.com/en-us/graph/api/application-removepassword?view=graph-rest-1.0
- Microsoft Graph service principal `addPassword` and `removePassword`: https://learn.microsoft.com/en-us/graph/api/serviceprincipal-addpassword?view=graph-rest-1.0 and https://learn.microsoft.com/en-us/graph/api/serviceprincipal-removepassword?view=graph-rest-1.0
- Add and manage application credentials in Microsoft Entra ID: https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-credentials
- Application and service principal objects in Microsoft Entra ID: https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals
- Retirement of service principal-less authentication: https://learn.microsoft.com/en-us/entra/identity-platform/retire-service-principal-less-authentication
- OAuth 2.0 client credentials flow on the Microsoft identity platform: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow
- Microsoft identity platform authorization code flow: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
- Application-registration security best practices and workload identity federation: https://learn.microsoft.com/en-us/entra/identity-platform/security-best-practices-for-app-registration and https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation
- Credential rotation recommendation and service-principal sign-in logs: https://learn.microsoft.com/en-us/entra/identity/monitoring-health/recommendation-renew-expiring-application-credential and https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-service-principal-sign-ins
- App-registration deactivation and existing-token behavior: https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/deactivate-app-registration
- Azure CLI `az account show` and `az ad app show`: https://learn.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest#az-account-show and https://learn.microsoft.com/en-us/cli/azure/ad/app?view=azure-cli-latest#az-ad-app-show
- curl command-line manual and known risks: https://curl.se/docs/manpage.html and https://curl.se/docs/knownrisks.html
- OAuth 2.0 Authorization Framework, RFC 6749: https://www.rfc-editor.org/rfc/rfc6749.html
- WHATWG URL Standard form parser/serializer: https://url.spec.whatwg.org/#application/x-www-form-urlencoded
- Kubernetes Secret consumption and volume behavior: https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/ and https://kubernetes.io/docs/concepts/storage/volumes/
- Azure App Service deployment slots and Key Vault references: https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots and https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references#understand-rotation

## Issues Found
1. The opening inferred that AADSTS7000215 guarantees the application was found and called Secret ID confusion the most common cause. The official definition does not guarantee that inference or rank causes by frequency. It now states that client authentication was rejected because the secret or authentication parameters were invalid and calls Secret ID confusion a common cause.
2. The post said to always use the AADSTS number instead of the generic OAuth error. Microsoft documents AADSTS numbers as diagnostic data that applications should not depend on. The text now says to preserve the AADSTS number for diagnosis while reacting to the OAuth `error` field in application logic.
3. The runtime tuple incorrectly required the authority tenant to contain the app registration. A multitenant client can request a token from an authorized customer tenant while its application object remains in the publisher's home tenant. The tuple now identifies the authority as the tenant where the app operates and where its service principal exists.
4. The same tuple and fast checklist assumed every password credential belonged to an application object, despite the post correctly discussing service-principal-owned credentials. They now allow the exact credential-owning service principal, and the Azure CLI application lookup is explicitly scoped to app-registration-owned credentials.
5. The multitenant explanation omitted the current service-principal requirement. It now notes that, since March 2026, Microsoft Entra blocks non-Microsoft multitenant app-only authentication when the target tenant has no service principal for the client.
6. The phrase "raw authorization-code request" could be read as placing a secret on the `/authorize` request. It now correctly refers to the token request that redeems an authorization code.
7. The form-encoding explanation grouped `=` with characters that change standard form parsing when left raw. Standard parsing splits a pair at its first `=`, so a later `=` remains part of the value. The post now accurately identifies raw `+`, `&`, and `%` as parsing hazards while still directing the encoder to handle the entire value, including `=`.
8. The curl diagnostic prints a successful token response, including an access token, to standard output. A warning was added to run it only in a secure interactive environment and not route or publish its output through shared logs.
9. The conclusion said the secret must belong to the configured client and tenant, which was ambiguous for a multitenant client whose application credential is owned in its home tenant while the authority is a customer tenant. It now separates credential ownership from authority-tenant selection.

## Review Notes
- The Azure CLI commands and all curl options are current and syntactically valid. `az ad app show --id` accepts an application ID, object ID, or identifier URI.
- `curl --fail-with-body` was introduced in curl 7.76.0. It is current and nondeprecated, but older curl installations need an upgrade or a different failure-handling pattern.
- The Azure CLI checks use the currently selected account and tenant context; operators must sign in to or select the expected home tenant before using the application lookup.
- Kubernetes Secret environment variables require a container restart to refresh. Mounted Secret files update eventually unless mounted through `subPath`, and an application that caches file contents still needs reload support. The post's broader restart/reload warning is correct.
- All external links in the post resolved successfully during validation. No deprecated Microsoft Graph API, OAuth endpoint, Azure CLI command, or curl option was found.
