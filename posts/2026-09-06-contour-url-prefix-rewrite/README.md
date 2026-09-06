# Rewrite URL Prefixes in Contour Without Breaking Redirects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Contour, URL Rewriting, HTTPProxy, Redirect, Routing, Envoy, Kubernetes

Description: Replace a matched Contour path prefix while preserving trailing slashes, generated redirects, cookies, and application base URLs.

---

Contour's `pathRewritePolicy.replacePrefix` changes the request path after a route has matched. It does not change route selection, rewrite response bodies, or automatically repair `Location` and cookie paths emitted by an application.

That last point explains the common failure: `/app/login` reaches the backend as `/login`, but the backend redirects the browser to `/callback`. The browser then requests the public `/callback`, outside the `/app` route.

## Define the Public and Internal Paths

Write the mapping before writing YAML:

| Public request | Backend request |
| --- | --- |
| `/app/` | `/` |
| `/app/orders` | `/orders` |
| `/app/assets/main.css` | `/assets/main.css` |

Normalize the no-slash form separately to give clients a canonical public URL. Contour already generates slash-aware prefix rewrites, but that does not redirect the browser to `/app/`:

```yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: portal
  namespace: portal
spec:
  virtualhost:
    fqdn: portal.example.com
    tls:
      secretName: portal-example-com-tls
  routes:
  - conditions:
    - exact: /app
    requestRedirectPolicy:
      path: /app/
      statusCode: 308
  - conditions:
    - prefix: /app/
    pathRewritePolicy:
      replacePrefix:
      - prefix: /app/
        replacement: /
    requestHeadersPolicy:
      set:
      - name: X-Forwarded-Prefix
        value: /app
    services:
    - name: portal
      port: 8080
```

The `308` preserves the request method and body. That matters when a client sends a non-GET request to `/app`, although clients should normally use the canonical slash form directly.

Contour applies an entry with an explicit rewrite `prefix` only when it exactly matches the rendered route prefix. If no entry matches and no default replacement is supplied, the path is left unchanged. Omitting it applies the replacement to every prefix produced by an include chain. An explicit value is easier to review in a root proxy; multiple entries are mainly useful when one child HTTPProxy is included under different parent prefixes.

## Configure the Application's External Base URL

The most reliable fix for redirects is application configuration. Set its public base URL to:

```text
https://portal.example.com/app
```

If the setting accepts only a path base, use `/app` instead of the full URL. Framework names vary: base path, root URL, external URL, context path, script name, or forwarded prefix. Configure the documented option for the application rather than expecting Envoy to parse and transform arbitrary response headers or HTML.

The example sets `X-Forwarded-Prefix: /app`, overwriting any client value. That header helps only if the framework is configured to trust it from known proxies. Do not trust forwarded headers from arbitrary direct clients, and prevent direct Pod access where the trust boundary depends on Envoy.

Also verify `X-Forwarded-Proto` and the original authority are handled correctly. Otherwise the application can generate `http://` redirects or internal hostnames even when the path is right.

## Handle Cookie Paths Explicitly

An application mounted internally at `/` may issue:

```text
Set-Cookie: session=...; Path=/
```

That cookie is valid for the whole public host, not only `/app`. Prefer an application setting that emits `Path=/app`. If the app cannot do so, Contour's named cookie rewriting policy can change the Path attribute:

```yaml
    cookieRewritePolicies:
    - name: session
      pathRewrite:
        value: /app
```

Cookie rewriting is keyed by cookie name. Inventory every relevant session, CSRF, and affinity cookie, and preserve security attributes such as `Secure`, `HttpOnly`, and the intended `SameSite` mode. A path is a browser delivery scope, not a security boundary by itself.

## Test Redirect Chains, Not Just the First Response

Use curl without automatically following redirects first:

```bash
curl -si https://portal.example.com/app
curl -si https://portal.example.com/app/
curl -si https://portal.example.com/app/login
```

Check every `Location` and `Set-Cookie` header. Then follow the chain while retaining headers:

```bash
curl -sS -L --max-redirs 10 \
  -D /tmp/portal-headers.txt \
  -o /dev/null \
  https://portal.example.com/app/login
```

The final public URL should stay under `/app` unless an intentional external identity-provider redirect occurs. Test query strings, percent-encoded paths, static assets, form POSTs, and logout callbacks. Path rewriting does not rewrite request bodies containing absolute URLs.

Use a browser for OIDC or cookie flows. Redirect URI registration is exact in many identity providers, so change it to the public `/app/...` callback rather than an internal path.

## Diagnose the Common Breakages

| Symptom | Likely cause |
| --- | --- |
| `/app/orders` works, `/app` does not | Missing exact-path canonical redirect |
| Browser leaves `/app` after login | Application generated a root-relative `Location` |
| CSS or JavaScript returns 404 | HTML contains root-relative asset URLs |
| Login loops | Callback URL, forwarded scheme, cookie Path, or trust-proxy setting is wrong |
| HTTPProxy becomes invalid | Prefix replacement configured on an exact or regex route instead of a prefix route |
| Backend sees `/app/...` unchanged | Request matched a different route, or no rewrite entry matched the rendered prefix and no default was supplied |

Contour's access logs can include route-source metadata and the original request path. Compare that with an application log of the received path and forwarded headers. This provides evidence at both sides of the rewrite.

Do not solve a wrong redirect with a broad second route that exposes the application's internal `/callback` or `/admin` at the host root. That can silently publish paths that the prefix was meant to isolate.

## Conclusion

Use a canonical `/app/` prefix, rewrite it to `/`, and configure the application to know its external base URL. Treat `X-Forwarded-Prefix` as a trusted-proxy hint, not a universal fix. Validate the entire redirect and cookie flow because Contour rewrites the inbound path only; it does not automatically transform URLs the application sends back.

## Official Documentation

- [Contour 1.33 request rewriting](https://projectcontour.io/docs/1.33/config/request-rewriting/)
- [Contour 1.33 request routing and redirects](https://projectcontour.io/docs/1.33/config/request-routing/)
- [Contour 1.33 cookie rewriting](https://projectcontour.io/docs/1.33/config/cookie-rewriting/)
- [Contour 1.33 HTTPProxy API reference](https://projectcontour.io/docs/1.33/config/api-reference/)
- [RFC 9110: Location](https://www.rfc-editor.org/rfc/rfc9110.html#field.location)
- [RFC 6265: Cookie Path](https://www.rfc-editor.org/rfc/rfc6265.html#section-4.1.2.4)
