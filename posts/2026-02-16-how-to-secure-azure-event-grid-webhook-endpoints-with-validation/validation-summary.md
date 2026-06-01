# Validation Summary: How to Secure Azure Event Grid Webhook Endpoints with Validation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Event Grid
- Event Grid webhook endpoint validation
- Azure CLI
- Microsoft Entra ID authentication
- Azure Functions isolated worker for C#
- JWT validation with Microsoft.IdentityModel
- Bicep Event Grid event subscription resources

## Sources Consulted
- Azure Event Grid endpoint validation with Event Grid schema: https://learn.microsoft.com/en-us/azure/event-grid/end-point-validation-event-grid-events-schema
- Azure Event Grid event delivery authentication: https://learn.microsoft.com/en-us/azure/event-grid/security-authentication
- Azure Event Grid secure webhook delivery with Microsoft Entra ID: https://learn.microsoft.com/en-us/azure/event-grid/secure-webhook-delivery
- Azure CLI `az eventgrid event-subscription create` reference: https://learn.microsoft.com/en-us/cli/azure/eventgrid/event-subscription?view=azure-cli-latest
- Event Grid ARM/Bicep event subscription destination and delivery attribute mapping reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.eventgrid/systemtopics/eventsubscriptions
- Microsoft.IdentityModel token validation API reference: https://learn.microsoft.com/en-us/dotnet/api/microsoft.identitymodel.tokens.securitytokenhandler.validatetoken

## Issues Found
- The Entra authentication command incorrectly added a static `Authorization` delivery attribute mapping. Event Grid adds the bearer token through the `--azure-active-directory-tenant-id` and `--azure-active-directory-application-id-or-uri` webhook settings, so the static header mapping was removed.
- The Entra setup omitted the required authorization relationship for secure webhook delivery. Added a concise note that the subscription writer must be an owner of, or assigned an app role on, the webhook application's service principal, using the `AzureEventGridSecureWebhookSubscriber` role from the official setup.
- The JWT validation example enabled issuer signing key validation but did not supply signing keys. Updated it to retrieve OpenID Connect metadata and use the issuer signing keys from Microsoft identity platform metadata.
- The JWT validation example used `GetValues` directly on the `Authorization` header, which can fail when the header is absent. Updated it to use `TryGetValues`.
- The post implied managed identity authentication for this Event Grid event subscription webhook flow. Adjusted the wording to state that Event Grid includes a Microsoft Entra bearer token for deliveries.

## Review Notes
- Azure CLI was not installed in the local environment, so CLI flags were verified against the official Azure CLI reference instead of local `az --help` output.
- The validation handshake details are correct for Event Grid schema delivery. If the post later covers CloudEvents v1.0 delivery, endpoint validation differs and uses the CloudEvents abuse-protection flow.
