# Validation Summary: How to Configure HTTP Redirects in Istio VirtualService

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio Gateway
- Kubernetes custom resources
- HTTP redirects and status codes
- curl

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- RFC 9110 HTTP Semantics: https://www.rfc-editor.org/rfc/rfc9110
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- The post said `redirectCode` defaults to 302. Istio's `HTTPRedirect.redirectCode` default is 301, so the redirect-code description was corrected to avoid naming 302 as the default.
- The introduction described redirects as sending a 301 or 302 response. Since the post covers other valid 3xx redirect codes, this was corrected to "3xx response."
- The domain redirect section referred to a "URI rewrite in the redirect." Istio redirects use the `uri` field to overwrite the path in the redirect response; `rewrite` is a separate HTTPRoute feature used with routing. The wording was corrected.
- The SEO pitfall made an absolute claim that 302 redirects do not pass link authority. This is outside the Istio/HTTP redirect contract and is too categorical, so it was changed to the technically accurate distinction that 301 signals a permanent move and 302 signals a temporary move.

## Review Notes
- Istio's current examples primarily use `networking.istio.io/v1`, but `networking.istio.io/v1beta1` remains documented in Istio examples and references, so the API version used in the post is still acceptable.
- Istio Gateway also supports `tls.httpsRedirect: true` on HTTP servers for simple HTTP-to-HTTPS redirects. The VirtualService redirect approach shown in the post is still valid.
