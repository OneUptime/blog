# Validation Summary: Rewrite URL Prefixes in Contour Without Breaking Redirects

## Status

validated

## Post Type

Technical configuration and troubleshooting guide.

## Technologies Covered

- Contour 1.33 and the projectcontour.io/v1 HTTPProxy API
- Envoy request routing, path rewriting, and access logging
- Kubernetes Services and TLS secrets
- HTTP redirects, forwarded headers, and cookie attributes
- curl and shell commands
- OpenID Connect callback URLs

## Sources Consulted

- [Contour 1.33 request rewriting](https://projectcontour.io/docs/1.33/config/request-rewriting/)
- [Contour 1.33 request routing and redirects](https://projectcontour.io/docs/1.33/config/request-routing/)
- [Contour 1.33 cookie rewriting](https://projectcontour.io/docs/1.33/config/cookie-rewriting/)
- [Contour 1.33 HTTPProxy API reference](https://projectcontour.io/docs/1.33/config/api-reference/)
- [Contour 1.33 access logging](https://projectcontour.io/docs/1.33/config/access-logging/)
- [Contour v1.33.0 HTTPProxy processor source](https://github.com/projectcontour/contour/blob/v1.33.0/internal/dag/httpproxy_processor.go), particularly rewrite selection and expandPrefixMatches.
- [Contour v1.33.0 CRD schemas](https://github.com/projectcontour/contour/blob/v1.33.0/examples/contour/01-crds.yaml)
- [RFC 9110: Location and redirect semantics](https://www.rfc-editor.org/rfc/rfc9110.html#field.location)
- [RFC 7538: 308 Permanent Redirect](https://www.rfc-editor.org/rfc/rfc7538.html#section-3), the original 308 specification, now superseded by RFC 9110.
- [RFC 6265: Cookie Path](https://www.rfc-editor.org/rfc/rfc6265.html#section-4.1.2.4)
- [curl manual](https://curl.se/docs/manpage.html), plus local curl --help all.
- [OpenID Connect Core: Authentication Request](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest)
- [Werkzeug ProxyFix documentation](https://werkzeug.palletsprojects.com/en/stable/middleware/proxy_fix/)
- [Author GitHub profile](https://github.com/nawazdhandala), checked as the author-link destination.

## Issues Found

1. **Incorrect diagnosis for an unmatched rewrite prefix.** The troubleshooting table claimed that a mismatch invalidates HTTPProxy. The versioned implementation instead selects an exactly matching entry, falls back to an entry without a prefix, or leaves the path unchanged. Updated the explanation and unchanged-path diagnosis. Replaced the invalid-proxy example with prefix replacement on an exact or regex route, which the processor explicitly rejects.
2. **Misleading duplicate-slash rationale.** The introduction to the manifest implied that the configuration avoids a dependence on duplicate-slash normalization. Contour already expands rewrite routes to handle slash variants. Changed the rationale to the actual purpose of the exact redirect: establishing the browser's canonical public URL. The manifest remains correct and unchanged.
3. **Full URL conflated with path base.** The application guidance supplied a full HTTPS URL for both settings. Kept that value for a public base URL and clarified that a path-only setting takes /app.

## Review Notes

- The request rewrite runs after route selection; it does not repair application-generated URLs or response bodies. The public-to-backend mapping, explicit forwarded-prefix header, redirect policy, and named cookie path rewrite are consistent with the documented API.
- Both YAML snippets parsed successfully. Checked the combined manifest, with the cookie snippet attached to the backend route, against the v1.33.0 CRD for field names, required fields, scalar types, and enumerated values. This was a focused structural check, not Kubernetes admission or a live controller test.
- Shell syntax checks passed for both command blocks. Confirmed curl's silent, include, show-error, location, max-redirs, dump-header, and output options. The commands inspect headers correctly; they do not enable curl's cookie engine, so the instruction to use a browser for cookie and OIDC flows is appropriate.
- Confirmed method-preserving 308 semantics, root-relative Location resolution, cookie path scope and its security limitations, exact OIDC callback registration, and optional route-source/original-path access logging.
- The article is explicitly scoped to Contour 1.33. The fields used are supported in that version, with no deprecation indicated in the consulted versioned API documentation. This review does not assert that 1.33 is the newest release.
- Documentation and author links resolve to the intended resources. portal.example.com is an illustrative deployment address. No live Kubernetes deployment, backend application, TLS secret, or identity-provider flow was available for end-to-end verification; those remain deployment-specific prerequisites.
