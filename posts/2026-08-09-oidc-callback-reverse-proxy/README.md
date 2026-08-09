# Why Your OIDC Callback Fails Behind a Reverse Proxy: Redirect URIs, Forwarded Headers, and Cookie Paths

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenID Connect, OAuth 2.0, Reverse Proxy, Forwarded Headers, Troubleshooting

Description: Trace an OIDC callback through its public URL, proxy headers, path rewrites, cookies, and token exchange without trusting spoofed request metadata.

---

An OIDC client behind a reverse proxy sees two different requests. The browser uses a public URL such as `https://app.example.com/oidc/callback`, while the application may receive `http://web:8080/oidc/callback` from an internal proxy. If the application mistakes the internal scheme or host for its public identity, it can send the identity provider the wrong `redirect_uri`, route the callback to the wrong path, or scope its correlation cookie somewhere the callback never reaches.

Fix the mismatch as one end-to-end URL contract. Do not solve it by permitting redirect wildcards or trusting forwarded headers from every client.

## Write Down the Canonical Callback First

Define one public origin and callback path before inspecting framework settings:

```text
Public origin:          https://app.example.com
Public callback path:   /oidc/callback
Registered redirect:    https://app.example.com/oidc/callback
Internal upstream:      http://web:8080
```

The internal upstream URL is not an OIDC redirect URI. The browser cannot use a container DNS name, and it should not be registered at the provider.

The same public redirect URI participates at several stages:

1. The client places it in the authorization request.
2. The authorization server compares it with the client's registered redirect URIs.
3. The authorization server sends the browser back to it.
4. The reverse proxy routes that public path to the OIDC callback handler.
5. The client normally sends the same value in the authorization-code token request.

OAuth's current security best practice requires exact string matching for registered redirect URIs, except for the defined native-app loopback-port case. Scheme, host, port, path, case, encoding, and trailing slash can therefore matter. `https://app.example.com/oidc/callback` and `http://web:8080/oidc/callback` are not equivalent descriptions of one deployment; they are different URI strings.

Prefer an explicit public base URL or redirect URI in the OIDC client when the framework supports it. That removes ambiguous request-derived URL construction. Forwarded headers are still needed when redirects, secure-cookie behavior, HTTPS policies, or link generation use request metadata.

## Identify the Layer That Rejects the Flow

The visible error narrows the search:

| Symptom | Most likely layer |
| --- | --- |
| Provider displays `redirect_uri_mismatch` | Authorization request or provider registration |
| Authorization request contains `http://web:8080/...` | Application public-origin or forwarded-header handling |
| Browser returns to the proxy and receives `404` | Proxy route, path rewrite, or callback-handler path |
| Callback reaches the app but state/correlation fails | Cookie host/path/security, browser session, or replica state |
| Token endpoint returns `invalid_grant` mentioning redirect URI | Token request did not repeat the authorization request URI |
| Login or HTTPS redirect loops | Forwarded scheme is missing, ignored, or untrusted |

Capture the authorization request's decoded `redirect_uri`, the browser's public callback URL, and the application-observed scheme, host, and path. Redact the authorization code, `state`, `nonce`, cookies, client secret, and tokens from tickets and logs.

## Make the Edge Proxy State the Public Request

For a single NGINX proxy that terminates TLS on the standard HTTPS port, a minimal upstream configuration can preserve the public host and scheme:

```nginx
server {
    listen 443 ssl;
    server_name app.example.com;

    # TLS certificate directives are omitted.

    location / {
        proxy_pass http://web:8080;

        proxy_set_header Host              $host;
        proxy_set_header X-Forwarded-For   $remote_addr;
        proxy_set_header X-Forwarded-Host  $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port  443;
    }
}
```

This example assumes NGINX is the Internet-facing TLS terminator and the only path to the application. If a load balancer sits before NGINX, derive public values only from a documented, trusted chain or configure the canonical public origin explicitly. Do not blindly pass a client-supplied `X-Forwarded-Host` or `X-Forwarded-Proto` downstream.

NGINX changes the upstream `Host` header by default, so setting it intentionally matters. The edge should validate the accepted public hosts and overwrite forwarded host and scheme values rather than letting an Internet client choose them. A spoofed forwarded host can influence callback URLs, password-reset links, and other security-sensitive absolute URLs.

The standardized `Forwarded` header can communicate `proto` and `host`; many frameworks instead use `X-Forwarded-*`. Choose the convention supported by the application and configure every hop consistently. RFC 7239 explicitly warns that `Forwarded` cannot inherently be trusted because intermediaries or attackers may modify it.

## Trust Only the Proxies That Can Reach the App

Generating correct headers is only half the setup. The application framework must process them, and it must accept them only from known proxies.

For example, ASP.NET Core can be configured with a concrete proxy address:

```csharp
using System.Net;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedProto |
        ForwardedHeaders.XForwardedHost;

    options.KnownProxies.Add(IPAddress.Parse("10.0.0.10"));
});

var app = builder.Build();

app.UseForwardedHeaders();
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
```

Replace the address with the actual direct proxy, or use the framework's trusted-network option when addresses are managed as a subnet. The forwarded-header middleware must run before components that read scheme or host, including HTTPS redirection and authentication.

Recent ASP.NET Core servicing releases deliberately ignore forwarded headers from unknown proxies. Clearing all known-proxy restrictions or enabling an unrestricted compatibility switch may appear to fix a redirect, but it reintroduces header-spoofing risk. Model the real topology instead.

Express has the same trust boundary. Its `trust proxy` setting changes how `req.protocol` and `req.hostname` are derived, and its official documentation warns that the last trusted proxy must remove or overwrite `X-Forwarded-For`, `X-Forwarded-Host`, and `X-Forwarded-Proto`. Avoid a hop-count rule when several network paths can reach the app with different lengths; trust explicit proxy addresses or networks.

Also restrict direct network access to the upstream application port. A perfect trust list is ineffective if arbitrary clients can bypass the proxy and connect from an address the application treats as trusted.

## Keep Public and Internal Paths Consistent

Subpath hosting adds a second identity translation. Consider an application published at:

```text
https://app.example.com/tools/oidc/callback
```

The proxy can preserve `/tools` upstream, or it can strip the prefix and send `/oidc/callback` internally. Either design can work, but four settings must agree:

- the URI registered at the identity provider;
- the `redirect_uri` sent in authorization and token requests;
- the reverse proxy's location and rewrite behavior; and
- the application's external base-path and callback-handler configuration.

Do not assume `X-Forwarded-Prefix` is universally interpreted. It is a common extension, not part of the basic OAuth redirect contract, and framework behavior differs. Configure the application's public base path using its official deployment mechanism. Then test the exact path seen both before and after the proxy rewrite.

Trailing slashes on `proxy_pass` and location paths can change whether NGINX preserves or replaces a prefix. Review the rendered NGINX configuration and test a disposable non-secret endpoint before changing the callback. Do not “fix” a 404 by registering several speculative callback paths or a wildcard.

If users can enter through aliases such as `app.internal.example` and `app.example.com`, redirect them to one canonical host before starting OIDC. Starting the transaction on one host and returning to another also breaks host-only cookies even when both hosts route to the same application.

## Scope Correlation Cookies Across the Callback

OIDC middleware commonly sets a short-lived correlation, state, nonce, or PKCE transaction cookie before redirecting to the provider. The browser must send that cookie to the public callback.

RFC 6265's path rules are mechanical: a browser sends a cookie only when the request path matches the cookie's `Path`. A cookie created by `/tools/login` with a default or explicit path of `/tools` is not sent to `/oidc/callback`. Align the login and callback under one prefix or set the narrowest cookie path that contains both endpoints.

For example:

```text
Login endpoint:      /tools/oidc/login
Callback endpoint:   /tools/oidc/callback
Cookie Path:         /tools/oidc
```

Using `Path=/` also reaches both endpoints, but it exposes the cookie to every path on that host. Prefer the narrowest common parent supported by the OIDC middleware. Cookie Path is a delivery rule, not a strong isolation boundary.

Check these attributes in browser developer tools:

- **Host or Domain:** it must match the canonical callback host.
- **Path:** it must path-match the public callback.
- **Secure:** production transaction and session cookies should be sent only over HTTPS.
- **SameSite:** the correct value depends on the response mode and library; a cross-site form POST can require different handling from a top-level GET redirect.
- **Expiration:** the cookie must outlive a normal identity-provider interaction but remain short-lived.

Do not remove `Secure` to compensate for TLS termination. The browser is using HTTPS even if the proxy-to-app hop is HTTP. Make the application understand the forwarded public scheme so it emits and validates cookies for the real external connection.

## Do Not Forget Multi-Replica State

A reverse proxy may send the callback to a different application instance from the one that initiated login. If transaction state lives only in one process, the second replica reports missing state even though the browser returned the correct cookie.

Use one of the framework's supported designs:

- a shared, expiring, single-use transaction store;
- protected client-side transaction cookies with keys shared by every replica; or
- carefully managed session affinity as a temporary constraint.

Replicas must also share the data-protection or encryption keys needed to read each other's cookies. Do not disable state, nonce, or correlation validation to hide a routing problem.

## Trace One Login Without Exposing Credentials

Use this order during an incident:

1. Copy the registered redirect URI from the provider configuration.
2. Start a fresh private-browser session and inspect the outbound authorization request.
3. Decode only its `redirect_uri` and compare it byte for byte with registration.
4. Confirm that the browser returns to that exact public scheme, host, port, and path.
5. At the edge, confirm the callback matched the intended virtual host and location.
6. At the application, temporarily record only sanitized `scheme`, `host`, `pathBase`, and `path` values plus a request correlation ID.
7. Confirm that the direct peer address is in the application's trusted-proxy configuration.
8. In browser storage tools, verify that the transaction cookie exists and path-matches the callback.
9. Confirm the token request repeats the same redirect URI; do not log the code or client credentials.
10. With multiple replicas, verify shared transaction state and key material.

Make one correction at a time and begin a new login transaction after each change. Authorization codes and transaction cookies are short-lived and one-use; replaying an old callback produces misleading failures.

## Roll Out a Callback Change Safely

When changing a hostname or base path, register the new exact callback before sending users to it, while retaining the old exact callback only for the migration window. Deploy the application's public-origin setting and proxy route together, test login and logout through the public edge, then remove the old URI after active sessions and rollback requirements are understood.

Verify both successful and negative cases:

- a correct public URI completes login;
- an unregistered scheme, host, or path is rejected by the provider;
- direct access to the upstream port is blocked;
- spoofed forwarded headers do not affect generated redirects;
- the correlation cookie is absent outside its intended path; and
- a callback handled by another replica still validates correctly.

Avoid wildcard redirect registration, disabled correlation validation, unrestricted forwarded-header trust, and non-TLS production callbacks. Those changes convert a routing bug into an account-security problem.

## Official Documentation

- [OpenID Connect Core 1.0 incorporating errata set 2](https://openid.net/specs/openid-connect-core-1_0.html)
- [RFC 9700: Best Current Practice for OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700.html)
- [RFC 6749: The OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749.html)
- [RFC 7239: Forwarded HTTP Extension](https://www.rfc-editor.org/rfc/rfc7239.html)
- [RFC 6265: HTTP State Management Mechanism](https://www.rfc-editor.org/rfc/rfc6265.html)
- [NGINX HTTP Proxy Module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Microsoft: Configure ASP.NET Core for Proxy Servers and Load Balancers](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/proxy-load-balancer?view=aspnetcore-10.0)
- [Express: Behind Proxies](https://expressjs.com/en/guide/behind-proxies/)

## Conclusion

An OIDC callback behind a reverse proxy succeeds only when the provider, browser, edge, application, and token request agree on one public redirect URI. Pin that public identity explicitly, route its path consistently, process forwarded metadata only from trusted proxies, and scope transaction cookies so the callback receives them. Diagnose the first divergent layer instead of weakening redirect matching, cookie security, or OIDC correlation checks.
