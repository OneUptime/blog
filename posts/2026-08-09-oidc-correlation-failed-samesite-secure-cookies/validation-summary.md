# Validation Summary: How to Fix an OIDC “Correlation Failed” Error Caused by SameSite and Secure Cookies

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenID Connect (OIDC)
- OAuth 2.0 authorization code flow, state, nonce, and PKCE
- ASP.NET Core 10 authentication and OpenID Connect middleware
- HTTP cookies, SameSite, Secure, HttpOnly, and consent policy
- NGINX reverse proxying and forwarded headers
- ASP.NET Core Data Protection in multi-instance deployments
- curl, sed, and browser developer tools

## Sources Consulted
- OpenID Connect Core 1.0: https://openid.net/specs/openid-connect-core-1_0.html
- OAuth 2.0 Form Post Response Mode: https://openid.net/specs/oauth-v2-form-post-response-mode-1_0.html
- OAuth 2.0 Security Best Current Practice (RFC 9700): https://www.rfc-editor.org/rfc/rfc9700.html
- IETF HTTP State Management Mechanism draft (`SameSite` and `Lax-allowing-unsafe`): https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis
- ASP.NET Core SameSite cookie guidance: https://learn.microsoft.com/en-us/aspnet/core/security/samesite?view=aspnetcore-10.0
- ASP.NET Core `RemoteAuthenticationOptions.CorrelationCookie`: https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.authentication.remoteauthenticationoptions.correlationcookie?view=aspnetcore-10.0
- ASP.NET Core `OpenIdConnectOptions.NonceCookie`: https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.authentication.openidconnect.openidconnectoptions.noncecookie?view=aspnetcore-10.0
- Configure OpenID Connect web authentication in ASP.NET Core: https://learn.microsoft.com/en-us/aspnet/core/security/authentication/configure-oidc-web-authentication?view=aspnetcore-10.0
- ASP.NET Core 10 remote-authentication and OIDC source: https://github.com/dotnet/aspnetcore/tree/v10.0.0/src/Security/Authentication
- Configure ASP.NET Core for proxy servers and load balancers: https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/proxy-load-balancer?view=aspnetcore-10.0
- ASP.NET Core forwarded-header trust change: https://learn.microsoft.com/en-us/aspnet/core/breaking-changes/8/forwarded-headers-unknown-proxies?view=aspnetcore-10.0
- ASP.NET Core authorization middleware: https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.builder.authorizationappbuilderextensions.useauthorization?view=aspnetcore-10.0
- ASP.NET Core authorization service registration: https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.dependencyinjection.policyservicecollectionextensions.addauthorization?view=aspnetcore-10.0
- NGINX proxy header documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header
- ASP.NET Core Data Protection key storage providers: https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/implementation/key-storage-providers?view=aspnetcore-10.0
- Host ASP.NET Core in a web farm: https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/web-farm?view=aspnetcore-10.0
- ASP.NET Core Data Protection key management: https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/implementation/key-management?view=aspnetcore-10.0
- Local .NET 6 compilation check of the shown APIs and local `curl --help`/BSD `sed` checks for the shell pipeline

## Issues Found
- The post described every identity-provider-to-client return as cross-site. Corrected this to apply only when the provider and client are on different schemeful sites, because different origins can still be same-site.
- The SameSite explanation treated omitted `SameSite` exactly like explicit `SameSite=Lax`. Added the browser-permitted, short `Lax-allowing-unsafe` exception for recently created cookies without an explicit attribute and made clear that explicit `Lax` or `Strict` cookies are withheld on a cross-site POST.
- The security wording said bypassing correlation necessarily creates a vulnerability. RFC 9700 also recognizes verified PKCE support or OIDC nonce as CSRF defenses, so the wording now accurately says bypassing ASP.NET Core's intended correlation protection weakens CSRF defenses and can create a vulnerability.
- The combined C# excerpts called `UseAuthorization()` without registering authorization services. Added `builder.Services.AddAuthorization()` so the shown middleware setup does not fail at runtime when used as one configuration.
- The NGINX example used `$scheme` and `$host`, which represent the public scheme and authority only under specific topology assumptions. Scoped the example to an NGINX browser-facing TLS terminator without a non-default public callback port.
- The text said to trust only the real proxy even though `KnownProxies.Add(...)` retains the framework's built-in loopback trust entries. Reworded it to say to add the real proxy's observed address to the trusted-proxy configuration.
- Redis was listed as a persistent Data Protection store without noting that Redis persistence is disabled by default. Required Redis data persistence in that recommendation.
- The post dismissed sticky sessions as merely hiding a defect. Microsoft documents same-node routing as an alternative to a shared key ring, so the text now explains its narrower failure behavior and why a shared persistent key ring is more resilient.

## Review Notes
- ASP.NET Core 10 source and API documentation confirm the stated correlation- and nonce-cookie defaults: `SameSite=None`, `SecurePolicy=Always`, `HttpOnly=true`, and `IsEssential=true`.
- The authentication and forwarded-header APIs are current. `KnownProxies` is not obsolete in ASP.NET Core 10; the older `KnownNetworks` collection is obsolete in favor of `KnownIPNetworks`, but the post does not use `KnownNetworks` in code.
- The ASP.NET Core 10 source confirms a 32-byte cryptographically random correlation identifier, protected authentication properties in `state`, correlation-cookie deletion during validation, and 15-minute default remote-authentication and nonce lifetimes.
- The `curl` and `sed` diagnostic pipeline is syntactically correct and intentionally checks only the initial challenge response rather than emulating browser SameSite behavior.
- All eight links in the post's Official Documentation section returned HTTP 200 after redirects on 2026-08-09. The forwarded-header compatibility link redirects to its current ASP.NET Core breaking-changes URL.
