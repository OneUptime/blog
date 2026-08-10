# Validation Summary: Where Should a Browser App Store OIDC Tokens? Cookies, Memory, and the BFF Pattern Compared

## Status

validated

## Post Type

Technical security guide and architecture comparison

## Technologies Covered

- OpenID Connect (OIDC)
- OAuth 2.0 Authorization Code flow and PKCE
- OAuth access tokens and refresh tokens
- Backend for Frontend (BFF) and token-mediating backend patterns
- Browser Web Storage (`localStorage` and `sessionStorage`)
- In-memory JavaScript token storage and the Fetch API
- HTTP cookies, including `Secure`, `HttpOnly`, `SameSite`, and cookie-name prefixes
- Cross-site scripting (XSS), cross-site request forgery (CSRF), and CORS

## Sources Consulted

- [OAuth 2.0 for Browser-Based Applications, draft-ietf-oauth-browser-based-apps-27](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps-27)
- [RFC 9700: Best Current Practice for OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700.html)
- [RFC 7636: Proof Key for Code Exchange by OAuth Public Clients](https://www.rfc-editor.org/rfc/rfc7636.html)
- [OpenID Connect Core 1.0 incorporating errata set 2](https://openid.net/specs/openid-connect-core-1_0-errata2.html)
- [Cookies: HTTP State Management Mechanism, draft-ietf-httpbis-layered-cookies-02](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-layered-cookies-02)
- [RFC 6265: HTTP State Management Mechanism](https://www.rfc-editor.org/rfc/rfc6265.html)
- [WHATWG HTML Standard: Web Storage](https://html.spec.whatwg.org/multipage/webstorage.html)
- [WHATWG Fetch Standard](https://fetch.spec.whatwg.org/)
- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 3986: Uniform Resource Identifier Syntax](https://www.rfc-editor.org/rfc/rfc3986.html)
- [OWASP Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN: Set-Cookie header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)

## Issues Found

- The source list linked to expired browser-app draft revision 26, while the post's `__Host-Http-` recommendation comes from current revision 27. Updated the link to revision 27 and added the current layered-cookies draft that defines the prefix.
- The post treated an in-memory lexical or closure variable as necessarily directly readable by any injected script. Clarified that encapsulation can prevent a direct read, while active malicious JavaScript can still intercept token use, invoke exposed authorized functions, or hook platform APIs.
- The comparison table described every JavaScript-readable cookie as automatically persistent. Cookies without `Expires` or `Max-Age` are session cookies, so this was changed to browser-managed storage that can survive reloads. The CSRF risk was also qualified to the case where a server accepts the automatically attached cookie for authentication.
- The CSRF comparison implied that explicit bearer headers have the same ambient-request issue as cookies. Clarified that automatically attached cookies require CSRF defenses that explicitly supplied `Authorization` headers generally avoid.
- The bearer-token replay sentence conflated bearer and sender-constrained tokens. Clarified that a stolen bearer token remains usable until expiry or revocation, while a sender-constrained token can prevent off-device replay unless the attacker also obtains or can use the bound key.
- The URL-leakage sentence grouped query strings and fragments together as sources of server logs. Clarified that query strings can reach server and intermediary logs, whereas fragments remain browser-side but can still leak through history, screenshots, client-side logging, crash reports, and copied links.
- The refresh-token paragraph called an incomplete list the current requirements. Added the browser-client requirements for rotation or sender-constraining, maximum or inactivity lifetime, consented scope/resource binding, non-extension of a pre-established absolute lifetime, and handling detected reuse.
- The BFF table called confidential-client behavior merely possible and treated all BFF sessions as server-side. Clarified that the IETF BFF pattern acts as a confidential client and can use either an opaque server-side session identifier or protected client-side session state; the prose now identifies the server-side-session variant it recommends.
- The post could be read as moving resource authorization into the BFF. Clarified that the BFF enforces strict outbound proxy allowlists while the resource server continues to enforce authorization.
- The validation checklist grouped OAuth `state`, OIDC `nonce`, and all tokens together. It now distinguishes the applicable OAuth/OIDC values and specifically calls for ID Token validation with a maintained library.
- The `Secure` cookie description was made precise for the browser-defined localhost exception by referring to ordinary plaintext HTTP.

No syntax or API errors were found in either JavaScript example.

## Review Notes

- Both JavaScript snippets use current, non-deprecated Web Storage and Fetch APIs and are syntactically valid as JavaScript modules.
- The `Set-Cookie` example satisfies the current `__Host-Http-` requirements: `Secure`, `HttpOnly`, `Path=/`, and no `Domain` attribute. Prefix enforcement still depends on user-agent support, so the explicit attributes remain necessary.
- Browser-app revision 27 and layered-cookies revision 02 are active Internet-Drafts as of the validation date. The former is in the RFC Editor queue but is not yet a published RFC.
- RFC 6265 remains the published cookie RFC, but it does not define `SameSite` or `__Host-Http-`; the active cookie drafts were therefore also consulted.
- The post contains no terminal commands or framework-specific configuration files.
