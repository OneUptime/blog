# How to Configure HTTP Redirects in Istio VirtualService

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, VirtualService, HTTP Redirect, Traffic Management, Kubernetes

Description: Learn how to configure HTTP redirects in Istio VirtualService for URL migrations, HTTPS enforcement, and domain consolidation.

---

HTTP redirects tell the client to go to a different URL. Unlike routing (where the proxy forwards the request), a redirect sends a 301 or 302 response back to the client, and the client makes a new request to the new URL. Istio VirtualService makes it easy to set up redirects for common scenarios like HTTP-to-HTTPS, domain migrations, and URL restructuring.

## Basic Redirect

Here is the simplest redirect - sending all traffic from one path to another:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - uri:
            exact: "/old-page"
      redirect:
        uri: "/new-page"
    - route:
        - destination:
            host: my-app
            port:
              number: 80
```

When a client requests `/old-page`, it gets a 301 redirect response pointing to `/new-page`. The client then makes a new request to `/new-page`, which hits the normal route.

## Redirect vs Route

An important distinction: `redirect` and `route` are mutually exclusive. A rule can either redirect OR route, not both. If you put both in the same HTTP rule, Istio will reject the configuration.

```yaml
# This is WRONG - redirect and route cannot coexist
- match:
    - uri:
        exact: "/old"
  redirect:
    uri: "/new"
  route:  # ERROR: cannot have both
    - destination:
        host: my-app
```

## HTTP to HTTPS Redirect

One of the most common redirect patterns is forcing HTTPS:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: https-redirect
  namespace: default
spec:
  hosts:
    - "myapp.example.com"
  gateways:
    - http-gateway
  http:
    - redirect:
        scheme: "https"
        redirectCode: 301
```

You will need a Gateway that listens on port 80 for this to work:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: http-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "myapp.example.com"
```

And a separate Gateway and VirtualService for the HTTPS traffic:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: https-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      hosts:
        - "myapp.example.com"
      tls:
        mode: SIMPLE
        credentialName: myapp-tls-cert
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp-secure
  namespace: default
spec:
  hosts:
    - "myapp.example.com"
  gateways:
    - https-gateway
  http:
    - route:
        - destination:
            host: my-app
            port:
              number: 80
```

## Domain Redirect

To redirect from one domain to another:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: domain-redirect
  namespace: default
spec:
  hosts:
    - "old-domain.com"
  gateways:
    - my-gateway
  http:
    - redirect:
        authority: "new-domain.com"
        redirectCode: 301
```

Requests to `old-domain.com/anything` get redirected to `new-domain.com/anything`. The path is preserved unless you also specify a URI rewrite in the redirect.

## Redirect with Both Domain and Path

You can change the domain and path simultaneously:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: full-redirect
  namespace: default
spec:
  hosts:
    - "old-app.example.com"
  gateways:
    - my-gateway
  http:
    - match:
        - uri:
            prefix: "/v1/api"
      redirect:
        authority: "api.example.com"
        uri: "/v2/api"
        redirectCode: 301
    - redirect:
        authority: "www.example.com"
        redirectCode: 302
```

Requests to `old-app.example.com/v1/api/users` get a 301 redirect to `api.example.com/v2/api`. All other requests to `old-app.example.com` get a 302 redirect to `www.example.com`.

## Redirect Codes

Istio supports different HTTP redirect status codes:

- **301** - Permanent redirect. Browsers and search engines cache this. Use for permanent URL changes.
- **302** - Temporary redirect (this is the default if you do not specify `redirectCode`). Not cached by default.
- **303** - See Other. Used after a POST to redirect to a GET endpoint.
- **307** - Temporary redirect that preserves the HTTP method. A POST stays a POST.
- **308** - Permanent redirect that preserves the HTTP method.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - uri:
            exact: "/moved-permanently"
      redirect:
        uri: "/new-location"
        redirectCode: 301
    - match:
        - uri:
            exact: "/moved-temporarily"
      redirect:
        uri: "/temp-location"
        redirectCode: 302
```

## Prefix-Based Redirects

For redirecting entire path prefixes:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - "myapp.example.com"
  gateways:
    - my-gateway
  http:
    - match:
        - uri:
            prefix: "/blog"
      redirect:
        authority: "blog.example.com"
        redirectCode: 301
    - match:
        - uri:
            prefix: "/docs"
      redirect:
        authority: "docs.example.com"
        redirectCode: 301
    - route:
        - destination:
            host: web-app
            port:
              number: 80
```

Requests to `myapp.example.com/blog/anything` redirect to `blog.example.com/blog/anything`. Note that the path is preserved - the redirect changes the domain but keeps the same URI path.

## Port Redirect

You can also redirect to a different port:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: port-redirect
  namespace: default
spec:
  hosts:
    - "myapp.example.com"
  gateways:
    - my-gateway
  http:
    - redirect:
        port: 8443
        scheme: "https"
        redirectCode: 301
```

## Testing Redirects

Verify your redirects are working:

```bash
# Follow redirects with curl
curl -L -v http://old-domain.com/some-path

# See the redirect without following it
curl -v http://old-domain.com/some-path 2>&1 | grep "Location:"

# Check the response code
curl -o /dev/null -s -w "%{http_code}" http://old-domain.com/some-path
```

## Redirect Pitfalls

Watch out for these common issues:

1. **Redirect loops** - If you redirect from A to B and B redirects back to A, you get an infinite loop. Browsers typically stop after 20 redirects.

2. **Missing gateway binding** - For external redirects, the VirtualService must be bound to a Gateway. Without it, the redirect rule only applies to mesh-internal traffic.

3. **Protocol mismatches** - If you redirect HTTP to HTTPS but your HTTPS Gateway is not set up, users get a connection refused error.

4. **SEO impact** - 301 redirects pass link authority to the new URL. 302 redirects do not. Use the right code for your situation.

5. **Caching issues** - 301 redirects are cached aggressively by browsers. If you set up a 301 by mistake, users might keep getting redirected even after you remove the rule.

HTTP redirects in Istio VirtualService handle the common cases well - HTTPS enforcement, domain consolidation, and URL migrations. The key is choosing the right redirect code and making sure you do not create loops.
