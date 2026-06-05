# Validation Summary: How to Configure OAuth2 Client Auth Extension in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib OAuth2 Client Credentials Authenticator Extension
- OTLP HTTP exporter authentication
- OAuth 2.0 Client Credentials grant
- Azure Active Directory / Microsoft identity platform
- Google Cloud exporter authentication
- Kubernetes Secrets and Deployments

## Sources Consulted
- OpenTelemetry Collector Contrib OAuth2 Client Credentials Authenticator Extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/oauth2clientauthextension
- OpenTelemetry Collector Contrib OAuth2 Client Credentials Authenticator Extension source: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/oauth2clientauthextension
- OpenTelemetry Collector Debug Exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry Collector routing processor documentation on pkg.go.dev: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/routingprocessor
- OpenTelemetry Collector Google Cloud exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/googlecloudexporter
- RFC 6749, OAuth 2.0 Client Credentials Grant: https://www.rfc-editor.org/rfc/rfc6749
- Microsoft identity platform client credentials flow: https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow
- Microsoft identity platform scopes and `.default`: https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc

## Issues Found
- The architecture diagram described renewal as a refresh-token request. In the client credentials grant, RFC 6749 says refresh tokens should not be included, so the diagram now shows another client credentials token request.
- The advanced configuration stated that token request timeout defaults to 5 seconds. The extension documentation states that leaving it unset means no client timeout, so the comment was corrected and `expiry_buffer` was added as the actual default 5 minute renewal buffer.
- The routing processor example read `deployment.environment` as the default context attribute and omitted required pipeline exporters. It now sets `attribute_source: resource` and lists the routed exporters in the pipeline.
- The Azure AD v2.0 example mixed `.default` scopes with the v1 `resource` parameter. The `endpoint_params.resource` example was removed and replaced with a note that the v2 endpoint uses `scope`.
- The Google Cloud example configured the `googlecloud` exporter with the OAuth2 client auth extension. The exporter uses Google Cloud Application Default Credentials, Workload Identity, or service account key authentication, so the example was corrected.
- A custom authorization server example placed `grant_type: client_credentials` in `endpoint_params`. The extension has a first-class `grant_type` field and defaults to client credentials, so the duplicate endpoint parameter was removed.
- The production example used `${file:/...}` for plain client ID and secret files. The extension supports `client_id_file` and `client_secret_file` for this purpose, so those fields were used.
- The production multi-signal `otlphttp` exporter used a trace-specific `/v1/traces` endpoint for traces, metrics, and logs. It now uses the base OTLP HTTP endpoint so the exporter can derive the signal-specific paths.
- The production troubleshooting exporter used the removed/deprecated `logging` exporter and deprecated `loglevel` field. It now uses the current `debug` exporter with `verbosity`.
- The token lifecycle section claimed token acquisition happens immediately at Collector startup and that the extension itself performs exponential-backoff retries. The source shows tokens are requested when authenticated exporter requests need them, and retry behavior is provided by exporter retry settings, so the text was corrected.

## Review Notes
The OAuth2 client credentials extension is available in the contrib and k8s Collector distributions and is currently beta. The routing processor example is now technically valid, but the processor is deprecated in favor of the routing connector; a future article update should consider migrating that section to the connector.
