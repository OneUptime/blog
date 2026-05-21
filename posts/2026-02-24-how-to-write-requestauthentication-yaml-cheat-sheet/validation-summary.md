# Validation Summary: How to Write RequestAuthentication YAML (Cheat Sheet)

## Status
validated

## Post Type
Reference / cheat sheet

## Technologies Covered
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- JSON Web Tokens (JWT)
- JSON Web Key Sets (JWKS)
- Kubernetes YAML
- istioctl and kubectl debugging commands

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- RFC 7519 JSON Web Token: https://www.rfc-editor.org/rfc/rfc7519

## Issues Found
- The audience-validation note said that when `audiences` is omitted, the audience is not checked. Istio documents that the service name is accepted when audiences are empty, so the sentence was corrected.
- The custom-token-location section claimed Istio checks headers first, then query parameters. Istio documents that requests with multiple tokens in different locations are unsupported and the output principal is undefined, so the text was corrected to avoid implying a guaranteed precedence order.
- The output-payload section described extracting specific claims, but `outputPayloadToHeader` emits the full verified JWT payload. The heading and description were corrected.
- The mesh-wide policy note implied that `istio-system` is always mesh-wide. Istio applies no-selector policies mesh-wide only from the configured root namespace, so the note was qualified.
- The debugging command used `deploy/api-server` with `istioctl proxy-config log`. The official istioctl examples use `deployment/<name>`, so the command was updated to `deployment/api-server`.

## Review Notes
The remaining YAML examples use current `security.istio.io/v1` fields and match Istio's documented RequestAuthentication and AuthorizationPolicy behavior. The ALLOW-policy examples are valid, though Istio's own authentication task also shows an equivalent DENY pattern with `notRequestPrincipals: ["*"]` for requiring tokens.
