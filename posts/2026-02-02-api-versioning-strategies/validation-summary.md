# Validation Summary: API Versioning Strategies

## Status
validated

## Post Type
Guide / Conceptual overview

## Technologies Covered
- REST API design
- HTTP protocol (URL paths, query parameters, headers)
- Content negotiation via HTTP `Accept` header
- Media types / vendor-specific MIME types

## Sources Consulted
- RFC 7231 (HTTP/1.1 Semantics and Content) — content negotiation and the Accept header: https://www.rfc-editor.org/rfc/rfc7231
- RFC 6838 (Media Type Specifications and Registration Procedures) — vendor tree media types used in versioned Accept headers: https://www.rfc-editor.org/rfc/rfc6838
- GitHub REST API versioning documentation (`X-GitHub-Api-Version` header and `application/vnd.github+json`): https://docs.github.com/en/rest/overview/api-versions
- Stripe API versioning documentation (URL/header-based versioning patterns): https://stripe.com/docs/api/versioning
- Microsoft REST API Guidelines — versioning recommendations: https://github.com/microsoft/api-guidelines

## Issues Found
No technical issues found.

The post discusses four widely-recognized API versioning strategies, all of which are accurately characterized:
- URL path versioning (e.g., `/api/v1/users`) — correctly described as explicit and easy to understand.
- Query parameter versioning (e.g., `?version=1`) — correctly described.
- Custom HTTP header versioning — correctly described as keeping URLs clean with a trade-off on debuggability.
- Accept header / content negotiation with media types — correctly described as more REST-aligned but requiring more client sophistication.

The inline examples (`/api/v1/users`, `?version=1`) are syntactically valid and reflect real-world usage.

## Review Notes
- The post is conceptual and intentionally high-level. It does not include implementation code, which is appropriate for an overview-style guide.
- A future expansion could include concrete examples of vendor media types (e.g., `Accept: application/vnd.example.v1+json`) and discuss the trade-offs around caching with header-based versioning (since caches keyed only on URL may serve incorrect representations without a `Vary` header).
- No version-specific or deprecation concerns — the strategies discussed are protocol-level concepts that remain current.
