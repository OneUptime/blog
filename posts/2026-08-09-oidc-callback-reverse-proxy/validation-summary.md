# Validation Summary: Why Your OIDC Callback Fails Behind a Reverse Proxy: Redirect URIs, Forwarded Headers, and Cookie Paths

## Status
validated

## Post Type
Technical troubleshooting and deployment guide

## Technologies Covered

- OpenID Connect 1.0 Authorization Code Flow
- OAuth 2.0 and OAuth 2.0 Security Best Current Practice
- Reverse proxies and TLS termination
- NGINX `proxy_pass` and forwarded-header configuration
- Standardized `Forwarded` and de facto `X-Forwarded-*` headers
- ASP.NET Core Forwarded Headers Middleware
- Express `trust proxy`
- HTTP cookies, including Domain, Path, Secure, and SameSite behavior
- Multi-replica transaction state and shared data-protection keys

## Sources Consulted

- [OpenID Connect Core 1.0 incorporating errata set 2](https://openid.net/specs/openid-connect-core-1_0.html)
- [OAuth 2.0 Form Post Response Mode](https://openid.net/specs/oauth-v2-form-post-response-mode-1_0.html)
- [OpenID Connect RP-Initiated Logout 1.0](https://openid.net/specs/openid-connect-rpinitiated-1_0.html)
- [RFC 9700: Best Current Practice for OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700.html)
- [RFC 6749: The OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749.html)
- [RFC 3986: Uniform Resource Identifier (URI): Generic Syntax](https://www.rfc-editor.org/rfc/rfc3986.html)
- [RFC 7239: Forwarded HTTP Extension](https://www.rfc-editor.org/rfc/rfc7239.html)
- [RFC 6265: HTTP State Management Mechanism](https://www.rfc-editor.org/rfc/rfc6265.html)
- [IETF HTTP State Management Mechanism revision, draft-ietf-httpbis-rfc6265bis-22](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22)
- [NGINX HTTP Proxy Module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [NGINX: How nginx processes a request](https://nginx.org/en/docs/http/request_processing.html)
- [NGINX HTTP Core Module variables](https://nginx.org/en/docs/http/ngx_http_core_module.html#var_host)
- [Microsoft: Configure ASP.NET Core to work with proxy servers and load balancers](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/proxy-load-balancer?view=aspnetcore-10.0)
- [Microsoft: Forwarded Headers Middleware ignores headers from unknown proxies](https://learn.microsoft.com/en-us/dotnet/core/compatibility/aspnet-core/8.0/forwarded-headers-unknown-proxies)
- [Microsoft: Host ASP.NET Core in a web farm](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/web-farm?view=aspnetcore-10.0)
- [Express: Express behind proxies](https://expressjs.com/en/guide/behind-proxies/)

## Issues Found

- **Request-derived host values in the NGINX example:** The example forwarded `$host`, which can be derived from the incoming request, while `server_name` alone does not reject unmatched hosts. Changed both upstream host headers to the canonical `app.example.com` value and clarified that the complete edge configuration must reject unrecognized hosts with a separate default server. This prevents an attacker-selected Host value from influencing security-sensitive absolute URLs.
- **Over-broad transaction-cookie Path guidance:** The post recommended a common parent containing both the login and callback endpoints. A cookie's Path does not need to match the endpoint that sets it; it only needs to path-match requests that must receive it. Changed the example to the exact callback path and updated the guidance to cover the callback plus any additional endpoint explicitly required by the middleware.
- **Imprecise cookie Domain wording:** A Domain cookie does not need to equal the callback host; its Domain value must domain-match that host. Distinguished exact host-only cookie matching from Domain-cookie domain matching.
- **Misleading URI comparison terminology:** The incident checklist said to compare redirect URIs "byte for byte." RFC 3986 describes simple URI string comparison as character-for-character comparison after conversion to a common encoding. Updated the checklist accordingly.
- **Overstated cookie one-use semantics:** OAuth authorization codes are required to be short-lived and single-use, but HTTP cookies do not inherently have one-use semantics. Updated the text to reserve that requirement for authorization codes and describe transaction state as normally short-lived and scoped by OIDC middleware to one login flow.

## Review Notes

- The ASP.NET Core example uses current APIs and correct middleware ordering. The unknown-proxy hardening began in ASP.NET Core 8.0.17 and 9.0.6; in .NET 10, `KnownIPNetworks` replaces the obsolete `KnownNetworks`, but the post's example uses `KnownProxies` and therefore does not use the deprecated API.
- RFC 6265 remained the published cookie RFC on the validation date. SameSite behavior was additionally checked against the current rfc6265bis draft.
- If a deployment also changes its logout return URL, the request's `post_logout_redirect_uri` must match an entry in the client's separate `post_logout_redirect_uris` registration metadata; the login callback registration does not cover it.
