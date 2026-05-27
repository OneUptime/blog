# Validation Summary: How to Set Up App Engine Identity-Aware Proxy for Zero-Trust Application Access

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud
- App Engine
- Identity-Aware Proxy
- IAM
- gcloud CLI
- OAuth 2.0
- IAP signed JWT headers
- Python Flask
- Node.js Express
- App Engine dispatch.yaml
- Cloud Logging

## Sources Consulted
- Google Cloud documentation: Enabling IAP for App Engine, https://docs.cloud.google.com/iap/docs/enabling-app-engine
- Google Cloud documentation: Securing your app with signed headers, https://docs.cloud.google.com/iap/docs/signed-headers-howto
- Google Cloud documentation: Programmatic authentication for IAP, https://docs.cloud.google.com/iap/docs/authentication-howto
- Google Cloud documentation: Use custom OAuth clients with IAP, https://docs.cloud.google.com/iap/docs/custom-oauth-configuration
- Google Cloud documentation: Enable IAP using a Google-managed OAuth client, https://docs.cloud.google.com/iap/docs/managed-oauth-client
- Google Cloud SDK reference: gcloud iap web enable, https://docs.cloud.google.com/sdk/gcloud/reference/iap/web/enable
- Google Cloud SDK reference: gcloud iap web add-iam-policy-binding, https://docs.cloud.google.com/sdk/gcloud/reference/iap/web/add-iam-policy-binding
- Google Cloud documentation: App Engine ingress settings, https://docs.cloud.google.com/appengine/docs/standard/ingress-settings
- Google Cloud documentation: App Engine flexible environment health checks, https://docs.cloud.google.com/appengine/docs/flexible/how-instances-are-managed

## Issues Found
- The post stated that OAuth consent screen configuration is required even for internal applications. Updated this to clarify that consent screen configuration is required for custom OAuth clients, while internal browser-only App Engine access can use a Google-managed OAuth client.
- The service-account caller example used `AuthorizedSession` and set a private `_target_audience` attribute, which does not correctly create an IAP ID token. Replaced it with the documented `google.oauth2.id_token.fetch_id_token()` flow and an `Authorization: Bearer` header.
- The service-account section omitted an important caveat for Google-managed OAuth clients. Added that programmatic access is blocked by default unless an OAuth client is allowlisted or a service account JWT flow is used.
- The per-service section incorrectly said IAP can be enabled selectively for individual App Engine services with `gcloud iap web enable --service=admin`. Updated it to reflect the documented model: enable IAP for the application and grant service-level access, including `allUsers` for services that should remain public.
- The login customization section used an invalid `gcloud iap settings set` command with OAuth client flags. Replaced it with the supported `gcloud iap web enable --oauth2-client-id --oauth2-client-secret` form.
- The unauthenticated endpoint guidance claimed `/_ah/health` is always accessible regardless of IAP settings. Reworded this to the more accurate general claim that App Engine health checks do not require user authentication through IAP, and adjusted the dispatch example comments to match the App Engine-wide IAP model.

## Review Notes
The local workspace does not have `gcloud` installed, so CLI checks were performed against the official Google Cloud SDK reference instead of local `--help` output.
