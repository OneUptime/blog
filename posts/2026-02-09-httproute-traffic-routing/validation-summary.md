# Validation Summary: How to use HTTPRoute for HTTP traffic routing rules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Gateway API
- HTTPRoute
- ReferenceGrant
- Kubernetes Service backend references
- Gateway API filters including RequestHeaderModifier, URLRewrite, RequestRedirect, and RequestMirror
- HTTPRoute timeouts

## Sources Consulted
- Gateway API specification: https://gateway-api.sigs.k8s.io/reference/spec/
- Gateway API main API reference: https://gateway-api.sigs.k8s.io/reference/api-spec/main/spec/
- Gateway API HTTP redirects and rewrites guide: https://gateway-api.sigs.k8s.io/guides/user-guides/http-redirect-rewrite/
- Gateway API HTTP timeouts guide: https://gateway-api.sigs.k8s.io/guides/user-guides/http-timeouts/

## Issues Found
- The request redirect example tried to redirect `old.example.com` by matching the `Host` header inside a route whose `spec.hostnames` only accepted `example.com`. This could prevent the old-domain redirect from matching correctly. I changed the example to use a separate HTTPRoute with `spec.hostnames: ["old.example.com"]` and a RequestRedirect filter to `new.example.com`, which matches the Gateway API hostname model.

## Review Notes
- `URLRewrite`, `RequestMirror`, query parameter matching, and `timeouts` are Extended support features in Gateway API conformance, so controller support should still be checked before relying on them in production.
- Regular expression matching is implementation-specific, as the post already notes.
