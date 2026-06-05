# Validation Summary: How to Trace SaaS Marketplace App Installation and OAuth Authorization Flows

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry metrics
- Python
- OAuth 2.0 authorization code flow
- SaaS marketplace app installation flows
- Webhook setup

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry metrics concepts: https://opentelemetry.io/docs/concepts/signals/metrics/
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry sensitive data guidance: https://opentelemetry.io/docs/security/handling-sensitive-data/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- OAuth 2.0 RFC 6749: https://www.rfc-editor.org/rfc/rfc6749
- OAuth 2.0 PKCE RFC 7636: https://www.rfc-editor.org/rfc/rfc7636
- OAuth 2.0 Security Best Current Practice RFC 9700: https://www.rfc-editor.org/rfc/rfc9700

## Issues Found
- The first code sample used `httpx.AsyncClient()` and raised `OAuthError` without defining either dependency in the snippet. Added an `httpx` import and a small `OAuthError` exception class.
- The OAuth authorization-code sample omitted PKCE. RFC 9700 requires public clients to use PKCE and recommends it for confidential clients; RFC 7636 defines the S256 challenge and token-exchange verifier parameters. Added S256 PKCE generation, stored the verifier with the OAuth state, included `code_challenge` and `code_challenge_method` in the authorization URL, and sent `code_verifier` during token exchange.
- The post said it stored trace context, but the code stored only the trace ID. Updated the wording to "trace ID" and added the saved trace ID as a callback span attribute for correlation.
- The code recorded the full OAuth redirect URL as a span attribute. Because that URL includes the CSRF `state` value, changed the attribute to record only the authorization endpoint.
- Two Python code fences started with indented class methods, which made the snippets invalid Python when parsed independently. Added `class OAuthFlowHandler:` headers to make the examples syntactically valid.
- The opening explanation implied tracing spans external OAuth providers directly. Updated it to describe tracing handoffs to external OAuth providers, which is accurate unless those providers propagate compatible trace context.

## Review Notes
The examples still rely on application-specific helper functions such as `save_oauth_state`, `get_oauth_state`, `get_app_config`, `create_installation`, `encrypt`, and webhook registration. That is acceptable for this guide, but a future runnable sample should either define those helpers or mark them explicitly as placeholders. Local Python syntax validation passed for all fenced Python blocks; the OpenTelemetry package was not installed in the local environment, so API validation was performed against official documentation.
